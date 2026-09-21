import { BALANCE, difficulty } from './balance.js';
import { FLOOR, fighter, clamp } from './data.js';
import { refreshPlayerStats } from './progression.js';
import { ENCORE_RULES } from './elite-encore-data.js';
import { hasTalent } from './rogue-talents.js';
const SIGNATURES = { karonux: 'rainbowStorm', kikor: 'preciousHunt', yanu: 'kayakRush', lorenzo: 'sofaDrop', jo: 'ferretHunt', gustavax: 'finalRing' };
const live = a => a.hp > 0;
const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
const nearest = (a, actors) => actors.filter(live).sort((x, y) => distance(a, x) - distance(a, y))[0];

/** Serializable combat extensions, stepped exclusively by the shared simulation. */
export const combat = {
  endSpecial(p) {
    const wrestling = p.specialState?.kind === 'gustavax';
    p.specialState = null;
    p.rogueBlood = false;
    if (wrestling) refreshPlayerStats(p, true);
  },
  hazard(source, options) {
    const h = { id: this.nextId++, owner: source.id, bossOwner: source.boss === true, enemy: source.enemy, x: source.x, y: source.y, facing: source.facing,
      shape: 'circle', radius: 65, width: 100, band: 30, vx: 0, vy: 0, delay: .65, ttl: .25, age: 0,
      damage: source.power, hits: {}, pulse: .7, kind: 'shock', ...options };
    h.x = clamp(h.x, FLOOR.left, FLOOR.right); h.y = clamp(h.y, FLOOR.top, FLOOR.bottom);
    if (['fire', 'slime'].includes(h.kind)) { h.flight = h.delay; h.fromX ??= source.x; h.fromY ??= source.y - 80; }
    this.state.hazards.push(h); return h;
  },
  updateWorld(dt) {
    const s = this.state;
    this.updateRogueWorld(dt);
    for (const h of s.hazards) {
      if (h.bossOwner && !s.enemies.some(e => e.id === h.owner && live(e))) { h.ttl = 0; continue; }
      h.age += dt;
      if (h.delay > 0) { h.delay -= dt; continue; }
      if (h.kind === 'barrelBlast' && !h.exploded) { h.exploded = true; this.event('explosion', { x: h.x, y: h.y }); }
      if (h.kind === 'lorenzoRing' && !h.ignited) { h.ignited = true; this.event('ember', { x: h.x, y: h.y, radius: 16 }); }
      const ignition = h.kind === 'fire' && !h.ignited;
      if (ignition) { h.ignited = true; this.event('ember', { x: h.x, y: h.y, radius: h.radius }); }
      h.activeAge = (h.activeAge || 0) + dt;
      if (h.shape === 'ring') {
        h.previousRadius = h.radius;
        h.radius = Math.min(h.maxRadius, h.radius + h.growth * dt);
        if (h.radius >= h.maxRadius) h.ttl = 0;
      }
      h.ttl -= dt; h.x += h.vx * dt; h.y += h.vy * dt;
      if (h.x < FLOOR.left - 120 || h.x > FLOOR.right + 120 || h.y < FLOOR.top - 80 || h.y > FLOOR.bottom + 80) h.ttl = 0;
      const source = [...s.players, ...s.enemies].find(a => a.id === h.owner) || h;
      if (h.kind === 'jualosCash') { this.updateJualosCash(h); continue; }
      const intersects = target => { const dx = target.x - h.x, dy = target.y - h.y, extent = target.halfWidth || 0; return h.shape === 'line' ? dx * h.facing >= -25 - extent && dx * h.facing <= h.width + extent && Math.abs(dy) < h.band : Math.hypot(Math.max(0, Math.abs(dx) - extent), dy * 1.45) < h.radius; };
        const armed = h.kind !== 'plant' || h.activeAge % ENCORE_RULES.plantCycle < ENCORE_RULES.plantBite;
        for (const target of h.damage > 0 && armed ? h.both ? [...s.players, ...s.enemies] : h.enemy ? s.players : s.enemies : []) {
        if (!live(target) || target.invincible > 0 || ((h.enemy || h.both) && !target.enemy && target.z > 28) || s.time < (h.hits[target.id] || 0)) continue;
        const dx = target.x - h.x, dy = target.y - h.y;
        const distance = Math.hypot(dx, dy * (h.verticalScale || 1.45));
        const hit = h.shape === 'ring' ? distance >= h.previousRadius - h.thickness && distance <= h.radius + h.thickness : h.shape === 'line' ? dx * h.facing >= -25 && dx * h.facing <= h.width && Math.abs(dy) < h.band : distance < h.radius;
        if (hit) {
          this.damage(target, Math.round(ignition ? h.ignitionDamage || h.damage : h.damage), source, true);
          if (h.stunDuration && target.hp > 0) target.stun = Math.max(target.stun, h.stunDuration);
          h.hits[target.id] = s.time + h.pulse;
        }
      }
      if (!h.enemy && h.damage > 0) for (const prop of s.props.filter(p => !(p.kind === 'easel' && !p.enemy))) {
        const key = `prop${prop.id}`;
        if (prop.hp > 0 && !h.hits[key] && intersects(prop)) { this.hitProp(prop, h.propDamage || 2, source); h.hits[key] = 1; }
      }
    }
    s.hazards = s.hazards.filter(h => h.ttl > 0);
    for (const a of s.allies) {
      a.ttl -= dt; a.cooldown -= dt; a.actionTime += dt;
      const owner = s.players.find(p => p.id === a.owner), target = nearest(a, s.enemies);
      if (!owner || !live(owner)) { a.ttl = 0; continue; }
      a.emerging = Math.max(0, (a.emerging || 0) - dt);
      a.striking = Math.max(0, (a.striking || 0) - dt);
      if (a.emerging > 0) { a.action = 'special'; continue; }
      if (a.striking > 0) { a.action = 'punch'; continue; }
      a.action = target ? 'walk' : 'idle';
      if (target) {
        a.facing = Math.sign(target.x - a.x) || a.facing;
        if (distance(a, target) > 62) {
          const d = Math.max(1, distance(a, target)); a.x += (target.x - a.x) / d * 255 * dt; a.y += (target.y - a.y) / d * 205 * dt;
        } else if (a.cooldown <= 0) {
          a.cooldown = .65 * owner.bonuses.allyRate; a.action = 'punch'; a.actionTime = 0; a.striking = .24;
          if (target.invincible <= 0) this.damage(target, a.power * (target.paintOwner === owner.id ? 1.3 : 1) * (hasTalent(owner, 'Portrait de famille') && owner.supportRole === 'attack' ? 1.2 : 1), a, false);
        }
      }
      this.physics(a, dt);
    }
    s.allies = s.allies.filter(a => a.ttl > 0);
    for (const prop of s.props.filter(p => p.kind === 'easel' && !p.enemy)) {
      prop.paintTime = (prop.paintTime || 0) + dt;
      const owner = s.players.find(p => p.id === prop.owner && live(p));
      if (!owner || !s.allies.some(a => a.owner === prop.owner) && owner.specialState?.kind !== 'kikor') prop.hp = 0;
    }
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
    p.specialState = { kind: p.kind, elapsed: 0, duration: b.duration + bonus.duration - bonus.sleepReduction, nextPulse: 0, turn: 0, dx: p.facing, dy: 0, hit: false };
    p.action = 'special'; p.actionTime = 0; p.attack = null; p.cooldown = p.specialState.duration; p.invincible = p.kind === 'karonux' ? 1.2 : .8;
    if (p.kind === 'karonux') {
      p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
      const a = p.specialState, left = FLOOR.left + 110, right = FLOOR.right - 110;
      a.startX = clamp(p.x, left, right); a.startY = p.y;
      if ((a.dx > 0 ? right - a.startX : a.startX - left) < b.golfDistance * .6) a.dx *= -1;
      a.endX = clamp(a.startX + a.dx * b.golfDistance, left, right); a.hits = {}; p.facing = a.dx;
    }
    if (p.kind === 'gustavax') { p.cooldown = .3; refreshPlayerStats(p, true); }
    this.rogueOnSpecial(p);
    this.event('special', { actor: p.id, kind: fighter(p.kind).technique, label: fighter(p.kind).special, x: p.x, y: p.y, facing: p.facing });
  },
  updateSpecial(p, input, dt) {
    const a = p.specialState, b = BALANCE.specials[p.kind], s = this.state;
    a.elapsed += dt; if (p.kind !== 'gustavax') p.action = 'special';
    const power = p.specialPower, radius = b.radius * p.bonuses.radius;
    const pulse = () => {
      this.hazard(p, { radius, delay: 0, ttl: .08, damage: Math.round(power * b.damage), kind: 'special', pulse: .5 });
      a.nextPulse = a.elapsed + (p.kind === 'yanu' ? .6 : .4);
    };
    if (p.kind === 'karonux') {
      if (p.rogueDrive > 0) { p.action = 'special'; p.invincible = Math.max(p.invincible, .06); return; }
      if (a.elapsed >= b.golfAt && a.elapsed < b.sleepAt) {
        const returning = a.elapsed >= b.turnAt, leg = returning ? 1 : 0, previousX = p.x;
        const progress = clamp((a.elapsed - (returning ? b.turnAt : b.golfAt)) / (returning ? b.sleepAt - b.turnAt : b.turnAt - b.golfAt), 0, 1);
        p.x = returning ? a.endX + (a.startX - a.endX) * progress : a.startX + (a.endX - a.startX) * progress;
        p.y = a.startY; p.facing = returning ? -a.dx : a.dx; p.invincible = Math.max(p.invincible, .06);
        if (!a.hit) { a.hit = true; this.event('golf', { actor: p.id, x: p.x, y: p.y }); }
        if (returning && !a.turned) { a.turned = true; this.event('skid', { x: p.x, y: p.y, facing: p.facing }); }
        // Swept car body: one impact per opponent per pass, never a screen-wide explosion.
        for (const target of [...s.enemies, ...s.props.filter(q => !(q.kind === 'easel' && !q.enemy))]) {
          const key = `${leg}:${target.id}`;
          if (target.hp <= 0 || a.hits[key] || Math.abs(target.y - p.y) > 46 * p.bonuses.radius || target.x < Math.min(previousX, p.x) - radius || target.x > Math.max(previousX, p.x) + radius) continue;
          const enemy = s.enemies.includes(target);
          if (enemy && target.invincible > 0) continue;
          a.hits[key] = true;
          if (enemy) {
            this.damage(target, Math.round(power * b.damage), p, true);
            if (!target.boss && hasTalent(p, 'Pare-chocs aimanté')) { target.x = clamp(p.x + p.facing * 90, FLOOR.left, FLOOR.right); target.vx = returning ? p.facing * 620 : 0; }
          }
          else this.hitProp(target, 2, p);
        }
      }
      if (a.elapsed >= b.sleepAt) {
        if (!a.parked) {
          a.parked = true; p.x = a.startX; p.y = a.startY;
          if (p.hp > 0 && p.bonuses.blastHeal) { const amount = Math.min(p.bonuses.blastHeal, p.maxHp - p.hp); p.hp += amount; this.event('heal', { x: p.x, y: p.y - 60, amount }); }
        }
        p.action = 'sleep';
      }
    } else if (p.kind === 'jualos') {
      p.x += a.dx * 510 * p.bonuses.chargeSpeed * dt; p.y += input.y * 190 * dt;
      if (p.x <= FLOOR.left + 8 || p.x >= FLOOR.right - 8) { a.dx *= -1; p.facing = a.dx; }
      if (a.elapsed >= a.nextPulse) pulse();
    } else if (p.kind === 'yanu') {
      p.x += input.x * p.speed * .6 * dt; p.y += input.y * p.speed * .4 * dt;
      if (a.elapsed >= a.nextPulse) pulse();
    } else if (p.kind === 'jo') {
      const norm = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
      p.x += (input.x || 0) / norm * BALANCE.tornado.speedX * p.bonuses.speed * dt;
      p.y += (input.y || 0) / norm * BALANCE.tornado.speedY * p.bonuses.speed * dt;
      if (input.x) p.facing = Math.sign(input.x);
      if (a.elapsed >= a.nextPulse) pulse();
    } else if (p.kind === 'kikor') {
      if (!a.easel && a.elapsed >= b.paintAt * (hasTalent(p, 'Croquis rapide') ? .5 : 1)) {
        s.allies = s.allies.filter(ally => ally.owner !== p.id);
        s.props = s.props.filter(prop => prop.kind !== 'easel' || prop.owner !== p.id);
        if (p.x > FLOOR.right - 100) p.facing = -1;
        if (p.x < FLOOR.left + 100) p.facing = 1;
        a.easel = this.nextId++;
        s.props.push({ id: a.easel, kind: 'easel', x: p.x + p.facing * 83, y: p.y + 2, hp: 3, owner: p.id, enemy: false, paintTime: 0 });
      }
      if (!a.hit && a.elapsed >= b.spawnAt * (hasTalent(p, 'Croquis rapide') ? .5 : 1)) {
        a.hit = true; const easel = s.props.find(prop => prop.id === a.easel);
        if (easel) s.allies.push({ ...this.actor('creation', this.nextId++, false), owner: p.id, ally: true, hp: 1, maxHp: 1,
          x: easel.x, y: easel.y + 3, facing: p.facing, emerging: b.emergeDuration, ttl: b.allyDuration + p.bonuses.allyDuration,
          power: Math.round(power * b.damage * (hasTalent(p, 'Deuxième pinceau') ? .7 : 1)) });
      }
    } else if (!a.hit && a.elapsed >= .22) {
      a.hit = true;
      if (p.kind === 'lorenzo') {
        const tuning = BALANCE.embers, direction = p.facing > 0 && p.x > FLOOR.right - 180 ? -1 : p.facing < 0 && p.x < FLOOR.left + 180 ? 1 : p.facing;
        p.facing = direction;
        for (let i = 0; i < tuning.count; i++) {
          const offset = i - (tuning.count - 1) / 2;
          this.hazard(p, { x: p.x + direction * (355 - Math.abs(offset) * 100), y: clamp(p.y, FLOOR.top + 80, FLOOR.bottom - 80) + offset * 38,
            radius, kind: 'fire', delay: tuning.flight + i * tuning.stagger, ttl: tuning.duration + p.bonuses.fireDuration,
            damage: Math.round(power * b.damage), ignitionDamage: Math.round(power * tuning.ignition), pulse: tuning.pulse });
        }
      }
    }
    if (a.elapsed >= a.duration) { this.endSpecial(p); p.action = 'idle'; }
  },
  bossPhase(e) {
    const b = BALANCE.bosses[e.kind];
    return e.vehicle ? 0 : 1 + b.phases.filter(threshold => e.hp / e.maxHp <= threshold).length;
  },
  updateBoss(e, dt) {
    if (e.kind === 'karonux') return this.updateKaronux(e, dt);
    if (e.kind === 'kikor') return this.updateKikor(e, dt);
    if (e.kind === 'yanu') return this.updateYanu(e, dt);
    if (e.kind === 'lorenzo') return this.updateLorenzo(e, dt);
    if (e.kind === 'jo') return this.updateJo(e, dt);
    if (e.kind === 'jualos') return this.updateJualos(e, dt);
    const s = this.state, config = BALANCE.bosses[e.kind], mode = difficulty(s.difficulty);
    const phase = Math.max(e.bossPhase || 0, this.bossPhase(e));
    if (phase !== e.bossPhase) {
      e.bossPhase = phase; e.enraged = phase > 1; e.pattern = null; e.cooldown = 1.25; e.invincible = .65;
      this.event('rage', { actor: e.id, label: `${fighter(e.kind).name} · PHASE ${phase} — ${this.bossIdentity(e)}` });
      e.signatureReady = true;
      this.event('spectacle', { x: e.x, y: e.y, atlas: e.kind === 'karonux' ? 'princesse' : e.kind === 'kikor' ? 'precieux' : e.kind === 'yanu' ? 'kayak' : e.kind === 'jo' ? 'fouine' : 'bolorouet', cell: 10 });
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
        e.pattern = null; e.cooldown = (p.signature ? BALANCE.bossShow.recovery : config.recovery * (phase > 1 ? .9 : 1)) * mode.recovery; e.recovering = e.cooldown; e.action = 'idle';
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
    const signature = !e.vehicle && enhanced && (e.signatureReady || n % BALANCE.bossShow.signatureEvery === 0);
    if (signature) { kind = SIGNATURES[e.kind]; e.signatureReady = false; }
    const healing = ['smoke', 'whisky'].includes(kind), charge = ['carRush', 'carRev', 'rush', 'bike', 'workout', 'preciousHunt', 'kayakRush', 'ferretHunt'].includes(kind);
    if (healing) e.healUses++;
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
    const tuning = BALANCE.bossCombat;
    e.pattern = { kind, elapsed: 0, windup: (healing ? tuning.healWindup : kind === 'doubleFist' ? .85 : charge ? tuning.chargeWindup : tuning.windup) * mode.telegraph,
      active: healing ? .45 : charge ? tuning.chargeDuration : .35, hit: false, healing, charge, dx: dx / d, dy: dy / d,
      targetX: target.x, targetY: target.y, x: e.x, y: e.y, facing: e.facing, speed: (e.vehicle ? tuning.carSpeed : kind === 'bike' ? tuning.bikeSpeed : tuning.rushSpeed) * (enhanced ? 1.08 : 1) };
    if (signature) { e.pattern.signature = true; e.pattern.windup = BALANCE.bossShow.windup * mode.telegraph; e.pattern.speed = kind === 'ferretHunt' ? 530 : 430; }
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
    if (p.signature) {
      const s = this.state;
      this.event('spectacle', { x: e.x, y: e.y, atlas: p.kind === 'rainbowStorm' ? 'princesse' : p.kind === 'kayakRush' ? 'kayak' : p.kind === 'ferretHunt' ? 'fouine' : p.kind === 'preciousHunt' ? 'precieux' : 'bolorouet', cell: 10 });
      if (p.kind === 'rainbowStorm') {
        for (let i = 0; i < 5; i++) {
          const angle = Math.atan2(p.targetY - e.y, p.targetX - e.x) + (i - 2) * .2;
          this.hazard(e, { kind: 'magic', atlas: 'princesse', cell: 9, radius: 25, vx: Math.cos(angle) * 340, vy: Math.sin(angle) * 340, delay: i * .12, ttl: 3, damage: e.power * .85 });
        }
      } else if (p.kind === 'sofaDrop') {
        e.x = clamp(p.targetX, 160, 1120); e.y = p.targetY;
        this.hazard(e, { kind: 'impact', x: e.x, y: e.y, radius: 140, delay: .25, ttl: .15, damage: e.power * 1.2 });
        for (const offset of [-210, 210]) this.hazard(e, { kind: 'fire', x: e.x + offset, y: e.y, radius: 60, delay: 1.1, ttl: 2.3, damage: e.power * .55, atlas: 'canape', cell: 9 });
      } else if (p.kind === 'finalRing') {
        // A radial volley has an intentional two-projectile opening toward the player.
        const angle = Math.atan2(p.targetY - e.y, p.targetX - e.x);
        for (let i = 2; i < 11; i++) this.hazard(e, { kind: 'magic', atlas: 'princesse', cell: 9, radius: BALANCE.bossShow.ringRadius,
          vx: Math.cos(angle + i * Math.PI / 6) * BALANCE.bossShow.ringSpeed, vy: Math.sin(angle + i * Math.PI / 6) * BALANCE.bossShow.ringSpeed,
          delay: .3, ttl: 3, damage: e.power * .75 });
        if (e.bossPhase > 2) this.hazard(e, { kind: 'shock', x: p.targetX, y: p.targetY, radius: 100, delay: 1.2 * scale, ttl: .16, damage: e.power });
      } else if (p.kind === 'kayakRush') this.hazard(e, { kind: 'eliteSwipe', atlas: 'kayak', cell: 10, x: p.targetX, y: p.targetY, radius: 125, delay: .8, ttl: .2, damage: e.power });
      if (!p.charge) return;
    }
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
      // Preparation is communicated by the boss animation; no ground target overlay.
      this.hazard(e, { kind: 'shock', x: p.targetX, y: p.targetY, radius: enhanced ? 145 : 120, delay: .65 * scale, ttl: .18, damage: e.power * 1.2 });
      if (p.kind === 'burpees') { e.x = p.targetX; e.y = p.targetY; e.z = 80; e.vz = 160; }
      if (enhanced) this.hazard(e, { kind: 'shock', x: p.targetX + 150 * e.facing, y: p.targetY, radius: 100, delay: 1.1 * scale, ttl: .18 });
    }
  },
};
