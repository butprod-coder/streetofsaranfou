import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM, COL, F } from '../config/gameConfig.js';
import { CHARACTERS } from '../config/characters.js';
import { LEVELS } from '../config/levels.js';
import { CONFIG, DIFF } from '../config/difficulty.js';
import { PAD_COOP_BINDINGS } from '../config/coopInput.js';
import { mainKeyForStage } from '../config/levelLayers.js';
import { combatMixin } from '../game/combat.js';
import { stageMixin } from '../game/stage.js';
import { hudMixin } from '../game/hud.js';
import { policeMixin } from '../game/police.js';
import { decorMixin } from '../game/decor.js';
import { aiMixin } from '../game/ai.js';
import { enemyAttacksMixin } from '../game/enemyAttacks.js';
import { bossAIMixin } from '../game/bossAI.js';
import { fighterMixin } from '../game/fighter.js';
import { inputMixin } from '../game/input.js';
import { audioMixin } from '../game/audio.js';
import { specialsMixin } from '../game/specials.js';
import { pauseMixin } from '../game/pause.js';
import { grabMixin } from '../game/grab.js';
import { karonuxBossMixin } from '../game/bosses/karonuxBoss.js';
import { playersMixin } from '../game/players.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(d) {
    this.coop = d.coop || false;
    this.charKey = d.charKey;
    this.charKey2 = d.charKey2;
    this.levelIdx = d.level || 0;
    this.testBoss = !!d.testBoss;
    this.score = d.score || 0;
    this.lives = d.lives != null ? d.lives : DIFF().lives;
    this.lives2 = d.lives2 != null ? d.lives2 : DIFF().lives;
    this.coopInputBindings = d.coopInputBindings
      ? structuredClone(d.coopInputBindings)
      : this.coop
        ? structuredClone(PAD_COOP_BINDINGS)
        : null;
  }

  create() {
    const lv = LEVELS[this.levelIdx];
    if (!lv) {
      dbgLog('create: niveau ' + this.levelIdx + ' inexistant -> retour Title');
      this.scene.start('Title');
      return;
    }
    this.lv = lv;
    this._won = false;
    this._specialActive = [false, false];
    this.lastAttack = 0;
    this.lastAttack2 = 0;
    this.combo = 0;
    this.combo2 = 0;
    this.lastComboT = 0;
    this.lastComboT2 = 0;

    if (lv.layers) {
      const mainKey = mainKeyForStage(lv.layers, 0);
      if (lv.layers.fullStage || (lv.layers.road && this.textures.exists(lv.layers.road))) {
        this._applyWalkBand(this._layerMetrics(lv.layers, mainKey));
      }
    }

    this.bgFarGroup = this.add.group();
    this.bgMainGroup = this.add.group();
    this.bgRoadGroup = this.add.group();
    this.bgAmbientGroup = this.add.group();
    this.decorGroup = this.add.group();
    this.enemies = this.add.group();
    this.bullets = this.add.group();
    this.props = this.add.group();
    this.pickups = this.add.group();
    this.fires = this.add.group();
    this.hazards = this.add.group();

    if (lv.layers) {
      if (!lv.layers.fullStage) {
        this.add.rectangle(W / 2, H / 2, W, H, lv.skyTop || 0x1a2048).setDepth(0);
      }
      const decorStage = this.testBoss ? Math.max(0, lv.stages.length - 1) : 0;
      this.spawnDecor({
        stageIdx: decorStage,
        clear: true,
        enter: false,
        skipProps: true,
        skipCrates: true,
      });
    } else if (this.textures.exists(lv.bgImg || 'city' + this.levelIdx)) {
      this.bg = this.add.tileSprite(
        W / 2,
        H / 2,
        W,
        H,
        lv.bgImg && this.textures.exists(lv.bgImg) ? lv.bgImg : 'city' + this.levelIdx
      );
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, lv.skyTop || 0x1a2048).setDepth(0);
    }

    this.cfg = CHARACTERS.find((c) => c.key === this.charKey);
    if (this.coop) this.cfg2 = CHARACTERS.find((c) => c.key === this.charKey2);

    this.spawnPlayer(0);
    if (this.coop) this.spawnPlayer(1);

    this.stageIdx = this.testBoss ? Math.max(0, lv.stages.length - 1) : 0;
    this.waveIdx = 0;
    this.phase = 'intro';
    this.boss = null;
    this.buildHUD();
    if (this.testBoss) {
      const bossName = lv.boss?.name ?? 'BOSS';
      this.banner('TEST BOSS\n' + bossName, () => this.spawnBoss());
    } else {
      this.banner('NIVEAU ' + (this.levelIdx + 1) + '\n' + lv.name, () => this.startStage(true));
    }
    this.setupPauseInput();
    if (this._wakeLoop && this.input) {
      this.input.off('pointerdown', this._wakeLoop);
    }
    this._wakeLoop = () => this.game?.loop?.wake?.();
    this.input?.on('pointerdown', this._wakeLoop);
    this.events.once('shutdown', () => {
      if (this.input && this._wakeLoop) this.input.off('pointerdown', this._wakeLoop);
      this.time.removeAllEvents();
      this.tweens.killAll();
      this._purgeSceneSounds?.();
      // Si un hit-stop était en cours, ne pas laisser l'AnimationManager global en pause
      if (this._hitStopUntil) {
        this._hitStopUntil = 0;
        this.anims.resumeAll();
      }
    });
    this.startFightMusic();
  }
}

Object.assign(
  GameScene.prototype,
  fighterMixin,
  playersMixin,
  specialsMixin,
  bossAIMixin,
  combatMixin,
  stageMixin,
  hudMixin,
  policeMixin,
  decorMixin,
  audioMixin,
  pauseMixin,
  grabMixin,
  karonuxBossMixin,
  aiMixin,
  enemyAttacksMixin,
  inputMixin
);
