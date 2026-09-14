import { STREET_ENEMIES, STREET_RULES as R } from './street-enemies-data.js';
import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';

export const streetEnemies = {
  updateStreetEnemy(e, target, dt) {
    const s = this.state, b = STREET_ENEMIES[e.kind], mode = difficulty(s.difficulty);
    if (e.hp <= 0 || e.stun > 0 || e.grabbedBy || !['fight', 'surprise'].includes(s.phase)) return;
    if (e.pattern) {
      const p = e.pattern;
      p.elapsed += dt; e.action = 'special';
      // The bluff moves only during its tell; the jab keeps its original direction.
      if (p.kind === 'bluff' && p.elapsed < p.windup * .45) {
        e.y = clamp(e.y + p.sidestep * 105 * dt, FLOOR.top, FLOOR.bottom);
      }
      if (!p.hit && p.elapsed >= p.windup) { p.hit = true; this.executeStreetPattern(e, p); }
      if (p.hit && p.kind === 'supporterCharge' && p.elapsed < p.windup + p.active) {
        e.x = clamp(e.x + p.dx * 395 * mode.speed * dt, FLOOR.left, FLOOR.right);
        e.y = clamp(e.y + p.dy * 395 * mode.speed * dt, FLOOR.top, FLOOR.bottom);
        // One travelling hitbox keeps a separate hit ledger for each player.
        const hitbox = s.hazards.find(h => h.id === p.hitbox);
        if (hitbox) { hitbox.x = e.x; hitbox.y = e.y; }
      }
      if (p.elapsed >= p.windup + p.active) {
        e.pattern = null; e.cooldown = b.recovery * mode.recovery; e.recovering = e.cooldown; e.action = 'idle';
      }
      return;
    }
    const dx = target.x - e.x, dy = target.y - e.y, distance = Math.hypot(dx, dy * 1.5);
    e.facing = Math.sign(dx) || e.facing;
    const occupied = s.enemies.filter(a => a.hp > 0 && (a.pattern || a.attack && !a.attack.hit)).length;
    const limit = s.players.length > 1 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo;
    if (e.cooldown <= 0 && distance < b.range && occupied < limit) {
      const sequence = e.eliteState.sequence || 0; e.eliteState.sequence = sequence + 1;
      const close = distance < 130;
      const kind = ['oliver', 'titou'].includes(e.kind) ? close ? b.alternate : b.pattern
        : sequence % 2 && (e.kind !== 'albero' || distance < 220) ? b.alternate : b.pattern;
      const d = Math.max(1, Math.hypot(dx, dy));
      e.pattern = { kind, elapsed: 0, windup: b.windup * mode.telegraph, active: b.active, hit: false,
        dx: dx / d, dy: dy / d, targetX: target.x, targetY: target.y,
        sidestep: e.y > (FLOOR.top + FLOOR.bottom) / 2 ? -1 : 1,
        signature: kind === b.pattern && kind !== 'supporterCharge' };
      e.action = 'special'; e.actionTime = 0;
      return;
    }
    if (e.recovering > .6) { e.action = 'idle'; return; }
    const goal = clamp(target.x - e.facing * b.distance, FLOOR.left, FLOOR.right);
    const d = Math.max(1, Math.hypot(goal - e.x, dy * 1.5));
    e.action = 'idle';
    if (Math.abs(goal - e.x) > 10 || Math.abs(dy) > 12) {
      e.x = clamp(e.x + (goal - e.x) / d * e.speed * dt, FLOOR.left, FLOOR.right);
      e.y = clamp(e.y + dy / d * e.speed * .75 * dt, FLOOR.top, FLOOR.bottom); e.action = 'walk';
    }
  },
  executeStreetPattern(e, p) {
    const s = this.state;
    if (p.kind === 'supporterCharge') {
      p.hitbox = this.hazard(e, { kind: 'impact', radius: 68, delay: 0, ttl: p.active, pulse: 2, damage: e.power }).id;
    } else if (p.kind === 'tacoVolley' || p.kind === 'fastTalk') {
      const count = Math.max(0, Math.min(2, R.projectileLimit - s.hazards.filter(h => h.kind === 'streetProjectile').length));
      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(p.targetY - e.y, p.targetX - e.x) + (i - (count - 1) / 2) * .16;
        this.hazard(e, { kind: 'streetProjectile', atlas: e.kind, cell: 9, radius: 24, delay: i * .16,
          ttl: 2.3, pulse: 3, vx: Math.cos(angle) * 325, vy: Math.sin(angle) * 325, damage: e.power * .8 });
      }
    } else if (p.kind === 'huntingDog') {
      if (s.hazards.some(h => h.kind === 'huntingDog' && h.owner === e.id) || s.hazards.filter(h => h.kind === 'huntingDog').length >= R.dogLimit) return;
      this.hazard(e, { kind: 'huntingDog', atlas: 'titou', x: e.x + e.facing * 45, radius: 39,
        vx: p.dx * 380, vy: p.dy * 380, delay: 0, ttl: 1.7, pulse: 2, damage: e.power });
    } else if (p.kind === 'puddle') {
      const count = Math.max(0, Math.min(2, R.puddleLimit - s.hazards.filter(h => h.kind === 'streetPuddle').length));
      for (let i = 0; i < count; i++) this.hazard(e, { kind: 'streetPuddle', atlas: 'cedric', cell: 10,
        x: e.x + e.facing * (45 + i * 70), y: e.y + (i ? 23 : -23), radius: 48,
        delay: 0, ttl: R.puddleDuration, pulse: 1.2, damage: e.power * .4 });
    } else {
      const shout = p.kind === 'megaphone';
      this.hazard(e, { kind: shout ? 'streetFX' : 'impact', atlas: e.kind, cell: 9, shape: 'line',
        width: shout ? 225 : e.kind === 'pichoff' ? 155 : 135, band: shout ? 58 : 45,
        delay: 0, ttl: .18, damage: e.power * (shout ? .8 : 1), pulse: 1 });
    }
  },
};
