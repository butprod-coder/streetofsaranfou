import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM, COL, F, NUM, FH } from '../../config/gameConfig.js';
import { CONFIG } from '../../config/difficulty.js';
import {
  KARONUX_BOSS_DEF,
  KARONUX_CAR_FRAMES,
  karonuxBossDisplayH,
  karonuxBossTexKey,
  karonuxCarDisplayH,
} from '../../config/bossKaronux.js';

const CAR_Y = FLOOR_BOTTOM - 8;

const CAR_SKID_STUCK_MS = 2800;
const KX_CHARGE_WALL_STUN_MS = 4000;
const KX_FIGHT_WALL_PAD = 38;
const CAR_ARENA_MIN_X = W * 0.04;
const CAR_ARENA_MAX_X = W * 0.96;
const CAR_LANE_MIN_Y = FLOOR_TOP + 28;
const CAR_LANE_MAX_Y = FLOOR_BOTTOM - 6;
const CAR_LANE_MID_Y = (CAR_LANE_MIN_Y + CAR_LANE_MAX_Y) * 0.5;
const KX_CLOPE_WINDUP_MS = 600;
const KX_CLOPE_SMOKE_MS = 5000;

/** GameScene mixin — boss Karonux (Golf + phases). */
export const karonuxBossMixin = {
  _karonuxBlocksInput() {
    const kx = this._kx;
    if (!kx) return false;
    return kx.phase === 'intro' || kx.phase === 'transition' || kx.sub === 'kneel';
  },

  _kxFightSpeed(kx) {
    return kx?.def?.fightSpeed ?? 172;
  },

  _kxFightDamage(kx) {
    return kx?.def?.fightDamage ?? 24;
  },

  _fitBossSpr(spr, mul = 1) {
    if (!spr?.texture) return;
    const src = spr.texture.getSourceImage?.() || spr.texture.source?.[0];
    const h = src?.height || spr.height || 140;
    const targetH = karonuxBossDisplayH(0.82) * mul;
    spr.setScale(targetH / h);
    spr.setOrigin(0.5, 1);
  },

  _fitCarSpr(spr) {
    if (!spr?.texture) return;
    const src = spr.texture.getSourceImage?.() || spr.texture.source?.[0];
    const h = src?.height || spr.height || 93;
    const targetH = karonuxCarDisplayH(0.82);
    spr.setScale(targetH / h);
    spr.setOrigin(0.5, 1);
  },

  _bindBkSpr(spr) {
    if (!spr || spr._bkBound) return;
    spr._bkBound = true;
    spr.setOrigin(0.5, 1);
    spr.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
      const key = spr.texture?.key;
      if (spr._bkFitKey === key) return;
      spr._bkFitKey = key;
      if (spr === this._kx?.car) this._fitCarSpr(spr);
      else this._fitBossSpr(spr);
    });
  },

  _kxResetLaserFx(kx) {
    if (!kx) return;
    kx._laserDelay?.remove();
    kx._laserDelay = null;
    kx._laserTeleEvt?.remove();
    kx._laserTeleEvt = null;
    kx._laserCalls?.forEach((c) => c?.remove?.());
    kx._laserCalls = null;
    kx._laserBeamTween?.stop?.();
    kx._laserBeamTween = null;
    kx._laserGfx?.destroy();
    kx._laserGfx = null;
  },

  _kxTrackLaserCall(kx, call) {
    if (!kx || !call) return call;
    if (!kx._laserCalls) kx._laserCalls = [];
    kx._laserCalls.push(call);
    return call;
  },

  _playBk(spr, key, repeat = false) {
    if (!spr?.active || !this.anims.exists(key)) return false;
    if (repeat && spr.anims?.isPlaying && spr.anims.currentAnim?.key === key) return true;
    this._bindBkSpr(spr);
    spr.anims.play(key, repeat);
    return true;
  },

  _kxCleanupTimers() {
    const kx = this._kx;
    if (!kx) return;
    this._kxStopCarSkidSmoke();
    this._kxCancelChargeMotion(kx);
    kx._turboRegenEvt?.remove();
    kx._turboRegenEvt = null;
    kx._carSkidTween?.stop();
    kx._carSkidTween = null;
    kx._clopeStartEvt?.remove();
    kx._clopeStartEvt = null;
    kx._clopeEndEvt?.remove();
    kx._clopeEndEvt = null;
    this._kxResetLaserFx(kx);
    this.boss?._kxHurtTimer?.remove();
    if (this.boss) this.boss._kxHurtTimer = null;
    this._kxClearChmekAura(kx);
    this._kxClearDizzyFx(kx);
    this._kxStopTurboSmoke();
    if (this.boss) this.boss.state2 = 'idle';
    kx.sub = null;
  },

  _kxSpawnBossSmokePuff(b) {
    if (!b?.active) return;
    const flip = b.flipX ? -1 : 1;
    const baseX = b.x + flip * (b.displayWidth * 0.1);
    const baseY = b.y - b.displayHeight * 0.58;
    const layers = Phaser.Math.Between(3, 4);

    for (let i = 0; i < layers; i++) {
      const shade = Phaser.Math.Between(160, 215);
      const puff = this.add
        .ellipse(
          baseX + Phaser.Math.Between(-12, 12),
          baseY + Phaser.Math.Between(-8, 8),
          Phaser.Math.Between(14, 24) * 2.2,
          Phaser.Math.Between(11, 18) * 2,
          Phaser.Display.Color.GetColor(shade, shade, shade + Phaser.Math.Between(-10, 10)),
          Phaser.Math.FloatBetween(0.42, 0.62)
        )
        .setDepth(b.depth + 6 + i);
      const driftX = flip * Phaser.Math.Between(22, 48);
      this.tweens.add({
        targets: puff,
        x: puff.x + driftX + Phaser.Math.Between(-8, 8),
        y: puff.y - Phaser.Math.Between(35, 72),
        scaleX: 1.6 + Math.random() * 1.2,
        scaleY: 1.6 + Math.random() * 1.2,
        alpha: 0,
        duration: 900 + i * 60 + Math.random() * 520,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  },

  _kxStopTurboSmoke() {
    const kx = this._kx;
    kx?._turboSmokeTimer?.remove();
    if (kx) kx._turboSmokeTimer = null;
  },

  _kxStartTurboSmoke(b) {
    const kx = this._kx;
    if (!b?.active || !kx) return;
    this._kxStopTurboSmoke();
    this._kxSpawnBossSmokePuff(b);
    kx._turboSmokeTimer = this.time.addEvent({
      delay: 400,
      repeat: Math.max(0, Math.floor(KX_CLOPE_SMOKE_MS / 400) - 1),
      callback: () => {
        if (!b.active || this.time.now >= (kx.turboUntil || 0)) return;
        this._kxSpawnBossSmokePuff(b);
      },
    });
  },

  _kxRecoverBossHurt(b) {
    if (!b?.active) return;
    b._kxHurtTimer?.remove();
    b._kxHurtTimer = this.time.delayedCall(200, () => {
      if (!b.active || b.state2 !== 'hurt') return;
      b.state2 = 'idle';
      this._kxResumeBossAnim(b);
    });
  },

  _kxResumeBossAnim(b) {
    if (!b?.active) return;
    const kx = this._kx;
    if (!kx || (kx.phase !== 'fight' && kx.phase !== 'final')) return;
    if ((b.busy || 0) > this.time.now || kx.sub) return;
    this._playBk(b, 'bk_marche', true);
  },

  _setBkFrame(spr, texKey) {
    if (!spr?.active || !this.textures.exists(texKey)) return;
    this._bindBkSpr(spr);
    spr.anims?.stop();
    spr.setTexture(texKey);
    spr._bkFitKey = texKey;
    if (spr === this._kx?.car) this._fitCarSpr(spr);
    else this._fitBossSpr(spr);
  },

  _kxCarBubbleOpts(car) {
    return {
      yAbove: car.displayHeight + 58,
      depthBoost: 40,
    };
  },

  _kxCarComicBubble(car, text, duration = 2600) {
    if (!car?.active) return;
    this._comicBubble(car, text, duration, this._kxCarBubbleOpts(car));
  },

  _kxSetCarAwakeFrame() {
    const car = this._kx?.car;
    if (!car?.active) return;
    const frame = this.textures.exists(KARONUX_CAR_FRAMES.awake)
      ? KARONUX_CAR_FRAMES.awake
      : KARONUX_CAR_FRAMES.park;
    this._setBkFrame(car, frame);
  },

  _kxStopCarSkidSmoke() {
    const kx = this._kx;
    kx?._skidSmokeTimer?.remove();
    if (kx) kx._skidSmokeTimer = null;
  },

  _kxSpawnCarDebris(car, fromX) {
    if (!car?.active) return;
    const hitDir =
      fromX != null && fromX !== car.x ? (car.x >= fromX ? 1 : -1) : car.flipX ? -1 : 1;
    const baseX = car.x + hitDir * Phaser.Math.Between(10, 24);
    const baseY = car.y - car.displayHeight * Phaser.Math.Between(0.32, 0.62);
    const shades = [0x888888, 0x666666, 0x555555, 0xaaaaaa, 0x774444, 0xcccccc];

    for (let i = 0; i < Phaser.Math.Between(3, 5); i++) {
      const shard = this.add
        .rectangle(
          baseX + Phaser.Math.Between(-18, 18),
          baseY + Phaser.Math.Between(-10, 10),
          Phaser.Math.Between(3, 10),
          Phaser.Math.Between(2, 7),
          Phaser.Utils.Array.GetRandom(shades),
          Phaser.Math.FloatBetween(0.85, 1)
        )
        .setDepth(car.depth + 9)
        .setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: shard,
        x: shard.x + hitDir * Phaser.Math.Between(24, 95) + Phaser.Math.Between(-22, 22),
        y: shard.y - Phaser.Math.Between(8, 62) + Phaser.Math.Between(0, 28),
        angle: shard.angle + Phaser.Math.Between(-160, 160),
        alpha: 0,
        duration: Phaser.Math.Between(300, 560),
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
    this.spawnSpark(baseX, baseY - 6);
  },

  _kxSpawnCarSmokePuff(car) {
    if (!car?.active) return;
    const flip = car.flipX ? -1 : 1;
    const baseX = car.x + flip * (car.displayWidth * 0.24);
    const baseY = car.y - car.displayHeight * 0.52;
    const layers = Phaser.Math.Between(2, 3);

    for (let i = 0; i < layers; i++) {
      const shade = Phaser.Math.Between(175, 220);
      const puff = this.add
        .ellipse(
          baseX + Phaser.Math.Between(-9, 9),
          baseY + Phaser.Math.Between(-5, 5),
          Phaser.Math.Between(10, 18),
          Phaser.Math.Between(8, 14),
          Phaser.Display.Color.GetColor(shade, shade, shade + Phaser.Math.Between(-8, 8)),
          Phaser.Math.FloatBetween(0.32, 0.52)
        )
        .setDepth(car.depth + 5 + i);
      this.tweens.add({
        targets: puff,
        x: puff.x + flip * Phaser.Math.Between(14, 34) + Phaser.Math.Between(-5, 5),
        y: puff.y - Phaser.Math.Between(22, 48),
        scaleX: 1.5 + Math.random() * 0.9,
        scaleY: 1.5 + Math.random() * 0.9,
        alpha: 0,
        duration: 780 + i * 70 + Math.random() * 380,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  },

  _kxStartCarSkidSmoke(car) {
    const kx = this._kx;
    if (!car?.active) return;

    this._kxStopCarSkidSmoke();
    const puffs = Math.max(3, Math.floor(CAR_SKID_STUCK_MS / 420));

    kx._skidSmokeTimer = this.time.addEvent({
      delay: 420,
      repeat: puffs - 1,
      callback: () => {
        if (!car?.active || kx.phase !== 'car') return;
        this._kxSpawnCarSmokePuff(car);
      },
    });
  },

  spawnKaronuxBoss() {
    this.phase = 'boss';
    this.stopFightMusic();
    if (this.props) this.props.clear(true, true);
    if (this.pickups) this.pickups.clear(true, true);

    const def = this.lv.boss || KARONUX_BOSS_DEF;
    this._kx = {
      phase: 'intro',
      sub: null,
      def,
      carHp: def.carHp ?? 380,
      carHpMax: def.carHp ?? 380,
      bossHpMax: def.hp,
      bossHp: def.hp,
      nextAtk: 0,
      atkIdx: 0,
      turboUntil: 0,
      laserMode: false,
      laserModeTriggered: false,
      finalTriggered: false,
      stunnedUntil: 0,
      untouchableUntil: 0,
      hitLog: [],
      lastForcedRetreat: 0,
      lastCornerEscape: 0,
      carPatIdx: 0,
    };

    this._kxCarBar = this.add
      .rectangle(W / 2 - 160, 86, 320, 14, 0x33121a)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(9001)
      .setVisible(false);
    this._kxCarFill = this.add
      .rectangle(W / 2 - 160, 86, 320, 14, 0xcccccc)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(9002)
      .setVisible(false);
    this.add
      .text(W / 2, 104, 'GOLF BLANCHE', F(0, { fontSize: '12px', color: COL.cream }))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9002)
      .setName('kxCarLabel')
      .setVisible(false);

    this._kxIntroSequence();
  },

  _kxIntroSequence() {
    const kx = this._kx;
    const y = CAR_Y;

    kx.car = this.add.sprite(W + 280, y, KARONUX_CAR_FRAMES.drive).setOrigin(0.5, 1);
    this._bindBkSpr(kx.car);
    this._fitCarSpr(kx.car);
    kx.car.setDepth(Math.floor(y) + 2);
    kx.car.facing = -1;
    kx.car.setFlipX(true);

    this.sfx('shoot', { vol: 0.15 });
    this.tweens.add({
      targets: kx.car,
      x: W * 0.62,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!kx.car?.active) return;
        this._setBkFrame(kx.car, KARONUX_CAR_FRAMES.park);
        this.sfx('hurt', { vol: 0.35 });
        if (CONFIG.shake) this.cameras.main.shake(180, 0.008);
        this.time.delayedCall(1000, () => this._kxHeadlightsOn());
      },
    });
  },

  _kxHeadlightsOn() {
    const kx = this._kx;
    if (!kx?.car?.active || kx.phase !== 'intro') return;

    this._screenFlash(0xffffff, 0.55, 120);
    this.sfx('confirm', { vol: 0.9 });
    this._setBkFrame(kx.car, KARONUX_CAR_FRAMES.awake);
    this.time.delayedCall(1100, () => this._kxIntroReady());
  },

  _kxIntroReady() {
    const kx = this._kx;
    if (!kx?.car?.active || kx.phase !== 'intro') return;
    this._kxCarComicBubble(kx.car, 'Wesh Kalagane', 2800);
    this.time.delayedCall(2400, () => this._kxStartCarPhase());
  },

  _kxStartCarPhase() {
    const kx = this._kx;
    if (!kx) return;
    kx.phase = 'car';
    kx.nextAtk = this.time.now + 700;
    this._kxSetCarAwakeFrame();
    this._kxCarBar.setVisible(true);
    this._kxCarFill.setVisible(true);
    const lbl = this.children.getByName('kxCarLabel');
    if (lbl) lbl.setVisible(true);
    this._kxUpdateCarBar();
    this.banner('PHASE 1 — GOLF BLANCHE', null, COL.gold);
    this.startFightMusic();
  },

  _kxUpdateCarBar() {
    const kx = this._kx;
    if (!kx || !this._kxCarFill) return;
    const r = Phaser.Math.Clamp(kx.carHp / kx.carHpMax, 0, 1);
    this._kxCarFill.width = 320 * r;
  },

  _kxUpdateBossBar() {
    this.updateHUD();
  },

  updateKaronuxBoss(time) {
    const kx = this._kx;
    if (!kx) return;
    if (kx.phase === 'car') this._kxCarAI(time);
    else if (kx.phase === 'fight' || kx.phase === 'final') {
      this._kxFightAI(time);
      const b = this.boss;
      if (b?.active && b.state2 === 'idle' && this.time.now >= (b.busy || 0) && !kx.sub) {
        const cur = b.anims?.currentAnim?.key;
        if (!b.anims?.isPlaying || (cur !== 'bk_marche' && cur !== 'bk_idle')) {
          this._kxResumeBossAnim(b);
        }
      }
    }
  },

  _kxCarAI(time) {
    const kx = this._kx;
    if (!kx?.car?.active || time < (kx.carBusy || 0)) return;
    if (time < kx.nextAtk) return;

    kx.nextAtk = time + Phaser.Math.Between(480, 820);
    const p = this.nearestPlayerTo(kx.car.x, kx.car.y);
    const roll = Phaser.Math.Between(0, 9);

    if (roll <= 8) {
      const forceRoll = Phaser.Math.Between(0, 7);
      const forcePattern =
        forceRoll === 0 ? 'orbit' : forceRoll === 1 ? 'wall' : null;
      this._kxCarSkid(time, p, { forcePattern });
    } else this._kxCarHorn(time);
  },

  _kxCarLaneY(t = 0.5) {
    return CAR_LANE_MIN_Y + (CAR_LANE_MAX_Y - CAR_LANE_MIN_Y) * Phaser.Math.Clamp(t, 0, 1);
  },

  _kxCarSkidPlan(car, p, opts = {}) {
    const startX = car.x;
    const startY = car.y;
    const px = Phaser.Math.Clamp(p.x + (p.facing || 1) * 36, CAR_ARENA_MIN_X, CAR_ARENA_MAX_X);
    const py = Phaser.Math.Clamp(p.y, CAR_LANE_MIN_Y, CAR_LANE_MAX_Y);
    const patterns = ['orbit', 'wall', 'sweep', 'wall', 'diagonal', 'through', 'cross', 'arc', 'feint'];
    let pattern = opts.forcePattern || patterns[(this._kx?.carPatIdx || 0) % patterns.length];
    if (this._kx && !opts.forcePattern) this._kx.carPatIdx = (this._kx.carPatIdx || 0) + 1;

    let endX = px;
    let endY = py;
    let dir = px >= startX ? 1 : -1;
    let arc = false;
    let orbit = false;
    let orbitCx = W * 0.5;
    let orbitCy = CAR_LANE_MID_Y;
    let orbitR = 140;
    let orbitStart = 0;
    let orbitSweep = Math.PI;
    let orbitFlat = 0.44;
    let twoStep = false;
    let feintY = startY;

    if (pattern === 'orbit') {
      orbit = true;
      orbitCx = W * 0.5 + Phaser.Math.Between(-36, 36);
      orbitCy = CAR_LANE_MID_Y + Phaser.Math.Between(-12, 12);
      const dx = startX - orbitCx;
      const dy = (startY - orbitCy) / orbitFlat;
      orbitR = Math.hypot(dx, dy);
      if (orbitR < 72) {
        orbit = false;
        pattern = 'sweep';
        dir = startX < W * 0.5 ? 1 : -1;
        endX = dir > 0 ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
        endY = this._kxCarLaneY(Phaser.Math.FloatBetween(0.15, 0.95));
      } else {
        orbitStart = Math.atan2(dy, dx);
        const clockwise = Phaser.Math.Between(0, 1) === 0;
        orbitSweep = Phaser.Math.FloatBetween(Math.PI * 0.72, Math.PI * 1.18) * (clockwise ? 1 : -1);
        dir = clockwise ? 1 : -1;
        endX = orbitCx + Math.cos(orbitStart + orbitSweep) * orbitR;
        endY = orbitCy + Math.sin(orbitStart + orbitSweep) * orbitR * orbitFlat;
        endX = Phaser.Math.Clamp(endX, CAR_ARENA_MIN_X, CAR_ARENA_MAX_X);
        endY = Phaser.Math.Clamp(endY, CAR_LANE_MIN_Y, CAR_LANE_MAX_Y);
      }
    } else if (pattern === 'wall') {
      const distL = startX - CAR_ARENA_MIN_X;
      const distR = CAR_ARENA_MAX_X - startX;
      const goRight =
        distL < 72 ? true : distR < 72 ? false : Phaser.Math.Between(0, 1) === 0;
      dir = goRight ? 1 : -1;
      endX = goRight ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
      endY = Phaser.Math.Clamp(
        py * 0.5 + startY * 0.5 + Phaser.Math.Between(-22, 22),
        CAR_LANE_MIN_Y,
        CAR_LANE_MAX_Y
      );
    } else if (pattern === 'sweep') {
      dir = startX < W * 0.5 ? 1 : -1;
      endX = dir > 0 ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
      endY = this._kxCarLaneY(Phaser.Math.FloatBetween(0.15, 0.95));
    } else if (pattern === 'diagonal') {
      dir = px >= startX ? 1 : -1;
      endX = dir > 0 ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
      endY = startY >= CAR_LANE_MID_Y ? this._kxCarLaneY(0.12) : this._kxCarLaneY(0.92);
    } else if (pattern === 'through') {
      dir = px >= startX ? 1 : -1;
      endY = py;
      endX = dir > 0 ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
    } else if (pattern === 'cross') {
      dir = px >= startX ? 1 : -1;
      endX = dir > 0 ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
      endY = py < CAR_LANE_MID_Y ? this._kxCarLaneY(0.88) : this._kxCarLaneY(0.18);
    } else if (pattern === 'arc') {
      dir = px >= startX ? 1 : -1;
      endX = Phaser.Math.Clamp(px + dir * 280, CAR_ARENA_MIN_X, CAR_ARENA_MAX_X);
      endY = this._kxCarLaneY(Phaser.Math.FloatBetween(0.08, 0.95));
      arc = true;
    } else {
      twoStep = true;
      feintY = this._kxCarLaneY(Phaser.Math.FloatBetween(0.1, 0.9));
      dir = px >= startX ? 1 : -1;
      endX = dir > 0 ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
      endY = py;
    }

    if (!orbit) {
      const minTravel = Math.min(W * 0.72, 480);
      if (Math.abs(endX - startX) < minTravel) {
        endX = Phaser.Math.Clamp(startX + dir * minTravel, CAR_ARENA_MIN_X, CAR_ARENA_MAX_X);
      }
      if (Math.abs(endX - startX) < minTravel * 0.55) {
        endX = dir > 0 ? CAR_ARENA_MAX_X : CAR_ARENA_MIN_X;
        dir = endX >= startX ? 1 : -1;
      }
    }

    return {
      pattern,
      startX,
      startY,
      endX,
      endY,
      dir,
      arc,
      orbit,
      orbitCx,
      orbitCy,
      orbitR,
      orbitStart,
      orbitSweep,
      orbitFlat,
      twoStep,
      feintY,
    };
  },

  _kxCarSetDepth(car) {
    if (car?.active) car.setDepth(Math.floor(car.y) + 2);
  },

  _kxCarSkidRun(car, kx, plan, time) {
    const {
      startX,
      startY,
      endX,
      endY,
      dir,
      arc,
      orbit,
      orbitCx,
      orbitCy,
      orbitR,
      orbitStart,
      orbitSweep,
      orbitFlat,
      pattern,
    } = plan;
    const travel = orbit
      ? Math.abs(orbitSweep) * orbitR
      : Math.hypot(endX - startX, endY - startY);
    const duration = orbit
      ? Phaser.Math.Clamp(720 + Math.abs(orbitSweep) * 320, 780, 1450)
      : Phaser.Math.Clamp(520 + travel * 0.48, 620, 1180);

    kx.carBusy = time + duration + CAR_SKID_STUCK_MS;
    car.facing = dir;
    car.setFlipX(dir < 0);

    this.floatText(
      car.x,
      car.y - car.displayHeight - 10,
      orbit ? 'DONUT !' : pattern === 'wall' ? 'MUR !' : 'DÉRAPAGE !',
      orbit ? COL.cyan : pattern === 'wall' ? COL.blood : COL.gold
    );
    this.sfx('shoot', { vol: orbit ? 0.52 : 0.45 });
    if (this.textures.exists(KARONUX_CAR_FRAMES.skid)) {
      this._setBkFrame(car, KARONUX_CAR_FRAMES.skid);
    }

    const flat = orbitFlat ?? 0.44;
    const mark = orbit
      ? this.add
          .ellipse(orbitCx, orbitCy, orbitR * 2.05, orbitR * flat * 2.1, 0x1a1a1a, 0)
          .setStrokeStyle(4, 0x2a2a2a, 0.45)
          .setDepth(car.depth - 2)
      : this.add
          .rectangle(startX, startY - 3, 36, 5, 0x1a1a1a, 0.55)
          .setDepth(car.depth - 1);

    const arcLift = arc ? 55 + Math.abs(endY - startY) * 0.35 : 0;
    const prog = { t: 0 };

    kx._carSkidTween?.stop();
    kx._carSkidTween = this.tweens.add({
      targets: prog,
      t: 1,
      duration,
      ease: orbit ? 'Sine.easeInOut' : 'Cubic.easeIn',
      onUpdate: () => {
        const t = prog.t;
        if (orbit) {
          const ang = orbitStart + orbitSweep * t;
          car.x = orbitCx + Math.cos(ang) * orbitR;
          car.y = orbitCy + Math.sin(ang) * orbitR * flat;
          const tangent = ang + (orbitSweep > 0 ? Math.PI / 2 : -Math.PI / 2);
          car.angle = Phaser.Math.RadToDeg(tangent) * 0.14;
          car.setFlipX(Math.cos(tangent) < 0);
          car.facing = car.flipX ? -1 : 1;
        } else {
          car.x = startX + (endX - startX) * t;
          car.y = startY + (endY - startY) * t - Math.sin(t * Math.PI) * arcLift;
          car.angle = Phaser.Math.Linear(dir > 0 ? -8 : 8, dir > 0 ? -14 : 14, t);
        }
        this._kxCarSetDepth(car);
        for (const pl of this.activePlayers()) {
          this._kxCarHitPlayer(car, pl, 24, dir);
        }
      },
      onComplete: () => {
        car.x = endX;
        car.y = endY;
        car.angle = orbit ? (orbitSweep > 0 ? -10 : 10) : dir > 0 ? -6 : 6;
        this._kxCarSetDepth(car);
        this._kxSetCarAwakeFrame();
        this.floatText(car.x, car.y - car.displayHeight - 8, 'BLOQUÉE', COL.grey);
        this._kxStartCarSkidSmoke(car);
        if (!car._skidHit && Phaser.Math.Between(0, 1) === 0) {
          this._kxCarComicBubble(
            car,
            'MÊME PAS DU CHÊNE',
            2600
          );
        }
        kx.carBusy = this.time.now + CAR_SKID_STUCK_MS;
      },
    });

    this.tweens.add({
      targets: mark,
      alpha: 0,
      duration: orbit ? 1200 : 1000,
      delay: orbit ? 180 : 250,
      ...(orbit
        ? {}
        : {
            width: travel + 50,
            x: (startX + endX) / 2,
            y: (startY + endY) / 2 - 3,
          }),
      onComplete: () => mark.destroy(),
    });
  },

  _kxPlayerOnCarLane(p, car) {
    if (!p?.active || p.hp <= 0) return false;
    return p.y >= FLOOR_TOP - 24 && p.y <= FLOOR_BOTTOM + 12 && Math.abs(p.y - car.y) < 88;
  },

  /** Dégâts voiture — esquive en sautant ; sinon renverse (anim tombe). */
  _kxCarHitPlayer(car, p, dmg, dir) {
    if (!p?.active || p.hp <= 0) return;
    if (p.airborne && (p.jumpZ ?? 0) >= 14) return;
    if (!this._kxPlayerOnCarLane(p, car)) return;
    const hitW = car.displayWidth * 0.62;
    if (Math.abs(p.x - car.x) < hitW) {
      if (p._kxCarHitSkid === car._skidId) return;
      p._kxCarHitSkid = car._skidId;
      car._skidHit = true;
      this._playerKnockdownFromCar(p, dmg, dir || (p.x < car.x ? -1 : 1), car.x);
    }
  },

  _kxCarSkid(time, target, opts = {}) {
    const kx = this._kx;
    const car = kx.car;
    if (!car) return;

    this._kxStopCarSkidSmoke();
    kx._carSkidTween?.stop();
    kx._carSkidTween = null;

    kx.skidSeq = (kx.skidSeq || 0) + 1;
    car._skidId = kx.skidSeq;
    car._skidHit = false;

    const p = target?.active ? target : this.nearestPlayerTo(car.x, car.y);
    const plan = this._kxCarSkidPlan(car, p, opts);

    if (plan.twoStep) {
      kx.carBusy = time + 2200;
      this.floatText(car.x, car.y - car.displayHeight - 14, 'APPROCHE...', COL.grey);
      this.tweens.add({
        targets: car,
        y: plan.feintY,
        duration: 320,
        ease: 'Sine.easeOut',
        onUpdate: () => this._kxCarSetDepth(car),
        onComplete: () => {
          if (!car.active || kx.phase !== 'car') return;
          plan.startX = car.x;
          plan.startY = car.y;
          this._kxCarSkidRun(car, kx, plan, this.time.now);
        },
      });
      return;
    }

    this._kxCarSkidRun(car, kx, plan, time);
  },

  _kxCarHorn(time) {
    const kx = this._kx;
    this._kxStopCarSkidSmoke();
    kx.carBusy = time + 1000;
    this.shake(200, 0.01);
    this.sfx('boss', { vol: 0.6 });
    const ring = this.add.circle(kx.car.x, kx.car.y - 40, 16, 0xff4444, 0).setStrokeStyle(3, 0xff8888).setDepth(99980);
    this.tweens.add({
      targets: ring,
      radius: 160,
      alpha: { from: 0.8, to: 0 },
      duration: 500,
      onComplete: () => ring.destroy(),
    });
    this.time.delayedCall(300, () => {
      for (const p of this.activePlayers()) {
        if (Math.abs(p.x - kx.car.x) < 170 && Math.abs(p.y - kx.car.y) < 70) {
          this._playerKnockdownFromCar(p, 12, p.x < kx.car.x ? -1 : 1, kx.car.x);
        }
      }
    });
  },

  karonuxBossCarHit(dmg, fromX) {
    const kx = this._kx;
    if (!kx || kx.phase !== 'car' || !kx.car?.active) return false;
    kx.carHp = Math.max(0, kx.carHp - dmg);
    this._kxUpdateCarBar();
    this.flash(kx.car, 0xffffff);
    this._kxSpawnCarDebris(kx.car, fromX);
    this.spawnSpark(kx.car.x + Phaser.Math.Between(-40, 40), kx.car.y - 50);
    if (kx.carHp <= 0) this._kxCarExplode();
    return true;
  },

  _kxCarExplode() {
    const kx = this._kx;
    if (!kx || kx.phase !== 'car') return;
    kx.phase = 'transition';
    kx.carBusy = this.time.now + 6000;
    this._kxCleanupTimers();

    const spawnX = kx.car.x;
    const spawnY = kx.car.y;

    this._playBk(kx.car, 'bk_destruction_golf', false);
    this.stopFightMusic();
    this.time.delayedCall(400, () => {
      this._screenFlash(0xff6600, 0.5, 450);
      this.shake(450, 0.02);
      this.sfx('explosion');
      this._hurtPlayersInRadius(spawnX, spawnY - 20, 180, 90, 12);
    });

    this.time.delayedCall(950, () => {
      if (kx.car) {
        kx.car.destroy();
        kx.car = null;
      }
      this._kxCarBar?.destroy();
      this._kxCarFill?.destroy();
      this._kxCarBar = null;
      this._kxCarFill = null;
      this.children.getByName('kxCarLabel')?.destroy();
      this._kxEmergeKaronux(spawnX, spawnY);
    });
  },

  _kxEmergeKaronux(x, y) {
    const kx = this._kx;
    if (!kx) return;

    this._screenFlash(0xffffff, 0.35, 220);
    this.sfx('boss', { vol: 0.85 });

    const def = kx.def;
    const boss = this.physics.add.sprite(x, y + 36, karonuxBossTexKey('idle (1).png'));
    boss.setOrigin(0.5, 1);
    this._bindBkSpr(boss);
    this._fitBossSpr(boss);
    const targetScale = boss.scale;
    boss.setScale(targetScale * 0.15);
    boss.setAlpha(0);
    boss.setCollideWorldBounds(true);
    boss.body.setSize(52, 22);
    boss.body.setOffset(boss.width * 0.5 - 26, boss.height - 22);

    boss.sheet = 'karonux';
    boss.bossDef = def;
    boss.bossCustom = 'karonux_boss';
    boss.hpMax = def.hp;
    boss.hp = def.hp;
    boss.speedV = this._kxFightSpeed(kx);
    boss.damage = this._kxFightDamage(kx);
    boss.reach = def.reach;
    boss.score = def.score;
    boss.facing = -1;
    boss.setFlipX(true);
    boss.isPlayer = false;
    boss.state2 = 'idle';
    boss.invuln = 0;
    boss.busy = this.time.now + 1800;
    boss.baseTint = 0xffffff;
    boss.usesBossFrames = true;
    this._playBk(boss, 'bk_idle', true);

    boss.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
      if (anim.key === 'bk_hurt' && boss.active && boss.state2 === 'hurt') {
        boss.state2 = 'idle';
        this._kxResumeBossAnim(boss);
      }
    });

    this.enemies.add(boss);
    this.boss = boss;
    kx.phase = 'fight';
    kx.laserMode = false;
    kx.bossHp = boss.hp;

    this._buildBossHud(def.name);

    this.tweens.add({
      targets: boss,
      y,
      alpha: 1,
      scale: targetScale,
      duration: 580,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!boss.active) return;
        this._playBk(boss, 'bk_idle', true);
        this.banner('KARONUX LE FATIGUÉ !', null, COL.blood);
        this._comicBubble(boss, "J'suis foncedé ma gueule !", 2200);
        this.startFightMusic();
        kx.nextAtk = this.time.now + 800;
        boss.busy = this.time.now + 600;
      },
    });
  },

  _kxIsCornered(b) {
    return b.x < 72 || b.x > W - 72;
  },

  _kxSetUntouchable(until) {
    const kx = this._kx;
    if (!kx) return;
    kx.untouchableUntil = Math.max(kx.untouchableUntil || 0, until);
    if (this.boss?.active) {
      this.boss.invuln = Math.max(this.boss.invuln || 0, until);
    }
  },


  _kxCancelChargeMotion(kx) {
    if (!kx) return;
    kx._chargeDelay?.remove();
    kx._chargeDelay = null;
    if (kx._chargeTween?.stop) {
      kx._chargeTween.stop();
    }
    kx._chargeTween = null;
  },

  _kxClearDizzyFx(kx) {
    if (!kx) return;
    kx._dizzyEvt?.remove();
    kx._dizzyEvt = null;
    kx._dizzyTween?.stop?.();
    kx._dizzyTween = null;
    kx._dizzyStars?.forEach((s) => s?.destroy?.());
    kx._dizzyStars = null;
    if (this.boss?.active) this.boss.setAngle(0);
  },

  _kxStartDizzyFx(b, ms) {
    const kx = this._kx;
    if (!b?.active || !kx || ms <= 0) return;
    this._kxClearDizzyFx(kx);

    const headOff = b.displayHeight * 0.86;
    const radius = 24;
    const stars = [];
    for (let i = 0; i < 3; i++) {
      stars.push(
        this.add
          .text(b.x, b.y - headOff, '★', F(0, { fontSize: '15px', color: '#ffe566' }))
          .setOrigin(0.5)
          .setDepth(b.depth + 9)
      );
    }
    kx._dizzyStars = stars;

    let spin = 0;
    kx._dizzyEvt = this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (!b.active) {
          this._kxClearDizzyFx(kx);
          return;
        }
        spin += 0.34;
        const cy = b.y - headOff;
        for (let i = 0; i < stars.length; i++) {
          const a = spin + (i * Math.PI * 2) / stars.length;
          stars[i].setPosition(b.x + Math.cos(a) * radius, cy + Math.sin(a) * radius * 0.42);
        }
      },
    });

    kx._dizzyTween = this.tweens.add({
      targets: b,
      angle: { from: -5, to: 5 },
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.time.delayedCall(ms, () => {
      if (!kx || (kx.stunnedUntil || 0) > this.time.now) return;
      this._kxClearDizzyFx(kx);
    });
  },

  /** Charge tête — sprites charge1→4, impact mur ou joueur. */
  _kxHeadCharge(b, time, opts = {}) {
    const kx = this._kx;
    if (!b?.active || !kx) return;
    if (kx.sub === 'charge') return;

    const p = this.nearestPlayerTo(b.x, b.y);
    let dir = opts.dir;
    if (dir == null) {
      if (opts.toCenter && this._kxIsCornered(b)) {
        dir = b.x < W * 0.5 ? 1 : -1;
      } else {
        dir = p.x >= b.x ? 1 : -1;
      }
    }

    const windup = 480;
    const wallPad = KX_FIGHT_WALL_PAD;
    const startX = b.x;
    const preEnrage = !kx.laserMode;
    const fullWallCharge = preEnrage && !opts.toCenter;

    if (fullWallCharge) {
      if (dir > 0 && startX >= W - wallPad - 24) {
        dir = -1;
      } else if (dir < 0 && startX <= wallPad + 24) {
        dir = 1;
      }
    }

    let endX = opts.toCenter && this._kxIsCornered(b)
      ? Phaser.Math.Clamp(W * 0.5, wallPad, W - wallPad)
      : dir > 0
        ? W - wallPad
        : wallPad;

    if (!fullWallCharge && !opts.toCenter) {
      const minRush = Math.min(W * 0.62, 400);
      if (Math.abs(endX - startX) < minRush) {
        endX = Phaser.Math.Clamp(startX + dir * minRush, wallPad, W - wallPad);
      }
    }

    const travel = Math.abs(endX - startX);
    const rushMs = Phaser.Math.Clamp(720 + travel * 0.55, 780, 1400);
    const wallStunMs = fullWallCharge ? KX_CHARGE_WALL_STUN_MS : 750;

    b.setVelocity(0, 0);
    b.facing = dir;
    b.setFlipX(dir < 0);
    kx.sub = 'charge';
    kx._chargeHitPlayer = false;

    b.busy = time + windup + rushMs + wallStunMs + 200;
    kx.nextAtk = time + windup + rushMs + wallStunMs + (opts.nextDelay ?? 500);

    if (opts.label) this.floatText(b.x, b.y - 68, opts.label, COL.gold);
    if (opts.comic) this._comicBubble(b, opts.comic, 2000);

    this._playBk(b, 'bk_charge_windup', false);
    this.sfx('shoot', { vol: 0.3 });

    this._kxCancelChargeMotion(kx);
    kx._chargeDelay = this.time.delayedCall(windup, () => {
      kx._chargeDelay = null;
      if (!b.active || kx.sub !== 'charge') return;

      const runKey = this.anims.exists('bk_charge_run') ? 'bk_charge_run' : 'bk_charge_windup';
      this._playBk(b, runKey, true);
      this.sfx('shoot', { vol: 0.5 });
      if (CONFIG.shake) this.cameras.main.shake(120, 0.006);

      kx._chargeTween = this.tweens.add({
        targets: b,
        x: endX,
        duration: rushMs,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          for (const pl of this.activePlayers()) {
            if (!pl.active || pl.hp <= 0) continue;
            if (Math.abs(pl.x - b.x) < 76 && Math.abs(pl.y - b.y) < 58) {
              if (!kx._chargeHitPlayer) {
                kx._chargeHitPlayer = true;
                this.hurt(pl, b.damage + (opts.extraDmg ?? 12), dir, b.x, b);
                this.spawnSpark(b.x + dir * 28, b.y - b.displayHeight * 0.72);
              }
            }
          }
        },
        onComplete: () => this._kxHeadChargeImpact(b, dir, opts),
      });
    });
  },

  _kxHeadChargeImpact(b, dir, opts = {}) {
    const kx = this._kx;
    if (!b?.active || !kx) return;

    kx.sub = null;
    this._kxCancelChargeMotion(kx);
    kx.untouchableUntil = 0;

    const wallPad = KX_FIGHT_WALL_PAD;
    const preEnrage = !kx.laserMode;
    const fullWallCharge = preEnrage && !opts.toCenter;
    const hitWall = b.x <= wallPad + 12 || b.x >= W - wallPad - 12;

    if (hitWall) {
      b.x = dir > 0 ? W - wallPad : wallPad;
      b.state2 = 'idle';
      b.setVelocity(0, 0);
      this._playBk(b, 'bk_idle', true);
      this.shake(240, 0.013);
      this.sfx('hurt', { vol: 0.55 });
      this.spawnSpark(b.x + dir * 22, b.y - b.displayHeight * 0.74);
      this.floatText(b.x, b.y - 55, 'SONNÉ !', COL.cyan);
      this.flash(b, 0xffff00);
      const stunMs = fullWallCharge ? KX_CHARGE_WALL_STUN_MS : 750;
      kx.stunnedUntil = this.time.now + stunMs;
      b.busy = this.time.now + stunMs;
      kx.nextAtk = this.time.now + stunMs + 450;
      this._kxStartDizzyFx(b, stunMs);
      this.time.delayedCall(stunMs, () => {
        if (!b.active) return;
        this._kxClearDizzyFx(kx);
        this._playBk(b, 'bk_marche', true);
      });
    } else {
      if (kx._chargeHitPlayer) {
        this.spawnSpark(b.x + dir * 18, b.y - b.displayHeight * 0.7);
        b.busy = this.time.now + 520;
      } else {
        b.busy = this.time.now + 380;
      }
      this.time.delayedCall(480, () => {
        if (b.active) this._playBk(b, 'bk_marche', true);
      });
    }
  },

  _kxFightAI(time) {
    const b = this.boss;
    const kx = this._kx;
    if (!b?.active || !kx || b.hp <= 0) return;
    const inTurbo = (kx.turboUntil || 0) > time;
    if (kx.sub === 'charge' || kx.sub === 'clope' || kx.sub === 'laser' || (!inTurbo && time < (kx.untouchableUntil || 0))) {
      b.setVelocity(0, 0);
      return;
    }
    if (!inTurbo && (time < (b.busy || 0) || time < (kx.stunnedUntil || 0))) {
      b.setVelocity(0, 0);
      if (time < (kx.stunnedUntil || 0)) {
        const cur = b.anims?.currentAnim?.key;
        if (cur !== 'bk_idle') this._playBk(b, 'bk_idle', true);
      }
      return;
    }

    const p = this.nearestPlayerTo(b.x, b.y);
    const dist = Math.hypot(p.x - b.x, p.y - b.y);
    if (dist <= b.reach * 1.08) {
      kx.nextAtk = Math.min(kx.nextAtk || 0, time);
    }

    if (this._kxIsCornered(b)) {
      if (Math.abs(p.x - b.x) < 130 && time > (kx.lastCornerEscape || 0) + 8500) {
        kx.lastCornerEscape = time;
        this._kxHeadCharge(b, time, { label: 'COIN !', toCenter: true, extraDmg: 10 });
        return;
      }
    }

    const hpRatio = b.hp / b.hpMax;
    if (!kx.finalTriggered && hpRatio <= 0.1) {
      kx.finalTriggered = true;
      this._kxFinalPhase(time);
      return;
    }
    if (!kx.laserModeTriggered && hpRatio <= 0.5) {
      kx.laserModeTriggered = true;
      this._kxEnterLaserMode(b, time);
      return;
    }

    if (time < kx.nextAtk) {
      this._kxBossApproach(b, time);
      return;
    }

    const attacks = kx.laserMode
      ? ['rage', 'poing', 'pied', 'poing', 'pied', 'poing', 'laser']
      : ['poing', 'pied', 'charge', 'poing', 'pied', 'clope'];
    let pick = attacks[kx.atkIdx % attacks.length];
    kx.atkIdx++;
    if (pick === 'laser' && time < (kx.lastLaser || 0) + 9000) pick = 'poing';

    if (pick === 'laser') this._kxAtkLaser(b, time);
    else if (pick === 'clope') this._kxAtkClope(b, time);
    else if (pick === 'charge') this._kxHeadCharge(b, time, { label: 'CHARGE !' });
    else if (pick === 'rage') this._kxAtkRage(b, time);
    else if (pick === 'pied') this._kxAtkPied(b, time);
    else this._kxAtkPoing(b, time);
  },

  _kxEnterLaserMode(b, time) {
    const kx = this._kx;
    b.setVelocity(0, 0);
    b.busy = time + 1800;
    kx.nextAtk = time + 2000;
    kx.laserMode = true;
    this._kxSetUntouchable(time + 2200);
    b.setTint(0xff0000);
    b.baseTint = 0xff0000;
    this.flash(b, 0xff0000);
    this.shake(280, 0.012);
    this.banner('REGARD INSOMNIAQUE !', null, COL.blood);
    this._playBk(b, 'bk_rage', false);
    this.time.delayedCall(1800, () => {
      if (b.active) this._playBk(b, 'bk_marche', true);
    });
  },

  _kxPointSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Phaser.Math.Clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  },

  _kxDrawLaserBeam(g, x1, y1, x2, y2, alpha = 1) {
    g.clear();
    g.lineStyle(18, 0xff0000, 0.18 * alpha);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(10, 0xff3333, 0.45 * alpha);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(4, 0xff8888, 0.85 * alpha);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(2, 0xffffff, 0.95 * alpha);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
  },

  _kxChmekAuraOrigin(b) {
    return {
      x: b.x,
      y: b.y - b.displayHeight * 0.5,
    };
  },

  _kxChmekLaserOrigin(b) {
    return {
      x: b.x + b.facing * 10,
      y: b.y - b.displayHeight * 0.62,
    };
  },

  _kxClearChmekAura(kx) {
    if (!kx) return;
    if (kx._chmekAuraTween?.stop) kx._chmekAuraTween.stop();
    kx._chmekAuraTween = null;
    kx._chmekAuraCore?.destroy();
    kx._chmekAuraCore = null;
    kx._chmekAuraRing?.destroy();
    kx._chmekAuraRing = null;
  },

  _kxStartChmekAuraCharge(b, kx) {
    const { x: cx, y: cy } = this._kxChmekAuraOrigin(b);
    this._kxClearChmekAura(kx);
    kx._chmekAuraCore = this.add
      .circle(cx, cy, 46, 0xff2222, 0.14)
      .setDepth(b.depth + 3);
    kx._chmekAuraRing = this.add
      .circle(cx, cy, 58, 0xff0000, 0)
      .setStrokeStyle(4, 0xff8888, 0.65)
      .setDepth(b.depth + 2);
    kx._chmekAuraTween = this.tweens.add({
      targets: [kx._chmekAuraCore, kx._chmekAuraRing],
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: { from: 1, to: 0.35 },
      duration: 380,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    });
  },

  _kxBurstChmekAura(b, radius = 178, pushDist = 280, jumpV = 12.5) {
    const { x: cx, y: cy } = this._kxChmekAuraOrigin(b);

    for (const p of this.activePlayers()) {
      if (!p.active || p.hp <= 0 || !p.isPlayer) continue;
      const py = p.y - (p.jumpZ ?? 0);
      if (Math.abs(py - b.y) > 96) continue;
      const dx = p.x - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius + 36) continue;

      const dir = dx === 0 ? (p.x >= b.x ? 1 : -1) : dx > 0 ? 1 : -1;
      const falloff = Math.max(0.6, 1.08 - dist / (radius + 36));
      const targetX = Phaser.Math.Clamp(p.x + dir * pushDist * falloff, 48, W - 48);

      if (p.airborne) p.y += p.jumpZ || 0;
      p.airborne = true;
      p.jumpZ = 0;
      p.jumpVZ = jumpV * falloff;
      p.kicking = false;
      p._airKickHeld = false;
      p.state2 = 'jump';
      if (p.anims) this.anim(p, 'jump', false);
      this.flash(p, 0xff8888);
      this.tweens.add({
        targets: p,
        x: targetX,
        duration: 440,
        ease: 'Cubic.easeOut',
      });
    }

    const burstFill = this.add.circle(cx, cy, 34, 0xff3333, 0.28).setDepth(b.depth + 5);
    const burstRing = this.add
      .circle(cx, cy, 40, 0xff0000, 0)
      .setStrokeStyle(6, 0xffaaaa, 0.95)
      .setDepth(b.depth + 6);
    this.tweens.add({
      targets: [burstFill, burstRing],
      radius: radius * 1.12,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => {
        burstFill.destroy();
        burstRing.destroy();
      },
    });
  },

  _kxDrawLaserTelegraph(g, x1, y1, x2, y2, alpha = 0.35) {
    g.clear();
    g.lineStyle(6, 0xff4444, alpha);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(2, 0xffaaaa, alpha * 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
  },

  _kxLaserHitPlayers(b, x1, y1, x2, y2, dmg, hitFlag) {
    for (const pl of this.activePlayers()) {
      if (!pl.active || pl.hp <= 0) continue;
      if (pl.airborne && (pl.jumpZ ?? 0) >= 16) continue;
      const bodyY = pl.y - (pl.jumpZ ?? 0) - pl.displayHeight * 0.42;
      const dist = this._kxPointSegDist(pl.x, bodyY, x1, y1, x2, y2);
      if (dist < 30 && Math.abs(pl.y - b.y) < 82) {
        if (hitFlag[pl.playerSlot ?? 0]) continue;
        hitFlag[pl.playerSlot ?? 0] = true;
        this.hurt(pl, dmg, b.facing, b.x, b);
      }
    }
  },

  _kxAtkLaser(b, time) {
    const kx = this._kx;
    if (!kx) return;

    const p = this.nearestPlayerTo(b.x, b.y);
    b.setVelocity(0, 0);
    b.facing = p.x < b.x ? -1 : 1;
    b.setFlipX(b.facing < 0);

    const auraWindupMs = 480;
    const afterAuraMs = 540;
    const chargeMs = 860;
    const beamMs = 520;
    const laserStartMs = auraWindupMs + afterAuraMs;
    const totalMs = laserStartMs + chargeMs + beamMs + 280;

    kx.sub = 'laser';
    kx.lastLaser = time;
    b.busy = time + totalMs;
    kx.nextAtk = time + totalMs + 350;
    this._kxSetUntouchable(time + auraWindupMs + 160);

    this.floatText(b.x, b.y - 62, 'CHMEK LASER !', COL.blood);
    this._playBk(b, 'bk_rage', false);
    this._kxResetLaserFx(kx);
    this._kxStartChmekAuraCharge(b, kx);

    this._kxTrackLaserCall(
      kx,
      this.time.delayedCall(auraWindupMs, () => {
        if (!b.active || kx.sub !== 'laser') return;
        this._kxBurstChmekAura(b);
        this._kxClearChmekAura(kx);
        this.shake(220, 0.011);
        this.sfx('shoot', { vol: 0.72 });
        this.flash(b, 0xff4444);
        this._kxTrackLaserCall(
          kx,
          this.time.delayedCall(140, () => {
            if (b.active) b.setTint(b.baseTint ?? 0xffffff);
          })
        );
      })
    );

    kx._laserDelay = this._kxTrackLaserCall(
      kx,
      this.time.delayedCall(laserStartMs, () => {
        kx._laserDelay = null;
        if (!b.active || kx.sub !== 'laser') return;

        this._playBk(b, 'bk_idle', true);
        const tele = this.add.graphics().setDepth(99991);
        kx._laserGfx = tele;

        const teleStepMs = 100;
        kx._laserTeleEvt = this.time.addEvent({
          delay: teleStepMs,
          repeat: Math.floor(chargeMs / teleStepMs),
          callback: () => {
            if (!b.active || kx.sub !== 'laser') return;
            const { x: sx, y: sy } = this._kxChmekLaserOrigin(b);
            const tgt = this.nearestPlayerTo(b.x, b.y);
            const ex = tgt.x;
            const ey = tgt.y - tgt.displayHeight * 0.38;
            const pulse = 0.28 + 0.12 * Math.sin(this.time.now * 0.014);
            this._kxDrawLaserTelegraph(tele, sx, sy, ex, ey, pulse);
          },
        });

        this._kxTrackLaserCall(
          kx,
          this.time.delayedCall(chargeMs, () => {
            kx._laserTeleEvt?.remove();
            kx._laserTeleEvt = null;
            if (!b.active || kx.sub !== 'laser') {
              tele.destroy();
              if (kx._laserGfx === tele) kx._laserGfx = null;
              return;
            }

            tele.destroy();
            const { x: sx, y: sy } = this._kxChmekLaserOrigin(b);
            const tgt = this.nearestPlayerTo(b.x, b.y);
            const ex = tgt.x;
            const ey = tgt.y - tgt.displayHeight * 0.38;
            const beam = this.add.graphics().setDepth(99992);
            kx._laserGfx = beam;
            const prog = { t: 0 };
            const laserDmg = Math.round(b.damage * 1.65);

            this.sfx('shoot', { vol: 0.88 });
            if (CONFIG.shake) this.cameras.main.shake(120, 0.01);
            this._screenFlash(0xff0000, 0.1, 70);

            kx._laserBeamTween = this.tweens.add({
              targets: prog,
              t: 1,
              duration: 240,
              ease: 'Quad.easeOut',
              onUpdate: () => {
                const mx = sx + (ex - sx) * prog.t;
                const my = sy + (ey - sy) * prog.t;
                this._kxDrawLaserBeam(beam, sx, sy, mx, my);
              },
              onComplete: () => {
                if (!b.active || kx.sub !== 'laser') return;
                this._kxDrawLaserBeam(beam, sx, sy, ex, ey);
                const hitFlag = {};
                let ticks = 0;
                kx._laserTeleEvt = this.time.addEvent({
                  delay: 100,
                  repeat: Math.floor(beamMs / 100),
                  callback: () => {
                    if (!b.active || kx.sub !== 'laser') return;
                    this._kxDrawLaserBeam(beam, sx, sy, ex, ey, 1 - ticks * 0.08);
                    this._kxLaserHitPlayers(b, sx, sy, ex, ey, laserDmg, hitFlag);
                    ticks++;
                  },
                });

                this._kxTrackLaserCall(
                  kx,
                  this.time.delayedCall(beamMs + 60, () => {
                    kx._laserTeleEvt?.remove();
                    kx._laserTeleEvt = null;
                    if (!beam.active) return;
                    this.tweens.add({
                      targets: beam,
                      alpha: 0,
                      duration: 200,
                      onComplete: () => {
                        beam.destroy();
                        if (kx._laserGfx === beam) kx._laserGfx = null;
                      },
                    });
                    if (b.active) this._playBk(b, 'bk_marche', true);
                    kx.sub = null;
                  })
                );
              },
            });
          })
        );
      })
    );
  },

  _kxBossApproach(b, time) {
    const kx = this._kx;
    const p = this.nearestPlayerTo(b.x, b.y);
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy);
    b.facing = dx < 0 ? -1 : 1;
    b.setFlipX(b.facing < 0);
    const spdMul = time < (kx?.turboUntil || 0) ? 2 : 1;
    const a = Math.atan2(dy, dx);
    const spd = b.speedV * spdMul;

    if (d > b.reach * 0.55) {
      b.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
    } else {
      b.setVelocity(Math.cos(a) * spd * 0.65, Math.sin(a) * spd * 0.65);
    }
    this._playBk(b, 'bk_marche', true);
    this.clampBand(b);
  },

  _kxCancelClope(b) {
    const kx = this._kx;
    if (!kx) return;

    kx._clopeStartEvt?.remove();
    kx._clopeStartEvt = null;
    kx._clopeEndEvt?.remove();
    kx._clopeEndEvt = null;
    kx._turboRegenEvt?.remove();
    kx._turboRegenEvt = null;
    kx.turboUntil = 0;
    kx.sub = null;
    this._kxStopTurboSmoke();

    if (b?.active) {
      b.setVelocity(0, 0);
      b.busy = this.time.now + 60;
      b._kxHurtTimer?.remove();
      b._kxHurtTimer = null;
      if (b.state2 === 'hurt') b.state2 = 'idle';
    }
  },

  _kxStartClopeHigh(b) {
    const kx = this._kx;
    if (!b?.active || !kx) return;

    const until = this.time.now + KX_CLOPE_SMOKE_MS;
    kx.turboUntil = until;
    kx.sub = 'clope';
    b.setVelocity(0, 0);
    b.busy = until;
    kx.nextAtk = until + 500;
    this.floatText(b.x, b.y - 60, 'Pause Bedo', COL.gold);
    this._comicBubble(b, 'Fait F ton Tah Lorenzo !', KX_CLOPE_SMOKE_MS - 400);
    const smokeKey = this.anims.exists('bk_clope_fume') ? 'bk_clope_fume' : 'bk_clope';
    this._playBk(b, smokeKey, true);
    this._kxStartTurboSmoke(b);

    kx._turboRegenEvt?.remove();
    kx._turboRegenEvt = this.time.addEvent({
      delay: 900,
      repeat: Math.max(0, Math.floor(KX_CLOPE_SMOKE_MS / 900) - 1),
      callback: () => {
        if (!b.active || this.time.now >= (kx.turboUntil || 0)) return;
        const heal = Math.max(3, Math.round(b.hpMax * 0.014));
        b.hp = Math.min(b.hpMax, b.hp + heal);
        this.updateHUD();
        this._kxUpdateBossBar();
      },
    });
  },

  _kxEndClopeHigh(b) {
    const kx = this._kx;
    if (!kx) return;
    kx.turboUntil = 0;
    this._kxStopTurboSmoke();
    kx._turboRegenEvt?.remove();
    kx._turboRegenEvt = null;
    if (!b?.active) return;
    kx.sub = 'yawn';
    b.damage = this._kxFightDamage(kx);
    b.speedV = this._kxFightSpeed(kx);
    b.busy = this.time.now + 1200;
    this._playBk(b, 'bk_idle', true);
    this.floatText(b.x, b.y - 55, '*baille*', COL.grey);
    this.time.delayedCall(1200, () => {
      if (this._kx) this._kx.sub = null;
    });
  },

  _kxAtkClope(b, time) {
    const kx = this._kx;
    b.setVelocity(0, 0);
    b.busy = time + KX_CLOPE_WINDUP_MS + KX_CLOPE_SMOKE_MS;
    this._kx.nextAtk = time + KX_CLOPE_WINDUP_MS + KX_CLOPE_SMOKE_MS + 500;
    this._playBk(b, 'bk_clope', false);
    kx._clopeStartEvt?.remove();
    kx._clopeEndEvt?.remove();
    kx._clopeStartEvt = this.time.delayedCall(KX_CLOPE_WINDUP_MS, () => {
      if (!b.active) return;
      this._kxStartClopeHigh(b);
    });
    kx._clopeEndEvt = this.time.delayedCall(KX_CLOPE_WINDUP_MS + KX_CLOPE_SMOKE_MS, () => {
      if (!b.active) return;
      this._kxEndClopeHigh(b);
    });
  },

  _kxMeleePlayers(b, range, band, dmg, aoe = false) {
    for (const p of this.activePlayers()) {
      if (!p.active || p.hp <= 0) continue;
      const dx = p.x - b.x;
      const dy = Math.abs(p.y - b.y);
      const front = aoe
        ? Math.abs(dx) < range
        : (Math.sign(dx) === b.facing || dx === 0) && Math.abs(dx) < range;
      if (front && dy < band) {
        this.hurt(p, dmg, Math.sign(dx || b.facing), b.x, b);
      }
    }
  },

  _kxAtkRage(b, time) {
    b.busy = time + 1400;
    this._kx.nextAtk = time + 780;
    this._kxSetUntouchable(time + 1400);
    this._playBk(b, 'bk_rage', false);
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(120 + i * 180, () => {
        if (!b.active) return;
        this._kxMeleePlayers(b, 100, 70, b.damage + 4, true);
        this.spawnSpark(b.x + b.facing * (30 + i * 12), b.y - 40);
      });
    }
    this.time.delayedCall(200, () => {
      if (!b.active) return;
      const dir = b.facing;
      this.tweens.add({
        targets: b,
        x: b.x + dir * 200,
        duration: 220,
        yoyo: true,
        onUpdate: () => {
          for (const p of this.activePlayers()) {
            if (Math.abs(p.x - b.x) < 75 && Math.abs(p.y - b.y) < 55) {
              this.hurt(p, b.damage, dir, b.x, b);
            }
          }
        },
      });
    });
  },

  _kxAtkPoing(b, time) {
    b.setVelocity(0, 0);
    b.busy = time + 600;
    this._kx.nextAtk = time + 850;
    this._playBk(b, 'bk_poing', false);
    this.time.delayedCall(220, () => {
      if (b.active) this._kxMeleePlayers(b, b.reach + 10, 58, b.damage, false);
    });
  },

  _kxAtkPied(b, time) {
    b.setVelocity(0, 0);
    b.busy = time + 700;
    this._kx.nextAtk = time + 950;
    this._playBk(b, 'bk_pied', false);
    this.time.delayedCall(260, () => {
      if (b.active) this._kxMeleePlayers(b, b.reach + 20, 72, b.damage + 6, true);
    });
  },

  _kxFinalPhase(time) {
    const b = this.boss;
    const kx = this._kx;
    if (!b?.active) return;
    kx.phase = 'final';
    kx.sub = 'kneel';
    b.setVelocity(0, 0);
    b.busy = time + 3500;
    this._kxSetUntouchable(time + 3500);
    this._playBk(b, 'bk_idle', true);
    this.floatText(b.x, b.y - 70, '...', COL.grey);

    this.time.delayedCall(1800, () => {
      if (!b.active) return;
      this._comicBubble(b, 'J\'suis fracass...', 2200);
      const heal = Math.round(b.hpMax * 0.08);
      b.hp = Math.min(b.hpMax, b.hp + heal);
      this.updateHUD();
      this._kxUpdateBossBar();
      kx.sub = null;
      kx.untouchableUntil = 0;
      kx.nextAtk = this.time.now + 800;
      this.flash(b, 0xff0000);
    });
  },

  karonuxBossHurt(b, dmg) {
    const kx = this._kx;
    if ((kx?.untouchableUntil || 0) > this.time.now) return 0;
    if (kx?.sub === 'yawn') return Math.round(dmg * 1.45);

    const now = this.time.now;
    const inTurbo = (kx?.turboUntil || 0) > now;
    if (inTurbo) dmg = Math.round(dmg * 1.35);

    if (kx?.sub === 'clope') {
      this._kxCancelClope(b);
      this.time.delayedCall(30, () => {
        if (b.active && this._kx && this._kx.sub !== 'charge') {
          this._kxHeadCharge(b, this.time.now, {
            label: 'CHARGE !',
            comic: 'Ma clope !!',
            extraDmg: 14,
          });
        }
      });
      return dmg;
    }

    if (inTurbo) return dmg;

    if (kx) {
      kx.hitLog = (kx.hitLog || []).filter((t) => now - t < 1600);
      kx.hitLog.push(now);
      if (
        kx.hitLog.length >= 8 &&
        now > (kx.lastForcedRetreat || 0) + 8500 &&
        kx.sub !== 'charge'
      ) {
        kx.lastForcedRetreat = now;
        kx.hitLog = [];
        this.time.delayedCall(30, () => {
          if (b.active && this._kx) {
            this._kxHeadCharge(b, this.time.now, { label: 'STOP !', comic: 'Assez !', extraDmg: 16 });
          }
        });
      }
    }
    return dmg;
  },

  karonuxBossDie(b) {
    const kx = this._kx;
    if (!b?.active) return;
    this._kxCleanupTimers();
    b.setVelocity(0, 0);
    b.body.enable = false;
    this._playBk(b, 'bk_mort', false);
    this.time.delayedCall(1200, () => {
      this._comicBubble(b, '...je ... suis .... tfault...', 3000);
    });
    this.time.delayedCall(2800, () => {
      if (kx) {
        kx.phase = 'dead';
        this._kx = null;
      }
    });
  },

  _screenFlash(color, alpha, duration) {
    const ov = this.add.rectangle(W / 2, H / 2, W, H, color, alpha).setScrollFactor(0).setDepth(98000);
    this.tweens.add({ targets: ov, alpha: 0, duration, onComplete: () => ov.destroy() });
  },
};
