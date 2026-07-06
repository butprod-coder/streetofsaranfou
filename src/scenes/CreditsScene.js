import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { padMenu, beginMenuPadGrace } from '../input/gamepad.js';

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  update() {
    const m = padMenu(this);
    if (!m) return;
    if (m.confirm || m.back) this.scene.start('Title');
  }

  create() {
    this.add.image(W / 2, H / 2, 'city0').setAlpha(0.4);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.62);
    this.add
      .text(W / 2, 70, 'CRÉDITS', F(0, { fontSize: '34px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setStroke('#000', 6);
    const lines = [
      ['STREETS OF SARANFOU', COL.cream, 20],
      ["Beat 'em up fan-made — moteur Phaser 3", COL.grey, 15],
      ['', COL.grey, 8],
      ['— LE CASTING —', COL.cyan, 17],
      ['Karonux le Fatigué · Jualos le Poporc · Yanu la Bête', COL.cream, 15],
      ['Lorenzo Crâne de Chmère · Jo la Mouk · Benjamin ? Présent !', COL.cream, 15],
      ['Gustavax', COL.blood, 16],
      ['', COL.grey, 8],
      ["Sprites & personnages : l'équipe SaranFou", COL.grey, 14],
    ];
    let y = 150;
    lines.forEach(([t, c, s]) => {
      this.add.text(W / 2, y, t, F(0, { fontSize: s + 'px', color: c })).setOrigin(0.5);
      y += s + 16;
    });
    this.add
      .text(W / 2, 490, '✕ ou ○ : retour', F(0, { fontSize: '14px', color: COL.grey }))
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('Title'));
    beginMenuPadGrace(this);
  }
}
