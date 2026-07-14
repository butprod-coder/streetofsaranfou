import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { padMenu, beginMenuPadGrace } from '../input/gamepad.js';
import { playMusic, sfx } from '../audio/globalAudio.js';

export class PlayModeScene extends Phaser.Scene {
  constructor() {
    super('PlayMode');
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
    if (m.back) this.scene.start('Title');
  }

  create() {
    this.add.image(W / 2, H / 2, 'city0').setAlpha(0.35);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.65);
    this.add
      .text(W / 2, 90, 'MODE DE JEU', F(0, { fontSize: '32px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setStroke('#000', 6);

    this.labels = ['1 JOUEUR', '2 JOUEURS', 'TEST ENNEMIS', 'TEST NIVEAUX', 'TEST BOSS', 'ÉDITEUR DECOR', 'ALIGN STAGES'];
    this.mi = 0;
    this.rows = this.labels.map((label, i) =>
      this.add
        .text(W / 2, 178 + i * 46, label, F(0, { fontSize: '22px', fontStyle: 'bold', color: COL.cream }))
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
      .text(W / 2, 480, '↑ ↓ choisir   ✕ valider   ○ retour', F(0, { fontSize: '14px', color: COL.grey }))
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
      r.setScale(on ? 1.08 : 1);
    });
  }

  go() {
    sfx(this, 'sfx_confirm');
    if (this.mi === 0) {
      this.scene.start('Select', { coop: false });
    } else if (this.mi === 1) {
      this.scene.start('CoopInput');
    } else if (this.mi === 2) {
      this.scene.start('Select', { coop: false, testEnemies: true });
    } else if (this.mi === 3) {
      this.scene.start('TestLevel');
    } else if (this.mi === 4) {
      this.scene.start('TestBoss');
    } else if (this.mi === 5) {
      this.scene.start('LevelEditor');
    } else {
      this.scene.start('StageAlignEditor');
    }
  }
}
