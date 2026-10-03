import { WEAPONS } from './weapons.js';
import { clamp, FLOOR } from './data.js';

export const heavyWeapons = {
  fireHeavyWeapon(p, kind) {
    const b = WEAPONS[kind], damage = Math.round(p.power * b.power * (p.bonuses.weaponPower || 1));
    const shot = { id: this.nextId++, owner: p.id, kind: b.projectile, x: p.x + p.facing * 36, y: p.y, facing: p.facing, elapsed: 0, damage, hits: {}, fromX: p.x + p.facing * 36 };
    shot.critical = this.criticalStrike(p)?.critical ?? false;
    if (shot.kind === 'foam') p.vx -= p.facing * 360;
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
      if (['cart', 'football', 'foam'].includes(shot.kind)) {
        const foam = shot.kind === 'foam', ball = shot.kind === 'football';
        const before = shot.x;
        if (!foam) shot.x += shot.facing * (ball ? 720 : 580) * dt;
        for (const e of s.enemies) {
          if (e.hp <= 0 || e.invincible > 0 || e.z > 40 || shot.hits[e.id]) continue;
          const inRange = foam ? (e.x - shot.x) * shot.facing >= -15 && (e.x - shot.x) * shot.facing <= 230 : e.x >= Math.min(before, shot.x) - (ball ? 22 : 50) && e.x <= Math.max(before, shot.x) + (ball ? 22 : 50);
          if (!inRange || Math.abs(e.y - shot.y) > (foam ? 65 : ball ? 30 : 42)) continue;
          shot.hits[e.id] = true;
          this.damage(e, shot.damage, owner, !foam, true, shot);
          e.vx = shot.facing * (foam ? 210 : 430);
          if (foam) { e.blindedUntil = s.time + 1.8; e.attack = null; e.pattern = null; e.newPattern = null; }
        }
        // A nearby kick sends the live ball back, including the partner's kick.
        if (ball) for (const player of s.players) {
          if (player.hp <= 0 || player.attack?.type !== 'kick' || player.attack.hit || player.z > 30 || Math.abs(player.x - shot.x) > 80 || Math.abs(player.y - shot.y) > 35 || (shot.kickReadyAt || 0) > s.time) continue;
          shot.kickReadyAt = s.time + .6; shot.owner = player.id; shot.facing = player.facing; shot.hits = {}; shot.elapsed = 0; shot.fromX = shot.x;
          this.event('swing', { actor: player.id, x: shot.x, y: shot.y - 20 });
        }
        if (shot.elapsed >= (foam ? .5 : ball ? 1.8 : 1.25) || shot.x < FLOOR.left - 60 || shot.x > FLOOR.right + 60) return false;
        return true;
      }
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
