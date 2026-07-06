import Phaser from 'phaser';
import { ENEMY_TYPES } from '../config/enemies.js';
import { CONFIG, DIFF } from '../config/difficulty.js';
import { FW, FH } from '../config/gameConfig.js';
import { FRAME_ANIM_CHARS, FRAME_DISPLAY_H_MUL, hasFrameClip, resolveFrameSheet } from '../config/frameAnims.js';

/** GameScene mixin: fighter.js */
export const fighterMixin = {
  _frameRefHeight(f) {
    if (f._frameRefH) return f._frameRefH;
    const fa = FRAME_ANIM_CHARS[f.frameSheet ?? f.sheet];
    const refKey = fa?.displayRef ?? fa?.idle?.[0] ?? fa?.walk?.[0];
    if (!refKey || !this.textures.exists(refKey)) return null;
    const tex = this.textures.get(refKey);
    const src = tex?.getSourceImage?.() || tex?.source?.[0];
    f._frameRefH = src?.height || tex?.height || null;
    return f._frameRefH;
  },

  _fitFrameSprite(f) {
    const fa = FRAME_ANIM_CHARS[f.frameSheet ?? f.sheet];
    const hMul = fa?.heightMul ?? FRAME_DISPLAY_H_MUL;
    const dispH = FH * f.scaleBase * hMul;
    const w = f.texture.source[0].width;
    const h = f.texture.source[0].height;
    if (!h) return;
    const refH = this._frameRefHeight(f) || h;
    const displayH = dispH * (h / refH);
    f.setDisplaySize(displayH * (w / h), displayH);
  },

  _setFrameHitbox(f) {
    const w = f.texture.source[0].width;
    const h = f.texture.source[0].height;
    f.setSize(30, 14);
    f.setOffset((w - 30) / 2, h - 18);
  },

  _restoreFrameDefault(f) {
    const fa = FRAME_ANIM_CHARS[f.frameSheet ?? f.sheet];
    const tex = fa?.idle?.[0] ?? fa?.walk?.[0];
    if (!tex) return;
    f.setTexture(tex);
    this._fitFrameSprite(f);
    this._setFrameHitbox(f);
  },

  makeFighter(x, y, sheet, o) {
    const frameSheet = resolveFrameSheet(sheet);
    const fa = FRAME_ANIM_CHARS[frameSheet];
    const tex = fa ? (fa.idle?.[0] ?? fa.walk[0]) : sheet;
    const f = this.physics.add.sprite(x, y, tex, 0);
    f.sheet = sheet;
    f.frameSheet = fa ? frameSheet : sheet;
    f.setOrigin(0.5, 0.94);
    f.scaleBase = o.scale || 1;
    f.hpMax = o.hpMax;
    f.hp = o.hpMax;
    f.speedV = o.speed;
    f.isPlayer = !!o.isPlayer;
    f.state2 = 'idle';
    f.invuln = 0;
    f.nextAttack = 0;
    f.facing = -1;
    f.busy = 0;
    f.jumpZ = 0;
    f.jumpVZ = 0;
    f.airborne = false;
    f.weapon = null;

    if (fa) {
      f.usesFrameAnim = true;
      this._fitFrameSprite(f);
      this._setFrameHitbox(f);
      f.on('animationupdate', (_anim, frame) => {
        if (!f.active || !f.usesFrameAnim) return;
        const texKey = frame?.textureKey ?? f.texture?.key;
        if (f._lastFitKey === texKey) return;
        f._lastFitKey = texKey;
        this._fitFrameSprite(f);
        this._setFrameHitbox(f);
      });
    } else {
      f.setScale(f.scaleBase);
      const fw_ = Math.round(f.texture.source[0].width / 5);
      const fh_ = Math.round(f.texture.source[0].height / 6);
      const hw = 30;
      const hh = 14;
      f.setSize(hw, hh);
      f.setOffset((fw_ - hw) / 2, fh_ - 18);
      f.setFrame(0);
    }

    if (o.type) {
      const e = ENEMY_TYPES[o.type];
      f.type2 = o.type;
      f.damage = Math.round(e.damage * DIFF().dmgMul);
      f.reach = e.reach;
      f.attackCd = e.attackCd;
      f.score = e.score;
      if (e.tint !== 0xffffff) {
        f.baseTint = e.tint;
        f.setTint(e.tint);
      }
    }
    if (o.boss) {
      const b = o.boss;
      f.bossDef = b;
      f.bossCustom = b.custom;
      f.damage = Math.round(b.damage * DIFF().dmgMul);
      f.reach = b.reach;
      f.attackCd = b.attackCd;
      f.score = b.score;
      f.bossTimer = 0;
      f.enraged = false;
      if (b.tint !== 0xffffff) {
        f.baseTint = b.tint;
        f.setTint(b.tint);
      }
    }
    return f;
  },

  _playSheetAnimOnFrameSprite(f, name, ignore) {
    const fa = FRAME_ANIM_CHARS[f.frameSheet ?? f.sheet];
    if (!fa || !this.textures.exists(f.sheet)) return;
    const animKey = f.sheet + '_' + name;
    if (!this.anims.exists(animKey)) return;

    f.anims.stop();
    f.setTexture(f.sheet);
    f.setScale(f.scaleBase);
    const fw_ = Math.round(f.texture.source[0].width / 5);
    const fh_ = Math.round(f.texture.source[0].height / 6);
    f.setSize(30, 14);
    f.setOffset((fw_ - 30) / 2, fh_ - 18);

    if (name === 'hurt') {
      f.once('animationcomplete', (anim) => {
        if (
          anim.key === animKey &&
          f.active &&
          f.usesFrameAnim &&
          f.state2 !== 'ko'
        ) {
          this._restoreFrameDefault(f);
        }
      });
    }

    f.anims.play(animKey, ignore);
  },

  anim(f, name, ignore = true) {
    if (!f || !f.scene || !f.anims) return;
    if (
      f._airKickHeld &&
      f.airborne &&
      f.state2 === 'kick' &&
      name !== 'hurt' &&
      name !== 'ko' &&
      name !== 'fall'
    ) {
      return;
    }
    const frameKey = f.frameSheet ?? f.sheet;
    const fa = FRAME_ANIM_CHARS[frameKey];
    const sheetFallback = ['hurt', 'ko', 'jump'];

    if (name === 'attack' && fa && !fa.attack?.length && fa.punch?.length) {
      name = 'punch';
    }

    if (fa) {
      if (name === 'idle') {
        const idleKey = frameKey + '_idle';
        if (fa.idle?.length > 1 && this.anims.exists(idleKey)) {
          f.anims.play(idleKey, true);
        } else {
          f.anims.stop();
          this._restoreFrameDefault(f);
        }
        return;
      }
      if (hasFrameClip(frameKey, name)) {
        const animKey = frameKey + '_' + name;
        if (this.anims.exists(animKey)) {
          const strike = name === 'attack' || name === 'punch' || name === 'kick';
          if (strike && !ignore) {
            f.once('animationcomplete', (anim) => {
              if (anim.key !== animKey || !f.active || !f.usesFrameAnim) return;
              if (f._comboQueued && f.isPlayer) {
                f._comboQueued = false;
                this._comboAttack(f.playerSlot ?? 0, true);
                return;
              }
              if (name === 'kick') f._comboStep = 0;
              if (f.airborne && name === 'kick') return;
              if (f.state2 === 'attack' || f.state2 === 'kick') {
                f.state2 = 'idle';
                this.anim(f, 'idle');
              }
            });
          }
          if ((name === 'hurt' || name === 'fall') && !ignore) {
            f.once('animationcomplete', (anim) => {
              if (anim.key !== animKey || !f.active || !f.usesFrameAnim || f.state2 === 'ko') return;
              if (f.dying) return;
              if (f.state2 === name) {
                f.state2 = 'idle';
                this.anim(f, 'idle');
              }
            });
          }
          f.anims.play(animKey, ignore);
        }
        return;
      }
      if (sheetFallback.includes(name) && !f.usesFrameAnim) {
        this._playSheetAnimOnFrameSprite(f, name, ignore);
      }
      return;
    }

    if (name === 'idle') {
      f.anims.stop();
      f.setTexture(f.sheet);
      f.setFrame(0);
      f.setScale(f.scaleBase);
    } else {
      const animKey = f.sheet + '_' + name;
      if (this.anims.exists(animKey)) {
        f.anims.play(animKey, ignore);
      }
    }
  },

  /** Choix hurt vs tombe pour les persos frame-par-frame. */
  _playerHitReact(t, { wasAirborne = false, knockdown = false } = {}) {
    const frameKey = t.frameSheet ?? t.sheet;
    if (knockdown && t.usesFrameAnim && hasFrameClip(frameKey, 'fall')) {
      t._airKickHeld = false;
      t.kicking = false;
      return { state: 'fall', recoverMs: 1200, animName: 'fall' };
    }
    const useFall =
      t.usesFrameAnim &&
      hasFrameClip(frameKey, 'fall') &&
      (wasAirborne || knockdown);

    if (useFall) {
      t._airKickHeld = false;
      t.kicking = false;
      return { state: 'fall', recoverMs: 950, animName: 'fall' };
    }
    if (t.usesFrameAnim && hasFrameClip(frameKey, 'hurt')) {
      return { state: 'hurt', recoverMs: 600, animName: 'hurt' };
    }
    return { state: 'hurt', recoverMs: 600, animName: null };
  },

  /** Impact voiture — renverse avec anim tombe (saut = esquive). */
  _playerKnockdownFromCar(p, dmg, dir, fromX) {
    if (!p?.active || p.hp <= 0 || p.dying || p.state2 === 'ko') return;
    if (p.airborne && (p.jumpZ ?? 0) >= 14) return;
    this.hurt(p, dmg, dir || (p.x < fromX ? -1 : 1), fromX, null, {
      knockdown: true,
      carHit: true,
      knockback: 30,
    });
  },

  _freezeAirKickPose(f, clip = 'kick') {
    const frameKey = f.frameSheet ?? f.sheet;
    const fa = FRAME_ANIM_CHARS[frameKey];
    const frames = fa?.[clip];
    if (!frames?.length) return;
    const animKey = frameKey + '_' + clip;
    const lastTex = frames[frames.length - 1];
    const hold = () => {
      if (!f.active || !f.airborne || f.state2 !== 'kick') return;
      f.anims.stop();
      if (this.textures.exists(lastTex)) {
        f.setTexture(lastTex);
        this._fitFrameSprite(f);
        this._setFrameHitbox(f);
      }
      f._airKickHeld = true;
    };
    if (this.anims.exists(animKey)) {
      f.once('animationcomplete', (anim) => {
        if (anim.key === animKey) hold();
      });
      this.time.delayedCall(320, () => {
        if (f.active && f.airborne && f.state2 === 'kick' && !f._airKickHeld) hold();
      });
    } else {
      hold();
    }
  },

  /** Marche ou course selon la vitesse (sprites frame par frame). */
  locomoteAnim(f, vx, vy) {
    const fa = FRAME_ANIM_CHARS[f.frameSheet ?? f.sheet];
    if (!fa) {
      this.anim(f, 'walk');
      return;
    }
    const spd = Math.hypot(vx, vy);
    const max = f.speedV || spd || 1;
    const useRun = spd >= max * (fa.runSpeedRatio || 0.7);
    this.anim(f, useRun ? 'run' : 'walk');
  },

  pose(f, frame) {
    if (f.usesFrameAnim) return;
    f.anims.stop();
    f.setFrame(frame);
  },
  jump(slot = 0) {
    const p = this.playerAt(slot);
    if (
      this.phase === 'intro' ||
      this._specialActive[slot] ||
      p.hp <= 0 ||
      p.airborne ||
      p.state2 === 'hurt' ||
      this.isPlayerStunned(p)
    ) return;
    p.airborne = true;
    p.jumpVZ = 9.2;
    p.kicking = false;
    p._airKickHeld = false;
    p.state2 = 'jump';
    this.anim(p, 'jump', false);
    this.sfx('jump');
  },

  updateJump(p, deltaMs = 16.667) {
    if (!p.airborne) return;
    const dt = Phaser.Math.Clamp(deltaMs / 16.667, 0.25, 2.5);
    const prevZ = p.jumpZ;
    p.jumpZ += p.jumpVZ * dt;
    p.jumpVZ -= 0.40 * dt;
    if (p.jumpZ < 0) p.jumpZ = 0;
    p.y -= (p.jumpZ - prevZ);

    if (p.jumpZ <= 0 && p.jumpVZ < 0) {
      p.jumpVZ = 0;
      p.airborne = false;
      p.kicking = false;
      p._airKickHeld = false;
      if (p.state2 === 'jump' || p.state2 === 'kick' || p.state2 === 'fall') {
        p.state2 = 'idle';
        this.anim(p, 'idle');
      }
    }
  },
};

