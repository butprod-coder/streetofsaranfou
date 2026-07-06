import Phaser from 'phaser';
import { W, FLOOR_TOP, FLOOR_BOTTOM, COL, F } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';
import { CHARLINGALS_BILL_FRAMES, CHARLINGALS_BILL_ANIM } from '../config/charlingalsBills.js';
import {
  TRISO_SPIT_ANIM,
  TRISO_SPIT_MS,
  TRISO_PUDDLE_EXTRA_MS,
  TRISO_SPIT_FRAMES,
} from '../config/trisoSlime.js';
import { PAPY_SMOKE_ANIM, PAPY_SMOKE_FRAMES } from '../config/papyJalaFx.js';
import { GUYLUX_CARD_KEY, GUYLUX_CARD_SCALE } from '../config/guyluxCards.js';

/** GameScene mixin — attaques spéciales des nouveaux ennemis. */
export const enemyAttacksMixin = {
  _enemyReturnIdle(e) {
    if (!e?.active) return;
    e.state2 = 'idle';
    this.anim(e, 'idle');
  },

  _enemyBusy(e, time) {
    return (
      e.state2 === 'hurt' ||
      e.state2 === 'ko' ||
      e.state2 === 'attack' ||
      e.state2 === 'special' ||
      (e.busy && time < e.busy)
    );
  },

  _enemyFaceTarget(e, dx) {
    e.facing = dx < 0 ? -1 : 1;
    e.setFlipX(e.facing < 0);
  },

  _enemyApproachStrike(e, time, p, dx, dy, d) {
    if (d > e.reach - 8) {
      const a = Math.atan2(dy, dx);
      e.setVelocity(Math.cos(a) * e.speedV, Math.sin(a) * e.speedV);
      this._enemyLocomote(e);
    } else {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') {
        this._enemyReturnIdle(e);
      }
      if (time > e.nextAttack) {
        e.nextAttack = time + e.attackCd;
        this.strike(e);
      }
    }
    this.clampBand(e);
  },

  stunPlayer(p, ms, label = 'ÉTOURDI !') {
    if (!p || !p.active || p.hp <= 0) return;
    const until = this.time.now + ms;
    p.stunnedUntil = Math.max(p.stunnedUntil || 0, until);
    p.setVelocity(0, 0);
    p.setTint(0xffaa88);
    this.floatText(p.x, p.y - 52, label, COL.grey);
    this.time.delayedCall(ms, () => {
      if (!p.active) return;
      if (this.time.now >= (p.stunnedUntil || 0)) {
        p.clearTint();
        if (CONFIG.god && p.isPlayer) p.setTint(0xffe066);
      }
    });
  },

  isPlayerStunned(p) {
    return p && (p.stunnedUntil || 0) > this.time.now;
  },

  _dismissComicBubble(speaker) {
    const bub = speaker?._comicBubbleActive;
    if (!bub) return;
    bub.follow?.remove();
    bub.fadeTimer?.remove();
    try { bub.label?.destroy(); } catch (_) {}
    try { bub.g?.destroy(); } catch (_) {}
    speaker._comicBubbleActive = null;
  },

  _comicBubble(speaker, text, duration = 2400, opts = {}) {
    if (!speaker?.active) return;
    this._dismissComicBubble(speaker);
    const yAbove = opts.yAbove ?? 98;
    const depthBoost = opts.depthBoost ?? 0;
    const x = speaker.x + speaker.facing * 18;
    const cy = speaker.y - yAbove;
    const depth = Math.floor(speaker.y) + 850 + depthBoost;

    const label = this.add
      .text(0, 0, text, F(0, { fontSize: '12px', fontStyle: 'bold', color: '#0a0712', align: 'center' }))
      .setOrigin(0.5, 0.5);
    const padX = 16;
    const padY = 10;
    const bw = label.width + padX * 2;
    const bh = label.height + padY * 2;

    const g = this.add.graphics().setDepth(depth);
    label.setDepth(depth + 1);

    const drawAt = (px, bodyCy) => {
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.lineStyle(3, 0x0a0712, 1);
      const left = px - bw / 2;
      const top = bodyCy - bh / 2;
      g.fillRoundedRect(left, top, bw, bh, 10);
      g.strokeRoundedRect(left, top, bw, bh, 10);
      const tailTipX = px + speaker.facing * 6;
      const tailBaseY = top + bh;
      g.fillTriangle(
        tailTipX,
        tailBaseY + 16,
        tailTipX - 11,
        tailBaseY,
        tailTipX + 11,
        tailBaseY
      );
      g.strokeTriangle(
        tailTipX,
        tailBaseY + 16,
        tailTipX - 11,
        tailBaseY,
        tailTipX + 11,
        tailBaseY
      );
    };

    label.setPosition(x, cy + 8);
    drawAt(x, cy);

    const follow = this.time.addEvent({
      delay: 40,
      repeat: Math.ceil(duration / 40),
      callback: () => {
        if (!speaker.active) {
          this._dismissComicBubble(speaker);
          return;
        }
        const nx = speaker.x + speaker.facing * 18;
        const ncy = speaker.y - yAbove;
        label.setPosition(nx, ncy);
        drawAt(nx, ncy);
      },
    });

    const fadeTimer = this.time.delayedCall(duration, () => {
      follow.remove();
      if (speaker._comicBubbleActive?.fadeTimer === fadeTimer) {
        speaker._comicBubbleActive = null;
      }
      this.tweens.add({
        targets: label,
        alpha: 0,
        duration: 280,
        onComplete: () => label.destroy(),
      });
      this.tweens.add({
        targets: g,
        alpha: 0,
        duration: 280,
        onComplete: () => g.destroy(),
      });
    });

    speaker._comicBubbleActive = { follow, label, g, fadeTimer };

    this.tweens.add({
      targets: label,
      y: cy,
      duration: 350,
      ease: 'Back.easeOut',
    });
  },

  enemyCharlingalsBills(e) {
    e.state2 = 'special';
    e.busy = this.time.now + 1500;
    this.anim(e, 'special', false);
    this.sfx('shoot', { vol: 0.35 });
    this._comicBubble(e, "Je t'achete\navec des faux billets !");

    const billTex = CHARLINGALS_BILL_FRAMES[0];
    const billCount = 5;
    const animKey = this.anims.exists(CHARLINGALS_BILL_ANIM) ? CHARLINGALS_BILL_ANIM : null;

    for (let i = 0; i < billCount; i++) {
      this.time.delayedCall(320 + i * 110, () => {
        if (!e.active) return;
        const ox = Phaser.Math.Between(-35, 35) + e.facing * (45 + i * 24);
        const bx = Phaser.Math.Clamp(e.x + ox, 48, W - 48);
        const startY = e.y - 92 - Phaser.Math.Between(0, 18);
        this._spawnCharlingalsBill(bx, startY, e.facing, i, billTex, animKey);
      });
    }

    this.time.delayedCall(1600, () => {
      if (e.active && e.state2 === 'special') this._enemyReturnIdle(e);
    });
  },

  _spawnCharlingalsBill(x, startY, facing, i, tex, animKey) {
    const bill = this.physics.add.sprite(x, startY, tex).setDepth(99980);
    bill.fromPlayer = false;
    bill.isBill = true;
    bill.dmg = 7;
    bill.born = this.time.now;
    bill.setFlipX(facing < 0);
    if (animKey) bill.play(animKey);
    bill.angle = Phaser.Math.Between(-8, 8);
    if (bill.body) {
      bill.body.setAllowGravity(false);
      bill.body.setSize(18, 12);
      bill.body.setOffset(4, 4);
    }

    const driftX = Phaser.Math.Clamp(x + Phaser.Math.Between(-28, 28) + facing * 18, 36, W - 36);
    const arcTop = startY - 42 - Math.random() * 28;

    this.tweens.add({
      targets: bill,
      y: arcTop,
      x: x + (driftX - x) * 0.35,
      duration: 450,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!bill.active) return;
        this.tweens.add({
          targets: bill,
          y: FLOOR_BOTTOM - 16,
          x: driftX,
          duration: 1050 + i * 60,
          ease: 'Sine.easeIn',
          onComplete: () => {
            if (bill.active) bill.destroy();
          },
        });
      },
    });

    this.tweens.add({
      targets: bill,
      angle: bill.angle + Phaser.Math.Between(14, 22),
      duration: 340,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.bullets.add(bill);
  },

  enemyOrelsanRacket(e) {
    e.state2 = 'special';
    e.busy = this.time.now + 720;
    this.anim(e, 'special', false);
    this.sfx('punch', { vol: 0.9 });
    this.time.delayedCall(320, () => {
      if (!e.active) return;
      if (CONFIG.shake) this.cameras.main.shake(100, 0.008);
      for (const p of this.activePlayers()) {
        if (!p.active || p.hp <= 0) continue;
        const dx = p.x - e.x;
        if (Math.sign(dx) === e.facing || Math.abs(dx) < 30) {
          if (Math.abs(dx) < 130 && Math.abs(p.y - e.y) < 58) {
            this.hurt(p, e.damage + 10, e.facing);
          }
        }
      }
      this.spawnSpark(e.x + e.facing * 90, e.y - 42);
    });
    this.time.delayedCall(750, () => {
      if (e.active && e.state2 === 'special') this._enemyReturnIdle(e);
    });
  },

  enemyOrelsanTennis(e) {
    e.state2 = 'special';
    e.busy = this.time.now + 680;
    this.anim(e, 'special', false);
    this.sfx('shoot', { vol: 0.45 });
    this.time.delayedCall(220, () => {
      if (!e.active) return;
      const p = this.nearestPlayerTo(e.x, e.y);
      const startX = e.x + e.facing * 58;
      const startY = e.y - 48;
      const b = this.add.image(startX, startY, 'sp_tennis').setDepth(99990);
      b.setScale(0.65);
      b.dmg = e.damage;
      b.fromPlayer = false;
      b.isTennis = true;
      b.born = this.time.now;
      b.tennisPhase = 'arc';
      b.tennisStartX = startX;
      b.tennisStartY = startY;
      b.tennisTargetX = p.x;
      b.tennisTargetY = p.y - 28;
      b.tennisArcT0 = this.time.now;
      b.tennisArcMs = 720;
      b.tennisPeak = 92;
      b.tennisVelX = Math.sign(p.x - startX || e.facing) * 300;
      b._tennisLast = this.time.now;
      this.bullets.add(b);
    });
    this.time.delayedCall(700, () => {
      if (e.active && e.state2 === 'special') this._enemyReturnIdle(e);
    });
  },

  /** Balle de tennis Orelsan : cloche fixe puis rebond en ligne droite (sans suivi). */
  _updateTennisBall(b, time) {
    const dt = Math.min(0.05, (time - (b._tennisLast ?? time)) / 1000 || 1 / 60);
    b._tennisLast = time;

    if (b.tennisPhase === 'arc') {
      const t = Phaser.Math.Clamp((time - b.tennisArcT0) / b.tennisArcMs, 0, 1);
      b.x = Phaser.Math.Linear(b.tennisStartX, b.tennisTargetX, t);
      const parabola = 4 * t * (1 - t);
      b.y = Phaser.Math.Linear(b.tennisStartY, b.tennisTargetY, t) - b.tennisPeak * parabola;
      b.setScale(0.62 + parabola * 0.12);
      if (t >= 1) {
        b.tennisPhase = 'roll';
        b.tennisGroundY = b.y;
        b.tennisBounceT0 = time;
        b.tennisBounceMs = 220;
        this.spawnSpark(b.x, b.y - 6);
        this.sfx('hit', { vol: 0.32 });
      }
      return;
    }

    if (b.tennisPhase === 'roll') {
      if (b.tennisBounceT0) {
        const t = Phaser.Math.Clamp((time - b.tennisBounceT0) / b.tennisBounceMs, 0, 1);
        b.y = b.tennisGroundY - 38 * Math.sin(Math.PI * t);
        b.x += b.tennisVelX * dt;
        if (t >= 1) {
          b.tennisBounceT0 = null;
          b.y = b.tennisGroundY;
          b.setScale(0.68);
        }
        return;
      }
      b.x += b.tennisVelX * dt;
      b.y = b.tennisGroundY;
    }
  },

  _trisoIsConfused(e, time = this.time.now) {
    return (e.trisoConfusedUntil || 0) > time;
  },

  _trisoPlayerBehind(e, p) {
    if (!p?.active) return false;
    const margin = 20;
    return e.facing > 0 ? p.x > e.x + margin : p.x < e.x - margin;
  },

  _trisoStartConfused(e, time) {
    if (this._trisoIsConfused(e, time)) return;
    this._stopTrisoSpit(e);
    e.trisoConfusedUntil = time + 5000;
    e.trisoConfusedFacing = e.trisoSpitFacing ?? e.facing;
    e.trisoSpitFacing = null;
    e.trisoSlimeActive = 0;
    e.trisoStillSince = 0;
    e.busy = time + 5000;
    e.setVelocity(0, 0);
    e.setVisible(true);
    e.state2 = 'idle';
    e.setTint(0xcccccc);
    this.anim(e, 'idle');
    this._comicBubble(e, 'Triso ?', 4800);
  },

  _trisoEndConfused(e, time) {
    e.trisoConfusedUntil = 0;
    e.trisoConfusedFacing = null;
    e.trisoSpitFacing = null;
    e.busy = 0;
    e.clearTint();
    if (e.baseTint && e.baseTint !== 0xffffff) e.setTint(e.baseTint);
    const p = this.nearestPlayerTo(e.x, e.y);
    this._enemyFaceTarget(e, p.x - e.x);
    e.nextAttack = time + 500;
    this.enemyTrisoSlime(e);
  },

  _hitTrisoFromBehind(t, fromX) {
    if (t.type2 !== 'triso') return true;
    if (this._trisoIsConfused(t)) return true;
    return t.facing > 0 ? fromX < t.x - 14 : fromX > t.x + 14;
  },

  _trisoBlockFeedback(t) {
    this.floatText(t.x, t.y - 55, 'TROP DUR !', COL.grey);
    this.flash(t, 0xdddddd);
    this.spawnSpark(t.x, t.y - 42);
  },

  _spawnPapySmoke(x, y, depth, opts = {}) {
    const tex = PAPY_SMOKE_FRAMES[0];
    if (!this.textures.exists(tex)) return null;
    const s = this.add.sprite(x, y - 18, tex).setDepth(depth + 6).setOrigin(0.5, 0.72);
    const h = opts.targetH ?? 72;
    s.setScale(h / s.height);
    if (opts.tint) s.setTint(opts.tint);
    if (opts.alpha != null) s.setAlpha(opts.alpha);
    if (this.anims.exists(PAPY_SMOKE_ANIM)) s.play(PAPY_SMOKE_ANIM);
    if (opts.fadeMs) {
      this.tweens.add({
        targets: s,
        alpha: 0,
        scale: s.scale * 1.25,
        duration: opts.fadeMs,
        onComplete: () => s.destroy(),
      });
    }
    return s;
  },

  enemyPapySmokeTeleport(e) {
    const now = this.time.now;
    e.state2 = 'special';
    e.busy = now + 1500;
    e.setVelocity(0, 0);
    this.anim(e, 'special', false);
    this.sfx('shoot', { vol: 0.35 });

    this._spawnPapySmoke(e.x, e.y, e.depth, { fadeMs: 900 });

    this.time.delayedCall(380, () => {
      if (!e.active) return;
      e.setAlpha(0);
      const p = this.nearestPlayerTo(e.x, e.y);
      const side = p.x < e.x ? 1 : -1;
      const destX = Phaser.Math.Clamp(
        p.x + side * Phaser.Math.Between(95, 155),
        48,
        W - 48
      );
      const destY = Phaser.Math.Clamp(
        p.y + Phaser.Math.Between(-35, 35),
        FLOOR_TOP + 28,
        FLOOR_BOTTOM - 8
      );
      e.setPosition(destX, destY);
      e.facing = p.x < destX ? -1 : 1;
      e.setFlipX(e.facing < 0);
      e.setDepth(Math.floor(destY));
      this._spawnPapySmoke(destX, destY, e.depth, { fadeMs: 700 });
    });

    this.time.delayedCall(720, () => {
      if (e.active) {
        e.setAlpha(1);
        this._enemyReturnIdle(e);
      }
    });
  },

  enemyPapyPepper(e) {
    e.state2 = 'special';
    e.busy = this.time.now + 950;
    this.anim(e, 'special', false);
    this.sfx('shoot', { vol: 0.4 });
    this.time.delayedCall(260, () => {
      if (!e.active) return;
      const p = this.nearestPlayerTo(e.x, e.y);
      const tex = PAPY_SMOKE_FRAMES[0];
      const cloud = this.physics.add.sprite(e.x + e.facing * 38, e.y - 36, tex).setDepth(99985);
      cloud.setScale(58 / cloud.height);
      cloud.setTint(0xffaa55);
      cloud.setAlpha(0.88);
      if (this.anims.exists(PAPY_SMOKE_ANIM)) cloud.play(PAPY_SMOKE_ANIM);
      cloud.fromPlayer = false;
      cloud.isPepper = true;
      cloud.dmg = 4;
      cloud.born = this.time.now;
      cloud.targetX = p.x;
      cloud.targetY = p.y - 18;
      if (cloud.body) cloud.body.setAllowGravity(false);
      this.tweens.add({
        targets: cloud,
        x: cloud.targetX,
        y: cloud.targetY,
        duration: 650,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!cloud.active) return;
          this.tweens.add({
            targets: cloud,
            alpha: 0,
            scale: cloud.scale * 1.35,
            duration: 450,
            onComplete: () => cloud.destroy(),
          });
        },
      });
      this.bullets.add(cloud);
    });
    this.time.delayedCall(1000, () => {
      if (e.active && e.state2 === 'special') this._enemyReturnIdle(e);
    });
  },

  enemyRemyScooter(e) {
    e.state2 = 'special';
    e.busy = this.time.now + 780;
    this.anim(e, 'special', false);
    e.setVelocity(0, 0);
    this.flash(e, 0xffdd66);
    this.sfx('shoot', { vol: 0.5 });
    this.time.delayedCall(200, () => {
      if (!e.active) return;
      const dir = e.facing;
      this.tweens.add({
        targets: e,
        x: Phaser.Math.Clamp(e.x + dir * 300, 30, W - 30),
        duration: 420,
        onUpdate: () => {
          for (const p of this.activePlayers()) {
            if (!p.active || p.hp <= 0) continue;
            if (Math.abs(e.x - p.x) < 88 && Math.abs(e.y - p.y) < 52) {
              this.hurt(p, e.damage + 6, dir, e.x, null, { knockdown: true });
            }
          }
        },
      });
    });
    this.time.delayedCall(800, () => {
      if (e.active && e.state2 === 'special') this._enemyReturnIdle(e);
    });
  },

  _stopTrisoSpit(e) {
    if (e._trisoFollowEvt) {
      e._trisoFollowEvt.remove();
      e._trisoFollowEvt = null;
    }
    if (e.trisoSpitFx) {
      e.trisoSpitFx.destroy();
      e.trisoSpitFx = null;
    }
    if (e.active) e.setVisible(true);
  },

  enemyTrisoSlime(e) {
    const now = this.time.now;
    this._stopTrisoSpit(e);

    e.state2 = 'special';
    e.busy = now + TRISO_SPIT_MS + 300;
    e.trisoSlimeActive = now + TRISO_SPIT_MS + 600;
    e.trisoSpitFacing = e.facing;
    e.setVelocity(0, 0);
    e.setVisible(false);
    this.anim(e, 'idle');

    const tex = TRISO_SPIT_FRAMES[0];
    if (!this.textures.exists(tex)) return;

    const fx = this.add.sprite(e.x, e.y, tex);
    fx.setOrigin(0.18, 0.92);
    fx.setFlipX(e.facing < 0);
    const targetH = 98;
    fx.setScale(targetH / fx.height);
    fx.setDepth(e.depth + 4);
    if (this.anims.exists(TRISO_SPIT_ANIM)) fx.play(TRISO_SPIT_ANIM);
    e.trisoSpitFx = fx;

    e._trisoFollowEvt = this.time.addEvent({
      delay: 32,
      loop: true,
      callback: () => {
        if (!e.active || !fx.active) return;
        fx.setPosition(e.x + e.facing * 6, e.y);
        fx.setDepth(e.depth + 4);
      },
    });

    this.sfx('shoot', { vol: 0.38 });

    const puddleX = e.x + e.facing * 92;
    this.time.delayedCall(280, () => {
      if (!e.active) return;
      this.spawnSlimePuddle(puddleX, e.y, e.facing, TRISO_SPIT_MS + TRISO_PUDDLE_EXTRA_MS);
    });

    this.time.delayedCall(TRISO_SPIT_MS, () => {
      this._stopTrisoSpit(e);
      if (e.active) {
        e.setVisible(true);
        e.state2 = 'idle';
        this.anim(e, 'idle');
      }
    });
  },

  spawnSlimePuddle(x, y, facing = 1, life = 9000) {
    if (!this.hazards) this.hazards = this.add.group();
    const s = this.add
      .image(x, y, 'sp_slime')
      .setOrigin(0.5, 0.88)
      .setDepth(Math.floor(y) + 2)
      .setAlpha(0.82)
      .setScale(0.35, 0.3);
    s.born = this.time.now;
    s.life = life;
    s.nextTick = 0;
    s.isSlime = true;
    s.slimeW = 74;
    s.slimeH = 26;
    const growX = facing < 0 ? -1.3 : 1.3;
    this.tweens.add({
      targets: s,
      scaleX: growX,
      scaleY: 1.12,
      duration: TRISO_SPIT_MS - 200,
      ease: 'Quad.easeOut',
    });
    this.hazards.add(s);
  },

  enemyGuyluxCards(e) {
    e.state2 = 'special';
    e.busy = this.time.now + 820;
    this.anim(e, 'special', false);
    this.sfx('shoot', { vol: 0.45 });
    const tex = this.textures.exists(GUYLUX_CARD_KEY) ? GUYLUX_CARD_KEY : 'sp_card';
    const cardScale = tex === GUYLUX_CARD_KEY ? GUYLUX_CARD_SCALE : 0.85;
    this.time.delayedCall(240, () => {
      if (!e.active) return;
      for (let i = -1; i <= 1; i++) {
        const ang = i * 0.22;
        const spd = 420;
        const vx = Math.cos(ang) * e.facing * spd;
        const vy = Math.sin(ang) * spd * 0.35;
        const card = this.physics.add
          .image(e.x + e.facing * 50, e.y - 44, tex)
          .setDepth(99988)
          .setScale(cardScale);
        card.fromPlayer = false;
        card.isCard = true;
        card.dmg = e.damage + 2;
        card.born = this.time.now;
        card.vx = vx;
        card.vy = vy;
        card.setFlipX(e.facing < 0);
        if (card.body) {
          card.body.setAllowGravity(false);
          card.body.setVelocity(vx, vy);
          const fw = card.width;
          const fh = card.height;
          const bw = tex === GUYLUX_CARD_KEY ? 30 : 22;
          const bh = tex === GUYLUX_CARD_KEY ? 40 : 30;
          card.body.setSize(bw, bh);
          card.body.setOffset((fw - bw) / 2, (fh - bh) / 2);
        }
        this.tweens.add({
          targets: card,
          angle: card.angle + (e.facing > 0 ? 420 : -420),
          duration: 700,
          repeat: -1,
        });
        this.bullets.add(card);
      }
    });
    this.time.delayedCall(850, () => {
      if (e.active && e.state2 === 'special') this._enemyReturnIdle(e);
    });
  },

  updateHazards(time) {
    if (this.hazards?.getChildren) {
      this.hazards.getChildren().forEach((h) => {
        if (!h || !h.active) return;
        if (time - h.born > h.life) {
          this.tweens.add({
            targets: h,
            alpha: 0,
            scale: 0.5,
            duration: 350,
            onComplete: () => h.destroy(),
          });
          h.born = time - h.life - 9999;
          return;
        }
        if (time > h.nextTick) {
          for (const p of this.activePlayers()) {
            if (p.hp <= 0 || !p.active) continue;
            const airborneSafe = p.airborne && (p.jumpZ ?? 0) >= 12;
            if (airborneSafe) continue;
            const w = h.slimeW ?? 42;
            const hh = h.slimeH ?? 28;
            if (Math.abs(p.x - h.x) < w && Math.abs(p.y - h.y) < hh) {
              h.nextTick = time + 500;
              this.hurt(p, 5, p.x < h.x ? -1 : 1);
              break;
            }
          }
        }
      });
    }
  },

  charlingalsAI(e, time) {
    if (this._enemyBusy(e, time)) {
      this.clampBand(e);
      return;
    }
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    this._enemyFaceTarget(e, dx);
    if (time > e.nextAttack && adx > 100 && adx < 360 && Math.random() < 0.2) {
      e.nextAttack = time + e.attackCd * 2.6;
      e.setVelocity(0, 0);
      this.enemyCharlingalsBills(e);
      this.clampBand(e);
      return;
    }
    this._enemyApproachStrike(e, time, p, dx, dy, d);
  },

  orelsanAI(e, time) {
    if (this._enemyBusy(e, time)) {
      this.clampBand(e);
      return;
    }
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    this._enemyFaceTarget(e, dx);
    if (time > e.nextAttack && adx >= 150 && adx < 460 && Math.random() < 0.4) {
      e.nextAttack = time + e.attackCd * 1.4;
      e.setVelocity(0, 0);
      this.enemyOrelsanTennis(e);
      this.clampBand(e);
      return;
    }
    if (time > e.nextAttack && adx < 115 && Math.random() < 0.45) {
      e.nextAttack = time + e.attackCd * 1.2;
      e.setVelocity(0, 0);
      this.enemyOrelsanRacket(e);
      this.clampBand(e);
      return;
    }
    this._enemyApproachStrike(e, time, p, dx, dy, d);
  },

  papyJalaAI(e, time) {
    if (this._enemyBusy(e, time)) {
      this.clampBand(e);
      return;
    }
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    this._enemyFaceTarget(e, dx);
    if (time > e.nextAttack && adx > 130 && adx < 400 && Math.random() < 0.2) {
      e.nextAttack = time + e.attackCd * 3;
      e.setVelocity(0, 0);
      this.enemyPapySmokeTeleport(e);
      this.clampBand(e);
      return;
    }
    if (time > e.nextAttack && adx > 80 && adx < 280 && Math.random() < 0.17) {
      e.nextAttack = time + e.attackCd * 2.5;
      e.setVelocity(0, 0);
      this.enemyPapyPepper(e);
      this.clampBand(e);
      return;
    }
    this._enemyApproachStrike(e, time, p, dx, dy, d);
  },

  remyAI(e, time) {
    if (this._enemyBusy(e, time)) {
      this.clampBand(e);
      return;
    }
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    this._enemyFaceTarget(e, dx);
    if (time > e.nextAttack && adx > 50 && adx < 320 && Math.random() < 0.42) {
      e.nextAttack = time + e.attackCd * 1.5;
      this.enemyRemyScooter(e);
      this.clampBand(e);
      return;
    }
    this._enemyApproachStrike(e, time, p, dx, dy, d);
  },

  trisoAI(e, time) {
    const p = this.nearestPlayerTo(e.x, e.y);

    if (this._trisoIsConfused(e, time)) {
      e.facing = e.trisoConfusedFacing ?? e.facing;
      e.setFlipX(e.facing < 0);
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') {
        e.state2 = 'idle';
        this.anim(e, 'idle');
      }
      if (time >= e.trisoConfusedUntil) {
        this._trisoEndConfused(e, time);
      }
      this.clampBand(e);
      return;
    }

    const rooted = (e.trisoSlimeActive || 0) > time;
    if (rooted) {
      if (e.trisoSpitFacing != null) {
        e.facing = e.trisoSpitFacing;
        e.setFlipX(e.facing < 0);
      }
      if (this._trisoPlayerBehind(e, p)) {
        this._trisoStartConfused(e, time);
        this.clampBand(e);
        return;
      }
      e.setVelocity(0, 0);
      this.clampBand(e);
      return;
    }

    if (this._enemyBusy(e, time)) {
      this.clampBand(e);
      return;
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    this._enemyFaceTarget(e, dx);

    const spitDist = 120;
    const spitMin = 52;
    const aligned = Math.abs(dy) < 58;

    if (aligned && adx <= spitDist && adx >= spitMin) {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') this._enemyReturnIdle(e);
      if (time > e.nextAttack) {
        e.nextAttack = time + e.attackCd * 2.4;
        this.enemyTrisoSlime(e);
        this.clampBand(e);
        return;
      }
    } else if (aligned && adx > spitDist) {
      e.trisoStillSince = 0;
      const a = Math.atan2(dy, dx);
      e.setVelocity(Math.cos(a) * e.speedV, Math.sin(a) * e.speedV);
      this._enemyLocomote(e);
    } else if (d > e.reach - 8) {
      e.trisoStillSince = 0;
      const a = Math.atan2(dy, dx);
      e.setVelocity(Math.cos(a) * e.speedV, Math.sin(a) * e.speedV);
      this._enemyLocomote(e);
    } else {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') {
        e.state2 = 'idle';
        this.anim(e, 'idle');
      }
      if (time > e.nextAttack) {
        e.nextAttack = time + e.attackCd;
        this.strike(e);
      }
    }
    this.clampBand(e);
  },

  guyluxAI(e, time) {
    if (this._enemyBusy(e, time)) {
      this.clampBand(e);
      return;
    }
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    this._enemyFaceTarget(e, dx);
    if (time > e.nextAttack && adx > 50 && adx < 420 && Math.random() < 0.38) {
      e.nextAttack = time + e.attackCd * 1.4;
      e.setVelocity(0, 0);
      this.enemyGuyluxCards(e);
      this.clampBand(e);
      return;
    }
    this._enemyApproachStrike(e, time, p, dx, dy, d);
  },
};
