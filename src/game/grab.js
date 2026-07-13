import Phaser from 'phaser';
import { W, COL } from '../config/gameConfig.js';

/** Portée de saisie (px). */
const GRAB_RANGE_X = 46;
const GRAB_RANGE_Y = 22;
/** Durée avant que l'ennemi ne se dégage (ms). */
const GRAB_HOLD_MS = 1500;
/** Distance de projection (px). */
const THROW_DIST = 250;

/** GameScene mixin — choppe : saisie au contact, coups de genou, projection. */
export const grabMixin = {
  _grabOf(p) {
    return p?._grabbing?.active ? p._grabbing : null;
  },

  _enemyGrabbable(e, p, now) {
    if (!e?.active || e.hp <= 0 || e.dying || e.bossDef || e._grabbedBy || e._thrown) return false;
    if (e.type2 === 'makouille') return false;
    if (e.state2 === 'special' || (e.busy || 0) > now) return false;
    if (e.type2 === 'triso' && this._hitTrisoFromBehind && !this._hitTrisoFromBehind(e, p.x)) return false;
    const dx = e.x - p.x;
    if (Math.sign(dx || p.facing) !== p.facing) return false;
    return Math.abs(dx) <= GRAB_RANGE_X && Math.abs(e.y - p.y) <= GRAB_RANGE_Y;
  },

  /** Saisie automatique en marchant au contact d'un ennemi (mains nues). */
  tryAutoGrab(p) {
    const now = this.time.now;
    if (!p || p._grabbing || p.airborne || p.weapon || p.hp <= 0) return;
    if ((p._grabCdUntil || 0) > now) return;
    if (this.phase !== 'fight' && this.phase !== 'boss') return;
    if (p.state2 !== 'walk' && p.state2 !== 'idle') return;
    if (!this.enemies?.getChildren) return;
    for (const e of this.enemies.getChildren()) {
      if (!this._enemyGrabbable(e, p, now)) continue;
      this._startGrab(p, e);
      return;
    }
  },

  _startGrab(p, e) {
    const now = this.time.now;
    p._grabbing = e;
    p._grabHits = 0;
    p._grabUntil = now + GRAB_HOLD_MS;
    p.setVelocity(0, 0);
    e._grabbedBy = p;
    e.setVelocity(0, 0);
    e.state2 = 'grabbed';
    e.facing = -p.facing;
    e.setFlipX(e.facing < 0);
    this.anim(e, 'hurt', false);
    this.sfx('hit', { vol: 0.6 });
    this.floatText(e.x, e.y - 64, 'SAISI !', COL.cyan);
  },

  _releaseGrab(p, opts = {}) {
    if (!p) return;
    const e = p._grabbing;
    p._grabbing = null;
    p._grabCdUntil = this.time.now + (opts.cd ?? 600);
    if (e?.active) {
      e._grabbedBy = null;
      if (!e.dying && e.hp > 0 && e.state2 === 'grabbed') {
        e.state2 = 'idle';
        this.anim(e, 'idle');
        e.nextAttack = this.time.now + 400;
      }
    } else if (e) {
      e._grabbedBy = null;
    }
  },

  /** Attaque pendant la choppe : 2 coups de genou puis projection. */
  grabKnee(slot = 0) {
    const p = this.playerAt(slot);
    const e = this._grabOf(p);
    if (!e || this.isPlayerStunned(p)) return;
    const now = this.time.now;
    if (now < (p._grabNextHit || 0)) return;
    p._grabNextHit = now + 260;
    const cfg = this.cfgAt(slot);
    p._grabHits = (p._grabHits || 0) + 1;
    p._grabUntil = now + 1100;

    if (p._grabHits >= 3) {
      this._grabThrow(p, e, cfg);
      return;
    }

    this.anim(p, 'attack', false);
    this.tweens.add({ targets: p, x: p.x + p.facing * 8, duration: 70, yoyo: true });
    const dmg = Math.max(4, Math.round(cfg.damage * 0.7));
    this.hurt(e, dmg, p.facing, p.x, p);
  },

  /** Projection : l'ennemi vole, renverse ceux qu'il traverse. */
  _grabThrow(p, e, cfg) {
    const dir = p.facing;
    p._grabbing = null;
    p._grabCdUntil = this.time.now + 800;
    e._grabbedBy = null;
    e._thrown = true;

    this.anim(p, 'attack', false);
    this.sfx('special', { vol: 0.7 });
    this.hitStop(70);
    this.shake(120, 0.008);

    const startX = e.x;
    const startY = e.y;
    const endX = Phaser.Math.Clamp(startX + dir * THROW_DIST, 30, W - 30);
    const hitSet = new Set();
    const flight = { t: 0 };

    e.state2 = 'fall';
    this.anim(e, 'fall', false);

    this.tweens.add({
      targets: flight,
      t: 1,
      duration: 380,
      ease: 'Linear',
      onUpdate: () => {
        if (!e.active) return;
        const t = flight.t;
        e.x = Phaser.Math.Linear(startX, endX, t);
        e.y = startY - 52 * Math.sin(Math.PI * t);
        e.setDepth(Math.floor(startY) + 500);
        for (const o of this.enemies.getChildren()) {
          if (o === e || !o?.active || o.hp <= 0 || o.dying || o.bossDef || hitSet.has(o)) continue;
          if (Math.abs(o.x - e.x) < 42 && Math.abs(o.y - startY) < 34) {
            hitSet.add(o);
            this.hurt(o, 10, dir, e.x, null, { fromPlayer: true, ownerSlot: p.playerSlot ?? 0 });
          }
        }
      },
      onComplete: () => {
        if (!e.active) {
          if (e) e._thrown = false;
          return;
        }
        e._thrown = false;
        e.y = startY;
        e.setDepth(Math.floor(startY));
        this.spawnSpark(e.x, e.y - 20);
        this.hurt(e, cfg.damage + 6, dir, p.x, null, { fromPlayer: true, ownerSlot: p.playerSlot ?? 0, knockdown: true });
      },
    });
  },

  /** Entretien des choppes en cours (appelé chaque frame). */
  updateGrabs() {
    for (const p of this.allPlayers()) {
      if (!p) continue;
      const e = p._grabbing;
      if (!e) continue;
      if (!e.active || e.hp <= 0 || e.dying || !p.active || p.hp <= 0 || this.isPlayerStunned(p)) {
        this._releaseGrab(p);
        continue;
      }
      if (this.time.now > p._grabUntil) {
        // L'ennemi se dégage et repousse le joueur
        this._releaseGrab(p, { cd: 900 });
        this.flash(e, 0xffdd66);
        this.floatText(e.x, e.y - 64, 'DÉGAGÉ !', COL.grey);
        this.tweens.add({ targets: p, x: Phaser.Math.Clamp(p.x - p.facing * 46, 24, W - 24), duration: 140 });
        continue;
      }
      e.x = p.x + p.facing * 38;
      e.y = p.y;
      e.setVelocity(0, 0);
    }
  },
};
