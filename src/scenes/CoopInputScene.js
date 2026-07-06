import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { padMenu, padConfirm, connectedPads, beginMenuPadGrace } from '../input/gamepad.js';
import { playMusic, sfx } from '../audio/globalAudio.js';

/** Assignation des 2 manettes avant le coop. */
export class CoopInputScene extends Phaser.Scene {
  constructor() {
    super('CoopInput');
  }

  init() {
    this.assignStep = 0;
    this.bindings = { slots: [] };
    this.padsReady = false;
  }

  update() {
    if (this.padsReady) {
      const m = padMenu(this, 0);
      if (m?.confirm) this.goSelect();
      if (m?.back) this.scene.start('PlayMode');
      return;
    }
    this.pollPadAssign();
    const m = padMenu(this, 0);
    if (m?.back) this.scene.start('PlayMode');
  }

  create() {
    this.add.image(W / 2, H / 2, 'city0').setAlpha(0.35);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.65);
    this.title = this.add
      .text(W / 2, 62, '2 MANETTES', F(0, { fontSize: '30px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setStroke('#000', 6);

    this.body = this.add
      .text(W / 2, 300, '', F(0, { fontSize: '17px', color: COL.cream, align: 'center', lineSpacing: 10 }))
      .setOrigin(0.5);

    this.hint = this.add
      .text(W / 2, 430, '', F(0, { fontSize: '14px', color: COL.grey, align: 'center', lineSpacing: 6 }))
      .setOrigin(0.5);

    playMusic(this, 'music_title');
    beginMenuPadGrace(this);
    this.updatePadPrompt();
  }

  updatePadPrompt() {
    const n = connectedPads(this).length;
    if (this.assignStep === 0) {
      this.body.setText(
        'Joueur 1 : appuyez Croix ou Carré sur votre manette.\n' +
          (n ? `${n} manette(s) détectée(s).` : 'Aucune manette — branchez les manettes.')
      );
      this.hint.setText('○ retour');
    } else if (this.assignStep === 1) {
      this.body.setText(
        'Joueur 1 : manette enregistrée ✓\n' +
          'Joueur 2 : appuyez Croix ou Carré sur une autre manette.'
      );
      this.hint.setText('○ retour');
    } else {
      this.body.setText('Les deux manettes sont assignées.\nPrêt pour la sélection des persos.');
      this.hint.setText('✕ continuer   ○ retour');
    }
  }

  pollPadAssign() {
    const pads = connectedPads(this);
    for (let i = 0; i < pads.length; i++) {
      if (!padConfirm(this, i)) continue;
      this.onPadChosen(pads[i]);
      break;
    }
  }

  onPadChosen(pad) {
    if (this.assignStep === 0) {
      this.bindings.slots[0] = { type: 'pad', padId: pad.id };
      this.assignStep = 1;
      sfx(this, 'sfx_confirm');
      this.updatePadPrompt();
      return;
    }
    if (this.assignStep === 1) {
      const j1 = this.bindings.slots[0];
      if (j1?.padId === pad.id) return;
      this.bindings.slots[1] = { type: 'pad', padId: pad.id };
      this.assignStep = 2;
      this.padsReady = true;
      sfx(this, 'sfx_confirm');
      this.updatePadPrompt();
    }
  }

  goSelect() {
    if (!this.padsReady) return;
    sfx(this, 'sfx_confirm');
    this.scene.start('Select', { coop: true, coopInputBindings: this.bindings });
  }
}
