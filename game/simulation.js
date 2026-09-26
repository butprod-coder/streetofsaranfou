import { finalArena } from './final-arena.js';
import { campaignRoute, shuffledRoute } from './campaign-route.js';
import { lateEvents } from './late-events.js';
import { bourgEvents } from './bourg-events.js';
import { stadiumEvents } from './stadium-events.js';
import { estateEvents } from './estate-events.js';
import { FIGHTERS, CHAPTERS, ENEMIES, FLOOR, STEP, fighter, clamp, blankInput } from './data.js';
import { BALANCE, difficulty } from './balance.js';
import { applyProfile, completeChapter, spendPoint, awardTalent } from './progression.js';
import { wavePlan, activeEnemyLimit, createEnemyOrder } from './encounters.js';
import { combat } from './combat.js';
import { karonuxCombat } from './boss-karonux.js';
import { kikorCombat } from './boss-kikor.js';
import { yanuCombat } from './boss-yanu.js';
import { lorenzoCombat } from './boss-lorenzo.js';
import { joCombat } from './boss-jo.js';
import { jualosCombat } from './boss-jualos.js';
import { streetEvents } from './street-events.js';
import { neighborhoodEvents, neighborhoodPlan } from './neighborhood-events.js';
import { elites } from './elites.js';
import { interactionCombat } from './interaction-combat.js';
import { enemyTactics } from './enemy-tactics.js';
import { rogueRun } from './rogue-run.js';
import { rogueCombat } from './rogue-combat.js';
import { streetEnemies } from './street-enemies.js';
import { STREET_ENEMIES } from './street-enemies-data.js';
import { hasTalent } from './rogue-talents.js';
import { CHAPTER_INTROS, hasChapterIntro, INTRO_DURATION, INTRO_REVEAL } from './chapter-intro.js';

const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.5);
const alive = a => a.hp > 0;
const DECAY = ['cooldown', 'stun', 'invincible', 'dodgeCd', 'dodgeBuffer', 'buff', 'flash', 'comboWindow', 'specialCd', 'recovering'];

/** Browser and server run the same fixed-step simulation. Rendering never deals damage. */
export class Simulation {
  constructor(characters = ['karonux'], chapter = 0, seed = Date.now(), options = {}) {
    this.seed = seed >>> 0;
    this.nextId = 10;
    this.state = {
      tick: 0, time: 0, chapter: clamp(Math.floor(chapter), 0, CHAPTERS.length - 1), stage: 0,
      runId: `run-${this.seed.toString(36)}`,
      phase: 'intro', phaseTime: 2.4, paused: false, pauseReason: '',
      players: characters.slice(0, 2).map((id, i) => this.makePlayer(id, i)), enemies: [], props: [], pickups: [], events: [],
      eventSeq: 0, score: 0, kills: 0, combo: 0, comboTime: 0, bestCombo: 0, allDown: 0,
      difficulty: ['easy', 'normal', 'hard'].includes(options.difficulty) ? options.difficulty : 'normal',
      hazards: [], allies: [], wave: -1, waves: [], spawnQueue: [], spawnTimer: 0, surprise: null, surpriseDone: false,
      neighborhood: neighborhoodPlan(this.seed), estate: neighborhoodPlan(this.seed, 1), stadium: neighborhoodPlan(this.seed, 2), bourg: neighborhoodPlan(this.seed, 3), night: neighborhoodPlan(this.seed, 4), school: neighborhoodPlan(this.seed, 5),
    };
    if (options.randomRoute) { this.state.route=shuffledRoute(this.seed); this.state.chapter=this.state.route.order[0]; }
    for (const [i, p] of this.state.players.entries()) { applyProfile(p, options.profiles?.[i], false); p.lives = difficulty(this.state.difficulty).lives; }
    this.enterStreet();
  }

  random() {
    this.seed = (this.seed + 0x6D2B79F5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  makePlayer(id, index) {
    const c = fighter(id);
    return { ...this.actor(c.id, index + 1, false), hp: c.hp, maxHp: c.hp, power: c.power, speed: c.speed,
      x: 245 + index * 95, y: 538 + index * 48, energy: 0, lives: 2, dodgeCd: 0, buff: 0,
      comboStep: 0, comboWindow: 0, downTime: 0, revive: 0, seq: 0, taps: {}, connected: true, specialCd: 0, specialState: null };
  }

  actor(kind, id, enemy) {
    return { id, kind, enemy, boss: false, x: 0, y: 535, z: 0, vz: 0, vx: 0, vy: 0, facing: enemy ? -1 : 1,
      action: 'idle', actionTime: 0, cooldown: 0, stun: 0, invincible: 0, flash: 0, attack: null, deadTime: 0, moving: false };
  }

  event(type, data = {}) {
    const s = this.state;
    s.events.push({ id: ++s.eventSeq, time: s.time, type, ...data });
  }

  enterStreet() {
    const s = this.state;
    for (const e of s.enemies) if (e.kikorGrip) this.releaseKikorGrip(e);
    for (const p of s.players) { p.yanuFrozen = null; p.jualosSlip = null; }
    s.bossCinema = null;
    s.decor = null;
    for (const p of s.players) { this.releaseGrab(p); p.interaction = null; this.clearRogueTransient(p); }
    s.enemies = []; s.pickups = this.streetWeapons(); s.combo = 0; s.comboTime = 0;
    s.gymProjectiles = []; s.hazards = []; s.allies = s.allies.filter(a => (a.recruit || a.gustavaxMinion) && a.permanent && a.hp > 0); s.wave = -1; s.spawnQueue = []; s.spawnTimer = 0;
    s.jualosWaves = []; s.lorenzoClouds = []; s.lorenzoShots = []; s.lorenzoBirds = [];
    s.yanuPlants = []; s.yanuTiles = [];
    s.kikorPaintZones=[];s.kikorPots=[];s.kikorDrawings=[];
    for (const a of s.allies) { a.x = 130; a.y = 500 + a.id % 4 * 35; a.attack = null; }
    s.rogueZones = []; s.rogueBalls = [];
    s.enemyOrder ||= createEnemyOrder(() => this.random());
    s.streetSeed = this.seed; s.streetBag = [...(s.enemyBag || [])];
    s.waves = wavePlan(this.routeDepth(), s.stage, s.players.length, s.difficulty, () => this.random(), s.enemyBag ||= [], s.enemyOrder);
    s.props = this.streetProps(); s.surprise = null; s.surpriseDone = false;
    this.prepareNeighborhood();
    for (const [i, p] of s.players.entries()) {
      p.x = 200 + i * 95; p.y = 535 + i * 55; p.z = 0; p.vz = 0; p.vx = 0; p.vy = 0;
      p.attack = null; p.stun = 0; p.invincible = 1.8; p.facing = 1; p.action = 'idle'; p.moving = false;
      this.endSpecial(p); p.dodgeBuffer = 0; p.dodgeHeld = false;
      p.sitting = null; p.seatHold = 0;
      if (p.hp <= 0) this.revivePlayer(p, .45);
    }
    s.chapterStory = !!CHAPTER_INTROS[s.chapter] && s.stage === 0;
    s.phase = 'intro'; s.phaseTime = s.chapterStory ? INTRO_DURATION : s.stage === 0 ? 2.4 : 1.15;
    if(s.chapter===6)this.prepareFinalArena();
    this.introJumpHeld = [];
    this.event('street', { chapter: s.chapter, stage: s.stage });
  }

  spawnWave() {
    const s = this.state, duo = s.players.length === 2, wave = s.waves[++s.wave];
    if (!wave) return;
    s.props = s.props.filter(p => !p.bourgTable);
    s.neighborhoodEncounter = null;
    if (wave.neighborhood && !s.practice) { this.beginNeighborhood(wave.neighborhood); return; }
    s.spawnQueue = [...wave.kinds]; s.spawnTimer = 1.6;
    if (s.spawnQueue.length) this.spawnEnemy(s.spawnQueue.shift());
    if (wave.boss) {
      const c = fighter(wave.bossKind || CHAPTERS[s.chapter].boss), b = BALANCE.bosses[c.id], hp = Math.round((c.id === 'karonux' ? b.carHp : b.hp) * (duo ? BALANCE.bossCombat.duoHp : 1));
      s.enemies.push({ ...this.actor(c.id, this.nextId++, true), boss: true, hp, maxHp: hp, power: b.power,
        routeBossScale: s.chapter===6 ? (c.id==='gustavax'?1:.6) : s.route ? (.8+.07*this.routeDepth())/(.8+.07*s.chapter) : 1, speed: 145 + this.routeDepth() * 7, reach: 115, value: 1800 + s.chapter * 300, x: 1010, y: 540,
        cooldown: 1.8, attackCount: 0, enraged: false, bossPhase: c.id === 'karonux' ? 0 : 1, vehicle: c.id === 'karonux', healUses: 0, summons: 0 });
      const boss=s.enemies[s.enemies.length-1]; boss.hp=Math.round(boss.hp*boss.routeBossScale); boss.maxHp=boss.hp; boss.power*=boss.routeBossScale;
      if(s.chapter===6&&c.id==='karonux'){boss.vehicle=false;boss.bossPhase=1;boss.hp=boss.maxHp=Math.round(b.hp*.6*(duo?BALANCE.bossCombat.duoHp:1));}
      this.event('boss', { name: c.name });
      this.startBossCinema(s.enemies[s.enemies.length - 1]);
    }
    s.phase = 'fight'; this.event('wave', { label: `VAGUE ${s.wave + 1}/${s.waves.length} · ${wave.label}` });
    this.neighborAssist();
  }

  spawnEnemy(kind, overrides = {}) {
    const s = this.state, c = ENEMIES[kind] || { hp: 30, speed: 170, power: 7, reach: 70, score: 50 }, mode = difficulty(s.difficulty);
    const hp = Math.round(c.hp * (1 + ((this.routeDepth() * 6 + s.stage) / 35) * 1) * (s.players.length > 1 ? BALANCE.enemy.duoHp : 1));
    // Every reinforcement starts inside the navigable floor, away from the closest player.
    const leftDistance = Math.min(...s.players.map(p => Math.abs(p.x - 85))), rightDistance = Math.min(...s.players.map(p => Math.abs(p.x - 1195)));
    const e = { ...this.actor(kind, this.nextId++, true), hp, maxHp: hp, power: c.power * (1 + ((this.routeDepth() * 6 + s.stage) / 35) * .7),
      speed: c.speed * mode.speed * (1 + ((this.routeDepth() * 6 + s.stage) / 35) * .35), reach: c.reach, value: c.score,
      x: leftDistance > rightDistance ? 85 : 1195, y: FLOOR.top + 20 + this.random() * 155, cooldown: 1.1, invincible: .35, attackCount: 0, ...overrides };
    s.enemies.push(e); this.initElite(e); this.event('spawn', { x: e.x, y: e.y, actor: e.id }); return e;
  }

  awardTalentMilestone(key) {
    for (const p of this.state.players) {
      const before = p.progression.milestones.length;
      applyProfile(p, awardTalent(p.progression, key));
      if (p.progression.milestones.length > before) this.event('talent', { actor: p.id, label: 'ÉTAPE FRANCHIE · +1 TALENT' });
    }
  }

  awardChapterTalent() {
    const s = this.state;
    for (const p of s.players) {
      const previous = p.progression.milestones.length, profile = s.route ? awardTalent({ ...p.progression, completed: [...p.progression.completed,s.chapter] }, `boss:${this.routeDepth()}`) : completeChapter(p.progression, s.chapter);
      applyProfile(p, profile);
      if (profile.milestones.length > previous) this.event('talent', { actor: p.id, x: p.x, y: p.y - 155, label: 'CHAPITRE TERMINÉ · +1 TALENT · PAUSE' });
    }
  }

  spendStat(slot, stat) {
    const s = this.state, p = s.players[slot];
    if (!p || (!s.paused && !['intro', 'rest', 'clear', 'badges', 'over', 'won'].includes(s.phase))) return false;
    const profile = spendPoint(p.progression, stat); if (!profile) return false;
    applyProfile(p, profile);
    if (profile.talents.some(id => id === stat && id.endsWith('_4'))) this.event('talent', { actor: p.id, label: 'ULTIME ACQUIS · CHOIX DÉFINITIF' });
    return true;
  }

  pause(value, reason = '') {
    this.state.paused = value;
    this.state.pauseReason = value ? reason : '';
  }

  step(inputs = [], dt = STEP) {
    const s = this.state;
    if (s.paused || s.phase === 'won' || s.phase === 'over') return;
    s.tick++; s.time += dt;
    s.events = s.events.filter(e => s.time - e.time < 2.5);
    if (s.phase === 'badges') {
      s.phaseTime=Math.max(0,s.phaseTime-dt);
      for(const [i,p] of s.players.entries()){const pressed=!!inputs[i]?.jump;if(!s.phaseTime&&pressed&&!p.routeHeld)this.confirmRoute(i);p.routeHeld=pressed;}
      return;
    }
    if (s.bossCinema) {
      const cinema = s.bossCinema, boss = s.enemies.find(e => e.id === cinema.actor && e.hp > 0);
      cinema.elapsed += dt;
      if (boss && !cinema.impact && cinema.elapsed >= (cinema.kind === 'arrival' ? 1.2 : .45)) {
        cinema.impact = true;
        this.event(cinema.kind === 'arrival' ? 'skid' : 'explosion', { x: cinema.x, y: cinema.y, facing: -1 });
      }
      if (boss && cinema.kind === 'arrival') boss.x = cinema.x + (1 - Math.min(1, cinema.elapsed / 1.2)) ** 3 * 500;
      if (!boss || cinema.elapsed >= cinema.duration) { s.bossCinema = null; if (boss) { boss.x = cinema.x; boss.cooldown = .65; } }
      if (boss) return;
    }
    s.comboTime -= dt;
    if (s.practice?.freeSpecial || s.sandbox?.freeSpecial) for (const p of s.players) { p.energy = 100; p.specialCd = 0; }
    if (s.comboTime <= 0) s.combo = 0;
    if (s.phase === 'intro') {
      if (hasChapterIntro(s)) {
        let advance = false;
        for (const [i, p] of s.players.entries()) {
          const input = inputs[i] || blankInput();
          const tapped = (input.taps?.jump || 0) > (p.taps.jump || 0);
          advance ||= tapped || !!input.jump && !this.introJumpHeld[i];
          this.introJumpHeld[i] = !!input.jump;
          p.taps = { ...input.taps };
        }
        if (advance && INTRO_DURATION - s.phaseTime > .35) {
          if (s.phaseTime > INTRO_DURATION - INTRO_REVEAL) s.phaseTime = INTRO_DURATION - INTRO_REVEAL;
          else s.phaseTime = 0;
        }
      }
      if(s.chapter===6&&s.stage===6&&s.phaseTime>=3.4&&s.phaseTime-dt<3.4)this.event('explosion',{x:640,y:410});
      s.phaseTime -= dt;
      if (s.phaseTime <= 0) this.spawnWave();
      return;
    }
    if (s.phase === 'transition') {
      s.phaseTime -= dt;
      if (s.phaseTime <= 0) {
        if (++s.stage > 5) {
          s.stage = 0; s.chapter++;
          if (s.chapter >= CHAPTERS.length) { s.chapter = CHAPTERS.length - 1; s.stage = 5; s.phase = 'won'; this.event('win'); return; }
          for (const p of s.players) { p.hp = Math.min(p.maxHp, Math.max(1, p.hp) + p.maxHp * .4); p.lives = Math.min(5, p.lives + 1); }
        }
        this.enterStreet();
      }
      return;
    }
    for (const [i, p] of s.players.entries()) this.updatePlayer(p, inputs[i] || blankInput(), dt);
    for (const e of s.enemies) this.updateEnemy(e, dt);
    this.updateWorld(dt);
    this.updateScenery(dt);
    if(s.chapter===6)this.updateFinalArena(dt);
    this.separateEnemies(dt);
    for (const actor of [...s.players, ...s.enemies]) this.physics(actor, dt);
    this.collectPickups();
    this.updateNeighborhood(dt);
    s.enemies = s.enemies.filter(e => e.hp > 0 || e.deadTime < 1.2);

    if (s.players.every(p => p.hp <= 0)) {
      s.allDown += dt;
      if (s.allDown > 2) {
        const p = s.players.find(p => p.lives > 0);
        if (p) { p.lives--; this.revivePlayer(p, .8); s.allDown = 0; }
        else { s.phase = 'over'; this.event('over'); }
      }
    } else s.allDown = 0;

    if (s.phase === 'fight' || s.phase === 'surprise' && s.surprise?.warning <= 0) {
      s.spawnTimer -= dt;
      if (s.spawnQueue.length && s.spawnTimer <= 0 && s.enemies.filter(alive).length < activeEnemyLimit(this.routeDepth(), s.players.length)) {
        this.spawnEnemy(s.spawnQueue.shift()); s.spawnTimer = 1.2 + this.random() * .7;
      }
    }
    if (s.phase === 'rest') { s.phaseTime -= dt; if (s.phaseTime <= 0) this.spawnWave(); }
    if (s.phase === 'fight' && s.players.some(alive) && !s.enemies.some(alive) && !s.allies.some(a=>a.recruit&&!a.permanent&&alive(a)) && !s.spawnQueue.length) {
      if (s.practice || s.sandbox?.mode === 'enemy') { s.phase = 'won'; s.hazards = []; return; }
      this.finishNeighborhoodWave();
      this.awardXP(120 + this.routeDepth() * 30, 'wave:' + s.chapter + ':' + s.stage + ':' + s.wave);
      s.hazards = s.hazards.filter(h => !h.enemy);
      if (s.wave < s.waves.length - 1) {
        s.phase = 'rest'; s.phaseTime = s.waves[s.wave + 1].rest;
        this.event('breather', { label: 'UNE SECONDE POUR SOUFFLER…' });
        for (const p of s.players) { if (p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + 7); }
      } else {
        if (!this.beginSurprise()) this.clearStreet();
      }
    }
    this.updateSurprise(dt);
    if (s.phase === 'clear' && s.players.filter(alive).every(p => p.x > 1135)) {
      s.phase = 'transition'; s.phaseTime = .65;
    }
  }

  tickActor(a, dt) {
    a.actionTime += dt; a.moving = false;
    for (const key of DECAY) if (a[key] > 0) a[key] = Math.max(0, a[key] - dt);
    if (a.hp <= 0) { a.deadTime += dt; a.action = 'dead'; return; }
    if (a.attack) {
      a.attack.elapsed += dt;
      if (!a.attack.hit && a.attack.elapsed >= a.attack.windup) {
        a.attack.hit = true;
        this.resolveAttack(a);
      }
      if (a.attack && a.attack.elapsed >= a.attack.duration) a.attack = null;
    }
    if (!a.attack && a.stun <= 0 && a.action !== 'dodge') a.action = a.z > 0 ? 'jump' : 'idle';
  }

  updatePlayer(p, input, dt) {
    if (p.caughtBy && this.updateKikorCaught(p, input, dt)) return;
    if (p.yanuFrozen && this.updateYanuFrozen(p, input, dt)) return;
    if (p.jualosSlip && this.updateJualosSlip(p, input, dt)) return;
    this.tickActor(p, dt);
    if (p.sticky) {
      const owner = this.state.enemies.find(e => e.id === p.sticky.owner && e.hp > 0);
      p.sticky.remaining -= dt;
      if (!owner || p.hp <= 0 || p.sticky.remaining <= 0) p.sticky = null;
      else { p.x = clamp(owner.x - owner.facing * 32, FLOOR.left, FLOOR.right); p.y = owner.y; p.vx = p.vy = 0; p.action = 'hurt'; return; }
    }
    p.seq = input.seq || 0;
    if (p.hp <= 0) {
      p.downTime += dt;
      if (p.downTime > 14 && p.lives > 0) { p.lives--; this.revivePlayer(p, .75); }
      return;
    }
    const pressed = {};
    const fresh = {};
    for (const action of ['grab', 'interact']) {
      fresh[action] = !!input[action] && !p[`${action}Held`] || (input.taps?.[action] || 0) > (p.taps[action] || 0);
      p[`${action}Held`] = !!input[action]; p.taps[action] = input.taps?.[action] || 0;
    }
    const dodgeTap = (input.taps?.dodge || 0) > (p.taps.dodge || 0);
    const dodgePressed = dodgeTap || input.dodge && !p.dodgeHeld;
    if (dodgePressed && this.rogueTrySwap(p)) { p.dodgeHeld = !!input.dodge; p.taps.dodge = input.taps?.dodge || 0; return; }
    if (dodgePressed) p.dodgeBuffer = BALANCE.dodge.buffer;
    p.dodgeHeld = !!input.dodge;
    for (const action of ['punch', 'kick', 'special', 'jump', 'dodge']) {
      pressed[action] = input[action] || (input.taps?.[action] || 0) > (p.taps[action] || 0);
      p.taps[action] = input.taps?.[action] || 0;
    }
    this.updateRoguePlayer(p, input, dt);
    if (p.rogueLastNap > 0 && !p.specialState) return;
    if (p.specialState) { const controlled=p.specialState.transformation||!p.specialState.free; this.updateSpecial(p,input,dt); if(controlled)return; }
    if (this.updateInteraction(p, pressed.punch && input.x * (p.grapple?.facing || p.facing) < -.35, dt, input)) return;
    if (p.stun > 0) return;
    if (p.action !== 'dodge' && !p.specialState) {
      if (fresh.interact && (this.interactNeighborhood(p) || this.pickWeapon(p))) return;
      if (!pressed.jump && !pressed.dodge && !pressed.special && !pressed.kick && this.tryGrab(p)) return;
    }
    if (this.sitOnSofa(p, input, dt)) return;
    if (p.action === 'dodge') {
      if (p.actionTime < BALANCE.dodge.duration) { p.vx = p.dodgeX * BALANCE.dodge.speedX; p.vy = p.dodgeY * BALANCE.dodge.speedY; return; }
      p.action = 'idle'; p.vx *= .3; p.vy *= .3;
    }
    if (p.dodgeBuffer > 0 && p.dodgeCd <= 0 && p.z === 0) {
      const length = Math.hypot(input.x, input.y) || 1;
      p.dodgeX = input.x || input.y ? input.x / length : p.facing;
      p.dodgeY = (input.y || 0) / length; p.action = 'dodge'; p.actionTime = 0; p.dodgeCd = BALANCE.dodge.cooldown * p.bonuses.dodge;
      p.invincible = Math.max(p.invincible, BALANCE.dodge.invincible); p.attack = null; p.dodgeBuffer = 0;
      p.vx = p.dodgeX * BALANCE.dodge.speedX; p.vy = p.dodgeY * BALANCE.dodge.speedY;
      this.rogueOnDodge(p);
      this.event('dodge', { actor: p.id, x: p.x, y: p.y, facing: Math.sign(p.dodgeX) || p.facing }); return;
    }
    if (pressed.jump && p.z === 0 && !p.attack) { p.vz = 490; p.z = .1; p.action = 'jump'; p.actionTime = 0; this.event('jump', { actor: p.id }); }
    if (!p.attack && p.cooldown <= 0) {
      if (pressed.special && !p.specialState && p.energy >= BALANCE.specials[p.kind].cost && p.specialCd <= 0) { this.activateSpecial(p); return; }
      else if (pressed.kick) this.startAttack(p, 'kick');
      else if (pressed.punch) this.startAttack(p, 'punch');
    }
    let move = p.rogueFortress > this.state.time ? .65 : p.attack ? .32 : 1;
    if (input.revive && p.z === 0 && !p.attack) {
      const down = this.state.players.find(other => other.id !== p.id && other.hp <= 0 && distance(p, other) < 105);
      if (down) {
        down.revive += dt; move = 0;
        if (down.revive >= 1.7) { this.revivePlayer(down, .55); this.state.score += 300; }
      }
    }
    const norm = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
    const speed = p.speed * this.stadiumSpeedMultiplier() * (p.buff > 0 ? 1.28 : 1);
    p.x += (input.x || 0) / norm * speed * move * dt;
    p.y += (input.y || 0) / norm * speed * .68 * move * dt;
    p.moving = !!(input.x || input.y) && move > 0;
    if (!p.attack && input.x) p.facing = Math.sign(input.x);
    if (p.moving && !p.attack && p.z === 0) p.action = 'walk';
  }

  startAttack(a, type) {
    const s = this.state;
    if (!a.enemy && type === 'punch' && this.throwSchoolBall(a)) return;
    if (!a.enemy && type === 'punch' && this.throwBourgBread(a)) return;
    if (!a.enemy && type === 'special') { this.activateSpecial(a); return; }
    if (!a.enemy) this.stadiumAction(type);
    if (!a.enemy && type === 'punch' && this.startWeaponAttack(a)) return;
    if (!a.enemy) {
      const near = s.enemies.filter(alive).filter(e => distance(a, e) < 180).sort((x, y) => distance(a, x) - distance(a, y))[0];
      if (near) a.facing = Math.sign(near.x - a.x) || a.facing;
      if (type === 'punch') { a.comboStep = a.comboWindow > 0 ? a.comboStep % 3 + 1 : 1; a.comboWindow = .95; }

    }
    a.action = type; a.actionTime = 0;
    const heavy = type === 'special' || type === 'kick' || a.comboStep === 3 || a.specialState?.kind === 'gustavax';
    const windup = a.enemy ? (type === 'special' ? .9 : .62) * difficulty(s.difficulty).telegraph : type === 'special' ? .2 : type === 'kick' ? .14 : .075;
    const duration = a.enemy ? windup + .38 : type === 'special' ? .7 : type === 'kick' ? .43 : a.comboStep === 3 ? .38 : .27;
    a.attack = { type, elapsed: 0, windup, duration, hit: false, heavy, air: a.z > 0 };
    a.cooldown = duration + (a.enemy ? .85 * difficulty(s.difficulty).recovery * (1 - this.routeDepth() * BALANCE.enemy.chapterRecovery) : .015);
    if (a.enemy && a.kind === 'triso' && type === 'special') {
      a.attack.windup = BALANCE.triso.windup * difficulty(s.difficulty).telegraph;
      a.attack.duration = a.attack.windup + .45; a.cooldown = a.attack.duration + BALANCE.triso.recovery * difficulty(s.difficulty).recovery;
    }
  }

  resolveAttack(a) {
    const s = this.state, attack = a.attack;
    if (!attack || a.hp <= 0) return;
    if (!a.enemy) { this.rogueOnAttack(a); this.hitStadiumBall(a, attack.type); }
    if (attack.type === 'weapon') { this.resolveWeaponAttack(a); return; }
    if (a.enemy && a.kind === 'triso' && attack.type === 'special') {
      const b = BALANCE.triso;
      if (s.hazards.filter(h => h.kind === 'slime').length < b.maxPuddles) {
        this.hazard(a, { kind: 'slime', x: a.spitTarget?.x ?? a.x + a.facing * 180, y: a.spitTarget?.y ?? a.y,
          radius: b.radius, verticalScale: 2.5, delay: b.flight, ttl: b.duration, pulse: b.pulse, damage: a.power * .65 });
        this.event('spit', { x: a.x, y: a.y - 95 });
      }
      return;
    }
    if (a.enemy && attack.type === 'special' && ['remy', 'makouille', 'orelsan', 'guylux', 'papy_jala', 'charlingals', 'kikor_e'].includes(a.kind)) {
      const style = a.kind === 'remy' ? 'scooter' : a.kind === 'makouille' ? 'motorcycle' : a.kind === 'orelsan' ? 'tennis' : a.kind === 'guylux' ? 'magic' : a.kind === 'papy_jala' ? 'pepper' : a.kind === 'charlingals' ? 'knife' : 'skateboard';
      if (style === 'scooter' || style === 'motorcycle') {
        a.vx = a.facing * (style === 'motorcycle' ? 760 : 690);
        this.hazard(a, { kind: 'impact', shape: 'line', width: style === 'motorcycle' ? 235 : 205, band: 50, delay: .06, ttl: .25, damage: a.power * 1.35, atlas: style, cell: 4 });
        this.event('skid', { actor: a.id, x: a.x, y: a.y });
      } else if (style === 'pepper') {
        this.hazard(a, { kind: 'pepper', shape: 'line', width: 285, band: 68, delay: .28, ttl: .28, damage: a.power * .35, stunDuration: .9, atlas: 'papy_jala', cell: 8 });
      } else if (style === 'tennis') {
        const angle = Math.atan2((a.targetY ?? a.y) - a.y, (a.targetX ?? a.x + a.facing * 480) - a.x);
        this.hazard(a, { kind: 'tennis', radius: 25, vx: Math.cos(angle) * 440, vy: Math.sin(angle) * 440, delay: .05, ttl: 3.2, damage: a.power * 1.15, atlas: 'orelsan', cell: 9 });
      } else if (style === 'magic') {
        for (let i = -1; i <= 1; i++) {
          const angle = Math.atan2((a.targetY ?? a.y) - a.y, (a.targetX ?? a.x + a.facing * 420) - a.x) + i * .16;
          this.hazard(a, { kind: 'magicCard', radius: 25, vx: Math.cos(angle) * 360, vy: Math.sin(angle) * 360, delay: (i + 1) * .12, ttl: 3, damage: a.power * .9, atlas: 'guylux', cell: 9 });
        }
      } else if (style === 'knife') {
        a.vx = a.facing * 620;
        this.hazard(a, { kind: 'knife', shape: 'line', width: 185, band: 43, delay: .08, ttl: .22, damage: a.power * 1.35, atlas: 'charlingals', cell: 4 });
        for (let i = -1; i <= 1; i++) this.hazard(a, { kind: 'bills', x: (a.targetX ?? a.x) + i * 88, y: (a.targetY ?? a.y) + (i % 2) * 28, radius: 58, delay: .42 + Math.abs(i) * .14, ttl: .35, damage: a.power * .55, atlas: 'charlingals', cell: 8 });
      } else if (style === 'skateboard') {
        for (let i = -1; i <= 1; i++) {
          const angle = Math.atan2((a.targetY ?? a.y) - a.y, (a.targetX ?? a.x + a.facing * 400) - a.x) + i * .13;
          this.hazard(a, { kind: 'pencil', radius: 20, vx: Math.cos(angle) * 380, vy: Math.sin(angle) * 380, delay: (i + 1) * .1, ttl: 2.8, damage: a.power * .85, atlas: 'kikor_e', cell: 5 });
        }
      }
      return;
    }
    const type = attack.type, special = type === 'special', technique = a.enemy ? 'blast' : fighter(a.kind).technique;
    const wrestling = !a.enemy && a.specialState?.kind === 'gustavax';
    const radial = attack.rogueRadial || special && ['blast', 'spin', 'frenzy'].includes(technique) || wrestling && type === 'kick';
    let range = a.enemy ? (special ? 195 : a.reach) : type === 'punch' ? 108 : type === 'kick' ? 145 : radial ? 235 : technique === 'gun' ? 680 : 310;
    if (wrestling) range = type === 'kick' ? BALANCE.wrestler.radius * a.bonuses.radius : 145;
    if (!a.enemy && type === 'punch' && hasTalent(a, 'Main baladeuse')) range += 40;
    if (attack.rogueRange) range = attack.rogueRange;
    const band = attack.rogueBand || (wrestling && type === 'kick' ? 95 : a.enemy ? (special ? 115 : 48) : (special ? 95 : attack.air ? 68 : 54));
    const damage = Math.round((wrestling ? a.specialPower : a.power) * (special ? (a.enemy ? 1.35 : 2.5) : type === 'kick' ? 1.5 : a.comboStep === 3 ? 1.4 : 1) * (a.buff > 0 ? 1.2 : 1) * (attack.air ? 1.2 : 1));
    let hits = 0;
    for (const target of a.enemy ? s.players : s.enemies) {
      if (target.hp <= 0 || target.invincible > 0 || (a.enemy && target.z > 28)) continue;
      const dx = target.x - a.x, dy = target.y - a.y;
      if (Math.abs(dx) > range || Math.abs(dy) > band || (!radial && dx * a.facing < -28)) continue;
      if (radial && Math.hypot(dx, dy * 1.35) > range) continue;
      this.damage(target, damage, a, attack.heavy, true); hits++;
    }
    if (a.enemy) for (const prop of s.props) {
      if (prop.bourgTable && prop.hp > 0 && Math.abs(prop.x-a.x) <= range && Math.abs(prop.y-a.y) <= band && (radial || (prop.x-a.x)*a.facing >= -28)) this.hitProp(prop, attack.heavy ? 2 : 1, a);
    }
    if (!a.enemy) {
      for (const prop of s.props) {
        if (prop.kind === 'easel' && !prop.enemy) continue;
        if (prop.hp <= 0 || Math.abs(prop.x - a.x) > range + (prop.halfWidth || 0) || Math.abs(prop.y - a.y) > band || (!radial && (prop.x - a.x) * a.facing < -28 - (prop.halfWidth || 0))) continue;
        this.hitProp(prop, attack.heavy ? 2 : 1, a);
      }
      if (special && ['charge', 'roll'].includes(technique)) a.vx = a.facing * 600;
      if (hits) { s.combo += hits; s.comboTime = 2.2; s.bestCombo = Math.max(s.bestCombo, s.combo); }
    }
    this.event('swing', { actor: a.id, x: a.x, y: a.y - 60 - a.z, facing: a.facing, heavy: attack.heavy, special, enemy: a.enemy });
  }

  damage(target, amount, source, heavy, chargeEnergy = false) {
    const s = this.state;
    if (target.hp <= 0) return;
    if(target.gustavaxMinion){if(!source?.enemy||s.bossCinema)return;target.hp=Math.max(0,target.hp-amount);target.flash=.15;if(target.hp<=0)target.ttl=0;this.event('impact',{x:target.x,y:target.y-65});return;}
    if (amount > 0 && this.bourgCover(target, source, heavy)) return;
    if ((s.practice?.invulnerable || s.sandbox?.invulnerable) && !target.enemy) return;
    if (s.bossCinema) return;
    if (this.jualosChanging(target)) return;
    if (this.joChanneling(target)) {
      target.shieldFlash = .15;
      return;
    }
    // A partner can knock Kikor off the victim even while the painting protects his HP.
    if (target.kikorGrip && heavy && source?.id !== target.kikorGrip.victim && !source?.enemy) this.releaseKikorGrip(target, 'SAUVÉ PAR TON POTE !');
    if (this.kikorShielded(target)) {
      target.shieldFlash = .18;
      if (s.time >= (target.shieldHintAt || 0)) { target.shieldHintAt = s.time + 1.5; this.event('opening', { x: target.x, y: target.y - 225, label: 'DÉTRUIS LE BONHOMME VERT !' }); }
      return;
    }
    if (!target.enemy) amount = Math.max(1, Math.round(amount * difficulty(s.difficulty).damage * (1 - target.bonuses.defense)));
    amount = Math.round(this.rogueBeforeDamage(target, amount, source, heavy));
    if (amount <= 0) return;
    if (this.damageJoPallet(target, amount, heavy)) return;
    if (this.lorenzoSofaDamage(target, amount, source, heavy)) return;
    if (target.boss && (target.recovering > 0 || target.pattern?.kind === 'sleep' && target.pattern.hit)) amount = Math.round(amount * 1.25);
    this.bossComboHit(target, heavy);
    if (target.pattern?.healing) { target.pattern = null; target.cooldown = 1.1; target.recovering = 1.1; this.event('opening', { x: target.x, y: target.y - 160, label: 'RÉCUPÉRATION INTERROMPUE !' }); }
    if(target.boss&&target.kind==='gustavax'&&target.bossPhase<3)amount=Math.min(amount,Math.max(0,target.hp-target.maxHp*(target.bossPhase===1?.65:.3)));
    if (target.boss && target.kind === 'lorenzo' && !target.sofa && !target.sofaBroken) amount = Math.min(amount, Math.max(0, target.hp - target.maxHp * BALANCE.bosses.lorenzo.phases[0]));
    if (target.boss && target.kind === 'jualos' && !target.commercial) amount = Math.min(amount, Math.max(0, target.hp - target.maxHp * BALANCE.bosses.jualos.phases[0]));
    if (amount > 0 && chargeEnergy && source?.progression && !source.enemy && !source.ally && !source.specialState && !this.rogueDepth) source.energy = Math.min(100, source.energy + BALANCE.energy.perHit);
    if (!target.enemy) this.dropStadiumBaton(target);
    if (target.enemy && amount > 0 && source?.specialState && !source.enemy) this.schoolSpecialHit(source, target);
    amount=this.kikorProtect(target,amount);
    target.hp = Math.max(0, target.hp - amount); target.flash = .12;
    if (target.boss && target.kind === 'lorenzo' && !target.sofa && !target.sofaBroken && target.hp <= target.maxHp * BALANCE.bosses.lorenzo.phases[0]) this.beginLorenzoSofa(target);
    if (target.boss && target.kind === 'jualos' && !target.commercial && target.hp <= target.maxHp * BALANCE.bosses.jualos.phases[0]) this.beginJualosCommercial(target);
    if (!target.enemy) { this.releaseGrab(target); target.interaction = null; }
    if (target.elite) this.eliteHit(target, heavy);
    if (STREET_ENEMIES[target.kind]) {
      if (target.hp <= 0) s.hazards = s.hazards.filter(h => h.owner !== target.id);
      if (heavy && target.pattern && !target.pattern.hit) { target.pattern = null; target.cooldown = .8; target.recovering = .8; }
    }
    const preservedAttack = target.rogueArmor ? { attack:target.attack, action:target.action, comboStep:target.comboStep } : null;
    target.stun = (target.boss ? .09 : heavy ? .34 : .23) * (target.enemy ? 1 : target.bonuses.stagger);
    // Boss wind-ups remain readable and cannot be stun-locked indefinitely.
    if (!target.boss || !target.attack) { target.attack = null; target.action = 'hurt'; target.actionTime = 0; }
    target.vx = (Math.sign(target.x - source.x) || source.facing) * (target.boss ? 65 : heavy ? 340 : 110);
    if (!target.enemy) { target.sitting = null; target.seatHold = 0; target.invincible = .65; target.comboStep = 0; s.combo = 0; }
    if (preservedAttack) { Object.assign(target, preservedAttack); target.stun = 0; target.vx = 0; }
    this.event('hit', { x: target.x, y: target.y - 72 - target.z, amount, heavy, enemy: target.enemy, actor: target.id });
    if (target.hp <= 0) {
      if (target.vehicle) {
        target.vehicle = false; target.maxHp = Math.round(BALANCE.bosses.karonux.hp * (target.routeBossScale || 1) * (s.players.length > 1 ? BALANCE.bossCombat.duoHp : 1)); target.hp = target.maxHp;
        target.pattern = null; target.cooldown = 2; target.invincible = 1.3; target.bossPhase = 1;
        target.attackCount = 0; target.guardHits = 0; target.stun = 0; target.recovering = 0;
        this.startBossCinema(target, 'exit');
        this.event('rage', { actor: target.id, label: 'GOLF DÉTRUITE · KARONUX SORT !' });
        this.hazard(target, { kind: 'wreck', damage: 0, radius: 100, delay: 0, ttl: 1.1 }); return;
      }
      target.attack = null; target.action = 'dead'; target.actionTime = 0; target.deadTime = 0; target.downTime = 0; target.revive = 0;
      this.endSpecial(target); target.pattern = null;
      this.releaseYanuFreeze(target.id); target.yanuFrozen = null;
      this.releaseJualosSlips(target.id); target.jualosSlip = null;
      if (target.kikorGrip) this.releaseKikorGrip(target);
      if (target.caughtBy) this.releaseKikorGrip(s.enemies.find(e => e.id === target.caughtBy));
      if (!target.enemy) this.dropWeapon(target);
      if (!target.enemy) this.clearRogueTransient(target);
      if (target.grabbedBy) { const holder = s.players.find(p => p.id === target.grabbedBy); if (holder) this.releaseGrab(holder); }
      this.event('ko', { x: target.x, y: target.y, actor: target.id, enemy: target.enemy, boss: target.boss });
      if (target.enemy) {
        this.rogueOnKill(source, target);
        this.yanuTransformationKill(source);
        this.kikorParticipationKill(source,target);
        if (!target.owner && !source?.ally) this.awardXP(target.boss ? 600 : 20 + this.routeDepth() * 3, 'enemy:' + target.id);
        s.kills++; s.score += target.value + Math.min(10, Math.floor(s.combo / 3)) * 20;
        if (target.boss) { s.hazards = s.hazards.filter(h => h.owner !== target.id); for (const e of s.enemies) if (e.owner === target.id) { e.hp = 0; e.deadTime = 0; } }
        const lootRoll = this.random();
        const lootKind = lootRoll < BALANCE.scenery.enemyFoodChance ? 'food'
          : lootRoll < BALANCE.scenery.enemyFoodChance + BALANCE.scenery.enemyEnergyChance ? 'energy' : null;
        if (lootKind) s.pickups.push({ id: this.nextId++, x: target.x, y: target.y, kind: lootKind });
      }
    }
    if (target.enemy) this.rogueOnHit(source, target, heavy);
  }

  updateEnemy(e, dt) {
    if (this.updateGustavaxEnemy(e, dt)) return;
    if (this.updateJoCargo(e, dt)) return;
    if (this.updateYanuRoots(e, dt)) return;
    if (this.updateLorenzoEnemy(e, dt)) return;
    if (this.updateJualosRecruitTarget(e, dt)) return;
    const speed = e.speed;
    if (e.hp > 0 && e.karonuxFrost?.frozenUntil > this.state.time) {
      e.attack = null; this.tickActor(e, dt); e.vx = e.vy = 0; return;
    }
    if (e.karonuxFrost?.until > this.state.time) e.speed *= .55;
    if (e.rogueSlow > 0) e.speed *= .55;
    if (e.kikorPaintUntil > this.state.time) e.speed *= .5;
    try { this.updateEnemyAction(e, dt); } finally { e.speed = speed; }
  }

  updateEnemyAction(e, dt) {
    if (e.joPallet) { this.updateJoPallet(e, dt); return; }
    if (this.updateNeighborhoodEnemy(e, dt)) return;
    if (this.updateThrown(e, dt)) return;
    this.tickActor(e, dt);
    if (this.updateTactics(e, dt)) return;
    if (e.elite) { this.updateElite(e, dt); return; }
    if (STREET_ENEMIES[e.kind]) {
      e.eliteState ||= { sequence: 0 };
      const target = this.state.players.filter(p => p.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
      if (target) this.updateStreetEnemy(e, target, dt);
      return;
    }
    if (e.hp > 0 && e.boss) { this.updateBoss(e, dt); return; }
    if (e.hp <= 0 || e.attack || e.stun > 0 || !['fight', 'surprise'].includes(this.state.phase)) return;
    if (e.boss && e.hp < e.maxHp * .4 && !e.enraged) { e.enraged = true; e.speed *= 1.25; this.event('rage', { actor: e.id, label: `${fighter(e.kind).name} s’énerve !` }); }
    const targets = this.state.players.filter(p=>alive(p)&&!p.joInvisible);
    if (!targets.length) return;
    const target = targets.length === 1 ? targets[0] : targets[e.id % targets.length];
    const dx = target.x - e.x, dy = target.y - e.y;
    e.targetX = target.x; e.targetY = target.y;
    e.facing = Math.sign(dx) || e.facing;
    const attacking = this.state.enemies.filter(other => other.hp > 0 && (other.pattern || other.attack && !other.attack.hit)).length;
    const limit = targets.length === 2 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo;
    if (e.kind === 'triso' && Math.abs(dx) < BALANCE.triso.range && Math.abs(dy) < 100 && e.cooldown <= 0 && attacking < limit && this.state.hazards.filter(h => h.kind === 'slime').length < BALANCE.triso.maxPuddles) {
      e.spitTarget = { x: target.x, y: target.y }; this.startAttack(e, 'special'); return;
    }
    if (!e.joDisarmed && ['guylux', 'orelsan', 'papy_jala', 'charlingals', 'kikor_e'].includes(e.kind) && Math.abs(dx) >= e.reach - 12 && Math.abs(dx) < (e.kind === 'orelsan' ? 620 : 500) && Math.abs(dy) < 70 && e.cooldown <= 0 && attacking < limit) { this.startAttack(e, 'special'); return; }
    if (['remy', 'makouille'].includes(e.kind) && Math.abs(dx) < 430 && Math.abs(dy) < 75 && e.cooldown <= 0 && attacking < limit && e.attackCount % 3 === 2) { e.attackCount++; this.startAttack(e, 'special'); return; }
    if (Math.abs(dx) < e.reach - 12 && Math.abs(dy) < 38 && e.cooldown <= 0 && attacking < limit) {
      if (e.boss) e.attackCount++;
      e.attackCount++; this.startAttack(e, 'punch');
      return;
    }
    const flanking = e.kind === 'orelsan' && this.routeDepth() > 0;
    const side = flanking ? (e.id % 2 ? -1 : 1) : (e.x < target.x ? -1 : 1);
    const desiredX = clamp(target.x + side * (e.kind === 'triso' ? BALANCE.triso.distance : e.kind === 'guylux' ? 290 : e.reach - 23), FLOOR.left, FLOOR.right);
    const length = Math.max(1, Math.hypot(desiredX - e.x, dy * 1.5));
    if (Math.abs(desiredX - e.x) > 5 || Math.abs(dy) > 9) {
      e.x += (desiredX - e.x) / length * e.speed * dt;
      e.y += dy / length * e.speed * .9 * dt;
      e.action = 'walk'; e.moving = true;
    }
  }

  separateEnemies(dt) {
    const enemies = this.state.enemies.filter(e => alive(e) && !e.joPallet && !e.grabbedBy && !e.thrown && !e.gustavaxGrip && !e.lorenzoCarry && !e.joCargo);
    for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i], b = enemies[j], dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.hypot(dx, dy * 1.4);
      if (d >= 42) continue;
      const push = (42 - d) * dt * 2;
      const nx = d > .1 ? dx / d : 1, ny = d > .1 ? dy / d : 1;
      if (!a.attack) { a.x += nx * push; a.y += ny * push; }
      if (!b.attack) { b.x -= nx * push; b.y -= ny * push; }
    }
  }

  physics(a, dt) {
    if (a.gustavaxGrip || a.lorenzoCarry || a.joCargo || a.yanuRoots?.until > this.state.time || a.specialState?.transformation && ['lorenzo','jualos','yanu','jo','kikor','gustavax'].includes(a.kind)) return;
    if (a.joPallet || a.grabbedBy || a.thrown || a.caughtBy || a.kikorGrip || a.yanuFrozen || a.jualosSlip || a.sofa && !a.sofaBroken) return;
    a.x = clamp(a.x + a.vx * dt, FLOOR.left, FLOOR.right);
    a.y = clamp(a.y + a.vy * dt, FLOOR.top, FLOOR.bottom);
    a.vx *= Math.exp(-9 * dt); a.vy *= Math.exp(-9 * dt);
    if (a.z > 0 || a.vz > 0) { a.z += a.vz * dt; a.vz -= 1350 * dt; if (a.z <= 0) { a.z = 0; a.vz = 0; } }
  }

  collectPickups() {
    const s = this.state;
    s.pickups = s.pickups.filter(item => {
      if (item.kind === 'weapon') return true;
      const player = s.players.find(p => alive(p) && p.z < 20 && distance(p, item) < 42 && (item.kind === 'food' ? p.hp < p.maxHp || hasTalent(p, 'Deuxième service') : p.energy < 100));
      if (!player) return true;
      const before = item.kind === 'food' ? player.hp : player.energy;
      if (item.kind === 'food' && hasTalent(player, 'Deuxième service')) { player.rogueDouble = true; this.rogueFX(player, 'DOUBLE FRAPPE PRÊTE', 90); }
      if (item.kind === 'food') player.hp = Math.min(player.maxHp, player.hp + (item.amount ?? BALANCE.scenery.food) + player.bonuses.food);
      else if (item.kind === 'energy') player.energy = Math.min(100, player.energy + (item.amount ?? BALANCE.scenery.energy));

      const amount = Math.round((item.kind === 'food' ? player.hp : player.energy) - before);
      s.score += 25; this.event('pickup', { x: item.x, y: item.y - 45, kind: item.kind, actor: player.id, amount }); return false;
    });
  }

  revivePlayer(p, fraction) {
    p.jualosSlip = null;
    this.releaseGrab(p); p.interaction = null;
    this.endSpecial(p);
    p.hp = Math.round(p.maxHp * fraction); p.invincible = 2.5; p.stun = 0; p.attack = null;
    p.downTime = 0; p.deadTime = 0; p.revive = 0; p.action = 'idle'; p.actionTime = 0; p.vx = 0;
    this.event('revive', { actor: p.id, x: p.x, y: p.y });
  }

  snapshot() { return JSON.parse(JSON.stringify({ ...this.state, rngSeed: this.seed, nextEntityId: this.nextId })); }
}
Object.assign(Simulation.prototype, finalArena, combat, karonuxCombat, kikorCombat, yanuCombat, lorenzoCombat, joCombat, jualosCombat, streetEvents, elites, interactionCombat, enemyTactics, rogueRun, rogueCombat, streetEnemies, neighborhoodEvents, estateEvents, stadiumEvents, bourgEvents, lateEvents, campaignRoute);
