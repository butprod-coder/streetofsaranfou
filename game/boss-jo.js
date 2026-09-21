import { FLOOR, clamp } from './data.js';
import { BALANCE, difficulty } from './balance.js';

export const JO_PALLET_LANES = [460, 514, 568, 622];

export const joCombat = {
  joChanneling(e) { return !!(e?.boss && e.kind === 'jo' && e.hp > 0 && e.pattern?.kind === 'joChannel'); },
  clearJoPallets(owner) {
    for (const a of this.state.enemies) if (a.joPallet && a.owner === owner) { a.hp = 0; a.deadTime = 1.2; }
  },
  spawnJoPalletWave(e, p) {
    const wave = p.waves || 0;
    if (wave >= 10) return;
    const available = JO_PALLET_LANES.map((_, i) => i).filter(i => i !== p.safeLane);
    const lanes = e.enraged ? available : available.filter((_, i) => i !== wave % 3);
    const facing = wave % 2 ? -1 : 1;
    const hp = this.state.players.length > 1 ? 36 : 26;
    for (const lane of lanes) this.state.enemies.push({ ...this.actor('joPallet', this.nextId++, true),
      joPallet: true, owner: e.id, hp, maxHp: hp, power: 18, value: 0, speed: 0, reach: 0,
      x: facing > 0 ? FLOOR.left - 75 : FLOOR.right + 75, y: JO_PALLET_LANES[lane], lane, facing,
      delay: .7 * difficulty(this.state.difficulty).telegraph, travelSpeed: e.enraged ? 730 : 650,
      ttl: 4.5, hits: [], wave, action: 'walk',
    });
    p.waves = wave + 1;
  },
  updateJoPallet(a, dt) {
    this.tickActor(a, dt);
    if (a.hp <= 0) return;
    const owner = this.state.enemies.find(e => e.id === a.owner && e.hp > 0);
    if (!owner || !this.joChanneling(owner)) { a.hp = 0; a.deadTime = 1.2; return; }
    a.ttl -= dt; a.vx = a.vy = a.vz = a.z = 0;
    if (a.ttl <= 0) { a.hp = 0; a.deadTime = 1.2; return; }
    if (a.delay > 0) { a.delay -= dt; return; }
    if (a.stun > 0) return;
    const previousX = a.x; a.x += a.facing * a.travelSpeed * dt;
    for (const p of this.state.players) if (p.hp > 0 && p.invincible <= 0 && p.z <= 28 && p.action !== 'dodge' && !a.hits.includes(p.id) && Math.abs(p.y - a.y) < 23 && p.x >= Math.min(previousX, a.x) - 65 && p.x <= Math.max(previousX, a.x) + 65) {
      a.hits.push(p.id); this.damage(p, a.power, a, true);
    }
    if (a.x < FLOOR.left - 130 || a.x > FLOOR.right + 130) { a.hp = 0; a.deadTime = 1.2; }
  },
  damageJoPallet(a, amount, heavy) {
    if (!a.joPallet) return false;
    a.hp = Math.max(0, a.hp - amount); a.flash = .12; a.stun = .18; a.vx = a.vy = 0;
    this.event('hit', { x: a.x, y: a.y - 45, amount, heavy, enemy: true, actor: a.id });
    if (a.hp <= 0) { a.deadTime = 0; this.event('break', { x: a.x, y: a.y - 25 }); }
    return true;
  },
  updateJo(e, dt) {
    e.shieldFlash = Math.max(0, (e.shieldFlash || 0) - dt);
    const s = this.state, mode = difficulty(s.difficulty), phase = Math.max(e.bossPhase || 1, e.hp <= e.maxHp * BALANCE.bosses.jo.phases[0] ? 2 : 1);
    if (phase !== e.bossPhase) {
      e.bossPhase = phase; e.enraged = true; e.signatureReady = true;
      this.event('rage', { actor: e.id, label: 'JO LA MOUK · LIVRAISON EXPRESS !' });
    }
    if (e.pattern) {
      const p = e.pattern; p.elapsed += dt; e.action = 'special'; e.vx = e.vy = 0;
      if (!p.hit && p.elapsed >= p.windup) {
        p.hit = true;
        if (p.kind === 'joChannel') this.event('freight', { actor: e.id });
      }
      const t = p.elapsed - p.windup;
      if (p.kind === 'joChannel') {
        if (p.hit) while ((p.waves || 0) < Math.min(10, 1 + Math.floor(t / .26))) this.spawnJoPalletWave(e, p);
      } else if (p.kind === 'joStretch' && p.hit) {
        const count = e.enraged && t >= .55 ? 2 : 1;
        while ((p.beat || 0) < count) {
          p.beat = (p.beat || 0) + 1;
          this.hazard(e, { kind: 'joArm', shape: 'line', width: 930, band: 30, delay: 0, ttl: .13, damage: e.power * 1.15 });
          this.event('swing', { actor: e.id, x: e.x, y: e.y - 137, facing: e.facing, enemy: true });
        }
      } else if (p.kind === 'joMMA' && p.hit) {
        const count = Math.min(3, 1 + Math.floor(t / .23));
        while ((p.beat || 0) < count) {
          p.beat = (p.beat || 0) + 1;
          this.hazard(e, { kind: 'impact', shape: 'line', width: p.beat === 3 ? 150 : 115, band: 38, delay: 0, ttl: .08, damage: e.power * (p.beat === 3 ? 1.1 : .6) });
        }
      } else if (p.kind === 'joRush' && p.hit && t < .4) {
        e.x = clamp(e.x + p.dx * 670 * dt, FLOOR.left + 30, FLOOR.right - 30);
        e.y = clamp(e.y + p.dy * 380 * dt, FLOOR.top + 8, FLOOR.bottom - 8);
        for (const v of s.players) if (v.hp > 0 && v.invincible <= 0 && v.z <= 28 && v.action !== 'dodge' && !p.hits.includes(v.id) && Math.abs(v.x - e.x) < 80 && Math.abs(v.y - e.y) < 34) {
          p.hits.push(v.id); this.damage(v, e.power * 1.15, e, true);
        }
      }
      if (p.elapsed >= p.windup + p.active) {
        if (p.kind === 'joChannel') this.clearJoPallets(e.id);
        e.pattern = null; e.guardHits = 0; e.action = 'idle';
        e.cooldown = e.recovering = (p.signature ? 2.2 : p.kind === 'joStretch' ? 1.2 : e.enraged ? .65 : .85) * mode.recovery;
        if (p.signature) this.event('opening', { x: e.x, y: e.y - 235, label: 'ÉPUISÉ · ENCHAÎNE !' });
      }
      return;
    }
    if (e.cooldown > 0 || e.stun > 0 || e.grabbedBy) return;
    const attackers = s.enemies.filter(a => a.id !== e.id && a.hp > 0 && (a.pattern || a.attack && !a.attack.hit)).length;
    if (attackers >= (s.players.length > 1 ? BALANCE.waves.attackersDuo : BALANCE.waves.attackersSolo)) return;
    const target = s.players.filter(a => a.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (!target) return;
    const n = e.attackCount || 0, kind = e.signatureReady ? 'joChannel' : ['joStretch', 'joMMA', 'joRush', 'joChannel'][n % 4];
    const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy)); e.facing = Math.sign(dx) || e.facing;
    if (kind === 'joMMA' && (Math.abs(dx) > 110 || Math.abs(dy) > 30) || kind === 'joStretch' && Math.abs(dy) > 24) {
      e.x = clamp(e.x + (kind === 'joMMA' ? dx / d * (e.enraged ? 365 : 320) * dt : 0), FLOOR.left + 30, FLOOR.right - 30);
      e.y = clamp(e.y + dy / Math.max(1, Math.abs(dy)) * Math.min(Math.abs(dy), 210 * dt), FLOOR.top + 8, FLOOR.bottom - 8);
      e.action = 'walk'; return;
    }
    e.attackCount = n + 1; e.signatureReady = false; e.actionTime = 0; e.recovering = 0;
    e.pattern = { kind, elapsed: 0, windup: (kind === 'joChannel' ? 1.25 : kind === 'joStretch' ? .95 : kind === 'joRush' ? .7 : .5) * mode.telegraph,
      active: kind === 'joChannel' ? 5.4 : kind === 'joStretch' ? e.enraged ? 1 : .5 : .75,
      signature: kind === 'joChannel', hit: false, dx: dx / d, dy: dy / d, hits: [],
      safeLane: (Math.floor(n / 4) + phase) % 4, waves: 0, targetX: target.x, targetY: target.y };
    if (kind === 'joChannel') this.event('rage', { actor: e.id, label: 'CANALISATION · ÉVITE OU DÉTRUIS LES TRANSPALETTES !' });
  },
};
