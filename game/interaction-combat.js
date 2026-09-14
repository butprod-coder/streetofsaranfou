import { FLOOR, clamp } from './data.js';
import { WEAPONS, WEAPON_IDS, GRAPPLE } from './weapons.js';
import { HEAVY_ENEMIES } from './weapons.js';
import { hasTalent } from './rogue-talents.js';

const near = (a, b, range, band) => Math.abs(a.x - b.x) <= range && Math.abs(a.y - b.y) <= band;
export const interactionCombat = {
  streetWeapons() {
    const s = this.state;
    if (![0, 2, 4].includes(s.stage)) return [];
    const weapon = WEAPON_IDS[(s.chapter * 3 + s.stage / 2) % WEAPON_IDS.length];
    return [{ id: this.nextId++, kind: 'weapon', weapon, uses: WEAPONS[weapon].uses, x: 535 + s.stage * 55, y: s.stage === 2 ? 612 : 495 }];
  },
  dropWeapon(p) {
    if (!p.weapon) return;
    if (p.weapon.uses > 0) this.state.pickups.push({ id: this.nextId++, kind: 'weapon', weapon: p.weapon.kind, uses: p.weapon.uses,
      x: clamp(p.x - p.facing * 28, FLOOR.left, FLOOR.right), y: p.y });
    p.weapon = null;
  },
  pickWeapon(p) {
    if (p.z > 0 || p.attack || p.grapple || p.specialState || p.stun > 0 || p.hp <= 0) return false;
    const items = this.state.pickups.filter(i => i.kind === 'weapon' && Object.hasOwn(WEAPONS, i.weapon) && near(p, i, 70, 38));
    const item = items.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (!item) { this.dropWeapon(p); return false; }
    this.state.pickups = this.state.pickups.filter(i => i.id !== item.id);
    this.dropWeapon(p); p.weapon = { kind: item.weapon, uses: item.uses }; p.interaction = { kind: 'pickup', elapsed: 0, duration: .38 };
    p.attack = null; p.vx = 0; p.vy = 0; p.action = 'pickup'; p.actionTime = 0;
    this.event('equip', { actor: p.id, x: p.x, y: p.y - 125, label: WEAPONS[item.weapon].name }); return true;
  },
  tryGrab(p) {
    if (p.hp <= 0 || p.z > 0 || p.attack || p.cooldown > 0 || p.specialState && p.kind !== 'gustavax' || p.stun > 0 || p.grabCd > 0) return false;
    const targets = this.state.enemies.filter(e => e.hp > 0 && !e.vehicle && !e.grabbedBy && !e.thrown && e.invincible <= 0 && e.z === 0 &&
      near(p, e, hasTalent(p, 'Ramène-toi') && !e.boss && !HEAVY_ENEMIES.has(e.kind) ? 100 : GRAPPLE.range, GRAPPLE.band) && (!e.boss || e.recovering > 0) && (!e.elite || e.stun > 0));
    const target = targets.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (!target) return false;
    p.facing = Math.sign(target.x - p.x) || p.facing;
    p.grapple = { target: target.id, elapsed: 0, throwing: false, facing: p.facing };
    p.action = 'grab'; p.actionTime = 0; p.vx = 0; p.vy = 0; p.moving = false;
    target.grabbedBy = p.id; target.attack = null; target.pattern = null; target.vx = 0; target.vy = 0;
    this.rogueOnGrab(p, target);
    this.event('grab', { actor: p.id, x: p.x, y: p.y - 135 }); return true;
  },
  releaseGrab(p) {
    if (!p.grapple) return;
    const e = this.state.enemies.find(e => e.id === p.grapple.target);
    if (e?.grabbedBy === p.id) { e.grabbedBy = null; e.z = 0; e.vz = 0; e.stun = Math.max(e.stun, .2); }
    p.grapple = null; p.grabCd = GRAPPLE.cooldown;
  },
  updateInteraction(p, pressedGrab, dt, input = {}) {
    if (p.grabCd > 0) p.grabCd = Math.max(0, p.grabCd - dt);
    if (p.interaction) {
      p.interaction.elapsed += dt; p.action = 'pickup'; p.moving = false;
      if (p.interaction.elapsed >= p.interaction.duration) p.interaction = null;
      return true;
    }
    const g = p.grapple; if (!g) return false;
    const e = this.state.enemies.find(e => e.id === g.target);
    if (!e || p.hp <= 0 || p.stun > 0 || !g.released && (e.hp <= 0 || e.grabbedBy !== p.id)) { this.releaseGrab(p); return false; }
    g.elapsed += dt; p.vx = 0; p.vy = 0; p.moving = false; p.facing = g.facing;
    if (!g.throwing && hasTalent(p, 'À emporter')) { p.x = clamp(p.x + (input.x || 0) * p.speed * .4 * dt, FLOOR.left, FLOOR.right); p.y = clamp(p.y + (input.y || 0) * p.speed * .3 * dt, FLOOR.top, FLOOR.bottom); }
    if (!g.throwing && hasTalent(p, 'Changement de programme') && input.punch && input.y > .35) { pressedGrab = true; g.slam = true; }
    if (!g.throwing && pressedGrab) { g.throwing = true; g.elapsed = 0; p.actionTime = 0; }
    if (!g.throwing && g.elapsed >= GRAPPLE.holdTime + (hasTalent(p, 'Prise ferme') ? 1.2 : 0)) { this.releaseGrab(p); return true; }
    p.action = g.throwing ? 'throw' : 'grab';
    if (!g.released) {
      e.x = clamp(p.x + g.facing * 42, FLOOR.left, FLOOR.right); e.y = p.y + 1;
      e.z = g.throwing ? 30 + 70 * Math.min(1, g.elapsed / GRAPPLE.throwAt) : 0;
      e.vz = 0; e.vx = 0; e.vy = 0; e.attack = null; e.pattern = null; e.action = 'hurt'; e.stun = .2;
      if (g.throwing && g.elapsed >= GRAPPLE.throwAt) {
        g.released = true; e.grabbedBy = null;
        const heavy = (HEAVY_ENEMIES.has(e.kind) || e.boss && ['gustavax', 'lorenzo'].includes(e.kind)) && !(hasTalent(p, 'Personne n’est trop lourd') && !e.boss);
        e.thrown = { owner: p.id, heavy, elapsed: 0, fromX: e.x, toX: heavy || g.slam ? e.x : clamp(p.x - g.facing * GRAPPLE.distance, FLOOR.left, FLOOR.right), y: e.y, fromZ: heavy ? 35 : e.z, hits: [] };
        e.action = 'hurt'; e.stun = GRAPPLE.flight + .4;
        this.rogueOnThrow(p, e);
        this.event('throw', { actor: p.id, x: p.x, y: p.y - 110 });
      }
    }
    if (g.throwing && g.elapsed >= GRAPPLE.throwDuration) this.releaseGrab(p);
    return true;
  },
  updateThrown(e, dt) {
    if (e.grabbedBy) {
      const p = this.state.players.find(p => p.id === e.grabbedBy && p.hp > 0 && p.grapple?.target === e.id);
      if (!p) { e.grabbedBy = null; e.z = 0; e.stun = .2; } else { e.attack = null; e.action = 'hurt'; return true; }
    }
    const t = e.thrown; if (!t) return false;
    t.elapsed += dt; const progress = Math.min(1, t.elapsed / GRAPPLE.flight);
    e.x = t.fromX + (t.toX - t.fromX) * progress; e.y = t.y; e.z = t.fromZ * (1 - progress) + Math.sin(progress * Math.PI) * (t.heavy ? 15 : 115);
    e.vx = 0; e.vy = 0; e.vz = 0; e.attack = null; e.action = e.hp > 0 ? 'hurt' : 'dead'; e.moving = false;
    const owner = this.state.players.find(p => p.id === t.owner) || { id: t.owner, x: t.fromX, facing: Math.sign(t.toX - t.fromX), power: 19 };
    if (!t.heavy && e.z < 85) for (const other of this.state.enemies) {
      if (other.id === e.id || other.hp <= 0 || other.invincible > 0 || t.hits.includes(other.id) || !near(e, other, 62, 40)) continue;
      t.hits.push(other.id); this.damage(other, Math.round(owner.power), owner, true);
    }
    if (progress >= 1) {
      e.thrown = null; e.z = 0; e.vz = 0;
      if (t.heavy) {
        if (owner.hp > 0 && near(e, owner, 100, 50) && owner.z < 28) this.damage(owner, GRAPPLE.crushDamage, e, true);
        this.event('opening', { x: e.x, y: e.y - 140, label: 'TROP LOURD !' });
      } else if (e.hp > 0) this.damage(e, Math.round(owner.power * GRAPPLE.damage), owner, true);
      e.vx = 0; e.stun = Math.max(e.stun, .5);
    }
    return true;
  },
  startWeaponAttack(p) {
    const w = p.weapon, b = w && WEAPONS[w.kind];
    if (!b || w.uses <= 0 || p.z > 0 || p.specialState) return false;
    p.action = 'weapon'; p.actionTime = 0; p.comboStep = 0;
    p.attack = { type: 'weapon', weapon: w.kind, elapsed: 0, windup: b.windup, duration: b.duration, hit: false, heavy: true };
    p.cooldown = b.duration + .02; return true;
  },
  resolveWeaponAttack(p) {
    const kind = p.attack.weapon, b = WEAPONS[kind];
    if (!b || p.weapon?.kind !== kind || p.weapon.uses <= 0) return;
    p.weapon.uses--;
    const targets = this.state.enemies.filter(e => e.hp > 0 && e.invincible <= 0 && e.z < 40 &&
      (e.x - p.x) * p.facing >= -18 && (e.x - p.x) * p.facing <= b.range && Math.abs(e.y - p.y) <= b.band)
      .sort((a, z) => Math.abs(a.x - p.x) - Math.abs(z.x - p.x));
    for (const target of b.gun && kind !== 'shotgun' ? targets.slice(0, 1) : targets) this.damage(target, Math.round(p.power * b.power * (p.bonuses.weaponPower || 1)), p, true);
    for (const prop of this.state.props) if (prop.hp > 0 && !(prop.kind === 'easel' && !prop.enemy) &&
      (prop.x - p.x) * p.facing >= -18 && (prop.x - p.x) * p.facing <= b.range && Math.abs(prop.y - p.y) <= b.band) this.hitProp(prop, kind === 'bat' ? 3 : 2, p);
    if (b.gun) {
      const range = targets.length && kind !== 'shotgun' ? Math.min(b.range, Math.abs(targets[0].x - p.x)) : b.range;
      this.event('gunshot', { actor: p.id, x: p.x + p.facing * (40 + b.width * .8), y: p.y - 101, facing: p.facing, range, weapon: kind });
      if (kind === 'shotgun') { p.vx -= p.facing * 440; p.moving = false; }
    } else this.event('swing', { actor: p.id, x: p.x, y: p.y - 60, heavy: true });
    if (p.weapon.uses <= 0) { p.weapon = null; this.event('equip', { actor: p.id, x: p.x, y: p.y - 125, label: b.gun ? 'PLUS DE MUNITIONS' : 'ARME USÉE' }); }
  },
};
