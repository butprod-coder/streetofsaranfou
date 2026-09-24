import { drawFinalArena, drawGustavax, drawFinalSmoke } from './final-renderer.js';
import { routeDepth } from './campaign-route.js';
import { drawNightDarkness } from './late-renderer.js';
import { drawBourgTable } from './bourg-renderer.js';
import { W, H, FLOOR, CHAPTERS, fighter, ENEMIES, clamp } from './data.js';
import { VISUALS, PATTERN_LABELS, TRANSFORM_ROWS } from './visuals.js';
import { BALANCE } from './balance.js';
import { golfBodies } from './golf.js';
import { ELITES, ELITE_LABELS } from './elite-data.js';
import { CLASSIC_SPRITES } from './classic-sprites.js';
import { ENCORE_ELITES, ENCORE_RULES } from './elite-encore-data.js';
import { streetDecor } from './scenery.js';
import { WEAPONS, GRAPPLE } from './weapons.js';
import { xpForLevel } from './progression.js';
import { drawNeighborhoodWorld, drawNeighborhoodChoices, drawNeighborhoodPanel, neighborhoodHint } from './neighborhood-renderer.js';
import { drawCostumeEnemy, drawCostumeHazard } from './costume-renderer.js';
import { STREET_ENEMIES, STREET_LABELS } from './street-enemies-data.js';
import { JO_PALLET_LANES } from './boss-jo.js';
import { CHAPTER_INTROS, hasChapterIntro, INTRO_DURATION, INTRO_REVEAL } from './chapter-intro.js';
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2;
const BOSS_PRESENTATIONS = {
  karonux: ['KARONUX', 'Meme pas du chêne Batard'],
  kikor: ['KIKOR', 'Benjamin présent dit le Rennais'],
  yanu: ['YANU', 'La bête qui sommeil BOW !'],
  lorenzo: ['LORENZO', 'Le bakablai du quartier'],
  jo: ['JO LA MOUK', 'La Jejette Suisse'],
  jualos: ['JUALOS', 'Le baron vert'],
};
const scoreText = n => String(Math.floor(n)).padStart(6, '0').replace(/(\d{3})$/, ' $1');

export class Renderer {
  constructor(canvas, assets, audio) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.assets = assets; this.audio = audio;
    this.effects = []; this.seenEvent = 0; this.shake = 0; this.visual = new Map(); this.street = ''; this.hudTime = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scale = 1; this.resize(); addEventListener('resize', () => this.resize());
    this.vignette = this.ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .63);
    this.vignette.addColorStop(0, '#00000000'); this.vignette.addColorStop(1, '#0309159c');
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); this.scale = Math.min(1.5, Math.max(1, rect.width / W * Math.min(devicePixelRatio, 1.5)));
    this.canvas.width = Math.round(W * this.scale); this.canvas.height = Math.round(H * this.scale);
  }
  reset() { this.effects = []; this.seenEvent = 0; this.visual.clear(); this.street = ''; this.hudTime = 0; this.hudKey = ''; }
  consume(state) {
    for (const e of state.events) {
      if (e.id <= this.seenEvent) continue;
      this.seenEvent = e.id; this.audio.effect(e);
      if (e.type === 'hit') {
        this.shake = Math.max(this.shake, e.heavy ? 5 : 2.2);
        this.effects.push({ type: 'number', x: e.x, y: e.y - 20, text: String(e.amount), color: e.enemy ? '#ffe1a4' : '#ff8b8b', ttl: .7, life: .7 });
        for (let i = 0; i < (e.heavy ? 15 : 9); i++) {
          const angle = Math.random() * TAU, speed = 70 + Math.random() * 250;
          this.effects.push({ type: 'spark', x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, ttl: .2 + Math.random() * .18, life: .4, color: i % 3 ? '#ffcd6e' : '#fff8df' });
        }
      }
      if (e.type === 'special') { if (e.kind === 'thunder') this.effects.push({ type: 'announcement', text: e.label.toUpperCase(), color: '#bfeeff', ttl: .9, life: .9 }); else { this.shake = 7; this.effects.push({ ...e, type: 'special', ttl: .7, life: .7 }); } }
      if (e.type === 'thunder') this.shake = Math.max(this.shake, 5);
      if (e.type === 'ember') { this.shake = Math.max(this.shake, 2); this.effects.push({ ...e, type: 'ember', ttl: .48, life: .48 }); }
      if (e.type === 'break') for (let i = 0; i < 10; i++) this.effects.push({ type: 'spark', x: e.x, y: e.y, vx: (Math.random() - .5) * 260, vy: -Math.random() * 200, ttl: .6, life: .6, color: '#d2a36c' });
      if (e.type === 'dodge') this.effects.push({ ...e, type: 'dash', ttl: .32, life: .32 });
      if (e.type === 'skid') { this.shake = Math.max(this.shake, 3); this.effects.push({ ...e, type: 'dash', ttl: .45, life: .45 }); }
      if (e.type === 'golf') this.audio.effect({ ...e, type: 'skid' });
      if(e.type==='gustavaxCrash'){this.shake=Math.max(this.shake,6);for(let i=0;i<9;i++)this.effects.push({type:'spark',x:e.x,y:e.y,vx:(Math.random()-.5)*240,vy:-Math.random()*170,ttl:.5,life:.5,color:'#c8a16a'});}
      if (e.type === 'explosion') { this.shake = 7; this.effects.push({ ...e, type: 'special', label: 'BOUM !', ttl: .5, life: .5 }); }
      if (e.type === 'pickup') this.effects.push({ type: 'number', x: e.x, y: e.y, text: e.kind === 'food' ? `+${e.amount ?? BALANCE.scenery.food} PV` : `+${e.amount ?? BALANCE.scenery.energy} ÉNERGIE`, color: '#98efc9', ttl: .9, life: .9 });
      if (e.type === 'equip') this.effects.push({ type: 'number', x: e.x, y: e.y, text: e.label.toUpperCase(), color: '#a5dbff', ttl: 1.1, life: 1.1 });
      if (e.type === 'throw') this.shake = Math.max(this.shake, 3);
      if (e.type === 'rogueFX') this.effects.push({ ...e, type: 'rogueFX', ttl: .45, life: .45 });
      if (e.type === 'gunshot') {
        this.effects.push({ ...e, type: 'shot', ttl: .22, life: .22 });
        this.effects.push({ type: 'spark', x: e.x - e.facing * 30, y: e.y, vx: -e.facing * 100, vy: -110, color: '#dcb56b', ttl: .35, life: .35 });
        if (e.weapon === 'shotgun') this.shake = Math.max(this.shake, 5);
      }
      if (e.type === 'revive') this.effects.push({ type: 'number', x: e.x, y: e.y - 130, text: 'DEBOUT, POTO !', color: '#98efc9', ttl: 1.3, life: 1.3 });
      if (e.type === 'rage') this.effects.push({ type: 'announcement', text: e.label.toUpperCase(), color: '#ff8279', ttl: 2, life: 2 });
      if (e.type === 'ko' && e.boss) { this.shake = 8; this.effects.push({ type: 'announcement', text: 'LE PATRON EST À TERRE', color: '#ffe0a3', ttl: 2.6, life: 2.6 }); }
      if (e.type === 'elite') this.effects.push({ type: 'announcement', text: `ÉLITE · ${e.label.toUpperCase()}`, color: '#d6b4ff', ttl: 1.5, life: 1.5 });
      if (e.type === 'taunt') this.effects.push({ type: 'number', x: e.x, y: e.y, text: e.label, color: '#ffe5a7', ttl: 1.7, life: 1.7 });
      if (e.type === 'spectacle') { this.shake = Math.max(this.shake, 5); this.effects.push({ ...e, type: 'atlasFX', ttl: .5, life: .5 }); }
      if (!e.neighborhood && (['wave', 'breather'].includes(e.type) || e.type === 'surprise' && state.phase !== 'surprise')) this.effects.push({ type: 'announcement', text: e.label, color: e.type === 'surprise' ? '#94efdb' : '#ffdb91', ttl: 1.8, life: 1.8 });
      if (['heal', 'opening'].includes(e.type)) this.effects.push({ type: 'number', x: e.x, y: e.y, text: e.type === 'heal' ? `+${e.amount} PV` : e.label, color: '#9feecb', ttl: 1.1, life: 1.1 });
      if (e.type === 'talent' && !this.effects.some(f => f.type === 'announcement' && f.text === e.label && f.ttl > 0)) this.effects.push({ type: 'announcement', text: e.label, color: '#ffe084', ttl: 4, life: 4 });
    }
    if (this.effects.length > 200) this.effects.splice(0, this.effects.length - 200);
  }
  draw(state, dt, { online = false, slot = 0, input = {}, age = 0, ping = 0 } = {}) {
    const c = this.ctx;
    document.body.classList.toggle('chapter-story', !!state && hasChapterIntro(state));
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0); c.fillStyle = '#090d16'; c.fillRect(0, 0, W, H);
    if (!state) return;
    if (hasChapterIntro(state)) { this.chapterStory(state); return; }
    const key = `${state.chapter}:${state.stage}`;
    if (key !== this.street) { this.street = key; this.visual.clear(); this.effects = []; this.decor = streetDecor(state.chapter, state.stage); }
    this.consume(state);
    c.save();
    if (!this.reducedMotion && this.shake > .1 && !state.paused) c.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake * .65);
    this.shake *= Math.exp(-dt * 16);
    const background = this.assets.get(CHAPTERS[state.chapter].backgrounds[state.stage]);
    if (background) {
      const scale = Math.max(W / background.width, H / background.height);
      if(state.chapter===6)c.drawImage(background,0,0,W,H);
      else c.drawImage(background, (W - background.width * scale) / 2, (H - background.height * scale) / 2, background.width * scale, background.height * scale);
    }
    const tint = c.createLinearGradient(0, 0, 0, H); tint.addColorStop(0, '#09142c05'); tint.addColorStop(.6, '#10274605'); tint.addColorStop(1, '#08101e5c');
    c.fillStyle = tint; c.fillRect(0, 0, W, H);
    this.atmosphere(state.time);
    if(state.chapter!==6)this.livingScenery(state);
    drawFinalArena(this,state);
    this.drawRogueWorld(state);
    if (state.bossCinema?.kind === 'exit') {
      const shot = state.bossCinema;
      this.arcadeSprite('bossGolf', shot.x + 65, shot.y - 8, 3, 145, -1);
      for (let i = 0; i < 5; i++) this.ellipse(shot.x + 120 + Math.sin(i + state.time) * 18, shot.y - 75 - (shot.elapsed * 60 + i * 24) % 170, 20 + i * 5, 14 + i * 3, '#9bafbd55');
    }
    this.drawJoTraffic(state);
    drawNightDarkness(this, state);
    for (const h of state.hazards || []) {this.drawHazard(h,state.time);if(h.kind==='finalChair')this.arcadeSprite('bossGustavax',h.x,h.y,2,135,h.facing);}
    if (state.phase === 'clear') this.exit(state);
    drawNeighborhoodWorld(this, state);
    for (const p of state.props.filter(p => p.hp <= 0 && p.rubble > 0)) this.prop(p);
    const entities = [...state.props.filter(p => p.hp > 0).map(p => ({ ...p, prop: true })), ...state.pickups.map(p => ({ ...p, pickup: true })), ...state.enemies, ...state.players, ...(state.allies || [])].sort((a, b) => a.y - b.y || Number(a.enemy) - Number(b.enemy));
    for (const entity of entities) {
      if (entity.scenery) this.scenery(entity);
      else if (entity.prop) this.prop(entity);
      else if (entity.pickup) this.pickup(entity, state.time);
      else {
        let targetX = entity.x, targetY = entity.y;
        if (online && entity.id === slot + 1 && entity.action !== 'dodge' && !entity.specialState && !entity.caughtBy && !entity.yanuFrozen && !entity.jualosSlip && !state.paused && ['fight', 'surprise', 'rest', 'clear'].includes(state.phase) && entity.hp > 0 && entity.stun <= 0) {
          const factor = (entity.attack ? .32 : 1) * (state.chapter === 2 && state.stadium?.boostStage === state.stage ? 1.15 : 1), norm = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
          targetX = clamp(targetX + (input.x || 0) / norm * entity.speed * factor * Math.min(.13, age + ping / 2000), FLOOR.left, FLOOR.right);
          targetY = clamp(targetY + (input.y || 0) / norm * entity.speed * .68 * factor * Math.min(.13, age + ping / 2000), FLOOR.top, FLOOR.bottom);
        }
        const previous = this.visual.get(entity.id) || { x: targetX, y: targetY };
        const rate = online && Math.abs(previous.x - targetX) < 200 ? (entity.id === slot + 1 ? 40 : 22) : 1000;
        previous.x += (targetX - previous.x) * (1 - Math.exp(-dt * rate)); previous.y += (targetY - previous.y) * (1 - Math.exp(-dt * rate));
        this.visual.set(entity.id, previous);
        c.save();
        if (entity.rogueGiant > state.time) { c.translate(previous.x, previous.y); c.scale(1.3, 1.3); c.translate(-previous.x, -previous.y); }
        if (entity.rogueFortress > state.time) { c.strokeStyle='#9bdeff';c.lineWidth=3;c.beginPath();c.ellipse(previous.x,previous.y-70,58,85,0,0,TAU);c.stroke(); }
        if (entity.rogueSheitan > state.time) { c.fillStyle='#d78bff';c.font='bold 22px monospace';c.textAlign='center';c.fillText('✦',previous.x,previous.y-185); }
        this.actor({ ...entity, x: previous.x, y: previous.y }, state, slot, online ? Math.min(age, .1) : 0);
        c.restore();
      }
    }
    drawFinalSmoke(this,state);
    drawNeighborhoodChoices(this, state);
    this.drawEffects(state.paused ? 0 : dt);
    c.fillStyle = this.vignette; c.fillRect(0, 0, W, H);
    if (state.phase === 'surprise') this.surprisePanel(state);
    drawNeighborhoodPanel(this, state);
    if (state.combo > 1 && state.comboTime > 0) {
      c.save(); c.translate(63, 217); c.rotate(-.06); c.fillStyle = '#ffbe5c'; c.shadowColor = '#060c16'; c.shadowBlur = 6;
      c.font = 'italic 52px Impact, sans-serif'; c.fillText(`${state.combo}`, 0, 0); c.font = '16px Impact, sans-serif'; c.fillText('HITS', 8, 22); c.restore();
    }
    if (state.phase === 'intro' && !(state.chapter===6&&state.stage===6)) this.intro(state);
    if (state.bossCinema) this.bossCinema(state);
    if (state.phase === 'transition') { c.fillStyle = `rgba(5,9,16,${clamp(1 - state.phaseTime / .65, 0, 1)})`; c.fillRect(0, 0, W, H); }
    c.restore();
    this.hudTime += dt;
    if (this.hudTime > .07) { this.hudTime = 0; this.hud(state, slot, online, ping); }
  }
  bossCinema(state) {
    const c = this.ctx, shot = state.bossCinema, boss = state.enemies.find(e => e.id === shot.actor);
    if (!boss) return;
    const fade = Math.min(1, shot.elapsed * 3, (shot.duration - shot.elapsed) * 3);
    c.save(); c.globalAlpha = fade; c.fillStyle = '#04080ff2'; c.fillRect(0, 0, W, 94); c.fillRect(0, H - 105, W, 105);
    c.fillStyle = '#e9b96b'; c.fillRect(60, H - 106, W - 120, 2);
    c.textAlign = 'left'; c.font = 'bold 16px monospace'; c.fillText(shot.kind === 'exit' ? 'ACTE II / LA PORTIÈRE CLAQUE' : 'FIN DE QUARTIER / LE PATRON', 64, 55);
    if (shot.kind === 'arrival') {
      c.restore(); this.bossPresentation(boss, shot); return;
    }
    c.font = 'italic bold 48px Impact, sans-serif'; c.fillStyle = '#fff0d3'; c.fillText(boss.kind === 'jo' ? 'JO LA MOUK' : fighter(boss.kind).name.toUpperCase(), 64, H - 48);
    c.font = '14px monospace'; c.fillStyle = '#e7bc80'; c.textAlign = 'right';
    c.fillText(boss.kind === 'karonux' ? shot.kind === 'exit' ? 'GRAND. NERVEUX. PAS RÉVEILLÉ.' : 'UNE GOLF. UN DERNIER AVERTISSEMENT.' : this.bossSubtitle(boss), W - 64, H - 43);
    c.restore();
  }
  bossPresentation(boss, shot) {
    const c = this.ctx, [name, description] = BOSS_PRESENTATIONS[boss.kind] || [fighter(boss.kind).name.toUpperCase(), this.bossSubtitle(boss)];
    const entrance = clamp(shot.elapsed / .65, 0, 1), departure = clamp((shot.elapsed - (shot.duration - .65)) / .65, 0, 1);
    const offset = this.reducedMotion ? 0 : -(W + 100) * (1 - entrance) ** 3 + (W + 100) * departure ** 3;
    c.save(); c.globalAlpha = this.reducedMotion ? Math.min(entrance, 1 - departure) : 1;
    c.fillStyle = '#04080f55'; c.fillRect(0, 94, W, H - 199);
    c.translate(W / 2 + offset, H / 2);
    c.shadowColor = '#000000aa'; c.shadowBlur = 24;
    c.fillStyle = '#080f1bf5'; c.beginPath(); c.moveTo(-570, -123); c.lineTo(595, -123); c.lineTo(555, 123); c.lineTo(-610, 123); c.closePath(); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#e9b96b'; c.fillRect(-555, -124, 1095, 4); c.fillRect(-540, 120, 1095, 4);
    c.fillStyle = '#e9b96b22';
    for (let i = 0; i < 5; i++) { c.save(); c.translate(-525 + i * 24, 0); c.transform(1, 0, -.2, 1, 0, 0); c.fillRect(0, -99, 9, 198); c.restore(); }
    c.textAlign = 'center'; c.fillStyle = '#e9b96b'; c.font = 'bold 13px monospace'; c.fillText('FIN DE QUARTIER  /  LE PATRON', 0, -85);
    c.font = 'italic bold 88px Impact, sans-serif'; c.lineWidth = 7; c.strokeStyle = '#03070d'; c.strokeText(name, 0, 12, 870); c.fillStyle = '#fff0d3'; c.fillText(name, 0, 12, 870);
    c.fillStyle = '#e9b96b'; c.fillRect(-40, 35, 80, 3);
    c.font = 'bold 25px monospace'; c.fillStyle = '#e7bc80'; c.fillText(description, 0, 80, 940);
    c.restore();
  }
  bossSubtitle(boss) { return boss.kind === 'jualos' ? 'LE DERNIER PATRON. LE VENTRE DES AFFAIRES.' : boss.kind === 'jo' ? 'LE BRAS LONG. LES POINGS VIFS. LIVRAISON BRUTALE.' : boss.kind === 'lorenzo' ? 'UNE BRAISE. UN TRÔNE. PLUS AUCUNE PATIENCE.' : boss.kind === 'yanu' ? 'LA MARÉE MONTE. LA BÊTE SE RÉVEILLE.' : boss.kind === 'kikor' ? 'LA TOILE PREND VIE. LE PEINTRE PERD LA TÊTE.' : `QUARTIER VERROUILLÉ · ${fighter(boss.kind).title || 'LE COMBAT COMMENCE'}`; }
  drawJualos(a, state) {
    const c = this.ctx, p = a.pattern, changing = p?.kind === 'jualosSuit', commercial = a.commercial && !(changing && !p.hit);
    const intro = state.bossCinema?.actor === a.id ? state.bossCinema.elapsed : null;
    let cell = Math.floor(state.time * 2) % 2;
    if (a.action === 'walk') cell = 2 + Math.floor(state.time * 7) % 2;
    if (commercial) {
      if (p?.kind === 'jualosCash') cell = p.hit ? 5 : 4;
      if (['jualosBagSwing', 'jualosCombo'].includes(p?.kind)) cell = p.hit ? 7 : 6;
      if (p?.kind === 'jualosBagSlam') cell = p.hit ? 9 : 8;
      if (a.laughTime > 0) cell = 10;
      if (a.hp <= 0) cell = 11;
    } else {
      if (p?.kind === 'jualosCombo') cell = p.hit ? 5 : 4;
      if (p?.kind === 'jualosRush') cell = p.hit ? 6 : 4;
      if (p?.kind === 'jualosBelly') cell = p.hit ? p.beat === 3 ? 11 : 9 + Math.floor(state.time * 9) % 2 : 8;
      if (changing) cell = 12;
      if (a.recovering > 0 && !p) cell = 13;
      if (a.stun > 0 && !p) cell = 14;
      if (intro !== null) cell = intro < .8 ? 2 : intro < 1.4 ? 8 : intro < 2.8 ? 9 + Math.floor(state.time * 9) % 2 : 11;
      if (a.hp <= 0) cell = 15;
    }
    c.save();
    if (intro !== null) { c.fillStyle = '#ffd99616'; c.beginPath(); c.moveTo(a.x - 40, 50); c.lineTo(a.x + 40, 50); c.lineTo(a.x + 180, a.y); c.lineTo(a.x - 180, a.y); c.closePath(); c.fill(); }
    if (changing) {
      c.strokeStyle = '#d6c4ff'; c.lineWidth = 3; c.beginPath(); c.ellipse(a.x, a.y - 105, 120, 126, 0, 0, TAU); c.stroke();
      c.fillStyle = '#e9ddff'; c.font = 'italic bold 22px Impact, sans-serif'; c.textAlign = 'center'; c.fillText('LE COMMERCIAL', a.x, a.y - 240);
    }
    if (a.flash > 0) c.filter = 'brightness(1.8)';
    if (a.hp <= 0) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    this.arcadeSprite(commercial ? 'bossJualosSuit' : 'bossJualos', a.x, a.y - a.z, cell, 222, a.facing);
    c.filter = 'none';
    if (p?.kind === 'jualosBelly' && !p.hit) { c.strokeStyle = '#ffca91'; c.lineWidth = 2; c.setLineDash([10, 9]); c.beginPath(); c.ellipse(a.x, a.y, 255, 255 / 1.45, 0, 0, TAU); c.stroke(); }
    if (p?.kind === 'jualosBagSlam' && !p.hit) { c.strokeStyle = '#ceefa0'; c.lineWidth = 2; c.beginPath(); c.ellipse(a.x + a.facing * 110, a.y, 150, 150 / 1.45, 0, 0, TAU); c.stroke(); }
    if (a.laughTime > 0 && a.hp > 0) { c.fillStyle = '#ffe6a6'; c.font = 'italic bold 24px Impact, sans-serif'; c.textAlign = 'center'; c.fillText('HAHAHA !', a.x, a.y - 255); }
    c.restore();
  }
  drawJualosSlip(a) {
    const c = this.ctx, frame = this.assets.frame(a.kind, a.jualosSlip.elapsed < .2 ? 'hurt' : 'dead', .9), base = this.assets.frame(a.kind, 'idle', 0);
    if (!frame) return;
    const [sx, sy, sw, sh] = frame.rect, scale = 144 / (frame.referenceHeight || base?.rect[3] || sh);
    c.save(); c.translate(a.x, a.y); c.scale(a.facing, 1); c.imageSmoothingEnabled = false;
    c.drawImage(frame.image, sx, sy, sw, sh, -sw * scale / 2, -sh * scale, sw * scale, sh * scale); c.restore();
    c.fillStyle = '#ffe698'; c.textAlign = 'center'; c.font = 'bold 13px monospace'; c.fillText('GLISSADE !', a.x, a.y - 115);
  }
  drawJoTraffic(state) {
    const boss = state.enemies.find(e => e.boss && e.kind === 'jo' && e.hp > 0 && e.pattern?.kind === 'joChannel');
    if (!boss) return;
    const c = this.ctx, safe = JO_PALLET_LANES[boss.pattern.safeLane];
    c.save(); c.fillStyle = '#80e8c522'; c.fillRect(FLOOR.left, safe - 24, FLOOR.right - FLOOR.left, 48);
    c.fillStyle = '#b7ffe4'; c.font = 'bold 12px monospace'; c.textAlign = 'left'; c.fillText('PASSAGE LIBRE', FLOOR.left + 14, safe + 4);
    const shown = new Set();
    for (const a of state.enemies) if (a.joPallet && a.owner === boss.id && a.hp > 0 && a.delay > 0 && !shown.has(a.lane)) {
      shown.add(a.lane); c.fillStyle = '#ffd24920'; c.fillRect(FLOOR.left, a.y - 23, FLOOR.right - FLOOR.left, 46);
      c.strokeStyle = '#ffce62'; c.lineWidth = 2; c.setLineDash([12, 12]); c.beginPath(); c.moveTo(FLOOR.left, a.y); c.lineTo(FLOOR.right, a.y); c.stroke();
      c.fillStyle = '#ffe898'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText(a.facing > 0 ? '>>' : '<<', a.facing > 0 ? 80 : 1200, a.y - 8);
    }
    c.restore();
  }
  drawJoPallet(a, state) {
    const c = this.ctx; c.save();
    if (a.hp <= 0) c.globalAlpha = clamp((1.2 - a.deadTime) / .5, 0, 1);
    if (a.delay > 0) c.globalAlpha = .45;
    if (a.flash > 0) c.filter = 'brightness(1.9)';
    this.ellipse(a.x, a.y + 3, 65, 10, '#05080a88');
    this.arcadeSprite('bossJoProps', a.x, a.y, a.hp <= 0 ? 2 : Math.floor(state.time * 12) % 2, 92, a.facing);
    if (a.hp > 0 && a.hp < a.maxHp) { c.fillStyle = '#181c22'; c.fillRect(a.x - 25, a.y - 103, 50, 4); c.fillStyle = '#ffd249'; c.fillRect(a.x - 25, a.y - 103, 50 * a.hp / a.maxHp, 4); }
    c.restore();
  }
  drawJo(a, state) {
    const c = this.ctx, p = a.pattern, channel = p?.kind === 'joChannel', intro = state.bossCinema?.actor === a.id ? state.bossCinema.elapsed : null;
    c.save(); let cell = Math.floor(state.time * 4) % 2;
    if (a.action === 'walk') cell = 2 + Math.floor(state.time * 13) % 2;
    if (p?.kind === 'joMMA') cell = p.hit ? [5, 6, 7][Math.min(2, Math.max(0, (p.beat || 1) - 1))] : 4;
    if (p?.kind === 'joRush') cell = p.hit ? 6 : 2;
    if (p?.kind === 'joStretch') cell = p.hit ? 9 : a.enraged ? 10 : 8;
    if (channel) {
      cell = p.hit ? 12 : 11;
      this.classicFX('bossJoProps', 5, a.x, a.y - 110, 270);
      c.strokeStyle = a.shieldFlash > 0 ? '#fffce1' : '#ffe15e'; c.lineWidth = 3; c.beginPath(); c.ellipse(a.x, a.y - 110, 100, 128, 0, 0, TAU); c.stroke();
      c.fillStyle = '#ffe79a'; c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillText(`INVINCIBLE · ${Math.max(0, Math.ceil(p.windup + p.active - p.elapsed))}s`, a.x, a.y - 242);
    }
    if (a.recovering > 1.3 && !p) cell = 13;
    if (intro !== null) {
      cell = intro < 1 ? 2 + Math.floor(state.time * 12) % 2 : intro < 1.7 ? 6 : intro < 2.3 ? 10 : 0;
      const x = a.x + 350 - intro * 430;
      if (intro < 2.4) this.arcadeSprite('bossJoProps', x, a.y + 20, Math.floor(state.time * 12) % 2, 92, -1);
    }
    if (a.stun > 0 && !p) cell = 14;
    if (a.hp <= 0) cell = 15;
    if (a.flash > 0) c.filter = 'brightness(1.8)';
    if (a.hp <= 0) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    this.arcadeSprite('bossJo', a.x, a.y - a.z, cell, 222, a.facing); c.filter = 'none';
    if (p?.kind === 'joStretch') {
      const t = p.elapsed - p.windup;
      if (!p.hit) {
        c.fillStyle = '#ffb26620'; c.fillRect(a.facing > 0 ? a.x : a.x - 930, a.y - 30, 930, 60);
        c.strokeStyle = '#ffce91'; c.lineWidth = 2; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + a.facing * 930, a.y); c.stroke();
      }
      const beatTime = a.enraged && t >= .4 ? t - .55 : t;
      const extension = beatTime < 0 ? clamp(1 + beatTime / .12, 0, 1) : clamp(1 - Math.max(0, beatTime - .13) / .2, 0, 1);
      if (extension > 0) {
        const sleeve = this.assets.arcadeFrame('bossJoProps', 3), fist = this.assets.arcadeFrame('bossJoProps', 4), length = 70 + 820 * extension;
        c.save(); c.translate(a.x + a.facing * 40, a.y - 137); c.scale(a.facing, 1); c.imageSmoothingEnabled = false;
        if (sleeve) c.drawImage(sleeve.image, ...sleeve.rect, 0, -14, length - 36, 28);
        if (fist) c.drawImage(fist.image, ...fist.rect, length - 45, -26, 60, 52);
        c.restore();
      }
    }
    c.restore();
  }
  drawLorenzo(a, state) {
    const c = this.ctx, p = a.pattern, sofa = a.sofa, seated = sofa && !a.sofaBroken;
    const intro = state.bossCinema?.actor === a.id ? state.bossCinema.elapsed : null;
    c.save();
    if (sofa) {
      const drop = p?.kind === 'lorenzoSofa' ? (1 - clamp(p.elapsed / p.windup, 0, 1)) ** 2 * 600 : 0;
      const shake = this.reducedMotion ? 0 : Math.sin(state.time * 95) * (sofa.shake || 0) * 24;
      this.arcadeSprite('bossLorenzoProps', sofa.x + shake, sofa.y + 5 - drop, a.sofaBroken ? 2 : sofa.hp < sofa.maxHp * .5 ? 1 : 0, 150, a.facing);
      if (seated) {
        c.fillStyle = '#20121b'; c.fillRect(a.x - 85, a.y + 25, 170, 8);
        c.fillStyle = '#ffd286'; c.fillRect(a.x - 85, a.y + 25, 170 * sofa.hp / sofa.maxHp, 8);
        c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('CANAPÉ · COUPS LOURDS !', a.x, a.y + 49);
      }
    }
    if (intro !== null) {
      for (let i = 0; i < 5; i++) this.ellipse(a.x + Math.sin(i * 2 + intro) * 60, a.y - 90 - i * 22, 32 + i * 6, 15, '#b4bfd522');
      if (intro > 1.65) {
        c.strokeStyle = '#ffb26a'; c.lineWidth = 3; c.beginPath(); c.ellipse(a.x, a.y, (intro - 1.65) * 150, (intro - 1.65) * 55, 0, 0, TAU); c.stroke();
      }
    }
    let cell = Math.floor(state.time * 3) % 2;
    if (a.action === 'walk') cell = 2 + Math.floor(state.time * (a.enraged ? 13 : 9)) % 2;
    if (p?.kind === 'lorenzoCombo') cell = p.hit ? [5, 5, 7][Math.min(2, p.beat - 1 || 0)] : 4;
    if (p?.kind === 'lorenzoKick') cell = p.hit ? 7 : 6;
    if (p?.kind === 'lorenzoCigarette') cell = p.hit ? 9 : 8;
    if (p?.kind === 'lorenzoSofa') cell = p.hit ? 12 : 10;
    if (seated && sofa.landed) cell = 12;
    if (p?.kind === 'lorenzoRage') cell = p.elapsed < .55 ? 13 : 11;
    if (intro !== null) cell = intro < .75 ? 2 + Math.floor(state.time * 10) % 2 : intro < 1.65 ? 8 : intro < 2.15 ? 9 : 0;
    if (a.stun > 0 && !p && !seated) cell = 14;
    if (a.hp <= 0) cell = 15;
    if (a.enraged && a.hp > 0) { c.strokeStyle = '#ff7b54'; c.lineWidth = 2; c.beginPath(); c.ellipse(a.x, a.y + 2, 46, 12, 0, 0, TAU); c.stroke(); }
    if (a.flash > 0) c.filter = 'brightness(1.8)';
    if (a.hp <= 0) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    this.arcadeSprite('bossLorenzo', a.x, a.y - a.z - (seated && sofa.landed ? 30 : 0), cell, 222, a.facing);
    c.restore();
  }
  drawYanu(a, state) {
    const c = this.ctx, p = a.pattern, intro = state.bossCinema?.actor === a.id && state.bossCinema.elapsed < 1.9;
    const wave = p?.kind === 'yanuTsunami', howl = p?.kind === 'yanuHowl', t = p ? p.elapsed - p.windup : 0;
    c.save();
    if (a.flash > 0) c.filter = 'brightness(1.8)';
    if (a.hp <= 0) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    if (a.hp > 0 && (intro || wave && p.hit)) {
      const frame = Math.floor(state.time * 8) % 3;
      this.arcadeSprite('bossYanuWater', a.x - a.facing * 30, a.y + 18, 3 + frame, 240, a.facing);
      this.arcadeSprite('bossYanuWater', a.x + a.facing * 12, a.y - 105, frame, 195, a.facing);
    } else {
      let cell = Math.floor(state.time * 3) % 2;
      if (a.action === 'walk') cell = 2 + Math.floor(state.time * 9) % 2;
      if (p?.kind === 'yanuCombo') cell = p.hit ? [5, 5, 7][Math.min(2, Math.floor(t / .3))] : 4;
      if (p?.kind === 'yanuKick') cell = p.hit ? 7 : 6;
      if (wave) cell = 8;
      if (howl) cell = !p.hit ? 8 : t < .25 ? 9 : t < .55 ? 10 : t < .8 ? 11 : t < 1.05 ? 12 : p.lunging ? 13 : 11;
      if (a.stun > 0 && !p) cell = 14;
      if (a.hp <= 0) cell = 15;
      this.arcadeSprite('bossYanu', a.x, a.y - a.z, cell, 222, a.facing);
    }
    c.filter = 'none';
    if (wave && !p.hit) {
      c.fillStyle = '#43c9ee25'; c.fillRect(FLOOR.left, a.y - 55, FLOOR.right - FLOOR.left, 110);
      c.strokeStyle = '#8ceeff'; c.lineWidth = 2; c.setLineDash([12, 10]);
      for (const y of [a.y - 55, a.y + 55]) { c.beginPath(); c.moveTo(FLOOR.left, y); c.lineTo(FLOOR.right, y); c.stroke(); }
      this.arcadeSprite('bossYanuWater', a.x - a.facing * 60, a.y + 8, 3 + Math.floor(state.time * 6) % 3, 65 + 75 * p.elapsed / p.windup, a.facing);
    }
    if (howl) {
      if (!p.hit) { c.strokeStyle = '#d6baff'; c.lineWidth = 2; c.setLineDash([8, 8]); c.beginPath(); c.ellipse(a.x, a.y, 360, 240, 0, 0, TAU); c.stroke(); }
      else if (t < .65) {
        c.strokeStyle = `rgba(185,225,255,${1 - t / .65})`; c.lineWidth = 4;
        c.beginPath(); c.ellipse(a.x, a.y - 115, 40 + t * 480, 25 + t * 180, 0, 0, TAU); c.stroke();
        c.font = 'italic bold 34px Impact, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#eefaff'; c.fillText('BUUUUUUUUU', clamp(a.x, 190, 1090), a.y - 242);
      }
      if (p.hit && t < 1.05) { c.strokeStyle = '#f3b9ff'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(p.targetX, p.targetY); c.stroke(); }
    }
    c.restore();
  }
  drawKikor(a, state) {
    const c = this.ctx, p = a.pattern, guard = state.enemies.find(e => e.kikorCreation && e.owner === a.id && e.hp > 0);
    let cell = Math.floor(state.time * 2) % 2;
    if (a.action === 'walk') cell = 2 + Math.floor(state.time * 7) % 2;
    if (p?.kind === 'kikorPaint') cell = p.hit ? 7 : 6;
    if (p?.kind === 'kikorBrush') cell = p.hit ? 5 : 4;
    if (p?.kind === 'kikorHunt') cell = !p.hit ? p.elapsed < p.windup * .5 ? 8 : 9 : p.lunging ? 12 : 10 + Math.floor(state.time * 8) % 2;
    if (a.kikorGrip) cell = 13;
    if (a.stun > 0 && !p && !a.kikorGrip) cell = 14;
    if (a.hp <= 0) cell = 15;
    c.save();
    if (guard && a.hp > 0) {
      c.strokeStyle = a.shieldFlash > 0 ? '#e7ffbd' : '#91ff8d'; c.lineWidth = a.shieldFlash > 0 ? 5 : 2;
      c.globalAlpha = .6; c.beginPath(); c.moveTo(a.x, a.y - 115); c.quadraticCurveTo((a.x + guard.x) / 2, Math.min(a.y, guard.y) - 180, guard.x, guard.y - 65); c.stroke();
      c.beginPath(); c.ellipse(a.x, a.y - 105, 80, 116, 0, 0, TAU); c.stroke();
      c.globalAlpha = 1; c.fillStyle = '#b3ff9c'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('PROTÉGÉ PAR LE BONHOMME VERT', clamp(a.x, 190, 1090), a.y - 242);
    }
    if (a.flash > 0) c.filter = 'brightness(1.8)';
    if (a.hp <= 0) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    this.arcadeSprite('bossKikor', a.x, a.y - a.z, cell, 222, a.facing);
    c.restore();
    if (a.kikorGrip) {
      const victim = state.players.find(p => p.id === a.kikorGrip.victim);
      c.fillStyle = '#ff9f92'; c.font = 'bold 14px monospace'; c.textAlign = 'center';
      c.fillText('TAPOTE J / K / MAJ POUR TE LIBÉRER', clamp(a.x, 220, 1060), a.y - 190);
      c.fillStyle = '#26131e'; c.fillRect(a.x - 40, a.y - 174, 80, 5); c.fillStyle = '#ffd99c'; c.fillRect(a.x - 40, a.y - 174, 80 * Math.min(1, (victim?.escapePresses || 0) / 6), 5);
    }
  }
  drawKaronux(a, state) {
    const c = this.ctx, p = a.pattern, sleeping = p?.kind === 'sleep' && p.hit;
    c.save();
    if (a.flash > 0) c.filter = 'brightness(1.8)';
    if (a.hp <= 0) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    if (a.vehicle) {
      this.arcadeSprite('bossGolf', a.x, a.y, a.hp < a.maxHp * .4 ? 2 : p?.hit ? 1 : 0, 145, a.facing);
      if (p && !p.hit) {
        c.strokeStyle = '#ffd489'; c.lineWidth = 3; c.setLineDash([12, 12]); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(p.targetX, p.targetY); c.stroke();
      }
    } else {
      let cell = Math.floor(state.time * 3) % 2;
      if (a.action === 'walk') cell = 2 + Math.floor(state.time * 10) % 2;
      if (p?.charge) cell = p.hit ? 2 + Math.floor(state.time * 14) % 2 : 4;
      if (p?.kind === 'combo') cell = p.hit ? [5, 6, 7][Math.min(2, Math.floor((p.elapsed - p.windup) / .24))] : 4;
      if (p?.kind === 'sleep') cell = p.hit ? p.elapsed > p.windup + p.active - .4 ? 11 : 10 : p.elapsed > p.windup * .7 ? 9 : 8;
      if (p?.healing) cell = p.hit ? 13 : 12;
      if (a.stun > 0 && !p) cell = 14;
      if (a.hp <= 0) cell = 15;
      const exit = state.bossCinema?.kind === 'exit' && state.bossCinema.actor === a.id;
      if (exit) { c.globalAlpha = clamp(state.bossCinema.elapsed * 2 - .5, 0, 1); cell = state.bossCinema.elapsed < 1.1 ? 11 : 0; }
      this.arcadeSprite('bossKaronux', a.x, a.y - a.z, cell, 222, a.facing);
      if (sleeping) { c.fillStyle = '#b4dcff'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText('Z z z · ENCHAÎNE !', a.x, a.y - 92); }
      if (p?.kind === 'sleep' && !p.hit) {
        c.strokeStyle = '#ffb563'; c.lineWidth = 3; c.beginPath(); c.ellipse(a.x + a.facing * 65, a.y, 145, 145 / 1.45, 0, 0, TAU); c.stroke();
      }
      if (a.hp > 0 && !sleeping) {
        c.fillStyle = '#07111d'; c.fillRect(a.x - 34, a.y - 241, 68, 4);
        c.fillStyle = '#ffcc7b'; c.fillRect(a.x - 34, a.y - 241, 68 * Math.min(1, (a.guardHits || 0) / 5), 4);
      }
    }
    c.restore();
  }
  atmosphere(time) {
    if (this.reducedMotion) return;
    const c = this.ctx; c.save();
    for (let i = 0; i < 23; i++) {
      const x = (i * 137.31 + time * (3 + i % 4)) % W, y = 290 + ((i * 79.7 - time * 5) % 310 + 310) % 310;
      c.globalAlpha = .1 + Math.sin(time * 1.1 + i) * .07; c.fillStyle = '#ffcc87'; c.fillRect(x, y, i % 3 ? 1.4 : 2, 1.5);
    }
    c.restore();
  }
  drawRogueWorld(state) {
    const c = this.ctx;
    for(const e of state.enemies) {
      for(const p of state.players) {
        const stacks=e.roguePaint?.[p.id]?.stacks || 0;
        for(let i=0;i<3&&stacks;i++)this.ellipse(e.x-12+i*12,e.y-140-(p.id-1)*12,4,4,i<stacks?(p.id===1?'#83ffc4':'#e3a4ff'):'#535766');
        if(e.id===p.roguePrey||e.id===p.rogueTarget||e.id===p.rogueCochonnet){c.save();c.strokeStyle=p.id===1?'#83ffc4':'#e3a4ff';c.lineWidth=2;c.strokeRect(e.x-17,e.y-165,34,20);c.font='11px monospace';c.fillStyle=c.strokeStyle;c.fillText('J'+p.id,e.x-8,e.y-151);c.restore();}
        if(e.rogueCurses?.[p.id]>state.time){c.save();c.fillStyle='#c16fff';c.font='bold 22px monospace';c.fillText('×',e.x-7,e.y-128);c.restore();}
        if(e.rogueBurns?.[p.id])this.ellipse(e.x,e.y-65,8,12,e.rogueBurns[p.id].bleed?'#dc3458':e.rogueBurns[p.id].black?'#a747d9':'#ff9655');
      }
    }
    for(const p of state.players) {
      if(p.specialState?.convoi&&p.specialState.elapsed>=BALANCE.specials.karonux.golfAt&&p.specialState.elapsed<p.specialState.duration-BALANCE.specials.karonux.exitDuration)for(const body of golfBodies(p).filter(b=>b.lane))this.arcadeSprite('golf',body.x,body.y,Math.floor(state.time*8)%2,100,p.facing);
      if(['rogueEmpowered','rogueHeadReady','rogueCounter'].some(k=>p[k]>state.time)||p.rogueDouble){c.save();c.fillStyle='#ffe092';c.font='bold 14px monospace';c.fillText('◆',p.x-7,p.y-165);c.restore();}
    }
    for (const z of state.rogueZones || []) {
      c.save(); const dark = ['blackfire','hellgate','chains'].includes(z.kind);
      c.globalAlpha = Math.min(.7, z.ttl); if(z.owner===2)c.filter='hue-rotate(35deg)'; c.strokeStyle=dark?'#ce81ff':z.kind==='canvas'?'#7bf2d7':'#ffcd87';c.lineWidth=2;
      this.ellipse(z.x,z.y,z.radius,z.radius*.3,dark?'#591c6055':z.kind==='oil'?'#141a25aa':'#8869ad30');
      if (['fire','blackfire'].includes(z.kind)) { if(dark)c.filter='hue-rotate(225deg)';this.fireSprite(Math.floor(state.time*8)%4,z.x,z.y+15,z.radius); }
      else if (z.kind==='car') this.arcadeSprite('golf',z.x,z.y,Math.floor(state.time*8)%2,90);
      else if(z.kind==='decoy'){const p=state.players.find(p=>p.id===z.owner);if(p){c.globalAlpha*=.5;const f=this.assets.frame(p.kind,'idle',0);if(f){const [x,y,w,h]=f.rect;c.drawImage(f.image,x,y,w,h,z.x-w/h*70,z.y-140,w/h*140,140);}}}
      else { c.beginPath();c.ellipse(z.x,z.y,z.radius,z.radius*.3,0,0,TAU);c.stroke();for(let i=0;i<4;i++){const a=state.time*2+i*TAU/4;this.ellipse(z.x+Math.cos(a)*z.radius*.7,z.y+Math.sin(a)*z.radius*.2,5,3,c.strokeStyle);} }
      c.restore();
    }
    for(const b of state.rogueBalls||[]){this.ellipse(b.x,b.y,16,6,'#0007');this.ellipse(b.x,b.y-16,b.big?23:12,b.big?23:12,b.fire?'#ff9c56':'#dce4ef');}
    for(const p of state.players)if(p.roguePortalTime>0)for(const portal of p.roguePortals||[]){c.save();c.strokeStyle='#a98cff';c.lineWidth=5;c.beginPath();c.ellipse(portal.x,portal.y-65,40,70,0,0,TAU);c.stroke();c.font='12px monospace';c.textAlign='center';c.fillStyle='#d8c9ff';c.fillText('F · TRAVERSER',portal.x,portal.y+22);c.restore();}
  }
  ellipse(x, y, rx, ry, color) { const c = this.ctx; c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
  arcadeSprite(key, x, y, frame = 0, height, facing = 1) {
    const asset = this.assets.arcadeFrame(key, frame); if (!asset) return;
    const c = this.ctx, [sx, sy, sw, sh] = asset.rect, scale = (height || asset.height) / asset.base[3];
    c.save(); c.translate(x, y); c.scale(facing, 1); c.imageSmoothingEnabled = false;
    c.drawImage(asset.image, sx, sy, sw, sh, -sw * scale / 2, -sh * scale, sw * scale, sh * scale); c.restore();
  }
  classicFX(key, cell, x, y, width, facing = 1) {
    const asset = this.assets.arcadeFrame(key, cell); if (!asset) return;
    const [sx, sy, sw, sh] = asset.rect, c = this.ctx, scale = width / sw;
    c.save(); c.translate(x, y); c.scale(facing, 1); c.imageSmoothingEnabled = false;
    c.drawImage(asset.image, sx, sy, sw, sh, -width / 2, -sh * scale / 2, width, sh * scale); c.restore();
  }
  fireSprite(frame, x, y, width) {
    const asset = this.assets.arcadeFrame('fireFX', frame), base = this.assets.arcadeFrame('fireFX', Math.floor(frame / 4) * 4);
    if (!asset || !base) return;
    const [sx, sy, sw, sh] = asset.rect, scale = width / base.rect[2], c = this.ctx;
    c.imageSmoothingEnabled = false; c.drawImage(asset.image, sx, sy, sw, sh, x - sw * scale / 2, y - sh * scale, sw * scale, sh * scale);
  }
  surprisePanel(s) {
    const e = s.surprise, c = this.ctx;
    const left = e.kind === 'ambush' ? s.spawnQueue.length + s.enemies.filter(a => a.hp > 0).length : s.props.filter(p => e.targetIds.includes(p.id)).reduce((n, p) => n + (e.kind === 'car' ? p.hp : Number(p.hp > 0)), 0);
    const name = { car: 'LA CASSE DU SIÈCLE', delivery: 'LIVRAISON EXPRESS', ambush: 'EMBUSCADE' }[e.kind];
    const hint = { car: 'Détruis la voiture · Poings, pieds et spéciaux', delivery: `Brise les ${e.total} caisses cerclées de vert`, ambush: 'Élimine le gang avant son repli' }[e.kind];
    c.save(); c.translate(0, 28); c.fillStyle = '#081621ed'; c.fillRect(374, 89, 532, 91); c.fillStyle = '#91efcf'; c.fillRect(374, 89, 3, 91);
    c.textAlign = 'left'; c.font = '20px Impact, sans-serif'; c.fillText(name, 394, 116);
    c.font = '12px monospace'; c.fillStyle = '#d1dfdc'; c.fillText(hint, 394, 139);
    c.textAlign = 'right'; c.font = '26px Impact, sans-serif'; c.fillStyle = e.remaining < 6 ? '#ff9b82' : '#f5d894';
    c.fillText(e.warning > 0 ? 'PRÊTS ?' : `${Math.ceil(e.remaining)}s`, 889, 118);
    c.fillStyle = '#274039'; c.fillRect(394, 154, 492, 5); c.fillStyle = '#91efcf'; c.fillRect(394, 154, 492 * clamp(1 - left / e.total, 0, 1), 5); c.restore();
  }
  bitmap(key, x, y, height, time = 0, facing = 1, luminous = false) {
    const list = VISUALS[key], image = list && this.assets.get(list[Math.floor(time * 8) % list.length]);
    if (!image) return;
    const c = this.ctx, row = TRANSFORM_ROWS[key], ratio = image.width / 1254;
    const rect = row ? [Math.floor(time * 9) % 3 * 418 * ratio, row[0] * ratio, 418 * ratio, row[1] * ratio] : [0, 0, image.width, image.height];
    const width = height * rect[2] / rect[3];
    c.save(); c.translate(x, y); c.scale(facing, 1); c.imageSmoothingEnabled = false;
    if (luminous && !row) c.globalCompositeOperation = 'screen';
    c.drawImage(image, ...rect, -width / 2, -height, width, height); c.restore();
  }
  livingScenery(s) {
    const c = this.ctx, t = this.reducedMotion ? 0 : s.time;
    c.save();
    if ([0, 3, 4, 5].includes(s.chapter)) {
      for (let i = 0; i < 2; i++) {
        const x = 220 + i * 820 + s.stage * 12, g = c.createRadialGradient(x, 370, 5, x, 370, 220);
        g.addColorStop(0, s.chapter === 4 ? '#b198ff16' : '#ffd59b16'); g.addColorStop(1, '#ffcf8000');
        c.fillStyle = g; c.globalAlpha = .8 + Math.sin(t * 1.7 + i) * .13; c.fillRect(x - 230, 140, 460, 460);
      }
    }
    c.globalAlpha = .28; c.strokeStyle = s.chapter === 4 ? '#bda4ec' : '#9dc7d4'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x = (s.stage * 219 + i * 317) % W, y = 666 + i % 2 * 13;
      c.beginPath(); c.ellipse(x, y, 25 + i * 6 + Math.sin(t + i) * 3, 2, 0, 0, TAU); c.stroke();
    }
    if ([1, 2].includes(s.chapter)) {
      c.fillStyle = '#b6c99c'; c.globalAlpha = .4;
      for (let i = 0; i < 7; i++) { const x = (i * 193 + t * 25) % W, y = 380 + (i * 31 + t * 13) % 70; c.save(); c.translate(x, y); c.rotate(Math.sin(t + i)); c.fillRect(-3, -1, 7, 2); c.restore(); }
    }
    c.restore();
  }
  drawHazard(h, time) {
    if (h.costumeFX) return drawCostumeHazard.call(this, h, time);
    if (h.kind === 'joArm') return; // The matching arm is rendered from the boss's attack clock.
    const c = this.ctx, warning = h.delay > 0, color = h.enemy || h.both ? '#ff696b' : '#83e6ca';
    c.save();
    if (h.kind === 'jualosCash') {
      if (warning) {
        const t = clamp(1 - h.delay / h.flight, 0, 1);
        this.classicFX('bossJualosProps', 0, h.fromX + (h.x - h.fromX) * t, h.fromY + (h.y - h.fromY) * t - Math.sin(t * Math.PI) * 100, 40);
        c.strokeStyle = '#e8e8a87a'; c.lineWidth = 1; c.beginPath(); c.ellipse(h.x, h.y, h.radius, h.radius / 1.45, 0, 0, TAU); c.stroke();
      } else {
        c.globalAlpha = clamp(h.ttl / .6, 0, 1); this.classicFX('bossJualosProps', 1, h.x, h.y, 68);
        c.strokeStyle = '#ddeb8c'; c.lineWidth = 1; c.beginPath(); c.ellipse(h.x, h.y, h.radius, h.radius / 1.45, 0, 0, TAU); c.stroke();
      }
      c.restore(); return;
    }
    if (['jualosBellyWave', 'jualosBag', 'jualosBagSlam'].includes(h.kind)) {
      if (h.kind !== 'jualosBag') {
        c.globalAlpha = warning ? .25 : clamp(h.ttl / .14, 0, 1); c.strokeStyle = h.kind === 'jualosBellyWave' ? '#ffd396' : '#c7eca2'; c.lineWidth = 7;
        c.beginPath(); c.ellipse(h.x, h.y, h.radius, h.radius / 1.45, 0, 0, TAU); c.stroke();
        if (h.kind === 'jualosBagSlam' && !warning) this.classicFX('bossJualosProps', 3, h.x, h.y - 30, 210);
      }
      c.restore(); return;
    }
    if (h.kind === 'lorenzoRing') {
      if (warning) {
        const t = clamp(1 - h.delay / h.flight, 0, 1);
        this.classicFX('bossLorenzoProps', 3, h.fromX + (h.x - h.fromX) * t, h.fromY + (h.y - h.fromY) * t - Math.sin(t * Math.PI) * 85, 36, h.facing);
        c.strokeStyle = '#ffce84'; c.lineWidth = 2; c.beginPath(); c.ellipse(h.x, h.y, 20, 14, 0, 0, TAU); c.stroke();
      } else {
        const r = h.radius, count = Math.max(12, Math.min(150, Math.ceil(TAU * r / 28)));
        c.globalAlpha = clamp(h.ttl / .25, 0, 1);
        c.strokeStyle = '#ff793ea8'; c.lineWidth = h.thickness * 2; c.beginPath(); c.ellipse(h.x, h.y, r, r / 1.45, 0, 0, TAU); c.stroke();
        c.strokeStyle = '#ffe6a4'; c.lineWidth = 3; c.stroke();
        for (let i = 0; i < count; i++) {
          const angle = i / count * TAU, x = h.x + Math.cos(angle) * r, y = h.y + Math.sin(angle) * r / 1.45;
          this.classicFX('bossLorenzoProps', 4 + (Math.floor(time * 9) + i) % 2, x, y - 13, 26);
        }
      }
      c.restore(); return;
    }
    // Ground warnings are reserved exclusively for explosive barrels.
    if (h.kind === 'barrelBlast') {
      c.strokeStyle = color; c.lineWidth = 2; c.globalAlpha = warning ? .22 : .28;
      this.ellipse(h.x, h.y, h.radius, h.radius / 1.45, color);
      c.globalAlpha = .7; c.beginPath(); c.ellipse(h.x, h.y, h.radius, h.radius / 1.45, 0, 0, TAU); c.stroke();
      c.globalAlpha = 1; c.font = 'bold 15px monospace'; c.textAlign = 'center'; c.fillStyle = color;
      if (warning) c.fillText('!', h.x, h.y - 8);
    }
    if (warning) {
      if (h.kind === 'plant') {
        this.arcadeSprite(h.atlas, h.x, h.y, 10, 35 + 65 * clamp(1 - h.delay / ENCORE_RULES.plantDelay, 0, 1));
      } else if (h.kind === 'shotPut') {
        const t = clamp(1 - h.delay / h.flight, 0, 1);
        this.arcadeSprite(h.atlas, h.fromX + (h.x - h.fromX) * t, h.fromY + (h.y - h.fromY) * t - Math.sin(t * Math.PI) * 145, 9, 40);
      } else if (h.kind === 'fire' || h.kind === 'slime') {
        const progress = clamp(1 - h.delay / (h.flight || .85), 0, 1);
        const x = (h.fromX ?? h.x) + (h.x - (h.fromX ?? h.x)) * progress;
        const y = (h.fromY ?? h.y - 80) + (h.y - (h.fromY ?? h.y - 80)) * progress - Math.sin(progress * Math.PI) * 85;
        if (h.kind === 'fire') { c.save(); c.translate(x, y); c.rotate(progress * 5 * h.facing); if (h.atlas) this.arcadeSprite(h.atlas, 0, 8, h.cell, 40); else this.fireSprite(Math.floor(time * 12) % 4, 0, 8, 40); c.restore(); }
        else { const image = this.assets.get(VISUALS.spit[2]); if (image) c.drawImage(image, 511, 17, 105, 110, x - 18, y - 22, 36, 38); }
      }
    } else if (h.kind === 'streetProjectile') {
      this.classicFX(`street_${h.atlas}`, h.cell ?? 9, h.x, h.y - 18, 54, h.vx < 0 ? -1 : 1);
    } else if (h.kind === 'huntingDog') {
      this.classicFX('street_titou', Math.floor((h.activeAge || 0) * 7) % 2 ? 10 : 9, h.x, h.y - 24, 112, h.vx < 0 ? -1 : 1);
    } else if (h.kind === 'streetPuddle') {
      c.globalAlpha = clamp(h.ttl / .7, 0, .85);
      this.classicFX('street_cedric', 10, h.x, h.y, h.radius * 2);
    } else if (h.kind === 'streetFX') {
      c.globalAlpha = clamp(h.ttl / .18, 0, 1); this.classicFX(`street_${h.atlas}`, h.cell ?? 9, h.x + h.facing * h.width / 2, h.y - 45, h.width, h.facing);
    } else if (h.kind === 'plant') {
      c.globalAlpha = clamp(h.ttl / .35, 0, 1);
      this.arcadeSprite(h.atlas, h.x, h.y, (h.activeAge || 0) % ENCORE_RULES.plantCycle < ENCORE_RULES.plantBite ? 11 : 10, 100);
    } else if (h.kind === 'encoreProjectile') {
      this.arcadeSprite(h.atlas, h.x, h.y - 20, 9, 48, h.vx < 0 ? -1 : 1);
    } else if (h.kind === 'encoreFX' || h.kind === 'shotPut') {
      c.globalAlpha = clamp(h.ttl / .1, 0, 1);
      this.arcadeSprite(h.atlas, h.x + (h.shape === 'line' ? h.facing * h.width / 2 : 0), h.y, h.kind === 'shotPut' ? 10 : h.cell, 85, h.facing);
    } else if (h.kind === 'barrelBlast') {
      this.ellipse(h.x, h.y - 20, h.radius, 60, '#ffaf4980');
      this.arcadeSprite('dash', h.x, h.y, 1, 95);
    } else if (h.kind === 'fire') {
      c.globalAlpha = clamp(h.ttl / .6, 0, 1);
      this.fireSprite(4 + Math.floor((h.activeAge || 0) * 9 + h.id) % 4, h.x, h.y + h.radius * .3, h.radius * 2);
    } else if (h.kind === 'slime') {
      const image = this.assets.get(VISUALS.spit[2]);
      c.globalAlpha = clamp(h.ttl / .8, 0, 1); c.imageSmoothingEnabled = false;
      if (image) c.drawImage(image, 345, 265, 394, 74, h.x - h.radius, h.y - h.radius * .32, h.radius * 2, h.radius * .64);
    } else if (h.kind === 'golfImpact') {
      c.globalAlpha = clamp(h.ttl / .18, 0, 1); this.arcadeSprite('dash', h.x, h.y, 2, 72, h.facing);
    } else if (h.kind === 'thunder') {
      c.globalAlpha = clamp(h.ttl / .14, 0, 1); c.lineJoin = 'bevel';
      for (const offset of [-.7, 0, .7]) {
        const x = clamp(h.x + offset * h.radius, FLOOR.left, FLOOR.right), y = h.y + (offset ? 8 : -10);
        c.beginPath(); c.moveTo(x - 25, y - 410);
        for (let j = 1; j < 8; j++) c.lineTo(x + Math.sin(j * 2.7 + h.id + offset) * (j === 7 ? 0 : 24), y - 410 + j * 410 / 7);
        c.strokeStyle = '#519dff'; c.lineWidth = 11; c.stroke(); c.strokeStyle = '#e3faff'; c.lineWidth = 3; c.stroke();
      }
    } else if (h.kind === 'magic' || h.kind === 'cigar') {
      this.arcadeSprite(h.atlas, h.x, h.y - 25, h.cell, h.kind === 'cigar' ? 85 : 60, h.vx < 0 ? -1 : 1);
    } else if (['tennis', 'magicCard', 'pencil'].includes(h.kind)) {
      const key = { tennis: 'orelsan', magicCard: 'guylux', pencil: 'kikor_e' }[h.kind];
      c.save(); c.translate(h.x, h.y - 26); c.rotate(Math.atan2(h.vy, h.vx));
      this.classicFX(key, 9, 0, 0, h.kind === 'tennis' ? 72 : 54); c.restore();
    } else if (h.kind === 'pepper') {
      c.globalAlpha = clamp(h.ttl / .15, 0, .9);
      this.classicFX('papy_jala', 9, h.x + h.facing * h.width / 2, h.y - 28, h.width, h.facing);
    } else if (h.kind === 'bills') {
      c.globalAlpha = clamp(h.ttl / .2, 0, 1);
      this.classicFX('charlingals', 10, h.x, h.y - 25, h.radius * 2, h.facing);
    } else if (h.kind === 'knife') {
      // The knife is part of the attack pose, avoiding a second floating weapon.
    } else if (h.kind === 'eliteSwipe') {
      if (h.atlas !== 'fouine') this.arcadeSprite(h.atlas, h.x, h.y - 12, h.cell, 72, h.facing);
    } else if (h.kind === 'shock' || h.kind === 'impact') {
      // Dust at the actual impact, never a pre-hit area overlay.
      c.strokeStyle = '#e8d5ad'; c.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * 12; c.beginPath(); c.moveTo(h.x + dx, h.y - 3); c.lineTo(h.x + dx * 1.4, h.y - 15 - (i % 3) * 8); c.stroke(); }
    } else if (h.kind === 'ball') { const g = c.createRadialGradient(h.x - 5, h.y - 16, 2, h.x, h.y - 10, 15); g.addColorStop(0, '#e9edf3'); g.addColorStop(1, '#505e75'); this.ellipse(h.x, h.y - 10, 15, 15, g); }
    else if (['card', 'paint'].includes(h.kind)) this.bitmap(h.kind, h.x, h.y - 10, 35, time, h.facing);
    else if (h.kind === 'fist') {
      c.fillStyle = '#d99979'; c.fillRect(h.facing > 0 ? h.x : h.x - h.width, h.y - 69, h.width, 15); this.ellipse(h.x + h.facing * h.width, h.y - 62, 23, 18, '#e6b18b');
    } else if (h.kind === 'smoke') for (let i = 0; i < 6; i++) this.ellipse(h.x + Math.sin(i * 3 + time) * 48, h.y - 15 - (time * 25 + i * 18) % 80, 28, 20, '#b7cea247');
    else if (h.kind === 'wreck') this.bitmap('wreck', h.x, h.y, 175, h.age);
    else if (h.kind === 'bullet') { c.strokeStyle = h.enemy ? '#ffb277' : '#fff0a3'; c.lineWidth = 5; c.beginPath(); c.moveTo(h.x, h.y - 47); c.lineTo(h.x - (h.vx ? Math.sign(h.vx) * 28 : -h.facing * h.width), h.y - 47); c.stroke(); }
    c.restore();
  }
  actor(a, state, slot, age) {
    if (a.joPallet) { this.drawJoPallet(a, state); return; }
    const c = this.ctx, dead = a.hp <= 0, t = a.actionTime + (state.paused ? 0 : age);
    const color = a.enemy ? '#ec6569' : a.id === 1 ? '#ffbf66' : '#91c6ff';
    if (a.boss && a.pattern && !(a.pattern.kind === 'yanuHowl' && a.pattern.hit)) {
      const p = a.pattern;
      c.fillStyle = p.healing ? '#a3ecc6' : '#ffab95'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText((p.kind === 'sleep' && p.hit ? 'IL DORT · +25 % DE DÉGÂTS' : PATTERN_LABELS[p.kind] || '').toUpperCase(), clamp(a.x, 180, 1100), a.y - 264 - (a.z || 0));
    }
    if (a.recovering > 0 && !dead && !a.shielded && !(a.sofa && !a.sofaBroken)) { c.fillStyle = '#b9f2ce'; c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillText('VULNÉRABLE', a.x, a.y - (ELITES[a.kind]?.height || 176) - 52 - (a.z || 0)); }
    this.ellipse(a.x + 5, a.y + 3, dead ? 49 : a.boss ? 39 : 28, dead ? 11 : 9, '#02060aa6');
    if (!a.enemy && !dead) {
      c.strokeStyle = color; c.globalAlpha = .65; c.lineWidth = 1.6; c.beginPath(); c.ellipse(a.x, a.y + 2, 29, 9, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
    }
    if (a.enemy && !dead && !a.boss) this.enemyBar(a);
    if(a.boss&&a.kind==='gustavax'){drawGustavax(this,a,state);return;}
    if (a.boss && a.kind === 'karonux') { this.drawKaronux(a, state); return; }
    if (a.boss && a.kind === 'kikor') { this.drawKikor(a, state); return; }
    if (a.boss && a.kind === 'yanu') { this.drawYanu(a, state); return; }
    if (a.boss && a.kind === 'lorenzo') { this.drawLorenzo(a, state); return; }
    if (a.boss && a.kind === 'jo') { this.drawJo(a, state); return; }
    if (a.boss && a.kind === 'jualos') { this.drawJualos(a, state); return; }
    if (a.jualosSlip && !dead) { this.drawJualosSlip(a); return; }
    if (a.yanuFrozen && !dead) {
      c.strokeStyle = '#b9e9ff'; c.lineWidth = 3; c.beginPath(); c.ellipse(a.x, a.y - 72, 44, 84, 0, 0, TAU); c.stroke();
      c.fillStyle = '#dff4ff'; c.font = 'bold 14px monospace'; c.textAlign = 'center'; c.fillText('FIGÉ !', a.x, a.y - 167);
    }
    let action = a.action;
    if (a.elite) { this.drawElite(a, state); return; }
    if (a.enemy && STREET_ENEMIES[a.kind]) { this.drawStreetEnemy(a, state); return; }
    if (!a.enemy && !dead && !a.specialState && this.drawInteraction(a, state)) return;
    if (a.enemy && !a.boss && CLASSIC_SPRITES[a.kind]) { this.drawClassic(a, state); return; }
    if (!dead && a.specialState?.kind === 'karonux') {
      const b = BALANCE.specials.karonux;
      if (a.specialState.elapsed >= b.golfAt && a.specialState.elapsed < a.specialState.duration - b.exitDuration) {
        const braking = !a.specialState.moving || a.specialState.elapsed < (a.specialState.boostUntil || 0);
        this.arcadeSprite('golf', a.x, a.y, braking ? 2 : Math.floor(state.time * 9) % 2, 115, a.facing);
        this.arcadeSprite('dash', a.x - a.facing * 95, a.y, Math.floor(state.time * 10) % 3, 35, a.facing);
        c.fillStyle = '#ffdb91'; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillText('GOLF · DIRECTIONS POUR CONDUIRE', a.x, a.y - 190);
        return;
      }
    }
    if (!dead && a.pattern?.signature) {
      const p = a.pattern, windup = !p.hit;
      const key = { rainbowStorm: 'princesse', preciousHunt: 'precieux', kayakRush: 'kayak', sofaDrop: 'canape', ferretHunt: 'fouine', finalRing: 'wrestler' }[p.kind];
      const cell = { rainbowStorm: windup ? 3 : 8, preciousHunt: windup ? 7 : 8, kayakRush: windup ? 3 : 8, sofaDrop: windup ? 2 : 3, ferretHunt: windup ? 3 : 8 + Math.floor(state.time * 10) % 2, finalRing: windup ? 11 : 6 }[p.kind];
      this.arcadeSprite(key, p.kind === 'sofaDrop' ? p.targetX : a.x, (p.kind === 'sofaDrop' ? p.targetY : a.y) - (p.kind === 'sofaDrop' && windup ? 410 * (1 - p.elapsed / p.windup) : 0), cell, 176, a.facing);
      return;
    }
    if (a.kind === 'creation') {
      if (a.kikorCreation && !dead) { c.fillStyle = '#b5ff91'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('PROTECTEUR · DÉTRUIS-MOI !', clamp(a.x, 125, 1150), a.y - 146); }
      if (['wolf','boar'].includes(a.rogueForm)) { c.save();c.globalAlpha=.65;this.bitmap(a.rogueForm==='boar'?'pig':'wolf',a.x,a.y,100,state.time,a.facing,true);c.restore();return; }
      if(a.rogueForm==='copy'&&a.copyKind&&CLASSIC_SPRITES[a.copyKind]){c.save();c.globalAlpha=.6;this.drawClassic({...a,kind:a.copyKind},state);c.restore();return;}
      let cell = a.action === 'walk' ? 1 + Math.floor(state.time * 8) % 2 : 0;
      if (a.attack) cell = a.attack.hit ? 4 : 3;
      if (a.striking > 0) cell = 4;
      if (a.emerging > 0) cell = 5;
      if (a.stun > 0) cell = 6;
      if (dead) cell = 7;
      c.save(); c.globalAlpha = a.emerging > 0 ? clamp(1 - a.emerging / BALANCE.specials.kikor.emergeDuration, .15, 1) : dead ? clamp((1.2 - a.deadTime) / .4, 0, 1) : 1;
      this.arcadeSprite('creation', a.x, a.y - a.z, cell, a.rogueForm==='masterpiece'?175:96, a.facing); c.restore();
      if (a.ally) { c.fillStyle = '#9ef5b6'; c.font = '11px monospace'; c.textAlign = 'center'; c.fillText(`ALLIÉ · ${Math.ceil(a.ttl)}s`, a.x, a.y + 20); }
      return;
    }
    if (!dead && a.vehicle) { this.bitmap('car', a.x, a.y, 174, state.time, a.facing); return; }
    if (!dead && a.pattern?.kind === 'bike') { this.bitmap('bike', a.x, a.y, 188, state.time, a.facing); return; }
    if (!dead && a.pattern?.kind === 'smoke') { this.bitmap('smokeHeal', a.x, a.y, 176, state.time, a.facing); return; }
    if (!dead && a.specialState?.kind === 'gustavax') {
      let cell = Math.floor(state.time * 3) % 2;
      if (a.action === 'walk' || a.action === 'dodge') cell = 2 + Math.floor(state.time * 7) % 2;
      if (a.z > 0) cell = a.vz > 0 ? 8 : 9;
      if (a.attack) cell = (a.attack.type === 'kick' ? 6 : 4) + Number(a.attack.elapsed >= a.attack.windup);
      if (a.stun > 0) cell = 10;
      if (a.specialState.elapsed < .3) cell = 11;
      c.save();
      if (a.flash > 0) c.filter = 'brightness(2)'; else if (a.rogueSheitan > state.time) c.filter = 'hue-rotate(255deg) saturate(1.8)';
      this.arcadeSprite('wrestler', a.x, a.y - a.z, cell, 177 * (.94 + (a.y - FLOOR.top) / (FLOOR.bottom - FLOOR.top) * .12), a.facing);
      c.restore(); c.fillStyle = '#9acbff'; c.textAlign = 'center'; c.font = 'bold 11px monospace';
      c.fillText(`J${a.id} · CATCHEUR +30 % · ${Math.max(0, Math.ceil(a.specialState.duration - a.specialState.elapsed))}s`, a.x, a.y + 24);
      return;
    }
    if (!dead && a.specialState && !a.specialState.override && ['jualos', 'yanu', 'jo'].includes(a.kind)) {
      this.bitmap(({ jualos: 'pig', yanu: 'wolf', jo: 'tornado' })[a.kind], a.x, a.y, a.kind === 'jualos' ? 112 : 147, state.time, a.facing, true);
      if (a.kind === 'yanu') { c.strokeStyle = '#b8ffee'; c.lineWidth = 4; c.globalAlpha = .5; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(a.x, a.y - 55, 130 + i * 10, 42 + i * 7, -.3, state.time * 5, state.time * 5 + 1.7); c.stroke(); } c.globalAlpha = 1; }
      return;
    }
    if (action === 'sleep') { c.fillStyle = '#c8e2ff'; c.font = 'bold 20px monospace'; c.textAlign = 'center'; c.fillText('Z z z', a.x + 28, a.y - 70 - Math.sin(state.time * 2) * 8); }
    if (a.sitting) action = 'jump';
    if (a.pattern?.kind === 'whisky') { this.bitmap('bottle', a.x + a.facing * 32, a.y - 95, 43); }
    let progress = action === 'idle' ? (state.time * 1.3) % 1 : action === 'walk' || action === 'dodge' ? (state.time * 2.1) % 1 : clamp(t / (a.attack?.duration || (dead ? .65 : .45)), 0, .999);
    if ((!a.enemy || a.boss) && a.attack) progress = a.attack.hit ? .75 : .25;
    if (a.specialState?.kind === 'kikor') progress = a.specialState.elapsed < BALANCE.specials.kikor.paintAt ? .25 : .75;
    if (a.specialState?.kind === 'karonux' && action !== 'sleep') progress = .25;
    if (a.sitting) progress = .2;
    if (a.z > 0 && !a.attack && !dead) { action = 'jump'; progress = clamp(1 - a.vz / 490, 0, .999); }
    const frame = this.assets.frame(a.kind, action, progress, a.enemy && !a.boss) || this.assets.frame(a.kind, 'idle', 0, a.enemy && !a.boss);
    if (!frame) return;
    const base = this.assets.frame(a.kind, 'idle', 0, a.enemy && !a.boss);
    const height = (a.boss ? 176 : 144) * (.94 + (a.y - FLOOR.top) / (FLOOR.bottom - FLOOR.top) * .12);
    const [sx, sy, sw, sh] = frame.rect;
    const scale = height / (frame.referenceHeight || base?.rect[3] || sh), dw = sw * scale, dh = sh * scale;
    if (!a.enemy && !dead && a.weapon && !a.specialState && !a.attack) this.weaponIcon(a.weapon.kind, a.x + a.facing * 29, a.y - a.z - 66, undefined, a.facing);
    c.save();
    if (dead && a.enemy) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    else if (a.invincible > .2 && Math.floor(state.time * 14) % 2 === 0) c.globalAlpha = .63;
    c.translate(a.x, a.y - a.z - (a.sitting ? 25 : 0)); c.scale(a.facing, 1);
    c.imageSmoothingEnabled = false;
    if (a.action === 'dodge' && !dead) {
      for (let i = 3; i > 0; i--) { c.globalAlpha = .24 / i; c.drawImage(frame.image, sx, sy, sw, sh, -dw / 2 - a.facing * a.dodgeX * i * 27, -dh - a.dodgeY * i * 16, dw, dh); }
      c.globalAlpha = .9;
    }
    if (a.flash > 0) { c.filter = 'brightness(2.6) saturate(.3)'; }
    else if (a.boss && a.enraged) c.filter = 'sepia(.2) saturate(1.5)';
    c.drawImage(frame.image, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
    c.restore();
    if (a.attack && !a.enemy && a.attack.hit && a.attack.elapsed < a.attack.windup + .17) {
      c.save(); c.translate(a.x + a.facing * 26, a.y - height * .48 - a.z); c.scale(a.facing, 1);
      c.strokeStyle = a.attack.type === 'special' ? fighter(a.kind).color : '#fff0b0'; c.lineWidth = a.attack.heavy ? 7 : 4; c.globalAlpha = .7;
      c.beginPath(); c.ellipse(10, 0, a.attack.heavy ? 94 : 68, a.attack.heavy ? 62 : 40, -.2, -1.25, 1.1); c.stroke(); c.restore();
    }
    if (a.enemy && a.attack && !a.attack.hit) {
      c.font = 'bold 25px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ff9e91'; c.shadowColor = '#210507'; c.shadowBlur = 6;
      c.fillText(a.attack.type === 'special' ? '!!' : '!', a.x, a.y - height - 46); c.shadowBlur = 0;
      if (a.attack.type === 'special') {
        const cue = { remy: 'DÉRAPAGE', makouille: 'ROUE AVANT', papy_jala: 'POIVRE !', orelsan: 'SMATCH', charlingals: 'FAUX BILLETS', guylux: 'CARTES', kikor_e: 'CRAYONS' }[a.kind];
        if (cue) { c.font = 'bold 10px monospace'; c.fillStyle = '#ffe1a4'; c.fillText(cue, a.x, a.y - height - 70); }
      }
    }
    if (!a.enemy) {
      c.textAlign = 'center'; c.font = 'bold 11px monospace'; c.fillStyle = color;
      if (dead) {
        c.fillText(a.lives ? `À TERRE · ${Math.max(0, Math.ceil(14 - a.downTime))}s` : 'À TERRE', a.x, a.y - 48);
        if (state.players.length === 2) { c.fillStyle = '#f1eee7'; c.fillText('MAINTENIR E / LB', a.x, a.y - 31); }
        if (a.revive > 0) { c.fillStyle = '#183d36'; c.fillRect(a.x - 35, a.y - 22, 70, 4); c.fillStyle = '#9befca'; c.fillRect(a.x - 35, a.y - 22, 70 * a.revive / 1.7, 4); }
      } else { c.fillText(a.id === slot + 1 ? `J${a.id} · TOI` : `J${a.id}`, a.x, a.y + 24); }
    }
  }
  enemyBar(a) {
    const c = this.ctx, config = ELITES[a.kind] || ENEMIES[a.kind];
    const name = ELITES[a.kind]?.firstName || (a.kind === 'bolorouet' ? 'Julio' : config?.name?.split(' ·')[0]) || (a.kind === 'creation' ? 'Création' : fighter(a.kind).name);
    const height = ELITES[a.kind]?.height || CLASSIC_SPRITES[a.kind]?.height || STREET_ENEMIES[a.kind]?.height || (a.boss ? 176 : a.kind === 'creation' ? 96 : 144);
    c.save(); c.font = 'bold 12px monospace'; c.textAlign = 'center';
    const width = Math.max(104, c.measureText(name).width + 22), x = clamp(a.x, width / 2 + 8, W - width / 2 - 8), y = a.y - height - (a.z || 0) - 34;
    c.fillStyle = '#080e19'; c.fillRect(x - width / 2 - 2, y - 2, width + 4, 24);
    c.fillStyle = '#293345'; c.fillRect(x - width / 2, y, width, 20);
    c.fillStyle = config?.color || '#ed968b'; c.fillRect(x - width / 2, y + 15, width * clamp(a.hp / a.maxHp, 0, 1), 5);
    c.fillStyle = '#ffffff'; c.fillText(name, x, y + 12); c.restore();
  }
  drawClassic(a, state) {
    const c = this.ctx, config = CLASSIC_SPRITES[a.kind], dead = a.hp <= 0;
    let cell = a.moving ? 1 + Math.floor(state.time * 7) % 2 : 0;
    if (a.attack) cell = (a.attack.type === 'special' ? 7 : 3) + Number(a.attack.hit);
    if (a.kind === 'makouille' && a.attack?.type === 'special' && a.attack.hit) cell = 4;
    if (a.stun > 0) cell = 5;
    if (dead) cell = 6;
    c.save();
    if (dead) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    else if (a.invincible > .2 && Math.floor(state.time * 14) % 2 === 0) c.globalAlpha = .63;
    if (a.flash > 0) c.filter = 'brightness(2)';
    this.arcadeSprite(a.kind, a.x, a.y - a.z, cell, config.height, a.facing);
    c.restore();
    if (dead) return;
    const y = a.y - config.height - a.z - 14;
    if (a.attack && !a.attack.hit) {
      const cue = { remy: 'DÉRAPAGE', makouille: 'ROUE AVANT', papy_jala: 'POIVRE !', orelsan: 'SMASH', charlingals: 'FAUX BILLETS', guylux: 'CARTES', kikor_e: 'CRAYONS' }[a.kind];
      c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillStyle = '#ffe1a4';
      c.fillText(a.attack.type === 'special' ? cue : '!', clamp(a.x, 90, 1190), y - 28);
    }
  }
  drawStreetEnemy(a, state) {
    const c = this.ctx, config = STREET_ENEMIES[a.kind], p = a.pattern, dead = a.hp <= 0;
    let cell = a.action === 'walk' ? 1 + Math.floor(state.time * 8) % 2 : 0;
    if (p) cell = (['megaphone', 'tacoVolley', 'huntingDog', 'puddle', 'fastTalk'].includes(p.kind) ? 7 : 3) + Number(p.hit);
    if (a.stun > 0) cell = 5;
    if (dead) cell = 6;
    c.save();
    if (dead) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    else if (a.invincible > .2 && Math.floor(state.time * 14) % 2 === 0) c.globalAlpha = .63;
    if (a.flash > 0) c.filter = 'brightness(2)';
    if (config.costume) drawCostumeEnemy.call(this, a, state);
    else this.arcadeSprite(`street_${a.kind}`, a.x, a.y - a.z, cell, config.height, a.facing);
    c.restore();
    if (dead) return;
    const y = a.y - config.height - a.z - 14;
    c.font = 'bold 11px monospace'; c.textAlign = 'center';
    if (p && !p.hit) { c.fillStyle = '#ffe1a4'; c.fillText(STREET_LABELS[p.kind] || config.tell || 'ATTENTION !', clamp(a.x, 110, 1170), y - 27); }
  }
  drawElite(a, state) {
    const c = this.ctx, config = ELITES[a.kind], q = a.eliteState, p = a.pattern, dead = a.hp <= 0;
    let cell = a.action === 'walk' ? 1 + Math.floor(state.time * 8) % 2 : 0;
    if (p) cell = p.hit ? 4 : 3;
    if (ENCORE_ELITES[a.kind]) cell = p ? (p.secondary ? 7 : 3) + Number(p.hit) : a.recovering > .6 && a.kind !== 'carnivore' ? 11 : cell;
    if (a.kind === 'precieux' && p?.hit) cell = 8;
    if (a.kind === 'kayak' && p?.hit) cell = Math.floor(state.time * 8) % 2 ? 4 : 8;
    if (a.kind === 'fouine' && p?.hit) cell = 8 + Math.floor(state.time * 11) % 2;
    if (a.stun > 0) cell = a.kind === 'fouine' && !p?.hit ? 11 : 5;
    if (dead) cell = 6;
    if (a.kind === 'canape') cell = dead ? 5 : q.landing > 0 ? 2 : q.seated ? p ? 3 : Math.floor(state.time * 2) % 2 : a.enraged ? p?.hit ? 11 : 7 : 6;
    c.save();
    if (dead) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    if (a.flash > 0) c.filter = 'brightness(2)';
    this.arcadeSprite(a.kind, a.x, a.y - a.z, cell, config.height, a.facing);
    c.restore();
    if (dead) return;
    const y = a.y - config.height - a.z - 14;
    c.textAlign = 'center'; c.font = 'bold 10px monospace'; c.fillStyle = config.color;
    if (p && !p.hit) { c.fillStyle = '#ffe5aa'; c.font = 'bold 11px monospace'; c.fillText(ELITE_LABELS[p.kind] || 'ATTENTION !', clamp(a.x, 145, 1135), y - 27); }
    if (q.landing > 0) { c.fillStyle = '#ffd376'; c.font = 'bold 14px monospace'; c.fillText('CANAPÉ EN APPROCHE !', clamp(a.x, 140, 1140), a.y - 30); }
  }
  weaponIcon(kind, x, y, width, facing = 1) {
    const b = WEAPONS[kind], asset = b && this.assets.arcadeFrame('weaponItems', b.cell); if (!asset) return;
    const c = this.ctx, [sx, sy, sw, sh] = asset.rect, w = width || b.width, h = w * sh / sw;
    c.save(); c.translate(x, y); c.scale(facing, 1); c.imageSmoothingEnabled = false; c.drawImage(asset.image, sx, sy, sw, sh, -w / 2, -h / 2, w, h); c.restore();
  }
  drawInteraction(a, state) {
    const g = a.grapple, pickup = a.interaction, attack = a.attack?.type === 'weapon' ? a.attack : null;
    const weapon = attack?.weapon || a.weapon?.kind, b = WEAPONS[weapon];
    if (!g && !pickup && !attack && !(b && !a.attack && !a.moving && a.z === 0 && a.stun <= 0)) return false;
    let cell;
    if (g) cell = g.throwing ? g.elapsed < GRAPPLE.throwAt ? 2 : 3 : g.elapsed < .16 ? 0 : 1;
    else if (pickup) cell = pickup.elapsed < .22 ? 4 : 5;
    else cell = (weapon === 'knife' ? 6 : weapon === 'bat' ? 8 : 10) + Number(!!attack?.hit);
    const asset = this.assets.arcadeFrame(`actions_${a.kind}`, cell); if (!asset) return false;
    const c = this.ctx, height = 144 * (.94 + (a.y - FLOOR.top) / (FLOOR.bottom - FLOOR.top) * .12);
    c.save(); if (a.flash > 0) c.filter = 'brightness(2)';
    if (b?.gun && !g && !pickup) {
      this.weaponIcon(weapon, a.x + a.facing * (b.width * .3 + 40), a.y - a.z - height * (attack?.hit ? .73 : .68), b.width, a.facing);
    }
    this.arcadeSprite(`actions_${a.kind}`, a.x, a.y - a.z, cell, height, a.facing); c.restore();
    if (g && !g.throwing) { c.font = 'bold 11px monospace'; c.fillStyle = '#ffce83'; c.textAlign = 'center'; c.fillText('POING + ARRIÈRE · PROJETER', a.x, a.y - height - 16); }
    return true;
  }
  scenery(p) {
    const asset = this.assets.arcadeFrame(p.key); if (!asset) return;
    const width = p.height * asset.rect[2] / asset.rect[3];
    this.ellipse(p.x + 3, p.y + 1, width * .4, Math.min(9, p.height * .065), '#0005');
    this.arcadeSprite(p.key, p.x, p.y, 0, p.height, p.facing || 1);
  }
  prop(p) {
    if (p.bourgTable) { drawBourgTable(this, p); return; }
    if (p.kind === 'sofa') {
      this.arcadeSprite('canape', p.x, p.y, p.hp > 3 ? 8 : 10, 128);
      if (p.hp > 0) { const c = this.ctx; c.fillStyle = '#ffdf8c'; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillText('E / LB · S’ASSEOIR', p.x, p.y + 18); }
      return;
    }
    if (p.kind === 'easel') {
      const cell = p.enemy ? 11 : (p.paintTime || 0) < .25 ? 9 : p.paintTime < .55 ? 10 : 11;
      this.arcadeSprite('creation', p.x, p.y, cell, 114);
      const c = this.ctx; c.fillStyle = p.enemy ? '#ff9789' : '#95e8b8'; c.font = '11px monospace'; c.textAlign = 'center'; c.fillText(p.enemy ? `TABLEAU · ${p.hp} COUPS` : 'TOILE ALLIÉE', p.x, p.y + 15); return;
    }
    const c = this.ctx, broken = p.hp <= 0, max = p.maxHp || 3, frame = broken ? 2 : p.hp < max ? 1 : 0;
    c.save();
    if (broken) c.globalAlpha = Math.min(.8, p.rubble / 2);
    this.ellipse(p.x + 3, p.y + 1, p.kind === 'car' ? 155 : 36, p.kind === 'car' ? 15 : 9, '#0008');
    if (p.bonus && !broken) { c.strokeStyle = '#8fefc8'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y + 2, p.kind === 'car' ? 167 : 43, 13, 0, 0, TAU); c.stroke(); }
    if (p.flash > 0) c.filter = 'brightness(1.7)';
    this.arcadeSprite(p.kind, p.x + (p.flash > 0 ? Math.sin(p.flash * 90) * 3 : 0), p.y, frame);
    c.filter = 'none';
    if (!broken && p.hp < max) { c.fillStyle = '#12202b'; c.fillRect(p.x - 26, p.y + 15, 52, 4); c.fillStyle = '#ffcf7c'; c.fillRect(p.x - 26, p.y + 15, 52 * p.hp / max, 4); }
    c.restore();
  }
  pickup(p, time) {
    if (p.kind === 'weapon') {
      this.ellipse(p.x, p.y + 3, 33, 6, '#8bbfff35'); this.weaponIcon(p.weapon, p.x, p.y - 10 + Math.sin(time * 3) * 2);
      const c = this.ctx; c.fillStyle = '#b4dfff'; c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillText(`F / RT · ${WEAPONS[p.weapon]?.name || 'ARME'}`, p.x, p.y + 23); return;
    }
    const c = this.ctx, bob = Math.sin(time * 4 + p.id) * 3, food = p.kind === 'food';
    this.ellipse(p.x, p.y + 3, 25, 7, food ? '#98e7ad28' : '#ffba5830');
    c.save(); c.shadowBlur = 16; c.shadowColor = food ? '#8cf7b9' : '#ffba58';
    this.arcadeSprite(p.kind, p.x, p.y - 5 + bob);
    c.restore();
  }
  exit(state) {
    const c = this.ctx, pulse = .55 + Math.sin(state.time * 4) * .2;
    c.save(); c.globalAlpha = pulse;
    const g = c.createLinearGradient(1140, 0, W, 0); g.addColorStop(0, '#ffba5800'); g.addColorStop(1, '#ffba5844'); c.fillStyle = g; c.fillRect(1140, 410, 140, 275);
    c.fillStyle = '#ffd180'; c.textAlign = 'center'; c.font = '48px Impact, sans-serif'; c.fillText('→', 1190, 465); c.font = '13px Impact, sans-serif'; c.fillText('ON AVANCE', 1190, 488); c.restore();
  }
  chapterStory(state) {
    const story = CHAPTER_INTROS[state.chapter];
    const c = this.ctx, image = this.assets.get(story.image);
    const elapsed = INTRO_DURATION - state.phaseTime;
    c.save();
    if (image) c.drawImage(image, 0, 0, W, H);
    const shade = c.createLinearGradient(0, 390, 0, H);
    shade.addColorStop(0, '#03060b00'); shade.addColorStop(.45, '#03060be8'); shade.addColorStop(1, '#03060b');
    c.fillStyle = shade; c.fillRect(0, 390, W, H - 390);
    c.fillStyle = '#03060ba8'; c.fillRect(0, 0, W, 100);
    c.textAlign = 'left'; c.fillStyle = '#ffbd69'; c.font = 'bold 15px monospace';
    c.fillText(`CHAPITRE ${String(routeDepth(state) + 1).padStart(2, '0')}`, 56, 34);
    c.font = '36px Impact, sans-serif'; c.fillStyle = '#fff3d9'; c.fillText((story.title || CHAPTERS[state.chapter].name).toUpperCase(), 56, 77);
    c.font = 'bold 26px monospace';
    const count = this.reducedMotion ? story.text.length : Math.floor(story.text.length * clamp(elapsed / INTRO_REVEAL, 0, 1));
    // Wrap the complete text first so partially revealed words never change lines.
    const lines = []; let line = '';
    for (const word of story.text.split(' ')) {
      if (line && c.measureText(line + ' ' + word).width > W - 112) { lines.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    let remaining = count;
    for (const [i, text] of lines.entries()) { c.fillText(text.slice(0, Math.max(0, remaining)), 56, 548 + i * 39); remaining -= text.length + 1; }
    c.restore();
  }
  intro(state) {
    const c = this.ctx, chapter = CHAPTERS[state.chapter];
    c.save();
    const duration = state.stage === 0 ? 2.4 : 1.15;
    c.globalAlpha = Math.min(1, (duration - state.phaseTime) * 4, state.phaseTime * 3);
    c.fillStyle = '#070d17d9'; c.fillRect(0, 270, W, state.stage === 0 ? 165 : 112);
    c.fillStyle = chapter.color; c.fillRect(0, 270, 7, state.stage === 0 ? 165 : 112);
    c.textAlign = 'center'; c.fillStyle = chapter.color; c.font = '12px monospace';
    c.fillText(state.chapter===6?`NIVEAU 7 / REVANCHE ${state.stage+1} SUR 6`:`ÉTAPE ${routeDepth(state)+1} / RUE ${state.stage+1} SUR 6`, W / 2, 305);
    c.fillStyle = '#f4f1e8'; c.font = '54px Impact, sans-serif'; c.fillText(state.stage === 5 ? 'LE PATRON DU QUARTIER.' : chapter.name.toUpperCase(), W / 2, 362);
    if (state.stage === 0) { c.fillStyle = '#b1bdce'; c.font = 'italic 16px Segoe UI, sans-serif'; c.fillText(chapter.quote, W / 2, 399); }
    c.restore();
  }
  drawEffects(dt) {
    const c = this.ctx;
    for (const e of this.effects) {
      e.ttl -= dt;
      if (e.ttl <= 0) continue;
      c.save(); c.globalAlpha = clamp(e.ttl / (e.life * .5), 0, 1);
      if (e.type === 'shot') {
        const progress = 1 - e.ttl / e.life, spread = e.weapon === 'shotgun' ? 5 : 1;
        c.translate(e.x, e.y); c.scale(e.facing, 1); c.globalCompositeOperation = 'lighter';
        if (progress < .4) {
          c.fillStyle = '#ffe5a0'; c.beginPath(); c.moveTo(-5, -6); c.lineTo(28, -13); c.lineTo(17, -3); c.lineTo(45, 0); c.lineTo(17, 4); c.lineTo(28, 12); c.lineTo(-5, 6); c.fill();
        }
        for (let i = 0; i < spread; i++) {
          const distance = Math.max(12, e.range - 60) * Math.min(1, progress * 1.7), slope = (i - (spread - 1) / 2) * .045;
          c.strokeStyle = '#ffc66c'; c.lineWidth = 4; c.beginPath(); c.moveTo(Math.max(0, distance - 40), (distance - 40) * slope); c.lineTo(distance, distance * slope); c.stroke();
          c.strokeStyle = '#fffbea'; c.lineWidth = 1.5; c.stroke();
        }
      }
      if (e.type === 'atlasFX') this.arcadeSprite(e.atlas, e.x, e.y, e.cell, 110 + (1 - e.ttl / e.life) * 30);
      if (e.type === 'rogueFX' && e.visual === 'arms') { c.save();c.strokeStyle=e.color;c.lineWidth=12*e.ttl/e.life;c.beginPath();c.moveTo(e.x,e.y-65);c.lineTo(e.x+(e.facing||1)*e.radius*.75,e.y-70);c.moveTo(e.x,e.y-60);c.lineTo(e.x-(e.facing||1)*e.radius*.5,e.y-55);c.stroke();c.restore(); }
      if (e.type === 'rogueFX') { const progress=1-e.ttl/e.life;c.strokeStyle=e.color;c.lineWidth=5*(1-progress);c.beginPath();c.ellipse(e.x,e.y-15,Math.max(1,e.radius*(.3+progress*.7)),Math.max(1,e.radius*.3),0,0,TAU);c.stroke();if(e.label){c.font='bold 14px monospace';c.textAlign='center';c.fillStyle=e.color;c.fillText(e.label,clamp(e.x,180,W-180),e.y-180-progress*15);} }
      if (e.type === 'dash' && !this.reducedMotion) this.arcadeSprite('dash', e.x, e.y, Math.min(2, Math.floor((1 - e.ttl / e.life) * 3)), 34, e.facing);
      if (e.type === 'number') { e.y -= 35 * dt; c.font = `bold ${e.text.length > 3 ? 13 : 24}px monospace`; c.textAlign = 'center'; c.fillStyle = e.color; c.strokeStyle = '#07101b'; c.lineWidth = 4; c.strokeText(e.text, e.x, e.y); c.fillText(e.text, e.x, e.y); }
      if (e.type === 'ember') this.fireSprite(8 + Math.min(3, Math.floor((1 - e.ttl / e.life) * 4)), e.x, e.y + e.radius * .3, e.radius * 1.9);
      if (e.type === 'spark') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 400 * dt; c.fillStyle = e.color; c.translate(e.x, e.y); c.rotate(Math.atan2(e.vy, e.vx)); c.fillRect(0, 0, 7, 2.5); }
      if (e.type === 'special') {
        const progress = 1 - e.ttl / e.life;
        c.strokeStyle = '#ffd58e'; c.lineWidth = 9 * (1 - progress); c.globalCompositeOperation = 'lighter';
        c.beginPath(); c.ellipse(e.x, e.y - 30, 45 + progress * 230, 20 + progress * 75, 0, 0, TAU); c.stroke();
        c.globalCompositeOperation = 'source-over'; c.font = 'italic 23px Impact, sans-serif'; c.fillStyle = '#ffe7ba'; c.textAlign = 'center'; c.fillText(e.label.toUpperCase(), clamp(e.x, 180, W - 180), e.y - 190 - progress * 12);
      }
      if (e.type === 'announcement') { c.textAlign = 'center'; c.font = '32px Impact, sans-serif'; c.fillStyle = e.color; c.fillText(e.text, W / 2, 210); }
      c.restore();
    }
    this.effects = this.effects.filter(e => e.ttl > 0);
  }
  hud(s, slot, online, ping) {
    $('#hud').classList.toggle('is-solo', s.players.length === 1);
    const key = s.players.map(p => p.kind).join(',');
    if (key !== this.hudKey) {
      this.hudKey = key;
      for (let i = 0; i < 2; i++) {
        const el = $(`#hud-p${i + 1}`), p = s.players[i];
        el.classList.toggle('score-only', !p);
        if (!p) { el.innerHTML = '<div class="player-bars solo-score-panel"><div><b>SCORE DE LA BANDE</b></div><strong class="solo-score"></strong></div>'; continue; }
        const f = fighter(p.kind);
        el.style.setProperty('--fighter-color', f.color);
        el.innerHTML = `<div class="hud-portrait"><img src="/assets/${f.id}/${f.id}_p.png" alt=""><span>J${i + 1}</span></div><div class="player-bars"><div class="player-identity"><b>${f.name}</b><small>${i === slot ? 'TOI' : online ? 'ALLIÉ' : 'COMBATTANT'}</small></div><div class="hud-meter health-bar"><span>VIE</span><i></i><output></output></div><div class="hud-meter energy-bar"><span>SP</span><i></i><output></output></div><div class="hud-meta"><span class="credits"></span><span class="dodge-caption"></span></div><div class="talent-caption"></div></div>`;
      }
    }
    for (let i = 0; i < s.players.length; i++) {
      const p = s.players[i], el = $(`#hud-p${i + 1}`);
      el.querySelector('.health-bar i').style.transform = `scaleX(${p.hp / p.maxHp})`;
      el.querySelector('.energy-bar i').style.transform = `scaleX(${p.energy / 100})`;
      el.querySelector('.health-bar output').textContent = p.hp > 0 ? `${Math.ceil(p.hp)} / ${p.maxHp}` : 'À TERRE';
      el.querySelector('.energy-bar output').textContent = `${Math.floor(p.energy)} / 100`;
      el.classList.toggle('critical', p.hp > 0 && p.hp / p.maxHp <= .3);
      el.classList.toggle('down', p.hp <= 0);
      const cost = BALANCE.specials[p.kind].cost;
      el.querySelector('.dodge-caption').textContent = p.dodgeCd > 0 ? `ESQUIVE ${p.dodgeCd.toFixed(1)}s` : 'ESQUIVE ✓';
      el.querySelector('.credits').textContent = `${'◆'.repeat(p.lives) || '◇'} VIE${p.lives > 1 ? 'S' : ''}`;
      const specialState = p.specialState ? 'SPÉCIAL EN COURS' : p.energy >= cost ? 'SPÉCIAL PRÊT' : `FRAPPE POUR CHARGER · ${Math.floor(p.energy)} %`;
      el.querySelector('.energy-bar').classList.toggle('ready', !p.specialState && p.energy >= cost);
      const r = p.progression;
      if (!el.querySelector('.special-caption')) el.querySelector('.player-bars').insertAdjacentHTML('beforeend', '<span class="special-caption"></span>');
      el.querySelector('.special-caption').textContent = specialState;
      if (!el.querySelector('.weapon-caption')) el.querySelector('.player-bars').insertAdjacentHTML('beforeend', '<span class="weapon-caption"></span>');
      const weapon = p.weapon && WEAPONS[p.weapon.kind];
      el.querySelector('.weapon-caption').textContent = weapon ? `${weapon.name.toUpperCase()} · ${p.weapon.uses} ${weapon.gun ? 'MUNITIONS' : 'COUPS'} · J / X` : 'CONTACT · PRISE   POING + ARRIÈRE · PROJECTION';
      if (r) { const progress = r.level === 20 ? 1 : (r.xp - xpForLevel(r.level)) / (xpForLevel(r.level + 1) - xpForLevel(r.level)); el.querySelector('.talent-caption').innerHTML = `<span>NIV. ${r.level}</span><span class="xp-track"><i style="width:${Math.round(progress * 100)}%"></i></span>${p.rogueDebt != null ? `<span>RIPOSTE ${Math.round(p.rogueDebt / (p.power * 2) * 100)}%</span>` : ''}${p.rogueRhythm != null ? `<span>RYTHME ${p.rogueRhythm}/3</span>` : ''}${p.rogueInstinctGauge != null ? `<span>INSTINCT ${p.rogueInstinctGauge}/3</span>` : ''}`; }
    }
    const progression = s.players[slot]?.progression;
    const stats = progression?.statPoints || 0, talents = progression?.points || 0;
    const notice = $('#upgrade-notice');
    notice.hidden = stats + talents === 0;
    for (const [selector, count, label] of [['.upgrade-stats', stats, 'caractéristiques'], ['.upgrade-talents', talents, 'talents']]) {
      const button = notice.querySelector(selector);
      button.hidden = count === 0;
      button.querySelector('.upgrade-count').textContent = count;
      button.setAttribute('aria-label', `${count} point${count > 1 ? 's' : ''} de ${label} à dépenser. Ouvrir le menu.`);
    }
    const announcement = `${stats} point${stats > 1 ? 's' : ''} de caractéristiques et ${talents} point${talents > 1 ? 's' : ''} de talents à dépenser.`;
    if ($('#upgrade-announcement').textContent !== announcement) $('#upgrade-announcement').textContent = announcement;
    const soloScore = $('.solo-score'); if (soloScore) soloScore.textContent = scoreText(s.score);
    $('#mission-chapter').textContent = s.chapter===6?'NIVEAU 07 · LE DERNIER MOT':`ÉTAPE ${String(routeDepth(s) + 1).padStart(2, '0')} / 06 · MENACE ${routeDepth(s) + 1}/6${online ? ' · ' + scoreText(s.score) : ''}`;
    $('#mission-title').textContent = CHAPTERS[s.chapter].name;
    $('#street-progress').innerHTML = CHAPTERS[s.chapter].backgrounds.map((_, i) => `<i class="${i <= s.stage ? 'done' : ''}"></i>`).join('');
    const count = s.enemies.filter(e => e.hp > 0).length;
    $('#objective').textContent = s.phase === 'clear' ? (s.players.length === 2 ? 'Rue dégagée · Tous les deux à droite →' : 'Rue dégagée · Avance à droite →') : s.phase === 'intro' ? 'La nuit ne fait que commencer.' : s.phase === 'rest' ? `On souffle · Renforts dans ${Math.ceil(s.phaseTime)}s` : `VAGUE ${s.wave + 1}/${s.waves.length} · ${count} ennemis${s.spawnQueue.length ? ` + ${s.spawnQueue.length} renforts` : ''} · RUE ${s.stage + 1}/6`;
    if(s.chapter===6)$('#objective').textContent=s.stage<6?`REVANCHES ${s.stage}/6 · VAGUE ${Math.max(1,s.wave+1)}/${s.waves.length} · ${count} ennemis`:'GUSTAVAX · TROIS PHASES · POINT DE REPRISE ACTIVÉ';
    if (s.phase === 'surprise') $('#objective').textContent = 'DÉFI BONUS · Réussis pour gagner du score · Échec sans blocage';
    if (s.neighborhoodEncounter) $('#objective').textContent = neighborhoodHint(s);
    if(s.sandbox&&!s.practice)$('#objective').textContent+=' · MENU SECRET'+(s.sandbox.invulnerable?' · INVULNÉRABLE':'');
    if(s.sandbox?.mode==='enemy')$('#objective').textContent='TEST ENNEMI · '+ENEMIES[s.sandbox.enemy].name+(s.sandbox.invulnerable?' · INVULNÉRABLE':'')+' · PAUSE : MENU SECRET';
    if (s.practice) $('#objective').textContent = `TEST BOSS${s.practice.invulnerable ? ' · INVULNÉRABLE' : ''} · PAUSE : RELANCER / CHANGER DE BOSS`;
    $('#ping').textContent = online ? `${Math.round(ping)} ms · EN LIGNE` : 'SOLO';
    const boss = s.enemies.find(e => e.boss && e.hp > 0);
    $('#boss-hud').classList.toggle('hidden', !boss || !!s.bossCinema);
    if (boss) {
      const sleeping = boss.pattern?.kind === 'sleep' && boss.pattern.hit;
      const status = boss.sofa && !boss.sofaBroken ? 'CANAPÉ · FRAPPE FORT POUR LE DÉLOGER !' : boss.kikorGrip ? 'PRISE · LIBÈRE-TOI !' : boss.shielded ? 'INVINCIBLE · DÉTRUIS LE BONHOMME VERT' : sleeping ? 'IL DORT · ENCHAÎNE !' : boss.pattern ? PATTERN_LABELS[boss.pattern.kind] || '' : boss.recovering > 0 ? 'CONTRE-ATTAQUE · +25 % DÉGÂTS' : boss.kind==='gustavax'?'PRESSION CONSTANTE':'ENCHAÎNE POUR BRISER SA GARDE';
      $('#boss-name').textContent = `${boss.kind === 'jo' ? 'Jo la Mouk' : fighter(boss.kind).name} / ${boss.vehicle ? 'ACTE I · LA GOLF BLANCHE' : `ACTE ${boss.kind === 'karonux' ? boss.bossPhase + 1 : boss.bossPhase} · ${status}`}`;
      $('#boss-health').style.transform = `scaleX(${boss.hp / boss.maxHp})`;
      $('#boss-hud').classList.toggle('boss-opening', !boss.shielded && (sleeping || boss.recovering > 0));
    }
  }
}

