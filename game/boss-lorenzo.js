import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';

export const lorenzoCombat = {
  beginLorenzoSofa(e) {
    if (e.sofa || e.sofaBroken) return;
    const hp = BALANCE.bosses.lorenzo.sofaHp * (this.state.players.length > 1 ? 1.5 : 1);
    e.bossPhase = 2; e.enraged = false; e.signatureReady = false;
    e.sofa = { hp, maxHp: hp, x: e.x, y: e.y, landed: false, elapsed: 0, reinforcements: 0 };
    e.attack = null; e.vx = e.vy = 0; e.guardHits = 0;
    e.pattern = { kind: 'lorenzoSofa', elapsed: 0, windup: 1.35, active: .85, signature: true, hit: false };
    this.state.hazards = this.state.hazards.filter(h => h.owner !== e.id);
    this.event('rage', { actor: e.id, label: 'LORENZO · LIVRAISON DU CANAPÉ !' });
  },
  lorenzoReinforcements(e) {
    const sofa = e.sofa;
    if (!sofa || sofa.reinforcements >= 2) return;
    sofa.reinforcements++;
    const count = sofa.reinforcements === 1 ? this.state.players.length > 1 ? 3 : 2 : 1;
    for (let i = 0; i < count; i++) {
      this.spawnEnemy(['remy', 'makouille', 'charlingals'][i % 3], {
        owner: e.id, lorenzoMinion: true, hp: 52, maxHp: 52, power: 9, cooldown: 1.5,
      });
    }
    this.event('opening', { x: e.x, y: e.y - 240, label: 'LES SBIRES DÉBARQUENT !' });
  },
  breakLorenzoSofa(e) {
    if (!e.sofa || e.sofaBroken) return;
    e.sofa.hp = 0; e.sofaBroken = true; e.bossPhase = 3; e.enraged = true;
    e.pattern = { kind: 'lorenzoRage', elapsed: 0, windup: 1.2, active: .7, hit: false, signature: true };
    e.cooldown = 0; e.recovering = 0; e.guardHits = 0; e.vx = e.vy = 0;
    this.state.hazards = this.state.hazards.filter(h => h.owner !== e.id);
    this.event('explosion', { x: e.x, y: e.y });
    this.event('rage', { actor: e.id, label: 'CANAPÉ DÉTRUIT · LORENZO ENRAGÉ !' });
  },
  lorenzoSofaDamage(e, amount, source, heavy) {
    if (e.kind !== 'lorenzo' || !e.boss || !e.sofa || e.sofaBroken) return false;
    if (!e.sofa.landed) return true;
    // The sofa is the second health bar. Strong blows dismantle it much faster.
    const damage = Math.max(1, Math.round(amount * (heavy ? 1.6 : .3)));
    e.sofa.hp = Math.max(0, e.sofa.hp - damage); e.flash = .14; e.sofa.shake = .18;
    this.event('hit', { x: e.x, y: e.y - 90, amount: damage, heavy, enemy: true, actor: e.id });
    if (e.sofa.hp <= 0) this.breakLorenzoSofa(e);
    return true;
  },
  lorenzoRing(e, p, second = false) {
    this.hazard(e, { kind: 'lorenzoRing', shape: 'ring', x: p.targetX, y: p.targetY,
      radius: 16, maxRadius: 700, growth: e.enraged ? 240 : 185, thickness: 16, verticalScale: 1.45,
      delay: second ? .85 : .65, flight: second ? .85 : .65, ttl: 4.1, pulse: 99,
      fromX: e.x + e.facing * 45, fromY: e.y - (e.sofa && !e.sofaBroken ? 125 : 180), damage: e.power,
    });
  },
  updateLorenzo(e, dt) {
    const s = this.state, mode = difficulty(s.difficulty);
    if (!e.sofa && !e.sofaBroken && e.hp <= e.maxHp * BALANCE.bosses.lorenzo.phases[0]) this.beginLorenzoSofa(e);
    const seated = e.sofa && !e.sofaBroken;
    if (e.sofa) { e.sofa.elapsed += dt; e.sofa.shake = Math.max(0, (e.sofa.shake || 0) - dt); }
    if (seated) {
      e.x = e.sofa.x; e.y = e.sofa.y; e.vx = e.vy = 0;
      if (e.sofa.landed && e.sofa.elapsed > 10 && !s.enemies.some(a => a.lorenzoMinion && a.owner === e.id && a.hp > 0)) this.lorenzoReinforcements(e);
    }
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special'; e.vx = e.vy = 0;
      if (!p.hit && p.elapsed >= p.windup) {
        p.hit = true;
        if (p.kind === 'lorenzoSofa' && seated) {
          e.sofa.landed = true; this.lorenzoReinforcements(e); this.event('skid', { x: e.x, y: e.y, facing: e.facing });
        }
        if (p.kind === 'lorenzoCigarette') this.lorenzoRing(e, p);
        if (p.kind === 'lorenzoKick') this.hazard(e, { kind: 'impact', shape: 'line', width: 160, band: 42, delay: 0, ttl: .1, damage: e.power * 1.1 });
      }
      const t = p.elapsed - p.windup;
      if (p.kind === 'lorenzoRage' && e.sofa) {
        const flight = Math.min(1, p.elapsed / .55);
        e.x = clamp(e.sofa.x + e.facing * 90 * flight, FLOOR.left + 30, FLOOR.right - 30);
        e.z = Math.sin(flight * Math.PI) * 45; e.vz = 0;
      }
      if (p.hit && p.kind === 'lorenzoCigarette' && e.enraged && !p.second && t >= 1.15) { p.second = true; this.lorenzoRing(e, p, true); }
      if (p.hit && p.kind === 'lorenzoCombo') {
        const beat = Math.min(3, 1 + Math.floor(t / (e.enraged ? .23 : .3)));
        while ((p.beat || 0) < beat) {
          p.beat = (p.beat || 0) + 1;
          this.hazard(e, { kind: 'impact', shape: 'line', width: p.beat === 3 ? 160 : 115, band: 42, delay: 0, ttl: .09, damage: e.power * (p.beat === 3 ? 1.1 : .6) });
        }
      }
      if (p.elapsed >= p.windup + p.active) {
        e.pattern = null; e.guardHits = 0; e.action = 'idle';
        e.cooldown = e.recovering = (p.signature ? 1.9 : e.enraged ? .85 : 1.15) * mode.recovery;
      }
      return;
    }
    if (e.cooldown > 0 || e.stun > 0 || e.grabbedBy) return;
    const target = s.players.filter(a => a.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (!target) return;
    const n = e.attackCount || 0, kind = seated || e.signatureReady || n % 3 === 0 ? 'lorenzoCigarette' : n % 3 === 1 ? 'lorenzoCombo' : 'lorenzoKick';
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy)); e.facing = Math.sign(dx) || e.facing;
    if (kind !== 'lorenzoCigarette' && (Math.abs(dx) > 120 || Math.abs(dy) > 35)) {
      e.x = clamp(e.x + dx / d * (e.enraged ? 325 : 235) * dt, FLOOR.left + 30, FLOOR.right - 30);
      e.y = clamp(e.y + dy / d * 175 * dt, FLOOR.top + 8, FLOOR.bottom - 8); e.action = 'walk'; return;
    }
    e.attackCount = n + 1; e.signatureReady = false; e.actionTime = 0;
    e.pattern = { kind, elapsed: 0, windup: (kind === 'lorenzoCigarette' ? 1.2 : e.enraged ? .5 : .7) * mode.telegraph,
      active: kind === 'lorenzoCigarette' ? e.enraged ? 2.15 : 1 : .82, signature: kind === 'lorenzoCigarette', hit: false,
      targetX: clamp(target.x + e.facing * 100, FLOOR.left + 45, FLOOR.right - 45), targetY: target.y };
  },
};
