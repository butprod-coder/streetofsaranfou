import Phaser from 'phaser';
import { IMG } from '../config/assets.js';
import {
  SHEETS,
  SHEETS_CUSTOM,
  FW,
  FH,
  FRAMES,
} from '../config/gameConfig.js';
import { LEVELS } from '../config/levels.js';
import {
  makeCity,
  makeSpark,
  makeBullet,
  makePoliceItem,
  makeProps,
  makeEnemyFx,
} from '../graphics/proceduralTextures.js';
import { registerProceduralSounds } from '../audio/registerSounds.js';
import { ensureGamepadPatch } from '../input/gamepadPatch.js';
import { ensureGamepadReady } from '../input/gamepad.js';
import { FRAME_ANIM_CHARS, frameAnimKeys, hasFrameAnim, FRAME_ANIM_TYPES } from '../config/frameAnims.js';
import { CHARLINGALS_BILL_FRAMES, CHARLINGALS_BILL_ANIM } from '../config/charlingalsBills.js';
import { TRISO_SPIT_FRAMES, TRISO_SPIT_ANIM } from '../config/trisoSlime.js';
import { PAPY_SMOKE_FRAMES, PAPY_SMOKE_ANIM } from '../config/papyJalaFx.js';
import { GUYLUX_CARD_KEY } from '../config/guyluxCards.js';
import { KARONUX_BOSS_FILES, karonuxBossTexKey, karonuxBossTexPath, createKaronuxBossAnims } from '../config/bossKaronux.js';
import { LEVEL1_TEXTURE_KEYS, LEVEL2_TEXTURE_KEYS, getLayerTextureKeys } from '../config/levelLayers.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('titlebg', IMG.titlebg);
    SHEETS.forEach((s) => {
      const sheetKey = s + '_sheet';
      if (!hasFrameAnim(s) || IMG[sheetKey]) {
        this.load.spritesheet(s, IMG[sheetKey], { frameWidth: FW, frameHeight: FH });
      }
      if (IMG[s + '_p']) this.load.image('p_' + s, IMG[s + '_p']);
    });
    SHEETS_CUSTOM.forEach(({ key, fw, fh }) => {
      this.load.spritesheet(key, IMG[key + '_sheet'], { frameWidth: fw, frameHeight: fh });
      this.load.image('p_' + key, IMG[key + '_p']);
    });
    this.load.image('level_bg_0', IMG.level_bg_0);
    this.load.image('level_bg_1', IMG.level_bg_1);
    ['obj_poubelle', 'obj_benne', 'obj_caisse', 'obj_baril', 'obj_brasero'].forEach((d) =>
      this.load.image(d, IMG[d])
    );
    this.load.image('skateboard', IMG.skateboard);
    [
      'cop_stand',
      'cop_walk1',
      'cop_walk2',
      'cop_rifle',
      'cop_rifle2',
      'cop_shoot1',
      'cop_shoot2',
      'cop_kneel',
      'cop_car',
      'cop_heli',
    ].forEach((k) => this.load.image(k, IMG[k]));
    [
      'sp_karonux_1',
      'sp_karonux_explo',
      'sp_karonux_fumee',
      'sp_karonux_sleep',
      'sp_jualos_pig1',
      'sp_jualos_pig2',
      'sp_jualos_pig3',
      'sp_yanu_wolf1',
      'sp_yanu_wolf2',
      'sp_yanu_wolf3',
      'sp_yanu_wolf4',
      'sp_lorenzo_cig1',
      'sp_lorenzo_cig2',
      'sp_lorenzo_cig3',
      'sp_jo_tornado1',
      'sp_jo_tornado2',
      'sp_jo_tornado3',
      'sp_kikor_roll1',
      'sp_kikor_roll2',
      'sp_kikor_roll3',
      'sp_kikor_roll4',
      'sp_kikor_roll5',
    ].forEach((k) => this.load.image(k, IMG[k]));
    this.load.image('crate0', IMG.crate0);
    this.load.image('crate1', IMG.crate1);
    this.load.image('crate2', IMG.crate2);
    this.load.image('chicken', IMG.chicken);
    this.load.image('chicken_gold', IMG.chicken_gold);
    this.load.image('w_couteau', IMG.w_couteau);
    this.load.image('w_batte', IMG.w_batte);
    this.load.image('w_tube', IMG.w_tube);
    this.load.image('w_cle', IMG.w_cle);
    this.load.image('w_chaine', IMG.w_chaine);
    this.load.image('w_barre', IMG.w_barre);
    this.load.image('w_pistolet', IMG.w_pistolet);
    this.load.image('w_uzi', IMG.w_uzi);
    this.load.image('w_pompe', IMG.w_pompe);
    this.load.image('w_flamme', IMG.w_flamme);
    this.load.image('w_bouteille', IMG.w_bouteille);
    frameAnimKeys().forEach((k) => this.load.image(k, IMG[k]));
    CHARLINGALS_BILL_FRAMES.forEach((k) => {
      if (IMG[k]) this.load.image(k, IMG[k]);
    });
    TRISO_SPIT_FRAMES.forEach((k) => {
      if (IMG[k]) this.load.image(k, IMG[k]);
    });
    PAPY_SMOKE_FRAMES.forEach((k) => {
      if (IMG[k]) this.load.image(k, IMG[k]);
    });
    if (IMG[GUYLUX_CARD_KEY]) this.load.image(GUYLUX_CARD_KEY, IMG[GUYLUX_CARD_KEY]);
    LEVEL1_TEXTURE_KEYS.forEach((k) => {
      if (IMG[k]) this.load.image(k, IMG[k]);
    });
    LEVEL2_TEXTURE_KEYS.forEach((k) => {
      if (IMG[k]) this.load.image(k, IMG[k]);
    });
    KARONUX_BOSS_FILES.forEach((f) => {
      this.load.image(karonuxBossTexKey(f), karonuxBossTexPath(f));
    });
    LEVELS.forEach((lv) => {
      getLayerTextureKeys(lv.layers).forEach((k) => {
        if (
          IMG[k] &&
          !LEVEL1_TEXTURE_KEYS.includes(k) &&
          !LEVEL2_TEXTURE_KEYS.includes(k)
        ) {
          this.load.image(k, IMG[k]);
        }
      });
    });
  }

  create() {
    SHEETS.forEach((s) => {
      const fa = FRAME_ANIM_CHARS[s];
      const hurt = s === 'gustavax' ? [20, 21] : FRAMES.hurt;
      if (!hasFrameAnim(s)) {
        this.anims.create({
          key: s + '_walk',
          frames: this.anims.generateFrameNumbers(s, { frames: FRAMES.walk }),
          frameRate: 10,
          repeat: -1,
        });
        this.anims.create({
          key: s + '_attack',
          frames: this.anims.generateFrameNumbers(s, { frames: FRAMES.attack }),
          frameRate: 16,
          repeat: 0,
        });
      }
      if (!fa?.jump) {
        this.anims.create({
          key: s + '_jump',
          frames: this.anims.generateFrameNumbers(s, { frames: FRAMES.jump }),
          frameRate: 12,
          repeat: 0,
        });
      }
      if (!fa?.hurt) {
        this.anims.create({
          key: s + '_hurt',
          frames: this.anims.generateFrameNumbers(s, { frames: hurt }),
          frameRate: 11,
          repeat: 0,
        });
      }
      if (!fa?.ko) {
        this.anims.create({
          key: s + '_ko',
          frames: this.anims.generateFrameNumbers(s, { frames: FRAMES.ko }),
          frameRate: 8,
          repeat: 0,
        });
      }
    });
    SHEETS_CUSTOM.forEach(({ key: s }) => {
      this.anims.create({
        key: s + '_walk',
        frames: this.anims.generateFrameNumbers(s, { frames: [5, 6, 7, 8, 9] }),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: s + '_attack',
        frames: this.anims.generateFrameNumbers(s, { frames: [10, 11, 12, 13] }),
        frameRate: 14,
        repeat: 0,
      });
      this.anims.create({
        key: s + '_jump',
        frames: this.anims.generateFrameNumbers(s, { frames: [15, 16, 17, 18] }),
        frameRate: 12,
        repeat: 0,
      });
      this.anims.create({
        key: s + '_hurt',
        frames: this.anims.generateFrameNumbers(s, { frames: [20, 21, 22] }),
        frameRate: 11,
        repeat: 0,
      });
      this.anims.create({
        key: s + '_ko',
        frames: this.anims.generateFrameNumbers(s, { frames: [25, 26, 27, 28, 29] }),
        frameRate: 8,
        repeat: 0,
      });
    });
    Object.entries(FRAME_ANIM_CHARS).forEach(([charKey, cfg]) => {
      for (const def of FRAME_ANIM_TYPES) {
        const frames = cfg[def.key];
        if (!frames?.length) continue;
        const rate = cfg[def.rate] ?? 10;
        this.anims.create({
          key: charKey + '_' + def.key,
          frames: frames.map((img) => ({ key: img })),
          frameRate: rate,
          repeat: def.repeat,
        });
      }
    });
    if (this.textures.exists(CHARLINGALS_BILL_FRAMES[0])) {
      this.anims.create({
        key: CHARLINGALS_BILL_ANIM,
        frames: CHARLINGALS_BILL_FRAMES.map((key) => ({ key })),
        frameRate: 14,
        repeat: -1,
      });
    }
    if (this.textures.exists(TRISO_SPIT_FRAMES[0])) {
      this.anims.create({
        key: TRISO_SPIT_ANIM,
        frames: TRISO_SPIT_FRAMES.map((key) => ({ key })),
        frameRate: 18,
        repeat: -1,
      });
    }
    if (this.textures.exists(PAPY_SMOKE_FRAMES[0])) {
      this.anims.create({
        key: PAPY_SMOKE_ANIM,
        frames: PAPY_SMOKE_FRAMES.map((key) => ({ key })),
        frameRate: 16,
        repeat: -1,
      });
    }
    LEVELS.forEach((lv, i) => makeCity(this, 'city' + i, lv));
    makeSpark(this);
    makeBullet(this);
    makeEnemyFx(this);
    makeProps(this);
    makePoliceItem(this);
    this.anims.create({
      key: 'feu_anim',
      frames: [{ key: 'feu0' }, { key: 'feu1' }],
      frameRate: 8,
      repeat: -1,
    });
    registerProceduralSounds(this);
    createKaronuxBossAnims(this);
    ensureGamepadPatch(this.game);
    ensureGamepadReady(this);
    this.scene.start('Title');
  }
}
