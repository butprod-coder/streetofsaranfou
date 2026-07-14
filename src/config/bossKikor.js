import { FH } from './gameConfig.js';

/** Fichiers dans assets/boss/boss_kikor/ (hors brouillons image_*.png). */
export const KIKOR_BOSS_FILES = [
  'boss_kikor_entree (1).png',
  'boss_kikor_entree (2).png',
  'boss_kikor_entree (3).png',
  'boss_kikor_idle (1).png',
  'boss_kikor_idle (2).png',
  'boss_kikor_idle (3).png',
  'boss_kikor_idle (4).png',
  'boss_kikor_marche (1).png',
  'boss_kikor_marche (2).png',
  'boss_kikor_marche (3).png',
  'boss_kikor_marche (4).png',
  'boss_kikor_hurt(1).png',
  'boss_kikor_hurt(2).png',
  'boss_kikor_hurt(3).png',
  'boss_kikor_mort (1).png',
  'boss_kikor_mort (2).png',
  'boss_kikor_mort (3).png',
  'boss_kikor_mort (4).png',
  'boss_kikor_poing (1).png',
  'boss_kikor_poing (2).png',
  'boss_kikor_poing (3).png',
  'boss_kikor_poing (4).png',
  'boss_kikor_pied (1).png',
  'boss_kikor_pied (2).png',
  'boss_kikor_pied (3).png',
  'boss_kikor_peinture_preparation (1).png',
  'boss_kikor_peinture_preparation (2).png',
  'boss_kikor_coup_pinceau (1).png',
  'boss_kikor_coup_pinceau (2).png',
  'boss_kikor_lance_pinceau (3).png',
  'boss_kikor_monte_velo (1).png',
  'boss_kikor_monte_velo (2).png',
  'boss_kikor_monte_velo (3).png',
  'boss_kikor_monte_velo (4).png',
  'boss_kikor_velo_idle (1).png',
  'boss_kikor_velo_idle (2).png',
  'boss_kikor_velo_roule (1).png',
  'boss_kikor_velo_roule (2).png',
  'boss_kikor_velo_derapage (1).png',
  'boss_kikor_velo_derapage (2).png',
  'boss_kikor_velo_derapage (3).png',
  'boss_kikor_velo_mort (1).png',
  'boss_kikor_velo_mort (2).png',
  'boss_kikor_velo_mort (3).png',
  'boss_kikor_velo_mort (4).png',
  'chevalet (1).png',
  'chevalet (2).png',
  'chevalet (3).png',
  'chevalet (4).png',
  'chevalet (5).png',
  'chevalet (6).png',
  'kikor_ennemi_spawn (1).png',
  'kikor_ennemi_spawn (2).png',
  'kikor_ennemi_spawn (3).png',
  'kikor_ennemi_hurt (1).png',
  'kikor_ennemi_hurt (2).png',
  'kikor_ennemi_hurt (3).png',
  'pinceau (1).png',
  'pinceau (2).png',
  'pinceau (3).png',
  'pinceau (4).png',
  'pinceau (5).png',
  'pinceau (6).png',
  'pinceau (7).png',
  'fumée (1).png',
  'fumée (2).png',
  'fumée (3).png',
  'taches (1).png',
  'taches (2).png',
  'taches (3).png',
  'taches (4).png',
];

export function kikorBossTexKey(filename) {
  return (
    'bk_' +
    filename
      .replace(/\.png$/i, '')
      .replace(/\(/g, '_')
      .replace(/\)/g, '')
      .replace(/\s+/g, '')
      .replace(/_+/g, '_')
      .toLowerCase()
  );
}

export function kikorBossTexPath(filename) {
  return `assets/boss/boss_kikor/${filename}`;
}

/** Affichage boss (+25 % vs gabarit joueur de référence). */
export const KIKOR_BOSS_SCALE = (1 / 1.22) * 1.25;

export function kikorBossDisplayH(playerScale = 0.82) {
  return FH * playerScale * 0.75 * 1.22 * KIKOR_BOSS_SCALE;
}

const f = (name) => kikorBossTexKey(name);

export const KIKOR_ANIMS = [
  { key: 'bk_kikor_entree', files: ['boss_kikor_entree (1).png', 'boss_kikor_entree (2).png', 'boss_kikor_entree (3).png'], rate: 8, repeat: 0 },
  { key: 'bk_kikor_idle', files: ['boss_kikor_idle (1).png', 'boss_kikor_idle (2).png', 'boss_kikor_idle (3).png', 'boss_kikor_idle (4).png'], rate: 5, repeat: -1 },
  { key: 'bk_kikor_marche', files: ['boss_kikor_marche (1).png', 'boss_kikor_marche (2).png', 'boss_kikor_marche (3).png', 'boss_kikor_marche (4).png'], rate: 10, repeat: -1 },
  { key: 'bk_kikor_hurt', files: ['boss_kikor_hurt(1).png', 'boss_kikor_hurt(2).png', 'boss_kikor_hurt(3).png'], rate: 14, repeat: 0 },
  { key: 'bk_kikor_mort', files: ['boss_kikor_mort (1).png', 'boss_kikor_mort (2).png', 'boss_kikor_mort (3).png', 'boss_kikor_mort (4).png'], rate: 7, repeat: 0 },
  { key: 'bk_kikor_poing', files: ['boss_kikor_poing (1).png', 'boss_kikor_poing (2).png', 'boss_kikor_poing (3).png', 'boss_kikor_poing (4).png'], rate: 16, repeat: 0 },
  { key: 'bk_kikor_pied', files: ['boss_kikor_pied (1).png', 'boss_kikor_pied (2).png', 'boss_kikor_pied (3).png'], rate: 14, repeat: 0 },
  { key: 'bk_kikor_peinture_prep', files: ['boss_kikor_peinture_preparation (1).png', 'boss_kikor_peinture_preparation (2).png'], rate: 8, repeat: 0 },
  { key: 'bk_kikor_coup_pinceau', files: ['boss_kikor_coup_pinceau (1).png', 'boss_kikor_coup_pinceau (2).png'], rate: 10, repeat: 0 },
  {
    key: 'bk_kikor_lance_pinceau',
    files: ['boss_kikor_lance_pinceau (1).png', 'boss_kikor_lance_pinceau (2).png', 'boss_kikor_lance_pinceau (3).png'],
    rate: 14,
    repeat: 0,
  },
  { key: 'bk_kikor_monte_velo', files: ['boss_kikor_monte_velo (1).png', 'boss_kikor_monte_velo (2).png', 'boss_kikor_monte_velo (3).png', 'boss_kikor_monte_velo (4).png'], rate: 10, repeat: 0 },
  { key: 'bk_kikor_velo_idle', files: ['boss_kikor_velo_idle (1).png', 'boss_kikor_velo_idle (2).png'], rate: 5, repeat: -1 },
  { key: 'bk_kikor_velo_roule', files: ['boss_kikor_velo_roule (1).png', 'boss_kikor_velo_roule (2).png'], rate: 12, repeat: -1 },
  { key: 'bk_kikor_velo_derapage', files: ['boss_kikor_velo_derapage (1).png', 'boss_kikor_velo_derapage (2).png', 'boss_kikor_velo_derapage (3).png'], rate: 14, repeat: 0 },
  { key: 'bk_kikor_velo_mort', files: ['boss_kikor_velo_mort (1).png', 'boss_kikor_velo_mort (2).png', 'boss_kikor_velo_mort (3).png', 'boss_kikor_velo_mort (4).png'], rate: 8, repeat: 0 },
  { key: 'bk_kikor_chevalet', files: ['chevalet (1).png', 'chevalet (2).png', 'chevalet (3).png', 'chevalet (4).png', 'chevalet (5).png', 'chevalet (6).png'], rate: 6, repeat: 0 },
  { key: 'bk_kikor_spawn', files: ['kikor_ennemi_spawn (1).png', 'kikor_ennemi_spawn (2).png', 'kikor_ennemi_spawn (3).png'], rate: 10, repeat: 0 },
  { key: 'bk_kikor_ennemi_hurt', files: ['kikor_ennemi_hurt (1).png', 'kikor_ennemi_hurt (2).png', 'kikor_ennemi_hurt (3).png'], rate: 12, repeat: 0 },
  {
    key: 'bk_kikor_pinceau_vol',
    files: ['pinceau (1).png', 'pinceau (2).png', 'pinceau (3).png', 'pinceau (4).png', 'pinceau (5).png', 'pinceau (6).png', 'pinceau (7).png'],
    rate: 16,
    repeat: -1,
  },
  { key: 'bk_kikor_fumee', files: ['fumée (1).png', 'fumée (2).png', 'fumée (3).png'], rate: 8, repeat: 0 },
];

export const KIKOR_BRUSH_VARIANTS = [
  { tex: 1, speed: 280, vy: 0, spin: 1 },
  { tex: 2, speed: 310, vy: -55, spin: 1.2 },
  { tex: 3, speed: 300, vy: 45, spin: 0.9 },
  { tex: 4, speed: 340, vy: -80, spin: 1.4 },
  { tex: 5, speed: 320, vy: 70, spin: 1.1 },
  { tex: 6, speed: 360, vy: -35, spin: 1.3 },
  { tex: 7, speed: 350, vy: 90, spin: 1.5 },
];

export const KIKOR_CANVAS_HP = 28;

export const KIKOR_TACHE_KEYS = [
  f('taches (1).png'),
  f('taches (2).png'),
  f('taches (3).png'),
  f('taches (4).png'),
];

export const KIKOR_BOSS_DEF = {
  name: 'BENJAMIN ? — LE PEINTRE',
  custom: 'kikor_boss',
  sheet: 'kikor',
  hp: 380,
  fightSpeed: 118,
  fightDamage: 16,
  reach: 86,
  score: 3200,
  enrageAt: 0.5,
  enrageBanner: 'KIKOR ROULE À TOUT VA !',
};

export function createKikorBossAnims(scene) {
  for (const def of KIKOR_ANIMS) {
    if (scene.anims.exists(def.key)) continue;
    scene.anims.create({
      key: def.key,
      frames: def.files.map((file) => ({ key: kikorBossTexKey(file) })),
      frameRate: def.rate,
      repeat: def.repeat,
    });
  }
}
