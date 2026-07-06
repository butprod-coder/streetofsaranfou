import Phaser from 'phaser';
import { W, FLOOR_TOP, FLOOR_BOTTOM, COL, GUST } from '../config/gameConfig.js';
import { ENEMY_TYPES } from '../config/enemies.js';
import { CONFIG } from '../config/difficulty.js';

/** IA des boss (persos jouables + Gustavax). */
export const bossAIMixin = {
  bossCombatAI(b, time) {
    const kind = b.bossCustom || b.bossDef?.custom || 'lorenzo';
    switch (kind) {
      case 'gustavax': this.gustAI(b, time); break;
      case 'karonux_boss':
        this.updateKaronuxBoss(time);
        break;
      case 'karonux': this.karonuxBossAI(b, time); break;
      case 'jualos': this.jualosBossAI(b, time); break;
      case 'yanu': this.yanuBossAI(b, time); break;
      case 'lorenzo': this.lorenzoBossAI(b, time); break;
      case 'jo': this.joBossAI(b, time); break;
      case 'kikor': this.kikorBossAI(b, time); break;
      default: this.lorenzoBossAI(b, time);
    }
  },

  _bossTryEnrage(b, time, reinforcements) {
    if (b.enraged || b.hp > b.hpMax * (b.bossDef.enrageAt || 0.5)) return false;
    b.enraged = true;
    b.speedV *= 1.22;
    b.attackCd = Math.max(320, b.attackCd * 0.72);
    this.flash(b, 0xff0000);
    this.shake(300, 0.01);
    if (reinforcements) {
      reinforcements.forEach((k, i) => {
        const m = this.makeFighter(
          i ? W + 40 : -40, FLOOR_BOTTOM - 15, ENEMY_TYPES[k].sheet,
          { hpMax: ENEMY_TYPES[k].hp, speed: ENEMY_TYPES[k].speed, type: k, scale: ENEMY_TYPES[k].scale }
        );
        this.enemies.add(m);
      });
    }
    const banner = b.bossDef.enrageBanner || `${b.bossDef.name} !`;
    this.banner(banner, null, COL.blood);
    b.busy = time + 850;
    return true;
  },

  _bossApproach(b, time, attackFn) {
    const p = this.nearestPlayerTo(b.x, b.y);
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy);
    b.facing = dx < 0 ? -1 : 1;
    b.setFlipX(b.facing < 0);
    if (d > b.reach) {
      const a = Math.atan2(dy, dx);
      const vx = Math.cos(a) * b.speedV;
      const vy = Math.sin(a) * b.speedV;
      b.setVelocity(vx, vy);
      b.state2 = 'walk';
      this.locomoteAnim(b, vx, vy);
    } else {
      b.setVelocity(0, 0);
      if (time > b.nextAttack) {
        b.nextAttack = time + b.attackCd;
        attackFn();
      }
    }
    this.clampBand(b);
  },

  _hurtPlayersInRadius(cx, cy, rx, ry, dmg) {
    for (const p of this.activePlayers()) {
      if (!p.active || p.hp <= 0) continue;
      const dx = p.x - cx;
      const dy = Math.abs(p.y - cy);
      if (Math.abs(dx) < rx && dy < ry) {
        this.hurt(p, dmg, Math.sign(dx) || 1);
      }
    }
  },

  /** KARONUX — phase 1 : combat + charges ; phase 2 : explosion puis sommeil (regen). */
  karonuxBossAI(b, time) {
    if (b.karonuxNapping) return;
    if (time < (b.busy || 0)) return;

    if (!b.karonuxPhase2 && b.hp <= b.hpMax * 0.5) {
      this.karonuxEnterPhase2(b, time);
      return;
    }

    if (b.karonuxPhase2) {
      this.karonuxPhase2AI(b, time);
      return;
    }

    this.karonuxPhase1AI(b, time);
  },

  karonuxPhase1AI(b, time) {
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + 2400;
      if (Math.random() < 0.5) this.karonuxCharge(b, time);
      else this._bossApproach(b, time, () => this.strike(b));
      return;
    }
    this._bossApproach(b, time, () => this.strike(b));
  },

  karonuxPhase2AI(b, time) {
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + 7000;
      this.karonuxPhase2Cycle(b, time);
      return;
    }
    if (time > (b.bossMiniTimer || 0)) {
      b.bossMiniTimer = time + 2800;
      if (Math.random() < 0.45) this.karonuxCharge(b, time, true);
    }
    this._bossApproach(b, time, () => this.strike(b));
  },

  karonuxEnterPhase2(b, time) {
    b.karonuxPhase2 = true;
    b.enraged = true;
    b.speedV = Math.round(b.speedV * 1.12);
    const banner = b.bossDef.enrageBanner || 'KARONUX EXPLOSE !';
    this.banner(banner, null, COL.blood);
    b.busy = time + 1100;
    this.time.delayedCall(1100, () => {
      if (b.active) this.karonuxPhase2Cycle(b, this.time.now);
    });
  },

  karonuxPhase2Cycle(b, time) {
    this.karonuxExplosion(b, time, true, () => {
      if (b.active) this.karonuxNap(b, this.time.now);
    });
  },

  karonuxCharge(b, time, strong = false) {
    const dir = b.facing;
    b.state2 = 'walk';
    this.anim(b, b.usesFrameAnim ? 'run' : 'walk');
    b.busy = time + (strong ? 720 : 620);
    this.flash(b, 0xffcc66);
    if (CONFIG.shake) this.cameras.main.shake(100, 0.007);
    const dist = strong ? 500 : 360;
    this.tweens.add({
      targets: b,
      x: b.x + dir * dist,
      duration: strong ? 460 : 380,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        const p = this.nearestPlayerTo(b.x, b.y);
        if (p.hp > 0 && Math.abs(b.x - p.x) < 78 && Math.abs(b.y - p.y) < 58) {
          this.hurt(p, b.damage + (strong ? 8 : 4), dir);
        }
      },
      onComplete: () => {
        if (b.active) {
          b.state2 = 'idle';
          this.anim(b, 'idle');
        }
      },
    });
  },

  karonuxNap(b, time) {
    b.karonuxNapping = true;
    b.setVelocity(0, 0);
    b.state2 = 'idle';
    b.setVisible(false);
    b.setTint(0x88aaff);
    b.busy = time + 10000;
    b.karonuxNapEnd = time + 10000;
    b.karonuxNapStartHp = b.hp;

    let sleepFx = null;
    if (this.textures.exists('sp_karonux_sleep')) {
      sleepFx = this._showFx('sp_karonux_sleep', b.x, b.y, { targetH: 90, depth: b.depth + 4 });
      if (sleepFx) this.tweens.add({ targets: sleepFx, y: b.y + 6, duration: 500, ease: 'Quad.easeIn' });
    }
    const zzz = this.add
      .text(b.x + 24, b.y - 72, 'Z z z', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#88ccff',
      })
      .setOrigin(0.5)
      .setDepth(b.depth + 5);
    this.tweens.add({ targets: zzz, y: zzz.y - 10, alpha: 0.35, duration: 800, yoyo: true, repeat: -1 });
    b.karonuxSleepFx = sleepFx;
    b.karonuxZzz = zzz;

    const regenTotal = Math.round(b.hpMax * 0.45);
    const ticks = 20;
    let regenDone = 0;
    b._karonuxRegenEvt = this.time.addEvent({
      delay: 500,
      repeat: ticks - 1,
      callback: () => {
        if (!b.active || !b.karonuxNapping) return;
        const add = Math.round(regenTotal / ticks);
        b.hp = Math.min(b.hpMax, b.hp + add);
        regenDone += add;
        this.updateHUD();
      },
    });

    this.time.delayedCall(10000, () => {
      if (b.active && b.karonuxNapping) this.karonuxWakeFromNap(b, this.time.now, true);
    });
  },

  karonuxWakeFromNap(b, time, finished = false) {
    if (!b.karonuxNapping) return;
    b.karonuxNapping = false;
    b.busy = time + 400;
    if (b._karonuxRegenEvt) {
      b._karonuxRegenEvt.remove();
      b._karonuxRegenEvt = null;
    }
    if (b.karonuxSleepFx) {
      b.karonuxSleepFx.destroy();
      b.karonuxSleepFx = null;
    }
    if (b.karonuxZzz) {
      b.karonuxZzz.destroy();
      b.karonuxZzz = null;
    }
    b.setVisible(true);
    b.clearTint();
    if (b.baseTint) b.setTint(b.baseTint);
    b.state2 = 'idle';
    this.anim(b, 'idle');
    if (!finished) {
      this.floatText(b.x, b.y - 55, 'RÉVEILLÉ !', COL.cyan);
      this.flash(b, 0xffffff);
    }
    b.bossTimer = time + 3500;
  },

  karonuxExplosion(b, time, phase2 = false, onDone) {
    b.setVelocity(0, 0);
    b.state2 = 'attack';
    this.anim(b, 'attack', false);
    b.busy = time + (phase2 ? 1100 : 900);
    this.flash(b, 0xffaa44);

    const rx = phase2 ? 215 : 130;
    const ry = phase2 ? 105 : 85;
    const dmg = b.damage + (phase2 ? 16 : 6);

    const ring = this.add
      .circle(b.x, b.y - 35, 18, 0xff6600, 0)
      .setStrokeStyle(4, 0xffaa44)
      .setDepth(b.depth - 1);
    this.tweens.add({
      targets: ring,
      radius: rx,
      alpha: { from: 0.85, to: 0 },
      duration: 480,
      onComplete: () => ring.destroy(),
    });

    this.time.delayedCall(480, () => {
      if (!b.active) return;
      this._screenFlash(0xff6600, phase2 ? 0.42 : 0.35, phase2 ? 400 : 350);
      this.shake(phase2 ? 400 : 260, phase2 ? 0.016 : 0.014);
      this.sfx('explosion', { vol: phase2 ? 1 : 0.85 });
      this._hurtPlayersInRadius(b.x, b.y - 10, rx, ry, dmg);
      this.spawnSpark(b.x + b.facing * 40, b.y - 50);
      if (this.textures.exists('sp_karonux_explo')) {
        const fx = this._showFx('sp_karonux_explo', b.x + b.facing * 30, b.y - 40, {
          targetW: phase2 ? 220 : 140,
          originY: 0.5,
          depth: b.depth + 5,
        });
        if (fx) this.tweens.add({ targets: fx, alpha: 0, duration: 520, onComplete: () => fx.destroy() });
      }
      if (phase2 && this.textures.exists('sp_karonux_fumee')) {
        const smoke = this._showFx('sp_karonux_fumee', b.x, b.y - 22, {
          targetW: 200,
          originY: 0.55,
          depth: b.depth + 3,
          alpha: 0.85,
        });
        if (smoke) this.tweens.add({ targets: smoke, alpha: 0, duration: 900 });
      }
    });

    this.time.delayedCall(phase2 ? 1100 : 900, () => {
      if (b.active && b.state2 === 'attack') {
        b.state2 = 'idle';
        this.anim(b, 'idle');
      }
      if (onDone) onDone();
    });
  },

  /** JUALOS — charge dévastatrice type cochon enragé. */
  jualosBossAI(b, time) {
    if (time < (b.busy || 0)) return;
    if (this._bossTryEnrage(b, time, ['heavy', 'grunt'])) return;
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + (b.enraged ? 1400 : 2200);
      this.jualosCharge(b, time, b.enraged);
      return;
    }
    this._bossApproach(b, time, () => this.jualosCharge(b, time, false));
  },

  _cancelJualosCharge(b) {
    if (!b) return;
    b._jualosChargeTween?.stop?.();
    b._jualosChargeTween = null;
    b._jualosChainCharge?.remove?.();
    b._jualosChainCharge = null;
  },

  jualosCharge(b, time, strong) {
    if (!b?.active || b.hp <= 0) return;
    this._cancelJualosCharge(b);

    const dir = b.facing;
    b.state2 = 'walk';
    this.anim(b, b.usesFrameAnim ? 'run' : 'walk');
    b.setTint(0xffaaaa);
    b.busy = time + (strong ? 620 : 520);
    this.flash(b, 0xff6688);
    if (CONFIG.shake) this.cameras.main.shake(120, 0.008);
    const dist = strong ? 620 : 480;
    let hitOnce = false;
    b._jualosChargeTween = this.tweens.add({
      targets: b,
      x: Phaser.Math.Clamp(b.x + dir * dist, 48, W - 48),
      duration: strong ? 520 : 420,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        if (hitOnce) return;
        const p = this.nearestPlayerTo(b.x, b.y);
        if (p.hp > 0 && Math.abs(b.x - p.x) < 85 && Math.abs(b.y - p.y) < 62) {
          hitOnce = true;
          this.hurt(p, b.damage + (strong ? 10 : 4), dir);
        }
      },
      onComplete: () => {
        if (!b.active) return;
        b._jualosChargeTween = null;
        b.clearTint();
        if (b.baseTint) b.setTint(b.baseTint);
        if (strong && b.enraged && b.hp > 0) {
          b._jualosChainCharge = this.time.delayedCall(280, () => {
            b._jualosChainCharge = null;
            if (b.active && b.hp > 0 && this.phase === 'boss') {
              this.jualosCharge(b, this.time.now, false);
            }
          });
        }
      },
    });
  },

  /** YANU — combos rapides + rugissement. */
  yanuBossAI(b, time) {
    if (time < (b.busy || 0)) return;
    if (this._bossTryEnrage(b, time, ['runner', 'runner'])) return;
    const dist = Math.abs(this.nearestPlayerTo(b.x, b.y).x - b.x);
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + (b.enraged ? 1200 : 1800);
      if (dist < 100) this.yanuFrenzy(b, time);
      else this.yanuRoar(b, time);
      return;
    }
    this._bossApproach(b, time, () => this.yanuFrenzy(b, time));
  },

  yanuFrenzy(b, time) {
    b.setVelocity(0, 0);
    b.state2 = 'attack';
    this.anim(b, 'attack', false);
    b.busy = time + 520;
    const hits = b.enraged ? 5 : 3;
    for (let i = 0; i < hits; i++) {
      this.time.delayedCall(80 + i * 90, () => {
        if (!b.active) return;
        this.melee(b, 95, 72, b.damage - 2, true);
        this.spawnSpark(b.x + b.facing * (30 + i * 8), b.y - 42);
      });
    }
  },

  yanuRoar(b, time) {
    b.setVelocity(0, 0);
    b.state2 = 'attack';
    this.pose(b, 0);
    b.busy = time + 720;
    b.setTint(0xaa66ff);
    this.shake(280, 0.012);
    const ring = this.add.circle(b.x, b.y - 40, 12, 0x8844ff, 0).setStrokeStyle(4, 0xcc88ff).setDepth(b.depth - 1);
    this.tweens.add({ targets: ring, radius: 150, alpha: { from: 0.85, to: 0 }, duration: 400, onComplete: () => ring.destroy() });
    this.time.delayedCall(200, () => {
      if (!b.active) return;
      this._hurtInRadius(b.x, b.y - 20, 130, 80, b.damage + 6);
      b.clearTint();
      if (b.baseTint) b.setTint(b.baseTint);
    });
  },

  /** LORENZO — clopes, charge, coups. */
  lorenzoBossAI(b, time) {
    if (time < (b.busy || 0)) return;
    if (this._bossTryEnrage(b, time, ['grunt', 'runner'])) return;
    const p = this.nearestPlayerTo(b.x, b.y);
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const dist = Math.abs(dx);
    b.facing = dx < 0 ? -1 : 1;
    b.setFlipX(b.facing < 0);
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + (b.enraged ? 1700 : 2400);
      if (dist < 110) this.lorenzoPunch(b, time);
      else {
        const pick = Math.random() < 0.55 ? 'cigare' : 'charge';
        if (pick === 'charge') this.lorenzoCharge(b, time);
        else this.lorenzoCigare(b, time);
      }
      return;
    }
    const d = Math.hypot(dx, dy);
    if (d > b.reach) {
      const a = Math.atan2(dy, dx);
      const vx = Math.cos(a) * b.speedV;
      const vy = Math.sin(a) * b.speedV;
      b.setVelocity(vx, vy);
      b.state2 = 'walk';
      this.locomoteAnim(b, vx, vy);
    } else {
      b.setVelocity(0, 0);
      if (time > b.nextAttack) { b.nextAttack = time + b.attackCd; this.lorenzoPunch(b, time); }
    }
    this.clampBand(b);
  },

  lorenzoCharge(b, time) {
    const dir = b.facing;
    this.flash(b, 0xffdd55);
    b.state2 = 'walk';
    this.anim(b, 'walk');
    b.busy = time + 700;
    this.time.delayedCall(380, () => {
      if (!b.active) return;
      this.tweens.add({
        targets: b, x: b.x + dir * 560, duration: 480,
        onUpdate: () => {
          const p = this.nearestPlayerTo(b.x, b.y);
          if (Math.abs(b.x - p.x) < 70 && Math.abs(p.y - b.y) < 60) this.hurt(p, b.damage, dir);
        },
      });
    });
  },

  lorenzoPunch(b, time) {
    b.setVelocity(0, 0);
    b.state2 = 'attack';
    this.anim(b, 'attack', false);
    b.busy = time + 500;
    this.time.delayedCall(220, () => {
      const p = this.nearestPlayerTo(b.x, b.y);
      if (!b.active || p.hp <= 0) return;
      if (Math.abs(p.x - b.x) < b.reach + 10 && Math.abs(p.y - b.y) < 52) this.hurt(p, b.damage, p.x < b.x ? -1 : 1);
    });
  },

  lorenzoCigare(b, time) {
    const dir = b.facing;
    b.state2 = 'attack';
    this.anim(b, 'attack', false);
    b.busy = time + 800;
    this.flash(b, 0xffaa33);
    this.time.delayedCall(260, () => {
      if (!b.active) return;
      const tgt = this.nearestPlayerTo(b.x, b.y);
      const tx = Phaser.Math.Clamp(tgt.x, 80, W - 80);
      const ty = tgt.y;
      const cig = this.add.image(b.x + dir * 40, b.y - 70, 'cigare').setDepth(99970);
      this.tweens.add({
        targets: cig, x: tx, y: ty - 6, duration: 560, ease: 'Quad.easeIn', angle: dir * 200,
        onComplete: () => { cig.destroy(); this.spawnFire(tx, ty); },
      });
    });
  },

  /** JO — tourbillon qui aspire et frappe. */
  joBossAI(b, time) {
    if (time < (b.busy || 0)) return;
    if (this._bossTryEnrage(b, time, ['runner', 'heavy'])) return;
    const dist = Math.abs(this.nearestPlayerTo(b.x, b.y).x - b.x);
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + (b.enraged ? 1300 : 2000);
      if (dist < 130) this.joSpin(b, time);
      else this._bossApproach(b, time, () => this.joSpin(b, time));
      return;
    }
    this._bossApproach(b, time, () => this.strike(b));
  },

  joSpin(b, time) {
    b.setVelocity(0, 0);
    b.state2 = 'attack';
    this.anim(b, 'attack', false);
    b.busy = time + 1400;
    let tornado = null;
    if (this.textures.exists('sp_jo_tornado2')) {
      tornado = this._showFx('sp_jo_tornado2', b.x, b.y - 30, { targetH: 100, originY: 0.5, depth: b.depth + 3 });
      if (tornado) this.tweens.add({ targets: tornado, angle: 360, duration: 600, repeat: 2 });
    }
    const pullTimer = this.time.addEvent({
      delay: 130,
      repeat: 9,
      callback: () => {
        const tx = tornado ? tornado.x : b.x;
        const ty = tornado ? tornado.y : b.y - 20;
        const p = this.nearestPlayerTo(b.x, b.y);
        if (p.hp > 0) {
          const dx = tx - p.x;
          const dy = ty - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 180 && d > 6) { p.x += dx * 0.1; p.y += dy * 0.05; }
          if (d < 95) this.hurt(p, b.damage + 3, Math.sign(dx) || b.facing);
        }
        this.spawnSpark(tx + Phaser.Math.Between(-25, 25), ty + Phaser.Math.Between(-15, 15));
      },
    });
    this.time.delayedCall(1400, () => {
      pullTimer.remove();
      if (tornado) tornado.destroy();
      if (b.active) { b.state2 = 'idle'; this.anim(b, 'idle'); }
    });
  },

  /** KIKOR — roulades et skateboard. */
  kikorBossAI(b, time) {
    if (time < (b.busy || 0)) return;
    if (this._bossTryEnrage(b, time, ['kikor_e', 'runner'])) return;
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + (b.enraged ? 1100 : 1900);
      this.kikorBossRoll(b, time);
      if (b.enraged) this.time.delayedCall(500, () => { if (b.active) this.kikorSkate(b); });
      return;
    }
    this._bossApproach(b, time, () => this.kikorBossRoll(b, time));
  },

  kikorBossRoll(b, time) {
    const dir = b.facing;
    b.state2 = 'jump';
    this.anim(b, 'jump', false);
    b.busy = time + 650;
    this._afterimage(b, 0.4);
    if (CONFIG.shake) this.cameras.main.shake(80, 0.006);
    this.tweens.add({
      targets: b, x: b.x + dir * (b.enraged ? 340 : 260), duration: 380, ease: 'Quad.easeIn',
      onUpdate: () => {
        const p = this.nearestPlayerTo(b.x, b.y);
        if (p.hp > 0 && Math.abs(b.x - p.x) < 75 && Math.abs(b.y - p.y) < 55) {
          this.hurt(p, b.damage + 4, dir);
        }
      },
    });
  },

  gustAI(b, time) {
    const p = this.nearestPlayerTo(b.x, b.y);
    if (!b.enraged && b.hp <= b.hpMax * 0.5) {
      if (this._bossTryEnrage(b, time, ['heavy', 'runner'])) {
        b.setVelocity(0, 0);
        this.pose(b, GUST.enrage);
        b.state2 = 'attack';
        this.flash(b, 0xff2020);
        this.shake(320, 0.012);
        return;
      }
    }
    if (time < (b.busy || 0) || b.state2 === 'hurt') return;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const dist = Math.abs(dx);
    b.facing = dx < 0 ? -1 : 1;
    b.setFlipX(b.facing < 0);
    if (time > (b.bossTimer || 0)) {
      b.bossTimer = time + (b.enraged ? 1500 : 2200);
      if (dist < 155) this.gustShock(b, time);
      else if (dist < 440) this.gustGun(b, time);
      else this.gustRifle(b, time);
      return;
    }
    const d = Math.hypot(dx, dy);
    if (d > b.reach) {
      const a = Math.atan2(dy, dx);
      const vx = Math.cos(a) * b.speedV;
      const vy = Math.sin(a) * b.speedV;
      b.setVelocity(vx, vy);
      b.state2 = 'walk';
      this.locomoteAnim(b, vx, vy);
    } else {
      b.setVelocity(0, 0);
      if (time > b.nextAttack) { b.nextAttack = time + b.attackCd; this.strike(b); }
    }
    this.clampBand(b);
  },

  gustShock(b, time) {
    b.setVelocity(0, 0);
    this.pose(b, GUST.shock);
    b.state2 = 'attack';
    b.busy = time + 720;
    this.shake(260, 0.013);
    const ring = this.add.circle(b.x, b.y, 10, 0xffaa33, 0).setStrokeStyle(4, 0xffcf4d).setDepth(b.depth - 1);
    this.tweens.add({ targets: ring, radius: 170, alpha: { from: 0.9, to: 0 }, duration: 420, onComplete: () => ring.destroy() });
    this.time.delayedCall(180, () => {
      if (b.active) {
        for (const p of this.activePlayers()) {
          if (Math.abs(p.x - b.x) < 155 && Math.abs(p.y - b.y) < 80) {
            this.hurt(p, b.damage + 8, p.x < b.x ? -1 : 1);
          }
        }
      }
    });
    this.time.delayedCall(720, () => { if (b.active && b.state2 === 'attack') { b.state2 = 'idle'; this.anim(b, 'idle'); } });
  },

  gustGun(b, time) {
    b.setVelocity(0, 0);
    this.pose(b, GUST.gun);
    b.state2 = 'attack';
    b.busy = time + 520;
    this.flash(b, 0xffffff);
    this.time.delayedCall(160, () => { if (b.active) this.spawnBullet(b.x + b.facing * 64, b.y - 48, b.facing, b.damage, false); });
    this.time.delayedCall(520, () => { if (b.active && b.state2 === 'attack') { b.state2 = 'idle'; this.anim(b, 'idle'); } });
  },

  gustRifle(b, time) {
    b.setVelocity(0, 0);
    this.pose(b, GUST.rifle);
    b.state2 = 'attack';
    b.busy = time + 820;
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(140 + i * 160, () => { if (b.active) this.spawnBullet(b.x + b.facing * 70, b.y - 50, b.facing, b.damage - 5, false); });
    }
    this.time.delayedCall(820, () => { if (b.active && b.state2 === 'attack') { b.state2 = 'idle'; this.anim(b, 'idle'); } });
  },
};
