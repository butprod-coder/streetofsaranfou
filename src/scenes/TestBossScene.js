import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { TEST_BOSSES } from '../config/testBosses.js';
import { padMenu, beginMenuPadGrace } from '../input/gamepad.js';
import { playMusic, sfx } from '../audio/globalAudio.js';

/** Menu temporaire — test des combats de boss. */
export class TestBossScene extends Phaser.Scene {
  constructor() {
    super('TestBoss');
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
      .text(W / 2, 56, 'TEST BOSS', F(0, { fontSize: '30px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setStroke('#000', 6);
    this.add
      .text(W / 2, 88, 'Arène boss directe — choisis un adversaire', F(0, { fontSize: '14px', color: COL.grey }))
      .setOrigin(0.5);

    this.entries = TEST_BOSSES;
    this.labels = this.entries.map((e) => e.label);
    this.mi = 0;
    const startY = this.labels.length > 5 ? 118 : 130;
    const step = this.labels.length > 5 ? 42 : 48;
    this.rows = this.labels.map((label, i) =>
      this.add
        .text(W / 2, startY + i * step, label, F(0, { fontSize: '19px', fontStyle: 'bold', color: COL.cream }))
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

    this.hint = this.add
      .text(W / 2, H - 36, '↑ ↓ choisir   ✕ valider   ○ retour', F(0, { fontSize: '14px', color: COL.grey }))
      .setOrigin(0.5);
    playMusic(this, 'music_title');
    beginMenuPadGrace(this);
    this.refresh();
  }

  refresh(nav = false) {
    if (nav) sfx(this, 'sfx_select');
    const entry = this.entries[this.mi];
    this.rows.forEach((r, i) => {
      const on = i === this.mi;
      r.setText((on ? '▶  ' : '   ') + this.labels[i]);
      r.setColor(on ? COL.gold : COL.cream);
      r.setScale(on ? 1.06 : 1);
    });
    if (this.hint && entry) {
      this.hint.setText(`↑ ↓ choisir   ✕ valider   ○ retour\n${entry.levelName}`);
    }
  }

  go() {
    sfx(this, 'sfx_confirm');
    const entry = this.entries[this.mi];
    this.scene.start('Select', { coop: false, testBossLevel: entry.levelIdx });
  }
}
