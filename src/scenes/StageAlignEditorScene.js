import Phaser from 'phaser';
import { W, H, COL, F, FLOOR_TOP, FLOOR_BOTTOM } from '../config/gameConfig.js';
import { CAMPAIGN_LEVELS } from '../config/levels.js';
import { mainKeyForStage } from '../config/levelLayers.js';
import {
  DEFAULT_STAGE_ALIGN,
  exportStageAlignBlob,
  getStageAlign,
  importStageAlignFromObject,
  setStageAlign,
} from '../config/stageAlign.js';
import { sfx } from '../audio/globalAudio.js';
import { padMenu, padOf, padBtnEdge, PAD, beginMenuPadGrace } from '../input/gamepad.js';

const SIDEBAR_W = 178;
const CONTENT_X = SIDEBAR_W;
const CONTENT_W = W - SIDEBAR_W;
const NUDGE = 1;
const NUDGE_FAST = 6;
const STAGE_SCALE_STEP = 0.005;
const VIEW_ZOOM_STEP = 0.12;
const GOLD = 0xffcf4d;
const COMBAT_VIOLET = 0xaa55ee;

/** Éditeur d'alignement : tous les stages du niveau visibles en panorama. */
export class StageAlignEditorScene extends Phaser.Scene {
  constructor() {
    super('StageAlignEditor');
  }

  init(data = {}) {
    this.levelIdx = Phaser.Math.Clamp(data.levelIdx ?? 0, 0, CAMPAIGN_LEVELS.length - 1);
    this.stageIdx = 0;
    this.aligns = {};
    this.stageSprites = [];
    this.editorZoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.panning = false;
    this.dragging = false;
    this._dragStage = null;
    this._dragOffX = 0;
    this._dragOffY = 0;
    this._panStartX = 0;
    this._panStartY = 0;
    this._panStartPan = 0;
    this._panStartPanY = 0;
    this._spacePan = false;
    this._lastClickStage = -1;
    this._lastClickAt = 0;
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0712);

    this.levelContainer = this.add.container(0, H / 2).setDepth(10);
    this.guideLayer = this.add.group();
    this.stageLayer = this.add.group();

    this.input.on('pointerdown', (ptr) => this.onPointerDown(ptr));
    this.input.on('pointermove', (ptr) => this.onPointerMove(ptr));
    this.input.on('pointerup', () => {
      this.dragging = false;
      this.panning = false;
      this._dragStage = null;
    });

    this._blockContext = (e) => e.preventDefault();
    this.game.canvas?.addEventListener('contextmenu', this._blockContext);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        this._spacePan = true;
      });
      this.input.keyboard.on('keyup-SPACE', () => {
        this._spacePan = false;
        if (this.panning && !this.isPanPointer(this.input.activePointer)) {
          this.panning = false;
        }
      });
    }

    this.input.on('wheel', (ptr, _go, _dx, dy) => {
      if (ptr.x < CONTENT_X) return;
      const dom = ptr.event;
      const stageMode = !!(dom?.ctrlKey || dom?.metaKey || dom?.shiftKey);
      if (stageMode) {
        dom?.preventDefault?.();
        this.adjustStageScale(dy > 0 ? -STAGE_SCALE_STEP * 3 : STAGE_SCALE_STEP * 3);
      } else {
        this.adjustViewZoom(dy > 0 ? -VIEW_ZOOM_STEP : VIEW_ZOOM_STEP, ptr);
      }
    });

    this._blockBrowserZoom = (e) => {
      if ((e.ctrlKey || e.metaKey) && this.game.canvas?.contains(e.target)) {
        e.preventDefault();
      }
    };
    this.game.canvas?.addEventListener('wheel', this._blockBrowserZoom, { passive: false });

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'application/json,.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => this.onImportFile());
    document.body.appendChild(this.fileInput);

    this.events.once('shutdown', () => {
      this.saveAll(false);
      this.fileInput?.remove();
      this.game.canvas?.removeEventListener('wheel', this._blockBrowserZoom);
      this.game.canvas?.removeEventListener('contextmenu', this._blockContext);
    });

    this.buildSidebar();
    this.buildViewportChrome();
    this.rebuildLevel();
    beginMenuPadGrace(this, 280);
  }

  update() {
    const m = padMenu(this, 0);
    if (m) {
      if (m.up) this.changeLevel(-1);
      if (m.down) this.changeLevel(1);
      if (m.left) this.selectStage(-1);
      if (m.right) this.selectStage(1);
      if (m.back) this.exitEditor();
    }
    const pad = padOf(this, 0);
    if (!pad) return;

    const fast = pad.buttons[PAD.L2]?.pressed || pad.buttons[PAD.R2]?.pressed;
    const step = fast ? NUDGE_FAST : NUDGE;
    const stageZoomMode = pad.buttons[PAD.R2]?.pressed;

    if (padBtnEdge(this, 'sa', PAD.UP, pad)) this.nudge(0, -step);
    if (padBtnEdge(this, 'sa', PAD.DOWN, pad)) this.nudge(0, step);
    if (padBtnEdge(this, 'sa', PAD.LEFT, pad)) this.nudge(-step, 0);
    if (padBtnEdge(this, 'sa', PAD.RIGHT, pad)) this.nudge(step, 0);

    if (stageZoomMode) {
      if (padBtnEdge(this, 'sa', PAD.L1, pad)) this.adjustStageScale(-STAGE_SCALE_STEP);
      if (padBtnEdge(this, 'sa', PAD.R1, pad)) this.adjustStageScale(STAGE_SCALE_STEP);
    } else {
      if (padBtnEdge(this, 'sa', PAD.L1, pad)) this.adjustViewZoom(-VIEW_ZOOM_STEP);
      if (padBtnEdge(this, 'sa', PAD.R1, pad)) this.adjustViewZoom(VIEW_ZOOM_STEP);
    }

    if (padBtnEdge(this, 'sa', PAD.TRIANGLE, pad)) this.fitAllInView();
    if (padBtnEdge(this, 'sa', PAD.ROND, pad)) this.resetSelectedAlign();
    if (padBtnEdge(this, 'sa', PAD.CARRE, pad)) this.saveAll(true);
    if (padBtnEdge(this, 'sa', PAD.SHARE, pad)) this.exportJson();
    if (padBtnEdge(this, 'sa', PAD.OPTIONS, pad)) this.triggerImport();
  }

  buildViewportChrome() {
    this.add
      .rectangle(CONTENT_X + CONTENT_W / 2, H / 2, CONTENT_W, H, 0x000000, 0.12)
      .setStrokeStyle(2, 0x334455)
      .setDepth(8000)
      .setScrollFactor(0);
    this.add
      .text(CONTENT_X + CONTENT_W / 2, 8, 'NIVEAU COMPLET — jaune = niveau · violet = combat', F(0, { fontSize: '11px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5, 0)
      .setDepth(8001)
      .setScrollFactor(0);
    this.viewportHint = this.add
      .text(CONTENT_X + CONTENT_W / 2, H - 8, '', F(0, { fontSize: '10px', color: COL.grey }))
      .setOrigin(0.5, 1)
      .setDepth(8001)
      .setScrollFactor(0);
  }

  buildSidebar() {
    this.add
      .rectangle(SIDEBAR_W / 2, H / 2, SIDEBAR_W - 4, H - 8, 0x120e1c, 0.94)
      .setStrokeStyle(2, 0x554477)
      .setDepth(9000)
      .setScrollFactor(0);
    this.add
      .text(SIDEBAR_W / 2, 16, 'ALIGN', F(0, { fontSize: '13px', fontStyle: 'bold', color: COL.gold }))
      .setOrigin(0.5)
      .setDepth(9001)
      .setScrollFactor(0);
    this.add
      .text(SIDEBAR_W / 2, 34, 'PANORAMA', F(0, { fontSize: '11px', color: COL.cyan }))
      .setOrigin(0.5)
      .setDepth(9001)
      .setScrollFactor(0);

    this.hudTitle = this.add
      .text(SIDEBAR_W / 2, 58, '', F(0, { fontSize: '10px', color: COL.cream, align: 'center', wordWrap: { width: SIDEBAR_W - 16 } }))
      .setOrigin(0.5, 0)
      .setDepth(9001)
      .setScrollFactor(0);
    this.hudStage = this.add
      .text(SIDEBAR_W / 2, 96, '', F(0, { fontSize: '10px', color: COL.cyan, align: 'center' }))
      .setOrigin(0.5, 0)
      .setDepth(9001)
      .setScrollFactor(0);
    this.hudTex = this.add
      .text(SIDEBAR_W / 2, 118, '', F(0, { fontSize: '9px', color: COL.grey, align: 'center', wordWrap: { width: SIDEBAR_W - 12 } }))
      .setOrigin(0.5, 0)
      .setDepth(9001)
      .setScrollFactor(0);
    this.hudValues = this.add
      .text(SIDEBAR_W / 2, 168, '', F(0, { fontSize: '11px', color: COL.cream, align: 'center', lineSpacing: 4 }))
      .setOrigin(0.5, 0)
      .setDepth(9001)
      .setScrollFactor(0);
    this.add
      .text(
        SIDEBAR_W / 2,
        H - 12,
        'Molette = zoom vue\nCtrl+molette = zoom stage\nEspace / clic droit / molette = pan X/Y\nClic stage = déplacer décor\nL1/R1 zoom vue (R2+L1/R1 stage)\n△ vue entière □ sauver',
        F(0, { fontSize: '9px', color: COL.grey, align: 'center', lineSpacing: 3 })
      )
      .setOrigin(0.5, 1)
      .setDepth(9001)
      .setScrollFactor(0);
  }

  levelHasFullStage(lv) {
    return !!(lv?.layers?.fullStage && lv.layers.stageParts?.length);
  }

  stageCount(lv) {
    return Math.max(1, lv.stages?.length ?? lv.layers?.stageParts?.length ?? 1);
  }

  stageKey(lv, stageIdx) {
    if (!this.levelHasFullStage(lv)) return null;
    return mainKeyForStage(lv.layers, stageIdx);
  }

  baseScale(key) {
    if (!key || !this.textures.exists(key)) return { sx: 1, sy: 1 };
    const tex = this.textures.get(key);
    const src = tex.getSourceImage?.() || tex.source?.[0];
    const iw = src?.width || W;
    const ih = src?.height || H;
    return { sx: W / iw, sy: H / ih };
  }

  stageBaseCenterX(stageIdx) {
    return W / 2 + stageIdx * W;
  }

  /** Bande verticale où les personnages se déplacent (identique au jeu). */
  combatBand(layers) {
    if (layers?.layoutThirds || layers?.fullStage) {
      const roadR = layers.roadRatio ?? 0.55;
      const roadBandH = H * roadR;
      const roadTop = H - roadBandH;
      const insetTop = Phaser.Math.Clamp(layers.walkInsetTop ?? 0.12, 0.04, 0.35);
      const insetBottom = layers.walkInsetBottom ?? 10;
      return {
        walkTop: roadTop + roadBandH * insetTop,
        walkBottom: H - insetBottom,
      };
    }
    return { walkTop: FLOOR_TOP, walkBottom: FLOOR_BOTTOM };
  }

  worldWidth(n) {
    return n * W;
  }

  worldCenterX(n) {
    return this.worldWidth(n) / 2;
  }

  viewScale() {
    return this.fitScale * this.editorZoom;
  }

  maxViewZoom() {
    const native = 1 / this.fitScale;
    return Math.max(native * 1.5, 2);
  }

  loadAligns(lv) {
    const n = this.stageCount(lv);
    this.aligns = {};
    for (let i = 0; i < n; i++) {
      this.aligns[i] = { ...getStageAlign(this.levelIdx, i) };
    }
  }

  rebuildLevel() {
    this.stageLayer.clear(true, true);
    this.guideLayer.clear(true, true);
    this.levelContainer.removeAll(true);
    this.stageSprites = [];

    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    if (!this.levelHasFullStage(lv)) {
      this.add
        .text(W / 2, H / 2, 'Ce niveau n\'a pas de\nfonds plein écran\n(stageParts)', F(0, { fontSize: '18px', color: COL.grey, align: 'center' }))
        .setOrigin(0.5)
        .setDepth(100)
        .setScrollFactor(0);
      this.refreshHud();
      return;
    }

    const n = this.stageCount(lv);
    this.stageIdx = Phaser.Math.Clamp(this.stageIdx, 0, n - 1);
    this.loadAligns(lv);
    this.editorZoom = 1;
    this.panX = 0;
    this.panY = 0;

    for (let i = 0; i < n; i++) {
      this.spawnStageSprite(i);
    }

    this.drawGuides(n);
    this.applyViewTransform();
    this.refreshHud();
  }

  spawnStageSprite(stageIdx) {
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    const key = this.stageKey(lv, stageIdx);
    if (!key || !this.textures.exists(key)) return;

    const align = this.aligns[stageIdx];
    const { sx, sy } = this.baseScale(key);
    const mul = align.scale ?? 1;
    const baseX = this.stageBaseCenterX(stageIdx);
    const spr = this.add
      .image(baseX + (align.x ?? 0), align.y ?? 0, key)
      .setOrigin(0.5, 0)
      .setScale(sx * mul, sy * mul)
      .setDepth(stageIdx === this.stageIdx ? 30 : 20);
    spr.stageIdx = stageIdx;
    spr.setInteractive({ useHandCursor: true });

    this.levelContainer.add(spr);
    this.stageSprites.push(spr);
    this.updateStageVisual(stageIdx);
  }

  drawGuides(stageCount) {
    const worldW = this.worldWidth(stageCount);
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    const { walkTop, walkBottom } = this.combatBand(lv.layers);
    const combatH = walkBottom - walkTop;
    const combatY = (walkTop + walkBottom) / 2;

    this.levelFrame = this.add
      .rectangle(worldW / 2, H / 2, worldW, H, 0x000000, 0)
      .setStrokeStyle(6, GOLD, 1)
      .setDepth(45);
    this.levelContainer.add(this.levelFrame);
    this.guideLayer.add(this.levelFrame);

    this.combatFrame = this.add
      .rectangle(worldW / 2, combatY, worldW, combatH, COMBAT_VIOLET, 0.07)
      .setStrokeStyle(4, COMBAT_VIOLET, 0.95)
      .setDepth(46);
    this.levelContainer.add(this.combatFrame);
    this.guideLayer.add(this.combatFrame);

    const combatLabel = this.add
      .text(12, walkTop + 4, 'ZONE COMBAT', F(0, { fontSize: '11px', fontStyle: 'bold', color: '#cc88ff' }))
      .setOrigin(0, 0)
      .setDepth(47);
    this.levelContainer.add(combatLabel);
    this.guideLayer.add(combatLabel);

    for (let i = 1; i < stageCount; i++) {
      const g = this.add.graphics();
      g.lineStyle(2, 0x46d0e0, 0.55);
      g.beginPath();
      g.moveTo(i * W, 0);
      g.lineTo(i * W, H);
      g.strokePath();
      g.setDepth(5);
      this.levelContainer.add(g);
      this.guideLayer.add(g);
    }

    for (let i = 0; i < stageCount; i++) {
      const cx = this.stageBaseCenterX(i);
      const label = this.add
        .text(cx, 10, `${i + 1}`, F(0, { fontSize: '16px', fontStyle: 'bold', color: COL.gold }))
        .setOrigin(0.5, 0)
        .setDepth(6);
      this.levelContainer.add(label);
      this.guideLayer.add(label);
    }

    this.screenPreview = this.add
      .rectangle(this.stageBaseCenterX(this.stageIdx), H / 2, W, H, 0x000000, 0)
      .setStrokeStyle(2, 0xffffff, 0.55)
      .setDepth(50);
    this.levelContainer.add(this.screenPreview);
    this.guideLayer.add(this.screenPreview);

    this._worldW = worldW;
  }

  containerBaseX(s) {
    const n = this.stageCount(CAMPAIGN_LEVELS[this.levelIdx]);
    return CONTENT_X + CONTENT_W / 2 - this.worldCenterX(n) * s;
  }

  containerBaseY(s) {
    return H / 2 - (H / 2) * s;
  }

  applyViewTransform() {
    const n = this.stageCount(CAMPAIGN_LEVELS[this.levelIdx]);
    const worldW = this.worldWidth(n);
    this.fitScale = CONTENT_W / worldW;
    const s = this.viewScale();

    this.levelContainer.setScale(s);
    this.levelContainer.x = this.containerBaseX(s) + this.panX;
    this.levelContainer.y = this.containerBaseY(s) + this.panY;

    const pct = Math.round(s * 100);
    this.viewportHint?.setText(
      `${n} stages · ${worldW}px · zoom vue ${pct}% · jaune = niveau · violet = combat · blanc = 1 écran`
    );
  }

  clampPan() {
    const n = this.stageCount(CAMPAIGN_LEVELS[this.levelIdx]);
    const s = this.viewScale();
    const worldW = this.worldWidth(n);
    const baseX = this.containerBaseX(s);
    const levelScreenW = worldW * s;
    const levelScreenH = H * s;

    const minPan = CONTENT_X + 24 - baseX;
    const maxPan = CONTENT_X + CONTENT_W - 24 - baseX - levelScreenW;

    if (levelScreenW <= CONTENT_W - 48) {
      this.panX = (minPan + maxPan) / 2;
    } else {
      this.panX = Phaser.Math.Clamp(this.panX, maxPan, minPan);
    }

    const minPanY = 12 - this.containerBaseY(s);
    const maxPanY = H - 12 - this.containerBaseY(s) - levelScreenH;

    if (levelScreenH <= H - 24) {
      this.panY = 0;
    } else {
      this.panY = Phaser.Math.Clamp(this.panY, maxPanY, minPanY);
    }
  }

  fitAllInView() {
    this.editorZoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyViewTransform();
    sfx(this, 'sfx_select');
  }

  focusOnStage(stageIdx) {
    const n = this.stageCount(CAMPAIGN_LEVELS[this.levelIdx]);
    stageIdx = Phaser.Math.Clamp(stageIdx, 0, n - 1);
    this.editorZoom = Math.min(1 / this.fitScale, this.maxViewZoom());
    this.applyViewTransform();

    const s = this.viewScale();
    const cx = this.stageBaseCenterX(stageIdx);
    const targetScreenX = CONTENT_X + CONTENT_W / 2;
    this.panX = targetScreenX - (this.containerBaseX(s) + cx * s);
    this.panY = 0;
    this.clampPan();
    this.applyViewTransform();
    sfx(this, 'sfx_select');
  }

  adjustViewZoom(delta, ptr) {
    const oldS = this.viewScale();
    this.editorZoom = Phaser.Math.Clamp(this.editorZoom + delta, 1, this.maxViewZoom());
    const newS = this.viewScale();

    if (ptr && ptr.x >= CONTENT_X && oldS !== newS) {
      const anchorX = ptr.x;
      const anchorY = ptr.y;
      const worldX = (anchorX - this.containerBaseX(oldS) - this.panX) / oldS;
      const worldY = (anchorY - this.containerBaseY(oldS) - this.panY) / oldS;
      this.panX = anchorX - this.containerBaseX(newS) - worldX * newS;
      this.panY = anchorY - this.containerBaseY(newS) - worldY * newS;
    }

    this.clampPan();
    this.applyViewTransform();
    sfx(this, 'sfx_select');
  }

  updateStageVisual(stageIdx) {
    const spr = this.stageSprites.find((s) => s.stageIdx === stageIdx);
    if (!spr?.active) return;
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    const key = this.stageKey(lv, stageIdx);
    const align = this.aligns[stageIdx];
    const { sx, sy } = this.baseScale(key);
    const mul = align.scale ?? 1;
    const baseX = this.stageBaseCenterX(stageIdx);
    spr.setPosition(baseX + (align.x ?? 0), align.y ?? 0);
    spr.setScale(sx * mul, sy * mul);
    spr.setAlpha(stageIdx === this.stageIdx ? 1 : 0.82);
    spr.setDepth(stageIdx === this.stageIdx ? 30 : 20);
  }

  refreshHud() {
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    const n = this.stageCount(lv);
    this.stageIdx = Phaser.Math.Clamp(this.stageIdx, 0, n - 1);
    const align = this.aligns[this.stageIdx] ?? { ...DEFAULT_STAGE_ALIGN };
    this.hudTitle.setText(`${this.levelIdx + 1}. ${lv.name}`);
    this.hudStage.setText(`Stage ${this.stageIdx + 1} / ${n}`);
    this.hudTex.setText(this.stageKey(lv, this.stageIdx) ?? '—');
    this.hudValues.setText(
      `Vue  ${Math.round(this.viewScale() * 100)}%\nX  ${align.x}\nY  ${align.y}\nStage zoom  ${(align.scale ?? 1).toFixed(3)}`
    );
    if (this.screenPreview?.active) {
      this.screenPreview.x = this.stageBaseCenterX(this.stageIdx);
    }
    this.stageSprites.forEach((s) => this.updateStageVisual(s.stageIdx));
  }

  selectStageIdx(idx) {
    const n = this.stageCount(CAMPAIGN_LEVELS[this.levelIdx]);
    this.stageIdx = Phaser.Math.Clamp(idx, 0, n - 1);
    this.refreshHud();
    sfx(this, 'sfx_select');
  }

  selectStage(d) {
    this.saveAll(false);
    const n = this.stageCount(CAMPAIGN_LEVELS[this.levelIdx]);
    this.selectStageIdx((this.stageIdx + d + n) % n);
  }

  nudge(dx, dy) {
    const align = this.aligns[this.stageIdx];
    if (!align) return;
    align.x += dx;
    align.y += dy;
    this.updateStageVisual(this.stageIdx);
    this.refreshHud();
    sfx(this, 'sfx_select');
  }

  adjustStageScale(delta) {
    const align = this.aligns[this.stageIdx];
    if (!align) return;
    align.scale = Phaser.Math.Clamp((align.scale ?? 1) + delta, 0.75, 1.35);
    this.updateStageVisual(this.stageIdx);
    this.refreshHud();
    sfx(this, 'sfx_select');
  }

  resetSelectedAlign() {
    this.aligns[this.stageIdx] = { ...DEFAULT_STAGE_ALIGN };
    this.updateStageVisual(this.stageIdx);
    this.refreshHud();
    sfx(this, 'sfx_confirm');
  }

  isPanPointer(ptr) {
    return !!(
      this._spacePan ||
      ptr.middleButtonDown() ||
      ptr.rightButtonDown() ||
      ptr.event?.altKey
    );
  }

  startDragStage(ptr, stageIdx) {
    this.dragging = true;
    this._dragStage = stageIdx;
    const align = this.aligns[stageIdx];
    const baseX = this.stageBaseCenterX(stageIdx);
    const local = this.levelContainer.getLocalPoint(ptr.x, ptr.y);
    this._dragOffX = local.x - baseX - (align.x ?? 0);
    this._dragOffY = local.y - (align.y ?? 0);
  }

  onPointerDown(ptr) {
    if (ptr.x < CONTENT_X) return;
    if (this.dragging) return;

    if (this.isPanPointer(ptr)) {
      this.panning = true;
      this._panStartX = ptr.x;
      this._panStartY = ptr.y;
      this._panStartPan = this.panX;
      this._panStartPanY = this.panY;
      return;
    }

    const hit = this.hitTestStage(ptr.x, ptr.y);
    if (hit !== null) {
      const dbl = this._lastClickStage === hit && this.time.now - this._lastClickAt < 350;
      this._lastClickStage = hit;
      this._lastClickAt = this.time.now;
      if (dbl) {
        this.selectStageIdx(hit);
        this.focusOnStage(hit);
        return;
      }
      this.selectStageIdx(hit);
      this.startDragStage(ptr, hit);
      return;
    }

    this.panning = true;
    this._panStartX = ptr.x;
    this._panStartY = ptr.y;
    this._panStartPan = this.panX;
    this._panStartPanY = this.panY;
  }

  onPointerMove(ptr) {
    if (this.panning) {
      this.panX = this._panStartPan + (ptr.x - this._panStartX);
      this.panY = this._panStartPanY + (ptr.y - this._panStartY);
      this.clampPan();
      this.applyViewTransform();
      return;
    }
    if (!this.dragging || this._dragStage === null) return;

    const align = this.aligns[this._dragStage];
    if (!align) return;
    const baseX = this.stageBaseCenterX(this._dragStage);
    const local = this.levelContainer.getLocalPoint(ptr.x, ptr.y);
    align.x = Math.round(local.x - baseX - this._dragOffX);
    align.y = Math.round(local.y - this._dragOffY);
    this.updateStageVisual(this._dragStage);
    if (this._dragStage === this.stageIdx) this.refreshHud();
  }

  hitTestStage(screenX, screenY) {
    for (let i = this.stageSprites.length - 1; i >= 0; i--) {
      const spr = this.stageSprites[i];
      if (spr.active && spr.getBounds().contains(screenX, screenY)) return spr.stageIdx;
    }
    return null;
  }

  changeLevel(d) {
    this.saveAll(false);
    this.levelIdx = Phaser.Math.Clamp(this.levelIdx + d, 0, CAMPAIGN_LEVELS.length - 1);
    this.stageIdx = 0;
    sfx(this, 'sfx_select');
    this.rebuildLevel();
  }

  saveAll(withSfx) {
    const lv = CAMPAIGN_LEVELS[this.levelIdx];
    if (!this.levelHasFullStage(lv)) return;
    const n = this.stageCount(lv);
    for (let i = 0; i < n; i++) {
      if (this.aligns[i]) setStageAlign(this.levelIdx, i, this.aligns[i]);
    }
    if (withSfx) sfx(this, 'sfx_confirm');
  }

  exportJson() {
    this.saveAll(false);
    const url = URL.createObjectURL(exportStageAlignBlob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saranfou-stage-align.json';
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
        if (importStageAlignFromObject(obj)) {
          this.rebuildLevel();
          sfx(this, 'sfx_confirm');
        }
      } catch (_) {}
      this.fileInput.value = '';
    };
    reader.readAsText(file);
  }

  exitEditor() {
    this.saveAll(false);
    this.scene.start('PlayMode');
  }
}
