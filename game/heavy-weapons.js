import { WEAPONS } from './weapons.js';
import { clamp, FLOOR } from './data.js';

export const heavyWeapons = {
  fireHeavyWeapon(p, kind) {
    const b = WEAPONS[kind], damage = Math.round(p.power * b.power * (p.bonuses.weaponPower || 1));
    const shot = { id: this.nextId++, owner: p.id, kind: b.projectile, x: p.x + p.facing * 36, y: p.y, facing: p.facing, elapsed: 0, damage, hits: {}, fromX: p.x + p.facing * 36 };
    shot.critical = this.criticalStrike(p)?.critical ?? false;
    if (shot.kind === 'grenade') {
      const target = this.state.enemies.filter(e => e.hp > 0 && (e.x - p.x) * p.facing > 60 && (e.x - p.x) * p.facing <= b.range && Math.abs(e.y - p.y) < b.band).sort((a, z) => Math.abs(a.x - p.x) - Math.abs(z.x - p.x))[0];
      shot.toX = clamp(target?.x ?? p.x + p.facing * b.range, FLOOR.left, FLOOR.right);
    }
    (this.state.weaponProjectiles ||= []).push(shot);
    this.event('heavyFire', { actor: p.id, weapon: kind, x: shot.x, y: p.y - 90, facing: p.facing });
    if (shot.kind === 'rocket') p.vx -= p.facing * 220;
  },
  explodeWeapon(shot, owner) {
    const radius = shot.kind === 'rocket' ? 145 : 170;
    for (const e of this.state.enemies) if (e.hp > 0 && e.invincible <= 0 && e.z < 70 && Math.hypot(e.x - shot.x, (e.y - shot.y) * 1.5) <= radius) this.damage(e, shot.damage, { ...owner, x: shot.x, y: shot.y, areaDamage: true }, true, true, shot);
    for (const prop of this.state.props) if (prop.hp > 0 && Math.hypot(prop.x - shot.x, (prop.y - shot.y) * 1.5) <= radius) this.hitProp(prop, 4, owner);
    this.event('weaponExplosion', { x: shot.x, y: shot.y - 50, radius });
  },
  updateWeaponProjectiles(dt) {
    const s = this.state;
    s.weaponProjectiles = (s.weaponProjectiles || []).filter(shot => {
      const owner = s.players.find(p => p.id === shot.owner); if (!owner) return false;
      shot.elapsed += dt;
      if (shot.kind === 'rocket') {
        const before = shot.x; shot.x += shot.facing * 780 * dt;
        const impacts = [...s.enemies.filter(e => e.hp > 0 && e.z < 60), ...s.props.filter(p => p.hp > 0)].filter(e => Math.abs(e.y - shot.y) < 35 && e.x >= Math.min(before, shot.x) - 18 && e.x <= Math.max(before, shot.x) + 18).sort((a, b) => Math.abs(a.x - before) - Math.abs(b.x - before));
        if (impacts.length) shot.x = impacts[0].x;
        if (impacts.length || Math.abs(shot.x - shot.fromX) >= 850 || shot.x < FLOOR.left || shot.x > FLOOR.right) { this.explodeWeapon(shot, owner); return false; }
      } else if (shot.kind === 'grenade') {
        const t = Math.min(1, shot.elapsed / .55); shot.x = shot.fromX + (shot.toX - shot.fromX) * t; shot.z = 80 * (1 - t) + Math.sin(t * Math.PI) * 110;
        if (shot.elapsed >= .75) { this.explodeWeapon(shot, owner); return false; }
      } else {
        const pulse = Math.floor(shot.elapsed / .18);
        for (const e of s.enemies) if (e.hp > 0 && e.invincible <= 0 && e.z < 55 && (e.x - shot.x) * shot.facing >= -20 && (e.x - shot.x) * shot.facing <= 285 && Math.abs(e.y - shot.y) <= 62 && shot.hits[e.id] !== pulse) { shot.hits[e.id] = pulse; this.damage(e, shot.damage, owner, false, true, shot); }
        for (const prop of s.props) if (prop.hp > 0 && !shot.hits[`prop${prop.id}`] && (prop.x - shot.x) * shot.facing >= 0 && (prop.x - shot.x) * shot.facing <= 285 && Math.abs(prop.y - shot.y) <= 62) { shot.hits[`prop${prop.id}`] = true; this.hitProp(prop, 2, owner); }
        if (shot.elapsed >= .5) return false;
      }
      return true;
    });
  },
};
