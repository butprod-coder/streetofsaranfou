import { BALANCE, difficulty } from './balance.js';
import { FLOOR, fighter, clamp } from './data.js';
const live = a => a.hp > 0;
const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
const nearest = (a, actors) => actors.filter(live).sort((x, y) => distance(a, x) - distance(a, y))[0];

/** Serializable combat extensions, stepped exclusively by the shared simulation. */
export const combat = {
  hazard(source, options) {
    const h = { id: this.nextId++, owner: source.id, bossOwner: source.boss === true, enemy: source.enemy, x: source.x, y: source.y, facing: source.facing,
      shape: 'circle', radius: 65, width: 100, band: 30, vx: 0, vy: 0, delay: .65, ttl: .25, age: 0,
      damage: source.power, hits: {}, pulse: .7, kind: 'shock', ...options };
    h.x = clamp(h.x, FLOOR.left, FLOOR.right); h.y = clamp(h.y, FLOOR.top, FLOOR.bottom);
    this.state.hazards.push(h); return h;
  },
  updateWorld(dt) {
    const s = this.state;
    for (const h of s.hazards) {
      if (h.bossOwner && !s.enemies.some(e => e.id === h.owner && live(e))) { h.ttl = 0; continue; }
      h.age += dt;
      if (h.delay > 0) { h.delay -= dt; continue; }
      h.ttl -= dt; h.x += h.vx * dt; h.y += h.vy * dt;
      if (h.x < FLOOR.left - 120 || h.x > FLOOR.right + 120 || h.y < FLOOR.top - 80 || h.y > FLOOR.bottom + 80) h.ttl = 0;
      const source = [...s.players, ...s.enemies].find(a => a.id === h.owner) || h;
      for (const target of h.damage > 0 ? h.enemy ? s.players : s.enemies : []) {
        if (!live(target) || target.invincible > 0 || (h.enemy && target.z > 28) || s.time < (h.hits[target.id] || 0)) continue;
        const dx = target.x - h.x, dy = target.y - h.y;
        const hit = h.shape === 'line' ? dx * h.facing >= -25 && dx * h.facing <= h.width && Math.abs(dy) < h.band : Math.hypot(dx, dy * 1.45) < h.radius;
        if (hit) { this.damage(target, Math.round(h.damage), source, true); h.hits[target.id] = s.time + h.pulse; }
      }
    }
    s.hazards = s.hazards.filter(h => h.ttl > 0);
    for (const a of s.allies) {
      a.ttl -= dt; a.cooldown -= dt; a.actionTime += dt;
      const owner = s.players.find(p => p.id === a.owner), target = nearest(a, s.enemies);
      if (!owner || !live(owner)) a.ttl = 0;
      a.action = 'walk';
      if (target) {
        a.facing = Math.sign(target.x - a.x) || a.facing;
        if (distance(a, target) > 62) {
          const d = Math.max(1, distance(a, target)); a.x += (target.x - a.x) / d * 255 * dt; a.y += (target.y - a.y) / d * 205 * dt;
        } else if (a.cooldown <= 0) {
          a.cooldown = .65; a.action = 'punch';
          if (target.invincible <= 0) this.damage(target, a.power, owner, false);
        }
      }
      this.physics(a, dt);
    }
    s.allies = s.allies.filter(a => a.ttl > 0);
    for (const prop of s.props) if (prop.kind === 'easel' && prop.hp > 0 && prop.enemy) {
      const owner = s.enemies.find(e => e.id === prop.owner && live(e));
      if (!owner) { prop.hp = 0; continue; }
      prop.spawnIn -= dt;
      if (prop.spawnIn <= 0 && prop.spawnCount < 2 && s.enemies.filter(e => live(e) && e.kind === 'creation').length < 3) {
        prop.spawnIn = 5; prop.spawnCount++;
        this.spawnEnemy('creation', { x: prop.x, y: prop.y, owner: owner.id });
      }
      if (prop.spawnCount >= 2) { prop.ttl -= dt; if (prop.ttl <= 0) prop.hp = 0; }
    }
  },
  activateSpecial(p) {
    const b = BALANCE.specials[p.kind], bonus = p.bonuses;
    p.energy -= b.cost; p.specialCd = b.cooldown * bonus.cooldown;
    p.specialState = { kind: p.kind, elapsed: 0, duration: b.duration, nextPulse: 0, turn: 0, dx: p.facing, dy: 0, hit: false };
    p.action = 'special'; p.actionTime = 0; p.attack = null; p.cooldown = b.duration; p.invincible = p.kind === 'karonux' ? 1.2 : .8;
    this.event('special', { actor: p.id, kind: fighter(p.kind).technique, label: fighter(p.kind).special, x: p.x, y: p.y, facing: p.facing });
  },
  updateSpecial(p, input, dt) {
    const a = p.specialState, b = BALANCE.specials[p.kind], s = this.state;
    a.elapsed += dt; p.action = 'special';
    const power = fighter(p.kind).power * p.bonuses.special, radius = b.radius * p.bonuses.radius;
    const pulse = () => {
      this.hazard(p, { radius, delay: 0, ttl: .08, damage: Math.round(power * b.damage), kind: 'special', pulse: .5 });
      a.nextPulse = a.elapsed + (p.kind === 'yanu' ? .6 : .4);
    };
    if (p.kind === 'karonux') {
      if (!a.hit && a.elapsed >= .2) { pulse(); a.hit = true; }
      if (a.elapsed > .48) p.action = 'sleep';
    } else if (p.kind === 'jualos') {
      p.x += a.dx * 510 * dt; p.y += input.y * 190 * dt;
      if (p.x <= FLOOR.left + 8 || p.x >= FLOOR.right - 8) { a.dx *= -1; p.facing = a.dx; }
      if (a.elapsed >= a.nextPulse) pulse();
    } else if (p.kind === 'yanu') {
      p.x += input.x * p.speed * .6 * dt; p.y += input.y * p.speed * .4 * dt;
      if (a.elapsed >= a.nextPulse) pulse();
    } else if (p.kind === 'jo') {
      if (a.elapsed >= a.turn) { const angle = this.random() * Math.PI * 2; a.dx = Math.cos(angle); a.dy = Math.sin(angle); a.turn = a.elapsed + .5; }
      if (p.x <= FLOOR.left + 15 || p.x >= FLOOR.right - 15) a.dx *= -1;
      if (p.y <= FLOOR.top + 10 || p.y >= FLOOR.bottom - 10) a.dy *= -1;
      p.x += a.dx * 350 * dt; p.y += a.dy * 155 * dt;
      if (a.elapsed >= a.nextPulse) pulse();
    } else if (!a.hit && a.elapsed >= .22) {
      a.hit = true;
      if (p.kind === 'lorenzo') for (let i = -1; i <= 1; i++) this.hazard(p, { x: p.x + p.facing * (155 + (i === 0 ? 60 : 0)), y: p.y + i * 53, radius, kind: 'fire', delay: .35, ttl: 4, damage: Math.round(power * b.damage) });
      if (p.kind === 'kikor') {
        s.allies = s.allies.filter(a => a.owner !== p.id);
        s.props = s.props.filter(a => a.kind !== 'easel' || a.owner !== p.id);
        s.props.push({ id: this.nextId++, kind: 'easel', x: p.x - p.facing * 50, y: p.y, hp: 3, owner: p.id, enemy: false });
        s.allies.push({ ...this.actor('creation', this.nextId++, false), owner: p.id, ally: true, hp: 1, maxHp: 1, x: p.x, y: p.y, ttl: 10, power: Math.round(power * b.damage) });
      }
      if (p.kind === 'gustavax') this.hazard(p, { kind: 'bullet', shape: 'line', width: radius, band: 52, delay: 0, ttl: .14, damage: Math.round(power * b.damage) });
    }
    if (a.elapsed >= a.duration) { p.specialState = null; p.action = 'idle'; }
  },
  bossPhase(e) {
    const b = BALANCE.bosses[e.kind];
    return e.vehicle ? 0 : 1 + b.phases.filter(threshold => e.hp / e.maxHp <= threshold).length;
  },
  updateBoss(e, dt) {
    const s = this.state, config = BALANCE.bosses[e.kind], mode = difficulty(s.difficulty);
    const phase = Math.max(e.bossPhase || 0, this.bossPhase(e));
    if (phase !== e.bossPhase) {
      e.bossPhase = phase; e.enraged = phase > 1; e.pattern = null; e.cooldown = 1.25; e.invincible = .65;
      this.event('rage', { actor: e.id, label: `${fighter(e.kind).name} · PHASE ${phase} — ${this.bossIdentity(e)}` });
    }
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = p.healing ? 'heal' : 'special';
      if (p.healing && p.elapsed >= p.windup && !p.hit) {
        p.hit = true; e.hp = Math.min(e.maxHp, e.hp + config.healing); this.event('heal', { actor: e.id, x: e.x, y: e.y - 145, amount: config.healing });
      }
      if (!p.hit && p.elapsed >= p.windup) { p.hit = true; this.executeBossPattern(e, p); }
      if (p.hit && p.charge && p.elapsed < p.windup + p.active) {
        e.x += p.dx * p.speed * dt; e.y += p.dy * p.speed * dt;
        if (s.time >= (p.nextHit || 0)) { this.hazard(e, { kind: 'impact', radius: e.vehicle ? 110 : 88, delay: 0, ttl: .04, damage: e.power * 1.2 }); p.nextHit = s.time + .14; }
      }
      if (p.elapsed >= p.windup + p.active) {
        e.pattern = null; e.cooldown = config.recovery * mode.recovery * (phase > 1 ? .9 : 1); e.recovering = e.cooldown; e.action = 'idle';
        this.event('opening', { actor: e.id, x: e.x, y: e.y - 150, label: p.healing ? 'REPART !' : 'À TOI !' });
      }
      return;
    }
    if (e.cooldown > 0 || e.stun > 0) {
      // Preserve the opening, then re-align before the next long-range wind-up.
      if (e.kind === 'jo' && e.cooldown < .45 && e.stun <= 0) {
        const target = nearest(e, s.players); if (target) { e.y += clamp(target.y - e.y, -1, 1) * 130 * dt; e.action = 'walk'; }
      }
      return;
    }
    const target = nearest(e, s.players); if (!target) return;
    const occupied = s.enemies.filter(a => a.hp > 0 && (a.pattern || a.attack && !a.attack.hit)).length;
    if (occupied >= (s.players.length > 1 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo)) return;
    e.facing = Math.sign(target.x - e.x) || e.facing;
    const n = e.attackCount++, enhanced = phase > 1;
    let kind;
    if (e.vehicle) kind = n % 2 ? 'carRush' : 'carRev';
    else if (e.kind === 'karonux') kind = n % 4 === 3 && e.healUses < config.healUses ? 'smoke' : n % 2 ? 'combo' : 'rush';
    else if (e.kind === 'kikor') kind = enhanced && n % 3 !== 0 ? 'bike' : n % 3 === 0 && e.summons < 4 ? 'paint' : 'brush';
    else if (e.kind === 'yanu') kind = n % 4 === 3 && e.healUses < config.healUses ? 'whisky' : n % 2 ? 'burpees' : 'workout';
    else if (e.kind === 'lorenzo') kind = n % 2 ? 'cigarettes' : 'petanque';
    else if (e.kind === 'jo') kind = n % 3 === 2 && enhanced ? 'doubleFist' : n % 2 ? 'sweepFist' : 'longFist';
    else kind = phase === 3 ? ['flames', 'crossfire', 'stomp'][n % 3] : phase === 2 ? ['crossfire', 'stomp', 'guards'][n % 3] : n % 2 ? 'stomp' : 'gun';
    const healing = ['smoke', 'whisky'].includes(kind), charge = ['carRush', 'carRev', 'rush', 'bike', 'workout'].includes(kind);
    if (healing) e.healUses++;
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
    const tuning = BALANCE.bossCombat;
    e.pattern = { kind, elapsed: 0, windup: (healing ? tuning.healWindup : kind === 'doubleFist' ? .85 : charge ? tuning.chargeWindup : tuning.windup) * mode.telegraph,
      active: healing ? .45 : charge ? tuning.chargeDuration : .35, hit: false, healing, charge, dx: dx / d, dy: dy / d,
      targetX: target.x, targetY: target.y, x: e.x, y: e.y, facing: e.facing, speed: (e.vehicle ? tuning.carSpeed : kind === 'bike' ? tuning.bikeSpeed : tuning.rushSpeed) * (enhanced ? 1.08 : 1) };
    e.action = healing ? 'heal' : 'special'; e.actionTime = 0;
    // Close-combat attacks need positioning; ranged patterns intentionally retain their distance.
    if (kind === 'combo') { e.pattern.targetX = clamp(target.x - e.facing * 85, FLOOR.left, FLOOR.right); }
  },
  bossIdentity(e) {
    if (e.vehicle) return 'DÉTRUIS LA GOLF';
    return ({ karonux: 'COLÈRE & FATIGUE', kikor: e.bossPhase > 1 ? 'LE VÉLO DU PEINTRE' : 'LES TOILES VIVANTES', yanu: 'LE CIRCUIT PHYSIQUE', lorenzo: 'LE BOULODROME EN FEU', jo: 'GARDE TES DISTANCES', gustavax: e.bossPhase > 2 ? 'DERNIER ARGUMENT' : 'LE MAÎTRE DES LIEUX' })[e.kind];
  },
  executeBossPattern(e, p) {
    const enhanced = e.bossPhase > 1, scale = difficulty(this.state.difficulty).telegraph;
    if (p.charge || p.healing) return;
    if (p.kind === 'paint') {
      e.summons++;
      this.state.props.push({ id: this.nextId++, kind: 'easel', enemy: true, owner: e.id, hp: 4, x: clamp(p.targetX + 160 * e.facing, 140, 1120), y: p.targetY, spawnIn: 1.3, spawnCount: 0, ttl: 4 });
    } else if (p.kind === 'brush' || p.kind === 'gun' || p.kind === 'crossfire' || p.kind === 'petanque') {
      const count = p.kind === 'crossfire' ? 5 : enhanced ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(p.targetY - e.y, p.targetX - e.x) + (i - (count - 1) / 2) * .13;
        const speed = p.kind === 'petanque' ? 340 : 430;
        this.hazard(e, { kind: p.kind === 'petanque' ? 'ball' : p.kind === 'brush' ? 'paint' : 'bullet', radius: p.kind === 'petanque' ? 30 : 23,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, delay: i * .16, ttl: 3.5, damage: e.power * .9 });
      }
    } else if (p.kind === 'cigarettes' || p.kind === 'flames') {
      const count = p.kind === 'flames' ? 5 : enhanced ? 4 : 3;
      for (let i = 0; i < count; i++) this.hazard(e, { kind: 'fire', x: p.targetX + (i - (count - 1) / 2) * 95, y: p.targetY + (i % 2 ? -42 : 36), radius: 58, delay: .85 * scale, ttl: 3.5, damage: e.power * .6 });
    } else if (['longFist', 'doubleFist', 'sweepFist'].includes(p.kind)) {
      this.hazard(e, { kind: 'fist', shape: 'line', width: p.kind === 'sweepFist' ? 360 : 550, band: p.kind === 'sweepFist' ? 65 : 30, delay: 0, ttl: .26, damage: e.power * 1.35 });
      if (p.kind === 'doubleFist') this.hazard(e, { kind: 'fist', shape: 'line', width: 620, band: 32, y: p.targetY, delay: .55 * scale, ttl: .26, damage: e.power * 1.1 });
    } else if (p.kind === 'guards') {
      if (e.summons++ < 2) { this.spawnEnemy('orelsan'); this.spawnEnemy('remy'); }
      else this.hazard(e, { x: p.targetX, y: p.targetY, radius: 110, delay: .65 * scale });
    } else if (p.kind === 'combo') {
      e.x = p.targetX; e.y = p.targetY;
      this.hazard(e, { kind: 'impact', shape: 'line', width: 150, band: 42, delay: .32 * scale, ttl: .3 });
      if (enhanced) this.hazard(e, { kind: 'impact', shape: 'line', width: 175, band: 48, delay: .85 * scale, ttl: .2 });
    } else {
      // Burpees and Gustavax's stomp leave their destination marked before impact.
      this.hazard(e, { kind: 'shock', x: p.targetX, y: p.targetY, radius: enhanced ? 145 : 120, delay: .65 * scale, ttl: .18, damage: e.power * 1.2 });
      if (p.kind === 'burpees') { e.x = p.targetX; e.y = p.targetY; e.z = 80; e.vz = 160; }
      if (enhanced) this.hazard(e, { kind: 'shock', x: p.targetX + 150 * e.facing, y: p.targetY, radius: 100, delay: 1.1 * scale, ttl: .18 });
    }
  },
};
