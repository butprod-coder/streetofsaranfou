import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM } from '../config/gameConfig.js';
import { WEAPONS, POLICE_ITEM } from '../config/weapons.js';
import { CONFIG } from '../config/difficulty.js';
import { pickWeightedProp, mainKeyForStage, mainPartsRefSize, LEVEL1_DECOR_REF, LEVEL2_DECOR_REF } from '../config/levelLayers.js';
import { getStagePlacements, hasAuthoredPlacements } from '../config/levelPlacements.js';
import { applyStageAlignToMetrics, fullStageScrollBetween, fullStageSegmentCenterX, fullStagePlayCenterX } from '../config/stageAlign.js';

const BG_DEPTH = { far: 2, ambient: 6, main: 8, road: 14 };

/** GameScene mixin: decor.js */
export const decorMixin = {
  _ensureDecorGroups() {
    if (!this.bgFarGroup) this.bgFarGroup = this.add.group();
    if (!this.bgMainGroup) this.bgMainGroup = this.add.group();
    if (!this.bgRoadGroup) this.bgRoadGroup = this.add.group();
    if (!this.bgAmbientGroup) this.bgAmbientGroup = this.add.group();
    if (!this.decorGroup) this.decorGroup = this.add.group();
    if (!this.props) this.props = this.add.group();
    if (!this.pickups) this.pickups = this.add.group();
    if (!this.fires) this.fires = this.add.group();
    if (!this.hazards) this.hazards = this.add.group();
  },

  _layerTextureSize(key) {
    const tex = this.textures.get(key);
    const src = tex?.getSourceImage?.() || tex?.source?.[0];
    return {
      width: src?.width || tex?.width || W,
      height: src?.height || tex?.height || 1,
    };
  },

  _layerWidthScale(key) {
    return W / this._layerTextureSize(key).width;
  },

  _mainDecorRefSize(layers) {
    if (!layers?.mainParts?.length) return null;
    const fromTextures = mainPartsRefSize(layers, (key) => {
      if (!this.textures.exists(key)) return null;
      return this._layerTextureSize(key);
    });
    return fromTextures ?? (layers?.road === 'route_etang' ? LEVEL2_DECOR_REF : LEVEL1_DECOR_REF);
  },

  _layerMetrics(layers, mainKey) {
    if (layers?.fullStage) {
      return this._layerMetricsFullStage(layers, mainKey);
    }
    if (layers.layoutThirds) {
      return this._layerMetricsThirds(layers, mainKey);
    }
    return this._layerMetricsLegacy(layers, mainKey);
  },

  _layerMetricsFullStage(layers, stageKey) {
    const roadR = layers.roadRatio ?? 0.55;
    const roadBandH = H * roadR;
    const roadTop = H - roadBandH;
    const insetTop = Phaser.Math.Clamp(layers.walkInsetTop ?? 0.12, 0.04, 0.35);
    const insetBottom = layers.walkInsetBottom ?? 10;
    const walkTop = roadTop + roadBandH * insetTop;
    const walkBottom = H - insetBottom;
    const size =
      stageKey && this.textures.exists(stageKey)
        ? this._layerTextureSize(stageKey)
        : { width: W, height: H };
    return {
      fullStage: true,
      scaleX: W / size.width,
      scaleY: H / size.height,
      walkTop,
      walkBottom,
      farMaxH: roadTop,
    };
  },

  _layerMetricsThirds(layers, mainKey) {
    const farR = layers.farRatio ?? 1 / 3;
    const rem = 1 - farR;
    const mainR = layers.mainRatio ?? rem / 2;
    const roadR = layers.roadRatio ?? rem / 2;
    const farH = H * farR;
    const mainBandH = H * mainR;
    const roadBandH = H * roadR;

    const mainTex = mainKey || layers.main;
    const roadSize = this._layerTextureSize(layers.road);
    const roadScaleX = W / roadSize.width;
    const roadScaleY = roadBandH / roadSize.height;
    const roadY = H;
    const roadTop = H - roadBandH;

    const farSize = layers.far ? this._layerTextureSize(layers.far) : { width: W, height: 1 };
    const farScaleX = W / farSize.width;
    const farScaleY = farH / farSize.height;

    let mainScaleX = 1;
    let mainScaleY = 1;
    if (mainTex) {
      const mainSize = this._layerTextureSize(mainTex);
      mainScaleX = W / mainSize.width;
      mainScaleY = mainBandH / mainSize.height;
    }

    const mainY = H - roadBandH;
    const mainTopY = farH;
    const insetTop = Phaser.Math.Clamp(layers.walkInsetTop ?? 0.12, 0.04, 0.35);
    const insetBottom = layers.walkInsetBottom ?? 10;
    const walkTop = roadTop + roadBandH * insetTop;
    const walkBottom = H - insetBottom;

    return {
      layoutThirds: true,
      farH,
      mainBandH,
      roadBandH,
      roadScaleX,
      roadScaleY,
      roadY,
      roadTop,
      farScaleX,
      farScaleY,
      mainScaleX,
      mainScaleY,
      mainH: mainBandH,
      mainY,
      mainTopY,
      walkTop,
      walkBottom,
      farMaxH: farH,
    };
  },

  _layerMetricsLegacy(layers, mainKey) {
    const mainTex = mainKey || layers.main;
    const roadScale = this._layerWidthScale(layers.road);
    const roadH = this._layerTextureSize(layers.road).height * roadScale;
    const roadY = H + (layers.roadYOffset ?? 0);
    const roadTop = roadY - roadH;
    const mainOverlap = layers.mainOverlap ?? 22;
    const mainY = roadTop + mainOverlap;
    const farMaxH = layers.farMaxHeight ?? 90;
    const mainFillTop = farMaxH - (layers.mainSkyOverlap ?? 24);
    const mainFillH = mainY - mainFillTop;

    let mainScale = 1;
    let mainH = 0;
    if (mainTex) {
      const mainSize = this._layerTextureSize(mainTex);
      const refSize = this._mainDecorRefSize(layers) ?? mainSize;
      const mainScaleX = W / refSize.width;
      const mainScaleY = mainFillH / refSize.height;
      mainScale = Math.max(mainScaleX, mainScaleY) * (layers.mainScaleMul ?? 1);
      mainH = mainSize.height * mainScale;
    }

    const mainTopY = mainY - mainH;
    const insetTop = Phaser.Math.Clamp(layers.walkInsetTop ?? 0.1, 0.04, 0.35);
    const insetBottom = layers.walkInsetBottom ?? 10;
    const walkTop = roadTop + roadH * insetTop;
    const walkBottom = roadY - insetBottom;
    return {
      layoutThirds: false,
      roadScale,
      roadScaleX: roadScale,
      roadScaleY: roadScale,
      mainScale,
      roadH,
      roadY,
      roadTop,
      mainY,
      mainTopY,
      walkTop,
      walkBottom,
      farMaxH,
      farScaleX: layers.far ? this._layerWidthScale(layers.far) : roadScale,
      farScaleY: farMaxH / (layers.far ? this._layerTextureSize(layers.far).height : 212),
    };
  },

  spawnY() {
    return this.walkBottom() - 16;
  },

  walkTop() {
    return this._walkTop ?? FLOOR_TOP + 20;
  },

  walkBottom() {
    return this._walkBottom ?? FLOOR_BOTTOM;
  },

  _applyWalkBand(metrics) {
    this._walkTop = Math.round(metrics.walkTop);
    this._walkBottom = Math.round(metrics.walkBottom);
  },

  _addWideLayer(key, depth, x, y, scaleX, scaleY, originX, originY, group, place, meta = {}) {
    if (!key || !this.textures.exists(key)) return null;
    const img = this.add.image(x, y, key).setOrigin(originX, originY).setScale(scaleX, scaleY);
    img.setDepth(depth);
    img.bgLayer = true;
    if (meta.stageIdx != null) img.stagePartIdx = meta.stageIdx;
    place(img, x);
    group.add(img);
    return img;
  },

  /** Place un objet décor ; pendant le scroll de stage, pas de tween (position pilotée par update). */
  _decorPlaceObject(o, fx, { enter = false, slideDuration = 900, slideEase = 'Quad.easeOut' } = {}) {
    o.finalX = fx;
    if (enter) {
      o.x = fx + W;
      if (this._stageScrollEnterHook) {
        this._stageScrollEnterHook(o, fx + W, fx);
      } else {
        this.tweens.add({ targets: o, x: fx, duration: slideDuration, ease: slideEase });
      }
    } else {
      o.x = fx;
    }
  },

  _spawnLevelSegment(centerX, opts = {}) {
    const layers = this.lv.layers;
    if (!layers) return;

    const stageIdx = opts.stageIdx ?? this.stageIdx ?? 0;
    const farKey = layers.far;
    const mainKey = mainKeyForStage(layers, stageIdx);

    const enter = opts.enter ?? false;
    const slideDuration = opts.slideDuration ?? 900;
    const slideEase = opts.slideEase ?? 'Quad.easeOut';

    const place = (o, fx) =>
      this._decorPlaceObject(o, fx, { enter, slideDuration, slideEase });

    const metrics = this._layerMetrics(layers, mainKey);
    this._applyWalkBand(metrics);

    if (layers.fullStage) {
      const aligned = applyStageAlignToMetrics(metrics, this.levelIdx ?? 0, stageIdx);
      this._addWideLayer(
        mainKey,
        BG_DEPTH.main,
        centerX,
        aligned.alignY ?? 0,
        aligned.scaleX,
        aligned.scaleY,
        0.5,
        0,
        this.bgMainGroup,
        place,
        { stageIdx }
      );
      if (!opts.skipAmbient) {
        this._spawnAmbient(centerX, place, layers.ambient, metrics.farMaxH);
      }
      if (!opts.skipProps) {
        this._spawnLayerProps(centerX, place, layers, metrics.walkBottom);
      }
      return;
    }

    const {
      roadScaleX,
      roadScaleY,
      roadY,
      mainY,
      mainScaleX,
      mainScaleY,
      farScaleX,
      farScaleY,
      farMaxH,
    } = metrics;

    this._addWideLayer(
      farKey,
      BG_DEPTH.far,
      centerX,
      0,
      farScaleX,
      farScaleY,
      0.5,
      0,
      this.bgFarGroup,
      place
    );
    this._addWideLayer(
      mainKey,
      BG_DEPTH.main,
      centerX,
      mainY,
      mainScaleX,
      mainScaleY,
      0.5,
      1,
      this.bgMainGroup,
      place
    );
    this._addWideLayer(
      layers.road,
      BG_DEPTH.road,
      centerX,
      roadY,
      roadScaleX,
      roadScaleY,
      0.5,
      1,
      this.bgRoadGroup,
      place
    );

    if (!opts.skipAmbient) {
      this._spawnAmbient(centerX, place, layers.ambient, farMaxH);
    }
    if (!opts.skipProps) {
      this._spawnLayerProps(centerX, place, layers, metrics.walkBottom);
    }
  },

  /** Fond plein écran du stage courant pour l'arène boss. */
  spawnBossBackground() {
    if (!this.lv?.layers) return;
    this._ensureDecorGroups();
    this._clearLayerGroups();
    this.decorGroup?.clear(true, true);
    const stageIdx = Math.min(this.stageIdx, this.lv.stages.length - 1);
    this._spawnLevelSegment(this._fullStagePlayCenterX(stageIdx), { stageIdx, enter: false, skipProps: true });
  },

  _clearLayerGroups() {
    const clear = (g) => {
      if (!g) return;
      for (const o of [...g.getChildren()]) this._destroyScrollObject(g, o);
    };
    clear(this.bgFarGroup);
    clear(this.bgMainGroup);
    clear(this.bgRoadGroup);
    clear(this.bgAmbientGroup);
  },

  _destroyScrollObject(g, o) {
    if (!o?.scene) return;
    try {
      this.tweens.killTweensOf(o);
    } catch (_) {}
    try {
      if (g?.contains?.(o)) g.remove(o, true);
      else if (o.active) o.destroy();
    } catch (_) {}
  },

  _fullStageSegmentCenterX(stageIdx) {
    return fullStageSegmentCenterX(stageIdx, this.levelIdx ?? 0);
  },

  _fullStagePlayCenterX(stageIdx) {
    return fullStagePlayCenterX(stageIdx, this.levelIdx ?? 0);
  },

  _fullStageScrollBetween(fromIdx, toIdx) {
    return fullStageScrollBetween(fromIdx, toIdx, this.levelIdx ?? 0);
  },

  /** Recale le(s) fond(s) plein écran sur la position éditeur du segment. */
  _snapFullStageMains(stageIdx, centerX) {
    if (!this.lv?.layers?.fullStage || !this.bgMainGroup) return;
    const layers = this.lv.layers;
    const mainKey = mainKeyForStage(layers, stageIdx);
    const metrics = this._layerMetrics(layers, mainKey);
    const aligned = applyStageAlignToMetrics(metrics, this.levelIdx ?? 0, stageIdx);
    const cx = centerX ?? this._fullStagePlayCenterX(stageIdx);
    const cy = aligned.alignY ?? 0;
    for (const o of [...this.bgMainGroup.getChildren()]) {
      if (!o?.active || !o.bgLayer) continue;
      if (o.stagePartIdx != null && o.stagePartIdx !== stageIdx) continue;
      o.x = cx;
      o.y = cy;
      o.finalX = cx;
      o.setScale(aligned.scaleX, aligned.scaleY);
    }
  },

  _clearFullStagePartsBefore(stageIdx) {
    if (!this.lv?.layers?.fullStage || !this.bgMainGroup) return;
    for (const o of [...this.bgMainGroup.getChildren()]) {
      if (!o?.active || !o.bgLayer) continue;
      if (o.stagePartIdx != null && o.stagePartIdx < stageIdx) {
        this._destroyScrollObject(this.bgMainGroup, o);
      }
    }
  },

  /** Respawn le fond plein écran du stage courant si absent (sécurité après transition). */
  _ensureFullStageMain(stageIdx) {
    if (!this.lv?.layers?.fullStage) return;
    this._ensureDecorGroups();
    const has = this.bgMainGroup?.getChildren?.().some(
      (o) => o?.active && o.bgLayer && o.stagePartIdx === stageIdx
    );
    if (!has) {
      this._spawnLevelSegment(this._fullStagePlayCenterX(stageIdx), {
        stageIdx,
        enter: false,
        skipProps: true,
        skipCrates: true,
        skipAmbient: true,
      });
    }
  },

  _pruneScrolledLayers(opts = {}) {
    const fullStage = this.lv?.layers?.fullStage;
    const center = W / 2;
    const leftCut = opts.leftCut ?? (fullStage ? W : W * 0.4);
    const rightCut = opts.rightCut ?? (fullStage ? W * 2.5 : W * 1.35);
    const prune = (g) => {
      if (!g) return;
      for (const o of [...g.getChildren()]) {
        if (!o) continue;
        if (fullStage && g === this.bgMainGroup && o.stagePartIdx != null) {
          if (o.stagePartIdx < this.stageIdx && o.x < -leftCut) {
            this._destroyScrollObject(g, o);
          }
          continue;
        }
        if (o.x < -leftCut || o.x > rightCut) this._destroyScrollObject(g, o);
      }
    };
    prune(this.bgFarGroup);
    prune(this.bgMainGroup);
    prune(this.bgRoadGroup);
    prune(this.bgAmbientGroup);

    if (!fullStage && opts.keepSingleMain !== false && this.bgMainGroup) {
      const mains = this.bgMainGroup.getChildren().filter((o) => o?.active);
      if (mains.length > 1) {
        mains.sort((a, b) => Math.abs(a.x - center) - Math.abs(b.x - center));
        for (let i = 1; i < mains.length; i++) {
          this._destroyScrollObject(this.bgMainGroup, mains[i]);
        }
      }
    }
  },

  _spawnAmbient(centerX, place, ambient, skyBottom = FLOOR_TOP) {
    if (!ambient || ambient.type === 'none') return;
    const ambientMul = window.__SOSF_GFX__?.ambientMul ?? 1;
    if (ambientMul <= 0) return;
    const maxTotal = 4;
    const active = this.bgAmbientGroup?.countActive?.(true) ?? 0;
    const baseCount = ambient.count ?? 4;
    const count = Math.min(
      Math.max(0, Math.round(baseCount * ambientMul)),
      Math.max(0, maxTotal - active)
    );
    if (count <= 0) return;
    const left = centerX - W / 2;

    for (let i = 0; i < count; i++) {
      const fx = left + 40 + Math.random() * (W - 80);
      const fy = 24 + Math.random() * Math.max(40, skyBottom - 50);
      let o;

      if (ambient.type === 'dust') {
        o = this.add.circle(fx, fy, Phaser.Math.Between(1, 3), 0xfff4d0, Phaser.Math.FloatBetween(0.08, 0.22));
      } else if (ambient.type === 'leaves') {
        o = this.add.rectangle(
          fx,
          fy,
          Phaser.Math.Between(3, 6),
          Phaser.Math.Between(2, 4),
          Phaser.Math.RND.pick([0x6a9a44, 0x8fbc55, 0xc4a035]),
          Phaser.Math.FloatBetween(0.25, 0.45)
        );
      } else if (ambient.type === 'fireflies') {
        o = this.add.circle(fx, fy, 2, 0xc8ff88, Phaser.Math.FloatBetween(0.35, 0.7));
      } else {
        o = this.add.circle(fx, fy, 2, 0xffffff, 0.12);
      }

      o.setDepth(BG_DEPTH.ambient);
      o.bgLayer = true;
      place(o, fx);
      this.bgAmbientGroup.add(o);

      this.tweens.add({
        targets: o,
        y: o.y + Phaser.Math.Between(10, 22),
        alpha: 0,
        duration: Phaser.Math.Between(1800, 2800),
        ease: 'Sine.easeOut',
        delay: Phaser.Math.Between(0, 400),
        onComplete: () => {
          try {
            o.destroy();
          } catch (_) {}
        },
      });
    }
  },

  _spawnLayerProps(centerX, place, layers, groundY = FLOOR_BOTTOM) {
    const props = layers.props;
    if (!props?.length) return;

    const minN = layers.propCount?.[0] ?? 2;
    const maxN = layers.propCount?.[1] ?? 3;
    const count = Phaser.Math.Between(minN, maxN);
    const used = [];
    const left = centerX - W / 2;
    const groundMin = groundY - 72;
    const groundMax = groundY - 10;
    const minGap = count <= 3 ? 160 : 120;

    for (let i = 0; i < count; i++) {
      const pick = pickWeightedProp(props);
      if (!this.textures.exists(pick.key)) continue;

      let relX;
      let t = 0;
      do {
        relX = 70 + Math.random() * (W - 140);
        t++;
      } while (t < 8 && used.some((u) => Math.abs(u - relX) < minGap));
      used.push(relX);

      const fx = left + relX;
      const y = Phaser.Math.Between(groundMin, groundMax);
      const scale = pick.scale ?? 0.88 + Math.random() * 0.1;
      const o = this.add.image(fx, y, pick.key).setOrigin(0.5, 1).setScale(scale);
      o.setDepth(Math.floor(y));
      place(o, fx);
      this.decorGroup.add(o);

      if (pick.key === 'lampadaire_allume') {
        this.tweens.add({
          targets: o,
          alpha: 0.82,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  },

  _spawnAuthoredPlacements(placements, place) {
    for (const d of placements.decor ?? []) {
      if (!this.textures.exists(d.key)) continue;
      const o = this.add.image(d.x, d.y, d.key).setOrigin(0.5, 1).setScale(d.scale ?? 1);
      o.setDepth(Math.floor(d.y) - 2);
      place(o, d.x);
      this.decorGroup.add(o);
    }
    for (const c of placements.crates ?? []) {
      const crate = this.add.image(c.x, c.y, 'crate0').setOrigin(0.5, 1).setScale(0.92);
      crate.setDepth(Math.floor(c.y));
      crate.hp = c.hp ?? 3;
      crate.hpMax = crate.hp;
      crate.cw = 26;
      crate.loot = c.loot ?? 'random';
      place(crate, c.x);
      this.props.add(crate);
    }
  },

  spawnDecor(opts = {}) {
    const lv = this.lv;
    const stageIdx = opts.stageIdx !== undefined ? opts.stageIdx : this.stageIdx;
    const clear = opts.clear !== false;
    const enter = opts.enter !== undefined ? opts.enter : stageIdx > 0;
    const slideDuration = opts.slideDuration ?? 900;
    const slideEase = opts.slideEase ?? 'Quad.easeOut';

    this._ensureDecorGroups();

    if (clear) {
      this._clearLayerGroups();
      for (const o of [...(this.decorGroup?.getChildren?.() ?? [])]) {
        this._destroyScrollObject(this.decorGroup, o);
      }
      this.decorGroup?.clear(false, false);
      this.fires.clear(true, true);
      this.hazards.clear(true, true);
      this.props.clear(true, true);
      this.pickups.clear(true, true);
    }

    const place = (o, fx) =>
      this._decorPlaceObject(o, fx, { enter, slideDuration, slideEase });

    const stagePlacements = getStagePlacements(this.levelIdx ?? 0, stageIdx);
    const useAuthored =
      !opts.skipAuthored &&
      (hasAuthoredPlacements(this.levelIdx ?? 0, stageIdx) ||
        stagePlacements.decor.length > 0 ||
        stagePlacements.crates.length > 0);

    if (lv.layers && !opts.skipLayers) {
      const segX = lv.layers.fullStage ? this._fullStagePlayCenterX(stageIdx) : W / 2;
      this._spawnLevelSegment(segX, {
        enter,
        slideDuration,
        slideEase,
        stageIdx,
        skipProps: opts.skipProps || useAuthored,
        skipAmbient: opts.skipAmbient,
      });
    } else if (lv.layers && opts.skipLayers) {
      const metrics = this._layerMetrics(lv.layers, mainKeyForStage(lv.layers, stageIdx));
      if (!opts.skipProps && !useAuthored) {
        this._spawnLayerProps(W / 2, place, lv.layers, metrics.walkBottom);
      }
    } else if (lv.decor && !useAuthored) {
      const used = [];
      const n = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const key = Phaser.Utils.Array.GetRandom(lv.decor);
        if (!this.textures.exists(key)) continue;
        let x;
        let t = 0;
        do {
          x = 150 + Math.random() * (W - 300);
          t++;
        } while (t < 6 && used.some((u) => Math.abs(u - x) < 140));
        used.push(x);
        const y = Phaser.Math.Between(FLOOR_TOP + 28, FLOOR_BOTTOM - 6);
        const o = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(0.7 + Math.random() * 0.12);
        o.setDepth(Math.floor(y) - 2);
        place(o, x);
        this.decorGroup.add(o);
      }
    }

    if (useAuthored) {
      this._spawnAuthoredPlacements(stagePlacements, place);
    } else if (!opts.skipCrates) {
      const nc = lv.layers ? Phaser.Math.Between(0, 1) : 1 + Math.floor(Math.random() * 2);
      const cused = [];
      for (let i = 0; i < nc; i++) {
        let x;
        let t = 0;
        do {
          x = 200 + Math.random() * (W - 400);
          t++;
        } while (t < 6 && cused.some((u) => Math.abs(u - x) < 160));
        cused.push(x);
        const y = Phaser.Math.Between(FLOOR_TOP + 34, FLOOR_BOTTOM - 8);
        const c = this.add.image(x, y, 'crate0').setOrigin(0.5, 1).setScale(0.92);
        c.setDepth(Math.floor(y));
        c.hp = 3;
        c.hpMax = 3;
        c.cw = 26;
        place(c, x);
        this.props.add(c);
      }
    }
  },

  spawnPickup(x, y, kind) {
    const isW = WEAPONS[kind];
    const tex =
      kind === 'poulet'
        ? 'chicken'
        : kind === POLICE_ITEM
          ? POLICE_ITEM
          : isW
            ? WEAPONS[kind].tex
            : 'chicken';
    const it = this.add.image(x, y, tex).setOrigin(0.5, 1).setScale(0.85);
    it.kind = kind;
    it.gy = Phaser.Math.Clamp(y, FLOOR_TOP + 30, FLOOR_BOTTOM - 2);
    it.y = y - 32;
    this.tweens.add({ targets: it, y: it.gy, duration: 320, ease: 'Bounce.easeOut' });
    it.setDepth(Math.floor(it.gy));
    this.pickups.add(it);
  },

  spawnFire(x, y) {
    if (!this.fires) this.fires = this.add.group();
    const f = this.add.sprite(x, y, 'feu0').setOrigin(0.5, 0.85).setDepth(Math.floor(y) + 5).setScale(1.1);
    f.play('feu_anim');
    f.born = this.time.now;
    f.life = 4200;
    f.nextTick = 0;
    this.spawnSpark(x, y - 10);
    if (CONFIG.shake) this.cameras.main.shake(120, 0.006);
    this.fires.add(f);
  },

  updateFires(time) {
    if (!this.fires || !this.fires.getChildren) return;
    this.fires.getChildren().forEach((f) => {
      if (!f || !f.active) return;
      if (time - f.born > f.life) {
        this.tweens.add({
          targets: f,
          alpha: 0,
          scale: 0.6,
          duration: 300,
          onComplete: () => f.destroy(),
        });
        f.born = time - f.life - 9999;
        return;
      }
      if (time > f.nextTick) {
        for (const p of this.activePlayers()) {
          if (
            p.hp > 0 &&
            p.active &&
            !p.airborne &&
            Math.abs(p.x - f.x) < 30 &&
            Math.abs(p.y - f.y) < 26
          ) {
            f.nextTick = time + 500;
            this.hurt(p, 8, p.x < f.x ? -1 : 1);
            break;
          }
        }
      }
    });
  },

  pushOut(f) {
    if (!f || !f.active) return;
    const alive = (g) => g && g.children && g.children.entries;
    const dg = this.decorGroup;
    if (alive(dg)) {
      dg.children.entries.forEach((o) => {
        if (!o || !o.solid) return;
        const dx = f.x - o.x;
        const dy = f.y - o.y;
        if (Math.abs(dx) < o.cw && f.y > o.cy0 && Math.abs(dy) < 70) {
          const push = (o.cw - Math.abs(dx)) * (dx < 0 ? -1 : 1);
          f.x += push * 0.5;
        }
      });
    }
    const pr = this.props;
    if (alive(pr)) {
      pr.children.entries.forEach((c) => {
        if (!c || !c.active) return;
        const dx = f.x - c.x;
        const dy = Math.abs(f.y - c.y);
        if (Math.abs(dx) < (c.cw || 24) && dy < 60) {
          const push = ((c.cw || 24) - Math.abs(dx)) * (dx < 0 ? -1 : 1);
          f.x += push * 0.5;
        }
      });
    }
  },

  shake(d, i) {
    if (CONFIG.shake) this.cameras.main.shake(d, i);
  },
};
