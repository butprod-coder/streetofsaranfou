import Phaser from 'phaser';
import { padForPlayer, PAD, padConfirm, anyPadStart } from '../input/gamepad.js';
import { COL } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';
import { WEAPONS, POLICE_ITEM } from '../config/weapons.js';
import { dbgLog } from '../debug/crashOverlay.js';

/** GameScene mixin: input.js */
export const inputMixin = {
  update(time) {
    try {
      if (this._hitStopTick?.()) return;
      this._updateBannerSkip?.();
      if (this.phase === 'fight' || this.phase === 'boss' || this.phase === 'go_wait') {
        this.game?.loop?.wake?.();
      }
      if (this._kx && (this._kx.phase === 'car' || this._kx.phase === 'intro' || this._kx.phase === 'transition')) {
        this.updateKaronuxBoss(time);
      }
      if (this.phase === 'win' || this.phase === 'over') {
        this.padEndScreen();
        return;
      }
      if (this.phase === 'pause') {
        this.updatePauseMenu();
        return;
      }
      if (this.checkGodToggle()) return;
      if (this.checkPauseToggle()) return;

      if (this._policeActive) {
        for (const p of this.allPlayers()) {
          if (p?.active) p.setVelocity(0, 0);
        }
        if (this.enemies?.getChildren) {
          for (const e of this.enemies.getChildren()) {
            if (e?.active && e.hp > 0) e.setVelocity(0, 0);
          }
        }
        return;
      }

      if (this.phase === 'fight' || this.phase === 'go_wait') {
        this.updateLevelScroll?.(this.game.loop.delta);
      }

      const kxBlock = this._karonuxBlocksInput?.();
      const kkBlock = this._kkBlocksInput?.();
      if (!kxBlock && !kkBlock) {
        for (let slot = 0; slot < this.playerCount(); slot++) {
          const p = this.playerAt(slot);
          if (!p || !p.active || p.hp <= 0) continue;
          this.padActions(slot);
        }
      }

      if (this.phase !== 'intro' && !kxBlock && !kkBlock) {
        for (let slot = 0; slot < this.playerCount(); slot++) {
          const p = this.playerAt(slot);
          if (p && p.active && p.hp > 0) this.movePlayer(slot);
        }
      }

      if (this.phase === 'go_wait') {
        this.updateGoExit();
      }

      this._aiDirector?.(time);
      if (this.enemies.getChildren) {
        const enemies = this.enemies.getChildren();
        for (const e of enemies) {
          if (!e?.active || e.hp <= 0) continue;
          this.ai(e, time);
          this.clamp(e);
          if (!e.bossDef) this.pushOut(e);
          this._syncEnemyHpBar?.(e);
        }
      }
      for (const p of this.allPlayers()) {
        if (p && p.active) {
          this.clamp(p);
          this.pushOut(p);
        }
      }
      this.updateGrabs?.();
      this._tickComboChains?.();
      this.updateBullets(time);
      this.updatePickups();
      this.updateFires(time);
      this.updateHazards(time);
      if ((this.game.loop.frame & 1) === 0) this.syncAllWeaponVisuals();
      if (this.game.loop.frame % 45 === 0) {
        this._levelHygiene?.();
      }
    } catch (e) {
      dbgLog('update ERREUR (' + this.phase + '): ' + (e && e.message));
    }
  },

  updatePickups() {
    if (!this.pickups || !this.pickups.getChildren) return;
    this.pickups.getChildren().forEach((it) => {
      if (!it || !it.active) return;
      for (const p of this.activePlayers()) {
        if (Math.abs(p.x - it.x) < 42 && Math.abs(p.y - it.gy) < 48) {
          if (it.kind === 'poulet') {
            p.hp = Math.min(p.hpMax, p.hp + Math.round(p.hpMax * 0.4));
            this.updateHUD();
            this.floatText(it.x, it.gy - 40, '+VIE', COL.cyan);
            this.sfx('pickup');
          } else if (it.kind === POLICE_ITEM && CONFIG.policeCharges < CONFIG.maxPoliceCharges) {
            CONFIG.policeCharges++;
            this.updateHUD();
            this.floatText(it.x, it.gy - 40, 'TEL RENFORTS', COL.gold);
            this.sfx('pickup');
          } else {
            const w = WEAPONS[it.kind];
            p.weapon = {
              kind: it.kind,
              type: w.type,
              dmg: w.dmg,
              uses: w.uses,
              reach: w.reach || 0,
              bullets: w.bullets || 1,
              swing: !!w.swing,
            };
            this.floatText(it.x, it.gy - 40, it.kind.toUpperCase(), COL.gold);
            this.updateWeaponHUD(p.playerSlot ?? 0);
            this.syncWeaponVisual(p);
            this.sfx('pickup');
          }
          it.destroy();
          break;
        }
      }
    });
  },

  /** Passe la bannière en cours (banner de stage.js) sur bouton confirm, après 350ms. */
  _updateBannerSkip() {
    const b = this._bannerSkip;
    if (!b || this.time.now < b.minT) return;
    if (!this._endPadConfirm() && !this._endKeyConfirm()) return;
    try {
      b.ev?.remove();
    } catch (_) {}
    b.finish();
  },

  _ensureEndKeys() {
    if (this._endKeys || !this.input.keyboard) return;
    const kb = this.input.keyboard;
    this._endKeys = {
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      enter: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      x: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
    };
  },

  _endKeyConfirm() {
    this._ensureEndKeys();
    if (!this._endKeys) return false;
    return (
      Phaser.Input.Keyboard.JustDown(this._endKeys.space) ||
      Phaser.Input.Keyboard.JustDown(this._endKeys.enter) ||
      Phaser.Input.Keyboard.JustDown(this._endKeys.x)
    );
  },

  _endPadConfirm() {
    return padConfirm(this, 0) || padConfirm(this, 1) || anyPadStart(this);
  },

  padEndScreen() {
    const confirm = this._endPadConfirm() || this._endKeyConfirm();

    if (this._endShowDetails && !this._endScreenReady && confirm) {
      this._endShowDetails();
      return;
    }

    if (confirm && this._endAction) {
      this._endAction();
    }
  },

  padActions(slot = 0) {
    if (this._policeActive) return;
    const p = this.playerAt(slot);
    if (!p || this.isPlayerStunned(p)) return;
    const pad = padForPlayer(this, slot);
    if (!pad) return;
    if (!this._pb) this._pb = {};
    if (!this._pb[slot]) this._pb[slot] = {};
    const prev = this._pb[slot];
    const edge = (idx) => {
      const b = pad.buttons[idx];
      const now = b && b.pressed;
      const was = prev[idx];
      prev[idx] = now;
      return now && !was;
    };
    const grabbing = !!this._grabOf?.(p);
    if (edge(PAD.CROIX)) {
      if (grabbing) this._releaseGrab(p);
      else this.jump(slot);
    }
    if (edge(PAD.ROND)) {
      if (grabbing) {
        if (this._grabBackHeld?.(slot)) this.grabThrowBack(slot);
        else this.grabKnee(slot);
      } else this.attack(slot);
    }
    if (edge(PAD.CARRE) && !grabbing) this.special(slot);
    if (edge(PAD.TRIANGLE) && !grabbing) this.callPolice();
  },

  movePlayer(slot = 0) {
    if (this._policeActive) return;
    const p = this.playerAt(slot);
    if (!p) return;
    if (this.isPlayerStunned(p)) {
      p.setVelocity(0, 0);
      return;
    }
    if (this._grabOf?.(p)) {
      p.setVelocity(0, 0);
      return;
    }
    const cfg = this.cfgAt(slot);
    let vx = 0;
    let vy = 0;
    const slowMul = p.kxSlowUntil > this.time.now ? 0.55 : 1;

    const pad = padForPlayer(this, slot);
    if (pad) {
      const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      const dz = 0.35;
      if (ax < -dz || (pad.buttons[PAD.LEFT] && pad.buttons[PAD.LEFT].pressed)) {
        vx = -cfg.speed;
        p.facing = -1;
      }
      if (ax > dz || (pad.buttons[PAD.RIGHT] && pad.buttons[PAD.RIGHT].pressed)) {
        vx = cfg.speed;
        p.facing = 1;
      }
      if (!p.airborne) {
        if (ay < -dz || (pad.buttons[PAD.UP] && pad.buttons[PAD.UP].pressed)) vy = -cfg.speed;
        if (ay > dz || (pad.buttons[PAD.DOWN] && pad.buttons[PAD.DOWN].pressed)) vy = cfg.speed;
      }
    }

    if (this._specialActive[slot]) {
      p.setVelocity(0, 0);
      return;
    }
    if (p.state2 === 'attack' || p.state2 === 'hurt') {
      vx *= 0.2;
      vy *= 0.2;
    }
    if (p.airborne) vx *= 0.85;
    vx *= slowMul;
    vy *= slowMul;
    p.setVelocity(vx, vy);
    p.setFlipX(p.facing < 0);
    this.updateJump(p, this.game.loop.delta);
    if (p.state2 === 'idle' || p.state2 === 'walk') {
      if (vx || vy) {
        p.state2 = 'walk';
        this.locomoteAnim(p, vx, vy);
        this.tryAutoGrab?.(p);
      } else {
        p.state2 = 'idle';
        this.anim(p, 'idle');
      }
    }
  },
};
