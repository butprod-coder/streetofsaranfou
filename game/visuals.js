import { ELITES } from './elite-data.js';
import { CLASSIC_SPRITES } from './classic-sprites.js';
import { HERO_IDS } from './hero-sprites.js';
import { ENCORE_ELITES } from './elite-encore-data.js';
import { SCENERY_SPRITES } from './scenery.js';
import { HERO_ACTION_SPRITES } from './weapons.js';
import { STREET_ENEMIES } from './street-enemies-data.js';
// Keep extended hands, prone bodies and detached FX inside their atlas region.
const STREET_GUTTERS = {
  albero: { rowColumns: { 1: [0, .265, .5, .78, 1], 2: [0, .288, .5, .75, 1] } },
  oliver: { rowColumns: { 1: [0, .278, .5, .78, 1] } },
  titou: { rowCuts: [0, 1 / 3, .655, 1], rowColumns: { 1: [0, .25, .5, .785, 1], 2: [0, .25, .5, .78, 1] } },
  pichoff: { rowCuts: [0, 1 / 3, .655, 1], rowColumns: { 1: [0, .273, .5, .785, 1], 2: [0, .348, .515, .765, 1] } },
  cedric: { rowCuts: [0, 1 / 3, .645, 1], rowColumns: { 1: [0, .278, .5, .785, 1] } },
};
// Hand-tuned gutters preserve oversized paddles, lunges and crouched transformations.
const ELITE_GUTTERS = {
  precieux: { rowColumns: { 1: [0, .323, .5, .75, 1], 2: [0, .376, .5, .75, 1] } },
  bolorouet: { cells: { 4: [0, 1 / 3, .22, 2 / 3] } },
  fouine: { rowCuts: [0, .417, .712, 1], rowColumns: { 1: [0, .28, .5, .75, 1], 2: [0, .28, .5, .75, 1] } },
  princesse: { rowCuts: [0, .345, .668, 1], cells: { 4: [0, .345, .22, .668] } },
  kayak: { rowCuts: [0, .359, .710, 1], columnCuts: [0, .26, .52, .762, 1], rowColumns: { 1: [0, .278, .52, .78, 1], 2: [0, .317, .52, .76, 1] } },
  canape: { rowCuts: [0, .359, .696, 1], rowColumns: { 1: [0, .27, .5, .75, 1], 2: [0, .27, .5, .75, 1] } },
};
const frames = (prefix, count, suffix = '.png') => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}${suffix}`);
export const VISUALS = {
  car: frames('/assets/boss/boss_karonux/entree_golf (', 4, ').png'),
  wreck: frames('/assets/boss/boss_karonux/destruction_golf (', 4, ').png'),
  smokeHeal: frames('/assets/boss/boss_karonux/clope', 4),
  bike: frames('/assets/boss/boss_kikor/boss_kikor_velo_roule (', 2, ').png'),
  painter: frames('/assets/boss/boss_kikor/boss_kikor_peinture_preparation (', 2, ').png'),
  easel: frames('/assets/boss/boss_kikor/chevalet (', 6, ').png'),
  creation: frames('/assets/boss/boss_kikor/kikor_ennemi_spawn (', 3, ').png'),
  pig: ['/assets/shared/specials/transformations-v3.png'],
  wolf: ['/assets/shared/specials/transformations-v3.png'],
  tornado: ['/assets/shared/specials/transformations-v3.png'],
  bottle: ['/assets/shared/weapons/w_bouteille.png'],
  card: ['/assets/enemies/guylux/carte.png'],
  paint: ['/assets/boss/boss_kikor/pinceau (1).png'],
  spit: frames('/assets/enemies/triso/triso_special', 3),
};
export const ARCADE_SPRITES = {
  ...SCENERY_SPRITES,
  ...HERO_ACTION_SPRITES,
  weaponItems: { file: 'weapons', folder: 'shared/scenery', cols: 3, rows: 2, height: 24, cells: { 3: [0, .5, .39, 1], 4: [.4, .5, .67, 1] } },
  golf: { file: 'golf', folder: 'heroes', cols: 3, rows: 1, columnCuts: [0, .326, .674, 1], height: 115 },
  creation: { file: 'creation', folder: 'heroes', cols: 4, rows: 3, height: 96 },
  ...Object.fromEntries(HERO_IDS.map(id => [`hero_${id}`, { file: id, folder: 'heroes', cols: 4, rows: 4, height: 144 }])),
  ...Object.fromEntries(Object.entries(CLASSIC_SPRITES).map(([key, data]) => [key, { file: key, folder: 'enemies/classics', cols: 4, rows: 3, ...data }])),
  ...Object.fromEntries(Object.entries(ELITES).map(([key, data]) => [key, { file: key, folder: ENCORE_ELITES[key] ? 'enemies/encore' : 'enemies/elites', cols: 4, rows: 3, height: data.height, ...ELITE_GUTTERS[key] }])),
  ...Object.fromEntries(Object.entries(STREET_ENEMIES).map(([key, data]) => [
    `street_${key}`, { file: key, folder: 'enemies/street', cols: 4, rows: 3, height: data.height, ...STREET_GUTTERS[key] },
  ])),
  fireFX: { file: 'fire-effects', cols: 4, rows: 3, height: 80 },
  gustavax: { file: 'gustavax-user', folder: 'gustavax', cols: 4, rows: 4, rowCuts: [0, .2823, .5263, .762, 1], columnCuts: [0, .25, .53, .75, 1], height: 144 },
  wrestler: { file: 'wrestler-user', folder: 'gustavax', cols: 4, rows: 3, rowCuts: [0, .3287, 2 / 3, 1], columnCuts: [0, .25, .5345, .75, 1], rowColumns: { 2: [0, .25, .51, .75, 1] }, height: 177 },
  crate: { file: 'crate', cols: 3, rows: 1, height: 78 },
  barrel: { file: 'barrel', cols: 3, rows: 1, height: 98 },
  bin: { file: 'bin', cols: 3, rows: 1, height: 111 },
  car: { file: 'bonus-car', cols: 1, rows: 3, height: 145 },
  food: { file: 'food', cols: 1, rows: 1, height: 32 },
  energy: { file: 'energy', cols: 1, rows: 1, height: 38 },
  dash: { file: 'dash', cols: 3, rows: 1, height: 32 },
};
export const arcadeUrl = key => `/assets/${ARCADE_SPRITES[key].folder || 'shared/arcade'}/${ARCADE_SPRITES[key].file}.${ARCADE_SPRITES[key].ext || 'png'}`;
export const EXTRA_ASSETS = [...Object.values(VISUALS).flat(), ...Object.keys(ARCADE_SPRITES).map(arcadeUrl)];
// Source atlas is 1254². Runtime rects retain alpha without rewriting the generated image.
export const TRANSFORM_ROWS = { pig: [40, 330], wolf: [410, 402], tornado: [815, 439] };
export const PATTERN_LABELS = {
  rainbowStorm: 'PRINCESSE · SALVE ARC-EN-CIEL', preciousHunt: 'MON PRÉCIEUX · ATTENTION AU BOND', kayakRush: 'KAYAK · CHARGE À LA RAME',
  sofaDrop: 'LIVRAISON EXPRESS · BOUGE !', ferretHunt: 'LA FOUINE · CHANGE DE LIGNE', finalRing: 'DERNIER ROUND · TROUVE L’OUVERTURE',
  carRush: 'GOLF · ÉCARTE-TOI !', carRev: 'COUP D’ACCÉLÉRATEUR', rush: 'CHARGE', combo: 'RAFALE DE POINGS',
  smoke: 'IL FUME · INTERROMPS-LE !', paint: 'DÉTRUIS LES TABLEAUX', brush: 'JET DE PINCEAUX', bike: 'VÉLO · CHANGE DE LIGNE',
  whisky: 'WHISKY · INTERROMPS-LE !', workout: 'SPRINT', burpees: 'BURPEES', cigarettes: 'MÉGOTS EN FEU', petanque: 'PÉTANQUE',
  longFist: 'POING À RALLONGE', doubleFist: 'DOUBLE ALLONGE', sweepFist: 'BALAYAGE À RALLONGE',
  gun: 'TIR EN RAFALE', crossfire: 'TIRS CROISÉS', stomp: 'ONDE DE CHOC', guards: 'LA GARDE', flames: 'LE DERNIER FEU',
};
