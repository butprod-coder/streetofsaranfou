import Phaser from 'phaser';
import { W, COL } from '../config/gameConfig.js';
import { hasFrameClip } from '../config/frameAnims.js';
import { padForPlayer, PAD } from '../input/gamepad.js';

/** Portée de saisie (px). */
const GRAB_RANGE_X = 46;
const GRAB_RANGE_Y = 22;
/** Durée avant que l'ennemi ne se dégage (ms). */
const GRAB_HOLD_MS = 1500;
/** Distance de projection avant (px). */
const THROW_DIST = 250;
/** Projection arrière — plus courte. */
const THROW_BACK_DIST = 165;
/** Dégâts à l'atterrissage si personne n'est percuté. */
const THROW_BACK_DMG = 4;

/** GameScene mixin — choppe : saisie au contact, coups de genou, projection. */
export const grabMixin = {
  _grabOf(p) {
    return p?._grabbing?.active ? p._grabbing : null;
  },

  _playerFrameKey(p) {
    return p?.frameSheet ?? p?.sheet;
  },

  _playGrabHold(p) {
    if (!p) return;
    const frameKey = this._playerFrameKey(p);
    p.state2 = 'grab';
    if (hasFrameClip(frameKey, 'grab')) {
      this._primeFrameClip?.(p, 'grab');
      this.anim(p, 'grab', true);
      this._syncFrameFit?.(p);
    } else {
      this.anim(p, 'idle');
    }
  },

  _playGrabKnee(p) {
    if (!p) return;
    const frameKey = this._playerFrameKey(p);
    const animKey = frameKey + '_grabKnee';
    if (hasFrameClip(frameKey, 'grabKnee') && this.anims.exists(animKey)) {
      this._primeFrameClip?.(p, 'grabKnee');
      this.anim(p, 'grabKnee', false);
      this._syncFrameFit?.(p);
      p.once('animationcomplete', (anim) => {
        if (anim.key !== animKey || !p.active) return;
        if (p._grabbing) {
          this._playGrabHold(p);
          return;
        }
        if (p.state2 === 'grab') {
          p.state2 = 'idle';
          this.anim(p, 'idle');
        }
      });
      return;
    }
    this.anim(p, 'attack', false);
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
    this._playGrabHold(p);
    this.sfx('hit', { vol: 0.6 });
    this.floatText(e.x, e.y - 64, 'SAISI !', COL.cyan);
  },

  _releaseGrab(p, opts = {}) {
    if (!p) return;
    const e = p._grabbing;
    p._grabbing = null;
    p._grabCdUntil = this.time.now + (opts.cd ?? 600);
    if (p.state2 === 'grab') {
      p.state2 = 'idle';
      this.anim(p, 'idle');
    }
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
      this._grabThrow(p, e, cfg, { dir: p.facing, heavy: true });
      return;
    }

    this._playGrabKnee(p);
    this.tweens.add({ targets: p, x: p.x + p.facing * 8, duration: 70, yoyo: true });
    const dmg = Math.max(4, Math.round(cfg.damage * 0.7));
    this.hurt(e, dmg, p.facing, p.x, p);
  },

  /** Projection arrière : direction opposée + ○, petits dégâts sauf collision ennemi. */
  grabThrowBack(slot = 0) {
    const p = this.playerAt(slot);
    const e = this._grabOf(p);
    if (!e || this.isPlayerStunned(p)) return;
    const now = this.time.now;
    if (now < (p._grabNextHit || 0)) return;
    p._grabNextHit = now + 300;
    const cfg = this.cfgAt(slot);
    this._grabThrow(p, e, cfg, {
      dir: -p.facing,
      dist: THROW_BACK_DIST,
      arcH: 36,
      duration: 280,
      heavy: false,
      collideDmg: 10,
      hitStopMs: 45,
      shakeMs: 80,
      shakeMag: 0.005,
      sfxKey: 'hit',
      sfxVol: 0.55,
    });
    this.floatText(p.x, p.y - 72, 'PROPULSÉ !', COL.grey);
  },

  _grabBackHeld(slot = 0) {
    const p = this.playerAt(slot);
    if (!p) return false;
    const pad = padForPlayer(this, slot);
    if (!pad) return false;
    const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
    const dz = 0.35;
    if (p.facing > 0) {
      return ax < -dz || !!(pad.buttons[PAD.LEFT] && pad.buttons[PAD.LEFT].pressed);
    }
    return ax > dz || !!(pad.buttons[PAD.RIGHT] && pad.buttons[PAD.RIGHT].pressed);
  },

  /** Projection : l'ennemi vole, peut renverser ceux qu'il traverse. */
  _grabThrow(p, e, cfg, opts = {}) {
    const dir = opts.dir ?? p.facing;
    const heavy = opts.heavy !== false;
    const dist = opts.dist ?? THROW_DIST;
    const arcH = opts.arcH ?? 52;
    const duration = opts.duration ?? 380;
    const collideDmg = opts.collideDmg ?? 10;
    p._grabbing = null;
    p._grabCdUntil = this.time.now + (heavy ? 800 : 650);
    e._grabbedBy = null;
    e._thrown = true;

    this._playGrabKnee(p);
    const sfxKey = opts.sfxKey ?? 'special';
    const sfxVol = opts.sfxVol ?? 0.7;
    this.sfx(sfxKey, { vol: sfxVol });
    if (opts.hitStopMs) this.hitStop(opts.hitStopMs);
    if (opts.shakeMs) this.shake(opts.shakeMs, opts.shakeMag ?? 0.008);
    else if (heavy) {
      this.hitStop(70);
      this.shake(120, 0.008);
    }

    const startX = e.x;
    const startY = e.y;
    const endX = Phaser.Math.Clamp(startX + dir * dist, 30, W - 30);
    const hitSet = new Set();
    const flight = { t: 0 };

    e.state2 = 'fall';
    this.anim(e, 'fall', false);

    this.tweens.add({
      targets: flight,
      t: 1,
      duration,
      ease: 'Linear',
      onUpdate: () => {
        if (!e.active) return;
        const t = flight.t;
        e.x = Phaser.Math.Linear(startX, endX, t);
        e.y = startY - arcH * Math.sin(Math.PI * t);
        e.setDepth(Math.floor(startY) + 500);
        for (const o of this.enemies.getChildren()) {
          if (o === e || !o?.active || o.hp <= 0 || o.dying || o.bossDef || hitSet.has(o)) continue;
          if (Math.abs(o.x - e.x) < 42 && Math.abs(o.y - startY) < 34) {
            hitSet.add(o);
            this.hurt(o, collideDmg, dir, e.x, null, { fromPlayer: true, ownerSlot: p.playerSlot ?? 0 });
            this.spawnSpark(o.x, o.y - 40);
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
        const bowled = hitSet.size > 0;
        if (heavy) {
          this.spawnSpark(e.x, e.y - 20);
          this.hurt(e, cfg.damage + 6, dir, p.x, null, {
            fromPlayer: true,
            ownerSlot: p.playerSlot ?? 0,
            knockdown: true,
          });
          return;
        }
        if (bowled) {
          e.state2 = 'idle';
          this.anim(e, 'idle');
          e.nextAttack = this.time.now + 450;
          return;
        }
        this.spawnSpark(e.x, e.y - 16);
        this.hurt(e, THROW_BACK_DMG, dir, p.x, null, {
          fromPlayer: true,
          ownerSlot: p.playerSlot ?? 0,
          knockdown: false,
        });
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
      e.setDepth(p.depth + 1);
      const frameKey = this._playerFrameKey(p);
      const grabKey = frameKey + '_grab';
      const kneeKey = frameKey + '_grabKnee';
      if (
        hasFrameClip(frameKey, 'grab') &&
        p.anims.currentAnim?.key !== grabKey &&
        p.anims.currentAnim?.key !== kneeKey
      ) {
        this._playGrabHold(p);
      }
    }
  },
};
