import Phaser from 'phaser';
import { W, H, COL, F, NUM } from '../config/gameConfig.js';
import { CHARACTERS } from '../config/characters.js';
import { PROGRESS } from '../config/difficulty.js';
import {
  padMenu,
  padConfirm,
  padStart,
  anyPadStart,
  connectedPads,
  padIndexForSlot,
  padLabel,
  beginMenuPadGrace,
} from '../input/gamepad.js';
import { TEST_LEVEL_INDEX, CAMPAIGN_LEVELS } from '../config/levels.js';
import { playMusic, sfx } from '../audio/globalAudio.js';

export class SelectScene extends Phaser.Scene {
  constructor() {
    super('Select');
  }

  init(data = {}) {
    this.coop = data.coop || false;
    this.testEnemies = data.testEnemies || false;
    this.testLevel = data.testLevel;
    this.testBossLevel = data.testBossLevel;
    this.coopInputBindings = data.coopInputBindings || null;
    this.idx1 = 0;
    this.idx2 = 1;
    this.p1Ready = false;
    this.p2Ready = false;
    this._mpb = {};
  }

  update() {
    if (this.coop) {
      this.updateCoopInput();
      return;
    }
    const m = padMenu(this, 0, { allowStartConfirm: false });
    if (m) {
      const per = this.per || 4;
      if (m.left) this.nav1(-1);
      if (m.right) this.nav1(1);
      if (m.up) this.nav1(-per);
      if (m.down) this.nav1(per);
      if (m.back) this.scene.start(this._selectBackScene());
      if (m.confirm) this.launchSingle();
    }
    if (anyPadStart(this)) this.launchSingle();
  }

  updateCoopInput() {
    const per = this.per || 4;

    if (!this.p1Ready) {
      const idx0 = padIndexForSlot(this, 0);
      if (idx0 >= 0) {
        const m0 = padMenu(this, idx0, { allowStartConfirm: false });
        if (m0) {
          if (m0.left) this.nav1(-1);
          if (m0.right) this.nav1(1);
          if (m0.up) this.nav1(-per);
          if (m0.down) this.nav1(per);
        }
        if (padConfirm(this, idx0)) this.lockP1();
      }
    }

    if (!this.p2Ready) {
      const idx1 = padIndexForSlot(this, 1);
      if (idx1 >= 0) {
        const m1 = padMenu(this, idx1, { allowStartConfirm: false });
        if (m1) {
          if (m1.left) this.nav2(-1);
          if (m1.right) this.nav2(1);
          if (m1.up) this.nav2(-per);
          if (m1.down) this.nav2(per);
        }
        if (padConfirm(this, idx1)) this.lockP2();
      }
    }

    if (this.p1Ready && this.p2Ready) {
      for (let slot = 0; slot < 2; slot++) {
        const idx = padIndexForSlot(this, slot);
        if (idx >= 0 && padStart(this, idx)) {
          this.launchCoop();
          return;
        }
      }
    }
  }

  create() {
    const bgKey = this.textures.exists('chene_maillard1')
      ? 'chene_maillard1'
      : this.textures.exists('arriere_plan')
        ? 'arriere_plan'
        : 'city0';
    const bg = this.add.image(W / 2, H / 2, bgKey);
    if (bgKey === 'chene_maillard1' || bgKey === 'arriere_plan') {
      bg.setScale(Math.max(W / bg.width, H / bg.height));
      this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.42);
    } else {
      bg.setAlpha(0.3);
      this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.6);
    }
    this.add
      .text(
        W / 2,
        28,
        this.testEnemies
          ? 'MODE TEST — 6 ENNEMIS'
          : this.testLevel != null
            ? 'TEST — ' + CAMPAIGN_LEVELS[this.testLevel].name
            : this.testBossLevel != null
              ? 'TEST BOSS — ' + (CAMPAIGN_LEVELS[this.testBossLevel].boss?.name ?? CAMPAIGN_LEVELS[this.testBossLevel].name)
              : this.coop
            ? 'CHOISIS VOS COMBATTANTS'
            : 'CHOISIS TON COMBATTANT',
        F(0, { fontSize: '25px', fontStyle: 'bold', color: COL.gold })
      )
      .setOrigin(0.5)
      .setStroke('#000', 6);

    if (this.coop) {
      this.j1CtrlLabel = this.add
        .text(120, 56, '', F(0, { fontSize: '13px', color: COL.gold }))
        .setOrigin(0, 0.5);
      this.j2CtrlLabel = this.add
        .text(W - 120, 56, '', F(0, { fontSize: '13px', color: COL.cyan }))
        .setOrigin(1, 0.5);
      this.refreshControlLabels();
    } else if (!connectedPads(this).length) {
      this.add
        .text(W / 2, 56, 'Branchez une manette et appuyez sur un bouton', F(0, { fontSize: '14px', color: COL.blood }))
        .setOrigin(0.5);
    }

    const cs = CHARACTERS;
    const per = 4;
    const cy = [150, 312];
    this.cards = [];
    this.per = per;

    cs.forEach((c, i) => {
      const row = Math.floor(i / per);
      const inRow = Math.min(per, cs.length - row * per);
      const pos = i - row * per;
      const x = W * ((pos + 1) / (inRow + 1));
      const y = cy[row];
      const locked = c.locked && !PROGRESS.gustavaxUnlocked;
      const g = this.add.container(x, y);
      const box = this.add.rectangle(0, 0, 176, 150, 0x161024, 0.92).setStrokeStyle(3, 0x3a2c55);
      const por = this.add.image(0, -34, 'p_' + c.sheet).setDisplaySize(96, 82);
      const nm = this.add
        .text(0, 28, locked ? '???' : c.name, F(0, { fontSize: '18px', fontStyle: 'bold', color: COL.cream }))
        .setOrigin(0.5);
      const sub = this.add
        .text(0, 50, locked ? 'VERROUILLÉ' : c.subtitle, F(0, { fontSize: '12px', color: locked ? COL.blood : COL.cyan }))
        .setOrigin(0.5);
      const mark1 = this.add.text(-72, -58, '', F(0, { fontSize: '14px', fontStyle: 'bold', color: COL.gold })).setOrigin(0.5);
      const mark2 = this.add.text(72, -58, '', F(0, { fontSize: '14px', fontStyle: 'bold', color: COL.cyan })).setOrigin(0.5);
      g.add([box, por, nm, sub, mark1, mark2]);
      if (locked) {
        por.setTint(0x0b0b14).setAlpha(0.5);
        g.add(this.add.text(0, -34, '[X]', { fontSize: '34px' }).setOrigin(0.5));
      }
      this.cards.push({ g, box, c, locked, mark1, mark2, blinkTween: null });
      box.setInteractive().on('pointerdown', () => {
        if (!this.coop) {
          this.idx1 = i;
          this.refresh();
          this.launchSingle();
        }
      });
    });

    this.dInfo = this.add
      .text(W / 2, 432, '', F(0, { fontSize: '15px', color: COL.cream, align: 'center', wordWrap: { width: 860 } }))
      .setOrigin(0.5);
    this.dStats = this.add
      .text(W / 2, 470, '', F(0, { fontSize: '15px', color: COL.grey }))
      .setOrigin(0.5);

    const hint = this.coop
      ? 'Croix/Carré pour valider chaque joueur   Options/Start pour lancer'
      : 'Croix directionnelle choisir   ✕ ou Start lancer   ○ retour';
    this.add.text(W / 2, 508, hint, F(0, { fontSize: '14px', color: COL.grey })).setOrigin(0.5);

    this.events.once('shutdown', () => {
      this._mpb = null;
      if (this.cards) this.cards.forEach((c) => this.stopBlink(c));
    });
    playMusic(this, 'music_title');
    beginMenuPadGrace(this);
    this.refresh();
  }

  bar(v, m) {
    const n = Math.round((v / m) * 7);
    return '█'.repeat(n) + '░'.repeat(7 - n);
  }

  _selectBackScene() {
    if (this.testBossLevel != null) return 'TestBoss';
    if (this.testLevel != null) return 'TestLevel';
    if (this.coop) return 'CoopInput';
    return 'PlayMode';
  }

  stopBlink(card) {
    if (card.blinkTween) {
      card.blinkTween.stop();
      card.blinkTween = null;
    }
    card.box.setAlpha(1);
  }

  startBlink(card, color) {
    this.stopBlink(card);
    card.blinkTween = this.tweens.add({
      targets: card.box,
      alpha: 0.45,
      duration: 450,
      yoyo: true,
      repeat: -1,
      onUpdate: () => card.box.setStrokeStyle(card.box._strokeThickness || 4, color),
    });
  }

  nav1(d) {
    if (this.coop && this.p1Ready) return;
    this.idx1 = Phaser.Math.Clamp(this.idx1 + d, 0, this.cards.length - 1);
    sfx(this, 'sfx_select');
    this.refresh();
  }

  nav2(d) {
    if (this.p2Ready) return;
    this.idx2 = Phaser.Math.Clamp(this.idx2 + d, 0, this.cards.length - 1);
    sfx(this, 'sfx_select');
    this.refresh();
  }

  refreshControlLabels() {
    if (!this.coop || !this.j1CtrlLabel) return;
    this.j1CtrlLabel.setText('J1 — ' + padLabel(this, 0));
    this.j2CtrlLabel.setText('J2 — ' + padLabel(this, 1));
  }

  refresh() {
    if (this.coop) this.refreshControlLabels();
    this.cards.forEach((c, i) => {
      const sel1 = i === this.idx1;
      const sel2 = this.coop && i === this.idx2;
      this.stopBlink(c);

      let stroke = 0x3a2c55;
      let thick = 3;
      if (sel1 && sel2) {
        stroke = NUM('gold');
        thick = 4;
      } else if (sel1) {
        stroke = NUM('gold');
        thick = this.p1Ready ? 5 : 4;
      } else if (sel2) {
        stroke = NUM('cyan');
        thick = this.p2Ready ? 5 : 4;
      }
      if (c.locked && (sel1 || sel2)) stroke = NUM('blood');

      c.box._strokeThickness = thick;
      c.box.setStrokeStyle(thick, stroke);
      c.g.setScale(sel1 || sel2 ? 1.045 : 0.96);

      if (this.coop) {
        if (sel1 && !this.p1Ready) this.startBlink(c, NUM('gold'));
        else if (sel2 && !this.p2Ready) this.startBlink(c, NUM('cyan'));
        c.mark1.setText(this.p1Ready && i === this.idx1 ? 'J1 ✓' : sel1 ? 'J1' : '');
        c.mark2.setText(this.p2Ready && i === this.idx2 ? 'J2 ✓' : sel2 ? 'J2' : '');
      } else {
        if (sel1) this.startBlink(c, NUM('gold'));
        c.mark1.setText('');
        c.mark2.setText('');
      }
    });

    const focus = this.coop && this.p2Ready && !this.p1Ready ? this.idx2 : this.idx1;
    const cd = this.cards[focus];
    const ch = cd.c;
    if (cd.locked) {
      this.dInfo.setColor(COL.blood).setText('GUSTAVAX — VERROUILLÉ : bats-le en boss final pour le débloquer.');
      this.dStats.setText('');
    } else {
      this.dInfo.setColor(COL.cream).setText(ch.name + ' « ' + ch.subtitle + ' » — ' + ch.blurb);
      this.dStats.setText(
        'VIE ' + this.bar(ch.hp, 210) + '    VIT ' + this.bar(ch.speed, 220) + '    DÉG ' + this.bar(ch.damage, 22)
      );
    }
  }

  launchSingle() {
    const cd = this.cards[this.idx1];
    if (cd.locked) {
      this.dInfo.setColor(COL.blood).setText('VERROUILLÉ — termine le jeu pour jouer Gustavax !');
      return;
    }
    if (!connectedPads(this).length) {
      this.dInfo.setColor(COL.blood).setText('Aucune manette détectée — branchez une manette.');
      return;
    }
    sfx(this, 'sfx_confirm');
    this.scene.start('Game', {
      charKey: cd.c.key,
      level: this.testLevel != null ? this.testLevel : this.testBossLevel != null ? this.testBossLevel : this.testEnemies ? TEST_LEVEL_INDEX : 0,
      testBoss: this.testBossLevel != null,
      score: 0,
    });
  }

  lockP1() {
    const cd = this.cards[this.idx1];
    if (cd.locked) {
      this.dInfo.setColor(COL.blood).setText('J1 — Gustavax verrouillé !');
      return;
    }
    this.p1Ready = true;
    sfx(this, 'sfx_confirm');
    this.refresh();
  }

  lockP2() {
    const cd = this.cards[this.idx2];
    if (cd.locked) {
      this.dInfo.setColor(COL.blood).setText('J2 — Gustavax verrouillé !');
      return;
    }
    this.p2Ready = true;
    sfx(this, 'sfx_confirm');
    this.refresh();
  }

  launchCoop() {
    if (!this.p1Ready || !this.p2Ready) {
      this.dInfo.setColor(COL.grey).setText('Les deux joueurs doivent valider leur perso avant Start.');
      return;
    }
    const c1 = this.cards[this.idx1].c;
    const c2 = this.cards[this.idx2].c;
    sfx(this, 'sfx_confirm');
    this.scene.start('Game', {
      coop: true,
      charKey: c1.key,
      charKey2: c2.key,
      coopInputBindings: this.coopInputBindings,
      level: 0,
      score: 0,
    });
  }
}
