import Phaser from 'phaser';
import { W, FLOOR_TOP, FLOOR_BOTTOM } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';
export const aiMixin = {
  _enemyLocomote(e) {
    const vx = e.body?.velocity?.x ?? 0;
    const vy = e.body?.velocity?.y ?? 0;
    if (Math.abs(vx) > 2 || Math.abs(vy) > 2) {
      if (e.state2 !== 'walk' && e.state2 !== 'run') e.state2 = 'walk';
      this.locomoteAnim(e, vx, vy);
    } else if (e.state2 !== 'idle') {
      e.state2 = 'idle';
      this.anim(e, 'idle');
    }
  },

  ai(e, time) {
    if (!e || !e.scene || !e.active) return;
    if (e.state2 === 'ko' || e.dying) return;
    if (e.bossDef) {
      this.bossCombatAI(e, time);
      return;
    }
    if (e.state2 === 'hurt') return;
    if (e.type2 === 'kikor_e') { this.kikorAI(e, time); return; }
    if (e.type2 === 'makouille') { this.makouAI(e, time); return; }
    if (e.type2 === 'charlingals') { this.charlingalsAI(e, time); return; }
    if (e.type2 === 'orelsan') { this.orelsanAI(e, time); return; }
    if (e.type2 === 'papy_jala') { this.papyJalaAI(e, time); return; }
    if (e.type2 === 'remy') { this.remyAI(e, time); return; }
    if (e.type2 === 'triso') { this.trisoAI(e, time); return; }
    if (e.type2 === 'guylux') { this.guyluxAI(e, time); return; }
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d > e.reach - 8) {
      const a = Math.atan2(dy, dx);
      e.setVelocity(Math.cos(a) * e.speedV, Math.sin(a) * e.speedV);
      e.facing = dx < 0 ? -1 : 1;
      e.setFlipX(e.facing < 0);
      this._enemyLocomote(e);
    } else {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') { e.state2 = 'idle'; this.anim(e, 'idle'); }
      if (time > e.nextAttack) { e.nextAttack = time + e.attackCd; this.strike(e); }
    }
    this.clampBand(e);
  },

  kikorAI(e, time) {
    if (e.state2 === 'jump' || e.state2 === 'attack') {
      this.clampBand(e);
      return;
    }
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    const adx = Math.abs(dx);
    e.facing = dx < 0 ? -1 : 1;
    e.setFlipX(e.facing < 0);

    if (time > e.nextAttack && adx >= 100 && adx <= 420 && Math.random() < 0.32) {
      e.nextAttack = time + e.attackCd * 1.7;
      e.setVelocity(0, 0);
      this.kikorSkate(e);
      this.clampBand(e);
      return;
    }

    if (d > e.reach - 8) {
      const a = Math.atan2(dy, dx);
      e.setVelocity(Math.cos(a) * e.speedV, Math.sin(a) * e.speedV);
      if (e.state2 !== 'walk' && e.state2 !== 'run') e.state2 = 'walk';
      this._enemyLocomote(e);
    } else {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') { e.state2 = 'idle'; this.anim(e, 'idle'); }
      if (time > e.nextAttack) {
        e.nextAttack = time + e.attackCd;
        this.strike(e);
      }
    }
    this.clampBand(e);
  },

  kikorSkate(e) {
    e.state2 = 'jump';
    this.anim(e, 'jump', false);
    e.setVelocity(0, 0);
    this.sfx('shoot', { vol: 0.45 });
    this.time.delayedCall(220, () => {
      if (!e.active) return;
      const boardY = e.y - 14;
      const b = this.physics.add.image(e.x + e.facing * 52, boardY, 'skateboard').setDepth(99980);
      b.dir = e.facing;
      b.dmg = 12;
      b.fromPlayer = false;
      b.born = this.time.now;
      b.isBoard = true;
      b.setOrigin(0.5, 0.75);
      b.setScale(0.85);
      if (b.body) {
        b.body.setAllowGravity(false);
        b.body.setSize(36, 18);
        b.body.setVelocityX(e.facing * 430);
      }
      b.setFlipX(e.facing < 0);
      this.tweens.add({ targets: b, angle: e.facing * 360, duration: 600, repeat: -1 });
      this.bullets.add(b);
      this.spawnSpark(e.x + e.facing * 40, boardY);
    });
    this.time.delayedCall(640, () => { if (e.active && e.state2 === 'jump') { e.state2 = 'idle'; this.anim(e, 'idle'); } });
  },

  makouAI(e, time) {
    const p = this.nearestPlayerTo(e.x, e.y);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    e.facing = dx < 0 ? -1 : 1;
    e.setFlipX(e.facing < 0);
    if (d > e.reach - 8) {
      const a = Math.atan2(dy, dx);
      e.setVelocity(Math.cos(a) * e.speedV, Math.sin(a) * e.speedV);
      this._enemyLocomote(e);
    } else {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') { e.state2 = 'idle'; this.anim(e, 'idle'); }
      if (time > e.nextAttack) {
        e.nextAttack = time + e.attackCd;
        Math.random() < 0.55 ? this.makouCharge(e) : this.strike(e);
      }
    }
    this.clampBand(e);
  },

  makouCharge(e) {
    e.state2 = 'jump';
    this.anim(e, 'jump', false);
    e.setVelocity(0, 0);
    this.flash(e, 0xffdd33);
    if (CONFIG.shake) this.cameras.main.shake(80, 0.006);
    this.time.delayedCall(220, () => {
      if (!e.active) return;
      const dir = e.facing;
      this.tweens.add({
        targets: e, x: e.x + dir * 280, duration: 340,
        onUpdate: () => {
          for (const p of this.activePlayers()) {
            if (Math.abs(e.x - p.x) < 95 && Math.abs(e.y - p.y) < 58) {
              this.hurt(p, e.damage + 5, dir);
            }
          }
        },
      });
    });
    this.time.delayedCall(720, () => { if (e.active && e.state2 === 'jump') { e.state2 = 'idle'; this.anim(e, 'idle'); } });
  },

  clampBand(e) {
    const top = this.walkTop();
    const bottom = this.walkBottom();
    e.y = Phaser.Math.Clamp(e.y, top, bottom);
  },

  clamp(e) {
    if (!e || !e.scene || !e.active) return;
    e.x = Phaser.Math.Clamp(e.x, 24, W - 24);
    const top = this.walkTop();
    const bottom = this.walkBottom();
    const groundY = e.y + (e.jumpZ || 0);
    const cg = Phaser.Math.Clamp(groundY, top, bottom);
    if (cg !== groundY) e.y = cg - (e.jumpZ || 0);
    e.setDepth(Math.floor(cg) + (e.airborne ? 500 : 0));
  },
};
