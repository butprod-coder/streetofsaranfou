import { SCENERY_SPRITES, streetDecor } from './scenery.js';

export const LAYOUT_KEY = 'saranfou_reborn_layouts_v1';
export const MAX_DECOR = 40;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Shared validation for local storage, imported files and host-authored network decor.
export function validateDecor(items) {
  if (!Array.isArray(items) || items.length > MAX_DECOR) throw new Error(`Maximum ${MAX_DECOR} décors par rue.`);
  return items.map(d => {
    if (!d || !Object.hasOwn(SCENERY_SPRITES, d.key) || ![d.x, d.y, d.height].every(Number.isFinite)) throw new Error('Placement de décor invalide.');
    return { scenery: true, key: d.key, x: Math.round(clamp(d.x, 0, 1280)), y: Math.round(clamp(d.y, 0, 720)),
      height: Math.round(clamp(d.height, 20, 320)), facing: d.facing === -1 ? -1 : 1 };
  });
}
export function validateLayouts(data) {
  if (!data || data.version !== 1 || !data.streets || typeof data.streets !== 'object' || Array.isArray(data.streets)) throw new Error('Ce fichier n’est pas une sauvegarde de niveaux Reborn.');
  const streets = {};
  for (const [key, items] of Object.entries(data.streets)) {
    if (!/^[0-5]:[0-5]$/.test(key)) throw new Error('Quartier ou rue invalide.');
    streets[key] = validateDecor(items);
  }
  return { version: 1, streets };
}
export function readLayouts(storage = globalThis.localStorage) {
  try { const raw = storage?.getItem(LAYOUT_KEY); return raw ? validateLayouts(JSON.parse(raw)) : { version: 1, streets: {} }; }
  catch { return { version: 1, streets: {} }; }
}
export function saveLayouts(data, storage = globalThis.localStorage) {
  const clean = validateLayouts(data);
  if (!storage) throw new Error('La sauvegarde locale est indisponible. Exporte tes placements.');
  storage.setItem(LAYOUT_KEY, JSON.stringify(clean));
  return clean;
}
export function layoutFor(chapter, stage, data = readLayouts()) {
  return validateDecor(data.streets[`${chapter}:${stage}`] ?? streetDecor(chapter, stage));
}
