import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';

export const jualosCombat = {
  jualosChanging(e) { return !!(e?.boss && e.kind === 'jualos' && e.pattern?.kind === 'jualosSuit'); },
  beginJualosCommercial(e) {
    if (e.commercial) return;
    e.commercial = true; e.bossPhase = 2; e.enraged = true; e.signatureReady = false;
    e.pattern = { kind: 'jualosSuit', elapsed: 0, windup: 1.3, active: .85, hit: false, signature: true };
    e.attack = null; e.vx = e.vy = 0; e.guardHits = 0; e.recovering = 0;
    this.state.hazards = this.state.hazards.filter(h => h.owner !== e.id);
    this.event('rage', { actor: e.id, label: 'JUALOS · PLACE AU COMMERCIAL !' });
  },
  releaseJualosSlips(owner) {
    for (const p of this.state.players) if (p.jualosSlip?.owner === owner) {
      p.jualosSlip = null; p.stun = 0; p.vx = p.vy = 0;
      if (p.hp > 0) p.invincible = Math.max(p.invincible, .65);
    }
  },
  updateJualosSlip(p, input, dt) {
    const slip = p.jualosSlip;
    const boss = this.state.enemies.find(e => e.id === slip.owner && e.hp > 0);
    if (p.hp <= 0 || !boss || (slip.remaining -= dt) <= 0) {
      p.jualosSlip = null; p.stun = 0;
      if (p.hp > 0) p.invincible = Math.max(p.invincible, .65);
      return false;
    }
    slip.elapsed += dt; p.attack = null; this.tickActor(p, dt);
    p.vx = p.vy = p.vz = p.z = 0; p.action = 'hurt'; p.seq = input.seq || 0;
    for (const key of Object.keys(input.taps || {})) p.taps[key] = input.taps[key];
    return true;
  },
  updateJualosCash(h) {
    if (h.ttl <= 0) return;
    const e = this.state.enemies.find(a => a.id === h.owner && a.hp > 0);
    if (!e) { h.ttl = 0; return; }
    for (const p of this.state.players) if (p.hp > 0 && !p.jualosSlip && !p.caughtBy && p.invincible <= 0 && p.z <= 28 && p.action !== 'dodge' && Math.hypot(p.x - h.x, (p.y - h.y) * 1.45) < h.radius) {
      this.releaseGrab(p); this.endSpecial(p); p.attack = null; p.interaction = null; p.sitting = null;
      p.jualosSlip = { owner: e.id, remaining: .8, elapsed: 0 }; p.invincible = .85;
      p.vx = p.vy = p.vz = p.z = 0; p.stun = 0;
      e.laughTime = 1.15; e.pattern = null; e.attack = null; e.cooldown = e.recovering = 1.15;
      h.ttl = 0;
      this.event('taunt', { x: e.x, y: e.y - 245, label: 'HAHAHA !' });
      this.event('opening', { x: p.x, y: p.y - 130, label: 'GLISSADE !' });
      break;
    }
  },
  scatterJualosCash(e, pattern) {
    const existing = this.state.hazards.filter(h => h.owner === e.id && h.kind === 'jualosCash' && h.ttl > 0).length;
    for (let i = 0; i < Math.min(5, 10 - existing); i++) this.hazard(e, {
      kind: 'jualosCash', radius: 34, damage: 0, x: pattern.targetX + (i - 2) * 85,
      y: pattern.targetY + (i % 2 ? -36 : 36), fromX: e.x, fromY: e.y - 160,
      delay: .75 + i * .08, flight: .75 + i * .08, ttl: 5.5,
    });
  },
  updateJualos(e, dt) {
    const s = this.state, mode = difficulty(s.difficulty);
    e.laughTime = Math.max(0, (e.laughTime || 0) - dt);
    if (!e.commercial && (e.bossPhase > 1 || e.hp <= e.maxHp * BALANCE.bosses.jualos.phases[0])) this.beginJualosCommercial(e);
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special'; e.vx = e.vy = 0;
      if (!p.hit && p.elapsed >= p.windup) {
        p.hit = true;
        if (p.kind === 'jualosCash') this.scatterJualosCash(e, p);
        if (p.kind === 'jualosBagSwing') this.hazard(e, { kind: 'jualosBag', shape: 'line', width: 205, band: 50, delay: 0, ttl: .16, damage: e.power * 1.2 });
        if (p.kind === 'jualosBagSlam') {
          this.hazard(e, { kind: 'jualosBagSlam', x: e.x + e.facing * 110, radius: 150, delay: .2, ttl: .17, damage: e.power * 1.35 });
          this.event('skid', { x: e.x, y: e.y, facing: e.facing });
        }
      }
      const t = p.elapsed - p.windup;
      if (p.hit && p.kind === 'jualosBelly') {
        const beats = Math.min(3, 1 + Math.floor(t / .5));
        while ((p.beat || 0) < beats) {
          p.beat = (p.beat || 0) + 1;
          this.hazard(e, { kind: 'jualosBellyWave', radius: 150 + p.beat * 35, delay: 0, ttl: .14, damage: e.power * .85 });
          this.event('belly', { x: e.x, y: e.y, beat: p.beat });
        }
      }
      if (p.hit && p.kind === 'jualosCombo') {
        const beats = Math.min(2, 1 + Math.floor(t / .38));
        while ((p.beat || 0) < beats) {
          p.beat = (p.beat || 0) + 1;
          this.hazard(e, { kind: 'impact', shape: 'line', width: 145, band: 44, delay: 0, ttl: .1, damage: e.power * .9 });
        }
      }
      if (p.hit && p.kind === 'jualosRush' && t < .55) {
        e.x = clamp(e.x + p.dx * 490 * dt, FLOOR.left + 45, FLOOR.right - 45);
        e.y = clamp(e.y + p.dy * 290 * dt, FLOOR.top + 8, FLOOR.bottom - 8);
        for (const v of s.players) if (v.hp > 0 && v.invincible <= 0 && v.z <= 28 && v.action !== 'dodge' && !p.hits.includes(v.id) && Math.abs(v.x - e.x) < 95 && Math.abs(v.y - e.y) < 40) {
          p.hits.push(v.id); this.damage(v, e.power * 1.2, e, true);
        }
      }
      if (p.elapsed >= p.windup + p.active) {
        e.pattern = null; e.action = 'idle'; e.guardHits = 0;
        e.cooldown = e.recovering = (p.signature ? 2.1 : 1.05) * mode.recovery;
      }
      return;
    }
    if (e.cooldown > 0 || e.stun > 0 || e.grabbedBy) return;
    const target = s.players.filter(a => a.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (!target) return;
    const n = e.attackCount || 0;
    const kind = e.signatureReady ? e.commercial ? 'jualosCash' : 'jualosBelly' : (e.commercial ? ['jualosCash', 'jualosBagSwing', 'jualosBagSlam', 'jualosCombo'] : ['jualosBelly', 'jualosCombo', 'jualosRush', 'jualosCombo'])[n % 4];
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy)); e.facing = Math.sign(dx) || e.facing;
    const range = kind === 'jualosBelly' ? 205 : kind === 'jualosBagSlam' ? 210 : kind === 'jualosBagSwing' ? 180 : 120;
    if (!['jualosCash', 'jualosRush'].includes(kind) && (Math.abs(dx) > range || Math.abs(dy) > 40)) {
      e.x = clamp(e.x + dx / d * (e.commercial ? 250 : 205) * dt, FLOOR.left + 45, FLOOR.right - 45);
      e.y = clamp(e.y + dy / d * 155 * dt, FLOOR.top + 8, FLOOR.bottom - 8); e.action = 'walk'; return;
    }
    e.attackCount = n + 1; e.signatureReady = false; e.actionTime = 0;
    e.pattern = { kind, elapsed: 0, windup: (['jualosBelly', 'jualosCash'].includes(kind) ? 1.25 : kind === 'jualosCombo' ? .65 : .9) * mode.telegraph,
      active: kind === 'jualosBelly' ? 1.5 : .85, signature: ['jualosBelly', 'jualosCash'].includes(kind), hit: false,
      targetX: target.x, targetY: target.y, dx: dx / d, dy: dy / d, hits: [] };
  },
};
