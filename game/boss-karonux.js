import { BALANCE, difficulty } from './balance.js';
import { FLOOR, clamp } from './data.js';

// Only serializable state: solo and the authoritative co-op server share every beat.
export const karonuxCombat = {
  startBossCinema(e, kind = 'arrival') {
    this.state.bossCinema = { actor: e.id, kind, elapsed: 0, duration: kind === 'arrival' ? 4.8 : 2.6, x: e.x, y: e.y };
    e.attack = null; e.pattern = null; e.vx = e.vy = 0;
    for (const p of this.state.players) { p.attack = null; p.vx = p.vy = 0; }
    this.state.hazards = this.state.hazards.filter(h => h.owner !== e.id);
    this.event('boss', { name: e.kind });
  },
  updateKaronux(e, dt) {
    const s = this.state, cfg = BALANCE.bosses.karonux, mode = difficulty(s.difficulty);
    const phase = e.vehicle ? 0 : Math.max(e.bossPhase || 1, e.hp <= e.maxHp * .4 ? 2 : 1);
    if (phase !== e.bossPhase) {
      e.bossPhase = phase; e.enraged = phase > 1;
      e.signatureReady = phase > 1;
      this.event('rage', { actor: e.id, label: 'KARONUX · MAUVAISE HUMEUR !' });
    }
    const p = e.pattern;
    if (p) {
      p.elapsed += dt;
      e.action = p.kind === 'smoke' ? 'heal' : p.kind === 'sleep' && p.hit ? 'sleep' : 'special';
      if (!p.hit && p.elapsed >= p.windup) {
        p.hit = true;
        if (p.kind === 'sleep') {
          this.hazard(e, { kind: 'impact', x: e.x + e.facing * 65, radius: 145, delay: 0, ttl: .12, damage: e.power * 1.5 });
          this.event('explosion', { x: e.x, y: e.y });
        }
        if (p.charge) this.event('skid', { x: e.x, y: e.y, facing: e.facing });
      }
      if (p.hit && p.charge && p.elapsed < p.windup + p.active) {
        const x = e.x + p.dx * p.speed * dt, y = e.y + p.dy * p.speed * dt;
        e.x = clamp(x, FLOOR.left + 70, FLOOR.right - 70); e.y = clamp(y, FLOOR.top + 12, FLOOR.bottom - 12);
        for (const target of s.players) if (target.hp > 0 && !p.hits.includes(target.id) && target.invincible <= 0 && target.z <= 28 && Math.hypot(target.x - e.x, (target.y - e.y) * 1.7) < (e.vehicle ? 130 : 85)) {
          p.hits.push(target.id); this.damage(target, e.power * 1.2, e, true);
        }
        if (x !== e.x || y !== e.y) { p.elapsed = p.windup + p.active; this.event('skid', { x: e.x, y: e.y, facing: e.facing }); }
      }
      if (p.kind === 'combo' && p.hit) {
        const beat = Math.min(3, Math.floor((p.elapsed - p.windup) / .24) + 1);
        while ((p.beat || 0) < beat) {
          p.beat = (p.beat || 0) + 1;
          this.hazard(e, { kind: 'impact', shape: 'line', width: p.beat === 3 ? 155 : 120, band: 43, delay: 0, ttl: .08, damage: e.power * (p.beat === 3 ? 1.35 : .65) });
          e.x = clamp(e.x + e.facing * 16, FLOOR.left + 60, FLOOR.right - 60);
        }
      }
      if (p.healing && p.hit) {
        const ticks = Math.min(6, 1 + Math.floor((p.elapsed - p.windup) / .5));
        while ((p.ticks || 0) < ticks) {
          p.ticks = (p.ticks || 0) + 1;
          const amount = Math.min(cfg.healing / 6, e.maxHp - e.hp); e.hp += amount;
          if (amount > 0) this.event('heal', { actor: e.id, x: e.x, y: e.y - 200, amount });
        }
      }
      if (p.elapsed >= p.windup + p.active) {
        e.pattern = null; e.action = 'idle'; e.guardHits = 0;
        e.cooldown = e.recovering = (e.vehicle ? 1.65 : p.signature ? 1.5 : p.kind === 'sleep' ? .65 : .8) * mode.recovery;
        this.event('opening', { x: e.x, y: e.y - 210, label: 'ENCHAÎNE !' });
      }
      return;
    }
    if (e.cooldown > 0 || e.stun > 0) return;
    const target = s.players.filter(a => a.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (!target) return;
    const n = e.attackCount || 0;
    let kind = e.vehicle ? 'carRush' : ['rush', 'combo', 'sleep', 'combo', 'smoke', 'sleep'][n % 6];
    if (kind === 'smoke' && (e.healUses >= cfg.healUses || e.hp >= e.maxHp * .92)) kind = 'combo';
    const signature = !e.vehicle && e.signatureReady;
    if (signature) { kind = 'sleep'; e.signatureReady = false; }
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
    e.facing = Math.sign(dx) || e.facing;
    // Walk into range; never teleport onto the player to deliver a combo.
    if (kind === 'combo' && (Math.abs(dx) > 115 || Math.abs(dy) > 35)) {
      e.x += dx / d * (phase > 1 ? 295 : 250) * dt; e.y += dy / d * 185 * dt; e.action = 'walk'; return;
    }
    e.attackCount = n + 1;
    const charge = kind === 'rush' || kind === 'carRush';
    const windup = (kind === 'sleep' ? 1.05 : kind === 'smoke' ? 1.1 : charge ? .8 : .55) * mode.telegraph;
    e.pattern = { kind, elapsed: 0, windup, active: kind === 'sleep' ? 2.4 : kind === 'smoke' ? 3 : charge ? Math.min(.85, (d + 130) / (e.vehicle ? 720 : 540)) : .78,
      hit: false, healing: kind === 'smoke', charge, dx: dx / d, dy: dy / d, speed: e.vehicle ? 720 : phase > 1 ? 610 : 540,
      x: e.x, y: e.y, targetX: target.x, targetY: target.y, facing: e.facing, hits: [], signature: !!signature };
    if (kind === 'smoke') e.healUses++;
    e.actionTime = 0; e.vx = e.vy = 0;
  },
  bossComboHit(e, heavy) {
    if (!e.boss || e.vehicle || this.jualosChanging(e) || this.joChanneling(e) || e.sofa && !e.sofaBroken || e.recovering > 0 || e.pattern?.kind === 'sleep') return;
    e.guardHits = this.state.time - (e.guardLastHit ?? -10) < 1.15 ? (e.guardHits || 0) + (heavy ? 2 : 1) : (heavy ? 2 : 1);
    e.guardLastHit = this.state.time;
    if (e.guardHits < 5) return;
    this.releaseYanuFreeze(e.id);
    e.guardHits = 0; e.pattern = null; e.attack = null; e.cooldown = e.recovering = 1.6;
    this.state.hazards = this.state.hazards.filter(h => h.owner !== e.id);
    this.event('opening', { x: e.x, y: e.y - 205, label: 'GARDE BRISÉE !' });
  },
};
