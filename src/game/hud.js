import Phaser from 'phaser';
import { W, COL, F, NUM } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';

const HUD = {
  depth: { panel: 8000, content: 8001, bar: 8002, bossPanel: 8998, bossContent: 8999, bossBar: 9000 },
  player: { panelW: 314, panelH: 80, hpW: 210, hpH: 12 },
  boss: { barY: 17, panelH: 34 },
};

function hpFillColor(ratio, accent) {
  if (ratio <= 0.22) return 0xff4444;
  if (ratio <= 0.42) return 0xffaa33;
  return accent;
}

/** GameScene mixin: hud.js */
export const hudMixin = {
  _bossHudLayout() {
    const sidePanel = HUD.player.panelW + 6;
    const pad = 10;
    const barY = HUD.boss.barY;
    const left = sidePanel + pad;
    const right = this.coop ? W - sidePanel - pad : W - pad;
    const barW = Math.max(220, Math.min(520, right - left));
    return { barY, left, barW, centerX: left + barW / 2, sidePanel };
  },

  _createHealthBar(x, y, width, height, accent, originX = 0) {
    const track = this.add
      .rectangle(x, y, width + 4, height + 6, 0x000000, 0.55)
      .setOrigin(originX, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bar - 1);
    const trackInner = this.add
      .rectangle(x + (originX === 1 ? -width : 0), y, width, height, 0x1a1018, 1)
      .setOrigin(originX, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bar - 1);
    trackInner.setStrokeStyle(1, 0x3a2838, 0.9);
    const fill = this.add
      .rectangle(x + (originX === 1 ? -width : 0), y, width, height - 2, accent)
      .setOrigin(originX, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bar);
    const shine = this.add
      .rectangle(x + (originX === 1 ? -width : 0), y - 2, width, Math.max(3, Math.floor(height * 0.35)), accent, 0.35)
      .setOrigin(originX, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bar + 1);
    return { track, trackInner, fill, shine, maxW: width, accent, originX, x, y };
  },

  _setHealthBar(bar, ratio) {
    if (!bar?.fill?.scene) return;
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    const w = bar.maxW * r;
    bar.fill.width = w;
    bar.fill.fillColor = hpFillColor(r, bar.accent);
    bar.shine.width = Math.max(0, w - 2);
    bar.shine.fillColor = bar.fill.fillColor;
  },

  _createPlayerPanel({ side, name, portraitKey, accent, hpColor, accentLabel }) {
    const isLeft = side === 'left';
    const panelX = isLeft ? 0 : W;
    const panelOriginX = isLeft ? 0 : 1;
    const innerX = isLeft ? 12 : W - 12;
    const portraitX = isLeft ? 38 : W - 38;
    const textAnchorX = isLeft ? 84 : W - 84;
    const textOrigin = isLeft ? 0 : 1;
    const barX = isLeft ? 84 : W - 84;
    const barOrigin = isLeft ? 0 : 1;

    const panel = this.add
      .rectangle(panelX, 0, HUD.player.panelW, HUD.player.panelH, 0x0a0712, 0.78)
      .setOrigin(panelOriginX, 0)
      .setScrollFactor(0)
      .setDepth(HUD.depth.panel);
    panel.setStrokeStyle(1, accent, 0.35);

    const accentStrip = this.add
      .rectangle(isLeft ? 0 : W, HUD.player.panelH - 2, HUD.player.panelW, 2, accent, 0.55)
      .setOrigin(panelOriginX, 1)
      .setScrollFactor(0)
      .setDepth(HUD.depth.panel + 1);

    const portraitFrame = this.add
      .rectangle(portraitX, 40, 62, 58, 0x000000, 0.35)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content);
    portraitFrame.setStrokeStyle(2, accent, 0.75);

    const portrait = this.add
      .image(portraitX, 40, portraitKey)
      .setDisplaySize(54, 46)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content + 1);

    const slotLabel = this.add
      .text(isLeft ? 14 : W - 14, 10, accentLabel, F(0, { fontSize: '10px', fontStyle: 'bold', color: accent }))
      .setOrigin(textOrigin, 0)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content);

    const nameT = this.add
      .text(textAnchorX, 16, name, F(0, { fontSize: '15px', fontStyle: 'bold', color: COL.cream }))
      .setOrigin(textOrigin, 0)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content)
      .setStroke('#000', 3);

    const hpBar = this._createHealthBar(barX, 44, HUD.player.hpW, HUD.player.hpH, hpColor, barOrigin);

    const hpText = this.add
      .text(textAnchorX, 56, '', F(0, { fontSize: '10px', color: COL.grey }))
      .setOrigin(textOrigin, 0)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content);

    const livesT = this.add
      .text(isLeft ? HUD.player.panelW - 14 : W - HUD.player.panelW + 14, 22, '', F(0, { fontSize: '13px', fontStyle: 'bold', color: COL.cream }))
      .setOrigin(isLeft ? 1 : 0, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content)
      .setStroke('#000', 3);

    return { panel, accentStrip, portraitFrame, portrait, slotLabel, nameT, hpBar, hpText, livesT, barX, isLeft };
  },

  _createPlayerScoreLabel() {
    return this.add
      .text(14, HUD.player.panelH + 2, 'SCORE 0', F(0, { fontSize: '11px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content)
      .setStroke('#000', 3);
  },

  buildHUD() {
    const p1 = this._createPlayerPanel({
      side: 'left',
      name: this.cfg.name,
      portraitKey: 'p_' + this.cfg.sheet,
      accent: COL.gold,
      hpColor: NUM('blood'),
      accentLabel: this.coop ? 'J1' : 'HERO',
    });
    this._p1Hud = p1;
    this.hpBar = p1.hpBar.fill;
    this.hpBarShine = p1.hpBar.shine;
    this._hpBar1 = p1.hpBar;
    this.hpText = p1.hpText;
    this.livesT = p1.livesT;
    this.scoreT = this._createPlayerScoreLabel();

    this.comboT = this.add
      .text(W / 2, 38, '', F(0, { fontSize: '17px', fontStyle: 'bold', color: COL.cyan }))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content)
      .setStroke('#000', 4);

    if (this.coop) {
      this.comboT2 = this.add
        .text(W / 2 + 96, 38, '', F(0, { fontSize: '17px', fontStyle: 'bold', color: COL.gold }))
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(HUD.depth.content)
        .setStroke('#000', 4);

      const p2 = this._createPlayerPanel({
        side: 'right',
        name: this.cfg2.name,
        portraitKey: 'p_' + this.cfg2.sheet,
        accent: COL.cyan,
        hpColor: NUM('cyan'),
        accentLabel: 'J2',
      });
      this._p2Hud = p2;
      this.hpBar2 = p2.hpBar.fill;
      this._hpBar2 = p2.hpBar;
      this.hpText2 = p2.hpText;
      this.livesT2 = p2.livesT;
    }

    this.policeT = this.add
      .text(W / 2, 54, '', F(0, { fontSize: '11px', fontStyle: 'bold', color: '#66aaff' }))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(HUD.depth.content)
      .setStroke('#000', 3);

    this.updateHUD();
  },

  _buildBossHud(name) {
    this._clearBossHud?.();
    const { barY, left, barW, centerX } = this._bossHudLayout();
    this.bossBarMaxW = barW;
    const nameY = 6;

    const panel = this.add
      .rectangle(centerX, HUD.boss.panelH / 2, barW + 24, HUD.boss.panelH, 0x0a0712, 0.72)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossPanel);
    panel.setStrokeStyle(1, NUM('blood'), 0.55);

    const bossTag = this.add
      .text(left, nameY, 'BOSS', F(0, { fontSize: '9px', fontStyle: 'bold', color: COL.blood }))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossContent)
      .setStroke('#000', 3);

    const nameT = this.add
      .text(centerX, nameY, name, F(0, { fontSize: '11px', fontStyle: 'bold', color: COL.cream }))
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossContent)
      .setStroke('#000', 4);

    const track = this.add
      .rectangle(left, barY, barW + 4, 14, 0x000000, 0.6)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossBar - 1);
    const trackInner = this.add
      .rectangle(left, barY, barW, 10, 0x2a1018, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossBar - 1);
    trackInner.setStrokeStyle(1, 0x5a2838, 0.85);

    this.bossBar = this.add
      .rectangle(left, barY, barW, 8, NUM('blood'))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossBar);

    this.bossBarShine = this.add
      .rectangle(left, barY - 1, barW, 3, 0xffffff, 0.22)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossBar + 1);

    this.bossHpText = this.add
      .text(left + barW, barY, '', F(0, { fontSize: '9px', fontStyle: 'bold', color: COL.grey }))
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD.depth.bossContent);

    this._bossHud = [panel, bossTag, nameT, track, trackInner, this.bossBar, this.bossBarShine, this.bossHpText];
  },

  _clearBossHud() {
    if (!this._bossHud?.length) {
      this.bossBar = null;
      this.bossBarShine = null;
      this.bossHpText = null;
      return;
    }
    for (const o of this._bossHud) {
      try {
        this.tweens.killTweensOf(o);
        o?.destroy?.();
      } catch (_) {}
    }
    this._bossHud = null;
    this.bossBar = null;
    this.bossBarShine = null;
    this.bossHpText = null;
  },

  updateHUD() {
    if (!this.player || !this._hpBar1?.fill?.scene) return;

    const r1 = Phaser.Math.Clamp(this.player.hp / this.player.hpMax, 0, 1);
    this._setHealthBar(this._hpBar1, r1);
    if (this.hpText) {
      this.hpText.setText(`${Math.ceil(this.player.hp)} / ${this.player.hpMax}`);
    }

    if (this.coop && this.player2 && this._hpBar2) {
      const r2 = Phaser.Math.Clamp(this.player2.hp / this.player2.hpMax, 0, 1);
      this._setHealthBar(this._hpBar2, r2);
      if (this.hpText2) {
        this.hpText2.setText(`${Math.ceil(this.player2.hp)} / ${this.player2.hpMax}`);
      }
      if (this.livesT2) this.livesT2.setText('♥ ' + Math.max(0, this.lives2));
    }

    this.scoreT.setText('SCORE ' + this.score.toLocaleString('fr-FR'));
    if (this.livesT) {
      this.livesT.setText(this.coop ? '♥ ' + Math.max(0, this.lives) : '♥ ' + Math.max(0, this.lives));
    }
    if (this.policeT && this.policeT.scene) {
      this.policeT.setText(CONFIG.policeCharges > 0 ? 'POLICE x' + CONFIG.policeCharges : '');
    }

    if (this.bossBar && this.boss && this.boss.active) {
      const ratio = Phaser.Math.Clamp(this.boss.hp / this.boss.hpMax, 0, 1);
      const maxW = this.bossBarMaxW ?? 500;
      const w = maxW * ratio;
      this.bossBar.width = w;
      this.bossBar.fillColor = hpFillColor(ratio, NUM('blood'));
      if (this.bossBarShine) {
        this.bossBarShine.width = Math.max(0, w - 2);
        this.bossBarShine.x = this.bossBar.x;
      }
      if (this.bossHpText) {
        this.bossHpText.setText(`${Math.ceil(this.boss.hp)} / ${this.boss.hpMax}`);
      }
    }
  },

  /** Compteur de chaîne de coups (combat.js) — pop animé à chaque coup au but. */
  _updateComboHud(slot, n) {
    const t = slot === 0 ? this.comboT : this.comboT2;
    if (!t || !t.scene) return;
    if (n < 2) {
      t.setText('');
      return;
    }
    const label = this.coop ? `J${slot + 1} · COMBO ×${n}` : `COMBO ×${n}`;
    t.setText(label);
    t.setScale(1.35);
    this.tweens.killTweensOf(t);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Quad.easeOut' });
  },

  updateWeaponHUD(slot = 0) {
    const p = this.playerAt(slot);
    if (!p) return;
    const wpnRef = slot === 0 ? 'wpnT' : 'wpnT2';
    const hud = slot === 0 ? this._p1Hud : this._p2Hud;
    const x = hud?.barX ?? (slot === 0 ? 84 : W - 84);
    const origin = hud?.isLeft ? 0 : 1;
    const y = 68;
    if (!this[wpnRef] || !this[wpnRef].scene) {
      if (!this.sys || !this.sys.isActive()) return;
      this[wpnRef] = this.add
        .text(x, y, '', F(0, { fontSize: '11px', fontStyle: 'bold', color: COL.gold }))
        .setOrigin(origin, 0)
        .setScrollFactor(0)
        .setDepth(HUD.depth.content)
        .setStroke('#000', 3);
    }
    try {
      this[wpnRef].setText(
        p.weapon ? 'ARME ' + p.weapon.kind.toUpperCase() + ' x' + p.weapon.uses : ''
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
        .setDepth(HUD.depth.bar + 2)
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
