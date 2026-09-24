import { ELITES } from './elite-data.js';
import { CLASSIC_SPRITES } from './classic-sprites.js';
import { HERO_IDS } from './hero-sprites.js';
import { ENCORE_ELITES } from './elite-encore-data.js';
import { SCENERY_SPRITES } from './scenery.js';
import { HERO_ACTION_SPRITES } from './weapons.js';
import { STREET_ENEMIES } from './street-enemies-data.js';
// Keep extended hands, prone bodies and detached FX inside their atlas region.
const STREET_GUTTERS = {
  lorenzo_pigeons: { rowCuts: [0, .455, .745, 1], rowColumns: { 2: [0, .275, .5, .75, 1] } },
  titou_bowling: { rowCuts: [0, .38, .675, 1], rowColumns: { 1: [0, .315, .5, .79, 1], 2: [0, .35, .5, .75, 1] } },
  yann_fluo: { rowCuts: [0, .35, .675, 1], rowColumns: { 1: [0, .275, .5, .77, 1], 2: [0, .31, .5, .75, 1] } },
  kikor_velo: { rowCuts: [0, .35, .665, 1] },
  jo_rose: { rowCuts: [0, .35, .665, 1], rowColumns: { 2: [0, .31, .5, .75, 1] } },
  karonux_plongeur: { rowCuts: [0, .345, .665, 1], rowColumns: { 1: [0, .275, .5, .76, 1], 2: [0, .31, .5, .75, 1] } },
  gustavax_diable: { rowCuts: [0, .35, .675, 1], rowColumns: { 2: [0, .28, .5, .75, 1] } },
  jualos_karaoke: { rowCuts: [0, .36, .685, 1], rowColumns: { 1: [0, .25, .5, .775, 1] } },
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
  gustavaxPatron:{file:'patron-v2',folder:'boss/boss_gustavax',cols:4,rows:4,height:215,cleanComponents:true,rowCuts:[0,.271,.518,.776,1],cells:{15:[.712,.776,1,1]}},
  gustavaxSmoke:{file:'fumee-v2',folder:'boss/boss_gustavax',cols:4,rows:4,height:215,cleanComponents:true,rowCuts:[0,.276,.51,.774,1],cells:{15:[.71,.774,1,1]}},
  gustavaxLast:{file:'dernier-mot-v2',folder:'boss/boss_gustavax',cols:4,rows:4,height:215,cleanComponents:true,rowCuts:[0,.265,.501,.778,1],cells:{5:[.25,.265,.522,.501],8:[0,.47,.25,.778],9:[.25,.485,.5,.778],12:[0,.726,.25,1],15:[.718,.778,1,1]}},
  bossGustavax:{file:'gustavax-final',folder:'boss/boss_gustavax',cols:4,rows:2,height:210,cells:{0:[0,0,.36,.46],1:[.365,0,.795,.463],2:[.80,0,1,.455],3:[0,.47,.35,1],4:[.36,.49,.66,1],5:[.70,.46,1,1],6:[.38,.23,.505,.405],7:[.7,.27,.792,.431]}},
  nightBus: { file: 'night-bus', folder: 'shared/scenery', cols: 1, rows: 2, height: 230 },
  nightCart: { file: 'night-cart', folder: 'shared/scenery', cols: 2, rows: 1, height: 100 },
  nightElectric: { file: 'night-electric', folder: 'shared/scenery', cols: 2, rows: 1, height: 120 },
  nightVending: { file: 'night-vending', folder: 'shared/scenery', cols: 2, rows: 1, height: 170 },
  estateProps: { file: 'estate-events', folder: 'shared/scenery', cols: 3, rows: 2, height: 100 },
  bossJualos: { file: 'jualos-boss-v2', folder: 'boss/boss_jualos', cols: 4, rows: 4, height: 222, rowCuts: [0, .30, .55, .78, 1], rowColumns: { 3: [0, .25, .5, .742, 1] } },
  bossJualosSuit: { file: 'jualos-commercial-v2', folder: 'boss/boss_jualos', cols: 4, rows: 3, height: 222, rowCuts: [0, .35, .64, 1], rowColumns: { 1: [0, .25, .52, .725, 1], 2: [0, .25, .52, .75, 1] } },
  bossJualosProps: { file: 'jualos-props-v2', folder: 'boss/boss_jualos', cols: 2, rows: 2, height: 65, rowCuts: [0, .395, 1], rowColumns: { 0: [0, .51, 1], 1: [0, .54, 1] } },
  bossJo: { file: 'jo-boss-v2', folder: 'boss/boss_jo', cols: 4, rows: 4, height: 222, rowCuts: [0, .27, .515, .735, 1] },
  bossJoProps: { file: 'jo-props-v2', folder: 'boss/boss_jo', cols: 3, rows: 2, height: 92, columnCuts: [0, .343, .675, 1], rowColumns: { 1: [0, .45, .675, 1] } },
  bossLorenzo: { file: 'lorenzo-boss-v2', folder: 'boss/boss_lorenzo', cols: 4, rows: 4, height: 222, rowCuts: [0, .30, .55, .80, 1] },
  bossLorenzoProps: { file: 'lorenzo-props-v2', folder: 'boss/boss_lorenzo', cols: 3, rows: 2, height: 140 },
  bossYanu: { file: 'yanu-boss-v2', folder: 'boss/boss_yanu', cols: 4, rows: 4, height: 222, rowCuts: [0, .28, .505, .765, 1], rowColumns: { 3: [0, .242, .554, .744, 1] } },
  bossYanuWater: { file: 'yanu-water-v2', folder: 'boss/boss_yanu', cols: 3, rows: 2, height: 160 },
  bossKikor: { file: 'kikor-boss-v2', folder: 'boss/boss_kikor', cols: 4, rows: 4, height: 222, rowCuts: [0, .285, .555, .76, 1], rowColumns: { 1: [0, .265, .52, .765, 1], 3: [0, .27, .51, .755, 1] } },
  bossKaronux: { file: 'karonux-boss-v2', folder: 'boss/boss_karonux', cols: 4, rows: 4, height: 222, rowCuts: [0, .28, .51, .731, 1] },
  bossGolf: { file: 'golf-boss-v2', folder: 'boss/boss_karonux', cols: 2, rows: 2, height: 145 },
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
export const EXTRA_ASSETS = ['/assets/intros/chene-maillard.png', '/assets/intros/chateau-etang.png', '/assets/intros/stade-colette-besson.png', '/assets/intros/allee-guignace.png', '/assets/intros/cap-saran.png', '/assets/intros/montjoie.png', ...Object.values(VISUALS).flat(), ...Object.keys(ARCADE_SPRITES).map(arcadeUrl)];
// Source atlas is 1254². Runtime rects retain alpha without rewriting the generated image.
export const TRANSFORM_ROWS = { pig: [40, 330], wolf: [410, 402], tornado: [815, 439] };
export const PATTERN_LABELS = {
  executiveCombo:'Le revers du patron · esquive',cigarRain:'Braises · quitte les cercles',chairRush:'Fauteuil lancé · change de ligne',smokeCharge:'Braise rouge · charge imminente',deskSweep:'Deux balayages · recule',deskSlam:'Onde de choc · saute',lastWord:'Dernier avertissement · évite les marques',
  jualosBelly: 'BOUFFI BOUFFON · ÉCARTE-TOI OU SAUTE !', jualosCombo: 'DOUBLE FRAPPE', jualosRush: 'CHARGE DU VENTRE !', jualosSuit: 'ACTE II · LE COMMERCIAL', jualosCash: 'BILLETS GLISSANTS · ATTENTION AU SOL !', jualosBagSwing: 'COUP DE POCHON !', jualosBagSlam: 'IL ÉCRASE SON POCHON · ESQUIVE !',
  joStretch: 'BRAS À RALLONGE · CHANGE DE LIGNE !', joMMA: 'JAB · GENOU · HIGH KICK', joRush: 'GENOU VOLANT · ESQUIVE !', joChannel: 'INVINCIBLE · ÉVITE OU CASSE LES TRANSPALETTES !',
  lorenzoCigarette: 'ANNEAU DE FEU · SAUTE AU PASSAGE !', lorenzoSofa: 'LIVRAISON · PRÉPARE TES COUPS LOURDS !', lorenzoRage: 'IL EST FOU DE RAGE !', lorenzoCombo: 'POING · POING · PIED', lorenzoKick: 'COUP DE PIED',
  yanuTsunami: 'TSUNAMI · CHANGE DE LIGNE OU SAUTE !', yanuHowl: 'BUUUUUUUUU · ESQUIVE LE CRI !', yanuCombo: 'POING · POING · PIED', yanuKick: 'COUP DE PIED',
  kikorPaint: 'IL PEINT SON PROTECTEUR !', kikorBrush: 'COUP DE PINCEAU', kikorHunt: 'GOLLUM · ÉVITE SES MAINS !',
  sleep: 'IL S’ÉCROULE · ESQUIVE !',
  rainbowStorm: 'PRINCESSE · SALVE ARC-EN-CIEL', preciousHunt: 'MON PRÉCIEUX · ATTENTION AU BOND', kayakRush: 'KAYAK · CHARGE À LA RAME',
  sofaDrop: 'LIVRAISON EXPRESS · BOUGE !', ferretHunt: 'LA FOUINE · CHANGE DE LIGNE', finalRing: 'DERNIER ROUND · TROUVE L’OUVERTURE',
  carRush: 'GOLF · ÉCARTE-TOI !', carRev: 'COUP D’ACCÉLÉRATEUR', rush: 'CHARGE', combo: 'RAFALE DE POINGS',
  smoke: 'IL FUME · INTERROMPS-LE !', paint: 'DÉTRUIS LES TABLEAUX', brush: 'JET DE PINCEAUX', bike: 'VÉLO · CHANGE DE LIGNE',
  whisky: 'WHISKY · INTERROMPS-LE !', workout: 'SPRINT', burpees: 'BURPEES', cigarettes: 'MÉGOTS EN FEU', petanque: 'PÉTANQUE',
  longFist: 'POING À RALLONGE', doubleFist: 'DOUBLE ALLONGE', sweepFist: 'BALAYAGE À RALLONGE',
  gun: 'TIR EN RAFALE', crossfire: 'TIRS CROISÉS', stomp: 'ONDE DE CHOC', guards: 'LA GARDE', flames: 'LE DERNIER FEU',
};

