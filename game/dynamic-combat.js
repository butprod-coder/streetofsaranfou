import { DYNAMIC_ENEMIES } from './dynamic-enemies-data.js';
import { FLOOR, clamp } from './data.js';
import { WEAPONS } from './weapons.js';

export const dynamicCombat = {
  shieldBlocks(target, source) {
    if (target.kind !== 'shieldGuard' || target.hp <= 0 || target.stun > 0 || target.recovering > 0 || target.grabbedBy || target.thrown || source.areaDamage || source.specialState || WEAPONS[source.attack?.weapon]?.projectile) return false;
    if ((source.x - target.x) * target.facing < -10 || Math.abs(source.y - target.y) > 75) return false;
    target.flash = .12;
    if (this.state.time >= (target.shieldHintAt || 0)) { target.shieldHintAt = this.state.time + 1; this.event('opening', { x: target.x, y: target.y - 160, label: 'BOUCLIER · PASSE DANS SON DOS !' }); this.event('shieldBlock', { x: target.x, y: target.y - 75 }); }
    return true;
  },
  updateDynamicEnemy(e, dt) {
    const s = this.state;
    if (!DYNAMIC_ENEMIES[e.kind]) return false;
    if (e.hp <= 0 || e.stun > 0 || e.attack || e.z > 0 || !['fight', 'surprise'].includes(s.phase)) return true;
    const target = s.players.filter(p => p.hp > 0 && !p.joInvisible).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (!target) return true;
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special'; e.moving = false;
      if (p.elapsed < p.windup) return true;
      e.pattern = null; e.cooldown = e.kind === 'laneShooter' ? 2.5 : 1.7; e.recovering = .8;
      if (e.kind === 'kamikaze') {
        this.hazard(e, { kind: 'chainBlast', radius: 150, damage: e.power, delay: 0, ttl: .16, pulse: 2, both: true, propDamage: 4, bypassShield: true });
        this.damage(e, e.hp + 1, { ...e, areaDamage: true }, true);
      } else if (e.kind === 'laneShooter') {
        this.hazard(e, { kind: 'laneBullet', shape: 'line', x: e.x, y: p.targetY, facing: p.facing, width: 760, band: 18, delay: 0, ttl: .12, pulse: 2, damage: e.power });
        this.event('gunshot', { actor: e.id, x: e.x + p.facing * 45, y: p.targetY - 90, facing: p.facing, range: 760, weapon: 'pistol' });
      } else this.hazard(e, { kind: 'impact', shape: 'line', width: 115, band: 40, delay: 0, ttl: .12, pulse: 2, damage: e.power, knockback: 260 });
      return true;
    }
    const dx = target.x - e.x, dy = target.y - e.y;
    if (e.kind !== 'shieldGuard' || s.time >= (e.turnAt || 0)) { e.facing = Math.sign(dx) || e.facing; e.turnAt = s.time + .8; }
    const occupied = s.enemies.filter(a => a.hp > 0 && (a.pattern || a.attack && !a.attack.hit)).length;
    const limit = s.players.length > 1 ? 3 : 2;
    const inRange = e.kind === 'kamikaze' ? Math.hypot(dx, dy * 1.5) < 150 : e.kind === 'laneShooter' ? Math.abs(dx) < 760 && Math.abs(dy) < 35 : dx * e.facing > 0 && Math.abs(dx) < 115 && Math.abs(dy) < 40;
    if (e.cooldown <= 0 && inRange && occupied < limit) {
      e.pattern = { kind: e.kind, elapsed: 0, windup: e.kind === 'kamikaze' ? 1.4 : e.kind === 'laneShooter' ? 1.15 : .9, facing: e.facing, targetY: target.y };
      e.action = 'special'; e.moving = false;
      this.event('opening', { x: e.x, y: e.y - 170, label: e.kind === 'kamikaze' ? 'MÈCHE ALLUMÉE · FRAPPE OU ÉLOIGNE-TOI !' : e.kind === 'laneShooter' ? 'TIR EN PRÉPARATION · CHANGE DE LIGNE !' : 'COUP DE BOUCLIER !' });
      return true;
    }
    if (e.recovering > 0) { e.action = 'idle'; return true; }
    const desired = clamp(target.x - e.facing * (e.kind === 'laneShooter' ? 360 : 80), FLOOR.left, FLOOR.right);
    const length = Math.max(1, Math.hypot(desired - e.x, dy * 1.5));
    e.moving = Math.abs(desired - e.x) > 10 || Math.abs(dy) > 10; e.action = e.moving ? 'walk' : 'idle';
    if (e.moving) { e.x = clamp(e.x + (desired - e.x) / length * e.speed * dt, FLOOR.left, FLOOR.right); e.y = clamp(e.y + dy / length * e.speed * .8 * dt, FLOOR.top, FLOOR.bottom); }
    return true;
  },
};
