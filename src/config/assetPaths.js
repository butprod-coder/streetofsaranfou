/** Sous-dossier assets/ pour une cle d'image. */
import {
  LEVEL1_TEXTURE_KEYS,
  LEVEL2_TEXTURE_KEYS,
  LEVEL3_TEXTURE_KEYS,
  LEVEL4_TEXTURE_KEYS,
  LEVEL5_TEXTURE_KEYS,
} from './levelLayers.js';

export const PLAYABLE_CHARS = [
  'karonux', 'jualos', 'yanu', 'lorenzo', 'jo', 'kikor', 'gustavax',
];

const ENEMY_DIRS = [
  'charlingals',
  'orelsan',
  'papy_jala',
  'remy',
  'triso',
  'guylux',
  'kikor_e',
  'makouille',
];

export function assetSubdir(key) {
  for (const c of PLAYABLE_CHARS) {
    if (key === `${c}_sheet` || key === `${c}_p`) return c;
    if (key.startsWith(`sp_${c}_`)) return c;
    if (key.startsWith(`${c}_`)) {
      const suffix = key.slice(c.length + 1);
      if (/^(marche|court|fight|idle|saut|saute|tombe|mort|meurt|poing|pied|chope|genou\d*)(\s*\(\d+\)|\d+)?$/.test(suffix)) return c;
      if (/^\d+$/.test(suffix)) return c;
    }
  }
  for (const e of ENEMY_DIRS) {
    if (key === `${e}_sheet` || key === `${e}_p`) return `enemies/${e}`;
    if (key.startsWith(`${e}_`)) return `enemies/${e}`;
  }
  if (key.startsWith('billets_')) return 'enemies/charlingals';
  if (key === 'carte') return 'enemies/guylux';
  if (key.startsWith('papy_fumee')) return 'enemies/papy_jala';
  if (key.startsWith('cop_')) return 'shared/police';
  if (key.startsWith('bk_')) return 'boss';
  if (key.startsWith('w_')) return 'shared/weapons';
  if (key.startsWith('obj_') || key.startsWith('crate')) return 'shared/decor';
  if (key.startsWith('level_bg_') || key === 'titlebg') return 'shared/levels';
  if (LEVEL1_TEXTURE_KEYS.includes(key)) return 'shared/levels/level1';
  if (LEVEL2_TEXTURE_KEYS.includes(key)) return 'shared/levels/level2';
  if (LEVEL3_TEXTURE_KEYS.includes(key)) return 'shared/levels/level3';
  if (LEVEL4_TEXTURE_KEYS.includes(key)) return 'shared/levels/level4';
  if (LEVEL5_TEXTURE_KEYS.includes(key)) return 'shared/levels/level5';
  if (key === 'chicken' || key === 'chicken_gold' || key === 'skateboard') return 'shared/pickups';
  if (key === 'specials_storyboard') return 'shared/specials';
  return '';
}

export function assetRelPath(key, ext) {
  const sub = assetSubdir(key);
  const base = sub ? `${sub}/${key}` : key;
  return `${base}.${ext}`;
}
