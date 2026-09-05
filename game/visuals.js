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
};
export const EXTRA_ASSETS = Object.values(VISUALS).flat();
// Source atlas is 1254². Runtime rects retain alpha without rewriting the generated image.
export const TRANSFORM_ROWS = { pig: [40, 330], wolf: [410, 402], tornado: [815, 439] };
export const PATTERN_LABELS = {
  carRush: 'GOLF · ÉCARTE-TOI !', carRev: 'COUP D’ACCÉLÉRATEUR', rush: 'CHARGE', combo: 'RAFALE DE POINGS',
  smoke: 'IL FUME · INTERROMPS-LE !', paint: 'DÉTRUIS LES TABLEAUX', brush: 'JET DE PINCEAUX', bike: 'VÉLO · CHANGE DE LIGNE',
  whisky: 'WHISKY · INTERROMPS-LE !', workout: 'SPRINT', burpees: 'BURPEES', cigarettes: 'MÉGOTS EN FEU', petanque: 'PÉTANQUE',
  longFist: 'POING À RALLONGE', doubleFist: 'DOUBLE ALLONGE', sweepFist: 'BALAYAGE À RALLONGE',
  gun: 'TIR EN RAFALE', crossfire: 'TIRS CROISÉS', stomp: 'ONDE DE CHOC', guards: 'LA GARDE', flames: 'LE DERNIER FEU',
};
