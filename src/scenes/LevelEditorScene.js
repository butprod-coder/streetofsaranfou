import Phaser from 'phaser';
import { W, H, COL, F, FLOOR_TOP, FLOOR_BOTTOM } from '../config/gameConfig.js';
import { CAMPAIGN_LEVELS } from '../config/levels.js';
import { mainKeyForStage } from '../config/levelLayers.js';
import {
  CRATE_LOOT_OPTIONS,
  EDITOR_PALETTE,
  exportPlacementsBlob,
  getStagePlacements,
  importPlacementsFromObject,
  setStagePlacements,
} from '../config/levelPlacements.js';
import { sfx } from '../audio/globalAudio.js';
import { padMenu, padOf, padBtnEdge, PAD, beginMenuPadGrace } from '../input/gamepad.js';

const PALETTE_X = 8;
const CANVAS_X0 = 168;

/** Éditeur de placements décor + caisses (localStorage). */
export class LevelEditorScene extends Phaser.Scene {
  constructor() {
    super('LevelEditor');
  }

  init(data = {}) {
    this.levelIdx = Phaser.Math.Clamp(data.levelIdx ?? 0, 0, CAMPAIGN_LEVELS.length - 1);
    this.stageIdx = data.stageIdx ?? 0;
    this.paletteIdx = 0;
    this.placed = [];
    this.selected = null;
    this.dragging = false;
    this.lootIdx = 0;
  }

  create() {
    this.bgLayer = this.add.group();
    this.drawBackground();
    this.drawWalkBand();

    this.placedLayer = this.add.group();
    this.loadStagePlacements();

    this.buildSidebar();
    this.buildHud();

    this.input.on('pointerdown', (ptr) => this.onPointerDown(ptr));
    this.input.on('pointermove', (ptr) => this.onPointerMove(ptr));
    this.input.on('pointerup', () => {
      if (this.dragging) this.saveCurrent(false);
      this.dragging = false;
    });

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'application/json,.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => this.onImportFile());
    document.body.appendChild(this.fileInput);

    this.events.once('shutdown', () => {
      this.saveCurrent(false);
      this.fileInput?.remove();
    });

    this.refreshHud();
    this.refreshPaletteHighlight();
    beginMenuPadGrace(this, 280);
  }

  update() {
    const m = padMenu(this, 0);
    if (m) {
      if (m.up) this.changeLevel(-1);
      if (m.down) this.changeLevel(1);
      if (m.left) this.changeStage(-1);
      if (m.right) this.changeStage(1);
      if (m.back) this.exitEditor();
    }
    const pad = padOf(this, 0);
    if (!pad) return;
    if (padBtnEdge(this, 'ed', PAD.L1, pad)) this.changePalette(-1);
    if (padBtnEdge(this, 'ed', PAD.R1, pad)) this.changePalette(1);
    if (padBtnEdge(this, 'ed', PAD.TRIANGLE, pad)) this.cycleSelectedLoot();
    if (padBtnEdge(this, 'ed', PAD.ROND, pad)) this.deleteSelected();
    if (padBtnEdge(this, 'ed', PAD.CARRE, pad)) this.saveCurrent(true);
    if (padBtnEdge(this, 'ed', PAD.SHARE, pad)) this.exportJson();
    if (padBtnEdge(this, 'ed', PAD.OPTIONS, pad)) this.triggerImport();
  }

  drawBackground() {
    this.bgLayer.clear(true, true);
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    const layers = lv.layers;
    const bandH = H * 0.55;
    if (layers?.layoutThirds) {
      const mainKey = mainKeyForStage(layers, this.stageIdx);
      if (layers.far && this.textures.exists(layers.far)) {
        const far = this.add.image(W / 2, 0, layers.far).setOrigin(0.5, 0);
        far.setScale(W / far.width, bandH / far.height);
        this.bgLayer.add(far);
      }
      if (mainKey && this.textures.exists(mainKey)) {
        const main = this.add.image(W / 2, H - bandH * (layers.roadRatio ?? 0.55), mainKey).setOrigin(0.5, 1);
        main.setScale(W / main.width, (bandH * (layers.mainRatio ?? 0.45)) / main.height);
        this.bgLayer.add(main);
      }
      if (layers.road && this.textures.exists(layers.road)) {
        const road = this.add.image(W / 2, H, layers.road).setOrigin(0.5, 1);
        road.setScale(W / road.width, (bandH * (layers.roadRatio ?? 0.55)) / road.height);
        this.bgLayer.add(road);
      }
    } else if (layers?.fullStage && layers.stageParts?.length) {
      const key = layers.stageParts[Math.min(this.stageIdx, layers.stageParts.length - 1)];
      if (this.textures.exists(key)) {
        const img = this.add.image(W / 2, 0, key).setOrigin(0.5, 0);
        img.setScale(W / img.width, H / img.height);
        this.bgLayer.add(img);
      }
    } else if (layers && layers.far && this.textures.exists(layers.far)) {
      const far = this.add.image(W / 2, 0, lv.layers.far).setOrigin(0.5, 0);
      far.setScale(W / far.width, (H * 0.55) / far.height);
      this.bgLayer.add(far);
      if (lv.layers.road && this.textures.exists(lv.layers.road)) {
        const road = this.add.image(W / 2, H, lv.layers.road).setOrigin(0.5, 1);
        road.setScale(W / road.width, (H * 0.55) / road.height);
        this.bgLayer.add(road);
      }
    } else {
      const key = this.textures.exists(`city${this.levelIdx}`) ? `city${this.levelIdx}` : 'city0';
      const bg = this.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setAlpha(0.45);
      this.bgLayer.add(bg);
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712, 0.35).setDepth(1);
  }

  drawWalkBand() {
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    const layers = lv.layers;
    let floorTop = FLOOR_TOP;
    let floorBottom = FLOOR_BOTTOM;
    if (layers?.layoutThirds || layers?.fullStage) {
      const roadR = layers.roadRatio ?? 0.55;
      const roadBandH = H * roadR;
      const roadTop = H - roadBandH;
      const insetTop = layers.walkInsetTop ?? 0.12;
      const insetBottom = layers.walkInsetBottom ?? 10;
      floorTop = roadTop + roadBandH * insetTop;
      floorBottom = H - insetBottom;
    }
    this.add
      .rectangle(CANVAS_X0 + (W - CANVAS_X0) / 2, (floorTop + floorBottom) / 2, W - CANVAS_X0 - 8, floorBottom - floorTop, 0x44aa66, 0.12)
      .setDepth(2)
      .setStrokeStyle(1, 0x66cc88, 0.35);
    this.add
      .text(CANVAS_X0 + 8, floorTop - 14, 'Zone de jeu', F(0, { fontSize: '11px', color: COL.grey }))
      .setDepth(3);
  }

  buildSidebar() {
    this.add
      .rectangle(PALETTE_X + 76, H / 2, 152, H - 16, 0x120e1c, 0.92)
      .setStrokeStyle(2, 0x443366)
      .setDepth(9000)
      .setScrollFactor(0);
    this.add
      .text(PALETTE_X + 76, 18, 'OBJETS', F(0, { fontSize: '14px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setDepth(9001)
      .setScrollFactor(0);

    this.paletteRows = EDITOR_PALETTE.map((item, i) => {
      const y = 42 + i * 22;
      const label = item.isCrate ? '📦 Caisse' : item.key.replace('obj_', '');
      const row = this.add
        .text(PALETTE_X + 12, y, `${i + 1}. ${label}`, F(0, { fontSize: '11px', color: COL.cream }))
        .setDepth(9001)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.paletteIdx = i;
          this.refreshPaletteHighlight();
          sfx(this, 'sfx_select');
        });
      return row;
    });
  }

  buildHud() {
    this.hudTitle = this.add
      .text(CANVAS_X0 + 8, 8, '', F(0, { fontSize: '15px', fontStyle: 'bold', color: COL.gold }))
      .setDepth(9001)
      .setScrollFactor(0);
    this.hudStage = this.add
      .text(CANVAS_X0 + 8, 28, '', F(0, { fontSize: '12px', color: COL.cyan }))
      .setDepth(9001)
      .setScrollFactor(0);
    this.hudSel = this.add
      .text(CANVAS_X0 + 8, H - 72, '', F(0, { fontSize: '12px', color: COL.cream, wordWrap: { width: W - CANVAS_X0 - 16 } }))
      .setDepth(9001)
      .setScrollFactor(0);
    this.hudHelp = this.add
      .text(
        CANVAS_X0 + 8,
        H - 36,
        'Souris = placer / glisser   L1/R1 = objet   △ = loot   ○ = effacer   □ = sauver   Share = export   Options = import   ○ retour = quitter',
        F(0, { fontSize: '11px', color: COL.grey, wordWrap: { width: W - CANVAS_X0 - 16 } })
      )
      .setDepth(9001)
      .setScrollFactor(0);
  }

  refreshHud() {
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    const maxStage = Math.max(0, (lv.stages?.length ?? 1) - 1);
    this.stageIdx = Phaser.Math.Clamp(this.stageIdx, 0, maxStage);
    this.hudTitle.setText(`Niveau ${this.levelIdx + 1} — ${lv.name}`);
    this.hudStage.setText(`Segment ${this.stageIdx + 1}/${maxStage + 1}   ↑↓ niveau   ←→ segment`);
    const sel = this.selected?.entry;
    if (!sel) {
      this.hudSel.setText(`Objet actif : ${this.paletteLabel()}`);
      return;
    }
    if (sel.type === 'crate') {
      const loot = CRATE_LOOT_OPTIONS.find((o) => o.id === sel.loot)?.label ?? sel.loot;
      this.hudSel.setText(`Sélection : caisse @ (${Math.round(sel.x)}, ${Math.round(sel.y)}) — loot: ${loot}  (L pour changer)`);
    } else {
      this.hudSel.setText(`Sélection : ${sel.key} @ (${Math.round(sel.x)}, ${Math.round(sel.y)})`);
    }
  }

  paletteLabel() {
    const p = EDITOR_PALETTE[this.paletteIdx];
    return p?.isCrate ? 'Caisse' : p?.key ?? '?';
  }

  refreshPaletteHighlight() {
    this.paletteRows.forEach((row, i) => {
      row.setColor(i === this.paletteIdx ? COL.gold : COL.cream);
      row.setFontStyle(i === this.paletteIdx ? 'bold' : 'normal');
    });
    this.refreshHud();
  }

  changePalette(d) {
    this.paletteIdx = (this.paletteIdx + d + EDITOR_PALETTE.length) % EDITOR_PALETTE.length;
    sfx(this, 'sfx_select');
    this.refreshPaletteHighlight();
  }

  changeLevel(d) {
    this.saveCurrent(false);
    this.levelIdx = Phaser.Math.Clamp(this.levelIdx + d, 0, CAMPAIGN_LEVELS.length - 1);
    this.stageIdx = 0;
    sfx(this, 'sfx_select');
    this.redrawStage();
  }

  changeStage(d) {
    this.saveCurrent(false);
    const maxStage = Math.max(0, (CAMPAIGN_LEVELS[this.levelIdx].stages?.length ?? 1) - 1);
    this.stageIdx = Phaser.Math.Clamp(this.stageIdx + d, 0, maxStage);
    sfx(this, 'sfx_select');
    this.redrawStage();
  }

  redrawStage() {
    this.drawBackground();
    this.clearPlaced();
    this.loadStagePlacements();
    this.deselect();
    this.refreshHud();
  }

  clearPlaced() {
    this.placed.forEach((p) => p.sprite?.destroy());
    this.placed = [];
    this.placedLayer.clear(true, true);
  }

  loadStagePlacements() {
    const data = getStagePlacements(this.levelIdx, this.stageIdx);
    for (const d of data.decor) this.spawnDecorEntry(d);
    for (const c of data.crates) this.spawnCrateEntry(c);
  }

  spawnDecorEntry(d) {
    if (!this.textures.exists(d.key)) return;
    const spr = this.add.image(d.x, d.y, d.key).setOrigin(0.5, 1).setScale(d.scale ?? 1);
    spr.setDepth(Math.floor(d.y));
    this.placedLayer.add(spr);
    const entry = { type: 'decor', key: d.key, x: d.x, y: d.y, scale: d.scale ?? 1, sprite: spr };
    spr.setInteractive({ draggable: false, useHandCursor: true });
    spr.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.selectEntry(entry);
      this.dragging = true;
    });
    this.placed.push(entry);
  }

  spawnCrateEntry(c) {
    const spr = this.add.image(c.x, c.y, 'crate0').setOrigin(0.5, 1).setScale(0.92);
    spr.setDepth(Math.floor(c.y));
    this.placedLayer.add(spr);
    const entry = {
      type: 'crate',
      x: c.x,
      y: c.y,
      hp: c.hp ?? 3,
      loot: c.loot ?? 'random',
      sprite: spr,
    };
    spr.setInteractive({ useHandCursor: true });
    spr.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      this.selectEntry(entry);
      this.dragging = true;
    });
    this.placed.push(entry);
    this.updateCrateLabel(entry);
  }

  updateCrateLabel(entry) {
    if (!entry.label) {
      entry.label = this.add
        .text(entry.x, entry.y - 48, '', F(0, { fontSize: '10px', color: COL.gold, stroke: '#000', strokeThickness: 3 }))
        .setOrigin(0.5)
        .setDepth(entry.sprite.depth + 1);
    }
    const loot = CRATE_LOOT_OPTIONS.find((o) => o.id === entry.loot)?.label ?? entry.loot;
    entry.label.setText(loot);
    entry.label.setPosition(entry.x, entry.y - 42);
  }

  selectEntry(entry) {
    this.selected = entry;
    this.placed.forEach((p) => p.sprite?.setTint(p === entry ? 0xaaffcc : 0xffffff));
    if (entry.type === 'crate') {
      this.lootIdx = Math.max(0, CRATE_LOOT_OPTIONS.findIndex((o) => o.id === entry.loot));
    }
    sfx(this, 'sfx_select');
    this.refreshHud();
  }

  deselect() {
    this.selected = null;
    this.placed.forEach((p) => p.sprite?.clearTint());
    this.refreshHud();
  }

  clampY(y) {
    return Phaser.Math.Clamp(y, FLOOR_TOP + 20, FLOOR_BOTTOM - 4);
  }

  clampX(x) {
    return Phaser.Math.Clamp(x, CANVAS_X0 + 24, W - 24);
  }

  onPointerDown(ptr) {
    if (ptr.x < CANVAS_X0) return;
    if (this.selected && this.dragging) return;

    const hit = this.placed.find((p) => {
      const s = p.sprite;
      if (!s?.active) return false;
      const bounds = s.getBounds();
      return bounds.contains(ptr.x, ptr.y);
    });
    if (hit) {
      this.selectEntry(hit);
      this.dragging = true;
      return;
    }

    this.deselect();
    const pal = EDITOR_PALETTE[this.paletteIdx];
    const x = this.clampX(ptr.x);
    const y = this.clampY(ptr.y);
    if (pal.isCrate) {
      this.spawnCrateEntry({ x, y, hp: 3, loot: 'random' });
    } else if (this.textures.exists(pal.key)) {
      this.spawnDecorEntry({ key: pal.key, x, y, scale: pal.scale ?? 1 });
    }
    sfx(this, 'sfx_confirm');
    this.saveCurrent(false);
  }

  onPointerMove(ptr) {
    if (!this.dragging || !this.selected || ptr.x < CANVAS_X0) return;
    const x = this.clampX(ptr.x);
    const y = this.clampY(ptr.y);
    this.selected.x = x;
    this.selected.y = y;
    this.selected.sprite.setPosition(x, y);
    this.selected.sprite.setDepth(Math.floor(y));
    if (this.selected.label) this.updateCrateLabel(this.selected);
  }

  cycleSelectedLoot() {
    if (!this.selected || this.selected.type !== 'crate') return;
    this.lootIdx = (this.lootIdx + 1) % CRATE_LOOT_OPTIONS.length;
    this.selected.loot = CRATE_LOOT_OPTIONS[this.lootIdx].id;
    this.updateCrateLabel(this.selected);
    sfx(this, 'sfx_select');
    this.refreshHud();
    this.saveCurrent(false);
  }

  deleteSelected() {
    if (!this.selected) return;
    const idx = this.placed.indexOf(this.selected);
    if (idx >= 0) this.placed.splice(idx, 1);
    this.selected.label?.destroy();
    this.selected.sprite?.destroy();
    this.selected = null;
    sfx(this, 'sfx_select');
    this.refreshHud();
    this.saveCurrent(false);
  }

  serializeCurrent() {
    return {
      decor: this.placed.filter((p) => p.type === 'decor').map((p) => ({
        key: p.key,
        x: Math.round(p.x),
        y: Math.round(p.y),
        scale: p.scale,
      })),
      crates: this.placed.filter((p) => p.type === 'crate').map((p) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        hp: p.hp ?? 3,
        loot: p.loot ?? 'random',
      })),
    };
  }

  saveCurrent(withSfx) {
    setStagePlacements(this.levelIdx, this.stageIdx, this.serializeCurrent());
    if (withSfx) sfx(this, 'sfx_confirm');
  }

  exportJson() {
    this.saveCurrent(false);
    const url = URL.createObjectURL(exportPlacementsBlob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saranfou-placements.json';
    a.click();
    URL.revokeObjectURL(url);
    sfx(this, 'sfx_confirm');
  }

  triggerImport() {
    this.fileInput?.click();
  }

  onImportFile() {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (importPlacementsFromObject(obj)) {
          this.redrawStage();
          sfx(this, 'sfx_confirm');
        }
      } catch (_) {}
      this.fileInput.value = '';
    };
    reader.readAsText(file);
  }

  exitEditor() {
    this.saveCurrent(false);
    this.scene.start('PlayMode');
  }
}
