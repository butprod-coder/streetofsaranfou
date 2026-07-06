import Phaser from 'phaser';
import { W, H, COL, F } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';
import { LEVELS } from '../config/levels.js';
import { padMenu, padOf, PAD, beginMenuPadGrace } from '../input/gamepad.js';

/** GameScene mixin — menu pause (Start / Options). */
export const pauseMixin = {
  setupPauseInput() {
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-ESC', () => this.onPauseEsc());
      kb.on('keydown-UP', () => {
        if (this.phase === 'pause') this._pauseNav(-1);
      });
      kb.on('keydown-DOWN', () => {
        if (this.phase === 'pause') this._pauseNav(1);
      });
      kb.on('keydown-ENTER', () => {
        if (this.phase === 'pause') this._pauseChoose();
      });
      kb.on('keydown-G', () => this._tryToggleGod());
    }
    this._pauseBtnPrev = {};
    this._godPadPrev = false;
  },

  _tryToggleGod() {
    if (this.phase === 'intro' || this.phase === 'win' || this.phase === 'over') return;
    this.toggleGod();
  },

  checkGodToggle() {
    if (this.phase === 'intro' || this.phase === 'win' || this.phase === 'over') return false;

    const pad = padOf(this);
    if (!pad) return false;

    const l1 = pad.buttons[PAD.L1]?.pressed;
    const r1 = pad.buttons[PAD.R1]?.pressed;
    const opt = pad.buttons[PAD.OPTIONS]?.pressed;
    const combo = !!(l1 && r1 && opt);
    const edge = combo && !this._godPadPrev;
    this._godPadPrev = combo;
    if (edge) {
      this.toggleGod();
      return true;
    }
    return false;
  },

  onPauseEsc() {
    if (this.phase === 'win' || this.phase === 'over') return;
    if (this.phase === 'pause') {
      if (this._pauseMode === 'level') this._pauseShowMainMenu();
      else this.closePause();
    } else if (this.phase !== 'intro') {
      this.openPause();
    }
  },

  checkPauseToggle() {
    if (this.phase === 'win' || this.phase === 'over' || this.phase === 'intro' || this.phase === 'pause') return false;

    const pad = padOf(this);
    if (pad) {
      const l1r1Held =
        pad.buttons[PAD.L1]?.pressed && pad.buttons[PAD.R1]?.pressed;
      const startIdx = [PAD.OPTIONS, PAD.SHARE];
      for (const idx of startIdx) {
        const b = pad.buttons[idx];
        const pressed = b && b.pressed;
        const key = 'b' + idx;
        const edge = pressed && !this._pauseBtnPrev[key];
        this._pauseBtnPrev[key] = pressed;
        if (edge && !l1r1Held) {
          this.openPause();
          return true;
        }
      }
    }
    return false;
  },

  togglePause() {
    if (this.phase === 'pause') this.closePause();
    else this.openPause();
  },

  openPause() {
    if (this.phase === 'pause' || this.phase === 'win' || this.phase === 'over') return;
    this._pausePrevPhase = this.phase;
    this.phase = 'pause';
    this.physics.pause();
    this._pauseMode = 'menu';
    this._pauseIdx = 0;
    this._buildPauseShell();
    this._pauseShowMainMenu();
    if (this.sfx) this.sfx('select');
  },

  closePause() {
    if (this.phase !== 'pause') return;
    this.phase = this._pausePrevPhase || 'fight';
    this.physics.resume();
    this._destroyPauseUi();
    this._pauseMode = 'menu';
  },

  _buildPauseShell() {
    this._destroyPauseUi();
    this._pauseUi = this.add.container(0, 0).setScrollFactor(0).setDepth(97000);
    this._pauseDim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.68);
    this._pauseTitle = this.add
      .text(W / 2, 108, 'PAUSE', F(0, { fontSize: '34px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setStroke('#000', 6);
    this._pauseHint = this.add
      .text(W / 2, H - 36, '', F(0, { fontSize: '14px', color: COL.grey }))
      .setOrigin(0.5);
    this._pauseRows = [];
    this._pauseUi.add([this._pauseDim, this._pauseTitle, this._pauseHint]);
  },

  _destroyPauseUi() {
    if (this._pauseRows) {
      this._pauseRows.forEach((r) => {
        try { r.destroy(); } catch (_) {}
      });
    }
    this._pauseRows = [];
    if (this._pauseUi) {
      try { this._pauseUi.destroy(); } catch (_) {}
      this._pauseUi = null;
    }
  },

  _pauseShowMainMenu() {
    this._pauseMode = 'menu';
    this._pauseIdx = 0;
    this._pauseEntries = [
      { label: 'CONTINUER', act: () => this.closePause() },
      { label: 'MENU PRINCIPAL', act: () => this._pauseGoTitle() },
    ];
    if (CONFIG.god) {
      this._pauseEntries.push({ label: 'CHOISIR NIVEAU', act: () => this._pauseShowLevelMenu() });
    }
    this._pauseTitle.setText('PAUSE');
    this._pauseHint.setText('↑ ↓ choisir   ✕ valider   ○ retour');
    this._pauseRebuildRows();
    beginMenuPadGrace(this);
  },

  _pauseShowLevelMenu() {
    this._pauseMode = 'level';
    this._pauseIdx = this.levelIdx;
    this._pauseEntries = LEVELS.map((lv, i) => ({
      label: `NIVEAU ${i + 1} — ${lv.name}`,
      act: () => this._pauseGoLevel(i),
    }));
    this._pauseTitle.setText('GOD — NIVEAU');
    this._pauseHint.setText('↑ ↓ niveau   ✕ charger   ○ menu pause');
    this._pauseRebuildRows();
    beginMenuPadGrace(this);
    if (this.sfx) this.sfx('select');
  },

  _pauseRebuildRows() {
    this._pauseRows.forEach((r) => {
      try { r.destroy(); } catch (_) {}
    });
    this._pauseRows = [];
    const n = this._pauseEntries.length;
    const startY = this._pauseMode === 'level' ? 155 : 200;
    const step = this._pauseMode === 'level' ? 38 : 52;
    this._pauseEntries.forEach((entry, i) => {
      const y = startY + i * step;
      const row = this.add
        .text(W / 2, y, '', F(0, { fontSize: this._pauseMode === 'level' ? '19px' : '24px', color: COL.cream }))
        .setOrigin(0.5)
        .setStroke('#000', 4)
        .setInteractive()
        .on('pointerover', () => {
          this._pauseIdx = i;
          this._pauseRefreshRows();
        })
        .on('pointerdown', () => {
          this._pauseIdx = i;
          this._pauseChoose();
        });
      this._pauseUi.add(row);
      this._pauseRows.push(row);
    });
    this._pauseRefreshRows();
  },

  _pauseRefreshRows() {
    this._pauseRows.forEach((row, i) => {
      const on = i === this._pauseIdx;
      const label = this._pauseEntries[i].label;
      row.setText((on ? '▶  ' : '   ') + label);
      row.setColor(on ? COL.gold : COL.cream);
      if (this._pauseMode === 'level') row.setFontSize(on ? '20px' : '19px');
    });
  },

  _pauseNav(d) {
    const n = this._pauseEntries.length;
    this._pauseIdx = Phaser.Math.Wrap(this._pauseIdx + d, 0, n);
    if (this.sfx) this.sfx('select');
    this._pauseRefreshRows();
  },

  _pauseChoose() {
    const entry = this._pauseEntries[this._pauseIdx];
    if (!entry) return;
    if (this.sfx) this.sfx('confirm');
    entry.act();
  },

  _pauseGoTitle() {
    this.time.removeAllEvents();
    this.tweens.killAll();
    this._destroyPauseUi();
    this.scene.start('Title');
  },

  _pauseGoLevel(idx) {
    this.time.removeAllEvents();
    this.tweens.killAll();
    this._destroyPauseUi();
    this.scene.start('Game', this._gameStartData({ level: idx }));
  },

  updatePauseMenu() {
    if (this.phase !== 'pause') return false;
    const m = padMenu(this, 0, { allowStartConfirm: false });
    if (!m) return true;
    if (m.up) this._pauseNav(-1);
    if (m.down) this._pauseNav(1);
    if (m.confirm) this._pauseChoose();
    if (m.back) {
      if (this._pauseMode === 'level') this._pauseShowMainMenu();
      else this.closePause();
    }
    return true;
  },
};
