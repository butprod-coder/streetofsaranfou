import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { padMenu, ensureGamepadReady, gamepadDebugInfo, beginMenuPadGrace } from '../input/gamepad.js';
import { playMusic, unlockAudio, sfx } from '../audio/globalAudio.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  update() {
    this.refreshPadStatus();
    const m = padMenu(this, 0);
    if (!m) return;
    if (m.confirm || m.left || m.right) unlockAudio(this);
    if (m.left) {
      this.mi = (this.mi + 2) % 3;
      this.refresh(true);
    }
    if (m.right) {
      this.mi = (this.mi + 1) % 3;
      this.refresh(true);
    }
    if (m.confirm) this.go();
  }

  create() {
    const img = this.add.image(W / 2, H / 2, 'titlebg');
    img.setScale(Math.max(W / img.width, H / img.height));
    this.add.rectangle(W / 2, 515, W, 50, 0x07040c, 0.6).setDepth(5);
    this.labels = ['JOUER', 'OPTIONS', 'CRÉDITS'];
    this.targets = ['PlayMode', 'Options', 'Credits'];
    const xs = [W * 0.30, W * 0.5, W * 0.70];
    this.items = [];
    this.mi = 0;
    this.labels.forEach((t, i) => {
      const o = this.add
        .text(xs[i], 515, t, F(0, { fontSize: '22px', fontStyle: 'bold', color: COL.cream }))
        .setOrigin(0.5)
        .setDepth(6)
        .setStroke('#000', 5);
      o.setInteractive()
        .on('pointerover', () => {
          this.mi = i;
          this.refresh();
        })
        .on('pointerdown', () => {
          this.mi = i;
          this.go();
        });
      this.items.push(o);
    });
    this.padStatus = this.add
      .text(W / 2, 538, '', F(0, { fontSize: '12px', color: COL.cream, align: 'center', lineSpacing: 4 }))
      .setOrigin(0.5)
      .setDepth(6);
    playMusic(this, 'music_title');
    this.input.once('pointerdown', () => unlockAudio(this));
    ensureGamepadReady(this);
    beginMenuPadGrace(this);
    this.refreshPadStatus();
    this.refresh();
  }

  refreshPadStatus() {
    if (!this.padStatus) return;
    const info = gamepadDebugInfo(this);
    if (info.count > 0) {
      this.padStatus.setText(`Manette OK (${info.count}) — ${info.hint}\n${info.active}`);
      this.padStatus.setColor(COL.cyan);
    } else {
      this.padStatus.setText(
        '1) Cliquez dans le jeu   2) Appuyez sur un bouton manette\n' + info.hint
      );
      this.padStatus.setColor(COL.blood);
    }
  }

  refresh(nav = false) {
    if (nav) sfx(this, 'sfx_select');
    this.items.forEach((o, i) => {
      const on = i === this.mi;
      o.setColor(on ? COL.gold : COL.cream);
      o.setScale(on ? 1.18 : 1);
    });
  }

  go() {
    sfx(this, 'sfx_confirm');
    this.scene.start(this.targets[this.mi]);
  }
}
