import { FIGHTERS, CHAPTERS, ENEMIES, FLOOR, STEP, fighter, clamp, blankInput } from './data.js';
import { BALANCE, difficulty } from './balance.js';
import { applyProfile, gainXp, spendPoint } from './progression.js';
import { wavePlan } from './encounters.js';
import { combat } from './combat.js';

const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.5);
const alive = a => a.hp > 0;
const DECAY = ['cooldown', 'stun', 'invincible', 'dodgeCd', 'buff', 'flash', 'comboWindow', 'specialCd', 'recovering'];

/** Browser and server run the same fixed-step simulation. Rendering never deals damage. */
export class Simulation {
  constructor(characters = ['karonux'], chapter = 0, seed = Date.now(), options = {}) {
    this.seed = seed >>> 0;
    this.nextId = 10;
    this.state = {
      tick: 0, time: 0, chapter: clamp(Math.floor(chapter), 0, CHAPTERS.length - 1), stage: 0,
      phase: 'intro', phaseTime: 2.4, paused: false, pauseReason: '',
      players: characters.slice(0, 2).map((id, i) => this.makePlayer(id, i)), enemies: [], props: [], pickups: [], events: [],
      eventSeq: 0, score: 0, kills: 0, combo: 0, comboTime: 0, bestCombo: 0, allDown: 0,
      difficulty: ['easy', 'normal', 'hard'].includes(options.difficulty) ? options.difficulty : 'normal',
      hazards: [], allies: [], wave: -1, waves: [], spawnQueue: [], spawnTimer: 0,
    };
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
      x: 245 + index * 95, y: 538 + index * 48, energy: 100, lives: 2, dodgeCd: 0, buff: 0,
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
    s.enemies = []; s.pickups = []; s.combo = 0; s.comboTime = 0;
    s.hazards = []; s.allies = []; s.wave = -1; s.spawnQueue = []; s.spawnTimer = 0;
    s.waves = wavePlan(s.chapter, s.stage, s.players.length, s.difficulty);
    s.props = [0, 1].map((_, i) => ({ id: this.nextId++, x: 570 + i * 405, y: i ? 624 : 468, hp: 2,
      kind: i ? 'barrel' : 'crate', drop: (s.stage + i) % 2 ? 'energy' : 'food' }));
    for (const [i, p] of s.players.entries()) {
      p.x = 200 + i * 95; p.y = 535 + i * 55; p.z = 0; p.vz = 0; p.vx = 0; p.vy = 0;
      p.attack = null; p.stun = 0; p.invincible = 1.8; p.facing = 1; p.action = 'idle'; p.moving = false;
      p.specialState = null;
      if (p.hp <= 0) this.revivePlayer(p, .45);
    }
    s.phase = 'intro'; s.phaseTime = s.stage === 0 ? 2.4 : 1.15;
    this.event('street', { chapter: s.chapter, stage: s.stage });
  }

  spawnWave() {
    const s = this.state, duo = s.players.length === 2, wave = s.waves[++s.wave];
    if (!wave) return;
    s.spawnQueue = [...wave.kinds]; s.spawnTimer = 0;
    if (s.spawnQueue.length) this.spawnEnemy(s.spawnQueue.shift());
    if (wave.boss) {
      const c = fighter(CHAPTERS[s.chapter].boss), b = BALANCE.bosses[c.id], hp = Math.round((c.id === 'karonux' ? b.carHp : b.hp) * (duo ? BALANCE.bossCombat.duoHp : 1));
      s.enemies.push({ ...this.actor(c.id, this.nextId++, true), boss: true, hp, maxHp: hp, power: b.power,
        speed: 145 + s.chapter * 7, reach: 115, value: 1800 + s.chapter * 300, x: 1010, y: 540,
        cooldown: 1.8, attackCount: 0, enraged: false, bossPhase: c.id === 'karonux' ? 0 : 1, vehicle: c.id === 'karonux', healUses: 0, summons: 0 });
      this.event('boss', { name: c.name });
    }
    s.phase = 'fight'; this.event('wave', { label: `VAGUE ${s.wave + 1}/${s.waves.length} · ${wave.label}` });
  }

  spawnEnemy(kind, overrides = {}) {
    const s = this.state, c = ENEMIES[kind] || { hp: 30, speed: 170, power: 7, reach: 70, score: 50 }, mode = difficulty(s.difficulty);
    const hp = Math.round(c.hp * (1 + s.chapter * BALANCE.enemy.chapterHp) * (s.players.length > 1 ? BALANCE.enemy.duoHp : 1));
    // Every reinforcement starts inside the navigable floor, away from the closest player.
    const leftDistance = Math.min(...s.players.map(p => Math.abs(p.x - 85))), rightDistance = Math.min(...s.players.map(p => Math.abs(p.x - 1195)));
    const e = { ...this.actor(kind, this.nextId++, true), hp, maxHp: hp, power: c.power + s.chapter * .6,
      speed: c.speed * mode.speed * (1 + s.chapter * BALANCE.enemy.chapterSpeed), reach: c.reach, value: c.score,
      x: leftDistance > rightDistance ? 85 : 1195, y: FLOOR.top + 20 + this.random() * 155, cooldown: 1.1, invincible: .35, attackCount: 0, ...overrides };
    s.enemies.push(e); this.event('spawn', { x: e.x, y: e.y, actor: e.id }); return e;
  }

  awardXp(amount) {
    const s = this.state, reward = Math.round(amount * difficulty(s.difficulty).xp);
    for (const p of s.players) {
      const previous = p.progression.level, profile = gainXp(p.progression, reward);
      const gained = profile.totalXp - p.progression.totalXp;
      applyProfile(p, profile);
      if (gained > 0) this.event('xp', { actor: p.id, x: p.x, y: p.y - 130, amount: gained });
      if (profile.level > previous) this.event('levelup', { actor: p.id, x: p.x, y: p.y - 155, level: profile.level, points: profile.points, pointsGained: (profile.level - previous) * BALANCE.rpg.pointsPerLevel });
    }
  }

  spendStat(slot, stat) {
    const s = this.state, p = s.players[slot];
    if (!p || (!s.paused && !['intro', 'rest', 'clear', 'over', 'won'].includes(s.phase))) return false;
    const profile = spendPoint(p.progression, stat); if (!profile) return false;
    applyProfile(p, profile); return true;
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
    s.comboTime -= dt;
    if (s.comboTime <= 0) s.combo = 0;
    if (s.phase === 'intro') {
      s.phaseTime -= dt;
      if (s.phaseTime <= 0) this.spawnWave();
      return;
    }
    if (s.phase === 'transition') {
      s.phaseTime -= dt;
      if (s.phaseTime <= 0) {
        if (++s.stage > 5) {
          this.awardXp(BALANCE.xp.chapter);
          s.stage = 0; s.chapter++;
          if (s.chapter >= CHAPTERS.length) { s.chapter = CHAPTERS.length - 1; s.stage = 5; s.phase = 'won'; this.event('win'); return; }
          for (const p of s.players) { p.hp = Math.min(p.maxHp, Math.max(1, p.hp) + p.maxHp * .4); p.lives = Math.min(3, p.lives + 1); p.energy = 100; }
        }
        this.enterStreet();
      }
      return;
    }
    for (const [i, p] of s.players.entries()) this.updatePlayer(p, inputs[i] || blankInput(), dt);
    for (const e of s.enemies) this.updateEnemy(e, dt);
    this.updateWorld(dt);
    this.separateEnemies(dt);
    for (const actor of [...s.players, ...s.enemies]) this.physics(actor, dt);
    this.collectPickups();
    s.enemies = s.enemies.filter(e => e.hp > 0 || e.deadTime < 1.2);

    if (s.players.every(p => p.hp <= 0)) {
      s.allDown += dt;
      if (s.allDown > 2) {
        const p = s.players.find(p => p.lives > 0);
        if (p) { p.lives--; this.revivePlayer(p, .8); s.allDown = 0; }
        else { s.phase = 'over'; this.event('over'); }
      }
    } else s.allDown = 0;

    if (s.phase === 'fight') {
      s.spawnTimer -= dt;
      if (s.spawnQueue.length && s.spawnTimer <= 0 && s.enemies.filter(alive).length < (s.players.length > 1 ? BALANCE.waves.activeDuo : BALANCE.waves.activeSolo)) {
        this.spawnEnemy(s.spawnQueue.shift()); s.spawnTimer = BALANCE.waves.spawnDelay;
      }
    }
    if (s.phase === 'rest') { s.phaseTime -= dt; if (s.phaseTime <= 0) this.spawnWave(); }
    if (s.phase === 'fight' && !s.enemies.some(alive) && !s.spawnQueue.length) {
      this.awardXp(BALANCE.xp.wave); s.hazards = s.hazards.filter(h => !h.enemy);
      if (s.wave < s.waves.length - 1) {
        s.phase = 'rest'; s.phaseTime = s.waves[s.wave + 1].rest;
        this.event('breather', { label: 'UNE SECONDE POUR SOUFFLER…' });
        for (const p of s.players) { p.energy = Math.min(100, p.energy + 12); if (p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + 7); }
        if (s.phaseTime >= BALANCE.waves.calmRest) s.pickups.push({ id: this.nextId++, x: 640, y: 550, kind: 'food' });
      } else {
      s.phase = 'clear'; this.event('clear'); s.score += 250; this.awardXp(BALANCE.xp.street);
      // A cleared street is a safe place to bring the teammate back.
      for (const p of s.players) if (p.hp <= 0) this.revivePlayer(p, .4);
      if (!s.pickups.some(p => p.kind === 'food')) s.pickups.push({ id: this.nextId++, x: 1060, y: 545, kind: 'food' });
      }
    }
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
    this.tickActor(p, dt);
    p.seq = input.seq || 0;
    if (p.hp <= 0) {
      p.downTime += dt;
      if (p.downTime > 14 && p.lives > 0) { p.lives--; this.revivePlayer(p, .75); }
      return;
    }
    p.energy = Math.min(100, p.energy + dt * (p.buff > 0 ? 2 : 3.5));
    const pressed = {};
    for (const action of ['punch', 'kick', 'special', 'jump', 'dodge']) {
      pressed[action] = input[action] || (input.taps?.[action] || 0) > (p.taps[action] || 0);
      p.taps[action] = input.taps?.[action] || 0;
    }
    if (p.specialState) { this.updateSpecial(p, input, dt); return; }
    if (p.stun > 0) return;
    if (p.action === 'dodge') {
      if (p.actionTime < .3) { p.vx = p.dodgeX * 640; p.vy = p.dodgeY * 440; return; }
      p.action = 'idle'; p.vx *= .3; p.vy *= .3;
    }
    if (pressed.dodge && p.dodgeCd <= 0 && p.z === 0) {
      const length = Math.hypot(input.x, input.y) || 1;
      p.dodgeX = input.x || input.y ? input.x / length : p.facing;
      p.dodgeY = input.y / length; p.action = 'dodge'; p.actionTime = 0; p.dodgeCd = 1.05; p.invincible = .35; p.attack = null;
      this.event('dodge', { actor: p.id }); return;
    }
    if (pressed.jump && p.z === 0 && !p.attack) { p.vz = 490; p.z = .1; p.action = 'jump'; p.actionTime = 0; this.event('jump', { actor: p.id }); }
    if (!p.attack && p.cooldown <= 0) {
      if (pressed.special && p.energy >= BALANCE.specials[p.kind].cost && p.specialCd <= 0) { this.activateSpecial(p); return; }
      else if (pressed.kick) this.startAttack(p, 'kick');
      else if (pressed.punch) this.startAttack(p, 'punch');
    }
    let move = p.attack ? .32 : 1;
    if (input.revive && p.z === 0 && !p.attack) {
      const down = this.state.players.find(other => other.id !== p.id && other.hp <= 0 && distance(p, other) < 105);
      if (down) {
        down.revive += dt; move = 0;
        if (down.revive >= 1.7) { this.revivePlayer(down, .55); this.state.score += 300; }
      }
    }
    const norm = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
    const speed = p.speed * (p.buff > 0 ? 1.28 : 1);
    p.x += (input.x || 0) / norm * speed * move * dt;
    p.y += (input.y || 0) / norm * speed * .68 * move * dt;
    p.moving = !!(input.x || input.y) && move > 0;
    if (!p.attack && input.x) p.facing = Math.sign(input.x);
    if (p.moving && !p.attack && p.z === 0) p.action = 'walk';
  }

  startAttack(a, type) {
    const s = this.state;
    if (!a.enemy && type === 'special') { this.activateSpecial(a); return; }
    if (!a.enemy) {
      const near = s.enemies.filter(alive).filter(e => distance(a, e) < 180).sort((x, y) => distance(a, x) - distance(a, y))[0];
      if (near) a.facing = Math.sign(near.x - a.x) || a.facing;
      if (type === 'punch') { a.comboStep = a.comboWindow > 0 ? a.comboStep % 3 + 1 : 1; a.comboWindow = .95; }
      if (type === 'special') {
        a.energy -= 50; a.invincible = .85;
        const technique = fighter(a.kind).technique;
        if (technique === 'frenzy') a.buff = 6;
        if (technique === 'blast') a.hp = Math.min(a.maxHp, a.hp + 12);
        this.event('special', { actor: a.id, kind: technique, label: fighter(a.kind).special, x: a.x, y: a.y, facing: a.facing });
      }
    }
    a.action = type; a.actionTime = 0;
    const heavy = type === 'special' || type === 'kick' || a.comboStep === 3;
    const windup = a.enemy ? (type === 'special' ? .9 : .62) * difficulty(s.difficulty).telegraph : type === 'special' ? .2 : type === 'kick' ? .14 : .075;
    const duration = a.enemy ? windup + .38 : type === 'special' ? .7 : type === 'kick' ? .43 : a.comboStep === 3 ? .38 : .27;
    a.attack = { type, elapsed: 0, windup, duration, hit: false, heavy, air: a.z > 0 };
    a.cooldown = duration + (a.enemy ? .85 * difficulty(s.difficulty).recovery * (1 - s.chapter * BALANCE.enemy.chapterRecovery) : .015);
  }

  resolveAttack(a) {
    const s = this.state, attack = a.attack;
    if (!attack || a.hp <= 0) return;
    if (a.enemy && attack.type === 'special' && ['guylux', 'papy_jala', 'charlingals'].includes(a.kind)) {
      if (a.kind === 'guylux') this.hazard(a, { kind: 'card', radius: 26, vx: a.facing * 390, delay: 0, ttl: 3, damage: a.power });
      if (a.kind === 'papy_jala') this.hazard(a, { kind: 'smoke', radius: 100, delay: .3, ttl: 2.2, damage: a.power * .6 });
      if (a.kind === 'charlingals') { a.vx = a.facing * 850; this.hazard(a, { kind: 'impact', shape: 'line', width: 190, band: 40, delay: .1, ttl: .25, damage: a.power * 1.2 }); }
      return;
    }
    const type = attack.type, special = type === 'special', technique = a.enemy ? 'blast' : fighter(a.kind).technique;
    const radial = special && ['blast', 'spin', 'frenzy'].includes(technique);
    let range = a.enemy ? (special ? 195 : a.reach) : type === 'punch' ? 108 : type === 'kick' ? 145 : radial ? 235 : technique === 'gun' ? 680 : 310;
    const band = a.enemy ? (special ? 115 : 48) : (special ? 95 : attack.air ? 68 : 54);
    const damage = Math.round(a.power * (special ? (a.enemy ? 1.35 : 2.5) : type === 'kick' ? 1.5 : a.comboStep === 3 ? 1.4 : 1) * (a.buff > 0 ? 1.2 : 1) * (attack.air ? 1.2 : 1));
    let hits = 0;
    for (const target of a.enemy ? s.players : s.enemies) {
      if (target.hp <= 0 || target.invincible > 0 || (a.enemy && target.z > 28)) continue;
      const dx = target.x - a.x, dy = target.y - a.y;
      if (Math.abs(dx) > range || Math.abs(dy) > band || (!radial && dx * a.facing < -28)) continue;
      if (radial && Math.hypot(dx, dy * 1.35) > range) continue;
      this.damage(target, damage, a, attack.heavy); hits++;
    }
    if (!a.enemy) {
      for (const prop of s.props) {
        if (prop.kind === 'easel' && !prop.enemy) continue;
        if (prop.hp <= 0 || Math.abs(prop.x - a.x) > range || Math.abs(prop.y - a.y) > band || (!radial && (prop.x - a.x) * a.facing < -28)) continue;
        prop.hp -= attack.heavy ? 2 : 1;
        this.event('break', { x: prop.x, y: prop.y - 24, broken: prop.hp <= 0 });
        if (prop.hp <= 0) { if (prop.drop) s.pickups.push({ id: this.nextId++, x: prop.x, y: prop.y, kind: prop.drop }); s.score += 50; }
      }
      if (special && ['charge', 'roll'].includes(technique)) a.vx = a.facing * 600;
      if (hits) { a.energy = Math.min(100, a.energy + hits * (special ? 0 : 7)); s.combo += hits; s.comboTime = 2.2; s.bestCombo = Math.max(s.bestCombo, s.combo); }
    }
    this.event('swing', { actor: a.id, x: a.x, y: a.y - 60 - a.z, facing: a.facing, heavy: attack.heavy, special, enemy: a.enemy });
  }

  damage(target, amount, source, heavy) {
    const s = this.state;
    if (target.hp <= 0) return;
    if (!target.enemy) amount = Math.max(1, Math.round(amount * difficulty(s.difficulty).damage * (1 - target.bonuses.defense)));
    if (target.pattern?.healing) { target.pattern = null; target.cooldown = 1.1; target.recovering = 1.1; this.event('opening', { x: target.x, y: target.y - 160, label: 'RÉCUPÉRATION INTERROMPUE !' }); }
    target.hp = Math.max(0, target.hp - amount); target.flash = .12;
    target.stun = target.boss ? .09 : heavy ? .34 : .23;
    // Boss wind-ups remain readable and cannot be stun-locked indefinitely.
    if (!target.boss || !target.attack) { target.attack = null; target.action = 'hurt'; target.actionTime = 0; }
    target.vx = (Math.sign(target.x - source.x) || source.facing) * (target.boss ? 65 : heavy ? 340 : 110);
    if (!target.enemy) { target.invincible = .65; target.comboStep = 0; s.combo = 0; target.energy = Math.min(100, target.energy + 4); }
    this.event('hit', { x: target.x, y: target.y - 72 - target.z, amount, heavy, enemy: target.enemy, actor: target.id });
    if (target.hp <= 0) {
      if (target.vehicle) {
        target.vehicle = false; target.maxHp = Math.round(BALANCE.bosses.karonux.hp * (s.players.length > 1 ? BALANCE.bossCombat.duoHp : 1)); target.hp = target.maxHp;
        target.pattern = null; target.cooldown = 2; target.invincible = 1.3; target.bossPhase = 1;
        this.event('rage', { actor: target.id, label: 'GOLF DÉTRUITE · KARONUX SORT !' });
        this.hazard(target, { kind: 'wreck', damage: 0, radius: 100, delay: 0, ttl: 1.1 }); return;
      }
      target.attack = null; target.action = 'dead'; target.actionTime = 0; target.deadTime = 0; target.downTime = 0; target.revive = 0;
      target.specialState = null; target.pattern = null;
      this.event('ko', { x: target.x, y: target.y, actor: target.id, enemy: target.enemy, boss: target.boss });
      if (target.enemy) {
        s.kills++; s.score += target.value + Math.min(10, Math.floor(s.combo / 3)) * 20;
        this.awardXp(target.boss ? BALANCE.xp.boss + s.chapter * 45 : BALANCE.xp[target.kind] || 8);
        if (target.boss) { s.hazards = s.hazards.filter(h => h.owner !== target.id); for (const e of s.enemies) if (e.owner === target.id) { e.hp = 0; e.deadTime = 0; } }
        if (this.random() < .18) s.pickups.push({ id: this.nextId++, x: target.x, y: target.y, kind: 'food' });
      }
    }
  }

  updateEnemy(e, dt) {
    this.tickActor(e, dt);
    if (e.hp > 0 && e.boss) { this.updateBoss(e, dt); return; }
    if (e.hp <= 0 || e.attack || e.stun > 0 || this.state.phase !== 'fight') return;
    if (e.boss && e.hp < e.maxHp * .4 && !e.enraged) { e.enraged = true; e.speed *= 1.25; this.event('rage', { actor: e.id, label: `${fighter(e.kind).name} s’énerve !` }); }
    const targets = this.state.players.filter(alive);
    if (!targets.length) return;
    const target = targets.length === 1 ? targets[0] : targets[e.id % targets.length];
    const dx = target.x - e.x, dy = target.y - e.y;
    e.facing = Math.sign(dx) || e.facing;
    const attacking = this.state.enemies.filter(other => other.hp > 0 && (other.pattern || other.attack && !other.attack.hit)).length;
    const limit = targets.length === 2 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo;
    if (e.kind === 'guylux' && Math.abs(dx) < 500 && Math.abs(dy) < 35 && e.cooldown <= 0 && attacking < limit) { this.startAttack(e, 'special'); return; }
    if (Math.abs(dx) < e.reach - 12 && Math.abs(dy) < 38 && e.cooldown <= 0 && attacking < limit) {
      if (e.boss) e.attackCount++;
      e.attackCount++; this.startAttack(e, ['papy_jala', 'charlingals'].includes(e.kind) && e.attackCount % 3 === 0 ? 'special' : 'punch');
      return;
    }
    const flanking = e.kind === 'orelsan' && this.state.chapter > 0;
    const side = flanking ? (e.id % 2 ? -1 : 1) : (e.x < target.x ? -1 : 1);
    const desiredX = clamp(target.x + side * (e.kind === 'guylux' ? 290 : e.reach - 23), FLOOR.left, FLOOR.right);
    const length = Math.max(1, Math.hypot(desiredX - e.x, dy * 1.5));
    if (Math.abs(desiredX - e.x) > 5 || Math.abs(dy) > 9) {
      e.x += (desiredX - e.x) / length * e.speed * dt;
      e.y += dy / length * e.speed * .9 * dt;
      e.action = 'walk'; e.moving = true;
    }
  }

  separateEnemies(dt) {
    const enemies = this.state.enemies.filter(alive);
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
    a.x = clamp(a.x + a.vx * dt, FLOOR.left, FLOOR.right);
    a.y = clamp(a.y + a.vy * dt, FLOOR.top, FLOOR.bottom);
    a.vx *= Math.exp(-9 * dt); a.vy *= Math.exp(-9 * dt);
    if (a.z > 0 || a.vz > 0) { a.z += a.vz * dt; a.vz -= 1350 * dt; if (a.z <= 0) { a.z = 0; a.vz = 0; } }
  }

  collectPickups() {
    const s = this.state;
    s.pickups = s.pickups.filter(item => {
      const player = s.players.find(p => alive(p) && p.z < 20 && distance(p, item) < 42 && (item.kind === 'food' ? p.hp < p.maxHp : p.energy < 98));
      if (!player) return true;
      if (item.kind === 'food') player.hp = Math.min(player.maxHp, player.hp + 35);
      else player.energy = Math.min(100, player.energy + 40);
      s.score += 25; this.event('pickup', { x: item.x, y: item.y - 45, kind: item.kind, actor: player.id }); return false;
    });
  }

  revivePlayer(p, fraction) {
    p.hp = Math.round(p.maxHp * fraction); p.invincible = 2.5; p.stun = 0; p.attack = null;
    p.downTime = 0; p.deadTime = 0; p.revive = 0; p.action = 'idle'; p.actionTime = 0; p.vx = 0;
    p.specialState = null;
    this.event('revive', { actor: p.id, x: p.x, y: p.y });
  }

  snapshot() { return JSON.parse(JSON.stringify(this.state)); }
}
Object.assign(Simulation.prototype, combat);
