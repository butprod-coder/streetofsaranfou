import Phaser from 'phaser';
import { W, H, GUST } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';

/** Attaques spéciales animées (sprites sp_* + effets procéduraux). */
export const specialsMixin = {
  special(slot = 0) {
    const p = this.playerAt(slot);
    const c = this.cfgAt(slot);
    if (
      this.phase === 'intro' ||
      this._specialActive[slot] ||
      p.state2 === 'hurt' ||
      this.isPlayerStunned(p) ||
      p.hp <= c.specialCost + 5
    ) return;

    p.hp -= c.specialCost;
    this.updateHUD();
    this.sfx('special');

    const prev = { player: this.player, cfg: this.cfg, charKey: this.charKey };
    this.player = p;
    this.cfg = c;
    this.charKey = p.charKey;

    if (c.specialType === 'gun') {
      this._specialGustavax();
      this.player = prev.player;
      this.cfg = prev.cfg;
      this.charKey = prev.charKey;
      return;
    }

    const fn = {
      karonux: () => this.specialKaronux(),
      jualos: () => this.specialJualos(),
      yanu: () => this.specialYanu(),
      lorenzo: () => this.specialLorenzo(),
      jo: () => this.specialJo(),
      kikor: () => this.specialKikor(),
    }[p.charKey];

    if (fn) fn();
    else this._specialFallback();

    this.player = prev.player;
    this.cfg = prev.cfg;
    this.charKey = prev.charKey;
  },

  _specialGustavax() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    this.shake(120, 0.008);
    this.flash(p, 0xffffff);
    this.pose(p, GUST.gun);
    this.time.delayedCall(120, () => {
      if (p.active) this.spawnBullet(p.x + p.facing * 46, p.y - 46, p.facing, c.damage + 8, true, p.playerSlot ?? 0);
    });
    this.time.delayedCall(400, () => this._specialEnd(p));
  },

  _specialFallback() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    this.shake(160, 0.01);
    this.flash(p, 0xffffff);
    this.anim(p, 'jump', false);
    this.time.delayedCall(60, () => this.melee(p, 150, 95, c.damage + 12, true));
    this.time.delayedCall(500, () => this._specialEnd(p));
  },

  _specialStart(p) {
    const slot = p.playerSlot ?? 0;
    if (this._specialActive[slot]) return false;
    this._specialCancelPending();
    this._clearSpecialFx();
    this._specialActive[slot] = true;
    this._specialSprites = [];
    p.state2 = 'special';
    p.setVelocity(0, 0);
    return true;
  },

  _specialEnd(p) {
    const slot = p?.playerSlot ?? 0;
    this._specialCancelPending();
    if (!p || !p.scene) {
      this._specialActive[slot] = false;
      this._clearSpecialFx();
      return;
    }
    this._clearSpecialFx();
    this._specialActive[slot] = false;
    p.visible = true;
    p.setAlpha(1);
    if (p.usesFrameAnim) {
      p.state2 = 'idle';
      this.anim(p, 'idle');
    } else {
      p.setTexture(p.sheet);
      p.setScale(p.scaleBase);
      p.setFrame(0);
      p.state2 = 'idle';
      this.anim(p, 'idle');
    }
    this._syncFighterBody(p);
  },

  _specialCancelPending() {
    this._specialTimers?.forEach((t) => t?.remove?.());
    this._specialTimers = [];
    this._specialCalls?.forEach((c) => c?.remove?.());
    this._specialCalls = [];
  },

  _specialTrackCall(call) {
    if (!call) return call;
    if (!this._specialCalls) this._specialCalls = [];
    this._specialCalls.push(call);
    return call;
  },

  _specialTrackTimer(evt) {
    if (!evt) return evt;
    if (!this._specialTimers) this._specialTimers = [];
    this._specialTimers.push(evt);
    return evt;
  },

  _syncFighterBody(p) {
    if (p?.body) p.body.reset(p.x, p.y);
  },

  _safeDestroyFx(spr) {
    if (!spr?.scene) return;
    spr.setVisible(false);
    this.time.delayedCall(0, () => {
      try {
        if (spr?.active) spr.destroy();
      } catch (_) {}
    });
  },

  _clearSpecialFx() {
    const list = [...(this._specialSprites || [])];
    this._specialSprites = [];
    for (const s of list) {
      this._safeDestroyFx(s);
    }
  },

  _showFx(key, x, y, opts = {}) {
    if (!this.textures.exists(key)) return null;
    const spr = this.add.image(x, y, key);
    spr.setDepth(opts.depth ?? Math.floor(y) + 700);
    spr.setOrigin(opts.originX ?? 0.5, opts.originY ?? 1);
    if (opts.flipX) spr.setFlipX(true);
    if (opts.scale) spr.setScale(opts.scale);
    else if (opts.targetW) spr.setScale(opts.targetW / spr.width);
    else if (opts.targetH) spr.setScale(opts.targetH / spr.height);
    else spr.setScale(110 / spr.height);
    if (opts.alpha != null) spr.setAlpha(opts.alpha);
    if (opts.trackSpecial !== false) {
      if (!this._specialSprites) this._specialSprites = [];
      this._specialSprites.push(spr);
    }
    return spr;
  },

  _pulseAura(p, color, ms) {
    const ring = this.add.circle(p.x, p.y - 50, 18, color, 0.35).setDepth(p.depth + 2);
    this._specialSprites.push(ring);
    this.tweens.add({
      targets: ring,
      scaleX: 3.5,
      scaleY: 2.2,
      alpha: 0,
      duration: ms,
      onComplete: () => ring.destroy(),
    });
  },

  _screenFlash(color, _alpha, ms) {
    const c = Phaser.Display.Color.IntegerToRGB(color);
    this.cameras.main.flash(ms, c.r, c.g, c.b);
  },

  _hurtAllEnemies(dmg) {
    const px = this.player.x;
    this.enemies.getChildren().forEach((e) => {
      if (e && e.active && e.hp > 0) this.hurt(e, dmg, e.x < px ? -1 : 1, px);
    });
  },

  _hurtInRadius(cx, cy, rx, ry, dmg) {
    this.enemies.getChildren().forEach((e) => {
      if (!e || !e.active) return;
      const dx = e.x - cx;
      const dy = Math.abs(e.y - cy);
      if (Math.abs(dx) < rx && dy < ry) {
        this.hurt(e, dmg, Math.sign(dx) || this.player.facing, cx);
      }
    });
  },

  _afterimage(p, alpha = 0.45) {
    let g;
    if (p.usesFrameAnim && this.textures.exists(p.texture?.key)) {
      g = this.add.image(p.x, p.y, p.texture.key).setDepth(p.depth - 1);
      g.setFlipX(p.flipX).setAlpha(alpha).setTint(0xaaccff);
      g.setOrigin(p.originX, p.originY);
      g.setDisplaySize(p.displayWidth, p.displayHeight);
    } else if (this.textures.exists(p.sheet)) {
      g = this.add
        .image(p.x, p.y, p.sheet, p.frame?.index ?? 0)
        .setDepth(p.depth - 1);
      g.setScale(p.scaleX, p.scaleY).setFlipX(p.flipX).setAlpha(alpha).setTint(0xaaccff);
    } else {
      return;
    }
    this._specialSprites.push(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  },

  _kikorRollTrail(p, dir, intensity = 0.5, rollKey = null) {
    if (rollKey && this.textures.exists(rollKey)) {
      const ghost = this._showFx(rollKey, p.x, p.y, {
        targetH: (p.displayHeight || 72) + 4,
        depth: p.depth - 1,
        flipX: dir < 0,
        originY: 0.94,
        alpha: 0.15 + intensity * 0.35,
      });
      if (ghost) {
        this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
      }
    } else {
      this._afterimage(p, 0.15 + intensity * 0.35);
    }
    if (Math.random() < 0.35 + intensity * 0.4) {
      this.spawnSpark(
        p.x - dir * Phaser.Math.Between(8, 22),
        p.y - Phaser.Math.Between(22, 38)
      );
    }
    const dust = this.add
      .ellipse(p.x - dir * 10, p.y - 6, 14 + intensity * 10, 7, 0x99aabb, 0.25 + intensity * 0.15)
      .setDepth(p.depth - 2);
    this._specialSprites.push(dust);
    this.tweens.add({
      targets: dust,
      x: dust.x - dir * 20,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 0.5,
      duration: 160 + intensity * 80,
      onComplete: () => dust.destroy(),
    });
  },

  _lorenzoCigSpark(x, y) {
    const f = this.add.image(x, y - 6, 'spark')
      .setScale(0.4)
      .setTint(0xff6600)
      .setDepth(99989)
      .setAlpha(0.75);
    this._specialSprites.push(f);
    this.tweens.add({
      targets: f,
      alpha: 0,
      y: f.y - 14,
      duration: 200,
      onComplete: () => {
        if (f?.active) f.destroy();
      },
    });
  },

  _launchFlameCig(x, y, dir, dmg, delay = 0) {
    this._specialTrackCall(
      this.time.delayedCall(delay, () => {
        if (!this.sys?.isActive()) return;
        const tex = this.textures.exists('sp_lorenzo_cig3') ? 'sp_lorenzo_cig3' : 'sp_lorenzo_cig2';
        const cig = this.add.image(x, y - 42, tex).setDepth(99990).setScale(0.55);
        cig.setFlipX(dir < 0);
        this._specialSprites.push(cig);

        const endX = dir > 0 ? W + 36 : -36;
        let lastSpark = 0;
        let hit = false;

        this.tweens.add({
          targets: cig,
          x: endX,
          duration: 480,
          ease: 'Linear',
          onUpdate: () => {
            if (hit || !cig.active) return;
            const now = this.time.now;
            if (now - lastSpark > 130) {
              lastSpark = now;
              this._lorenzoCigSpark(cig.x, cig.y);
            }
            for (const e of this.enemies.getChildren()) {
              if (!e?.active || e.hp <= 0) continue;
              if (Math.abs(e.x - cig.x) < 34 && Math.abs(e.y - cig.y) < 40) {
                this.hurt(e, dmg, dir, cig.x);
                hit = true;
                cig.setVisible(false);
                return;
              }
            }
          },
          onComplete: () => {
            if (cig?.active) cig.destroy();
          },
        });
      })
    );
  },

  /** KARONUX — préparation, explosion sur place, s'endort. */
  specialKaronux() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    const dmg = c.damage + 28;
    const px = p.x;
    const py = p.y;
    const flip = p.facing < 0;

    p.visible = false;
    const prep = this._showFx('sp_karonux_1', px, py, {
      targetH: 88,
      flipX: flip,
      depth: Math.floor(py) + 55,
    });
    this._pulseAura(p, 0xff6600, 620);
    this.tweens.add({
      targets: prep || p,
      y: py - 4,
      duration: 280,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    });
    if (CONFIG.shake) this.cameras.main.shake(620, 0.003);

    this.time.delayedCall(620, () => {
      if (!p.active) return;
      if (prep) prep.destroy();

      // Explosion à l'emplacement de Karonux
      this._screenFlash(0xff4400, 0.4, 320);
      this.shake(420, 0.018);
      this.sfx('explosion', { vol: 1.1 });
      const explo = this._showFx('sp_karonux_explo', px, py - 38, {
        targetW: 260,
        originY: 0.62,
        flipX: flip,
        depth: Math.floor(py) + 80,
      });
      if (explo) {
        const s0 = explo.scale;
        this.tweens.add({ targets: explo, alpha: 0, scale: s0 * 1.2, duration: 520 });
      }
      this._hurtInRadius(px, py, 195, 115, dmg);
      this.spawnSpark(px, py - 52);

      this.time.delayedCall(280, () => {
        const smoke = this._showFx('sp_karonux_fumee', px, py - 22, {
          targetW: 200,
          originY: 0.55,
          depth: Math.floor(py) + 72,
          alpha: 0.85,
        });
        if (smoke) this.tweens.add({ targets: smoke, alpha: 0, duration: 800 });
      });

      this.time.delayedCall(720, () => {
        const sleep = this._showFx('sp_karonux_sleep', px, py, { targetH: 90, depth: Math.floor(py) + 50 });
        if (sleep) {
          this.tweens.add({ targets: sleep, y: py + 8, duration: 400, ease: 'Quad.easeIn' });
        }
        const zzz = this.add.text(px + 20, py - 70, 'Z z z', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#88ccff',
        }).setOrigin(0.5).setDepth(Math.floor(py) + 60);
        this._specialSprites.push(zzz);
        this.tweens.add({ targets: zzz, y: zzz.y - 12, alpha: 0.3, duration: 700, yoyo: true, repeat: 2 });

        this.time.delayedCall(1300, () => this._specialEnd(p));
      });
    });
  },

  /** JUALOS — cochon enragé, charge, retour humain. */
  specialJualos() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    const dir = p.facing;
    const startX = p.x;
    const endX = Phaser.Math.Clamp(startX + dir * 300, 40, W - 40);
    const dmg = c.damage + 14;
    const pigFlip = dir < 0;

    this.anim(p, 'attack', false);
    this.time.delayedCall(350, () => {
      if (!p.active) return;
      p.visible = false;
      const pig = this._showFx('sp_jualos_pig1', p.x, p.y, {
        targetH: 76,
        flipX: pigFlip,
        depth: Math.floor(p.y) + 50,
      });
      if (pig) pig.setTint(0xffaaaa);

      this.time.delayedCall(500, () => {
        if (!p.active) return;
        if (pig) pig.destroy();
        const charge = this._showFx('sp_jualos_pig2', p.x, p.y, {
          targetH: 80,
          flipX: pigFlip,
          depth: Math.floor(p.y) + 50,
        });
        this.shake(280, 0.012);

        this.tweens.add({
          targets: charge || p,
          x: endX,
          duration: 480,
          onUpdate: () => {
            const cx = charge ? charge.x : p.x;
            if (charge) p.x = charge.x;
            this._hurtInRadius(cx, p.y, 100, 70, dmg);
            this.spawnSpark(cx + dir * 30, p.y - 40);
          },
          onComplete: () => {
            if (p.active) p.x = endX;
          },
        });

        this.time.delayedCall(500, () => {
          if (charge) charge.destroy();
          if (p.active) p.x = endX;
          const impact = this._showFx('sp_jualos_pig3', endX, p.y, {
            targetH: 84,
            flipX: pigFlip,
            depth: Math.floor(p.y) + 55,
          });
          if (impact) {
            this._hurtInRadius(impact.x, p.y, 130, 80, dmg);
            const s0 = impact.scale;
            this.tweens.add({
              targets: impact,
              alpha: 0,
              scale: s0 * 1.2,
              duration: 400,
              onComplete: () => impact.destroy(),
            });
          }
          this.time.delayedCall(450, () => this._specialEnd(p));
        });
      });
    });
  },

  _launchYanuBuCry(p, dir) {
    const launchX = p.x + dir * 24;
    const launchY = p.y - 80;
    const bu = this.add
      .text(launchX, launchY, 'BUUUUUUUU', {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#d8b8ff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(Math.floor(p.y) + 68);
    this._specialSprites.push(bu);
    bu.setScale(0.35);
    this.tweens.add({
      targets: bu,
      scale: 1.12,
      duration: 200,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: bu,
      x: launchX + dir * 32,
      y: launchY - 210,
      duration: 1050,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: bu,
      alpha: 0,
      delay: 720,
      duration: 380,
    });
  },

  /** YANU — transformation puis rafale de griffes alternées. */
  specialYanu() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    const dir = p.facing;
    let wolf = null;

    this._launchYanuBuCry(p, dir);

    const showWolf = (key, targetH = 105) => {
      if (wolf) wolf.destroy();
      wolf = this._showFx(key, p.x, p.y, { targetH, depth: Math.floor(p.y) + 50, flipX: dir < 0 });
      return wolf;
    };

    const clawStrike = (key, targetH, dmgBonus, reachOffset = 0, aoe = false) => {
      showWolf(key, targetH);
      this.shake(85, 0.006);
      if (wolf) {
        this.tweens.add({
          targets: wolf,
          x: p.x + dir * (14 + reachOffset),
          duration: 65,
          yoyo: true,
        });
      }
      this.melee(
        { x: p.x + dir * reachOffset, y: p.y, facing: dir, isPlayer: true },
        102,
        72,
        c.damage + dmgBonus,
        aoe
      );
      this.spawnSpark(p.x + dir * (42 + reachOffset), p.y - 42);
    };

    p.visible = false;
    this._screenFlash(0x8844ff, 0.25, 300);
    showWolf('sp_yanu_wolf1', 95);

    this.time.delayedCall(380, () => {
      showWolf('sp_yanu_wolf2', 108);

      const claws = [
        { key: 'sp_yanu_wolf3', h: 112, dmg: 6, off: 0, aoe: true },
        { key: 'sp_yanu_wolf4', h: 110, dmg: 8, off: 10, aoe: false },
        { key: 'sp_yanu_wolf3', h: 112, dmg: 7, off: 4, aoe: true },
        { key: 'sp_yanu_wolf4', h: 110, dmg: 9, off: 14, aoe: false },
        { key: 'sp_yanu_wolf3', h: 115, dmg: 8, off: 6, aoe: true },
        { key: 'sp_yanu_wolf4', h: 112, dmg: 10, off: 18, aoe: false },
      ];

      let i = 0;
      const nextClaw = () => {
        if (!p.active || i >= claws.length) {
          if (wolf) wolf.destroy();
          this.shake(200, 0.01);
          this.time.delayedCall(320, () => this._specialEnd(p));
          return;
        }
        const cl = claws[i];
        clawStrike(cl.key, cl.h, cl.dmg, cl.off, cl.aoe);
        i++;
        this.time.delayedCall(210, nextClaw);
      };

      this.time.delayedCall(260, nextClaw);
    });
  },

  /** LORENZO — cigarettes enflammées en rafale. */
  specialLorenzo() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    const dir = p.facing;
    const dmg = c.damage + 6;

    p.visible = false;
    const cigLight = this._showFx('sp_lorenzo_cig1', p.x, p.y, {
      targetH: 112,
      depth: Math.floor(p.y) + 55,
      flipX: dir < 0,
    });

    this._specialTrackCall(
      this.time.delayedCall(280, () => {
        if (cigLight?.active) cigLight.destroy();
        if (!p.active) {
          this._specialEnd(p);
          return;
        }
        p.visible = true;
        this.anim(p, 'punch', false);
        this._launchFlameCig(p.x, p.y, dir, dmg, 0);
        this._launchFlameCig(p.x + dir * 10, p.y, dir, dmg, 120);
        this._launchFlameCig(p.x + dir * 20, p.y, dir, dmg, 240);
        this._specialTrackCall(this.time.delayedCall(620, () => this._specialEnd(p)));
      })
    );
  },

  _joTornadoPull(tx, ty, dir, dmg, pullR = 210, hurtR = 95) {
    this.enemies.getChildren().forEach((e) => {
      if (!e?.active) return;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const d = Math.hypot(dx, dy);
      if (d < pullR && d > 8) {
        e.x += dx * 0.13;
        e.y += dy * 0.07;
      }
      if (d < hurtR) this.hurt(e, dmg, Math.sign(dx) || dir, tx);
    });
  },

  /** JO — tourbillon qui charge en avant et aspire les ennemis. */
  specialJo() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    const dir = p.facing;
    const startX = p.x;
    const endX = Phaser.Math.Clamp(startX + dir * 380, 40, W - 40);
    const ty = p.y - 25;
    const dmg = c.damage + 6;
    const flip = dir < 0;
    let tornado = null;

    p.visible = false;
    const prep = this._showFx('sp_jo_tornado1', p.x, p.y, {
      targetH: 70,
      flipX: flip,
      depth: Math.floor(p.y) + 50,
    });

    this.time.delayedCall(280, () => {
      if (prep) prep.destroy();
      if (!p.active) return;

      tornado = this._showFx('sp_jo_tornado2', startX, ty, {
        targetH: 78,
        originY: 0.5,
        flipX: flip,
        depth: Math.floor(p.y) + 60,
      });
      this.shake(220, 0.008);

      const pullTimer = this.time.addEvent({
        delay: 90,
        loop: true,
        callback: () => {
          if (!tornado?.active) return;
          this._joTornadoPull(tornado.x, ty, dir, dmg);
          this.spawnSpark(
            tornado.x + Phaser.Math.Between(-28, 28),
            ty + Phaser.Math.Between(-18, 18)
          );
        },
      });

      this.tweens.add({
        targets: tornado || p,
        x: endX,
        duration: 320,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          const tx = tornado ? tornado.x : p.x;
          if (tornado) p.x = tornado.x;
          this._hurtInRadius(tx, ty, 70, 60, dmg);
        },
        onComplete: () => {
          if (p.active) p.x = endX;
        },
      });

      this.time.delayedCall(340, () => {
        pullTimer.remove();
        if (tornado) tornado.destroy();
        if (p.active) p.x = endX;
        const endFx = this._showFx('sp_jo_tornado3', endX, p.y, {
          targetH: 72,
          flipX: flip,
          depth: Math.floor(p.y) + 50,
        });
        if (endFx) {
          const endPull = this.time.addEvent({
            delay: 90,
            repeat: 3,
            callback: () => this._joTornadoPull(endX, ty, dir, c.damage + 10, 180, 110),
          });
          this.tweens.add({
            targets: endFx,
            alpha: 0,
            duration: 350,
            onComplete: () => {
              endPull.remove();
              endFx.destroy();
            },
          });
        }
        this.time.delayedCall(400, () => this._specialEnd(p));
      });
    });
  },

  /** KIKOR — roulade type Sonic : sprites sp_kikor_roll + traînée. */
  specialKikor() {
    const p = this.player;
    const c = this.cfg;
    if (!this._specialStart(p)) return;
    const dir = p.facing;
    const endX = Phaser.Math.Clamp(p.x + dir * 400, 30, W - 30);
    const rollFrames = [
      'sp_kikor_roll1',
      'sp_kikor_roll2',
      'sp_kikor_roll3',
      'sp_kikor_roll4',
      'sp_kikor_roll5',
    ].filter((k) => this.textures.exists(k));
    const hasRollFx = rollFrames.length > 0;
    let rollSpr = null;
    let frameIdx = 0;

    const rollH = () => (p.displayHeight || 72) + 6;

    const syncRoll = () => {
      if (rollSpr?.active) {
        rollSpr.x = p.x;
        rollSpr.y = p.y;
        rollSpr.setDepth(Math.floor(p.y) + 50);
      }
    };

    const showRoll = (boost = 0) => {
      if (!hasRollFx) {
        p.visible = true;
        p.setFlipX(dir < 0);
        this.anim(p, 'run', true);
        return null;
      }
      p.visible = false;
      if (rollSpr) rollSpr.destroy();
      const key = rollFrames[frameIdx % rollFrames.length];
      frameIdx++;
      rollSpr = this._showFx(key, p.x, p.y, {
        targetH: rollH() + boost * 5,
        depth: Math.floor(p.y) + 50,
        flipX: dir < 0,
        originY: 0.94,
      });
      return key;
    };

    showRoll(0);
    this._pulseAura(p, 0x88ddff, 300);
    this.shake(60, 0.003);

    const steps = [
      { dist: 6, delay: 120, boost: 0, hurt: false },
      { dist: 6, delay: 115, boost: 0, hurt: false },
      { dist: 8, delay: 110, boost: 0, hurt: false },
      { dist: 10, delay: 105, boost: 1, hurt: false },
      { dist: 22, delay: 85, boost: 1, hurt: true },
      { dist: 30, delay: 72, boost: 2, hurt: true },
      { dist: 38, delay: 58, boost: 2, hurt: true },
      { dist: 48, delay: 48, boost: 3, hurt: true },
      { dist: 58, delay: 38, boost: 3, hurt: true },
      { dist: 68, delay: 32, boost: 4, hurt: true },
    ];

    let si = 0;

    const finishRoll = () => {
      if (rollSpr) rollSpr.destroy();
      rollSpr = null;
      p.x = Phaser.Math.Clamp(p.x, 30, W - 30);
      this._syncFighterBody(p);
      this._hurtInRadius(p.x, p.y, 115, 82, c.damage + 12);
      this.shake(200, 0.012);
      this.spawnSpark(p.x + dir * 20, p.y - 40);
      this._pulseAura(p, 0xcceeff, 220);
      this.time.delayedCall(280, () => this._specialEnd(p));
    };

    const sonicBurst = () => {
      const remain = endX - p.x;
      if (Math.abs(remain) < 8) {
        finishRoll();
        return;
      }

      const burstMs = Phaser.Math.Clamp(200 - Math.abs(remain) * 0.04, 150, 240);
      let lastAfter = 0;

      const animTimer = this.time.addEvent({
        delay: 28,
        loop: true,
        callback: () => {
          const key = showRoll(5);
          this._kikorRollTrail(p, dir, 1, key);
        },
      });

      this.shake(220, 0.014);
      if (CONFIG.shake) this.cameras.main.shake(burstMs, 0.009);

      this.tweens.add({
        targets: p,
        x: endX,
        duration: burstMs,
        ease: 'Expo.easeIn',
        onUpdate: (tw) => {
          syncRoll();
          const t = tw.progress;
          const now = this.time.now;
          if (now - lastAfter > 28 - t * 14) {
            lastAfter = now;
            const trailKey = rollSpr?.texture?.key;
            this._kikorRollTrail(p, dir, 0.5 + t * 0.5, trailKey);
          }
          this._hurtInRadius(p.x, p.y, 88, 72, c.damage + 7);
          if (t > 0.45) this.spawnSpark(p.x - dir * 18, p.y - 32);
        },
        onComplete: () => {
          animTimer.remove();
          p.x = endX;
          syncRoll();
          this._syncFighterBody(p);
          finishRoll();
        },
      });
    };

    const runStep = () => {
      if (!p.active) return;
      if (si >= steps.length) {
        sonicBurst();
        return;
      }
      const s = steps[si];
      p.x = Phaser.Math.Clamp(p.x + dir * s.dist, 30, W - 30);
      this._syncFighterBody(p);
      showRoll(s.boost);
      syncRoll();
      const trailKey = rollSpr?.texture?.key;
      this._kikorRollTrail(p, dir, si / steps.length, trailKey);
      if (s.hurt) {
        this._hurtInRadius(p.x, p.y, 72, 64, c.damage + 4);
        this.spawnSpark(p.x, p.y - 35);
      }
      if (CONFIG.shake && s.hurt) this.cameras.main.shake(35, 0.002 + si * 0.0004);
      si++;
      this.time.delayedCall(s.delay, runStep);
    };

    this.time.delayedCall(60, runStep);
  },
};
