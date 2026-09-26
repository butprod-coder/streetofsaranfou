import { usesTransformationTree, TRANSFORMATION_MILESTONES } from './transformation-rules.js';
import { installSecretMenu, createSecretSession } from './secret-menu.js';
import { finalDuelCheckpoint, restoreCheckpoint } from './run-save.js';
import { installRouteUI, renderRouteUI } from './route-ui.js';
import { nextDistrict } from './campaign-route.js';
import { FIGHTERS, CHAPTERS, STEP, fighter, clamp, blankInput } from './data.js';
import { Simulation } from './simulation.js';
import { Assets } from './assets.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Renderer } from './renderer.js';
import { Network } from './network.js';
import { normalizeProfile, spendPoint, bonuses, TALENT_SAVE_KEY } from './progression.js';
import { BALANCE } from './balance.js';
import { renderStartingStats } from './selection-stats.js';
import { installEvolutionUI, renderEvolution, renderPauseTalents } from './evolution-ui.js';
import { installAudioUI, renderAudioUI } from './audio-settings.js';
import { installInteractionUI } from './interaction-ui.js';
import { installRogueUI, renderAttributes } from './rogue-ui.js';
import { checkpoint, readCheckpoint, recordRun, RUN_SAVE_KEY, RECORDS_KEY } from './run-save.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const number = n => Math.round(n).toLocaleString('fr-FR', { minimumIntegerDigits: 6 });

class Game {
  constructor() {
    this.preferences = this.readPreferences(); this.selected = fighter(this.preferences.character).id;
    this.assets = new Assets(); this.audio = new Audio(this.preferences.muted);
    this.renderer = new Renderer($('#game'), this.assets, this.audio);
    this.network = new Network(message => this.onNetwork(message), (status, message) => this.networkStatus(status, message));
    installInteractionUI();
    this.input = new Input({ pause: () => this.togglePause(), blur: () => this.focusLost(), menu: action => this.gamepadMenu(action), wake: () => this.audio.wake() });
    const storyButton = document.createElement('button');
    storyButton.id = 'chapter-story-next'; storyButton.textContent = 'ESPACE / A / ✕ · Afficher / Continuer';
    storyButton.addEventListener('click', () => { if (this.input.enabled) this.input.tap('jump'); });
    $('#app').append(storyButton);
    this.state = null; this.simulation = null; this.mode = 'solo'; this.screen = 'home'; this.accumulator = 0;
    this.lastFrame = performance.now(); this.lastSnapshot = 0; this.lastInputSend = 0; this.loadingGeneration = 0; this.currentChapter = -1; this.resultShown = false;
    this.profiles = {};
    this.resetProgression();
    installEvolutionUI();
    installRogueUI();
    installAudioUI(this);
    installRouteUI();
    installSecretMenu(this);
    this.bind(); this.renderSelection(); this.updateRecord(); this.updateSound();

    const orientationHint = document.createElement('p'); orientationHint.className = 'orientation-hint'; orientationHint.textContent = '↻ Tourne ton téléphone : la rue se joue en paysage.'; $('#app').append(orientationHint);
    requestAnimationFrame(now => this.frame(now));
    // Read-only diagnostics support bug reports and end-to-end verification; no cheats or mutable game state.
    window.saranfou = Object.freeze({ inspect: () => ({ screen: this.screen, mode: this.mode, slot: this.network.slot, room: this.network.code,
      state: this.state ? JSON.parse(JSON.stringify(this.state)) : null, loadedAssets: this.assets.images.size }) });
    const params = new URLSearchParams(location.search), invitation = params.get('room');
    let session;
    try { session = JSON.parse(sessionStorage.getItem('saranfou-room') || 'null'); } catch {}
    if (session?.code && session?.token && (!invitation || invitation.toUpperCase() === session.code)) this.resumeConnection(session);
    else if (invitation) { this.show('online'); $('#room-input').value = invitation.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6); }
  }
  readPreferences() {
    try {
      const raw = JSON.parse(localStorage.getItem('saranfou-v2') || '{}');
      return { record: Number.isFinite(raw.record) ? Math.max(0, raw.record) : 0, chapter: Number.isInteger(raw.chapter) ? clamp(raw.chapter, 0, 5) : 0, muted: raw.muted === true, character: fighter(raw.character).id };
    } catch { return { record: 0, chapter: 0, muted: false, character: 'karonux' }; }
  }
  save() { try { localStorage.setItem('saranfou-v2', JSON.stringify(this.preferences)); } catch {} }
  bind() {
    $$('[data-action]').forEach(button => button.addEventListener('click', () => { this.audio.confirm(); this.action(button.dataset.action).catch(e => this.toast(e.message)); }));
    $('#join-form').addEventListener('submit', event => { event.preventDefault(); this.audio.confirm(); this.join().catch(e => this.setNetworkError(e.message)); });
    $('#online-fighter').addEventListener('change', () => {
      this.selected = $('#online-fighter').value; this.network.send({ type: 'select', character: this.selected }); this.setLobbyPortrait();
    });
    $('#online-difficulty').addEventListener('change', () => this.network.send({ type: 'select', difficulty: $('#online-difficulty').value }));
    $('#sound-button').addEventListener('click', () => { this.preferences.muted = !this.preferences.muted; this.audio.mute(this.preferences.muted); this.save(); this.updateSound(); });
    $('#fullscreen-button').addEventListener('click', async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('#app').requestFullscreen) await $('#app').requestFullscreen(); else this.toast('Utilise le mode plein écran de ton navigateur.'); }
      catch { this.toast('Le plein écran n’est pas disponible dans cette fenêtre.'); }
    });
    $('.brand').addEventListener('click', event => { event.preventDefault(); if (this.state && !this.resultShown) this.togglePause(); else this.quit(); });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || !this.screen) return;
      const focusables = this.focusables(), index = focusables.indexOf(document.activeElement);
      if (!focusables.length) return;
      if (event.shiftKey && index <= 0) { event.preventDefault(); focusables.at(-1).focus(); }
      else if (!event.shiftKey && index === focusables.length - 1) { event.preventDefault(); focusables[0].focus(); }
    });
    addEventListener('beforeunload', () => { if (this.mode === 'online' && this.state) this.network.send({ type: 'pause', value: true }); });
  }
  focusables() { return this.screen ? [...$(`#${this.screen}`).querySelectorAll('button:not(:disabled), input:not(:disabled):not([type=hidden]):not([type=file]), select:not(:disabled), a[href]')].filter(el => el.offsetParent !== null && !el.closest('[inert]')) : []; }
  show(screen) {
    const previousScreen = this.screen;
    this.menuFocus ??= new Map();
    if (this.screen && this.focusables().includes(document.activeElement)) this.menuFocus.set(this.screen, document.activeElement);
    this.screen = screen;
    $$('.secret-return').forEach(b=>b.hidden=!this.state?.sandbox);
    $$('.screen').forEach(el => { const active = el.id === screen; el.classList.toggle('active', active); el.inert = !active; });
    const playing = !!this.state && !['home', 'select', 'online', 'lobby'].includes(screen);
    document.body.classList.toggle('playing', playing);
    $('#game-ui').classList.toggle('hidden', !playing || screen === 'badges');
    this.input.enabled = playing && !screen && !this.state.paused;
    $('#touch-controls').classList.toggle('hidden', !this.input.enabled || !matchMedia('(pointer: coarse)').matches);
    this.input.clear();
    if (screen === 'select') this.select(this.selected);
    if (screen === 'pause') renderPauseTalents(this.state?.players[this.mode === 'online' ? this.network.slot : 0]);
    if (screen) requestAnimationFrame(() => {
      if (this.screen !== screen) return;
      const items = this.focusables(), remembered = this.menuFocus.get(screen);
      const target = screen === 'select' ? $('#roster .selected')
        : screen === 'pause' && !previousScreen ? items[0]
        : items.includes(remembered) ? remembered : items[0];
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
  renderSelection() {
    $('#roster').innerHTML = FIGHTERS.map((c, i) => `<button class="fighter-card" data-fighter="${c.id}" style="--fighter:${c.color}" aria-label="Choisir ${c.name} — Vie ${c.hp}, Force ${c.power}, Vitesse ${c.speed}" aria-pressed="false"><span class="number">0${i + 1}</span><span class="selected-mark">✓</span><img src="/assets/${c.id}/${c.id}_p.png" alt="" draggable="false"><span class="card-name"><b>${c.name}</b><small>${c.title}</small></span>${renderStartingStats(c)}</button>`).join('');
    $$('[data-fighter]').forEach(el => el.addEventListener('click', () => { this.audio.confirm(); this.select(el.dataset.fighter); }));
    $('#online-fighter').innerHTML = FIGHTERS.map(c => `<option value="${c.id}">${c.name} — ${c.title}</option>`).join('');
    this.select(this.selected);
  }
  select(id) {
    this.selected = fighter(id).id; const c = fighter(this.selected);
    $$('[data-fighter]').forEach(el => { el.classList.toggle('selected', el.dataset.fighter === this.selected); el.setAttribute('aria-pressed', String(el.dataset.fighter === this.selected)); });
    $('#fighter-title').textContent = c.title; $('#fighter-name').textContent = c.name; $('#fighter-description').textContent = c.description;
    const profile = this.profiles[c.id], special = BALANCE.specials[c.id];
    $('#fighter-special').textContent = `15 TALENTS · 3 BRANCHES   /   ${Math.round(c.hp * bonuses(profile).life)} PV   /   L · ${c.special.toUpperCase()} · ${special.cost} ÉNERGIE`;
    try { const record = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')[c.id]; if (record) $('#fighter-special').textContent += ` · ${record.title} · ${record.wins} victoire(s)`; } catch {}
    $('#online-fighter').value = this.selected; this.preferences.character = this.selected; this.save();
  }
  updateRecord() { $('#record').textContent = number(this.preferences.record); }
  updateSound() { const b = $('#sound-button'); b.textContent = this.preferences.muted ? '♪̸' : '♪'; b.setAttribute('aria-label', this.preferences.muted ? 'Activer le son' : 'Couper le son'); b.setAttribute('aria-pressed', String(!this.preferences.muted)); }
  toast(message, duration = 4000) { $('#toast').textContent = message; $('#toast').classList.remove('hidden'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => $('#toast').classList.add('hidden'), duration); }
  async action(action) {
    if(action.startsWith('secret-')){if(!this.secretUnlocked)return;if(action==='secret-menu'){this.quit();this.show('secret-menu');}else if(action==='secret-lock')this.secretLock();else if(action==='secret-play'||action==='secret-final'){const options=this.secretOptions();await this.startSecret(action==='secret-final'?{...options,mode:'level',chapter:6,stage:0}:options);}return;}
    if(action==='route-next'){if(this.mode==='online')this.network.send({type:'route-ready'});else this.simulation?.confirmRoute(0);return;}
    if (action === 'attributes') { this.rogueReturn = this.screen; if (this.state && !this.state.paused) this.setPause(true); this.show(action); this.renderRogue(); }
    if (action === 'close-attributes') this.closeProgressionMenu(this.rogueReturn, 'pause');
    if (action === 'sound') { this.soundReturn = this.screen || 'pause'; if (this.state && !this.state.paused && !this.resultShown) this.setPause(true); this.show('sound'); renderAudioUI(this.audio); }
    if (action === 'close-sound') this.show(this.soundReturn || 'home');
    if (action === 'sound-test') { this.audio.wake(); this.audio.effect({ type: 'pickup' }); }
    if (action === 'evolution') { this.evolutionReturn = this.screen; if (this.state && !this.state.paused && !this.resultShown) this.setPause(true); this.syncProgression(); this.show('evolution'); this.renderEvolution(); }
    if (action === 'close-evolution') this.closeProgressionMenu(this.evolutionReturn, 'select');
    if (action === 'solo') { this.mode = 'solo'; this.show('select'); }
    if (action === 'online') { this.mode = 'online'; this.show('online'); $('#network-status').textContent = ''; }
    if (['home', 'quit', 'leave'].includes(action)) this.quit();
    if (action === 'play') await this.startSolo(0);
    if (action === 'controls') { this.controlsReturn = this.screen || 'pause'; if (this.state && !this.state.paused) this.setPause(true); this.show('controls'); }
    if (action === 'close-controls') this.show(this.controlsReturn || 'home');
    if (action === 'pause') this.setPause(true);
    if (action === 'resume') this.setPause(false);
    if (action === 'host') await this.host();
    if (action === 'copy') await this.copyInvitation();
    if (action === 'ready') { const player = this.lobby?.players[this.network.slot]; this.network.send({ type: 'ready', value: !player?.ready }); }
    if (action === 'retry-load') await this.pendingLoad?.();
    if (action === 'retry') {
      if(this.state?.sandbox){await this.startSecret(this.state.sandbox);return;}
      if (this.mode === 'online') this.network.send({ type: 'retry' });
      else {const saved=finalDuelCheckpoint(this.simulation?.snapshot()||this.state);if(saved){this.simulation=restoreCheckpoint(saved);this.state=this.simulation.state;this.resultShown=false;this.renderer.reset();await this.load(6,()=>this.show(null));}else await this.startSolo(0);}
    }
    if (action === 'continue-solo') this.continueSolo();
  }
  async load(chapter, complete) {
    const generation = ++this.loadingGeneration;
    this.pendingLoad = () => this.load(chapter, complete);
    this.show('loading'); $('#retry-load').classList.add('hidden'); $('#loading-detail').textContent = 'Chargement des décors et des combattants…'; $('#loading-progress').style.width = '0%';
    try {
      await this.assets.prepare(chapter, value => { if (generation === this.loadingGeneration) $('#loading-progress').style.width = `${Math.round(value * 100)}%`; });
      if (generation !== this.loadingGeneration) return;
      this.currentChapter = chapter; this.preferences.chapter = chapter; this.save();
      this.assets.trimBackgrounds(chapter, this.state ? nextDistrict(this.state) : chapter+1);
      this.assets.preloadChapter(this.state ? nextDistrict(this.state) : chapter+1).catch(() => {});
      complete();
    } catch (error) {
      if (generation !== this.loadingGeneration) return;
      $('#loading-detail').textContent = 'Un élément n’a pas pu être chargé. Vérifie ta connexion, puis réessaie.';
      $('#retry-load').classList.remove('hidden'); console.error(error);
    }
  }
  async startSecret(options){
    this.persistRun();this.network.close(true);this.mode='solo';this.resultShown=false;this.accumulator=0;this.sceneryStreet='';
    this.simulation=createSecretSession(options);this.state=this.simulation.state;this.simulation.pause(true,'loading');this.renderer.reset();this.input.resetRun();
    await this.load(this.state.chapter,()=>{this.simulation.pause(false);this.show(null);this.audio.wake();});
  }
  async startSolo(chapter = 0) {
    const startingChoice = !this.state ? this.profiles[this.selected]?.talents.slice(0, 1) : [];
    this.network.close(true); this.mode = 'solo'; this.resultShown = false; this.state = null; this.simulation = null;
    this.resetProgression(); this.clearRunSave();
    if (startingChoice?.length) this.profiles[this.selected] = normalizeProfile({ talents: startingChoice }, this.selected);
    this.simulation = new Simulation([this.selected], chapter, Date.now(), { randomRoute:true, difficulty: $('#difficulty-select').value, profiles: [this.profiles[this.selected]] }); this.state = this.simulation.state;
    await this.load(this.state.chapter, () => {
      this.sceneryStreet = '';
      this.renderer.reset(); this.input.resetRun(); this.accumulator = 0; this.show(null); this.audio.wake();
      this.renderer.hud(this.state, 0, false, 0);
    });
  }
  async connectOnline() {
    this.network.close(true); this.mode = 'online'; $('#network-status').textContent = 'Connexion au point de rendez-vous…';
    $$('#online-form button').forEach(b => { b.disabled = true; });
    try { await this.network.connect(); }
    finally { $$('#online-form button').forEach(b => { b.disabled = false; }); }
  }
  async host() {
    this.resetProgression(); this.clearRunSave();
    try { await this.connectOnline(); this.network.send({ type: 'create', character: this.selected, difficulty: $('#difficulty-select').value }); }
    catch (error) { this.setNetworkError(error.message); }
  }
  async join() {
    const code = $('#room-input').value.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) { this.setNetworkError('Entre les 6 caractères du code de ton pote.'); return; }
    this.resetProgression(); this.clearRunSave();
    await this.connectOnline(); this.network.send({ type: 'join', code, character: this.selected });
  }
  async resumeConnection(session) {
    this.mode = 'online'; this.show('online'); $('#network-status').textContent = 'Reconnexion à ta partie…';
    try { await this.network.connect(); this.network.send({ type: 'join', ...session }); }
    catch (error) { this.setNetworkError(error.message); }
  }
  setNetworkError(message) { $('#network-status').textContent = message; if (this.screen !== 'online') this.toast(message); }
  onNetwork(message) {
    if (message.type === 'joined') { $('#network-status').textContent = ''; this.mode = 'online'; }
    if (message.type === 'lobby') {
      this.lobby = message;
      if (message.phase === 'lobby') { this.resetProgression(); this.state = null; this.simulation = null; this.resultShown = false; if (this.screen !== 'evolution') this.show('lobby'); }
      this.renderLobby(message);
    }
    if (message.type === 'prepare') {
      this.resultShown = false;
      this.load(message.chapter, () => { $('#loading-detail').textContent = 'Prêt. On attend ton pote…'; this.network.send({ type: 'loaded' }); });
    }
    if (message.type === 'waiting') $('#loading-detail').textContent = message.message;
    if (message.type === 'start') {
      this.sceneryStreet = '';
      this.mode = 'online'; this.simulation = null; this.state = message.state; this.lastSnapshot = performance.now();
      this.renderer.reset(); this.input.resetRun(); this.resultShown = false; this.show(null); this.audio.wake();
      this.renderer.seenEvent = this.state.eventSeq; this.renderer.hud(this.state, this.network.slot, true, this.network.ping);
    }
    if (message.type === 'state') {
      this.state = message.state; this.lastSnapshot = performance.now();
      this.syncProgression();
      if (['won', 'over'].includes(this.state.phase)) this.finish();
    }
    if (message.type === 'paused') {
      if (this.state) { this.state.paused = message.value !== false; this.state.pauseReason = message.reason; }
      if (message.value === false) this.show(null);
      else if (this.state && !['evolution', 'attributes'].includes(this.screen)) this.pauseScreen(message.reason, message.slot);
    }
    if (message.type === 'closed') { this.quit(); this.toast(message.message); }
    if (message.type === 'error') {
      if (this.state?.pauseReason === 'reconnecting') { this.network.close(); this.pauseScreen('expired'); }
      if (this.network.code && /n’existe|déjà connecté/.test(message.message)) { this.network.close(); if (this.state) this.pauseScreen('expired'); else this.show('online'); }
      this.setNetworkError(message.message);
    }
  }
  networkStatus(status, message) {
    if (status === 'reconnecting') {
      if (this.state) { this.state.paused = true; this.pauseScreen('reconnecting'); }
      else if (this.screen === 'lobby') $('#lobby-status').textContent = 'Connexion coupée. On essaie de te reconnecter…';
    } else if (status === 'error') this.setNetworkError(message);
  }
  renderLobby(room) {
    $('#room-code').textContent = room.code;
    $('#room-players').innerHTML = [0, 1].map(slot => {
      const p = room.players[slot];
      if (!p) return '<div class="room-player"><span style="font-size:30px;color:#758294">＋</span><div><b>Une place pour ton pote</b><small>Partage le code ou le lien d’invitation.</small></div></div>';
      const c = fighter(p.character);
      return `<div class="room-player"><img src="/assets/${c.id}/${c.id}_p.png" alt=""><div><b>${c.name}</b><small>Joueur ${slot + 1}${slot === this.network.slot ? ' · toi' : ''}${slot === 0 ? ' · hôte' : ''}</small></div><span class="player-status">${!p.connected ? 'RECONNEXION' : p.ready ? '✓ PRÊT' : 'SE PRÉPARE'}</span></div>`;
    }).join('');
    const me = room.players[this.network.slot];
    if (me) { $('#online-fighter').value = me.character; this.selected = me.character; }
    $('#online-difficulty').value = room.difficulty || 'normal'; $('#online-difficulty').disabled = this.network.slot !== 0;
    $('#ready-button').innerHTML = me?.ready ? '<span>Prêt. J’attends mon pote.</span><span>✓</span>' : '<span>Je suis prêt</span><span>✓</span>';
    $('#lobby-status').textContent = room.players.every(p => p?.connected) ? 'Choisissez vos combattants. La partie commence quand vous êtes tous les deux prêts.' : 'Le salon est ouvert. Plus qu’à réunir la bande.';
    this.setLobbyPortrait();
  }
  setLobbyPortrait() { const c = fighter(this.selected); $('#lobby-portrait').src = `/assets/${c.id}/${c.id}_p.png`; $('#lobby-portrait').alt = c.name; }
  async copyInvitation() {
    const url = new URL(location.pathname, location.origin); url.searchParams.set('room', this.network.code);
    try { await navigator.clipboard.writeText(url.href); this.toast('Invitation copiée. Envoie-la à ton pote !'); }
    catch { this.toast(`Code à partager : ${this.network.code}`, 8000); }
    if (['localhost', '127.0.0.1'].includes(location.hostname)) this.toast(`Code ${this.network.code} · Sur un autre appareil, ouvre l’adresse réseau du serveur, puis saisis ce code.`, 9000);
  }
  focusLost() {
    if (!this.state || this.screen || this.state.paused || this.resultShown) return;
    if (this.mode === 'solo') this.setPause(true);
    else this.network.send({ type: 'input', input: this.input.neutral() });
  }
  togglePause() {
    if (this.screen === 'sound') { this.show(this.soundReturn || 'home'); return; }
    if (this.screen === 'evolution') { this.closeProgressionMenu(this.evolutionReturn, 'select'); return; }
    if (this.screen === 'attributes') { this.closeProgressionMenu(this.rogueReturn, 'pause'); return; }
    if (this.screen === 'controls') { this.show(this.controlsReturn || 'home'); return; }
    if (!this.state || this.resultShown) { if (this.screen !== 'home') this.quit(); return; }
    if (this.screen === 'loading') return;
    if (this.screen === 'pause' && this.state.pauseReason && this.state.pauseReason !== 'manual') return;
    this.setPause(!this.state.paused);
  }
  closeProgressionMenu(returnScreen, fallback) {
    if (returnScreen === null && this.state && !this.resultShown) {
      if (this.state.paused && this.state.pauseReason && this.state.pauseReason !== 'manual') {
        this.pauseScreen(this.state.pauseReason);
        return;
      }
      this.setPause(false);
    } else this.show(returnScreen || fallback);
  }
  setPause(value) {
    if (!this.state || this.resultShown) return;
    this.input.clear();
    if (this.mode === 'online') { this.network.send({ type: 'pause', value }); if (value) { this.state.paused = true; this.pauseScreen('manual'); } }
    else { this.simulation.pause(value, 'manual'); if (value) this.pauseScreen('manual'); else this.show(null); }
  }
  pauseScreen(reason = 'manual', slot) {
    const manual = reason === 'manual';
    if (this.state) this.state.pauseReason = reason;
    $('#pause-kicker').textContent = manual ? 'LA RUE PEUT ATTENDRE.' : 'ON GARDE TA PLACE.';
    $('#pause-title').innerHTML = manual ? 'ON <em>SOUFFLE.</em>' : 'ON SE <em>RETROUVE.</em>';
    $('#pause-copy').textContent = manual ? (this.mode === 'online' ? 'Pause pour toute la bande. Chacun peut reprendre.' : 'Prends ton temps. On reprend quand tu veux.') : reason === 'reconnecting' ? 'Ta connexion a été coupée. Reconnexion automatique en cours…' : reason === 'left' || reason === 'expired' ? 'Ton pote a quitté la partie. Tu peux continuer seul avec ton combattant.' : `La connexion du joueur ${(slot ?? 1) + 1} a été coupée. La partie attend son retour pendant 45 secondes.`;
    $('#resume-button').classList.toggle('hidden', !manual); $('#continue-solo').classList.toggle('hidden', manual || !this.state);
    this.show('pause');
  }
  continueSolo() {
    if (!this.state) return;
    const slot = this.network.slot;
    const p = this.state.players[slot];
    this.network.close(true); this.mode = 'solo'; this.selected = p.kind;
    this.simulation = new Simulation([p.kind], this.state.chapter, Date.now(), { difficulty: this.state.difficulty, profiles: [p.progression] });
    this.simulation.state = JSON.parse(JSON.stringify(this.state));
    this.simulation.state.players = [{ ...p, id: 1, connected: true }];
    const encounter = this.simulation.state.neighborhoodEncounter;
    if (this.simulation.state.route) this.simulation.state.routeReady={};
    if (encounter) {
      if (encounter.carrier) encounter.carrier = encounter.carrier === p.id ? 1 : null;
      if (encounter.ball?.owner) encounter.ball.owner = encounter.ball.owner === p.id ? 1 : null;
      for (const key of ['choices', 'shots', 'hits', 'nextThrows', 'held', 'guesses', 'withdrawn', 'wins', 'boarded', 'votes', 'equipment']) if (encounter[key]) {
        encounter[key] = encounter[key][p.id] != null ? { 1: encounter[key][p.id] } : {};
      }
    }
    this.simulation.state.gymProjectiles = (this.simulation.state.gymProjectiles || []).filter(b => b.owner === p.id).map(b => ({ ...b, owner: 1 }));
    this.simulation.nextId = Math.max(10, ...[...this.state.enemies, ...this.state.props, ...this.state.pickups, ...this.state.hazards, ...this.state.allies].map(e => e.id)) + 1;
    for (const entity of [...this.simulation.state.hazards, ...this.simulation.state.allies, ...this.simulation.state.props]) if (!entity.enemy) entity.owner = entity.owner === p.id ? 1 : -1;
    this.simulation.pause(false); this.state = this.simulation.state;
    if (this.state.players[0].hp <= 0) this.simulation.revivePlayer(this.state.players[0], .6);
    this.renderer.reset(); this.show(null); this.toast('Tu continues en solo. La rue est à toi.');
  }
  finish() {
    if (this.resultShown) return;
    this.persistRun();
    this.resultShown = true; const win = this.state.phase === 'won';
    if (!this.state.practice && !this.state.sandbox) { this.preferences.record = Math.max(this.preferences.record, this.state.score); this.save(); this.updateRecord(); }
    $('#result-kicker').textContent = win ? 'LE JOUR SE LÈVE SUR SARAN.' : 'LA NUIT N’EST PAS FINIE.';
    $('#result-title').innerHTML = win ? 'LA BANDE.<br><em>LA LÉGENDE.</em>' : 'ON REMET<br><em>ÇA ?</em>';
    $('#result-copy').textContent = win ? 'Six quartiers libérés. Les six revanches gagnées. Gustavax est à terre : Saran est à vous.' : this.state.chapter===6&&this.state.stage===6?'Gustavax tient encore debout. Reprends directement son combat, sans refaire les six revanches.':`${CHAPTERS[this.state.chapter].name}, rue ${this.state.stage + 1}. Une nouvelle partie tirera un nouvel itinéraire.`;
    if(this.state.sandbox)$('#result-copy').textContent=win?'Essai terminé. Choisis un autre niveau ou un autre adversaire dans le menu secret.':'Relance cet essai ou change les paramètres dans le menu secret.';
    $('#result-score').textContent = number(this.state.score); $('#result-combo').textContent = `${this.state.bestCombo} HITS`;
    $('#retry-button').disabled = this.mode === 'online' && this.network.slot !== 0;
    $('#retry-button').innerHTML = `<span>${this.mode === 'online' && this.network.slot !== 0 ? 'L’hôte peut relancer' : this.state.chapter===6&&this.state.stage===6&&!win?'Reprendre face à Gustavax':'Remettre ça'}</span><span>↗</span>`;
    this.show('result');
  }
  quit() {
    this.persistRun();
    this.syncProgression();
    ++this.loadingGeneration; this.network.close(true); this.state = null; this.simulation = null; this.resultShown = false; this.mode = 'solo';
    this.resetProgression();
    this.renderer.reset(); this.pendingLoad = null; this.updateRecord(); this.show('home');

    if (location.search) history.replaceState(null, '', location.pathname);
  }
  gamepadMenu(action) {
    if (action === 'start') {
      if (this.screen === 'select') {
        const highlighted = document.activeElement?.dataset.fighter;
        if (highlighted) this.select(highlighted);
        $('#play-button').click();
      } else if (this.screen === 'pause') this.togglePause();
      return;
    }
    if (action === 'back' && this.screen === 'attributes') { this.closeProgressionMenu(this.rogueReturn, 'pause'); return; }
    if (this.screen === 'sound' && action === 'back') { this.show(this.soundReturn || 'home'); return; }
    if (this.screen === 'sound' && document.activeElement?.type === 'range' && ['left', 'right', 'accept'].includes(action)) {
      const slider = document.activeElement;
      if (action !== 'accept') { slider.value = clamp(Number(slider.value) + (action === 'left' ? -5 : 5), 0, 100); slider.dispatchEvent(new Event('input')); }
      return;
    }
    if (action === 'back') { if (this.screen === 'evolution') this.closeProgressionMenu(this.evolutionReturn, 'select'); else if (this.screen === 'controls') this.show(this.controlsReturn || 'home'); else if (this.screen === 'pause') this.togglePause(); else this.quit(); return; }
    const items = this.focusables(); if (!items.length) return;
    let index = items.indexOf(document.activeElement);
    if (index < 0) { items[0].focus(); index = 0; if (action !== 'accept') return; }
    if (this.screen === 'select' && document.activeElement?.dataset.fighter && ['left', 'right'].includes(action)) {
      const cards = [...$('#roster').querySelectorAll('[data-fighter]')], current = cards.indexOf(document.activeElement);
      const next = cards[(current + (action === 'right' ? 1 : -1) + cards.length) % cards.length];
      next.focus(); this.select(next.dataset.fighter); return;
    }
    if (this.screen === 'evolution' && document.activeElement?.dataset.talent && ['left', 'right'].includes(action)) {
      const nodes = [...document.querySelectorAll('[data-talent]')], n = nodes.indexOf(document.activeElement);
      const ranks = nodes.length / 3;
      nodes[(n + (action === 'right' ? ranks : -ranks) + nodes.length) % nodes.length]?.focus(); return;
    }
    if (action === 'accept') { if (document.activeElement instanceof HTMLInputElement) { const el = document.activeElement; el.value = el.value.toUpperCase().padEnd(6, 'A'); this.codeCursor = ((this.codeCursor ?? -1) + 1) % 6; el.setSelectionRange(this.codeCursor, this.codeCursor + 1); this.toast(`Code · caractère ${this.codeCursor + 1}/6 : ← → pour changer, A pour avancer. ↓ pour Rejoindre.`); } else document.activeElement?.click(); return; }
    if (document.activeElement?.id === 'room-input' && ['left', 'right'].includes(action)) {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', el = document.activeElement, chars = el.value.padEnd(6, 'A').split(''), cursor = this.codeCursor ?? 0;
      chars[cursor] = alphabet[(Math.max(0, alphabet.indexOf(chars[cursor])) + (action === 'left' ? -1 : 1) + alphabet.length) % alphabet.length]; el.value = chars.join(''); el.setSelectionRange(cursor, cursor + 1); return;
    }
    if (document.activeElement instanceof HTMLSelectElement && ['left', 'right'].includes(action)) {
      const select = document.activeElement; select.selectedIndex = clamp(select.selectedIndex + (action === 'left' ? -1 : 1), 0, select.options.length - 1); select.dispatchEvent(new Event('change')); return;
    }
    const delta = ['up', 'left'].includes(action) ? -1 : 1; items[(index + delta + items.length) % items.length].focus();
  }
  syncProgression() {
    if (this.state?.practice || this.state?.sandbox) return;
    const p = this.state?.players[this.mode === 'online' ? this.network.slot : 0];
    if (!p?.progression) return;
    const profile = normalizeProfile(p.progression);
    if (JSON.stringify(profile) === JSON.stringify(this.profiles[p.kind])) return;
    if (profile.milestones.length > (this.profiles[p.kind]?.milestones.length || 0)) this.toast('Point de talent obtenu ! Choisis ton amélioration.', 3500);
    this.profiles[p.kind] = profile;
    if (this.screen === 'evolution') this.renderEvolution();
    if (this.screen === 'attributes') this.renderRogue();
  }
  resetProgression() {
    this.profiles = Object.fromEntries(FIGHTERS.map(f => [f.id, normalizeProfile({}, f.id)]));
    try { localStorage.removeItem(TALENT_SAVE_KEY); } catch {}
  }
  renderEvolution() {
    const p = this.state?.players[this.mode === 'online' ? this.network.slot : 0], kind = p?.kind || this.selected;
    renderEvolution(kind, p?.progression || this.profiles[kind], stat => {
      if (this.state && this.mode === 'online') { this.network.send({ type: 'spend', stat }); return; }
      if (this.simulation) { if (!this.simulation.spendStat(0, stat)) return; this.syncProgression(); }
      else { const next = spendPoint(this.profiles[kind], stat); if (!next) return; this.profiles[kind] = next; }
      this.audio.confirm(); this.renderEvolution();
    });
  }
  renderRogue() {
    const slot = this.mode === 'online' ? this.network.slot : 0, player = this.state?.players[slot];
    renderAttributes(player, key => {
      if (this.mode === 'online') this.network.send({ type: 'attribute', key });
      else if (this.simulation?.spendAttribute(slot, key)) { this.syncProgression(); this.renderRogue(); }
    });
  }
  clearRunSave() { try { localStorage.removeItem(RUN_SAVE_KEY); } catch {}  }
  persistRun() {
    if (!this.state || this.state.practice || this.state.sandbox) return;
    try {
      recordRun(this.state, this.mode === 'online' ? this.network.slot : 0);
      const finalSave=finalDuelCheckpoint(this.simulation?.snapshot()||this.state);if(finalSave){localStorage.setItem(RUN_SAVE_KEY,JSON.stringify(finalSave));return;}
      if (['over', 'won'].includes(this.state.phase)) {
        const saved = readCheckpoint(); if (saved?.runId === this.state.runId) localStorage.removeItem(RUN_SAVE_KEY);
        return;
      }
      const saved = checkpoint(this.simulation ? this.simulation.snapshot() : this.state);
      if (saved) localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(saved));
    } catch (error) { if (!this.saveWarning) { this.saveWarning = true; this.toast('Sauvegarde locale indisponible : ' + error.message); } }
  }
  frame(now) {
    requestAnimationFrame(time => this.frame(time));
    const dt = Math.min(.075, (now - this.lastFrame) / 1000); this.lastFrame = now;
    const input = this.input.sample();
    if (now - (this.lastCheckpoint || 0) > 1000) { this.lastCheckpoint = now; this.persistRun(); }
    if (now - (this.lastProgressSave || 0) > 200) { this.lastProgressSave = now; this.syncProgression(); }
    if (this.simulation && this.state && !this.state.paused) {
      this.accumulator = Math.min(.12, this.accumulator + dt);
      while (this.accumulator >= STEP) { this.simulation.step([input]); this.accumulator -= STEP; }
      this.state = this.simulation.state;
      if (this.state.chapter !== this.currentChapter && !['won', 'over'].includes(this.state.phase)) {
        this.simulation.pause(true, 'loading');
        this.load(this.state.chapter, () => { this.simulation.pause(false); this.show(null); });
      }
      if (['won', 'over'].includes(this.state.phase)) this.finish();
    }
    if (this.mode === 'online' && this.state && now - this.lastInputSend > 1000 / 30) { this.lastInputSend = now; this.network.send({ type: 'input', input }); }
    if(this.state?.phase==='badges' && ['badges',null].includes(this.screen)){
      if(this.screen!=='badges') {this.show('badges');this.persistRun();}
      renderRouteUI(this.state,this.mode==='online'?this.network.slot:0);
    } else if(this.screen==='badges' && this.state?.phase!=='badges') this.show(null);
    if (this.state) {
      const player = this.state.players[this.mode === 'online' ? this.network.slot : 0];
      const key = `${this.state.chapter}:${this.state.stage}`;
      if (this.sceneryStreet !== key || this.state.decor === null && this.mode === 'solo') {
        this.sceneryStreet = key;
        const decor = [];
        if (this.mode === 'solo') this.state.decor = decor;
        else if (this.network.slot === 0) this.network.send({ type: 'scenery', chapter: this.state.chapter, stage: this.state.stage, items: decor.map(d => [d.key, d.x, d.y, d.height, d.facing || 1]) });
      }
    }
    this.renderer.draw(this.state, dt, { online: this.mode === 'online', slot: this.mode === 'online' ? this.network.slot : 0, input, age: (now - this.lastSnapshot) / 1000, ping: this.network.ping });
    this.audio.update(!!this.state && !this.screen, this.state?.chapter || 0,
      this.state?.enemies.some(e => e.boss && e.hp > 0),
        document.hidden || (!!this.state?.paused && ['pause', 'evolution', 'attributes', 'loading', 'controls', 'sound', null].includes(this.screen)),
        this.state?.players.some(p=>p.specialState?.transformation&&p.kind==='yanu'&&p.specialState.branch===1&&p.specialState.rank===6));
  }
}

new Game();
