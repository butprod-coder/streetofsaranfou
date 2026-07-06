import Phaser from 'phaser';
import { W, COL, F, NUM } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';

/** GameScene mixin: hud.js */
export const hudMixin = {
  _bossHudLayout() {
    const sidePanel = 320;
    const pad = 12;
    const barY = 86;
    const left = sidePanel + pad;
    const right = this.coop ? W - sidePanel - pad : W - pad;
    const barW = Math.max(200, Math.min(500, right - left));
    return { barY, left, barW, centerX: left + barW / 2 };
  },

  buildHUD() {
    // J1 — haut gauche
    this.add.rectangle(0, 0, 320, 70, 0x0a0712, 0.55).setOrigin(0).setScrollFactor(0).setDepth(8000);
    this.add.image(40, 35, 'p_' + this.cfg.sheet).setDisplaySize(58, 50).setScrollFactor(0).setDepth(8001);
    this.add
      .text(80, 14, this.coop ? 'J1 ' + this.cfg.name : this.cfg.name, F(0, { fontSize: '16px', fontStyle: 'bold', color: COL.cream }))
      .setScrollFactor(0)
      .setDepth(8001);
    this.add.rectangle(80, 42, 200, 14, 0x33121a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(8001);
    this.hpBar = this.add.rectangle(80, 42, 200, 14, NUM('blood')).setOrigin(0, 0.5).setScrollFactor(0).setDepth(8002);

    // Score centre-haut
    this.scoreT = this.add
      .text(W / 2, 14, 'SCORE 0', F(0, { fontSize: '18px', color: COL.gold }))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(8001);
    this.comboT = this.add
      .text(W / 2, 40, '', F(0, { fontSize: '14px', color: COL.cyan }))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(8001);

    this.livesT = this.add
      .text(290, 34, '', F(0, { fontSize: '16px', color: COL.cream }))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(8001);
    this.policeT = this.add
      .text(W / 2, 58, '', F(0, { fontSize: '14px', color: '#4488ff' }))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(8001);

    if (this.coop) {
      // J2 — haut droite
      this.add.rectangle(W, 0, 320, 70, 0x0a0712, 0.55).setOrigin(1, 0).setScrollFactor(0).setDepth(8000);
      this.add
        .image(W - 40, 35, 'p_' + this.cfg2.sheet)
        .setDisplaySize(58, 50)
        .setScrollFactor(0)
        .setDepth(8001);
      this.add
        .text(W - 80, 14, 'J2 ' + this.cfg2.name, F(0, { fontSize: '16px', fontStyle: 'bold', color: COL.cyan }))
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(8001);
      this.add
        .rectangle(W - 280, 42, 200, 14, 0x33121a)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(8001);
      this.hpBar2 = this.add
        .rectangle(W - 280, 42, 200, 14, NUM('cyan'))
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(8002);
      this.livesT2 = this.add
        .text(W - 80, 34, '', F(0, { fontSize: '16px', color: COL.cream }))
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(8001);
    }

    this.updateHUD();
  },

  updateHUD() {
    if (!this.player || !this.hpBar || !this.hpBar.scene) return;
    const r1 = Phaser.Math.Clamp(this.player.hp / this.player.hpMax, 0, 1);
    this.hpBar.width = 200 * r1;
    this.hpBar.fillColor = r1 > 0.4 ? NUM('blood') : 0xffaa00;
    if (this.coop && this.player2 && this.hpBar2) {
      const r2 = Phaser.Math.Clamp(this.player2.hp / this.player2.hpMax, 0, 1);
      this.hpBar2.width = 200 * r2;
      this.hpBar2.fillColor = r2 > 0.4 ? NUM('cyan') : 0xffaa00;
      if (this.livesT2) this.livesT2.setText('♥ x' + Math.max(0, this.lives2));
    }
    this.scoreT.setText('SCORE ' + this.score);
    const comboTxt = [];
    if (this.combo > 1) comboTxt.push('J1 x' + this.combo);
    if (this.coop && this.combo2 > 1) comboTxt.push('J2 x' + this.combo2);
    this.comboT.setText(comboTxt.join('  '));
    if (this.livesT) {
      this.livesT.setText(this.coop ? 'J1 ♥' + Math.max(0, this.lives) : '♥ x' + Math.max(0, this.lives));
    }
    if (this.policeT && this.policeT.scene) {
      this.policeT.setText(CONFIG.policeCharges > 0 ? 'TEL x' + CONFIG.policeCharges : '');
    }
    if (this.bossBar && this.boss && this.boss.active) {
      const maxW = this.bossBarMaxW ?? 500;
      this.bossBar.width = maxW * Phaser.Math.Clamp(this.boss.hp / this.boss.hpMax, 0, 1);
    }
  },

  updateWeaponHUD(slot = 0) {
    const p = this.playerAt(slot);
    if (!p) return;
    const wpnRef = slot === 0 ? 'wpnT' : 'wpnT2';
    const y = slot === 0 ? 58 : 58;
    const x = slot === 0 ? 80 : W - 280;
    const origin = slot === 0 ? 0 : 0;
    if (!this[wpnRef] || !this[wpnRef].scene) {
      if (!this.sys || !this.sys.isActive()) return;
      this[wpnRef] = this.add
        .text(x, y, '', F(0, { fontSize: '13px', color: COL.gold }))
        .setOrigin(origin, 0)
        .setScrollFactor(0)
        .setDepth(8001);
      if (slot === 1) this[wpnRef].setOrigin(0, 0);
    }
    try {
      this[wpnRef].setText(
        p.weapon ? 'ARME: ' + p.weapon.kind.toUpperCase() + '  x' + p.weapon.uses : ''
      );
    } catch (e) {}
  },

  floatText(x, y, txt, col) {
    if (!this.sys || !this.sys.isActive()) return;
    const t = this.add
      .text(x, y, txt, F(0, { fontSize: '16px', fontStyle: 'bold', color: col }))
      .setOrigin(0.5)
      .setDepth(99999)
      .setStroke('#000', 4);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  },

  toggleGod() {
    CONFIG.god = !CONFIG.god;
    if (!this.godT) {
      this.godT = this.add
        .text(W / 2, 74, '', F(0, { fontSize: '15px', fontStyle: 'bold', color: COL.gold }))
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(8002)
        .setStroke('#000', 4);
    }
    this.godT.setText(CONFIG.god ? '☼ GOD MODE ☼' : '');
    for (const p of this.allPlayers()) {
      if (CONFIG.god) p.setTint(0xffe066);
      else p.clearTint();
    }
    const lead = this.player;
    this.floatText(lead ? lead.x : W / 2, (lead ? lead.y : 0) - 60, CONFIG.god ? 'GOD ON' : 'GOD OFF', COL.gold);
  },
};
