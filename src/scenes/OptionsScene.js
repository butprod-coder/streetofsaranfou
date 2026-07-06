import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { CONFIG, DIFFS, DIFF } from '../config/difficulty.js';
import { padMenu, beginMenuPadGrace } from '../input/gamepad.js';
import { playMusic, stopMusic, sfx } from '../audio/globalAudio.js';

export class OptionsScene extends Phaser.Scene {
  constructor() {
    super('Options');
  }

  update() {
    const m = padMenu(this);
    if (!m) return;
    if (m.up) {
      this.oi = (this.oi + this.entries.length - 1) % this.entries.length;
      sfx(this, 'sfx_select');
      this.refresh();
    }
    if (m.down) {
      this.oi = (this.oi + 1) % this.entries.length;
      sfx(this, 'sfx_select');
      this.refresh();
    }
    if (m.confirm) this.choose();
    if (m.back) this.scene.start('Title');
  }

  create() {
    this.add.image(W / 2, H / 2, 'city1').setAlpha(0.4);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.6);
    this.add
      .text(W / 2, 70, 'OPTIONS', F(0, { fontSize: '34px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setStroke('#000', 6);
    const dkeys = Object.keys(DIFFS);
    this.entries = [
      {
        get: () => 'Difficulté :  ' + DIFF().label + '  (' + DIFF().lives + ' vies)',
        act: () => {
          const i = dkeys.indexOf(CONFIG.diff);
          CONFIG.diff = dkeys[(i + 1) % dkeys.length];
        },
      },
      {
        get: () => 'Son :  ' + (CONFIG.sound ? 'ON' : 'OFF'),
        act: () => {
          CONFIG.sound = !CONFIG.sound;
          if (!CONFIG.sound) stopMusic();
          else playMusic(this, 'music_title');
        },
      },
      {
        get: () => 'Secousses caméra :  ' + (CONFIG.shake ? 'ON' : 'OFF'),
        act: () => {
          CONFIG.shake = !CONFIG.shake;
        },
      },
      { get: () => 'RETOUR', act: () => this.scene.start('Title') },
    ];
    this.oi = 0;
    this.rows = this.entries.map((e, i) =>
      this.add
        .text(W / 2, 200 + i * 54, '', F(0, { fontSize: '24px', color: COL.cream }))
        .setOrigin(0.5)
        .setStroke('#000', 4)
        .setInteractive()
        .on('pointerover', () => {
          this.oi = i;
          this.refresh();
        })
        .on('pointerdown', () => this.choose())
    );
    this.add
      .text(
        W / 2,
        400,
        'Manette : Stick déplacer · ○ attaque · ✕ saut · □ spécial · △ police · Options pause',
        F(0, { fontSize: '15px', color: COL.grey })
      )
      .setOrigin(0.5);
    this.add
      .text(W / 2, 470, '↑ ↓ choisir   ✕ valider   ○ retour', F(0, { fontSize: '14px', color: COL.grey }))
      .setOrigin(0.5);
    playMusic(this, 'music_title');
    beginMenuPadGrace(this);
    this.refresh();
  }

  choose() {
    sfx(this, 'sfx_confirm');
    this.entries[this.oi].act();
    this.refresh();
  }

  refresh() {
    this.rows.forEach((r, i) => {
      r.setText((i === this.oi ? '▶  ' : '   ') + this.entries[i].get());
      r.setColor(i === this.oi ? COL.gold : COL.cream);
    });
  }
}
