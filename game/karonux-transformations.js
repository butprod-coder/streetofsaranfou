import { FLOOR, clamp } from './data.js';
import { karonuxSelection } from './karonux-talents.js';

const nearby = (a, b, radius) => b.hp > 0 && Math.hypot(a.x - b.x, (a.y - b.y) * 1.5) <= radius;
const names = ['GOLF IV', 'REINE DES NEIGES', 'HANDIKARON'];
export const karonuxTransformations = {
  beginKaronux(p) {
    const { branch, rank } = karonuxSelection(p);
    if (branch < 0) return false;
    this.releaseGrab(p);
    p.energy -= 100; p.attack = null; p.cooldown = 0; p.z = p.vz = p.vx = p.vy = 0;
    p.specialState = { kind: 'karonux', transformation: true, branch, rank, ultimate: rank === 6,
      duration: rank >= 6 ? 9 : rank >= 4 ? 7 : 5, elapsed: 0, nextAttack: 0,
      nextDodge: 0, nextJump: 0, nextPulse: 0, pose: 7, poseUntil: .25, hits: {}, speed: 0,
      chain: 0, chainUntil: 0, combo: 0, charge: 0, held: {}, taps: { ...p.taps } };
    p.specialCd = 0; p.action = 'special'; p.invincible = Math.max(p.invincible, .4);
    if (branch === 1 && rank === 6) {
      for (const e of this.state.enemies) if (e.hp > 0) this.karonuxFrost(p, e, 1.5);
      this.event('karonuxWave', { x: p.x, y: p.y });
    }
    this.event('special', { actor: p.id, kind: branch === 0 ? 'golf' : 'blast', label: names[branch], x: p.x, y: p.y });
    return true;
  },
  karonuxEffect(x, y, cell) { this.event('spectacle', { x, y, atlas: 'karonuxFX', cell }); },
  karonuxFrost(p, e, amount) {
    if (e.hp <= 0) return;
    const f = e.karonuxFrost ||= { amount: 0, until: 0, frozenUntil: 0, owner: p.id };
    f.owner = p.id; f.amount = Math.min(3, f.amount + amount); f.until = this.state.time + 4;
    if (f.amount >= 3) { f.frozenUntil = this.state.time + (e.boss ? 1 : 2.5); e.attack = null; e.vx = e.vy = 0; }
  },
  karonuxShatter(p, targets, contagious = false) {
    // Breadth-first queue and one explosion per target prevent recursive cycles.
    const queue = [...targets], seen = new Set();
    while (queue.length) {
      const source = queue.shift(); if (seen.has(source.id)) continue;
      seen.add(source.id); source.karonuxFrost = null;
      this.karonuxEffect(source.x, source.y, 2);
      for (const e of this.state.enemies) if (nearby(source, e, 155)) {
        const frozen = e.karonuxFrost?.frozenUntil > this.state.time;
        this.damage(e, p.specialPower * 1.5, p, true);
        if (contagious && e !== source && e.hp > 0 && !seen.has(e.id)) {
          this.karonuxFrost(p, e, 2);
          if (frozen || e.karonuxFrost?.frozenUntil > this.state.time) queue.push(e);
        }
      }
    }
  },
  karonuxStrike(p, radius, multiplier, { radial = false, frost = false, heavy = false, launch = 0 } = {}) {
    const a = p.specialState;
    for (const e of this.state.enemies) {
      if (!nearby(p, e, radius) || !radial && (e.x - p.x) * p.facing < -25) continue;
      if (frost && heavy && a.rank >= 2 && e.karonuxFrost?.frozenUntil > this.state.time) {
        this.karonuxShatter(p, [e], a.rank >= 5); continue;
      }
      this.damage(e, p.specialPower * multiplier * (a.rank === 6 ? 1.3 : 1), p, heavy);
      if (frost) this.karonuxFrost(p, e, heavy ? 1.5 : 1);
      if (launch && e.hp > 0 && !e.boss && !e.vehicle) {
        e.vx = (Math.sign(e.x - p.x) || p.facing) * launch; e.stun = Math.max(e.stun, .45);
        if (a.branch === 2 && a.rank >= 3) e.karonuxLaunch = { owner: p.id, until: this.state.time + .6, hits: [] };
      }
    }
    for (const prop of this.state.props) if (nearby(p, prop, radius)) this.hitProp(prop, heavy ? 2 : 1, p);
  },
  finishKaronux(p) {
    const a = p.specialState;
    if (!a?.transformation || a.finished || p.hp <= 0 || a.elapsed < a.duration - .45) return;
    a.finished = true; a.pose = a.branch === 0 ? 5 : 7; a.poseUntil = a.duration;
    if (a.rank !== 6) return;
    if (a.branch === 1) this.karonuxShatter(p, this.state.enemies.filter(e => e.hp > 0 && e.karonuxFrost?.frozenUntil > this.state.time), true);
    else { this.karonuxStrike(p, a.branch === 0 ? 245 : 230, 3, { radial: true, heavy: true, launch: 900 }); this.karonuxEffect(p.x, p.y, 14); }
  },
  updateKaronuxTransformation(p, input, dt) {
    const a = p.specialState; a.elapsed += dt; p.action = 'special'; p.attack = null; p.vx = p.vy = 0;
    const fresh = {};
    for (const key of ['punch', 'kick', 'dodge', 'jump']) {
      fresh[key] = !!input[key] && !a.held[key] || (input.taps?.[key] || 0) > (a.taps[key] || 0);
      a.held[key] = !!input[key]; a.taps[key] = input.taps?.[key] || 0;
    }
    if (a.elapsed >= a.duration - (a.rank === 6 ? .45 : 0)) {
      this.finishKaronux(p);
      if (a.elapsed >= a.duration) { this.endSpecial(p); p.action = 'idle'; p.cooldown = 0; p.z = 0; }
      return;
    }
    const x = clamp(input.x || 0, -1, 1), y = clamp(input.y || 0, -1, 1), norm = Math.max(1, Math.hypot(x, y));
    if (a.branch === 0) { this.driveKaronux(p, input, fresh, x / norm, y / norm, dt); return; }
    if (x) p.facing = Math.sign(x);
    const dash = a.elapsed < (a.dashUntil || 0), speed = dash ? 600 : p.speed * (a.branch === 2 ? .85 : 1);
    p.x = clamp(p.x + (dash ? a.dashX : x / norm) * speed * dt, FLOOR.left, FLOOR.right);
    p.y = clamp(p.y + (dash ? a.dashY : y / norm) * speed * .68 * dt, FLOOR.top, FLOOR.bottom);
    a.moving = !!(x || y); if (a.elapsed >= a.poseUntil) a.pose = a.moving ? Math.floor(a.elapsed * 8) % 2 : 0;
    const pose = (cell, duration) => { a.pose = cell; a.poseUntil = a.elapsed + duration; };
    if (fresh.dodge && a.elapsed >= a.nextDodge) {
      a.nextDodge = a.elapsed + 1; a.dashUntil = a.elapsed + .25; a.dashX = x || y ? x / norm : p.facing; a.dashY = y / norm;
      p.invincible = Math.max(p.invincible, .22); pose(a.branch === 1 ? 5 : 6, .35);
      if (a.branch === 2 && a.rank >= 5) { this.karonuxStrike(p, a.rank === 6 ? 210 : 170, 1.8, { radial: true, heavy: true, launch: 330 }); this.karonuxEffect(p.x, p.y, 13); }
    }
    if (a.branch === 1) {
      if (dash && a.rank >= 3 && a.elapsed >= (a.nextTrail || 0)) {
        a.nextTrail = a.elapsed + .07;
        const trails = this.state.karonuxTrails ||= [];
        trails.push({ owner: p.id, x: p.x, y: p.y, until: this.state.time + 2.5 });
        if (trails.length > 40) trails.shift();
      }
      if (a.rank >= 4 && a.elapsed >= a.nextPulse) {
        a.nextPulse = a.elapsed + .45;
        for (const e of this.state.enemies) if (nearby(p, e, 150)) this.karonuxFrost(p, e, .55);
        this.karonuxEffect(p.x, p.y, 0);
      }
      if (a.elapsed >= a.nextAttack && (input.punch || fresh.punch || input.kick || fresh.kick)) {
        const heavy = !!(input.kick || fresh.kick); a.nextAttack = a.elapsed + (heavy ? .5 : .28); pose(heavy ? 4 : 3, .23);
        this.karonuxStrike(p, heavy ? 165 : 140, heavy ? 1.5 : .8, { frost: true, heavy });
        this.karonuxEffect(p.x + p.facing * 85, p.y - 35, 0);
      }
    } else {
      if (a.rank >= 3 && input.kick && a.elapsed >= a.nextAttack) { a.charge = Math.min(1.2, a.charge + dt); pose(4, .1); }
      if (a.elapsed >= a.nextAttack && (a.charge > 0 && !input.kick || a.rank < 3 && (input.kick || fresh.kick) || a.rank >= 3 && fresh.kick && !input.kick)) {
        this.karonuxStrike(p, 170, 1.5 + a.charge * 1.7, { heavy: true, launch: 400 + a.charge * 500 });
        a.charge = 0; a.nextAttack = a.elapsed + .55; pose(4, .35);
      } else if (a.elapsed >= a.nextAttack && !input.kick && (input.punch || fresh.punch)) {
        a.combo = a.rank >= 2 ? a.combo % 3 + 1 : 1;
        const heavy = a.combo === 3; pose(heavy ? 4 : a.combo === 2 ? 3 : 2, .2);
        this.karonuxStrike(p, heavy ? 165 : 145, heavy ? 1.6 : 1, { heavy, launch: heavy ? 550 : 180 }); a.nextAttack = a.elapsed + .24;
      }
      if (fresh.jump && a.rank >= 4 && a.elapsed >= a.nextJump) { a.nextJump = a.elapsed + 1.4; a.landAt = a.elapsed + .6; pose(5, .6); }
      if (a.landAt) {
        p.z = Math.sin(Math.max(0, (a.landAt - a.elapsed) / .6) * Math.PI) * 85; p.vz = 0;
        if (a.elapsed >= a.landAt) { a.landAt = 0; p.z = 0; pose(7, .3); this.karonuxStrike(p, a.rank === 6 ? 210 : 175, 2, { radial: true, heavy: true, launch: 600 }); this.karonuxEffect(p.x, p.y, 14); }
      }
    }
  },
  driveKaronux(p, input, fresh, x, y, dt) {
    const a = p.specialState, old = { x: p.x, y: p.y };
    if (a.elapsed > a.chainUntil) a.chain = 0;
    a.speed = Math.min(a.rank >= 6 ? 650 : a.rank >= 4 ? 550 : 450, a.speed + (a.rank >= 6 ? 2400 : a.rank >= 4 ? 1300 : 700) * dt);
    if (!x && !y) a.speed = Math.max(0, a.speed - 1800 * dt);
    if (fresh.punch && a.rank >= 2 && a.elapsed >= a.nextAttack) { a.reverseUntil = a.elapsed + .28; a.nextAttack = a.elapsed + .7; }
    if (fresh.kick && a.rank >= 3 && a.elapsed >= a.nextDodge) {
      a.driftUntil = a.elapsed + .5; a.nextDodge = a.elapsed + .9;
      this.karonuxStrike(p, a.rank === 6 ? 225 : 165, 1.7, { radial: true, heavy: true, launch: a.rank === 6 ? 800 : 500 });
      this.karonuxEffect(p.x, p.y, 13);
    }
    const reverse = a.elapsed < (a.reverseUntil || 0), drift = a.elapsed < (a.driftUntil || 0);
    if (x && !reverse) p.facing = Math.sign(x);
    const speed = (reverse ? 700 : a.speed) * (1 + a.chain * .08);
    p.x = clamp(p.x + (reverse ? -p.facing : x) * speed * dt, FLOOR.left, FLOOR.right);
    p.y = clamp(p.y + y * speed * .65 * dt, FLOOR.top, FLOOR.bottom);
    a.moving = p.x !== old.x || p.y !== old.y; a.pose = reverse ? 4 : drift ? 5 + Math.floor(a.elapsed * 12) % 2 : a.moving ? Math.floor(a.elapsed * 10) % 2 : 0;
    p.invincible = Math.max(p.invincible, .06);
    for (const e of [...this.state.enemies, ...this.state.props]) {
      if (e.hp <= 0) continue;
      const dx = p.x - old.x, dy = p.y - old.y;
      const t = clamp(((e.x - old.x) * dx + (e.y - old.y) * dy * 4) / (dx * dx + dy * dy * 4 || 1), 0, 1);
      const swept = Math.hypot(e.x - old.x - dx * t, (e.y - old.y - dy * t) * 2) < 105;
      const touching = Math.hypot(e.x - p.x, (e.y - p.y) * 2) < 105;
      const hit = a.hits[e.id] ||= { touching: false, next: 0 };
      if (a.moving && swept && !hit.touching && a.elapsed >= hit.next) {
        hit.next = a.elapsed + .65;
        if (this.state.enemies.includes(e)) {
          this.damage(e, p.specialPower * (a.rank === 6 ? 2.5 : 1.7), p, true);
          if (!e.boss && !e.vehicle) { e.vx = (reverse ? -p.facing : p.facing) * (a.rank >= 4 ? 800 : 450); e.stun = Math.max(e.stun, .5); }
          if (a.rank >= 5) { a.chain = Math.min(5, a.chain + 1); a.chainUntil = a.elapsed + 1.5; }
          if (a.rank < 4) a.speed *= .65;
        } else this.hitProp(e, 3, p);
        this.karonuxEffect(e.x, e.y, 12);
      }
      hit.touching = touching && hit.next > 0;
    }
  },
  updateKaronuxWorld(dt) {
    const now = this.state.time;
    this.state.karonuxTrails = (this.state.karonuxTrails || []).filter(t => t.until > now);
    for (const e of this.state.enemies) {
      if (e.karonuxFrost && e.karonuxFrost.until <= now) e.karonuxFrost = null;
      for (const t of this.state.karonuxTrails) if (nearby(t, e, 65) && (e.karonuxSlipUntil || 0) < now) {
        e.karonuxSlipUntil = now + .8; e.vx = (e.facing || 1) * 240; e.stun = Math.max(e.stun, .4); e.action = 'hurt'; break;
      }
      const launch = e.karonuxLaunch;
      if (!launch) continue;
      if (launch.until <= now) { e.karonuxLaunch = null; continue; }
      const owner = this.state.players.find(p => p.id === launch.owner);
      if (owner) for (const target of this.state.enemies) if (target !== e && nearby(e, target, 60) && !launch.hits.includes(target.id)) {
        launch.hits.push(target.id); this.damage(target, owner.specialPower, owner, true);
        if (!target.boss) { target.vx = Math.sign(e.vx || owner.facing) * 400; target.stun = Math.max(target.stun, .5); }
      }
    }
  },
};
