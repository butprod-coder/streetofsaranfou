import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';

export const yanuCombat = {
  releaseYanuFreeze(owner) {
    for (const p of this.state.players) if (p.yanuFrozen?.owner === owner) {
      p.yanuFrozen = null; p.stun = 0; p.vx = p.vy = 0;
    }
  },
  updateYanuFrozen(p, input, dt) {
    const f = p.yanuFrozen, owner = this.state.enemies.find(e => e.id === f.owner);
    if (p.hp <= 0 || !owner || owner.hp <= 0 || owner.pattern?.kind !== 'yanuHowl' || (f.remaining -= dt) <= 0) {
      p.yanuFrozen = null; p.stun = 0; return false;
    }
    p.attack = null; this.tickActor(p, dt); p.vx = p.vy = p.vz = 0; p.action = 'hurt'; p.seq = input.seq || 0;
    // Consume presses during the freeze rather than queue an involuntary special.
    for (const key of Object.keys(input.taps || {})) p.taps[key] = input.taps[key];
    return true;
  },
  updateYanu(e, dt) {
    const s = this.state, mode = difficulty(s.difficulty);
    const phase = Math.max(e.bossPhase || 1, e.hp <= e.maxHp * BALANCE.bosses.yanu.phases[0] ? 2 : 1);
    if (phase !== e.bossPhase) {
      e.bossPhase = phase; e.enraged = true; e.signatureReady = true;
      this.event('rage', { actor: e.id, label: 'YANU · LA MARÉE SAUVAGE !' });
    }
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special'; e.vx = e.vy = 0;
      if (!p.hit && p.elapsed >= p.windup) {
        p.hit = true;
        if (p.kind === 'yanuHowl') {
          this.event('taunt', { x: e.x, y: e.y - 240, label: 'BUUUUUUUUU' });
          for (const v of s.players) if (v.hp > 0 && v.invincible <= 0 && v.z < 28 && v.action !== 'dodge' && Math.hypot(v.x - e.x, (v.y - e.y) * 1.5) < 360) {
            this.releaseGrab(v); this.endSpecial(v); v.attack = null; v.interaction = null;
            v.yanuFrozen = { owner: e.id, remaining: .65 }; v.stun = 0; v.vx = v.vy = v.vz = 0;
          }
        }
        if (p.kind === 'yanuTsunami') this.event('skid', { x: e.x, y: e.y, facing: e.facing });
      }
      const t = p.elapsed - p.windup;
      if (p.hit && p.kind === 'yanuHowl') {
        // The target is locked before the scream. Freeze ends .4s before the lunge.
        p.lunging = t >= 1.05 && t < 1.55;
        if (p.lunging) {
          e.x = clamp(e.x + p.dx * 760 * dt, FLOOR.left + 30, FLOOR.right - 30);
          e.y = clamp(e.y + p.dy * 420 * dt, FLOOR.top + 8, FLOOR.bottom - 8);
          this.yanuContact(e, p, 86, 42, 1.4);
        }
      }
      if (p.hit && p.kind === 'yanuTsunami') {
        e.x = clamp(e.x + e.facing * (phase > 1 ? 700 : 610) * dt, FLOOR.left + 45, FLOOR.right - 45);
        this.yanuContact(e, p, 155, 55, 1.25);
        if (e.x <= FLOOR.left + 45 || e.x >= FLOOR.right - 45) p.elapsed = p.windup + p.active;
      }
      if (p.hit && ['yanuCombo', 'yanuKick'].includes(p.kind)) {
        const count = p.kind === 'yanuKick' ? 1 : Math.min(3, 1 + Math.floor(t / .3));
        while ((p.beat || 0) < count) {
          p.beat = (p.beat || 0) + 1;
          this.hazard(e, { kind: 'impact', shape: 'line', width: p.kind === 'yanuKick' || p.beat === 3 ? 155 : 115, band: 40, delay: 0, ttl: .08, damage: e.power * (p.beat === 3 || p.kind === 'yanuKick' ? 1.1 : .6) });
        }
      }
      if (p.elapsed >= p.windup + p.active) {
        this.releaseYanuFreeze(e.id); e.pattern = null; e.guardHits = 0;
        e.cooldown = e.recovering = (p.signature ? 1.9 : 1.1) * mode.recovery; e.action = 'idle';
        this.event('opening', { x: e.x, y: e.y - 225, label: 'À TOI · ENCHAÎNE !' });
      }
      return;
    }
    if (e.cooldown > 0 || e.stun > 0 || e.grabbedBy) return;
    const target = s.players.filter(p => p.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (!target) return;
    const n = e.attackCount || 0, kind = e.signatureReady ? 'yanuHowl' : ['yanuTsunami', 'yanuCombo', 'yanuHowl', 'yanuKick'][n % 4];
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
    e.facing = Math.sign(dx) || e.facing;
    if (['yanuCombo', 'yanuKick'].includes(kind) && (Math.abs(dx) > 120 || Math.abs(dy) > 35)) {
      e.x = clamp(e.x + dx / d * (phase > 1 ? 285 : 240) * dt, FLOOR.left + 30, FLOOR.right - 30);
      e.y = clamp(e.y + dy / d * 165 * dt, FLOOR.top + 8, FLOOR.bottom - 8); e.action = 'walk'; return;
    }
    e.attackCount = n + 1; e.signatureReady = false; e.vx = e.vy = 0; e.actionTime = 0;
    e.pattern = { kind, elapsed: 0, windup: (kind === 'yanuHowl' ? 1.25 : kind === 'yanuTsunami' ? 1.3 : .65) * mode.telegraph,
      active: kind === 'yanuHowl' ? 1.85 : kind === 'yanuTsunami' ? 1.8 : .85, hit: false,
      signature: ['yanuHowl', 'yanuTsunami'].includes(kind), dx: dx / d, dy: dy / d, targetX: target.x, targetY: target.y, hits: [] };
  },
  yanuContact(e, pattern, width, band, power) {
    for (const v of this.state.players) if (v.hp > 0 && v.invincible <= 0 && v.z <= 28 && v.action !== 'dodge' && !pattern.hits.includes(v.id) && Math.abs(v.x - e.x) < width && Math.abs(v.y - e.y) < band) {
      pattern.hits.push(v.id); this.damage(v, e.power * power, e, true);
    }
  },
};
