import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';

const rival = (name, hero, color, pattern, tell, extra = {}) => ({
  name, firstName: name, costume: true, portrait: `/assets/${hero}/${hero}_p.png`, color,
  hp: 105, speed: 140, power: 12, reach: 100, score: 420, height: 145,
  pattern, alternate: pattern, windup: 1, active: .5, recovery: 2.4, range: 550, distance: 230, tell, ...extra,
});
export const COSTUME_ENEMIES = {
  lorenzo_pigeons: rival('Les pigeons de Lorenzo', 'lorenzo', '#a8bccb', 'pigeonDive', 'ENVOL… ATTENTION AU PIQUÉ !', { hp: 80, range: 245, distance: 130, windup: 1.2, active: .65 }),
  titou_bowling: rival('Titou · Bowling', 'karonux', '#efac50', 'bowling', 'STRIKE ! · QUITTE LA TRAJECTOIRE'),
  yann_fluo: rival('Yann · Soirée fluo', 'yanu', '#73ff44', 'neon', 'LASERS FLUO · CHANGE DE LIGNE'),
  kikor_velo: rival('Kikor · Roue avant', 'kikor', '#67bbff', 'stoppie', 'ROUE AVANT · ÉCARTE-TOI !', { speed: 185, active: .75 }),
  jo_rose: rival('Jo La Mouk · Tout en rose', 'jo', '#ff43b7', 'sticky', 'CÂLIN COLLANT !', { range: 105, distance: 35, windup: .65, speed: 175 }),
  karonux_plongeur: rival('Karonux · Plongeur', 'karonux', '#44dbe4', 'flippers', 'COUP DE PALMES !', { range: 190, distance: 100, active: .35 }),
  gustavax_diable: rival('Gustavax · Diable', 'gustavax', '#ff542e', 'hell', 'LES ENFERS · CHANGE DE LIGNE !', { windup: 1.35, recovery: 3.3 }),
  jualos_karaoke: rival('Jualos · Karaoké', 'jualos', '#e9bd78', 'karaoke', 'KARAOKÉ · SORS DU CERCLE !', { range: 270, distance: 120, windup: 1.2, recovery: 3 }),
};

export function updateCostumeEnemy(e, target, dt) {
  const s = this.state, b = COSTUME_ENEMIES[e.kind], mode = difficulty(s.difficulty);
  if (e.hp <= 0 || e.stun > 0 || e.grabbedBy || !['fight', 'surprise'].includes(s.phase)) return;
  if (e.pattern) {
    const p = e.pattern; p.elapsed += dt; e.action = 'special';
    if (!p.hit && p.elapsed >= p.windup) { p.hit = true; executeCostumePattern.call(this, e, p); }
    if (p.hit && ['pigeonDive', 'stoppie'].includes(p.kind)) {
      e.x = clamp(e.x + p.dx * 430 * dt, FLOOR.left, FLOOR.right);
      e.y = clamp(e.y + p.dy * 430 * dt, FLOOR.top, FLOOR.bottom);
      const h = s.hazards.find(h => h.id === p.hitbox); if (h) { h.x = e.x; h.y = e.y; }
    }
    if (p.elapsed >= p.windup + p.active) { e.pattern = null; e.cooldown = b.recovery * mode.recovery; e.action = 'idle'; }
    return;
  }
  const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy * 1.5);
  e.facing = Math.sign(dx) || e.facing;
  const occupied = s.enemies.filter(a => a.hp > 0 && (a.pattern || a.attack && !a.attack.hit)).length;
  if (e.cooldown <= 0 && d < b.range && occupied < (s.players.length > 1 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo)) {
    const length = Math.max(1, Math.hypot(dx, dy));
    const p = e.pattern = { kind: b.pattern, elapsed: 0, windup: b.windup * mode.telegraph, active: b.active, hit: false,
      dx: dx / length, dy: dy / length, targetX: target.x, targetY: target.y };
    e.action = 'special';
    if (p.kind === 'karaoke') this.hazard(e, { kind: 'karaoke', costumeFX: true, radius: 185, damage: 0, delay: p.windup, ttl: .01 });
    if (p.kind === 'bowling') {
      p.pinX = clamp(target.x + Math.sign(dx || 1) * 130, FLOOR.left, FLOOR.right); p.pinY = target.y;
      this.hazard(e, { kind: 'bowlingPins', costumeFX: true, x: p.pinX, y: p.pinY, damage: 0, delay: 0, ttl: p.windup + 2.5 });
    }
    return;
  }
  // The flock waits on the pavement until a player approaches.
  if (pigeonRest(e, d)) { e.action = 'idle'; return; }
  const gx = target.x - e.facing * b.distance - e.x, length = Math.max(1, Math.hypot(gx, dy * 1.5));
  e.action = Math.abs(gx) > 12 || Math.abs(dy) > 12 ? 'walk' : 'idle';
  if (e.action === 'walk') { e.x = clamp(e.x + gx / length * e.speed * dt, FLOOR.left, FLOOR.right); e.y = clamp(e.y + dy / length * e.speed * .75 * dt, FLOOR.top, FLOOR.bottom); }
}
const pigeonRest = (e, d) => e.kind === 'lorenzo_pigeons' && d >= 245;

export function executeCostumePattern(e, p) {
  const hit = options => this.hazard(e, { costumeFX: true, delay: 0, ttl: .3, pulse: 2, damage: e.power, ...options });
  if (['pigeonDive', 'stoppie'].includes(p.kind)) p.hitbox = hit({ kind: p.kind, radius: 65, ttl: p.active }).id;
  else if (p.kind === 'bowling') {
    const angle = Math.atan2(p.pinY - e.y, p.pinX - e.x);
    hit({ kind: 'bowlingBall', radius: 28, ttl: 2.5, vx: Math.cos(angle) * 470, vy: Math.sin(angle) * 470 });
  } else if (['neon', 'hell'].includes(p.kind)) {
    for (const offset of (p.kind === 'hell' ? [-48, 48] : [0])) hit({ kind: p.kind, shape: 'line', x: FLOOR.left, y: clamp(p.targetY + offset, FLOOR.top, FLOOR.bottom), facing: 1,
      width: FLOOR.right - FLOOR.left, band: p.kind === 'hell' ? 24 : 19, delay: .65, ttl: 1.1, pulse: .55, damage: e.power * .65 });
  } else if (p.kind === 'karaoke') hit({ kind: 'karaoke', radius: 185, ttl: .7, stunDuration: 1.15 });
  else if (p.kind === 'sticky') hit({ kind: 'sticky', radius: 80, sticky: true, damage: 5 });
  else hit({ kind: 'flippers', shape: 'line', width: 180, band: 45 });
}
