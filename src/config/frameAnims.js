import { ENEMY_FRAME_ANIMS } from './enemyFrameAnims.js';

/** Animations frame par frame (images séparées) pour certains persos. */
/** Hauteur d'affichage vs spritesheet (FH * scaleBase). ~0.75 ≈ taille des anciens persos. */
export const FRAME_DISPLAY_H_MUL = 0.75;

/** Types d'animations frame (clé config → suffixe Phaser). */
export const FRAME_ANIM_TYPES = [
  { key: 'idle', rate: 'idleRate', repeat: -1 },
  { key: 'walk', rate: 'walkRate', repeat: -1 },
  { key: 'run', rate: 'runRate', repeat: -1 },
  { key: 'attack', rate: 'attackRate', repeat: 0 },
  { key: 'punch', rate: 'punchRate', repeat: 0 },
  { key: 'kick', rate: 'kickRate', repeat: 0 },
  { key: 'special', rate: 'specialRate', repeat: 0 },
  { key: 'jump', rate: 'jumpRate', repeat: 0 },
  { key: 'fall', rate: 'fallRate', repeat: 0 },
  { key: 'hurt', rate: 'hurtRate', repeat: 0 },
  { key: 'ko', rate: 'koRate', repeat: 0 },
];

export const FRAME_ANIM_CHARS = {
  karonux: {
    idle: ['karonux_idle (1)', 'karonux_idle (2)', 'karonux_idle (3)', 'karonux_idle (4)'],
    walk: ['karonux_marche (1)', 'karonux_marche (2)', 'karonux_marche (3)', 'karonux_marche (4)'],
    run: [
      'karonux_court (1)',
      'karonux_court (2)',
      'karonux_court (3)',
      'karonux_court (4)',
      'karonux_court (5)',
      'karonux_court (6)',
    ],
    punch: ['karonux_poing (1)', 'karonux_poing (2)', 'karonux_poing (3)', 'karonux_poing (4)'],
    kick: ['karonux_pied (1)', 'karonux_pied (2)', 'karonux_pied (3)', 'karonux_pied (4)'],
    jump: ['karonux_saute (1)', 'karonux_saute (2)', 'karonux_saute (3)', 'karonux_saute (4)'],
    fall: [
      'karonux_tombe (1)',
      'karonux_tombe (2)',
      'karonux_tombe (3)',
      'karonux_tombe (4)',
      'karonux_tombe (5)',
    ],
    ko: ['karonux_mort (1)', 'karonux_mort (2)', 'karonux_mort (3)', 'karonux_mort (4)', 'karonux_mort (5)'],
    idleRate: 4,
    walkRate: 9,
    runRate: 13,
    punchRate: 20,
    kickRate: 16,
    jumpRate: 11,
    fallRate: 14,
    koRate: 8,
    runSpeedRatio: 0.72,
    comboHits: 2,
    comboWindow: 680,
    punchCd: 170,
    kickCd: 300,
    kickDamageBonus: 8,
    kickKnockback: 34,
    kickRangeBonus: 14,
  },
  jualos: {
    idle: ['jualos_idle (1)', 'jualos_idle (2)', 'jualos_idle (3)', 'jualos_idle (4)'],
    walk: ['jualos_marche (1)', 'jualos_marche (2)', 'jualos_marche (3)', 'jualos_marche (4)'],
    run: [
      'jualos_court (1)',
      'jualos_court (2)',
      'jualos_court (3)',
      'jualos_court (4)',
      'jualos_court (5)',
      'jualos_court (6)',
    ],
    punch: ['jualos_poing (1)', 'jualos_poing (2)', 'jualos_poing (3)', 'jualos_poing (4)'],
    kick: ['jualos_pied (1)', 'jualos_pied (2)', 'jualos_pied (3)', 'jualos_pied (4)'],
    jump: ['jualos_saut (1)', 'jualos_saut (2)', 'jualos_saut (3)', 'jualos_saut (4)'],
    fall: [
      'jualos_tombe (1)',
      'jualos_tombe (2)',
      'jualos_tombe (3)',
      'jualos_tombe (4)',
      'jualos_tombe (5)',
    ],
    ko: [
      'jualos_mort (1)',
      'jualos_mort (2)',
      'jualos_mort (3)',
      'jualos_mort (4)',
      'jualos_mort (5)',
      'jualos_mort (6)',
    ],
    idleRate: 4,
    walkRate: 8,
    runRate: 11,
    punchRate: 18,
    kickRate: 15,
    jumpRate: 12,
    fallRate: 16,
    koRate: 8,
    runSpeedRatio: 0.68,
    comboHits: 2,
    comboWindow: 680,
    punchCd: 170,
    kickCd: 300,
    kickDamageBonus: 8,
    kickKnockback: 32,
    kickRangeBonus: 12,
  },
  yanu: {
    idle: ['yanu_idle (1)', 'yanu_idle (2)', 'yanu_idle (3)', 'yanu_idle (4)'],
    walk: ['yanu_marche (1)', 'yanu_marche (2)', 'yanu_marche (3)', 'yanu_marche (4)'],
    run: [
      'yanu_court (1)',
      'yanu_court (2)',
      'yanu_court (3)',
      'yanu_court (4)',
      'yanu_court (5)',
      'yanu_court (6)',
    ],
    punch: ['yanu_poing (1)', 'yanu_poing (2)', 'yanu_poing (3)', 'yanu_poing (4)'],
    kick: ['yanu_pied (1)', 'yanu_pied (2)', 'yanu_pied (3)', 'yanu_pied (4)'],
    jump: ['yanu_saute (1)', 'yanu_saute (2)', 'yanu_saute (3)', 'yanu_saute (4)'],
    fall: ['yanu_tombe (1)', 'yanu_tombe (2)', 'yanu_tombe (3)', 'yanu_tombe (4)'],
    ko: [
      'yanu_meurt (1)',
      'yanu_meurt (2)',
      'yanu_meurt (3)',
      'yanu_meurt (4)',
      'yanu_meurt (5)',
      'yanu_meurt (6)',
    ],
    idleRate: 5,
    walkRate: 11,
    runRate: 15,
    punchRate: 19,
    kickRate: 16,
    jumpRate: 14,
    fallRate: 18,
    koRate: 10,
    runSpeedRatio: 0.65,
    comboHits: 2,
    comboWindow: 680,
    punchCd: 165,
    kickCd: 290,
    kickDamageBonus: 9,
    kickKnockback: 36,
    kickRangeBonus: 14,
  },
  kikor: {
    idle: ['kikor_idle (1)', 'kikor_idle (2)', 'kikor_idle (3)', 'kikor_idle (4)'],
    walk: ['kikor_marche (1)', 'kikor_marche (2)', 'kikor_marche (3)', 'kikor_marche (4)'],
    run: [
      'kikor_court (1)',
      'kikor_court (2)',
      'kikor_court (3)',
      'kikor_court (4)',
      'kikor_court (5)',
      'kikor_court (6)',
    ],
    punch: ['kikor_poing (1)', 'kikor_poing (2)', 'kikor_poing (3)', 'kikor_poing (4)'],
    kick: ['kikor_pied (1)', 'kikor_pied (2)', 'kikor_pied (3)', 'kikor_pied (4)'],
    jump: ['kikor_saute (1)', 'kikor_saute (2)', 'kikor_saute (3)', 'kikor_saute (4)'],
    fall: [
      'kikor_tombe (1)',
      'kikor_tombe (2)',
      'kikor_tombe (3)',
      'kikor_tombe (4)',
      'kikor_tombe (5)',
    ],
    ko: [
      'kikor_mort (1)',
      'kikor_mort (2)',
      'kikor_mort (3)',
      'kikor_mort (4)',
      'kikor_mort (5)',
      'kikor_mort (6)',
    ],
    idleRate: 4,
    walkRate: 9,
    runRate: 13,
    punchRate: 18,
    kickRate: 15,
    jumpRate: 12,
    fallRate: 14,
    koRate: 8,
    runSpeedRatio: 0.72,
    comboHits: 2,
    comboWindow: 680,
    punchCd: 170,
    kickCd: 300,
    kickDamageBonus: 8,
    kickKnockback: 32,
    kickRangeBonus: 12,
  },
  jo: {
    idle: ['jo_idle (1)', 'jo_idle (2)', 'jo_idle (3)', 'jo_idle (4)'],
    walk: ['jo_marche (1)', 'jo_marche (2)', 'jo_marche (3)', 'jo_marche (4)'],
    run: [
      'jo_court (1)',
      'jo_court (2)',
      'jo_court (3)',
      'jo_court (4)',
      'jo_court (5)',
      'jo_court (6)',
    ],
    punch: ['jo_poing (1)', 'jo_poing (2)', 'jo_poing (3)'],
    kick: ['jo_pied (1)', 'jo_pied (2)', 'jo_pied (3)'],
    jump: ['jo_saute1', 'jo_saute2', 'jo_saute3', 'jo_saute4'],
    fall: [
      'jo_tombe (1)',
      'jo_tombe (2)',
      'jo_tombe (3)',
      'jo_tombe (4)',
      'jo_tombe (5)',
    ],
    ko: [
      'jo_mort (1)',
      'jo_mort (2)',
      'jo_mort (3)',
      'jo_mort (4)',
      'jo_mort (5)',
      'jo_mort (6)',
    ],
    idleRate: 5,
    walkRate: 11,
    runRate: 16,
    punchRate: 20,
    kickRate: 17,
    jumpRate: 13,
    fallRate: 14,
    koRate: 8,
    runSpeedRatio: 0.62,
    comboHits: 2,
    comboWindow: 620,
    punchCd: 145,
    kickCd: 265,
    kickDamageBonus: 8,
    kickKnockback: 34,
    kickRangeBonus: 12,
  },
  lorenzo: {
    idle: ['lorenzo_idle1', 'lorenzo_idle2'],
    walk: ['lorenzo_marche1', 'lorenzo_marche2', 'lorenzo_marche3'],
    run: ['lorenzo_court1', 'lorenzo_court2', 'lorenzo_court3', 'lorenzo_court4'],
    attack: [
      'lorenzo_fight1',
      'lorenzo_fight2',
      'lorenzo_fight3',
      'lorenzo_fight4',
      'lorenzo_fight5',
      'lorenzo_fight6',
      'lorenzo_fight7',
    ],
    idleRate: 3,
    walkRate: 8,
    runRate: 11,
    attackRate: 14,
    runSpeedRatio: 0.68,
  },
  ...ENEMY_FRAME_ANIMS,
};

/** Réutilisation des sprites frame d’un autre perso (ennemis / alias). */
export const FRAME_SHEET_ALIAS = {};

export function resolveFrameSheet(sheet) {
  const key = FRAME_SHEET_ALIAS[sheet] ?? sheet;
  return FRAME_ANIM_CHARS[key] ? key : sheet;
}

export function frameAnimKeys() {
  const keys = [];
  for (const cfg of Object.values(FRAME_ANIM_CHARS)) {
    for (const { key } of FRAME_ANIM_TYPES) {
      if (cfg[key]) keys.push(...cfg[key]);
    }
  }
  return keys;
}

export function hasFrameAnim(sheet) {
  return !!FRAME_ANIM_CHARS[sheet];
}

export function hasFrameClip(sheet, name) {
  const cfg = FRAME_ANIM_CHARS[sheet];
  return cfg && cfg[name]?.length > 0;
}

export function hasAttackCombo(sheet) {
  const cfg = FRAME_ANIM_CHARS[sheet];
  return !!(cfg?.punch?.length && cfg?.kick?.length);
}
