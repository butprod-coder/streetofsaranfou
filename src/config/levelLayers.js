/** Sprites plein écran niveau 1 — Chêne Maillard (décor + zone de jeu). */
export const LEVEL1_STAGE_PARTS = [
  'chene_maillard1',
  'chene_maillard2',
  'chene_maillard3',
  'chene_maillard4',
  'chene_maillard5',
  'chene_maillard6',
];

/** Props de ville posables (éditeur / ancien système). */
export const LEVEL1_PROP_KEYS = [
  'bac',
  'banc',
  'barriere',
  'bouche',
  'buisson',
  'cone',
  'incendie',
  'interdit',
  'lampadaire_allume',
  'lampadaire_eteint',
  'poubelle',
  'sacs_poubelle',
  'stop',
  'transfo',
];

export const LEVEL1_TEXTURE_KEYS = [...LEVEL1_STAGE_PARTS, ...LEVEL1_PROP_KEYS];

/** Sprites plein écran niveau 2 — Château de l'étang (assets/shared/levels/level2/). */
export const LEVEL2_STAGE_PARTS = [
  'chateau_etang_01',
  'chateau_etang_02',
  'chateau_etang_03',
  'chateau_etang_04',
  'chateau_etang_05',
  'chateau_etang_06',
];

export const LEVEL2_TEXTURE_KEYS = [...LEVEL2_STAGE_PARTS];

/** Sprites plein écran niveau 3 — Stade Colette Besson (assets/shared/levels/level3/). */
export const LEVEL3_STAGE_PARTS = [
  'stade1',
  'stade2',
  'stade3',
  'stade4',
  'stade5',
  'stade6',
];

export const LEVEL3_TEXTURE_KEYS = [...LEVEL3_STAGE_PARTS];

/** Sprites plein écran niveau 4 — Bourg de Saran (assets/shared/levels/level4/). */
export const LEVEL4_STAGE_PARTS = [
  'bourg1',
  'bourg2',
  'bourg3',
  'bourg4',
  'bourg5',
  'bourg6',
];

export const LEVEL4_TEXTURE_KEYS = [...LEVEL4_STAGE_PARTS];

/** Sprites plein écran niveau 5 — Saran by Night (assets/shared/levels/level5/). */
export const LEVEL5_STAGE_PARTS = [
  'capsaran1',
  'capsaran2',
  'capsaran3',
  'capsaran4',
  'capsaran5',
  'capsaran6',
];

export const LEVEL5_TEXTURE_KEYS = [...LEVEL5_STAGE_PARTS];

export const ALL_LEVEL_TEXTURE_KEYS = [
  ...LEVEL1_TEXTURE_KEYS,
  ...LEVEL2_TEXTURE_KEYS,
  ...LEVEL3_TEXTURE_KEYS,
  ...LEVEL4_TEXTURE_KEYS,
  ...LEVEL5_TEXTURE_KEYS,
];

/** Chêne Maillard — un sprite plein écran par stage (décor + gameplay). */
export const LEVEL1_LAYERS = {
  fullStage: true,
  stageParts: LEVEL1_STAGE_PARTS,
  ambient: { type: 'dust', count: 2 },
  roadRatio: 0.55,
  walkInsetTop: 0.12,
  walkInsetBottom: 26,
  propCount: [0, 0],
  props: [],
};

/** Château de l'étang — un sprite plein écran par stage (décor + gameplay). */
export const LEVEL2_LAYERS = {
  fullStage: true,
  stageParts: LEVEL2_STAGE_PARTS,
  ambient: { type: 'leaves', count: 2 },
  roadRatio: 0.55,
  walkInsetTop: 0.12,
  walkInsetBottom: 26,
  propCount: [0, 0],
  props: [],
};

/** Stade Colette Besson — un sprite plein écran par stage (décor + gameplay). */
export const LEVEL3_LAYERS = {
  fullStage: true,
  stageParts: LEVEL3_STAGE_PARTS,
  ambient: { type: 'dust', count: 2 },
  roadRatio: 0.55,
  walkInsetTop: 0.12,
  walkInsetBottom: 26,
  propCount: [0, 0],
  props: [],
};

/** Bourg de Saran — un sprite plein écran par stage (décor + gameplay). */
export const LEVEL4_LAYERS = {
  fullStage: true,
  stageParts: LEVEL4_STAGE_PARTS,
  ambient: { type: 'dust', count: 2 },
  roadRatio: 0.55,
  walkInsetTop: 0.12,
  walkInsetBottom: 26,
  propCount: [0, 0],
  props: [],
};

/** Saran by Night — six panoramas nocturnes plein écran. */
export const LEVEL5_LAYERS = {
  fullStage: true,
  stageParts: LEVEL5_STAGE_PARTS,
  ambient: { type: 'dust', count: 2 },
  roadRatio: 0.55,
  walkInsetTop: 0.12,
  walkInsetBottom: 26,
  propCount: [0, 0],
  props: [],
};

/** Hauteur mini des decors — référence pour le scale max (1774×887 px). */
export const LEVEL1_DECOR_REF = { width: 1774, height: 887 };

/** Référence décor Château de l'étang (1774×887 px). */
export const LEVEL2_DECOR_REF = { width: 1774, height: 887 };

/** Référence décor Stade Colette Besson (1774×887 px). */
export const LEVEL3_DECOR_REF = { width: 1774, height: 887 };

/** Référence décor Bourg de Saran (1774×887 px). */
export const LEVEL4_DECOR_REF = { width: 1774, height: 887 };

/** Référence décor Saran by Night (1024×512 px). */
export const LEVEL5_DECOR_REF = { width: 1024, height: 512 };

export function mainPartsRefSize(layers, getSize) {
  const parts = layers?.mainParts;
  if (!parts?.length) return null;
  let minH = Infinity;
  let minW = Infinity;
  for (const key of parts) {
    const size = getSize(key);
    if (!size) continue;
    if (size.height < minH) minH = size.height;
    if (size.width < minW) minW = size.width;
  }
  if (!Number.isFinite(minH)) return null;
  return { width: minW, height: minH };
}

export function mainKeyForStage(layers, stageIdx) {
  const parts = layers?.stageParts ?? layers?.mainParts;
  if (parts?.length) {
    return parts[Math.min(stageIdx, parts.length - 1)];
  }
  return layers?.main ?? null;
}

export function getLayerTextureKeys(layers) {
  if (!layers) return [];
  const keys = new Set();
  if (layers.stageParts?.length) {
    layers.stageParts.forEach((k) => keys.add(k));
  } else {
    if (layers.far) keys.add(layers.far);
    if (layers.mainParts?.length) layers.mainParts.forEach((k) => keys.add(k));
    else if (layers.main) keys.add(layers.main);
    if (layers.road) keys.add(layers.road);
  }
  for (const p of layers.props || []) keys.add(p.key);
  return [...keys];
}

export function pickWeightedProp(props) {
  const total = props.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of props) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return props[props.length - 1];
}
