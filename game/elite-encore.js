import { ENCORE_ELITES, ENCORE_RULES as R } from './elite-encore-data.js';
import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';
const charges = { palletRush: 480, palletSkid: 320, sprint: 470, hurdle: 400, tractorRush: 390 };
export const encore = {
  updateEncore(e, target, dt) {
    const s = this.state, b = ENCORE_ELITES[e.kind], mode = difficulty(s.difficulty);
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special';
      if (!p.hit && p.elapsed >= p.windup) { p.hit = true; this.executeEncore(e, p); }
      if (p.hit && p.elapsed < p.windup + p.active) {
        if (charges[p.kind]) {
          e.x += p.dx * charges[p.kind] * mode.speed * dt; e.y += p.dy * charges[p.kind] * mode.speed * dt;
          if (p.kind === 'hurdle') { e.z = Math.sin((p.elapsed - p.windup) / p.active * Math.PI) * 55; e.vz = 0; }
          if (p.elapsed >= (p.nextHit || 0)) {
            this.hazard(e, { kind: 'impact', radius: p.kind === 'tractorRush' ? 105 : 74, delay: 0, ttl: .06, damage: e.power }); p.nextHit = p.elapsed + .65;
          }
        } else if (p.kind === 'breakdance' && p.elapsed >= (p.nextHit || 0)) {
          this.hazard(e, { kind: 'encoreFX', atlas: e.kind, cell: 10, radius: 132, delay: 0, ttl: .12, damage: e.power * .8 }); p.nextHit = p.elapsed + .6;
        }
      }
      if (p.elapsed >= p.windup + p.active) { e.pattern = null; e.z = 0; e.vz = 0; e.cooldown = b.recovery * mode.recovery; e.recovering = e.cooldown; e.action = 'idle'; }
    } else {
      if (e.stun > 0) return;
      const dx = target.x - e.x, dy = target.y - e.y, distance = Math.hypot(dx, dy * 1.5);
      e.facing = Math.sign(dx) || e.facing;
      const occupied = s.enemies.filter(a => a.hp > 0 && (a.pattern || a.attack && !a.attack.hit)).length;
      const range = e.kind === 'rappeur' && !(e.eliteState.sequence % 2) ? 125 : b.range;
      if (e.cooldown <= 0 && distance < range && occupied < (s.players.length > 1 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo)) {
        const n = e.eliteState.sequence || 0; e.eliteState.sequence = n + 1;
        const kind = e.kind === 'poids' ? distance < 115 ? b.alternate : b.pattern : n % 2 && (!['tracteur', 'elephant'].includes(e.kind) || distance < 140) ? b.alternate : b.pattern;
        const d = Math.max(1, Math.hypot(dx, dy));
        e.pattern = { kind, secondary: kind === b.alternate, elapsed: 0, windup: b.windup * mode.telegraph, active: b.active, targetX: target.x, targetY: target.y, dx: dx / d, dy: dy / d, hit: false };
        e.actionTime = 0; e.action = 'special';
      } else if ((e.recovering || 0) <= .6) {
        const desired = b.ranged ? 290 : e.kind === 'rappeur' ? 110 : e.kind === 'elephant' ? 130 : 175, goal = clamp(target.x - e.facing * desired, FLOOR.left, FLOOR.right);
        const d = Math.max(1, Math.hypot(goal - e.x, dy * 1.5));
        if (Math.abs(goal - e.x) > 10 || Math.abs(dy) > 12) { e.x += (goal - e.x) / d * e.speed * dt; e.y += dy / d * e.speed * .75 * dt; e.action = 'walk'; }
      }
    }
    if (['transpalette', 'tracteur'].includes(e.kind)) e.x = clamp(e.x, FLOOR.left + 65, FLOOR.right - 65);
  },
  executeEncore(e, p) {
    const s = this.state;
    if (charges[p.kind]) { this.event('skid', { x: e.x, y: e.y, facing: e.facing }); return; }
    if (p.kind === 'trunk' || p.kind === 'athletePunch') {
      this.hazard(e, { kind: 'encoreFX', atlas: e.kind, cell: p.kind === 'trunk' ? 9 : 10, shape: 'line', width: p.kind === 'trunk' ? 205 : 125, band: 43, delay: 0, ttl: .16, damage: e.power });
    } else if (p.kind === 'elephantStomp' || p.kind === 'tractorSlam') {
      this.hazard(e, { kind: 'encoreFX', atlas: e.kind, cell: 10, radius: 150, delay: 0, ttl: .18, damage: e.power });
    } else if (p.kind === 'shotPut') {
      if (s.hazards.filter(h => h.kind === 'shotPut').length >= 2) return;
      this.hazard(e, { kind: 'shotPut', atlas: e.kind, cell: 9, x: p.targetX, y: p.targetY, fromX: e.x, fromY: e.y - 85, flight: R.shotFlight, delay: R.shotFlight, radius: 62, ttl: .22, damage: e.power * 1.15 });
    } else if (p.kind === 'seedSpit' || p.kind === 'micBeat') {
      const count = Math.min(p.kind === 'micBeat' ? 3 : 2, R.projectileLimit - s.hazards.filter(h => h.kind === 'encoreProjectile').length);
      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(p.targetY - e.y, p.targetX - e.x) + (i - (count - 1) / 2) * .2;
        this.hazard(e, { kind: 'encoreProjectile', atlas: e.kind, cell: 9, radius: 23, delay: .16 * i, ttl: 2.6, vx: Math.cos(angle) * 310, vy: Math.sin(angle) * 310, damage: e.power * .85 });
      }
    } else if (p.kind === 'plantGarden') {
      const count = Math.min(R.plantsPerCast, R.plantLimit - s.hazards.filter(h => h.kind === 'plant').length);
      for (let i = 0; i < count; i++) this.hazard(e, { kind: 'plant', atlas: e.kind, cell: 10, x: clamp(p.targetX + (i ? 115 : -115), FLOOR.left + 45, FLOOR.right - 45), y: p.targetY, radius: 66, delay: R.plantDelay, ttl: R.plantDuration, damage: e.power, pulse: R.plantCycle });
    }
  },
};
