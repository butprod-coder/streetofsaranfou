import { ELITES, ELITE_RULES, ELITE_LABELS } from './elite-data.js';
import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';
import { ENCORE_ELITES } from './elite-encore-data.js';
import { encore } from './elite-encore.js';
const live = a => a.hp > 0;
const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.5);

export const elites = {
  ...encore,
  initElite(e) {
    if (!ELITES[e.kind]) return;
    e.elite = true; e.eliteState = { seated: e.kind === 'canape', heavyHits: 0, landing: e.kind === 'canape' ? ELITE_RULES.landTime : 0 };
    if (e.kind === 'canape') { e.x = clamp(e.x, 210, 1050); e.z = 380; e.invincible = ELITE_RULES.landTime; }
    this.event('elite', { actor: e.id, label: ELITES[e.kind].name, x: e.x, y: e.y - 170 });
  },
  ejectSofa(e) {
    if (!e.eliteState?.seated) return;
    e.eliteState.seated = false; e.pattern = null; e.cooldown = 1.7; e.recovering = 1.7;
    const couch = this.makeProp('sofa', e.x, e.y, { hp: 6, maxHp: 6, owner: e.id, halfWidth: 72 });
    this.state.props.push(couch); e.x = clamp(e.x + e.facing * 110, FLOOR.left, FLOOR.right);
    this.event('opening', { x: couch.x, y: couch.y - 145, label: 'DÉLOGÉ ! E / LB · S’ASSEOIR' });
  },
  eliteHit(e, heavy) {
    if (!e.eliteState) return;
    if (e.kind === 'canape' && e.eliteState.seated) {
      if (heavy) e.eliteState.heavyHits++;
      if (e.hp <= e.maxHp * ELITE_RULES.sofaEjectHp || e.eliteState.heavyHits >= ELITE_RULES.sofaHeavyHits) this.ejectSofa(e);
    } else if (heavy && e.pattern && !e.pattern.hit) { e.pattern = null; e.cooldown = .8; e.recovering = .8; }
    if (e.hp <= 0) this.state.hazards = this.state.hazards.filter(h => h.owner !== e.id);
  },
  sitOnSofa(p, input, dt) {
    p.sitting = null;
    if (!input.revive || p.z > 0 || p.attack || p.stun > 0 || p.specialState || input.x || input.y) { p.seatHold = 0; return false; }
    if (this.state.players.some(other => other.id !== p.id && !live(other) && distance(p, other) < 105)) return false;
    const sofa = this.state.props.find(prop => prop.kind === 'sofa' && prop.hp > 0 && distance(p, prop) < 90);
    if (!sofa) { p.seatHold = 0; return false; }
    p.seatHold = (p.seatHold || 0) + dt; p.x = sofa.x; p.y = sofa.y; p.sitting = sofa.id;
    if (p.seatHold >= ELITE_RULES.seatTime) {
      const owner = this.state.enemies.find(e => e.id === sofa.owner && live(e));
      if (owner && !owner.enraged) {
        owner.enraged = true; owner.pattern = null; owner.cooldown = 1.1; owner.invincible = .5;
        this.event('rage', { actor: owner.id, label: 'PAS MON CANAPÉ ! · LORENZO ENRAGÉ' });
        this.event('taunt', { actor: owner.id, x: owner.x, y: owner.y - 165, label: 'Pas mon canapé !' });
      }
    }
    return true;
  },
  updateElite(e, dt) {
    const s = this.state, b = ELITES[e.kind], q = e.eliteState, mode = difficulty(s.difficulty);
    if (!live(e) || !['fight', 'surprise'].includes(s.phase)) return;
    if (q.landing > 0) {
      q.landing = Math.max(0, q.landing - dt); e.z = 380 * (q.landing / ELITE_RULES.landTime) ** .65; e.vz = 0;
      if (!q.landing) { this.hazard(e, { kind: 'impact', radius: 120, delay: .15, ttl: .16, damage: e.power }); this.event('spectacle', { x: e.x, y: e.y, atlas: 'kayak', cell: 10, label: 'LIVRAISON DE CANAPÉ !' }); }
      return;
    }
    const target = s.players.filter(live).sort((a, b) => distance(e, a) - distance(e, b))[0];
    if (!target) return;
    if (ENCORE_ELITES[e.kind]) { this.updateEncore(e, target, dt); return; }
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special';
      if (!p.hit && p.elapsed >= p.windup) { p.hit = true; this.executeElitePattern(e, p); }
      if (p.hit && ['pounce', 'paddle', 'ferret'].includes(p.kind) && p.elapsed < p.windup + p.active) {
        if (p.kind === 'ferret') { const d = Math.max(1, distance(e, target)); p.dx = (target.x - e.x) / d; p.dy = (target.y - e.y) / d; }
        const speed = (p.kind === 'ferret' ? 270 : p.kind === 'paddle' ? 340 : 470) * mode.speed;
        e.x += p.dx * speed * dt; e.y += p.dy * speed * dt; e.facing = Math.sign(p.dx) || e.facing;
        if (s.time >= (p.nextHit || 0)) { this.hazard(e, { kind: 'eliteSwipe', atlas: e.kind, cell: e.kind === 'precieux' ? 10 : 4, radius: p.kind === 'paddle' ? 125 : 65, delay: 0, ttl: .08, damage: e.power * (e.enraged ? 1.25 : 1) }); p.nextHit = s.time + .6; }
      }
      if (p.elapsed >= p.windup + p.active) { e.pattern = null; e.cooldown = b.recovery * mode.recovery; e.recovering = e.cooldown; e.action = 'idle'; }
      return;
    }
    if (e.stun > 0) return;
    const dx = target.x - e.x, dy = target.y - e.y; e.facing = Math.sign(dx) || e.facing;
    const ranged = ['bolorouet', 'princesse'].includes(e.kind) || q.seated;
    const occupied = s.enemies.filter(a => live(a) && (a.pattern || a.attack && !a.attack.hit)).length;
    if (e.cooldown <= 0 && distance(e, target) < (ranged ? 900 : 450) && occupied < (s.players.length > 1 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo)) {
      const d = Math.max(1, Math.hypot(dx, dy)), kind = e.kind === 'canape' && !q.seated ? (e.enraged ? 'tantrum' : 'cigars') : b.pattern;
      e.pattern = { kind, elapsed: 0, windup: b.windup * mode.telegraph, active: b.active, dx: dx / d, dy: dy / d, targetX: target.x, targetY: target.y, hit: false };
      e.actionTime = 0; e.action = 'special';
      if (e.kind === 'precieux' || q.seated) this.event('taunt', { actor: e.id, x: e.x, y: e.y - 150, label: e.kind === 'precieux' ? 'Mon précieux !' : 'Ha ha ha !' });
      return;
    }
    if (q.seated || e.recovering > .6) return;
    const wanted = ranged ? 310 : 150, goal = clamp(target.x - e.facing * wanted, FLOOR.left, FLOOR.right);
    const d = Math.max(1, Math.hypot(goal - e.x, dy * 1.5));
    if (Math.abs(goal - e.x) > 12 || Math.abs(dy) > 15) { e.x += (goal - e.x) / d * e.speed * (e.enraged ? 1.25 : 1) * dt; e.y += dy / d * e.speed * .8 * dt; e.action = 'walk'; }
  },
  executeElitePattern(e, p) {
    const s = this.state;
    if (['pounce', 'ferret', 'paddle'].includes(p.kind)) { this.event('spectacle', { x: e.x, y: e.y, atlas: e.kind, cell: 10 }); return; }
    if (p.kind === 'magic' || p.kind === 'cigars') {
      const count = Math.min(p.kind === 'magic' ? 3 : 2, ELITE_RULES.projectileLimit - s.hazards.filter(h => h.kind === 'magic' || h.kind === 'cigar').length);
      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(p.targetY - e.y, p.targetX - e.x) + (i - (count - 1) / 2) * .19;
        this.hazard(e, { kind: p.kind === 'magic' ? 'magic' : 'cigar', radius: 26, vx: Math.cos(angle) * 355, vy: Math.sin(angle) * 355, delay: i * .18, ttl: 3.1, damage: e.power, atlas: p.kind === 'magic' ? 'princesse' : 'bolorouet', cell: 9 });
      }
      return;
    }
    const count = Math.min(e.enraged ? 4 : 3, ELITE_RULES.fireLimit - s.hazards.filter(h => h.enemy && h.kind === 'fire').length);
    for (let i = 0; i < count; i++) {
      const x = i ? FLOOR.left + 100 + this.random() * (FLOOR.right - FLOOR.left - 200) : p.targetX;
      const y = i ? FLOOR.top + 20 + this.random() * (FLOOR.bottom - FLOOR.top - 40) : p.targetY;
      this.hazard(e, { kind: 'fire', x, y, radius: e.enraged ? 65 : 54, delay: 1 + i * .16, ttl: ELITE_RULES.fireDuration, damage: e.power * .65, atlas: 'canape', cell: 9 });
    }
  },
};
