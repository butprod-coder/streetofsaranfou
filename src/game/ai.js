import Phaser from 'phaser';
import { W, FLOOR_TOP, FLOOR_BOTTOM } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';

/** Rayon de l'anneau d'attente autour du joueur (px). */
const AI_RING_DIST = 190;
/** Durée d'un pas d'esquive (ms). */
const AI_DODGE_MS = 300;
/** Distance sous laquelle l'approche se termine toujours en course (dernier sprint). */
const AI_RUSH_DIST = 150;

export const aiMixin = {
  /** Nombre max d'ennemis autorisés à engager en même temps. */
  _aiMaxAttackers() {
    return CONFIG.diff === 'facile' ? 1 : CONFIG.diff === 'difficile' ? 3 : 2;
  },

  /**
   * Directeur d'IA (appelé chaque frame, ré-évalue les rôles ~5x/s) :
   * les N plus proches attaquent, les autres tiennent un anneau et temporisent.
   */
  _aiDirector(time) {
    if (time < (this._aiDirNext || 0)) return;
    this._aiDirNext = time + 220;
    if (!this.enemies?.getChildren) return;
    const list = [];
    for (const e of this.enemies.getChildren()) {
      if (!e?.active || e.hp <= 0 || e.dying || e.bossDef || e._grabbedBy || e._thrown) continue;
      const p = this.nearestPlayerTo(e.x, e.y);
      e._aiDist = Math.hypot(p.x - e.x, p.y - e.y);
      // Hystérésis : un attaquant en place garde la priorité ; les rôdeurs foncent plus volontiers
      e._aiScore = e._aiDist - (e._role === 'attack' ? 70 : 0) - (e.type2 === 'runner' ? 45 : 0);
      list.push(e);
    }
    if (!list.length) return;
    list.sort((a, b) => a._aiScore - b._aiScore);
    const maxAtk = this._aiMaxAttackers();
    let flank = Math.random() < 0.5 ? 1 : -1;
    list.forEach((e, i) => {
      if (i < maxAtk) {
        e._role = 'attack';
        e._flank = flank;
        flank = -flank;
      } else if (e._role !== 'wait') {
        e._role = 'wait';
        e._waitRepick = 0;
      }
    });
  },

  /** Rôdeur : tient ses distances, se répartit sur la hauteur, harcèle du regard. */
  _aiWaitBehavior(e, time, p, dx) {
    if (e._dodgeUntil && time < e._dodgeUntil) {
      e.setVelocity(e._dodgeVx || 0, e._dodgeVy || 0);
      this._enemyFaceTarget(e, dx);
      this._enemyLocomote(e);
      return;
    }
    if (this._aiTryDodge(e, time)) return;
    if (!e._waitRepick || time > e._waitRepick) {
      e._waitRepick = time + Phaser.Math.Between(900, 1900);
      e._waitY = Phaser.Math.Between(this.walkTop() + 6, this.walkBottom() - 6);
      e._waitR = AI_RING_DIST + Phaser.Math.Between(-35, 45);
    }
    const side = Math.sign(e.x - p.x) || (Math.random() < 0.5 ? 1 : -1);
    const tx = Phaser.Math.Clamp(p.x + side * e._waitR, 30, W - 30);
    const ddx = tx - e.x;
    const ddy = e._waitY - e.y;
    const dd = Math.hypot(ddx, ddy);
    this._enemyFaceTarget(e, dx);
    if (dd > 14) {
      const a = Math.atan2(ddy, ddx);
      const sp = e.speedV * 0.55;
      e.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
      this._enemyLocomote(e);
    } else {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') {
        e.state2 = 'idle';
        this.anim(e, 'idle');
      }
    }
  },

  /** Un joueur proche est-il en train de porter un coup vers cet ennemi ? */
  _aiPlayerThreat(e) {
    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (!p?.active || p.hp <= 0) continue;
      if (p.state2 !== 'attack' && !p.kicking) continue;
      const dx = e.x - p.x;
      if (Math.abs(dx) > 190 || Math.abs(e.y - p.y) > 64) continue;
      if (Math.sign(dx) !== p.facing && dx !== 0) continue;
      return p;
    }
    return null;
  },

  /** Esquive réactive : pas de côté (vertical) ou bond arrière quand un coup part.
   * Un seul tirage par coup adverse (« armé » tant qu'aucune menace n'est détectée,
   * puis désarmé dès le tirage fait) — pas une temporisation globale, sinon l'esquive
   * ne se voit quasiment jamais avec des probabilités de 10-35 %. */
  _aiTryDodge(e, time) {
    const prof = e.aiProfile;
    if (!prof?.dodge) return false;
    if (e._dodgeUntil && time < e._dodgeUntil) return false;
    const threat = this._aiPlayerThreat(e);
    if (!threat) {
      e._dodgeArmed = true;
      return false;
    }
    if (e._dodgeArmed === false) return false;
    e._dodgeArmed = false;
    if (Math.random() >= prof.dodge) return false;

    const top = this.walkTop();
    const bottom = this.walkBottom();
    const room = 46;
    let vy;
    if (e.y - top < room) vy = 1;
    else if (bottom - e.y < room) vy = -1;
    else vy = Math.random() < 0.5 ? 1 : -1;

    const backHop = Math.random() < 0.35;
    const away = Math.sign(e.x - threat.x) || -e.facing;
    e._dodgeUntil = time + AI_DODGE_MS;
    e._dodgeVx = backHop ? away * e.speedV * 1.5 : away * e.speedV * 0.35;
    e._dodgeVy = backHop ? 0 : vy * e.speedV * 1.45;
    e.state2 = 'idle';
    this.anim(e, 'idle');
    this.flash(e, 0xffffff);
    return true;
  },

  /** Attaquant : approche par le flanc assigné, frappe à cadence variable,
   * esquive les coups, feinte au contact et se replie après avoir frappé. */
  _aiAttackApproach(e, time, p, dx, dy, d) {
    const prof = e.aiProfile;

    if (e._dodgeUntil && time < e._dodgeUntil) {
      e.setVelocity(e._dodgeVx || 0, e._dodgeVy || 0);
      this._enemyFaceTarget(e, dx);
      this._enemyLocomote(e);
      return;
    }
    if (this._aiTryDodge(e, time)) return;

    if (e._retreatUntil && time < e._retreatUntil) {
      const away = Math.sign(e.x - p.x) || -e.facing;
      e.setVelocity(away * e.speedV * 0.7, (e._retreatVy || 0) * e.speedV * 0.4);
      this._enemyFaceTarget(e, dx);
      this._enemyLocomote(e);
      return;
    }
    if (d <= e.reach - 8 && Math.abs(dy) < 42) {
      e.setVelocity(0, 0);
      this._enemyFaceTarget(e, dx);
      if (e.state2 !== 'idle') {
        e.state2 = 'idle';
        this.anim(e, 'idle');
      }
      if (time > e.nextAttack) {
        // Feinte : recule au lieu de frapper, puis revient frapper vite.
        if (prof?.feint && time > (e._feintCdUntil || 0) && Math.random() < prof.feint) {
          e._feintCdUntil = time + 2600;
          e._retreatUntil = time + Phaser.Math.Between(260, 480);
          e._retreatVy = Math.random() < 0.5 ? 1 : -1;
          e.nextAttack = time + Phaser.Math.Between(350, 600);
          return;
        }
        e.nextAttack = time + e.attackCd * Phaser.Math.FloatBetween(0.85, 1.35);
        this.strike(e);
        if (Math.random() < (prof?.retreat ?? 0.35)) {
          e._retreatUntil = time + Phaser.Math.Between(300, 550);
          e._retreatVy = Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : -1;
        }
      }
      return;
    }
    // Allure variée à l'approche : tantôt une marche prudente, tantôt un sprint —
    // toujours un sprint sur le dernier tronçon pour conclure l'engagement.
    if (!e._paceUntil || time > e._paceUntil) {
      e._paceUntil = time + Phaser.Math.Between(650, 1500);
      e._paceRun = Math.random() < 0.45;
    }
    const speedMul = e._paceRun || d < AI_RUSH_DIST ? 1 : Phaser.Math.FloatBetween(0.5, 0.62);

    const flank = e._flank || Math.sign(e.x - p.x) || 1;
    const gx = Phaser.Math.Clamp(p.x + flank * Math.max(30, e.reach - 14), 26, W - 26);
    const a = Math.atan2(p.y - e.y, gx - e.x);
    e.setVelocity(Math.cos(a) * e.speedV * speedMul, Math.sin(a) * e.speedV * speedMul);
    this._enemyFaceTarget(e, dx);
    this._enemyLocomote(e);
  },

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
    if (e._grabbedBy || e._thrown) return;
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
    if (e._role === 'wait') {
      this._aiWaitBehavior(e, time, p, dx);
    } else {
      this._aiAttackApproach(e, time, p, dx, dy, d);
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

    if (e._role === 'wait') {
      this._aiWaitBehavior(e, time, p, dx);
    } else {
      this._aiAttackApproach(e, time, p, dx, dy, d);
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
    if (e._role === 'wait') {
      this._aiWaitBehavior(e, time, p, dx);
      this.clampBand(e);
      return;
    }
    if (d > e.reach - 8) {
      this._aiAttackApproach(e, time, p, dx, dy, d);
    } else {
      e.setVelocity(0, 0);
      if (e.state2 !== 'idle') { e.state2 = 'idle'; this.anim(e, 'idle'); }
      if (time > e.nextAttack) {
        e.nextAttack = time + e.attackCd * Phaser.Math.FloatBetween(0.85, 1.3);
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
