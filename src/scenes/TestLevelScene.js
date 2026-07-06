import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { CAMPAIGN_LEVELS } from '../config/levels.js';
import { padMenu, beginMenuPadGrace } from '../input/gamepad.js';
import { playMusic, sfx } from '../audio/globalAudio.js';

/** Menu temporaire — validation des niveaux campagne. */
export class TestLevelScene extends Phaser.Scene {
  constructor() {
    super('TestLevel');
  }

  update() {
    const m = padMenu(this, 0);
    if (!m) return;
    if (m.up) {
      this.mi = (this.mi + this.labels.length - 1) % this.labels.length;
      this.refresh(true);
    }
    if (m.down) {
      this.mi = (this.mi + 1) % this.labels.length;
      this.refresh(true);
    }
    if (m.confirm) this.go();
    if (m.back) this.scene.start('PlayMode');
  }

  create() {
    this.add.image(W / 2, H / 2, 'city0').setAlpha(0.35);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.65);
    this.add
      .text(W / 2, 56, 'TEST NIVEAUX', F(0, { fontSize: '30px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setStroke('#000', 6);
    this.add
      .text(W / 2, 88, 'Choisis un niveau à valider', F(0, { fontSize: '14px', color: COL.grey }))
      .setOrigin(0.5);

    this.labels = CAMPAIGN_LEVELS.map((lv, i) => `${i + 1}. ${lv.name}`);
    this.mi = 0;
    this.rows = this.labels.map((label, i) =>
      this.add
        .text(W / 2, 130 + i * 48, label, F(0, { fontSize: '20px', fontStyle: 'bold', color: COL.cream }))
        .setOrigin(0.5)
        .setStroke('#000', 5)
        .setInteractive()
        .on('pointerover', () => {
          this.mi = i;
          this.refresh();
        })
        .on('pointerdown', () => {
          this.mi = i;
          this.go();
        })
    );

    this.add
      .text(W / 2, H - 36, '↑ ↓ choisir   ✕ valider   ○ retour', F(0, { fontSize: '14px', color: COL.grey }))
      .setOrigin(0.5);
    playMusic(this, 'music_title');
    beginMenuPadGrace(this);
    this.refresh();
  }

  refresh(nav = false) {
    if (nav) sfx(this, 'sfx_select');
    this.rows.forEach((r, i) => {
      const on = i === this.mi;
      r.setText((on ? '▶  ' : '   ') + this.labels[i]);
      r.setColor(on ? COL.gold : COL.cream);
      r.setScale(on ? 1.06 : 1);
    });
  }

  go() {
    sfx(this, 'sfx_confirm');
    this.scene.start('Select', { coop: false, testLevel: this.mi });
  }
}
