import Phaser from 'phaser';
import { W, COL } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';
import { WEAPON_KEYS, POLICE_ITEM, WEAPONS } from '../config/weapons.js';
import { FRAME_ANIM_CHARS, hasAttackCombo, hasFrameClip } from '../config/frameAnims.js';
import { dbgLog, showCrash } from '../debug/crashOverlay.js';

/** GameScene mixin: combat.js */
export const combatMixin = {
  /** Gel d'impact : fige physique/anims/tweens/horloge quelques ms pour donner du poids aux coups. */
  hitStop(ms = 45) {
    if (this.phase === 'pause' || this.phase === 'win' || this.phase === 'over') return;
    if (this._hitStopUntil) return;
    this._hitStopUntil = this.game.loop.time + ms;
    try {
      this.physics.world.pause();
    } catch (_) {}
    this.anims.pauseAll();
    this.tweens.pauseAll();
    this.time.paused = true;
  },

  /** Appelé en tête d'update : true tant que le gel est actif. */
  _hitStopTick() {
    if (!this._hitStopUntil) return false;
    if (this.game.loop.time < this._hitStopUntil) return true;
    this._hitStopUntil = 0;
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;
    if (this.phase !== 'pause' && this.phase !== 'win' && this.phase !== 'over') {
      try {
        this.physics.world.resume();
      } catch (_) {}
    }
    return false;
  },

  /* ---- Chaîne de combo (coups au but sans être touché) ---- */

  _chainAt(slot) {
    if (!this._chain) this._chain = [{ n: 0, last: 0 }, { n: 0, last: 0 }];
    return this._chain[slot] ?? null;
  },

  _registerComboHit(slot) {
    const c = this._chainAt(slot);
    if (!c) return;
    c.n++;
    c.last = this.time.now;
    this._updateComboHud?.(slot, c.n);
  },

  /** Fin de chaîne : payout=true (timeout) verse le bonus, payout=false (joueur touché) le perd. */
  _breakComboChain(slot, payout) {
    const c = this._chainAt(slot);
    if (!c || !c.n) return;
    const n = c.n;
    c.n = 0;
    const p = this.playerAt(slot);
    if (n >= 4) {
      if (payout) {
        const bonus = n * 15;
        this.score += bonus;
        if (p?.active) this.floatText(p.x, p.y - 78, 'COMBO x' + n + '  +' + bonus, COL.gold);
      } else if (p?.active) {
        this.floatText(p.x, p.y - 78, 'COMBO BRISÉ !', COL.grey);
      }
    }
    this._updateComboHud?.(slot, 0);
    this.updateHUD();
  },

  _tickComboChains() {
    if (!this._chain) return;
    for (let s = 0; s < this._chain.length; s++) {
      const c = this._chain[s];
      if (c.n && this.time.now - c.last > 2200) this._breakComboChain(s, true);
    }
  },

  _lastAttackAt(slot) {
    return slot === 0 ? this.lastAttack : this.lastAttack2;
  },

  _setLastAttackAt(slot, v) {
    if (slot === 0) this.lastAttack = v;
    else this.lastAttack2 = v;
  },

  _comboAt(slot) {
    return slot === 0 ? this.combo : this.combo2;
  },

  _setComboAt(slot, v) {
    if (slot === 0) this.combo = v;
    else this.combo2 = v;
  },

  _lastComboTAt(slot) {
    return slot === 0 ? this.lastComboT : this.lastComboT2;
  },

  _setLastComboTAt(slot, v) {
    if (slot === 0) this.lastComboT = v;
    else this.lastComboT2 = v;
  },

  attack(slot = 0) {
    const p = this.playerAt(slot);
    if (!p) return;
    if (p.airborne) {
      this.airKick(slot);
      return;
    }
    if (p.weapon?.swing) {
      this._swingAttack(slot);
      return;
    }
    const frameKey = p.frameSheet ?? p.sheet;
    if (hasAttackCombo(frameKey)) {
      this._comboAttack(slot, false);
      return;
    }
    this._attackClassic(slot);
  },

  _comboAttack(slot, chain = false) {
    const p = this.playerAt(slot);
    const cfg = this.cfgAt(slot);
    const now = this.time.now;
    const fa = FRAME_ANIM_CHARS[p.frameSheet ?? p.sheet];
    const window = fa.comboWindow ?? 700;
    const punches = fa.comboHits ?? 2;
    const wpn = p.weapon;

    if (!p || p.airborne) return;
    if (wpn && wpn.type === 'gun') {
      this._attackClassic(slot);
      return;
    }

    if (!chain) {
      if (
        this.phase === 'intro' ||
        this._specialActive[slot] ||
        now < this._lastAttackAt(slot) ||
        p.state2 === 'hurt' ||
        this.isPlayerStunned(p) ||
        p.hp <= 0
      ) return;
      if (p.state2 === 'attack') {
        const step = p._comboStep ?? 1;
        if (now - this._lastComboTAt(slot) < window && step <= punches) p._comboQueued = true;
        return;
      }
    }

    let step;
    if (chain) {
      step = ((p._comboStep ?? 0) % (punches + 1)) + 1;
    } else if (now - this._lastComboTAt(slot) < window && p._comboStep) {
      step = ((p._comboStep ?? 0) % (punches + 1)) + 1;
    } else {
      step = 1;
    }
    p._comboStep = step;

    const isKick = step > punches;
    const animName = isKick ? 'kick' : 'punch';
    const cd = isKick ? (fa.kickCd ?? 300) : (fa.punchCd ?? 170);

    this._setLastAttackAt(slot, now + cd);
    this._setLastComboTAt(slot, now);
    this._setComboAt(slot, step);
    this.sfx('punch', { vol: isKick ? 1 : 0.85 });

    p.state2 = 'attack';
    p._lastHitKnockback = isKick ? (fa.kickKnockback ?? 32) : 16;
    if (isKick) p._comboQueued = false;
    this.anim(p, animName, false);

    const lunge = isKick ? 24 : 16;
    this.tweens.add({ targets: p, x: p.x + p.facing * lunge, duration: isKick ? 110 : 85, yoyo: true });

    const rng = cfg.range + (isKick ? (fa.kickRangeBonus ?? 12) : 0) + (wpn ? wpn.reach : 0);
    const bnd = cfg.band + (isKick ? 8 : 0) + (wpn ? 6 : 0);
    const dmg = cfg.damage + (isKick ? (fa.kickDamageBonus ?? 8) : 0) + (wpn ? wpn.dmg : 0);
    const hitDelay = isKick ? 115 : 68;

    if (wpn) {
      this.spawnSpark(p.x + p.facing * (rng * 0.7), p.y - 40);
      wpn.uses--;
      this.updateWeaponHUD(slot);
      if (wpn.uses <= 0) {
        p.weapon = null;
        this.time.delayedCall(120, () => {
          if (this.sys && this.sys.isActive()) {
            this.updateWeaponHUD(slot);
            this.syncWeaponVisual(p);
          }
        });
      }
    }

    this.time.delayedCall(hitDelay, () => {
      if (p.active) this.melee(p, rng, bnd, dmg);
    });
  },

  _attackClassic(slot = 0) {
    const p = this.playerAt(slot);
    const cfg = this.cfgAt(slot);
    const now = this.time.now;
    if (!p || p.airborne) return;
    if (
      this.phase === 'intro' ||
      this._specialActive[slot] ||
      now < this._lastAttackAt(slot) ||
      p.state2 === 'hurt' ||
      this.isPlayerStunned(p) ||
      p.hp <= 0
    ) return;
    const wpn = p.weapon;
    if (wpn && wpn.type === 'gun') {
      this._setLastAttackAt(slot, now + Math.max(240, cfg.attackCd * 0.8));
      p.state2 = 'attack';
      this.anim(p, 'attack', false);
      const nb = wpn.bullets || 1;
      for (let i = 0; i < nb; i++) {
        this.time.delayedCall(i * 70, () => {
          if (p.active) {
            const mz = this._weaponMuzzle(p);
            this.spawnBullet(mz.x, mz.y, p.facing, wpn.dmg, true, slot);
          }
        });
      }
      if (CONFIG.shake) this.cameras.main.shake(60, 0.004);
      this.sfx('shoot');
      wpn.uses--;
      this.updateWeaponHUD(slot);
      if (wpn.uses <= 0) {
        p.weapon = null;
        this.time.delayedCall(140, () => {
          if (this.sys && this.sys.isActive()) {
            this.updateWeaponHUD(slot);
            this.syncWeaponVisual(p);
          }
        });
      }
      this.time.delayedCall(260, () => {
        if (p.state2 === 'attack') p.state2 = 'idle';
      });
      return;
    }
    this._setLastAttackAt(slot, now + cfg.attackCd);
    this.sfx('punch', { vol: 0.85 });
    const prevComboT = this._lastComboTAt(slot);
    const combo = now - prevComboT < 700 ? Math.min(this._comboAt(slot) + 1, 3) : 1;
    this._setComboAt(slot, combo);
    this._setLastComboTAt(slot, now);
    p.state2 = 'attack';
    this.anim(p, 'attack', false);
    const rng = cfg.range + (wpn ? wpn.reach : 0);
    const bnd = cfg.band + (wpn ? 6 : 0);
    const dmg = cfg.damage + (combo === 3 ? 6 : 0) + (wpn ? wpn.dmg : 0);
    this.tweens.add({ targets: p, x: p.x + p.facing * 18, duration: 90, yoyo: true });
    if (wpn) {
      this.spawnSpark(p.x + p.facing * (rng * 0.7), p.y - 40);
      wpn.uses--;
      this.updateWeaponHUD(slot);
      if (wpn.uses <= 0) {
        p.weapon = null;
        this.time.delayedCall(120, () => {
          if (this.sys && this.sys.isActive()) {
            this.updateWeaponHUD(slot);
            this.syncWeaponVisual(p);
          }
        });
      }
    }
    this.time.delayedCall(90, () => this.melee(p, rng, bnd, dmg));
    this.time.delayedCall(260, () => {
      if (p.state2 === 'attack') p.state2 = 'idle';
    });
  },

  _swingAttack(slot = 0) {
    const p = this.playerAt(slot);
    const cfg = this.cfgAt(slot);
    const now = this.time.now;
    const wpn = p.weapon;
    if (!p || p.airborne || !wpn?.swing) return;
    if (
      this.phase === 'intro' ||
      this._specialActive[slot] ||
      now < this._lastAttackAt(slot) ||
      p.state2 === 'hurt' ||
      this.isPlayerStunned(p) ||
      p.hp <= 0
    ) return;

    this._setLastAttackAt(slot, now + Math.max(320, cfg.attackCd * 0.85));
    this.sfx('punch', { vol: 1.05 });
    p.state2 = 'attack';
    this.anim(p, 'attack', false);

    const rng = cfg.range + wpn.reach;
    const bnd = cfg.band + 14;
    const dmg = cfg.damage + wpn.dmg + 4;

    this.syncWeaponVisual(p);
    if (p.weaponSpr) {
      this.tweens.killTweensOf(p.weaponSpr);
      const f = p.facing;
      p.weaponSpr.setAngle(f * -85);
      this.tweens.add({
        targets: p.weaponSpr,
        angle: f * 55,
        duration: 150,
        ease: 'Quad.easeOut',
        onComplete: () => this.syncWeaponVisual(p),
      });
    }

    this.tweens.add({ targets: p, x: p.x + p.facing * 30, duration: 130, yoyo: true });
    this.spawnSpark(p.x + p.facing * (rng * 0.55), p.y - 44);

    wpn.uses--;
    this.updateWeaponHUD(slot);
    if (wpn.uses <= 0) {
      p.weapon = null;
      this.time.delayedCall(140, () => {
        if (this.sys?.isActive()) {
          this.updateWeaponHUD(slot);
          this.syncWeaponVisual(p);
        }
      });
    }

    this.time.delayedCall(115, () => {
      if (p.active) this.melee(p, rng, bnd, dmg);
    });
    this.time.delayedCall(280, () => {
      if (p.state2 === 'attack') p.state2 = 'idle';
    });
  },

  _weaponMuzzle(p) {
    if (p.weaponSpr?.visible) {
      return { x: p.weaponSpr.x + p.facing * 14, y: p.weaponSpr.y };
    }
    return { x: p.x + p.facing * 34, y: p.y - 36 };
  },

  _targetBodyY(feetY, airborne, jumpZ = 0) {
    const z = airborne ? jumpZ : 0;
    return feetY - z - 34;
  },

  _bulletHitsTarget(b, prevX, tx, feetY, opts = {}) {
    const hitW = opts.hitW ?? 30;
    const hitH = opts.hitH ?? 52;
    const bodyY = this._targetBodyY(feetY, opts.airborne, opts.jumpZ);
    const segMin = Math.min(prevX, b.x) - hitW;
    const segMax = Math.max(prevX, b.x) + hitW;
    if (tx < segMin || tx > segMax) return false;
    return Math.abs(tx - b.x) <= hitW && Math.abs(bodyY - b.y) <= hitH;
  },

  syncWeaponVisual(p) {
    if (!p?.active) return;
    if (!p.weapon) {
      if (p.weaponSpr?.active) p.weaponSpr.setVisible(false);
      return;
    }
    const def = WEAPONS[p.weapon.kind];
    if (!def) return;

    if (!p.weaponSpr || !p.weaponSpr.active) {
      p.weaponSpr = this.add.image(p.x, p.y, def.tex).setOrigin(0.5, 0.5);
    }
    p.weaponSpr.setTexture(def.tex);
    p.weaponSpr.setVisible(true);

    const f = p.facing;
    const isGun = def.type === 'gun';
    const ox = f * (isGun ? 24 : 20);
    const oy = (isGun ? -40 : -36) - (p.jumpZ || 0);
    p.weaponSpr.setPosition(p.x + ox, p.y + oy);
    p.weaponSpr.setFlipX(f < 0);

    if (isGun) {
      p.weaponSpr.setAngle(f < 0 ? 178 : 2);
      p.weaponSpr.setScale(0.58);
    } else if (def.swing) {
      p.weaponSpr.setAngle(f * 35);
      p.weaponSpr.setScale(0.68);
    } else {
      p.weaponSpr.setAngle(f * -30);
      p.weaponSpr.setScale(0.62);
    }
    p.weaponSpr.setDepth(Math.floor(p.y) + (p.airborne ? 502 : 3));
  },

  syncAllWeaponVisuals() {
    for (const p of this.allPlayers()) {
      if (p?.active) this.syncWeaponVisual(p);
    }
  },

  clearWeaponVisual(p) {
    if (p?.weaponSpr) {
      try {
        this.tweens.killTweensOf(p.weaponSpr);
        p.weaponSpr.destroy();
      } catch (_) {}
      p.weaponSpr = null;
    }
  },

  melee(src, range, band, dmg, aoe) {
    if (src.isPlayer && this._kkMeleeCanvases) {
      this._kkMeleeCanvases(src, range, band, dmg);
    }
    if (src.isPlayer && this._kx?.phase === 'car' && this._kx.car?.active) {
      const car = this._kx.car;
      const dx = car.x - src.x;
      const front = aoe ? Math.abs(dx) < range + car.displayWidth * 0.35 : (Math.sign(dx) === src.facing || dx === 0) && Math.abs(dx) < range + car.displayWidth * 0.35;
      if (front && Math.abs(car.y - src.y) < band + 24) {
        this.karonuxBossCarHit(dmg, src.x);
      }
    }
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e === src) return;
      const dx = e.x - src.x;
      const dy = Math.abs(e.y - src.y);
      const front = aoe
        ? Math.abs(dx) < range
        : (Math.sign(dx) === src.facing || dx === 0) && Math.abs(dx) < range;
      if (front && dy < band) this.hurt(e, dmg, Math.sign(dx || src.facing), src.x, src);
    });
    if (src.isPlayer && this.props) {
      this.props.getChildren().forEach((c) => {
        if (!c.active) return;
        const dx = c.x - src.x;
        const dy = Math.abs(c.y - c.displayHeight * 0.4 - src.y);
        const front = aoe
          ? Math.abs(dx) < range
          : (Math.sign(dx) === src.facing || dx === 0) && Math.abs(dx) < range + 10;
        if (front && dy < band + 20) this.hitCrate(c, Math.sign(dx || src.facing));
      });
    }
  },

  hitCrate(c, dir) {
    c.hp--;
    this.tweens.add({ targets: c, x: c.x + dir * 5, duration: 60, yoyo: true });
    c.setTint(0xffffff);
    this.time.delayedCall(60, () => {
      if (c.active) c.clearTint();
    });
    if (c.active) {
      const st = c.hpMax - c.hp;
      if (st === 1 && this.textures.exists('crate1')) c.setTexture('crate1');
    }
    if (c.hp <= 0) {
      for (let i = 0; i < 8; i++) {
        const d = this.add.image(c.x, c.y - 22, 'crate2').setScale(0.18).setDepth(99950);
        const a = Math.random() * Math.PI - Math.PI / 2;
        const sp = 70 + Math.random() * 130;
        this.tweens.add({
          targets: d,
          x: c.x + Math.cos(a) * sp,
          y: c.y - Math.random() * 70,
          angle: Math.random() * 360,
          alpha: 0,
          scale: 0.05,
          duration: 550,
          onComplete: () => d.destroy(),
        });
      }
      if (CONFIG.shake) this.cameras.main.shake(90, 0.006);
      this.spawnSpark(c.x, c.y - 30);
      this.sfx('explosion', { vol: 0.7 });
      const r = Math.random();
      const loot = c.loot ?? 'random';
      if (loot === 'none') {
        /* rien */
      } else if (loot !== 'random') {
        this.spawnPickup(c.x, c.y, loot);
      } else if (r < 0.50) this.spawnPickup(c.x, c.y, 'poulet');
      else if (r < 0.75) this.spawnPickup(c.x, c.y, Phaser.Utils.Array.GetRandom(WEAPON_KEYS));
      else if (r < 0.90) this.spawnPickup(c.x, c.y, POLICE_ITEM);
      c.destroy();
    }
  },

  spawnBullet(x, y, dir, dmg, fromPlayer, ownerSlot = 0) {
    const b = this.physics.add.image(x, y, 'bullet').setDepth(99990);
    b.dir = dir;
    b.dmg = dmg;
    b.fromPlayer = fromPlayer;
    b.ownerSlot = ownerSlot;
    b.born = this.time.now;
    b.prevX = x;
    b.setFlipX(dir < 0);
    b.setTint(fromPlayer ? 0x9fe8ff : 0xffd24a);
    b.body.setVelocityX(dir * 560);
    this.bullets.add(b);
    this.spawnSpark(x, y);
  },

  _destroyBullet(b) {
    if (!b) return;
    try {
      this.tweens.killTweensOf(b);
    } catch (_) {}
    try {
      if (b.active) b.destroy();
    } catch (_) {}
  },

  updateBullets(time) {
    if (!this.bullets || !this.bullets.getChildren) return;
    this.bullets.getChildren().forEach((b) => {
      if (!b || !b.active) return;

      if (b.isTennis) {
        if (this._updateTennisBall) this._updateTennisBall(b, time);
        if (time - b.born > 4500 || b.x < -60 || b.x > W + 60) {
          this._destroyBullet(b);
          return;
        }
        for (const p of this.activePlayers()) {
          if (!p.active || p.hp <= 0) continue;
          if (Math.abs(p.x - b.x) < 28 && Math.abs(p.y - b.y) < 34) {
            this.hurt(p, b.dmg, p.x < b.x ? -1 : 1, b.x);
            this._destroyBullet(b);
            break;
          }
        }
        return;
      }

      const prevX = b.prevX ?? b.x - (b.dir || 1) * 18;
      b.prevX = b.x;
      if (b.isCard && b.spinSpeed) {
        b.angle += b.spinSpeed * (this.game.loop.delta / 1000);
      }

      if (b.x < -40 || b.x > W + 40 || time - b.born > (b.isBill ? 3200 : b.isCard ? 2800 : 1700)) {
        this._destroyBullet(b);
        return;
      }
      if (b.fromPlayer) {
        if (this._kkBulletCanvases?.(b)) {
          this._destroyBullet(b);
          return;
        }
        if (this._kx?.phase === 'car' && this._kx.car?.active) {
          const car = this._kx.car;
          if (Math.abs(car.x - b.x) < car.displayWidth * 0.42 && Math.abs(car.y - b.y) < 58) {
            this.karonuxBossCarHit(b.dmg, b.x);
            this._destroyBullet(b);
            return;
          }
        }
        this.enemies.getChildren().forEach((e) => {
          if (!e.active) return;
          if (
            this._bulletHitsTarget(b, prevX, e.x, e.y, {
              airborne: e.airborne,
              jumpZ: e.jumpZ,
            })
          ) {
            this.hurt(e, b.dmg, b.dir, b.x, null, { fromPlayer: true, ownerSlot: b.ownerSlot ?? 0 });
            this._destroyBullet(b);
          }
        });
      } else {
        for (const p of this.activePlayers()) {
          if (!p.active || p.hp <= 0) continue;
          if (b.isBoard && p.airborne && (p.jumpZ ?? 0) >= 20) continue;
          const hitX = b.isBill ? 24 : b.isPepper ? 36 : b.isCard ? 28 : b.isBoard ? 30 : 32;
          const hitY = b.isBill ? 20 : b.isPepper ? 36 : b.isCard ? 30 : b.isBoard ? 22 : 40;
          const bodyY = this._targetBodyY(p.y, p.airborne, p.jumpZ);
          if (Math.abs(p.x - b.x) < hitX && Math.abs(bodyY - b.y) < hitY) {
            if (b.isPepper) {
              this.stunPlayer(p, 2600, 'POIVRE !');
              if (b.dmg) this.hurt(p, b.dmg, p.x < b.x ? -1 : 1);
            } else {
              const knockdown = !!b.isBoard;
              this.hurt(p, b.dmg, b.dir || (p.x < b.x ? -1 : 1), b.x, null, { knockdown });
            }
            this._destroyBullet(b);
            break;
          }
        }
      }
    });
  },

  hurt(t, dmg, dir, fromX, attacker, opts = {}) {
    const isCarKnockdown = t?.isPlayer && opts.knockdown === true && opts.carHit === true;
    if (!t || !t.scene || !t.active || t.hp <= 0 || t.state2 === 'ko' || t.dying) return;
    if (t.invuln > this.time.now && !isCarKnockdown) return;
    if (isCarKnockdown && t.state2 === 'fall' && t.invuln > this.time.now) return;
    if (t.type2 === 'triso' && fromX != null && this._hitTrisoFromBehind && !this._hitTrisoFromBehind(t, fromX)) {
      this._trisoBlockFeedback(t);
      return;
    }
    if (t.bossDef?.custom === 'karonux' && t.karonuxNapping) {
      this.karonuxWakeFromNap(t, this.time.now, false);
    }
    if (CONFIG.god && t.isPlayer) return;
    if (CONFIG.god && !t.isPlayer) dmg = 99999;
    if (!t.isPlayer && t.bossCustom === 'karonux_boss' && this.karonuxBossHurt) {
      dmg = this.karonuxBossHurt(t, dmg);
      if (dmg <= 0) {
        if (t.bossCustom !== 'karonux_boss') this.spawnSpark(t.x, t.y - 48);
        return;
      }
    }
    if (!t.isPlayer && t.bossCustom === 'kikor_boss' && this.kikorBossHurt) {
      dmg = this.kikorBossHurt(t, dmg);
    }
    const wasAirborne = !!t.airborne || (t.jumpZ ?? 0) > 4;
    if (t.airborne) {
      t.y += t.jumpZ || 0;
      t.jumpZ = 0;
      t.jumpVZ = 0;
      t.airborne = false;
      t.kicking = false;
      t._airKickHeld = false;
    }
    t.hp -= dmg;
    if (!t.isPlayer && !t.bossDef) this._ensureEnemyHpBar?.(t);
    const fromPlayerHit = !!(attacker?.isPlayer || opts.fromPlayer);
    if (t.isPlayer || fromPlayerHit) {
      this.hitStop(t.hp <= 0 ? 90 : opts.knockdown ? 70 : 45);
    }
    if (!t.isPlayer && fromPlayerHit) {
      this._registerComboHit(attacker?.playerSlot ?? opts.ownerSlot ?? 0);
    }
    if (t.isPlayer) {
      this._breakComboChain(t.playerSlot ?? 0, false);
      if (t._grabbing) this._releaseGrab?.(t);
    }
    this.flash(t, 0xffffff);
    this.spawnSpark(t.x - (dir || 0) * 10, t.y - 50);
    this.shake(90, 0.006);
    this.sfx(t.isPlayer ? 'hurt' : 'hit', { vol: t.isPlayer ? 1 : 0.85 });
    const kb = opts.knockback ?? attacker?._lastHitKnockback ?? 16;
    try {
      this.tweens.killTweensOf(t);
    } catch (_) {}
    this.tweens.add({ targets: t, x: t.x + (dir || 1) * kb, duration: kb > 20 ? 120 : 90 });
    if (attacker?._lastHitKnockback) attacker._lastHitKnockback = null;
    if (t.hp > 0) {
      if (t.isPlayer) {
        const react = this._playerHitReact(t, {
          wasAirborne,
          knockdown: opts.knockdown === true,
        });
        t.state2 = react.state;
        if (react.animName) {
          t.anims?.stop();
          this.anim(t, react.animName, false);
        }
        t.invuln = this.time.now + react.recoverMs;
        this.blink(t);
        if (react.state !== 'fall') {
          this.time.delayedCall(react.recoverMs, () => {
            if (t.active && t.state2 === react.state) t.state2 = 'idle';
          });
        }
      } else {
        const isKxBoss = t.bossCustom === 'karonux_boss';
        const inTurbo = isKxBoss && (this._kx?.turboUntil || 0) > this.time.now;
        const inClope = isKxBoss && this._kx?.sub === 'clope';
        const kxBusy =
          isKxBoss &&
          !inTurbo &&
          ((t.busy || 0) > this.time.now ||
            this._kx?.sub === 'charge' ||
            this._kx?.sub === 'yawn' ||
            this._kx?.sub === 'kneel');

        if (!kxBusy && !inClope) {
          t.state2 = 'hurt';
          if (isKxBoss && this._playBk) {
            this._playBk(t, 'bk_hurt', false);
            if (this._kxRecoverBossHurt) this._kxRecoverBossHurt(t);
          } else {
            this.anim(t, 'hurt', false);
            this._fighterLater(t, 280, () => {
              if (t.active && t.state2 === 'hurt' && !t.dying) t.state2 = 'idle';
            });
          }
        }
        t.invuln = this.time.now + (isKxBoss ? 300 : 200);
      }
    } else this.die(t, dir);
    this.updateHUD();
  },

  _dieAnimDuration(t, clip) {
    const frameKey = t.frameSheet ?? t.sheet;
    const fa = FRAME_ANIM_CHARS[frameKey];
    if (fa?.[clip]?.length) {
      const rate = fa[`${clip}Rate`] || 10;
      return Math.round((fa[clip].length / rate) * 1000) + 100;
    }
    const animKey = (t.usesFrameAnim ? frameKey : t.sheet) + '_' + clip;
    if (this.anims.exists(animKey)) return 520;
    return 0;
  },

  _dieKoPose(t, dir) {
    if (!t?.scene) return;
    t.state2 = 'ko';
    this.anim(t, 'ko', false);
    if (!t.isPlayer) this.sfx('ko', { vol: 0.7 });
    const koMs = this._dieAnimDuration(t, 'ko') || 550;
    this._fighterLater(t, koMs, () => this._dieFinish(t, dir));
  },

  _dieFinish(t, dir) {
    if (!t?.scene) return;
    t.dying = false;
    t.active = false;
    if (t.isPlayer) {
      const slot = t.playerSlot ?? 0;
      this.playerDown(slot);
      return;
    }
    if (t.bossDef) {
      if (t.bossDef.custom === 'jualos' || t.sheet === 'jualos') this._cancelJualosCharge(t);
      this._clearBossHud?.();
      dbgLog('die: BOSS mort -> phase=win, victory dans 700ms');
      this.phase = 'win';
      this.time.delayedCall(700, () => {
        try {
          this.victory();
        } catch (e) {
          showCrash('victory()', e);
        }
      });
      return;
    }
    this.score += t.score || 100;
    this.updateHUD();
    if (!t.isPlayer && !t.bossDef) {
      this._purgeFighter(t);
      try {
        t.destroy();
      } catch (_) {}
      this.checkClear();
      return;
    }
  },

  die(t, dir) {
    if (t.type2 === 'triso' && this._stopTrisoSpit) this._stopTrisoSpit(t);
    if (t.dying) return;
    if (t._grabbedBy) this._releaseGrab?.(t._grabbedBy);
    if (t.isPlayer && t._grabbing) this._releaseGrab?.(t);
    this._purgeFighter(t);
    if (t.bossDef?.custom === 'jo' || t.sheet === 'jo') this._cancelJoSpin?.(t);
    if (t.bossCustom === 'karonux_boss' && !t._kxDeathStarted) {
      t._kxDeathStarted = true;
      t.dying = true;
      t._dyingSince = this.time.now;
      t.hp = 0;
      t.invuln = Number.MAX_SAFE_INTEGER;
      t.setVelocity(0, 0);
      if (t.body) t.body.enable = false;
      this.karonuxBossDie(t);
      this.time.delayedCall(3200, () => {
        if (!t?.scene) return;
        this.phase = 'win';
        this.time.delayedCall(700, () => {
          try { this.victory(); } catch (e) { showCrash('victory()', e); }
        });
      });
      return;
    }
    if (t.bossCustom === 'kikor_boss' && !t._kkDeathStarted) {
      t._kkDeathStarted = true;
      t.dying = true;
      t._dyingSince = this.time.now;
      t.hp = 0;
      t.invuln = Number.MAX_SAFE_INTEGER;
      t.setVelocity(0, 0);
      if (t.body) t.body.enable = false;
      this.kikorBossDie(t);
      this.time.delayedCall(2800, () => {
        if (!t?.scene) return;
        this.phase = 'win';
        this.time.delayedCall(700, () => {
          try { this.victory(); } catch (e) { showCrash('victory()', e); }
        });
      });
      return;
    }
    t.dying = true;
    t._dyingSince = this.time.now;
    t.hp = 0;
    t.invuln = Number.MAX_SAFE_INTEGER;
    t.setVelocity(0, 0);
    if (t.body) t.body.enable = false;
    t._airKickHeld = false;
    t.kicking = false;
    if (t.airborne) {
      t.y += t.jumpZ || 0;
      t.jumpZ = 0;
      t.jumpVZ = 0;
      t.airborne = false;
    }
    if (t.isPlayer) t.frozen = true;
    if (t.isPlayer && t.weapon) {
      t.weapon = null;
      this.clearWeaponVisual(t);
      this.updateWeaponHUD(t.playerSlot ?? 0);
    }

    const frameKey = t.frameSheet ?? t.sheet;
    let fallClip = null;
    if (t.usesFrameAnim && hasFrameClip(frameKey, 'fall')) {
      fallClip = 'fall';
    } else if (this.anims.exists(`${t.sheet}_hurt`)) {
      fallClip = 'hurt';
    }

    if (fallClip) {
      t.state2 = 'fall';
      this.anim(t, fallClip, false);
      const fallMs = this._dieAnimDuration(t, fallClip) || 700;
      const fallKey = (t.usesFrameAnim ? frameKey : t.sheet) + '_' + fallClip;
      const goKo = () => {
        if (!t.scene || !t.dying || t.state2 === 'ko') return;
        this._dieKoPose(t, dir);
      };
      if (t.usesFrameAnim && this.anims.exists(fallKey)) {
        t.once('animationcomplete', (anim) => {
          if (anim.key === fallKey) goKo();
        });
      }
      this._fighterLater(t, fallMs, goKo);
      return;
    }

    this._dieKoPose(t, dir);
  },

  flash(t, c) {
    if (!t || !t.scene || !t.active) return;
    t.setTintFill(c);
    this._fighterLater(t, 70, () => {
      if (!t || !t.scene || !t.active) return;
      t.clearTint();
      if (t.baseTint) t.setTint(t.baseTint);
      else if (CONFIG.god && t.isPlayer) t.setTint(0xffe066);
    });
  },

  blink(t) {
    this.tweens.add({
      targets: t,
      alpha: 0.3,
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => t.setAlpha(1),
    });
  },

  spawnSpark(x, y) {
    if (!this.sys || !this.sys.isActive()) return;
    const sparkMax = window.__SOSF_GFX__?.sparkMax ?? 14;
    this._sparkCount = (this._sparkCount || 0) + 1;
    if (this._sparkCount > sparkMax) {
      this._sparkCount--;
      return;
    }
    const s = this.add.image(x, y, 'spark').setDepth(99999);
    this.tweens.add({
      targets: s,
      scale: 1.7,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        this._sparkCount = Math.max(0, (this._sparkCount || 1) - 1);
        try {
          s.destroy();
        } catch (e) {}
      },
    });
  },

  _pruneDeadTweens() {
    try {
      const list = this.tweens.getAllTweens?.() ?? this.tweens.tweens ?? [];
      for (const tw of list) {
        if (!tw || !tw.isPlaying?.()) continue;
        const targets = tw.getTargets?.() ?? tw.targets ?? [];
        if (!targets.length) continue;
        if (targets.every((t) => !t || !t.scene || !t.active)) {
          tw.remove?.();
        }
      }
    } catch (_) {}
  },

  airKick(slot = 0) {
    const p = this.playerAt(slot);
    if (!p || !p.airborne || p.kicking) return;
    if (
      this.phase === 'intro' ||
      this._specialActive[slot] ||
      p.state2 === 'hurt' ||
      this.isPlayerStunned(p) ||
      p.hp <= 0
    ) return;

    const cfg = this.cfgAt(slot);
    const frameKey = p.frameSheet ?? p.sheet;
    const fa = FRAME_ANIM_CHARS[frameKey];

    p.kicking = true;
    p.state2 = 'kick';

    if (hasFrameClip(frameKey, 'kick')) {
      p._lastHitKnockback = fa?.kickKnockback ?? fa?.airKickKnockback ?? 28;
      this.anim(p, 'kick', true);
      this._freezeAirKickPose(p, 'kick');
    } else if (hasFrameClip(frameKey, 'attack')) {
      p._lastHitKnockback = 22;
      this.anim(p, 'attack', true);
      this._freezeAirKickPose(p, 'attack');
    } else if (!p.usesFrameAnim) {
      p.anims.stop();
      p.setFrame(16);
      p._lastHitKnockback = 22;
      p._airKickHeld = true;
    } else {
      p._lastHitKnockback = 22;
    }

    this.sfx('punch', { vol: 0.95 });
    const rng = cfg.range + (fa?.kickRangeBonus ?? fa?.airKickRangeBonus ?? 12);
    const bnd = cfg.band + 10;
    const dmg = cfg.damage + (fa?.kickDamageBonus ?? fa?.airKickDamageBonus ?? 6);

    this.time.delayedCall(55, () => {
      if (p.active && p.airborne) this.melee(p, rng, bnd, dmg);
    });
    this.time.delayedCall(90, () => {
      if (p.active && p.airborne) {
        this.spawnSpark(p.x + p.facing * 42, p.y - 26);
        if (CONFIG.shake) this.cameras.main.shake(60, 0.004);
      }
    });
  },

  strike(e) {
    const p = this.nearestPlayerTo(e.x, e.y);
    e.setVelocity(0, 0);
    e.state2 = 'attack';
    this.anim(e, 'attack', false);
    this.time.delayedCall(260, () => {
      if (e.active && e.state2 === 'attack' && !e.dying) {
        e.state2 = 'idle';
        this.anim(e, 'idle');
      }
    });
    this._fighterLater(e, 230, () => {
      if (!e.active || e.dying || p.hp <= 0) return;
      if (Math.abs(p.x - e.x) < e.reach + 6 && Math.abs(p.y - e.y) < 48) {
        this.hurt(p, e.damage, p.x < e.x ? -1 : 1);
      }
    });
  },
};
