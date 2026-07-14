import Phaser from 'phaser';
import { W, FLOOR_BOTTOM, COL, F, NUM } from '../../config/gameConfig.js';
import { CONFIG } from '../../config/difficulty.js';
import { ENEMY_TYPES } from '../../config/enemies.js';
import {
  KIKOR_BOSS_DEF,
  KIKOR_BRUSH_VARIANTS,
  KIKOR_CANVAS_HP,
  KIKOR_TACHE_KEYS,
  kikorBossDisplayH,
  kikorBossTexKey,
} from '../../config/bossKikor.js';

const MAX_CANVASES_P1 = 4;
const MAX_CANVASES_P2 = 3;

const KK_FOOT_IDLE = 'bk_kikor_idle';
const KK_FOOT_IDLE_TEX = 'boss_kikor_idle (1).png';
const KK_BIKE_ANIMS = new Set([
  'bk_kikor_velo_idle',
  'bk_kikor_velo_roule',
  'bk_kikor_velo_derapage',
  'bk_kikor_velo_mort',
  'bk_kikor_monte_velo',
]);
const KK_FOOT_ANIMS = new Set([
  'bk_kikor_entree',
  'bk_kikor_idle',
  'bk_kikor_marche',
  'bk_kikor_hurt',
  'bk_kikor_mort',
  'bk_kikor_poing',
  'bk_kikor_pied',
  'bk_kikor_peinture_prep',
  'bk_kikor_coup_pinceau',
  'bk_kikor_lance_pinceau',
]);

/** GameScene mixin — boss Kikor peintre (2 phases). */
export const kikorBossMixin = {
  _kkIsBikeTexture(texKey) {
    if (!texKey) return false;
    return texKey.includes('velo') || texKey.includes('monte_velo');
  },

  _kkSnapFootPose(b) {
    if (!b?.active || this._kk?.bike) return;
    b.anims?.stop?.();
    const tex = kikorBossTexKey(KK_FOOT_IDLE_TEX);
    if (this.textures.exists(tex)) {
      b.setTexture(tex);
      b._kkFitKey = tex;
      this._fitKkBossSpr(b);
    }
    b.state2 = 'idle';
    this._playKk(b, KK_FOOT_IDLE, true);
  },

  _kkSnapBikePose(b) {
    if (!b?.active || !this._kk?.bike) return;
    b.anims?.stop?.();
    b.state2 = 'idle';
    this._playKk(b, 'bk_kikor_velo_idle', true);
  },

  _kkMaxCanvases() {
    return this._kk?.bike ? MAX_CANVASES_P2 : MAX_CANVASES_P1;
  },

  _kkBumpCanvasGen() {
    const kk = this._kk;
    if (kk) kk.canvasGen = (kk.canvasGen || 0) + 1;
  },

  _kkCanvasGenValid(easel) {
    const kk = this._kk;
    return easel?.active && !easel._kkCancelled && easel._kkGen === kk?.canvasGen;
  },

  _kkBlocksInput() {
    const kk = this._kk;
    if (!kk) return false;
    return kk.phase === 'intro' || kk.phase === 'transition';
  },

  _fitKkBossSpr(spr, mul = 1) {
    if (!spr?.texture) return;
    const src = spr.texture.getSourceImage?.() || spr.texture.source?.[0];
    const h = src?.height || spr.height || 140;
    const targetH = kikorBossDisplayH(0.82) * mul;
    spr.setScale(targetH / h);
    spr.setOrigin(0.5, 1);
  },

  _bindKkSpr(spr) {
    if (!spr || spr._kkBound) return;
    spr._kkBound = true;
    spr.setOrigin(0.5, 1);
    spr.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
      const key = spr.texture?.key;
      if (spr._kkFitKey === key) return;
      spr._kkFitKey = key;
      this._fitKkBossSpr(spr);
    });
  },

  _playKk(spr, key, repeat = false) {
    if (!spr?.active || !this.anims.exists(key)) return false;
    const kk = this._kk;
    if (spr === this.boss && kk) {
      if (!kk.bike && KK_BIKE_ANIMS.has(key)) {
        this._kkSnapFootPose(spr);
        return false;
      }
      if (kk.bike && KK_FOOT_ANIMS.has(key) && key !== 'bk_kikor_lance_pinceau') {
        return false;
      }
    }
    if (repeat && spr.anims?.isPlaying && spr.anims.currentAnim?.key === key) return true;
    this._bindKkSpr(spr);
    spr.anims.play(key, repeat);
    if (!repeat && spr === this.boss && key !== 'bk_kikor_entree' && key !== 'bk_kikor_hurt') {
      spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
        if (anim.key !== key || !spr.active || spr.dying) return;
        if (anim.key === 'bk_kikor_monte_velo') return;
        if (spr.state2 === 'hurt') return;
        if ((spr.busy || 0) > this.time.now) return;
        if (this._kk?.bike) this._kkSnapBikePose(spr);
        else this._kkSnapFootPose(spr);
      });
    }
    return true;
  },

  _kkResumeIdle(b) {
    if (!b?.active) return;
    if (this._kk?.bike) this._kkSnapBikePose(b);
    else this._kkSnapFootPose(b);
  },

  _kkScheduleCanvas(easel, delay, fn) {
    if (!easel._kkTimers) easel._kkTimers = [];
    easel._kkTimers.push(this.time.delayedCall(delay, fn));
  },

  _kkCanvasBreakFx(x, y) {
    const fx = this.add
      .sprite(x, y - 36, kikorBossTexKey('kikor_ennemi_hurt (1).png'))
      .setOrigin(0.5, 1)
      .setDepth(Math.floor(y) + 8);
    const scale = (this.boss?.scale ?? 1) * 0.9;
    fx.setScale(scale);
    if (this.anims.exists('bk_kikor_ennemi_hurt')) {
      fx.anims.play('bk_kikor_ennemi_hurt', false);
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    } else {
      this.time.delayedCall(320, () => fx.destroy());
    }
    this.spawnSpark(x, y - 52);
    this.floatText(x, y - 72, 'TABLEAU !', COL.grey);
    this.sfx('hit', { vol: 0.55 });
  },

  _kkDestroyCanvas(easel, { fx = true, releaseBoss = true } = {}) {
    const kk = this._kk;
    if (!easel?.active) return;
    easel._kkCancelled = true;
    easel._kkTimers?.forEach((t) => t?.remove?.());
    easel._kkTimers = null;
    const idx = kk?.canvases?.indexOf(easel) ?? -1;
    if (idx >= 0) kk.canvases.splice(idx, 1);
    const { x, y } = easel;
    if (fx) this._kkCanvasBreakFx(x, y);
    easel.destroy();
    if (releaseBoss && this.boss?.active && (this.boss.busy || 0) > this.time.now) {
      this.boss.busy = this.time.now + 200;
      this._kkResumeIdle(this.boss);
    }
  },

  _kkDamageCanvas(easel, dmg) {
    if (!easel?.active || easel._kkCancelled) return;
    easel.hp = (easel.hp ?? KIKOR_CANVAS_HP) - Math.max(1, dmg);
    this.tweens.add({ targets: easel, alpha: 0.75, duration: 40, yoyo: true });
    if (easel.hp <= 0) this._kkDestroyCanvas(easel, { fx: true, releaseBoss: true });
  },

  _kkMeleeCanvases(src, range, band, dmg) {
    const kk = this._kk;
    if (!src?.isPlayer || !kk || kk.phase !== 'fight') return;
    for (const easel of [...(kk.canvases || [])]) {
      if (!easel?.active) continue;
      const dx = easel.x - src.x;
      const dy = Math.abs(easel.y - src.y);
      const front = (Math.sign(dx) === src.facing || dx === 0) && Math.abs(dx) < range + 38;
      if (front && dy < band + 34) this._kkDamageCanvas(easel, dmg);
    }
  },

  _kkBulletCanvases(b) {
    if (!b?.fromPlayer || !b.active) return false;
    const kk = this._kk;
    if (!kk || kk.phase !== 'fight') return false;
    for (const easel of [...(kk.canvases || [])]) {
      if (!easel?.active) continue;
      if (Math.abs(easel.x - b.x) < 36 && Math.abs(easel.y - b.y) < 48) {
        this._kkDamageCanvas(easel, b.dmg || 8);
        return true;
      }
    }
    return false;
  },

  spawnKikorBoss() {
    this.phase = 'boss';
    this.stopFightMusic?.();
    if (this.props) this.props.clear(true, true);
    if (this.pickups) this.pickups.clear(true, true);

    const def = this.lv.boss || KIKOR_BOSS_DEF;
    this._kk = {
      phase: 'intro',
      def,
      bike: false,
      nextAtk: 0,
      atkIdx: 0,
      canvases: [],
      brushSeq: 0,
      canvasGen: 0,
    };

    this._kkIntro();
  },

  _kkIntro() {
    const kk = this._kk;
    const y = FLOOR_BOTTOM - 15;
    const x = W + 50;
    const boss = this.physics.add.sprite(x, y, kikorBossTexKey('boss_kikor_idle (1).png'));
    boss.setCollideWorldBounds(true);
    boss.body.setSize(48, 20);
    boss.body.setOffset(boss.width * 0.5 - 24, boss.height - 20);
    this._bindKkSpr(boss);
    this._fitKkBossSpr(boss);

    boss.sheet = 'kikor';
    boss.bossDef = kk.def;
    boss.bossCustom = 'kikor_boss';
    boss.hpMax = kk.def.hp;
    boss.hp = kk.def.hp;
    boss.speedV = kk.def.fightSpeed;
    boss.damage = kk.def.fightDamage;
    boss.reach = kk.def.reach;
    boss.score = kk.def.score;
    boss.facing = -1;
    boss.setFlipX(true);
    boss.isPlayer = false;
    boss.state2 = 'idle';
    boss.invuln = 0;
    boss.busy = this.time.now + 4000;
    boss.usesBossFrames = true;

    boss.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
      if (!boss.active) return;
      if (anim.key === 'bk_kikor_hurt' && boss.state2 === 'hurt') {
        this._kkResumeIdle(boss);
      }
    });

    this.enemies.add(boss);
    this.boss = boss;
    kk.phase = 'intro';

    this._playKk(boss, 'bk_kikor_entree', false);
    this.tweens.add({
      targets: boss,
      x: W * 0.72,
      duration: 1200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!boss.active) return;
        kk.phase = 'fight';
        boss.busy = this.time.now + 500;
        kk.nextAtk = this.time.now + 900;
        this.banner(kk.def.name, null, COL.cyan);
        this._comicBubble?.(boss, 'Présent !', 1800);
        this.startFightMusic?.();
        this._kkSnapFootPose(boss);
        this._kkBossHud();
      },
    });
  },

  _kkBossHud() {
    const def = this._kk?.def ?? KIKOR_BOSS_DEF;
    this._buildBossHud(def.name);
  },

  updateKikorBoss(time) {
    const b = this.boss;
    const kk = this._kk;
    if (!b?.active || !kk || kk.phase !== 'fight' || b.hp <= 0) return;
    if (time < (b.busy || 0) || b.state2 === 'hurt') return;

    if (!kk.bike && this._kkIsBikeTexture(b.texture?.key)) {
      this._kkSnapFootPose(b);
    }

    if (!kk.bike && b.hp <= b.hpMax * (kk.def.enrageAt ?? 0.5)) {
      this._kkEnterPhase2(b, time);
      return;
    }

    if (time > (kk.nextAtk || 0)) {
      if (kk.bike) {
        kk.atkIdx = (kk.atkIdx + 1) % 4;
        kk.nextAtk = time + 2000;
        if (kk.atkIdx === 0) this._kkBikeDrift(b, time);
        else if (kk.atkIdx === 1) this._kkPaintSpawn(b, time);
        else if (kk.atkIdx === 2) this._kkThrowBrush(b, time, true);
        else this._kkPaintSpawn(b, time);
      } else {
        kk.atkIdx = (kk.atkIdx + 1) % 5;
        kk.nextAtk = time + 2200;
        if (kk.atkIdx === 0 || kk.atkIdx === 2 || kk.atkIdx === 4) this._kkPaintSpawn(b, time);
        else if (kk.atkIdx === 1) this._kkThrowBrush(b, time, false);
        else this._kkMelee(b, time);
      }
      return;
    }

    if (b.state2 === 'walk') this._kkApproach(b, time, true);
  },

  _kkApproach(b, time, hold = false) {
    const p = this.nearestPlayerTo(b.x, b.y);
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy);
    b.facing = dx < 0 ? -1 : 1;
    b.setFlipX(b.facing < 0);
    const kk = this._kk;
    const reach = kk?.bike ? b.reach + 40 : b.reach;
    if (d > reach) {
      const a = Math.atan2(dy, dx);
      const spd = kk?.bike ? b.speedV * 1.35 : b.speedV;
      b.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
      b.state2 = 'walk';
      this._playKk(b, kk?.bike ? 'bk_kikor_velo_roule' : 'bk_kikor_marche', true);
    } else if (!hold) {
      b.setVelocity(0, 0);
      this._kkMelee(b, time);
    } else {
      b.setVelocity(0, 0);
      this._kkResumeIdle(b);
    }
    this.clampBand(b);
  },

  _kkMelee(b, time) {
    b.setVelocity(0, 0);
    b.busy = time + 520;
    const key = Math.random() < 0.55 ? 'bk_kikor_poing' : 'bk_kikor_pied';
    this._playKk(b, key, false);
    this.time.delayedCall(220, () => {
      if (!b.active) return;
      const p = this.nearestPlayerTo(b.x, b.y);
      if (Math.abs(p.x - b.x) < b.reach + 20 && Math.abs(p.y - b.y) < 48) {
        this.hurt(p, b.damage, b.facing, b.x);
      }
    });
  },

  _kkPickBrushVariants(triple) {
    const kk = this._kk;
    const n = KIKOR_BRUSH_VARIANTS.length;
    if (triple) {
      const base = kk.brushSeq % n;
      kk.brushSeq++;
      return [base, (base + 2) % n, (base + 4) % n];
    }
    const v = kk.brushSeq % n;
    kk.brushSeq++;
    return [v];
  },

  _kkThrowBrush(b, time, triple = false) {
    b.setVelocity(0, 0);
    b.busy = time + 620;
    this._playKk(b, 'bk_kikor_lance_pinceau', false);
    this.sfx('shoot', { vol: 0.5 });
    const variants = this._kkPickBrushVariants(triple);
    variants.forEach((variant, i) => {
      this.time.delayedCall(180 + i * 90, () => {
        if (!b.active) return;
        this._kkSpawnBrush(b.x + b.facing * 40, b.y - 46, b.facing, variant);
      });
    });
  },

  _kkSpawnBrush(x, y, facing, variantIdx = 0) {
    const variant = KIKOR_BRUSH_VARIANTS[variantIdx % KIKOR_BRUSH_VARIANTS.length];
    const tex = kikorBossTexKey(`pinceau (${variant.tex}).png`);
    const brush = this.physics.add.sprite(x, y, tex).setDepth(99980);
    brush.dir = facing;
    brush.dmg = Math.max(6, (this.boss?.damage ?? 16) - 6);
    brush.fromPlayer = false;
    brush.born = this.time.now;
    brush.isBrush = true;
    brush.setOrigin(0.5, 0.5);
    const src = brush.texture.getSourceImage?.() || brush.texture.source?.[0];
    const h = src?.height || brush.height || 32;
    brush.setScale((kikorBossDisplayH(0.82) * 0.35) / h);
    if (brush.body) {
      brush.body.setAllowGravity(false);
      brush.body.setSize(18, 10);
      brush.body.setVelocity(facing * variant.speed, variant.vy);
    }
    brush.setFlipX(facing < 0);
    brush.setAngle(Phaser.Math.Between(-25, 25));
    if (this.anims.exists('bk_kikor_pinceau_vol')) brush.anims.play('bk_kikor_pinceau_vol', true);
    this.tweens.add({
      targets: brush,
      angle: brush.angle + facing * 220 * (variant.spin || 1),
      duration: 520,
    });
    this.bullets.add(brush);
  },

  _kkPaintSpawn(b, time) {
    const kk = this._kk;
    const fromBike = !!kk.bike;
    if (kk.canvases.length >= this._kkMaxCanvases()) {
      this._kkThrowBrush(b, time, fromBike);
      return;
    }
    b.setVelocity(0, 0);
    const paintMs = fromBike ? 1700 : 2200;
    b.busy = time + paintMs;
    const cx = Phaser.Math.Clamp(b.x + b.facing * (fromBike ? 110 : 90), 60, W - 60);
    const cy = b.y;
    const easel = this.add.sprite(cx, cy, kikorBossTexKey('chevalet (1).png')).setOrigin(0.5, 1);
    easel.setDepth(Math.floor(cy) - 2);
    easel.setScale(b.scale * 0.95);
    easel.hp = KIKOR_CANVAS_HP;
    easel.hpMax = KIKOR_CANVAS_HP;
    easel._kkCanvas = true;
    easel._kkGen = kk.canvasGen;
    easel._kkCancelled = false;
    kk.canvases.push(easel);

    if (fromBike) {
      this._playKk(b, 'bk_kikor_velo_idle', true);
    } else {
      this._playKk(b, 'bk_kikor_peinture_prep', false);
    }
    const strokeAt = fromBike ? 280 : 400;
    const spawnAnimAt = fromBike ? 1000 : 1400;
    const spawnAt = fromBike ? 1500 : 2000;

    this._kkScheduleCanvas(easel, strokeAt, () => {
      if (!this._kkCanvasGenValid(easel) || !b.active) return;
      if (!fromBike) this._playKk(b, 'bk_kikor_coup_pinceau', false);
      if (this.anims.exists('bk_kikor_chevalet')) easel.anims.play('bk_kikor_chevalet', false);
    });
    this._kkScheduleCanvas(easel, spawnAnimAt, () => {
      if (!this._kkCanvasGenValid(easel)) return;
      if (this.anims.exists('bk_kikor_spawn')) easel.anims.play('bk_kikor_spawn', false);
    });
    this._kkScheduleCanvas(easel, spawnAt, () => {
      if (!this._kkCanvasGenValid(easel)) return;
      const idx = kk.canvases.indexOf(easel);
      if (idx >= 0) kk.canvases.splice(idx, 1);
      easel.destroy();
      if (!b.active || b.hp <= 0) return;
      const et = ENEMY_TYPES.kikor_e;
      const m = this.makeFighter(cx, cy, et.sheet, {
        hpMax: et.hp,
        speed: et.speed,
        type: 'kikor_e',
        scale: et.scale,
      });
      m.facing = -b.facing;
      m.setFlipX(m.facing < 0);
      this.enemies.add(m);
      this.spawnSpark(cx, cy - 50);
      this.sfx('hit', { vol: 0.65 });
      this._kkResumeIdle(b);
    });
  },

  _kkEnterPhase2(b, time) {
    const kk = this._kk;
    if (kk.bike || kk.phase === 'transition') return;
    kk.phase = 'transition';
    b.setVelocity(0, 0);
    b.busy = time + 2200;
    b.invuln = time + 2200;
    this._kkBumpCanvasGen();
    this.banner(kk.def.enrageBanner || 'KIKOR ROULE À TOUT VA !', null, COL.blood);
    this.flash(b, 0xff4444);
    this.shake(280, 0.01);

    for (const c of [...kk.canvases]) {
      this._kkDestroyCanvas(c, { fx: true, releaseBoss: false });
    }
    kk.canvases = [];

    this._playKk(b, 'bk_kikor_monte_velo', false);
    this.time.delayedCall(1600, () => {
      if (!b.active) return;
      kk.bike = true;
      kk.phase = 'fight';
      kk.atkIdx = -1;
      kk.nextAtk = this.time.now + 700;
      b.speedV = Math.round(b.speedV * 1.15);
      b.busy = this.time.now + 400;
      this._kkSnapBikePose(b);
    });
  },

  _kkBikeDrift(b, time) {
    const dir = b.facing;
    b.setVelocity(0, 0);
    b.busy = time + 900;
    this._playKk(b, 'bk_kikor_velo_derapage', false);
    this.sfx('special', { vol: 0.65 });
    if (CONFIG.shake) this.cameras.main.shake(100, 0.007);
    const startX = b.x;
    const endX = Phaser.Math.Clamp(startX + dir * 300, 40, W - 40);
    const startY = b.y;
    const smokeKey = kikorBossTexKey('fumée (1).png');
    this.tweens.add({
      targets: b,
      x: endX,
      duration: 420,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        if (!b.active) return;
        const p = this.nearestPlayerTo(b.x, b.y);
        if (p.hp > 0 && Math.abs(b.x - p.x) < 70 && Math.abs(b.y - p.y) < 50) {
          this.hurt(p, b.damage + 6, dir, b.x);
        }
        if (Math.random() < 0.35 && this.textures.exists(smokeKey)) {
          const puff = this.add.image(b.x - dir * 20, b.y - 8, smokeKey).setAlpha(0.7).setDepth(b.depth - 1);
          puff.setScale(b.scale * 0.5);
          this.tweens.add({ targets: puff, alpha: 0, scale: puff.scale * 1.4, duration: 400, onComplete: () => puff.destroy() });
        }
      },
      onComplete: () => {
        if (!b.active) return;
        b.y = startY;
        const tKey = KIKOR_TACHE_KEYS[Phaser.Math.Between(0, KIKOR_TACHE_KEYS.length - 1)];
        if (this.textures.exists(tKey)) {
          const stain = this.add.image(b.x, b.y - 4, tKey).setOrigin(0.5, 1).setDepth(Math.floor(b.y) - 3).setAlpha(0.85);
          stain.setScale(b.scale * 0.55);
          this.time.delayedCall(5000, () => stain.destroy());
        }
        this._playKk(b, 'bk_kikor_velo_idle', true);
      },
    });
  },

  kikorBossHurt(b, dmg) {
    if (!b?.active || b.state2 === 'hurt') return dmg;
    if ((b.busy || 0) > this.time.now && this._kk?.phase === 'transition') return 0;
    b.state2 = 'hurt';
    if (this._kk?.bike) {
      this.flash(b, 0xffffff);
      b.busy = this.time.now + 280;
    } else {
      this._playKk(b, 'bk_kikor_hurt', false);
      b.busy = this.time.now + 380;
    }
    return dmg;
  },

  kikorBossDie(b) {
    const kk = this._kk;
    const key = kk?.bike ? 'bk_kikor_velo_mort' : 'bk_kikor_mort';
    this._playKk(b, key, false);
    for (const c of kk?.canvases ?? []) {
      this._kkDestroyCanvas(c, { fx: false, releaseBoss: false });
    }
    if (kk) kk.canvases = [];
    this.floatText(b.x, b.y - 80, 'FINI !', COL.gold);
  },
};
