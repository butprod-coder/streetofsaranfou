import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM, COL, F, NUM } from '../config/gameConfig.js';
import { ENEMY_TYPES } from '../config/enemies.js';
import { LEVELS } from '../config/levels.js';
import { CONFIG, PROGRESS } from '../config/difficulty.js';
import { dbgLog, showCrash } from '../debug/crashOverlay.js';

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
      this.add
        .rectangle(centerX, barY, barW + 6, 22, 0x000000, 0)
        .setStrokeStyle(2, 0xffffff, 0.6)
        .setScrollFactor(0)
        .setDepth(9000);
      this.bossBar = this.add
        .rectangle(left, barY, barW, 16, NUM('blood'))
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(9001);
      this.add
        .text(centerX, barY + 18, b.name, F(0, { fontSize: '13px', color: COL.cream }))
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(9001);
    });
  },

  _livingEnemies() {
    if (!this.enemies?.getChildren) return 0;
    return this.enemies.getChildren().filter((e) => e && e.scene && e.hp > 0).length;
  },

  checkClear() {
    if (this.phase === 'boss' || this.phase === 'go_wait' || this.phase === 'advance') return;
    if (this._pendingWaveSpawn) return;
    if (this._livingEnemies() > 0) return;
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
      this.tweens.killTweensOf(this.goExitLabel);
      this.goExitLabel.destroy();
      this.goExitLabel = null;
    }
  },

  showGoExit() {
    if (this.phase === 'go_wait' || this.phase === 'advance') return;
    if (this._pendingWaveSpawn || this._livingEnemies() > 0) return;
    this.phase = 'go_wait';
    const goY = FLOOR_TOP - 26;
    this.goExitLabel = this.add
      .text(GO_LABEL_X, goY, 'GO →', F(0, { fontSize: '30px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9000)
      .setStroke('#000', 5);
    this.tweens.add({
      targets: this.goExitLabel,
      alpha: 0.25,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  },

  updateGoExit() {
    if (this.phase !== 'go_wait') return;
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

    const slideLeft = (g) => {
      if (!g) return;
      g.getChildren().forEach((o) => {
        if (o && o.active) {
          this.tweens.add({
            targets: o,
            x: o.x - W,
            duration: dur,
            ease: STAGE_SCROLL_EASE,
          });
        }
      });
    };
    slideLeft(this.bgFarGroup);
    slideLeft(this.bgMainGroup);
    slideLeft(this.bgRoadGroup);
    slideLeft(this.bgAmbientGroup);
    slideLeft(this.decorGroup);
    slideLeft(this.props);
    slideLeft(this.pickups);
    slideLeft(this.fires);
    slideLeft(this.hazards);

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
      });
    }

    if (this.bg) {
      this.tweens.add({
        targets: this.bg,
        tilePositionX: this.bg.tilePositionX + W,
        duration: dur,
        ease: STAGE_SCROLL_EASE,
      });
    }

    this.time.delayedCall(dur, () => this._onStageScrollComplete());
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

  gameOver(){if(this.phase==='over')return;this.phase='over';this.physics.pause();this.sfx('gameover');
    this.banner('GAME OVER',()=>{this.add.text(W/2,H/2+70,'✕ ou Start pour rejouer',F(0,{fontSize:'20px',color:COL.cream})).setOrigin(0.5).setScrollFactor(0).setDepth(9600);
      const restartData=this.testBoss?{ testBossLevel:this.levelIdx }:this.coop?{ coop: true }:undefined;
      this._endAction=()=>this.scene.start(this.testBoss?'TestBoss':'PlayMode', restartData);});},

  victory(){if(this._won)return;this._won=true;dbgLog('victory: (levelIdx='+this.levelIdx+')');this.phase='win';this.physics.pause();this.sfx('victory');const isTest=this.lv.noBoss||this.testBoss;const next=!isTest&&(this.levelIdx+1)<LEVELS.length;dbgLog('victory: levelIdx='+this.levelIdx+' next='+next+' (LEVELS.length='+LEVELS.length+')');
    if(!next&&!isTest)PROGRESS.gustavaxUnlocked=true;
    const title=isTest?(this.testBoss?'BOSS VAINCU !':'TEST TERMINÉ !'):next?'VICTOIRE !':'TU AS FINI\nSTREETS OF SARANFOU !';
    this.banner(title,()=>{
      this.add.text(W/2,H/2+50,'SCORE  '+this.score,F(0,{fontSize:'24px',color:COL.gold})).setOrigin(0.5).setScrollFactor(0).setDepth(9600);
      if(!next&&!isTest)this.add.text(W/2,H/2+86,'GUSTAVAX EST DÉBLOQUÉ !',F(0,{fontSize:'18px',color:COL.blood})).setOrigin(0.5).setScrollFactor(0).setDepth(9600);
      const sub=this.testBoss?'✕ ou Start → test boss':isTest?'✕ ou Start → menu':next?'✕ ou Start → niveau suivant':'✕ ou Start → menu';
      this.add.text(W/2,H/2+(next&&!isTest?86:118),sub,F(0,{fontSize:'18px',color:COL.cream})).setOrigin(0.5).setScrollFactor(0).setDepth(9600);
      this._endAction=()=>{if(this.testBoss)this.scene.start('TestBoss');else if(isTest)this.scene.start('PlayMode');else if(next)this.scene.start('Game',this._gameStartData({ level: this.levelIdx + 1 }));else this.scene.start('Title');};});},

  banner(text,cb,col){const dim=this.add.rectangle(W/2,H/2,W,H,0x000000,0.6).setScrollFactor(0).setDepth(9500);
    const t=this.add.text(W/2,H/2,text,F(0,{fontSize:'36px',fontStyle:'bold',color:col||COL.gold,align:'center',lineSpacing:8})).setOrigin(0.5).setScrollFactor(0).setDepth(9501).setStroke('#000',6);
    this.time.delayedCall(1500,()=>{try{dim.destroy();t.destroy();if(cb){dbgLog('banner: exécution callback');cb();}}catch(e){showCrash('banner.callback',e);}});}
};
