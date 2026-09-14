import { FLOOR, clamp } from './data.js';
import { HEAVY_ENEMIES } from './weapons.js';
export const enemyTactics = {
  updateTactics(e, dt) {
    if (e.hp <= 0 || e.boss || e.attack || e.pattern || e.stun > 0 || e.z > 0 || e.eliteState?.seated || !['fight', 'surprise'].includes(this.state.phase)) return false;
    const target = this.state.players.filter(p => p.hp > 0).sort((a,b) => Math.hypot(a.x-e.x,a.y-e.y) - Math.hypot(b.x-e.x,b.y-e.y))[0];
    if (!target) return false;
    e.ai ||= { wait: 1 + this.random() * 2 };
    const ai = e.ai; ai.wait -= dt;
    const dx = target.x - e.x, dy = target.y - e.y;
    if (ai.time > 0) {
      ai.time -= dt;
      if (ai.warning > 0) { ai.warning -= dt; return true; }
      e.x = clamp(e.x + ai.dx * e.speed * ai.speed * dt, FLOOR.left, FLOOR.right);
      e.y = clamp(e.y + ai.dy * e.speed * .7 * ai.speed * dt, FLOOR.top, FLOOR.bottom);
      e.facing = Math.sign(dx) || e.facing; e.action = 'walk'; e.moving = true;
      return true;
    }
    if (ai.wait > 0) return false;
    ai.wait = 2.8 + this.random() * 2.5;
    const heavy = HEAVY_ENEMIES.has(e.kind), danger = target.attack && target.attack.elapsed >= .08 && Math.abs(dx) < 170 && Math.abs(dy) < 55;
    const roll = this.random();
    if (danger && !heavy && roll < .5) {
      ai.dx = -.25 * Math.sign(dx); ai.dy = e.y > (FLOOR.top + FLOOR.bottom) / 2 ? -1 : 1; ai.speed = 1.5; ai.time = .5; ai.warning = .14;
    } else if (Math.abs(dx) > 260 && roll < .6) {
      ai.dx = Math.sign(dx); ai.dy = clamp(dy / 160, -.5, .5); ai.speed = heavy ? 1.2 : 1.65; ai.time = .65; ai.warning = .22;
      this.event('opening', { x: e.x, y: e.y - 120, label: 'SPRINT !' });
    } else if (Math.abs(dx) < 230) {
      ai.dx = Math.sign(dx) * (roll < .5 ? -.65 : .5); ai.dy = this.random() < .5 ? -1 : 1; ai.speed = .85; ai.time = .65; ai.warning = .1;
    }
    return false;
  },
};
