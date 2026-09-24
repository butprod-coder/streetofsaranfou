import { BALANCE } from './balance.js';
import { FLOOR, clamp } from './data.js';
import { hasTalent } from './rogue-talents.js';
import { HEAVY_ENEMIES } from './weapons.js';

// Rendering and collision use the same three car centres, including near a wall.
export function golfBodies(player) {
  return (player.specialState?.convoi ? [-65, 0, 65] : [0]).map(lane => ({
    lane,
    x: clamp(player.x - (lane ? player.facing * 55 : 0), FLOOR.left, FLOOR.right),
    y: clamp(player.y + lane, FLOOR.top, FLOOR.bottom),
  }));
}

function intersectsSweep(target, from, to, radius, band) {
  const dx = (to.x - from.x) / radius, dy = (to.y - from.y) / band;
  const tx = (target.x - from.x) / radius, ty = (target.y - from.y) / band;
  const length = dx * dx + dy * dy;
  const along = length ? clamp((tx * dx + ty * dy) / length, 0, 1) : 0;
  return (tx - dx * along) ** 2 + (ty - dy * along) ** 2 <= 1;
}

export const golfCombat = {
  updateGolf(p, input, dt) {
    const a = p.specialState, b = BALANCE.specials.karonux;
    const driveEnd = a.duration - b.exitDuration;
    const driveDt = Math.max(0, Math.min(a.elapsed, driveEnd) - Math.max(a.elapsed - dt, b.golfAt));
    const specialTap = input.taps?.special || 0;
    const reversePressed = !!input.special && !a.specialHeld || specialTap > a.specialTap;
    a.specialHeld = !!input.special; a.specialTap = specialTap;
    p.vx = 0; p.vy = 0;

    if (driveDt > 0) {
      const previous = golfBodies(p);
      if (!a.hit) { a.hit = true; this.event('golf', { actor: p.id, x: p.x, y: p.y }); }
      if (reversePressed && hasTalent(p, 'Marche arrière sauvage') && a.elapsed >= (a.reverseReady || b.golfAt)) {
        p.facing *= -1; a.boostUntil = a.elapsed + b.reverseDuration; a.reverseReady = a.elapsed + b.reverseCooldown;
        a.driftY = hasTalent(p, 'Demi-tour interdit') ? clamp(input.y || 0, -1, 1) : 0;
        this.event('skid', { actor: p.id, x: p.x, y: p.y, facing: p.facing });
      }
      const boosting = a.elapsed < (a.boostUntil || 0);
      const x = boosting ? p.facing : clamp(input.x || 0, -1, 1);
      const y = clamp(input.y || 0, -1, 1);
      const norm = Math.max(1, Math.hypot(x, y));
      if (x) p.facing = Math.sign(x);
      const oldX = p.x, oldY = p.y;
      p.x = clamp(p.x + x / norm * (boosting ? b.reverseSpeed : b.speedX) * driveDt, FLOOR.left, FLOOR.right);
      p.y = clamp(p.y + (boosting && a.driftY ? a.driftY * b.driftSpeed : y / norm * b.speedY) * driveDt, FLOOR.top, FLOOR.bottom);
      a.moving = p.x !== oldX || p.y !== oldY;
      p.invincible = Math.max(p.invincible, .06);

      const bodies = golfBodies(p);
      for (const target of [...this.state.enemies, ...this.state.props.filter(q => !(q.kind === 'easel' && !q.enemy))]) {
        if (target.hp <= 0) continue;
        const enemy = this.state.enemies.includes(target);
        const hit = a.hits[target.id] ||= { count: 0, next: 0, touching: false };
        const lane = bodies.findIndex((body, i) => intersectsSweep(target, previous[i], body, b.radius * p.bonuses.radius, 46 * p.bonuses.radius));
        const touching = bodies.some(body => intersectsSweep(target, body, body, b.radius * p.bonuses.radius, 46 * p.bonuses.radius));
        // Leaving and re-entering is required: idling or shuttling cannot multiply hits.
        if (a.moving && lane >= 0 && (hit.count === 0 || !hit.touching) && hit.count < (enemy ? b.maxHits : 1) && a.elapsed >= hit.next && !(enemy && target.invincible > 0)) {
          hit.count++; hit.next = a.elapsed + b.hitCooldown;
          if (enemy) {
            this.damage(target, Math.round(p.specialPower * b.damage), p, true);
            if (target.hp > 0 && !target.boss && !target.vehicle && !HEAVY_ENEMIES.has(target.kind) && hasTalent(p, 'Pare-chocs aimanté')) {
              target.rogueCarried = { owner: p.id, lane: bodies[lane].lane };
              if (hasTalent(p, 'Carambolage')) target.rogueCollision = { owner:p.id, ttl:.6, hits:[], dx:p.facing, power:.7 };
            }
          } else this.hitProp(target, 2, p);
        }
        hit.touching = touching;
      }
    }

    for (const e of this.state.enemies) if (e.rogueCarried?.owner === p.id) {
      if (a.elapsed < driveEnd && e.hp > 0) {
        e.x = clamp(p.x + p.facing * 90, FLOOR.left, FLOOR.right);
        e.y = clamp(p.y + e.rogueCarried.lane, FLOOR.top, FLOOR.bottom);
        e.vx = 0; e.vy = 0; e.stun = Math.max(e.stun, .1);
      } else { e.vx = p.facing * 620; e.rogueCarried = null; }
    }
    if (a.elapsed >= driveEnd) { a.moving = false; p.action = 'idle'; }
    // No parking teleport: Karonux gets out wherever the player stopped the car.
  },
};
