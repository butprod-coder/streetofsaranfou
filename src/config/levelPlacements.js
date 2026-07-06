import { WEAPON_KEYS, POLICE_ITEM } from './weapons.js';
import { LEVEL1_TEXTURE_KEYS, LEVEL1_STAGE_PARTS } from './levelLayers.js';

export const PLACEMENTS_STORAGE_KEY = 'saranfou_placements_v1';

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
  if (!lv) return emptyPlacements();
  const st = lv[String(stageIdx)];
  if (!st) return emptyPlacements();
  return {
    decor: Array.isArray(st.decor) ? st.decor.map(cloneDecor) : [],
    crates: Array.isArray(st.crates) ? st.crates.map(cloneCrate) : [],
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
