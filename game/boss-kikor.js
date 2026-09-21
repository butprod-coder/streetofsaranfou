import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';

export const kikorCombat = {
  kikorShielded(e) {
    return !!(e?.boss && e.kind === 'kikor' && this.state.enemies.some(a => a.hp > 0 && a.kikorCreation && a.owner === e.id));
  },
  releaseKikorGrip(e, label = 'LIBÉRÉ !') {
    if (!e) return;
    for (const p of this.state.players) if (p.caughtBy === e.id) {
      p.caughtBy = null; p.escapePresses = 0; p.stun = 0; p.vx = p.vy = 0;
      p.invincible = Math.max(p.invincible, 1); p.action = p.hp > 0 ? 'idle' : 'dead';
      if (p.hp > 0) this.event('opening', { x: p.x, y: p.y - 145, label });
    }
    e.kikorGrip = null;
    if (e.pattern?.kind === 'kikorHunt') e.pattern = null;
    e.cooldown = e.recovering = 1.7; e.vx = e.vy = 0;
  },
  updateKikorCaught(p, input, dt) {
    const e = this.state.enemies.find(a => a.id === p.caughtBy && a.hp > 0 && a.kikorGrip?.victim === p.id);
    if (!e) { p.caughtBy = null; p.stun = 0; return false; }
    p.attack = null; this.tickActor(p, dt); p.vx = p.vy = p.vz = p.z = 0; p.action = 'hurt';
    p.escapePresses ||= 0; p.escapeHeld ||= {};
    for (const action of ['punch', 'kick', 'dodge']) {
      if (input[action] && !p.escapeHeld[action] || (input.taps?.[action] || 0) > (p.taps[action] || 0)) p.escapePresses++;
      p.escapeHeld[action] = !!input[action]; p.taps[action] = input.taps?.[action] || 0;
    }
    if (p.escapePresses >= 6) this.releaseKikorGrip(e, 'PRISE BRISÉE !');
    return true;
  },
  updateKikor(e, dt) {
    const s = this.state, mode = difficulty(s.difficulty), cfg = BALANCE.bosses.kikor;
    e.shieldFlash = Math.max(0, (e.shieldFlash || 0) - dt);
    const shield = this.kikorShielded(e);
    if (e.shielded && !shield) {
      this.releaseKikorGrip(e, 'PROTECTION BRISÉE !');
      e.pattern = null; e.cooldown = e.recovering = 2.1; e.paintAt = s.time + 12;
      this.event('opening', { x: e.x, y: e.y - 230, label: 'KIKOR EST VULNÉRABLE !' });
    }
    e.shielded = shield;
    const phase = Math.max(e.bossPhase || 1, e.hp <= e.maxHp * cfg.phases[0] ? 2 : 1);
    if (phase !== e.bossPhase) {
      e.bossPhase = phase; e.enraged = true; e.signatureReady = true;
      this.event('rage', { actor: e.id, label: 'KIKOR · MON PRÉCIEUX !' });
    }
    if (e.kikorGrip) {
      const grip = e.kikorGrip, victim = s.players.find(p => p.id === grip.victim);
      if (!victim || victim.hp <= 0 || victim.caughtBy !== e.id) { this.releaseKikorGrip(e); return; }
      grip.elapsed += dt; e.action = 'special'; e.vx = e.vy = 0;
      victim.x = clamp(e.x + e.facing * 38, FLOOR.left, FLOOR.right); victim.y = e.y + 2;
      victim.vx = victim.vy = 0;
      if (grip.elapsed >= grip.nextDrain) {
        grip.nextDrain += .2;
        this.damage(victim, 6, e, false);
        // Drain has its own clock; ordinary post-hit invulnerability must not slow it down.
        victim.vx = victim.vy = 0;
      }
      if (grip.elapsed >= 2 || victim.hp <= 0) this.releaseKikorGrip(e);
      return;
    }
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special';
      if (!p.hit && p.elapsed >= p.windup) {
        p.hit = true;
        if (p.kind === 'kikorPaint' && !shield) {
          const hp = Math.round(cfg.creationHp * (s.players.length > 1 ? 1.5 : 1));
          this.spawnEnemy('creation', { kikorCreation: true, owner: e.id, hp, maxHp: hp, x: clamp(e.x + e.facing * 95, FLOOR.left + 35, FLOOR.right - 35), y: clamp(e.y + 5, FLOOR.top, FLOOR.bottom), speed: 215, power: 9, cooldown: 1 });
          e.shielded = true; e.summons = (e.summons || 0) + 1;
          this.event('opening', { x: e.x, y: e.y - 225, label: 'DÉTRUIS LE BONHOMME VERT !' });
        }
        if (p.kind === 'kikorBrush') this.hazard(e, { kind: 'impact', shape: 'line', width: 155, band: 45, delay: 0, ttl: .15, damage: e.power });
      }
      if (p.kind === 'kikorHunt' && p.hit) {
        const target = s.players.filter(a => a.hp > 0 && !a.caughtBy).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
        if (!target) { this.releaseKikorGrip(e); return; }
        const t = p.elapsed - p.windup, cycle = Math.floor(t / 1.05), beat = t % 1.05;
        if (p.cycle !== cycle) {
          p.cycle = cycle; const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
          p.dx = dx / d; p.dy = dy / d; e.facing = Math.sign(dx) || e.facing;
        }
        p.lunging = beat >= .28 && beat < .57;
        if (p.lunging) {
          e.x = clamp(e.x + p.dx * 540 * dt, FLOOR.left + 30, FLOOR.right - 30);
          e.y = clamp(e.y + p.dy * 350 * dt, FLOOR.top + 8, FLOOR.bottom - 8);
        } else if (beat >= .57) {
          const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
          e.x = clamp(e.x + dx / d * (phase > 1 ? 260 : 220) * dt, FLOOR.left + 30, FLOOR.right - 30);
          e.y = clamp(e.y + dy / d * 155 * dt, FLOOR.top + 8, FLOOR.bottom - 8);
        }
        for (const victim of s.players) if (p.lunging && victim.hp > 0 && !victim.caughtBy && victim.invincible <= 0 && victim.z < 28 && victim.action !== 'dodge' && Math.abs(victim.x - e.x) < 54 && Math.abs(victim.y - e.y) < 30) {
          this.releaseGrab(victim); this.endSpecial(victim); victim.attack = null; victim.interaction = null;
          victim.caughtBy = e.id; victim.escapePresses = 0; victim.escapeHeld = {}; victim.vx = victim.vy = victim.vz = victim.z = 0;
          e.kikorGrip = { victim: victim.id, elapsed: 0, nextDrain: .2 }; e.vx = e.vy = 0;
          this.event('rage', { actor: e.id, label: 'ATTRAPÉ ! TAPOTE POING / PIED / ESQUIVE' }); return;
        }
      }
      if (p.elapsed >= p.windup + p.active) {
        e.pattern = null; e.cooldown = e.recovering = (p.kind === 'kikorHunt' ? 1.8 : 1.1) * mode.recovery;
        e.action = 'idle'; e.vx = e.vy = 0;
      }
      return;
    }
    if (e.cooldown > 0 || e.stun > 0 || e.grabbedBy) return;
    const target = s.players.filter(a => a.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (!target) return;
    const dx = target.x - e.x, dy = target.y - e.y; e.facing = Math.sign(dx) || e.facing;
    const n = e.attackCount || 0;
    const kind = e.signatureReady ? 'kikorHunt' : !shield && s.time >= (e.paintAt || 0) ? 'kikorPaint' : n % 2 ? 'kikorHunt' : 'kikorBrush';
    if (kind === 'kikorBrush' && (Math.abs(dx) > 130 || Math.abs(dy) > 38)) {
      const d = Math.max(1, Math.hypot(dx, dy)); e.x += dx / d * 225 * dt; e.y += dy / d * 160 * dt; e.action = 'walk'; return;
    }
    e.attackCount = n + 1; e.signatureReady = false; e.vx = e.vy = 0;
    e.pattern = { kind, elapsed: 0, windup: (kind === 'kikorHunt' ? 1.2 : kind === 'kikorPaint' ? 1.3 : .65) * mode.telegraph, active: kind === 'kikorHunt' ? 4.2 : .5, hit: false, signature: kind === 'kikorHunt' };
    if (kind === 'kikorPaint') e.paintAt = s.time + 18;
    e.action = 'special'; e.actionTime = 0;
  },
};
