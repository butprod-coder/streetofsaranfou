import { BALANCE } from './balance.js';
import { randomEnemyKinds, streetEnemyRoster } from './encounters.js';
import { hasTalent } from './rogue-talents.js';

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
    const s = this.state, kind = ['crate', null, null, null, 'barrel', null][s.stage];
    // Two occasional objects per chapter; other streets and boss arenas stay clear.
    if (!kind) return [];
    return [this.makeProp(kind, [790, 0, 875, 0, 735, 325][s.stage] + s.chapter % 2 * 35, s.stage === 2 ? 619 : 486, {
      drop: kind === 'crate' ? 'food' : null,
    })];
  },
  hitProp(prop, amount, source) {
    if (prop.hp <= 0 || (prop.kind === 'easel' && !prop.enemy)) return false;
    if (prop.bonus && this.state.surprise?.warning > 0) return false;
    if (prop.bourgTable) {
      const key = `${this.state.tick}:${source?.id ?? 'world'}`;
      if (prop.lastBourgHit === key) return false;
      prop.lastBourgHit = key;
    }
    prop.hp = Math.max(0, prop.hp - amount); prop.flash = .16;
    this.event('break', { x: prop.x, y: prop.y - 24, broken: prop.hp === 0, kind: prop.kind });
    if (prop.hp > 0) return true;
    this.recoverNeighborhoodCargo(prop);
    prop.rubble = prop.kind === 'easel' ? 0 : BALANCE.scenery.debrisTime;
    if (source?.specialState && hasTalent(source, 'Débris volants')) this.rogueBurst(source, prop.x, prop.y, 190, 1, 'DÉBRIS VOLANTS');
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
    if (s.chapter===6 || !kind || s.surpriseDone) return false;
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
        const p = this.makeProp('crate', 400 + i * 500 / Math.max(1, b.deliveryCount - 1), i % 2 ? 610 : 480, { bonus: true, drop: i === 0 ? 'food' : null });
        s.props.push(p); s.surprise.targetIds.push(p.id);
      }
      s.surprise.total = b.deliveryCount;
    } else {
      const count = b.ambushCount + (s.players.length > 1 ? b.duoExtra : 0) + (s.difficulty === 'hard' ? 1 : 0);
      s.surprise.total = count;
      s.spawnQueue = randomEnemyKinds(s.chapter, count, () => this.random(), s.enemyBag ||= [], streetEnemyRoster(s.chapter, s.stage, s.enemyOrder));
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
    if (success) { s.score += BALANCE.surprises.score; this.awardXP(100 + s.chapter * 20, `objective:${s.chapter}:${s.stage}`); }
    this.event('surprise', { label: success ? `BONUS RÉUSSI · +${BALANCE.surprises.score} POINTS` : 'LE QUARTIER SE CALME · ON CONTINUE !' });
    this.clearStreet();
  },
  clearStreet() {
    const s = this.state;
    if(s.chapter===6){this.finishFinalRound();return;}
    if(s.sandbox&&s.stage===5){s.phase='won';s.hazards=[];this.event('win');return;}
    const key = `${s.chapter}:${s.stage}`;
    if (s.rewardedStreet === key) return;
    s.rewardedStreet = key;
    s.phase = 'clear'; this.event('clear'); s.score += 250;
    if (s.stage === 0 && this.routeDepth() === 0) this.awardTalentMilestone('street:0:0');
    if (s.stage === 2 && this.routeDepth() < 2) this.awardTalentMilestone(`street:${this.routeDepth()}:2`);
    if (s.stage === 5) this.awardChapterTalent();
    for (const p of s.players) if (p.hp <= 0) this.revivePlayer(p, .4);
    if (s.stage === 5 && this.openRouteBoard()) return;
    if (s.stage === 5 && s.players.some(p => p.hp > 0 && p.hp < p.maxHp * BALANCE.scenery.bossReliefHealth) && !s.pickups.some(p => p.kind === 'food')) {
      s.pickups.push({ id: this.nextId++, x: 1060, y: 545, kind: 'food' });
    }
  },
};
