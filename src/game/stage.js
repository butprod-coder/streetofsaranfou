import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM, COL, F, NUM } from '../config/gameConfig.js';
import { ENEMY_TYPES } from '../config/enemies.js';
import { LEVELS } from '../config/levels.js';
import { CONFIG, PROGRESS } from '../config/difficulty.js';
import { dbgLog, showCrash } from '../debug/crashOverlay.js';
import { beginMenuPadGrace } from '../input/gamepad.js';

/** Durée du défilement entre sous-stages (ms). */
const STAGE_SCROLL_MS = 2500;
const STAGE_SCROLL_EASE = 'Linear';
/** Position X du joueur pour activer la sortie (bord droit de l'écran). */
const GO_TRIGGER_X = W - 125;
const GO_LABEL_X = W - 90;

/** GameScene mixin: stage.js */
export const stageMixin = {
  startStage(skipDecor = false) {
    this.phase = 'fight';
    this.waveIdx = 0;
    this._pendingWaveSpawn = false;
    if (!skipDecor) {
      this.spawnDecor();
    } else if (this.lv?.layers) {
      this.spawnDecor({
        clear: false,
        enter: false,
        skipLayers: true,
        stageIdx: this.stageIdx,
      });
    }
    if (!this.lv.testArena) this.stageBanner();
    const st = this.lv.stages[this.stageIdx];
    if (st?.bossOnly) {
      this.spawnBoss();
      return;
    }
    this.spawnWave();
  },

  stageBanner() {
    const txt = `STAGE ${this.stageIdx + 1} / ${this.lv.stages.length}`;
    const t = this.add
      .text(W / 2, 92, txt, F(0, { fontSize: '22px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9000)
      .setStroke('#000', 5);
    this.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 500, onComplete: () => t.destroy() });
  },

  _enemyTestHint(key) {
    const hints = {
      charlingals: 'Faux billets en l\'air',
      orelsan: 'Raquette proche / balle en cloche loin',
      papy_jala: 'Poivre / fumée téléport',
      remy: 'Dérapage scooter',
      triso: 'Passe derrière pendant le crachat — « Triso ? » puis frappe-le',
      guylux: 'Cartes Magic',
    };
    return hints[key] || '';
  },

  _spawnWaveEnemies(wave) {
    wave.forEach((k, i) => {
      const side = i % 2 === 0 ? -40 : W + 40;
      const e = this.makeFighter(
        side,
        Phaser.Math.Between(FLOOR_TOP + 30, FLOOR_BOTTOM - 5),
        ENEMY_TYPES[k].sheet,
        { hpMax: ENEMY_TYPES[k].hp, speed: ENEMY_TYPES[k].speed, type: k, scale: ENEMY_TYPES[k].scale }
      );
      e.facing = side < 0 ? 1 : -1;
      e.setFlipX(e.facing < 0);
      this.enemies.add(e);
    });
  },

  spawnWave() {
    const wave = this.lv.stages[this.stageIdx].waves[this.waveIdx];
    if (this.lv.testArena && wave.length === 1) {
      const k = wave[0];
      const e = ENEMY_TYPES[k];
      const hint = this._enemyTestHint(k);
      const label = hint ? `${e.name}\n${hint}` : e.name;
      const n = this.waveIdx + 1;
      const total = this.lv.stages[this.stageIdx].waves.length;
      this.banner(`[${n}/${total}] ${label}`, () => this._spawnWaveEnemies(wave), COL.cyan);
      return;
    }
    this._spawnWaveEnemies(wave);
  },

  spawnBoss() {
    if (this.lv?.layers) {
      this._pruneScrolledLayers();
    }
    this.startBossMusic?.();
    if (this.lv.boss?.custom === 'karonux_boss') {
      this.spawnKaronuxBoss();
      return;
    }
    this.phase = 'boss';
    const b = this.lv.boss;
    if (this.props) this.props.clear(true, true);
    if (this.pickups) this.pickups.clear(true, true);
    if (this.lv?.layers && !this._hasLayerBackground()) {
      this.spawnBossBackground();
    }
    this.banner('BOSS\n' + b.name, () => {
      this.sfx('boss');
      const boss = this.makeFighter(W + 60, this.spawnY(), b.sheet, {
        hpMax: b.hp,
        speed: b.speed,
        boss: b,
        scale: b.scale,
      });
      boss.facing = -1;
      boss.setFlipX(true);
      this.enemies.add(boss);
      this.boss = boss;
      const { barY, left, barW, centerX } = this._bossHudLayout();
      this.bossBarMaxW = barW;
      this._clearBossHud();
      const frame = this.add
        .rectangle(centerX, barY, barW + 6, 22, 0x000000, 0)
        .setStrokeStyle(2, 0xffffff, 0.6)
        .setScrollFactor(0)
        .setDepth(9000);
      this.bossBar = this.add
        .rectangle(left, barY, barW, 16, NUM('blood'))
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(9001);
      const nameT = this.add
        .text(centerX, barY + 18, b.name, F(0, { fontSize: '13px', color: COL.cream }))
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(9001);
      this._bossHud = [frame, this.bossBar, nameT];
    });
  },

  _livingEnemies() {
    if (!this.enemies?.getChildren) return 0;
    return this.enemies.getChildren().filter((e) => e && e.scene && e.hp > 0).length;
  },

  _compactBattlefield() {
    if (this.enemies?.getChildren) {
      for (const e of [...this.enemies.getChildren()]) {
        if (e && (!e.active || e.hp <= 0) && !e.bossDef) {
          const dyingStale =
            e.dying && e._dyingSince && this.time.now - e._dyingSince > 1400;
          if (!e.dying || dyingStale) {
            try {
              this._purgeFighter?.(e);
              this.tweens.killTweensOf(e);
              e.destroy();
            } catch (_) {}
          }
        }
      }
    }
    const trim = (g) => {
      if (!g?.getChildren) return;
      for (const o of [...g.getChildren()]) {
        if (o && (!o.active || !o.scene)) {
          try {
            this.tweens.killTweensOf(o);
            o.destroy();
          } catch (_) {}
        }
      }
    };
    trim(this.bullets);
    trim(this.pickups);
    trim(this.fires);
    trim(this.hazards);
  },

  _clearBossHud() {
    if (!this._bossHud?.length) {
      this.bossBar = null;
      return;
    }
    for (const o of this._bossHud) {
      try {
        this.tweens.killTweensOf(o);
        o?.destroy?.();
      } catch (_) {}
    }
    this._bossHud = null;
    this.bossBar = null;
  },

  /** Nettoyage léger entre vagues/stages — même esprit qu'un redémarrage de GameScene. */
  _levelHygiene() {
    this._compactBattlefield();
    this._pruneScrolledLayers?.();
    this._trimStaleAmbient?.();
    this._pruneDeadTweens?.();
    this._purgeSceneSounds?.();
  },

  _levelHygieneFull() {
    this._levelHygiene();
    this._clearBossHud();
    this.cancelGoExit?.();
  },

  _purgeSceneObjects() {
    const clear = (g) => {
      try {
        g?.clear?.(true, true);
      } catch (_) {}
    };
    clear(this.enemies);
    clear(this.bullets);
    clear(this.props);
    clear(this.pickups);
    clear(this.fires);
    clear(this.hazards);
    clear(this.decorGroup);
    clear(this.bgFarGroup);
    clear(this.bgMainGroup);
    clear(this.bgRoadGroup);
    clear(this.bgAmbientGroup);
  },

  _setupEndScreen({ title, col, onLeave, buildLines }) {
    this._endLeaving = false;
    this._endScreenReady = false;
    this._endUi = [];

    const leave = () => {
      if (this._endLeaving) return;
      this._endLeaving = true;
      if (this._endBannerEv) {
        try {
          this._endBannerEv.remove();
        } catch (_) {}
        this._endBannerEv = null;
      }
      this.stopFightMusic?.();
      this.tweens.killAll();
      this._levelHygieneFull?.();
      this._purgeSceneObjects();
      onLeave();
    };
    this._endAction = leave;

    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.6)
      .setScrollFactor(0)
      .setDepth(9500);
    const titleT = this.add
      .text(W / 2, H / 2, title, F(0, { fontSize: '36px', fontStyle: 'bold', color: col || COL.gold, align: 'center', lineSpacing: 8 }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9501)
      .setStroke('#000', 6);
    this._endUi.push(dim, titleT);

    this._endShowDetails = () => {
      if (this._endScreenReady) return;
      this._endScreenReady = true;
      if (this._endBannerEv) {
        try {
          this._endBannerEv.remove();
        } catch (_) {}
        this._endBannerEv = null;
      }
      try {
        titleT.destroy();
      } catch (_) {}
      for (const line of buildLines?.() ?? []) {
        this._endUi.push(
          this.add
            .text(W / 2, line.y, line.text, F(0, { fontSize: line.fontSize || '18px', color: line.color || COL.cream }))
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(9600)
        );
      }
      beginMenuPadGrace(this, 280);
    };

    this._endBannerEv = this.time.delayedCall(700, () => this._endShowDetails());
  },

  checkClear() {
    if (this.phase === 'boss' || this.phase === 'go_wait' || this.phase === 'advance') return;
    if (this._pendingWaveSpawn) return;
    if (this._livingEnemies() > 0) return;
    this._levelHygiene();
    const st = this.lv.stages[this.stageIdx];
    if (this.waveIdx < st.waves.length - 1) {
      this.waveIdx++;
      this._pendingWaveSpawn = true;
      this.time.delayedCall(500, () => {
        this._pendingWaveSpawn = false;
        if (this.phase === 'go_wait' || this.phase === 'advance') return;
        this.spawnWave();
      });
      return;
    }
    if (this.lv.noBoss) {
      this.phase = 'win';
      this.victory();
      return;
    }
    if (this.stageIdx >= this.lv.stages.length - 1) {
      this.spawnBoss();
      return;
    }
    this.showGoExit();
  },

  cancelGoExit() {
    if (this.goExitLabel) {
      this.goExitLabel.destroy();
      this.goExitLabel = null;
    }
  },

  showGoExit() {
    if (this.phase === 'go_wait' || this.phase === 'advance') return;
    if (this._pendingWaveSpawn || this._livingEnemies() > 0) return;
    this._levelHygiene();
    this.phase = 'go_wait';
    const goY = FLOOR_TOP - 26;
    this.goExitLabel = this.add
      .text(GO_LABEL_X, goY, 'GO →', F(0, { fontSize: '30px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9000)
      .setStroke('#000', 5);
  },

  updateGoExit() {
    if (this.phase !== 'go_wait') return;
    if (this.goExitLabel?.active) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now * 0.009);
      this.goExitLabel.setAlpha(0.3 + pulse * 0.7);
    }
    if (this._livingEnemies() > 0) {
      this.cancelGoExit();
      this.phase = 'fight';
      return;
    }
    const alive = this.activePlayers();
    if (!alive.length) return;
    if (!alive.every((p) => p.x >= GO_TRIGGER_X)) return;
    this.beginStageScroll();
  },

  _scrollTargetX(slot) {
    return slot === 0 ? W * 0.22 : W * 0.38;
  },

  _registerStageScrollExisting(g) {
    if (!g) return;
    for (const o of g.getChildren()) {
      if (!o?.active) continue;
      if (o.x < -W * 0.35) continue;
      this._scrollObjects.push({ o, x0: o.x, x1: o.x - W });
    }
  },

  /** Scroll décor + joueurs sans tweens par objet (évite l'accumulation au fil des stages). */
  updateStageScroll() {
    if (this.phase !== 'advance') return;

    const now = this.time.now;
    const endsAt = this._scrollEndsAt ?? now;
    const tLeft = Math.max(0, endsAt - now);
    const dur = this._scrollDurMs ?? STAGE_SCROLL_MS;
    const t = Phaser.Math.Clamp(1 - tLeft / dur, 0, 1);

    if (this._scrollObjects) {
      for (const { o, x0, x1 } of this._scrollObjects) {
        if (o?.active) o.x = x0 + (x1 - x0) * t;
      }
    }
    if (this.bg && this._scrollTileFrom != null) {
      this.bg.tilePositionX = this._scrollTileFrom + W * t;
    }

    this.updateStageScrollPlayers();

    if (tLeft <= 0 && !this._scrollCompleteCalled) {
      this._scrollCompleteCalled = true;
      this._onStageScrollComplete();
    }
  },

  _trimStaleAmbient() {
    if (!this.bgAmbientGroup) return;
    for (const o of [...this.bgAmbientGroup.getChildren()]) {
      if (o?.active && o.x < W * 0.15) {
        this._destroyScrollObject(this.bgAmbientGroup, o);
      }
    }
  },

  _trimScrolledBackgrounds() {
    this._pruneScrolledLayers();
  },

  _hasLayerBackground() {
    const visible = (g) =>
      g?.getChildren?.().some((o) => o?.active && o.x > -W * 0.25 && o.x < W * 1.25);
    return visible(this.bgMainGroup) || visible(this.bgFarGroup) || visible(this.bgRoadGroup);
  },

  updateStageScrollPlayers() {
    if (this.phase !== 'advance') return false;
    const now = this.time.now;
    const tLeft = Math.max(0, (this._scrollEndsAt ?? now) - now);
    let allSettled = tLeft <= 0;

    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (!p || !p.active || p.hp <= 0) {
        continue;
      }
      if (!p._scrollWalk) {
        continue;
      }

      const targetX = p._scrollTargetX ?? this._scrollTargetX(slot);
      const cfg = this.cfgAt(slot);
      const dx = targetX - p.x;

      if (tLeft <= 0) {
        p.setVelocity(0, 0);
        if (Math.abs(dx) > 2) p.x = targetX;
        p.state2 = 'idle';
        this.anim(p, 'idle');
        p._scrollWalk = false;
        continue;
      }

      if (Math.abs(dx) < 3) {
        p.setVelocity(0, 0);
        p.state2 = 'walk';
        this.locomoteAnim(p, cfg.speed * 0.35, 0);
        continue;
      }

      allSettled = false;
      const vx = dx / Math.max(tLeft / 1000, 0.08);

      p.facing = 1;
      p.setFlipX(false);
      p.setVelocity(vx, 0);
      p.state2 = 'walk';
      this.locomoteAnim(p, Math.abs(vx), 0);
    }

    if (tLeft <= 0) {
      allSettled = true;
    }
    return allSettled;
  },

  _onStageScrollComplete() {
    if (this.phase !== 'advance') return;

    if (this._scrollObjects) {
      for (const { o, x1 } of this._scrollObjects) {
        if (o?.active) o.x = x1;
      }
    }
    this._scrollObjects = null;
    this._scrollTileFrom = null;
    this._stageScrollEnterHook = null;

    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (!p || !p.active || p.hp <= 0) continue;
      this.tweens.killTweensOf(p);
      p.setVelocity(0, 0);
      p.facing = 1;
      p.setFlipX(false);
      p.state2 = 'idle';
      this.anim(p, 'idle');
      p._scrollWalk = false;
    }

    this._pruneScrolledLayers();
    this._cleanupScrolledOut();
    this._trimStaleAmbient();
    this._levelHygiene();
    this._finishStageScroll(this._scrollHasNext, this._scrollNextIdx);
  },

  beginStageScroll() {
    if (this.phase === 'advance') return;
    this.phase = 'advance';
    if (this.goExitLabel) {
      this.tweens.killTweensOf(this.goExitLabel);
      this.goExitLabel.destroy();
      this.goExitLabel = null;
    }

    const dur = STAGE_SCROLL_MS;
    const nextIdx = this.stageIdx + 1;
    const hasNextStage = nextIdx < this.lv.stages.length;
    this._scrollEndsAt = this.time.now + dur;
    this._scrollHasNext = hasNextStage;
    this._scrollNextIdx = nextIdx;
    this._scrollDurMs = dur;
    this._scrollCompleteCalled = false;
    this._scrollObjects = [];
    this._scrollTileFrom = this.bg?.tilePositionX ?? null;

    this._cleanupScrolledOut();
    this._registerStageScrollExisting(this.bgFarGroup);
    this._registerStageScrollExisting(this.bgMainGroup);
    this._registerStageScrollExisting(this.bgRoadGroup);
    this._registerStageScrollExisting(this.bgAmbientGroup);
    this._registerStageScrollExisting(this.decorGroup);
    this._registerStageScrollExisting(this.props);
    this._registerStageScrollExisting(this.pickups);
    this._registerStageScrollExisting(this.fires);
    this._registerStageScrollExisting(this.hazards);

    this._stageScrollEnterHook = (o, x0, x1) => {
      this._scrollObjects.push({ o, x0, x1 });
    };

    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (!p || !p.active || p.hp <= 0) continue;
      if (p.airborne) {
        p.y += p.jumpZ || 0;
        p.jumpZ = 0;
        p.jumpVZ = 0;
        p.airborne = false;
        p.kicking = false;
      }
      this.tweens.killTweensOf(p);
      p.facing = 1;
      p.setFlipX(false);
      p._scrollTargetX = this._scrollTargetX(slot);
      p._scrollWalk = true;
      p.state2 = 'walk';
      const cfg = this.cfgAt(slot);
      const dx = p._scrollTargetX - p.x;
      const vx = dx / (dur / 1000);
      p.setVelocity(vx, 0);
      this.locomoteAnim(p, Math.abs(vx), 0);
    }

    if (hasNextStage) {
      this.spawnDecor({
        stageIdx: nextIdx,
        clear: false,
        enter: true,
        slideDuration: dur,
        slideEase: STAGE_SCROLL_EASE,
        skipProps: true,
        skipCrates: true,
      });
    }
    this._stageScrollEnterHook = null;
  },

  _finishStageScroll(hasNextStage, nextIdx) {
    if (this.phase !== 'advance') return;
    if (hasNextStage) {
      this.stageIdx = nextIdx;
      this.startStage(true);
    }
  },

  _cleanupScrolledOut() {
    const trim = (g) => {
      if (!g) return;
      for (const o of [...g.getChildren()]) {
        if (o && o.x < -W * 0.4) this._destroyScrollObject(g, o);
      }
    };
    trim(this.bgFarGroup);
    trim(this.bgMainGroup);
    trim(this.bgRoadGroup);
    trim(this.bgAmbientGroup);
    trim(this.decorGroup);
    trim(this.props);
    trim(this.pickups);
    trim(this.fires);
    trim(this.hazards);
  },

  _gameStartData(extra = {}) {
    const d = {
      charKey: this.charKey,
      level: extra.level ?? this.levelIdx,
      score: this.score,
      lives: this.lives,
      coop: this.coop,
      ...extra,
    };
    if (this.coop) {
      d.charKey2 = this.charKey2;
      d.lives2 = this.lives2;
      if (this.coopInputBindings) d.coopInputBindings = structuredClone(this.coopInputBindings);
    }
    return d;
  },

  playerDown(slot = 0){
    this.setLivesAt(slot, this.livesAt(slot) - 1);
    this.updateHUD();
    const livesLeft = this.livesAt(slot);
    if (livesLeft < 0) {
      const p = this.playerAt(slot);
      p.frozen = true;
      p.active = false;
      p.visible = false;
      p.body.enable = false;
      if (!this.anyPlayerAlive()) {
        this.gameOver();
        return;
      }
      const label = this.coop ? `J${slot + 1} ÉLIMINÉ` : 'GAME OVER';
      this.banner(label, () => {}, COL.blood);
      return;
    }
    const p = this.playerAt(slot);
    const spawnX = slot === 0 ? W * 0.22 : W * 0.38;
    const label = this.coop
      ? `J${slot + 1} — VIE PERDUE\n${Math.max(0, livesLeft)} restantes`
      : `VIE PERDUE\n${Math.max(0, livesLeft)} restantes`;
    this.banner(label, () => {
      p.active = true;
      p.body.enable = true;
      p.hp = p.hpMax;
      p.alpha = 1;
      p.clearTint();
      if (CONFIG.god) p.setTint(0xffe066);
      p.jumpZ = 0;
      p.jumpVZ = 0;
      p.airborne = false;
      p.kicking = false;
      p.weapon = null;
      this.clearWeaponVisual(p);
      this.updateWeaponHUD(slot);
      p.setPosition(spawnX, this.spawnY());
      p.state2 = 'idle';
      this.anim(p, 'idle');
      p.invuln = this.time.now + 1500;
      this.blink(p);
      this.updateHUD();
    }, COL.blood);
  },

  gameOver() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.physics.pause();
    this.sfx('gameover');
    const restartData = this.testBoss ? { testBossLevel: this.levelIdx } : this.coop ? { coop: true } : undefined;
    this._setupEndScreen({
      title: 'GAME OVER',
      col: COL.gold,
      onLeave: () => this.scene.start(this.testBoss ? 'TestBoss' : 'PlayMode', restartData),
      buildLines: () => [{ text: '✕ ou Start pour rejouer', y: H / 2 + 70, fontSize: '20px' }],
    });
  },

  victory() {
    if (this._won) return;
    this._won = true;
    this._clearBossHud?.();
    dbgLog('victory: (levelIdx=' + this.levelIdx + ')');
    this.phase = 'win';
    this.physics.pause();
    this.sfx('victory');
    const isTest = this.lv.noBoss || this.testBoss;
    const next = !isTest && this.levelIdx + 1 < LEVELS.length;
    dbgLog('victory: levelIdx=' + this.levelIdx + ' next=' + next + ' (LEVELS.length=' + LEVELS.length + ')');
    if (!next && !isTest) PROGRESS.gustavaxUnlocked = true;
    const title = isTest
      ? this.testBoss
        ? 'BOSS VAINCU !'
        : 'TEST TERMINÉ !'
      : next
        ? 'VICTOIRE !'
        : 'TU AS FINI\nSTREETS OF SARANFOU !';
    const sub = this.testBoss
      ? '✕ ou Start → test boss'
      : isTest
        ? '✕ ou Start → menu'
        : next
          ? '✕ ou Start → niveau suivant'
          : '✕ ou Start → menu';
    this._setupEndScreen({
      title,
      col: COL.gold,
      onLeave: () => {
        if (this.testBoss) this.scene.start('TestBoss');
        else if (isTest) this.scene.start('PlayMode');
        else if (next) this.scene.start('Game', this._gameStartData({ level: this.levelIdx + 1 }));
        else this.scene.start('Title');
      },
      buildLines: () => {
        const lines = [{ text: 'SCORE  ' + this.score, y: H / 2 + 50, fontSize: '24px', color: COL.gold }];
        if (!next && !isTest) {
          lines.push({ text: 'GUSTAVAX EST DÉBLOQUÉ !', y: H / 2 + 86, fontSize: '18px', color: COL.blood });
        }
        lines.push({
          text: sub,
          y: H / 2 + (next && !isTest ? 86 : 118),
          fontSize: '18px',
        });
        return lines;
      },
    });
  },

  banner(text, cb, col) {
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setScrollFactor(0).setDepth(9500);
    const t = this.add
      .text(W / 2, H / 2, text, F(0, { fontSize: '36px', fontStyle: 'bold', color: col || COL.gold, align: 'center', lineSpacing: 8 }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9501)
      .setStroke('#000', 6);
    let fired = false;
    const finish = () => {
      if (fired) return;
      fired = true;
      if (this._bannerSkip?.finish === finish) this._bannerSkip = null;
      try {
        dim.destroy();
        t.destroy();
        if (cb) {
          dbgLog('banner: exécution callback');
          cb();
        }
      } catch (e) {
        showCrash('banner.callback', e);
      }
    };
    const ev = this.time.delayedCall(1500, finish);
    this._bannerSkip = { finish, ev, minT: this.time.now + 350 };
  },
};
