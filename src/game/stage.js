import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM, COL, F, NUM } from '../config/gameConfig.js';
import { ENEMY_TYPES } from '../config/enemies.js';
import { LEVELS } from '../config/levels.js';
import { CONFIG, PROGRESS } from '../config/difficulty.js';
import { dbgLog, showCrash } from '../debug/crashOverlay.js';
import { beginMenuPadGrace, padForPlayer, PAD } from '../input/gamepad.js';

/** Défilement quand le joueur pousse dans la zone droite (px/s) — niveaux classiques. */
const SOFT_SCROLL_PX_S = 120;
/** Défilement entre segments (px/s) — niveaux classiques. */
const SEGMENT_SCROLL_PX_S = 250;
/** Début de la zone « pousse le décor » — niveaux classiques. */
const SCROLL_ZONE_MIN_X = W * 0.72;
/** Multiplicateur min : le décor doit défiler plus vite que le perso (niveaux classiques). */
const SCROLL_FASTER_THAN_PLAYER = 1.32;
/** Distance parcourue avant la vague suivante — niveaux classiques. */
const WAVE_SPAWN_SCROLL_PX = 130;
/** Distance pour valider le segment suivant — niveaux classiques. */
const SEGMENT_CHANGE_SCROLL_PX = W * 0.88;
/** Délai sans avancer avant d'afficher GO — niveaux classiques. */
const GO_IDLE_MS = 420;
/** Position X du joueur pour activer la sortie (bord droit de l'écran) — niveaux classiques. */
const GO_TRIGGER_X = W - 125;
const GO_LABEL_X = W - 90;
/** Caméra — léger zoom SOR sans couper le HUD. */
const LEVEL_CAM_ZOOM = 1.05;
const LEVEL_CAM_SCROLL_Y = -6;

/** Niveaux plein écran (fullStage) : défilement « caméra qui suit », façon Streets of Rage.
 * Ancrage à l'écran : au-delà, le décor rattrape le perso 1:1 (pas de vitesse scriptée). */
const FS_FOLLOW_X = W * 0.58;
/** Garde-fou anti-saut de frame (bien au-dessus de la vitesse max d'un perso). */
const FS_FOLLOW_MAX_PX_S = 480;

/** GameScene mixin: stage.js */
export const stageMixin = {
  _applyLevelCamera() {
    const cam = this.cameras.main;
    cam.setZoom(LEVEL_CAM_ZOOM);
    cam.setScroll(0, LEVEL_CAM_SCROLL_Y);
  },

  _resetScrollState() {
    this._segmentCleared = false;
    this._pendingWaveEnter = false;
    this._segmentTransition = false;
    this._waveScrollAccum = 0;
    this._segScrollAccum = 0;
    this._segScrollTarget = 0;
    this._scrollNextIdx = null;
    this._scrollSpeed = 0;
    this._goIdleSince = null;
    if (this.lv?.layers?.fullStage && !this.lv.testArena) this._initFullStageRun();
  },

  /** Plan du niveau plein écran continu : portes de scroll (positions éditeur) + vagues.
   * Tout est exprimé en « distance de scroll » depuis le début du niveau, de sorte que
   * la position écran d'un fond = fullStageSegmentCenterX(s) - scroll parcouru. */
  _initFullStageRun() {
    const stages = this.lv.stages ?? [];
    const base = this._fullStageSegmentCenterX(0);
    this._fsStageGates = [];
    for (let si = 0; si < stages.length; si++) {
      this._fsStageGates.push(this._fullStageSegmentCenterX(si) - base);
    }
    this._fsMaxScroll = this._fsStageGates[this._fsStageGates.length - 1] ?? 0;

    this._fsWaves = [];
    for (let si = 0; si < stages.length; si++) {
      const st = stages[si];
      if (st.bossOnly || !st.waves?.length) continue;
      const spanEnd = this._fsStageGates[si + 1] ?? this._fsMaxScroll;
      const span = Math.max(0, spanEnd - this._fsStageGates[si]);
      const n = st.waves.length;
      for (let wi = 0; wi < n; wi++) {
        this._fsWaves.push({
          stageIdx: si,
          waveIdx: wi,
          wave: st.waves[wi],
          trigger: this._fsStageGates[si] + (span * wi) / n,
        });
      }
    }

    this._fsNextWaveIdx = 0;
    this._fsBossSpawned = false;
    this._levelScrollTotal = 0;
    this._fsSpawnedStages = new Set();
  },

  /** Pré-charge les fonds à venir à leur position éditeur, relative au scroll courant. */
  _ensureFullStageBgAhead() {
    if (!this.lv?.layers?.fullStage || !this._fsStageGates) return;
    this._ensureDecorGroups?.();
    const scroll = this._levelScrollTotal ?? 0;
    for (let s = 0; s < this._fsStageGates.length; s++) {
      if (this._fsSpawnedStages?.has(s)) continue;
      if (scroll < this._fsStageGates[s] - W) continue;
      const has = this.bgMainGroup?.getChildren?.().some(
        (o) => o?.active && o.bgLayer && o.stagePartIdx === s
      );
      if (!has) {
        this._spawnLevelSegment(this._fullStageSegmentCenterX(s) - scroll, {
          stageIdx: s,
          enter: false,
          skipProps: true,
          skipCrates: true,
          skipAmbient: true,
        });
      }
      this._fsSpawnedStages.add(s);
    }
  },

  /** Stage courant déduit du scroll (pilote le nettoyage et le fond du boss). */
  _syncFullStageIdxFromScroll() {
    const scroll = this._levelScrollTotal ?? 0;
    let cur = 0;
    for (let s = (this._fsStageGates?.length ?? 1) - 1; s >= 0; s--) {
      if (scroll >= (this._fsStageGates[s] ?? 0) - W * 0.5) {
        cur = s;
        break;
      }
    }
    this.stageIdx = cur;
  },

  /** Déclenche vagues et boss selon la distance parcourue (même en bout de niveau). */
  _fsProgress() {
    if (this._livingEnemies() > 0) return;
    const scroll = this._levelScrollTotal ?? 0;
    const atEnd = scroll >= (this._fsMaxScroll ?? 0) - 1;

    const next = this._fsWaves?.[this._fsNextWaveIdx];
    if (next && (scroll >= next.trigger || atEnd)) {
      this._fsNextWaveIdx++;
      this.waveIdx = next.waveIdx;
      this._ensureFullStageBgAhead();
      this._spawnWaveEnemies(next.wave, true);
      return;
    }

    if (!next && atEnd && !this._fsBossSpawned) {
      this._fsBossSpawned = true;
      this.spawnBoss();
    }
  },

  /** Perso le plus avancé à l'écran (pilote le défilement, comme la caméra SOR). */
  _frontmostActivePlayerX() {
    let best = null;
    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (!p?.active || p.hp <= 0) continue;
      if (best == null || p.x > best) best = p.x;
    }
    return best;
  },

  /** Défilement « caméra qui suit » : au-delà de l'ancrage, le décor rattrape le perso 1:1.
   * Butée en fin de niveau : on ne défile jamais au-delà du dernier fond. */
  _updateFullStageScroll(delta) {
    this._fsProgress();
    if (this._fsBossSpawned) return;

    if (!this._canScrollLevel()) {
      this._scrollSpeed = 0;
      return;
    }

    const leaderX = this._frontmostActivePlayerX();
    if (leaderX == null) {
      this._scrollSpeed = 0;
      return;
    }

    const remaining = (this._fsMaxScroll ?? 0) - (this._levelScrollTotal ?? 0);
    const wanted = Math.min(leaderX - FS_FOLLOW_X, remaining);
    if (wanted <= 0) {
      this._scrollSpeed = 0;
      return;
    }

    const dx = Math.min(wanted, (FS_FOLLOW_MAX_PX_S * delta) / 1000);
    if (dx <= 0) return;

    this._scrollSpeed = (dx * 1000) / delta;
    this._shiftWorld(dx, { skipPlayers: false });
    this._levelScrollTotal = (this._levelScrollTotal ?? 0) + dx;
    this._ensureFullStageBgAhead();
    this._syncFullStageIdxFromScroll();
    this._cleanupScrolledOut();
    this._fsProgress();
  },

  startStage(skipDecor = false, opts = {}) {
    this.phase = 'fight';
    this.waveIdx = opts.startWaveIdx ?? 0;
    this._resetScrollState();
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
    if (!this.lv.testArena && !this.lv?.layers?.fullStage) this.stageBanner();
    const st = this.lv.stages[this.stageIdx];
    if (st?.bossOnly) {
      this.spawnBoss();
      return;
    }
    // Niveau plein écran continu : les vagues sont déclenchées par la progression (_fsProgress).
    if (this.lv?.layers?.fullStage && !this.lv.testArena) return;
    this.spawnWave();
  },

  stageBanner() {
    const txt = `STAGE ${this.stageIdx + 1} / ${this.lv.stages.length}`;
    const t = this.add
      .text(W / 2, 108, txt, F(0, { fontSize: '14px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9000)
      .setStroke('#000', 4)
      .setAlpha(0.85);
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
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

  _spawnWaveEnemies(wave, enterFromAhead = false) {
    wave.forEach((k, i) => {
      const side = enterFromAhead
        ? W + 48 + i * 34
        : i % 2 === 0
          ? -40
          : W + 40;
      const e = this.makeFighter(
        side,
        Phaser.Math.Between(FLOOR_TOP + 30, FLOOR_BOTTOM - 5),
        ENEMY_TYPES[k].sheet,
        { hpMax: ENEMY_TYPES[k].hp, speed: ENEMY_TYPES[k].speed, type: k, scale: ENEMY_TYPES[k].scale }
      );
      e.facing = side < W * 0.5 ? 1 : -1;
      e.setFlipX(e.facing < 0);
      this.enemies.add(e);
    });
  },

  spawnWave() {
    const st = this.lv.stages[this.stageIdx];
    if (st?.bossOnly) return;
    if (this.waveIdx >= st.waves.length) {
      this.checkClear();
      return;
    }
    const wave = st.waves[this.waveIdx];
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
    if (this.lv.boss?.custom === 'kikor_boss') {
      this.spawnKikorBoss();
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
      this._buildBossHud(b.name);
    });
  },

  _livingEnemies() {
    if (!this.enemies?.getChildren) return 0;
    let n = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e?.scene || !e.active) continue;
      if (e.hp <= 0 || e.dying || e.state2 === 'ko') continue;
      n++;
    }
    return n;
  },

  /** Aucun défilement tant qu'un ennemi est encore en jeu. */
  _canScrollLevel() {
    return this._livingEnemies() === 0;
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
    if (this.phase === 'boss' || this.phase === 'go_wait') return;
    if (this._pendingWaveEnter || this._segmentTransition) return;
    if (this._livingEnemies() > 0) return;
    this._levelHygiene();
    // Niveau plein écran continu : la progression (vagues / boss) est pilotée par _fsProgress.
    if (this.lv?.layers?.fullStage && !this.lv.testArena) return;
    if (this.lv?.layers?.fullStage && this.lv.testArena) {
      const st = this.lv.stages[this.stageIdx];
      if (this.waveIdx < st.waves.length - 1) {
        this.waveIdx++;
        this._spawnWaveEnemies(st.waves[this.waveIdx], true);
        return;
      }
      this.phase = 'win';
      this.victory();
      return;
    }
    const st = this.lv.stages[this.stageIdx];
    if (this.waveIdx < st.waves.length - 1) {
      this._pendingWaveEnter = true;
      this._waveScrollAccum = 0;
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
    this._segmentCleared = true;
    this._tryShowGoExit();
  },

  _playerInScrollZone() {
    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (p?.active && p.hp > 0 && p.x >= SCROLL_ZONE_MIN_X) return true;
    }
    return false;
  },

  _maxPlayerWalkSpeed() {
    let max = 150;
    for (let slot = 0; slot < this.playerCount(); slot++) {
      max = Math.max(max, this.cfgAt(slot)?.speed ?? 0);
    }
    return max;
  },

  /** Vitesse de scroll pilotée par le joueur dans la zone droite (0 si inactif). */
  _playerDriveScrollSpeed(maxSpeed) {
    if (!this._canScrollLevel()) return 0;
    if (!this._playerInScrollZone() || !this._isPlayerAdvancing()) return 0;
    let deepest = 0;
    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (!p?.active || p.hp <= 0) continue;
      deepest = Math.max(deepest, p.x);
    }
    const zoneW = W - SCROLL_ZONE_MIN_X;
    const t = zoneW > 0 ? Phaser.Math.Clamp((deepest - SCROLL_ZONE_MIN_X) / zoneW, 0, 1) : 1;
    const push = t * t;
    const scaled = maxSpeed * (0.72 + push * 0.28);
    const floor = this._maxPlayerWalkSpeed() * (SCROLL_FASTER_THAN_PLAYER + push * 0.38);
    return Math.max(scaled, floor);
  },

  _isPlayerAdvancing() {
    for (let slot = 0; slot < this.playerCount(); slot++) {
      const p = this.playerAt(slot);
      if (!p?.active || p.hp <= 0) continue;
      const bodyVx = p.body?.velocity?.x ?? 0;
      if (bodyVx > 28) return true;
      const pad = padForPlayer(this, slot);
      if (!pad) continue;
      const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      if (ax > 0.32 || (pad.buttons[PAD.RIGHT] && pad.buttons[PAD.RIGHT].pressed)) return true;
    }
    return false;
  },

  _tryShowGoExit() {
    if (!this._segmentCleared || this._livingEnemies() > 0 || this._segmentTransition) return;
    if (this.phase === 'go_wait') return;
    if (this._isPlayerAdvancing()) {
      this._goIdleSince = null;
      return;
    }
    if (!this._goIdleSince) this._goIdleSince = this.time.now;
    if (this.time.now - this._goIdleSince < GO_IDLE_MS) return;
    this.showGoExit();
  },

  _shiftWorld(dx, { skipPlayers = false, skipBg = false } = {}) {
    if (dx <= 0 || !this._canScrollLevel()) return;
    const shiftGroup = (g) => {
      if (!g?.getChildren) return;
      for (const o of g.getChildren()) {
        if (o?.active) o.x -= dx;
      }
    };
    if (!skipBg) {
      shiftGroup(this.bgFarGroup);
      shiftGroup(this.bgMainGroup);
      shiftGroup(this.bgRoadGroup);
      shiftGroup(this.bgAmbientGroup);
    }
    shiftGroup(this.decorGroup);
    shiftGroup(this.props);
    shiftGroup(this.pickups);
    shiftGroup(this.fires);
    shiftGroup(this.hazards);
    shiftGroup(this.enemies);
    shiftGroup(this.bullets);
    if (!skipPlayers) {
      for (const p of this.allPlayers()) {
        if (p?.active) p.x -= dx;
      }
    }
    if (this.bg) this.bg.tilePositionX += dx;
  },

  updateLevelScroll(delta) {
    if (this.phase !== 'fight' && this.phase !== 'go_wait') return;
    if (this._policeActive) return;

    if (this.lv?.layers?.fullStage && !this.lv.testArena) {
      this._updateFullStageScroll(delta);
      return;
    }

    if (!this._canScrollLevel()) {
      this._scrollSpeed = 0;
      if (this._pendingWaveEnter) {
        this._pendingWaveEnter = false;
        this._waveScrollAccum = 0;
      }
      if (this._segmentCleared && !this._segmentTransition) {
        this._segmentCleared = false;
        this._goIdleSince = null;
        this.cancelGoExit();
        if (this.phase === 'go_wait') this.phase = 'fight';
      }
      return;
    }

    const playerDrives = this._playerInScrollZone() && this._isPlayerAdvancing();

    if (this._segmentTransition) {
      this._scrollSpeed = SEGMENT_SCROLL_PX_S;
    } else if (this._pendingWaveEnter) {
      this._scrollSpeed = this._playerDriveScrollSpeed(SOFT_SCROLL_PX_S);
    } else if (this._segmentCleared) {
      this._scrollSpeed = 0;
      this._tryShowGoExit();
      return;
    } else {
      this._scrollSpeed = 0;
      return;
    }

    if (this._scrollSpeed <= 0) return;

    let dx = (this._scrollSpeed * delta) / 1000;
    const skipPlayers = !!(this._segmentTransition || (playerDrives && this._pendingWaveEnter));

    if (this._segmentTransition) {
      const target = this._segScrollTarget || SEGMENT_CHANGE_SCROLL_PX;
      const remaining = target - (this._segScrollAccum || 0);
      dx = Math.min(dx, remaining);
      if (dx <= 0) return;
      this._shiftWorld(dx, { skipPlayers });
      this._segScrollAccum = (this._segScrollAccum || 0) + dx;
      if (this._segScrollAccum >= target - 0.5) {
        this._finishSegmentTransition();
      }
    } else {
      this._shiftWorld(dx, { skipPlayers });
      if (this._pendingWaveEnter) {
        this._waveScrollAccum = (this._waveScrollAccum || 0) + dx;
        if (this._waveScrollAccum >= WAVE_SPAWN_SCROLL_PX) {
          this._waveScrollAccum = 0;
          this._pendingWaveEnter = false;
          this._scrollSpeed = 0;
          const st = this.lv.stages[this.stageIdx];
          if (this.waveIdx < st.waves.length - 1) {
            this.waveIdx++;
            this._spawnWaveEnemies(st.waves[this.waveIdx], true);
          }
        }
      }
    }

    this._cleanupScrolledOut();
    this._trimStaleAmbient?.();
  },

  /** Transition entre stages — niveaux classiques uniquement (les niveaux plein écran
   * défilent en continu via _updateFullStageScroll, sans notion de « fin de stage »). */
  _finishSegmentTransition() {
    const nextIdx = this._scrollNextIdx;
    this._segmentTransition = false;
    this._segScrollAccum = 0;
    this._segScrollTarget = 0;
    this._scrollSpeed = 0;
    this._segmentCleared = false;
    this._goIdleSince = null;
    this._scrollNextIdx = null;
    this._pruneScrolledLayers();
    this._levelHygiene();
    if (nextIdx != null) {
      this.stageIdx = nextIdx;
      this.startStage(true, { startWaveIdx: 0 });
    }
  },

  beginSegmentTransition() {
    if (this._segmentTransition) return;
    const nextIdx = this.stageIdx + 1;
    this.cancelGoExit();
    this.phase = 'fight';
    this._goIdleSince = null;

    if (nextIdx >= this.lv.stages.length) {
      this._segmentCleared = false;
      this.spawnBoss();
      return;
    }

    this._segmentTransition = true;
    this._segScrollAccum = 0;
    this._segScrollTarget = SEGMENT_CHANGE_SCROLL_PX;
    this._scrollNextIdx = nextIdx;
  },

  cancelGoExit() {
    if (this.goExitLabel) {
      this.goExitLabel.destroy();
      this.goExitLabel = null;
    }
  },

  showGoExit() {
    if (this.phase === 'go_wait') return;
    if (this._pendingWaveEnter || this._segmentTransition || this._livingEnemies() > 0) return;
    if (!this._segmentCleared) return;
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
      this._segmentCleared = false;
      this._goIdleSince = null;
      return;
    }
    if (!this._isPlayerAdvancing()) return;
    const alive = this.activePlayers();
    if (!alive.length) return;
    if (!alive.every((p) => p.x >= GO_TRIGGER_X)) return;
    this.beginSegmentTransition();
  },

  _trimStaleAmbient() {
    if (!this.bgAmbientGroup) return;
    for (const o of [...this.bgAmbientGroup.getChildren()]) {
      if (o?.active && o.x < W * 0.15) {
        this._destroyScrollObject(this.bgAmbientGroup, o);
      }
    }
  },

  _hasLayerBackground() {
    const visible = (g) =>
      g?.getChildren?.().some((o) => o?.active && o.x > -W * 0.25 && o.x < W * 1.25);
    return visible(this.bgMainGroup) || visible(this.bgFarGroup) || visible(this.bgRoadGroup);
  },

  _cleanupScrolledOut() {
    const trim = (g, filter) => {
      if (!g) return;
      for (const o of [...g.getChildren()]) {
        if (!o) continue;
        if (filter && !filter(o)) continue;
        if (o.x < -W * 0.4) this._destroyScrollObject(g, o);
      }
    };
    // Fonds plein écran : ne détruire un segment que lorsqu'il est entièrement sorti
    // à gauche (x < -0.75·W ⇒ bord droit hors écran même avec un léger zoom éditeur).
    const bgFilter = this.lv?.layers?.fullStage
      ? (o) => {
          if (o.stagePartIdx == null) return true;
          return o.stagePartIdx < this.stageIdx && o.x < -W * 0.75;
        }
      : null;
    trim(this.bgFarGroup);
    trim(this.bgMainGroup, bgFilter);
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
