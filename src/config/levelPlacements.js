import { WEAPON_KEYS, POLICE_ITEM } from './weapons.js';
import { LEVEL1_TEXTURE_KEYS, LEVEL1_STAGE_PARTS } from './levelLayers.js';

export const PLACEMENTS_STORAGE_KEY = 'saranfou_placements_v1';

/** Composition livrée avec le niveau 1. Les placements enregistrés dans l'éditeur
 * restent prioritaires stage par stage, ce qui permet de retoucher ou vider chaque
 * segment sans modifier cette base. La voie centrale reste assez dégagée pour les
 * combats, tandis que les caisses espacées rythment la récupération. */
const LEVEL1_DEFAULT_PLACEMENTS = {
  0: {
    decor: [
      { key: 'lampadaire_allume', x: 205, y: 374, scale: 0.92 },
      { key: 'banc', x: 350, y: 402, scale: 0.88 },
      { key: 'buisson', x: 830, y: 392, scale: 0.9 },
      { key: 'poubelle', x: 885, y: 490, scale: 0.82 },
    ],
    crates: [{ x: 690, y: 482, hp: 3, loot: 'random' }],
  },
  1: {
    decor: [
      { key: 'sacs_poubelle', x: 210, y: 486, scale: 0.88 },
      { key: 'lampadaire_eteint', x: 375, y: 370, scale: 0.95 },
      { key: 'cone', x: 705, y: 470, scale: 0.8 },
      { key: 'barriere', x: 830, y: 406, scale: 0.82 },
    ],
    crates: [{ x: 520, y: 492, hp: 3, loot: 'random' }],
  },
  2: {
    decor: [
      { key: 'stop', x: 190, y: 390, scale: 0.88 },
      { key: 'buisson', x: 315, y: 480, scale: 0.86 },
      { key: 'obj_baril', x: 790, y: 486, scale: 0.72 },
      { key: 'lampadaire_allume', x: 875, y: 368, scale: 0.92 },
    ],
    crates: [{ x: 610, y: 470, hp: 4, loot: 'poulet' }],
  },
  3: {
    decor: [
      { key: 'bouche', x: 235, y: 492, scale: 0.82 },
      { key: 'banc', x: 410, y: 390, scale: 0.86 },
      { key: 'sacs_poubelle', x: 760, y: 493, scale: 0.86 },
      { key: 'interdit', x: 870, y: 388, scale: 0.86 },
    ],
    crates: [{ x: 625, y: 462, hp: 3, loot: 'random' }],
  },
  4: {
    decor: [
      { key: 'transfo', x: 205, y: 420, scale: 0.82 },
      { key: 'cone', x: 350, y: 490, scale: 0.78 },
      { key: 'obj_brasero', x: 755, y: 475, scale: 0.7 },
      { key: 'barriere', x: 855, y: 402, scale: 0.8 },
    ],
    crates: [{ x: 535, y: 488, hp: 4, loot: 'poulet' }],
  },
  5: {
    decor: [
      { key: 'lampadaire_allume', x: 190, y: 370, scale: 0.92 },
      { key: 'obj_baril', x: 330, y: 488, scale: 0.72 },
      { key: 'buisson', x: 790, y: 484, scale: 0.88 },
      { key: 'lampadaire_allume', x: 880, y: 370, scale: 0.92 },
    ],
    crates: [{ x: 250, y: 475, hp: 4, loot: 'poulet' }],
  },
};

/** Objets placables dans l'éditeur. */
export const EDITOR_PALETTE = [
  { key: 'lampadaire_allume', scale: 1.05 },
  { key: 'lampadaire_eteint', scale: 1.05 },
  { key: 'poubelle', scale: 1 },
  { key: 'banc', scale: 1 },
  { key: 'buisson', scale: 1 },
  { key: 'sacs_poubelle', scale: 1 },
  { key: 'stop', scale: 1 },
  { key: 'interdit', scale: 1 },
  { key: 'cone', scale: 0.95 },
  { key: 'bac', scale: 1 },
  { key: 'barriere', scale: 1 },
  { key: 'bouche', scale: 1 },
  { key: 'incendie', scale: 1 },
  { key: 'transfo', scale: 1 },
  { key: 'obj_poubelle', scale: 0.78 },
  { key: 'obj_baril', scale: 0.8 },
  { key: 'obj_caisse', scale: 0.82 },
  { key: 'obj_benne', scale: 0.75 },
  { key: 'obj_brasero', scale: 0.8 },
  { key: '__crate__', scale: 0.92, isCrate: true },
];

export const CRATE_LOOT_OPTIONS = [
  { id: 'random', label: 'Aléatoire' },
  { id: 'poulet', label: 'Poulet' },
  { id: 'none', label: 'Rien' },
  { id: POLICE_ITEM, label: 'Police' },
  ...WEAPON_KEYS.map((k) => ({ id: k, label: k })),
];

export function loadAllPlacements() {
  try {
    const raw = localStorage.getItem(PLACEMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAllPlacements(data) {
  localStorage.setItem(PLACEMENTS_STORAGE_KEY, JSON.stringify(data));
}

export function getStagePlacements(levelIdx, stageIdx) {
  const all = loadAllPlacements();
  const lv = all[String(levelIdx)];
  const st = lv?.[String(stageIdx)];
  // Niveau 1 : une composition équilibrée est fournie par défaut. La présence
  // d'une entrée locale, même vide, signifie que l'utilisateur l'a personnalisée.
  const source = st ?? (levelIdx === 0 ? LEVEL1_DEFAULT_PLACEMENTS[stageIdx] : null);
  if (!source) return emptyPlacements();
  return {
    decor: Array.isArray(source.decor) ? source.decor.map(cloneDecor) : [],
    crates: Array.isArray(source.crates) ? source.crates.map(cloneCrate) : [],
  };
}

export function setStagePlacements(levelIdx, stageIdx, placements) {
  const all = loadAllPlacements();
  if (!all[String(levelIdx)]) all[String(levelIdx)] = {};
  all[String(levelIdx)][String(stageIdx)] = {
    decor: (placements.decor ?? []).map(cloneDecor),
    crates: (placements.crates ?? []).map(cloneCrate),
  };
  saveAllPlacements(all);
}

export function hasAuthoredPlacements(levelIdx, stageIdx) {
  const p = getStagePlacements(levelIdx, stageIdx);
  return p.decor.length > 0 || p.crates.length > 0;
}

export function exportPlacementsBlob() {
  return new Blob([JSON.stringify(loadAllPlacements(), null, 2)], { type: 'application/json' });
}

export function importPlacementsFromObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  saveAllPlacements(obj);
  return true;
}

function emptyPlacements() {
  return { decor: [], crates: [] };
}

function cloneDecor(d) {
  return { key: d.key, x: Math.round(d.x), y: Math.round(d.y), scale: d.scale ?? 1 };
}

function cloneCrate(c) {
  return {
    x: Math.round(c.x),
    y: Math.round(c.y),
    hp: c.hp ?? 3,
    loot: c.loot ?? 'random',
  };
}

/** Clés décor chargées au boot (hors fonds plein écran). */
export function editorDecorKeys() {
  const layerProps = LEVEL1_TEXTURE_KEYS.filter(
    (k) => !LEVEL1_STAGE_PARTS.includes(k)
  );
  return [...new Set([...layerProps, 'obj_poubelle', 'obj_baril', 'obj_caisse', 'obj_benne', 'obj_brasero'])];
}
