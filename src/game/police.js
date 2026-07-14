import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM, COL, F } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';
import { dbgLog } from '../debug/crashOverlay.js';

/** Dégâts police sur un boss = % des PV max (style SOR). */
const POLICE_BOSS_HP_RATIO = 0.42;
const CUTSCENE_Z = 19500;

/** GameScene mixin — appel police (cutscene SOR + pluie de feu). */
export const policeMixin = {
  callPolice() {
    if (CONFIG.policeCharges <= 0) return;
    if (this.phase === 'win' || this.phase === 'over' || this.phase === 'intro') return;
    if (this._policeActive) return;
    if (this._specialActive?.some?.(Boolean)) return;
    if (this._karonuxBlocksInput?.() || this._kkBlocksInput?.()) return;

    CONFIG.policeCharges--;
    this.updateHUD();
    this._policeActive = true;
    this._policeBossDamaged = false;
    this._policeCutsceneFx = [];
    this._policeStrikePoints = this._policeBuildStrikePoints();
    dbgLog('police appelee, charges restantes=' + CONFIG.policeCharges);

    this.sfx('special', { vol: 0.85 });
    this._policeTransitionIn(() => this._policePlayCutscene());
  },

  _policeTrack(obj) {
    if (obj) this._policeCutsceneFx.push(obj);
    return obj;
  },

  _policeIsBoss(e) {
    return !!(e?.bossDef || e.bossCustom);
  },

  _policeGetTargets() {
    const list = [];
    if (!this.enemies?.getChildren) return list;
    for (const e of this.enemies.getChildren()) {
      if (!e?.active || e.hp <= 0 || e.dying || e.state2 === 'ko') continue;
      list.push(e);
    }
    return list;
  },

  _policeBuildStrikePoints() {
    const pts = this._policeGetTargets().map((e) => ({
      x: e.x,
      y: e.y,
    }));
    const minPts = 5;
    while (pts.length < minPts) {
      pts.push({
        x: Phaser.Math.Between(100, W - 100),
        y: Phaser.Math.Between(FLOOR_TOP + 50, FLOOR_BOTTOM - 18),
      });
    }
    return pts;
  },

  _policeHitEnemy(e, fromX) {
    if (!e?.active || e.hp <= 0) return;
    const dir = e.x >= fromX ? 1 : -1;
    if (this._policeIsBoss(e)) {
      if (this._policeBossDamaged) return;
      this._policeBossDamaged = true;
      const dmg = Math.max(48, Math.round(e.hpMax * POLICE_BOSS_HP_RATIO));
      this.hurt(e, dmg, dir, fromX);
      return;
    }
    this.hurt(e, 99999, dir, fromX);
  },

  _policeBurnAt(x, y) {
    this.spawnFire(x, y);
    this.sfx('explosion', { vol: 0.42 });
    if (CONFIG.shake) this.cameras.main.shake(70, 0.006);
    for (const e of this._policeGetTargets()) {
      if (Math.abs(e.x - x) < 52 && Math.abs(e.y - y) < 44) {
        this._policeHitEnemy(e, x);
      }
    }
  },

  /** Fondu + recul caméra — on quitte l'écran de jeu. */
  _policeTransitionIn(done) {
    const cam = this.cameras.main;
    this._policeCamSaved = { zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY };

    this._policeGameDim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(CUTSCENE_Z - 2);

    this.tweens.add({
      targets: this._policeGameDim,
      fillAlpha: 0.55,
      duration: 320,
      ease: 'Sine.easeIn',
    });
    this.tweens.add({
      targets: cam,
      zoom: 0.86,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!this.sys?.isActive()) return;
        done?.();
      },
    });
  },

  /** Retour à l'écran de jeu après la cutscene. */
  _policeTransitionOut(done) {
    const cam = this.cameras.main;
    for (const o of this._policeCutsceneFx || []) {
      try {
        this.tweens.killTweensOf(o);
        o?.remove?.();
        o?.destroy?.();
      } catch (_) {}
    }
    this._policeCutsceneFx = [];

    if (this._policeGameDim?.scene) {
      this.tweens.add({
        targets: this._policeGameDim,
        fillAlpha: 0,
        duration: 280,
        onComplete: () => {
          this._policeGameDim?.destroy?.();
          this._policeGameDim = null;
        },
      });
    }

    const saved = this._policeCamSaved || { zoom: 1, scrollX: 0, scrollY: 0 };
    this.tweens.add({
      targets: cam,
      zoom: saved.zoom,
      scrollX: saved.scrollX,
      scrollY: saved.scrollY,
      duration: 380,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this._policeCamSaved = null;
        done?.();
      },
    });
  },

  _policePlayCutscene() {
    const scene = this;
    const Z = CUTSCENE_Z;
    const groundY = H - 42;

    const panel = this._policeTrack(
      this.add.rectangle(W / 2, H / 2, W, H, 0x0a1020, 1).setScrollFactor(0).setDepth(Z)
    );
    const sky = this._policeTrack(
      this.add.rectangle(W / 2, H * 0.35, W, H * 0.7, 0x142038, 1).setScrollFactor(0).setDepth(Z + 1)
    );
    const ground = this._policeTrack(
      this.add.rectangle(W / 2, groundY + 20, W, 84, 0x1c2230, 1).setScrollFactor(0).setDepth(Z + 2)
    );
    const roadLine = this._policeTrack(
      this.add.rectangle(W / 2, groundY - 8, W, 3, 0x3a4a66, 0.8).setScrollFactor(0).setDepth(Z + 3)
    );
    const title = this._policeTrack(
      this.add
        .text(W / 2, 28, 'RENforts POLICE', F(0, { fontSize: '20px', fontStyle: 'bold', color: '#66aaff' }))
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(Z + 20)
        .setStroke('#000', 5)
    );

    const sirenL = this._policeTrack(
      this.add.rectangle(0, 0, 22, H, 0xff2222, 0.12).setOrigin(0, 0).setScrollFactor(0).setDepth(Z + 19)
    );
    const sirenR = this._policeTrack(
      this.add.rectangle(W, 0, 22, H, 0x2244ff, 0.12).setOrigin(1, 0).setScrollFactor(0).setDepth(Z + 19)
    );
    let sirenOn = true;
    const sirenTimer = this.time.addEvent({
      delay: 160,
      repeat: 24,
      callback: () => {
        sirenOn = !sirenOn;
        sirenL.setAlpha(sirenOn ? 0.18 : 0.04);
        sirenR.setAlpha(sirenOn ? 0.04 : 0.18);
      },
    });
    this._policeCutsceneFx.push({ remove: () => sirenTimer.remove() });

    const carStopX = W * 0.4;
    const car = this._policeTrack(
      this.add.image(-160, groundY, 'cop_car').setOrigin(0.5, 1).setScrollFactor(0).setDepth(Z + 8).setScale(1.55)
    );

    const copStand = this._policeTrack(
      this.add
        .image(carStopX + 36, groundY, 'cop_stand')
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(Z + 10)
        .setScale(1.15)
        .setAlpha(0)
    );
    const copShooter = this._policeTrack(
      this.add
        .image(carStopX - 8, groundY, 'cop_walk1')
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(Z + 11)
        .setScale(1.15)
        .setAlpha(0)
    );

    const runStep = (spr, keyA, keyB, t) => {
      this.time.delayedCall(t, () => {
        if (spr?.scene) spr.setTexture(keyA);
      });
      this.time.delayedCall(t + 120, () => {
        if (spr?.scene) spr.setTexture(keyB);
      });
    };

    // 1 — Voiture qui arrive
    this.tweens.add({
      targets: car,
      x: carStopX,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!scene.sys?.isActive()) return;
        scene.sfx('hit', { vol: 0.35 });

        // 2 — Les flics descendent
        copStand.setAlpha(1);
        copShooter.setAlpha(1);
        copStand.setPosition(car.x + 34, groundY);
        copShooter.setPosition(car.x - 6, groundY);

        scene.tweens.add({
          targets: copStand,
          x: carStopX + 58,
          duration: 520,
          ease: 'Sine.easeOut',
        });
        scene.tweens.add({
          targets: copShooter,
          x: carStopX - 52,
          duration: 520,
          ease: 'Sine.easeOut',
          onStart: () => runStep(copShooter, 'cop_walk1', 'cop_walk2', 0),
          onComplete: () => {
            if (!copShooter.scene) return;
            runStep(copShooter, 'cop_walk1', 'cop_walk2', 0);

            // 3 — À genoux + lance-roquettes
            scene.time.delayedCall(280, () => {
              if (!copShooter.scene) return;
              copShooter.setTexture('cop_kneel');
              scene.sfx('shoot', { vol: 0.75 });

              const muzzleX = copShooter.x + 38;
              const muzzleY = copShooter.y - 34;
              const rocket = scene._policeTrack(
                scene.add
                  .rectangle(muzzleX, muzzleY, 22, 8, 0xaacc55, 1)
                  .setScrollFactor(0)
                  .setDepth(Z + 14)
                  .setAngle(-38)
              );
              const trail = scene._policeTrack(
                scene.add
                  .rectangle(muzzleX - 8, muzzleY + 4, 14, 5, 0xff8833, 0.85)
                  .setScrollFactor(0)
                  .setDepth(Z + 13)
                  .setAngle(-38)
              );

              scene.tweens.add({
                targets: [rocket, trail],
                x: W + 80,
                y: -60,
                duration: 680,
                ease: 'Quad.easeIn',
                onComplete: () => {
                  rocket.destroy();
                  trail.destroy();
                  scene._policeRocketBurst(Z);
                  scene.time.delayedCall(420, () => scene._policeReturnToGameplay());
                },
              });
            });
          },
        });
      },
    });
  },

  _policeRocketBurst(Z) {
    this.sfx('explosion', { vol: 0.9 });
    if (CONFIG.shake) this.cameras.main.shake(220, 0.014);
    const flash = this._policeTrack(
      this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.55).setScrollFactor(0).setDepth(Z + 30)
    );
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 320,
      onComplete: () => flash.destroy(),
    });
    const burst = this._policeTrack(
      this.add.circle(W * 0.72, 80, 12, 0xff6622, 0.95).setScrollFactor(0).setDepth(Z + 29)
    );
    this.tweens.add({
      targets: burst,
      radius: 90,
      alpha: 0,
      duration: 420,
      onComplete: () => burst.destroy(),
    });
  },

  _policeReturnToGameplay() {
    this._policeTransitionOut(() => {
      this.floatText(W / 2, H * 0.32, 'PLUIE DE FEU !', COL.gold);
      this._policeFlameRain(() => this._endPoliceSequence());
    });
  },

  /** Flammes qui tombent sur le terrain de jeu et brûlent les ennemis. */
  _policeFlameRain(done) {
    const pts = [...(this._policeStrikePoints || [])];
    Phaser.Utils.Array.Shuffle(pts);
    let landed = 0;
    const total = pts.length;

    pts.forEach((pt, i) => {
      const tx = pt.x + Phaser.Math.Between(-12, 12);
      const ty = pt.y + Phaser.Math.Between(-6, 6);
      this.time.delayedCall(80 + i * 110, () => {
        if (!this.sys?.isActive()) return;

        const ember = this.add
          .rectangle(tx + Phaser.Math.Between(-20, 20), -24, 10, 18, 0xff7722, 0.95)
          .setDepth(9600)
          .setAngle(Phaser.Math.Between(-15, 15));
        this.tweens.add({
          targets: ember,
          x: tx,
          y: ty - 28,
          duration: 340,
          ease: 'Quad.easeIn',
          onComplete: () => {
            ember.destroy();
            this._policeBurnAt(tx, ty);
            landed++;
            if (landed >= total) {
              this.time.delayedCall(600, () => done?.());
            }
          },
        });
      });
    });

    if (total === 0) this.time.delayedCall(400, () => done?.());
  },

  _endPoliceSequence() {
    this._policeStrikePoints = null;
    this._policeActive = false;
    this._policeBossDamaged = false;
    this.sfx('hit', { vol: 0.35 });
  },
};
