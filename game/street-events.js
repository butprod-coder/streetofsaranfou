import { BALANCE } from './balance.js';
import { randomEnemyKinds } from './encounters.js';

export function surprisePlan(chapter, stage) {
  if (stage === 1) return chapter % 2 ? 'delivery' : 'car';
  if (stage === 3) return 'ambush';
  return null;
}

// Like combat.js, these methods run on the authoritative, fixed-step simulation.
export const streetEvents = {
  makeProp(kind, x, y, extra = {}) {
    const hp = BALANCE.scenery[`${kind}Hp`] || 3;
    return { id: this.nextId++, kind, x, y, hp, maxHp: hp, flash: 0, rubble: 0, ...extra };
  },
  streetProps() {
    const s = this.state, kinds = [['crate', 'bin', 'barrel'], ['bin', 'crate', 'barrel'], ['barrel', 'bin', 'crate']][s.chapter % 3];
    // Keep the centre lane and both exits clear. Props are attack targets, not navigation walls.
    return kinds.map((kind, i) => this.makeProp(kind, [490, 820, 1050][i] + s.stage % 2 * 35, [476, 619, 487][i], {
      drop: kind === 'barrel' ? null : kind === 'bin' ? 'energy' : 'food',
    }));
  },
  hitProp(prop, amount, source) {
    if (prop.hp <= 0 || (prop.kind === 'easel' && !prop.enemy)) return false;
    if (prop.bonus && this.state.surprise?.warning > 0) return false;
    prop.hp = Math.max(0, prop.hp - amount); prop.flash = .16;
    this.event('break', { x: prop.x, y: prop.y - 24, broken: prop.hp === 0, kind: prop.kind });
    if (prop.hp > 0) return true;
    prop.rubble = prop.kind === 'easel' ? 0 : BALANCE.scenery.debrisTime;
    if (prop.drop) this.state.pickups.push({ id: this.nextId++, x: prop.x, y: prop.y, kind: prop.drop });
    this.state.score += 50;
    if (prop.kind === 'barrel') {
      const b = BALANCE.scenery;
      this.hazard(source, { x: prop.x, y: prop.y, kind: 'barrelBlast', enemy: false, both: true, bossOwner: false,
        radius: b.explosionRadius, delay: b.explosionDelay, ttl: .18, damage: b.explosionDamage, propDamage: 3 });
      this.event('opening', { x: prop.x, y: prop.y - 115, label: 'RECULE !' });
    }
    return true;
  },
  updateScenery(dt) {
    for (const p of this.state.props) { p.flash = Math.max(0, (p.flash || 0) - dt); p.rubble = Math.max(0, (p.rubble || 0) - dt); }
  },
  beginSurprise() {
    const s = this.state, kind = surprisePlan(s.chapter, s.stage), b = BALANCE.surprises;
    if (!kind || s.surpriseDone) return false;
    s.surpriseDone = true; s.phase = 'surprise'; s.spawnQueue = []; s.hazards = []; s.allies = [];
    s.surprise = { kind, status: 'warning', warning: b.warning, remaining: b[`${kind}Time`], targetIds: [], total: 0 };
    s.props = s.props.filter(p => !p.enemy && p.kind !== 'easel');
    const labels = { car: 'BONUS · LA CASSE DU SIÈCLE', delivery: 'BONUS · LIVRAISON EXPRESS', ambush: 'SURPRISE · ON VOUS ATTENDAIT !' };
    this.event('surprise', { label: labels[kind] });
    for (const p of s.players) { if (p.hp <= 0) this.revivePlayer(p, .4); p.invincible = Math.max(p.invincible, b.warning); }
    if (kind === 'car') {
      const hp = Math.round(b.carHp * (s.players.length > 1 ? b.carDuoHp : 1)), car = this.makeProp('car', 735, 556, { hp, maxHp: hp, bonus: true, halfWidth: 130 });
      s.props.push(car); s.surprise.targetIds = [car.id]; s.surprise.total = hp;
    } else if (kind === 'delivery') {
      for (let i = 0; i < b.deliveryCount; i++) {
        const p = this.makeProp('crate', 300 + i * 700 / Math.max(1, b.deliveryCount - 1), i % 2 ? 610 : 480, { bonus: true, drop: i % 2 ? 'energy' : 'food' });
        s.props.push(p); s.surprise.targetIds.push(p.id);
      }
      s.surprise.total = b.deliveryCount;
    } else {
      const count = b.ambushCount + (s.players.length > 1 ? b.duoExtra : 0) + (s.difficulty === 'hard' ? 1 : 0);
      s.surprise.total = count;
      s.spawnQueue = randomEnemyKinds(s.chapter, count, () => this.random());
      s.spawnTimer = 0;
    }
    return true;
  },
  updateSurprise(dt) {
    const s = this.state, e = s.surprise;
    if (s.phase !== 'surprise' || !e || s.players.every(p => p.hp <= 0)) return;
    if (e.warning > 0) { e.warning = Math.max(0, e.warning - dt); return; }
    e.status = 'active'; e.remaining = Math.max(0, e.remaining - dt);
    const targets = s.props.filter(p => e.targetIds.includes(p.id));
    const success = e.kind === 'ambush' ? !s.spawnQueue.length && !s.enemies.some(p => p.hp > 0) : targets.every(p => p.hp <= 0);
    if (!success && e.remaining > 0) return;
    e.status = success ? 'success' : 'missed';
    // A missed bonus never locks the street or advances the campaign behind a downed player.
    s.spawnQueue = []; s.enemies = []; s.hazards = []; s.allies = [];
    for (const prop of targets) if (prop.hp > 0) prop.bonus = false;
    if (success) s.score += BALANCE.surprises.score;
    this.event('surprise', { label: success ? `BONUS RÉUSSI · +${BALANCE.surprises.score} POINTS` : 'LE QUARTIER SE CALME · ON CONTINUE !' });
    this.clearStreet();
  },
  clearStreet() {
    const s = this.state;
    s.phase = 'clear'; this.event('clear'); s.score += 250;
    if (s.stage === 5) this.awardChapterTalent();
    for (const p of s.players) if (p.hp <= 0) this.revivePlayer(p, .4);
    if (!s.pickups.some(p => p.kind === 'food')) s.pickups.push({ id: this.nextId++, x: 1060, y: 545, kind: 'food' });
  },
};
