import { clamp } from './data.js';

export const STREET_ACTION = { binSpeed: 720, binDamage: 24, carSpeed: 740, carDamage: 18, warning: 1.8, interval: 18, maxCars: 2 };
export const trafficStreet = s => [0, 3, 4].includes(s.chapter) && [2, 4].includes(s.stage) && !s.practice && !s.sandbox;
const intersects = (x0, x1, actor, halfWidth, y, band) => actor.x >= Math.min(x0, x1) - halfWidth && actor.x <= Math.max(x0, x1) + halfWidth && Math.abs(actor.y - y) < band;

/** All motion, damage and warnings live in the shared authoritative simulation. */
export const streetAction = {
  resetStreetAction() { this.state.traffic = null; this.state.trafficTimer = 9; this.state.trafficCount = 0; },
  launchBin(bin, source) {
    if (bin.hp <= 0 || source?.enemy || !source) return false;
    bin.vx = (source.facing || 1) * STREET_ACTION.binSpeed; bin.owner = source.id; bin.rollTime = 1.5; bin.flash = .16;
    this.event('binKick', { x: bin.x, y: bin.y - 40, facing: source.facing });
    return true;
  },
  startTraffic() {
    const s = this.state;
    if (!trafficStreet(s) || s.phase !== 'fight' || s.traffic || s.trafficCount >= STREET_ACTION.maxCars) return false;
    const facing = s.trafficCount % 2 ? -1 : 1;
    const y = [492, 586, 632][(s.chapter + s.stage + s.trafficCount) % 3];
    s.traffic = { x: facing > 0 ? -190 : 1470, y, facing, warning: STREET_ACTION.warning, hits: {}, frame: 0 };
    s.trafficCount++;
    this.event('trafficWarning', { x: 640, y: y - 95, label: 'VOITURE ! CHANGE DE LIGNE OU SAUTE !' });
    return true;
  },
  updateStreetAction(dt) {
    const s = this.state;
    if (s.phase !== 'fight' || s.bossCinema) { s.traffic = null; for (const p of s.props) if (p.kind === 'bin') p.vx = 0; return; }
    for (const bin of s.props.filter(p => p.kind === 'bin' && p.hp > 0 && Math.abs(p.vx || 0) > 35)) {
      const x0 = bin.x; bin.x += bin.vx * dt; bin.vx *= Math.exp(-1.1 * dt); bin.rollTime -= dt;
      const targets = s.enemies.filter(e => e.hp > 0 && e.invincible <= 0 && (e.z || 0) < 40 && intersects(x0, bin.x, e, 38, bin.y, 38));
      targets.sort((a, b) => Math.abs(a.x - x0) - Math.abs(b.x - x0));
      const target = targets[0];
      if (target) {
        const owner = s.players.find(p => p.id === bin.owner);
        if (owner) this.damage(target, STREET_ACTION.binDamage, owner, true);
        this.event('binCrash', { x: bin.x, y: bin.y - 40 });
        bin.vx = 0; this.hitProp(bin, 1, owner);
      }
      if (bin.rollTime <= 0 || bin.x < 40 || bin.x > 1240) { bin.x = clamp(bin.x, 40, 1240); bin.vx = 0; }
    }
    if (!trafficStreet(s)) { s.traffic = null; return; }
    if (!s.traffic) { s.trafficTimer -= dt; if (s.trafficTimer <= 0) { this.startTraffic(); s.trafficTimer = STREET_ACTION.interval; } return; }
    const car = s.traffic;
    // A full warning frame never also advances the car or applies damage.
    if (car.warning > 0) { car.warning = Math.max(0, car.warning - dt); return; }
    const x0 = car.x; car.x += car.facing * STREET_ACTION.carSpeed * dt; car.frame += dt * 12;
    for (const actor of [...s.players, ...s.enemies]) {
      if (actor.hp <= 0 || actor.invincible > 0 || actor.action === 'dodge' || actor.z > 45 || car.hits[actor.id]) continue;
      if (!intersects(x0, car.x, actor, 112, car.y, 36)) continue;
      car.hits[actor.id] = true;
      const source = { id: -1, x: actor.x - car.facing * 100, y: car.y, facing: car.facing, enemy: !actor.enemy, power: STREET_ACTION.carDamage };
      this.damage(actor, STREET_ACTION.carDamage, source, true);
      this.event('trafficImpact', { x: actor.x, y: actor.y - 60 });
    }
    if (car.x < -250 || car.x > 1530) { s.traffic = null; s.trafficTimer = STREET_ACTION.interval; }
  },
};
