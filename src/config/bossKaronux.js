import { FH } from './gameConfig.js';

/** Fichiers dans assets/boss/boss_karonux/ */
export const KARONUX_BOSS_FILES = [
  'clope1.png',
  'clope2.png',
  'clope3.png',
  'clope4.png',
  'attaque5_rage_rouge (1).png',
  'attaque5_rage_rouge (2).png',
  'attaque5_rage_rouge (3).png',
  'attaque5_rage_rouge (4).png',
  'attaque5_rage_rouge (5).png',
  'charge1.png',
  'charge2.png',
  'charge3.png',
  'charge4.png',
  'coup_pied (1).png',
  'coup_pied (2).png',
  'coup_pied (3).png',
  'coup_pied (4).png',
  'coup_poing (1).png',
  'coup_poing (2).png',
  'coup_poing (3).png',
  'coup_poing (4).png',
  'coup_poing (5).png',
  'destruction_golf (1).png',
  'destruction_golf (2).png',
  'destruction_golf (3).png',
  'destruction_golf (4).png',
  'entree_golf (1).png',
  'entree_golf (2).png',
  'entree_golf (4).png',
  'idle (1).png',
  'idle (2).png',
  'idle (3).png',
  'idle (4).png',
  'idle (5).png',
  'marche (1).png',
  'marche (2).png',
  'marche (3).png',
  'marche (4).png',
  'marche (5).png',
  'mort (1).png',
  'mort (2).png',
  'recoit_coup (1).png',
  'recoit_coup (2).png',
  'recoit_coup (3).png',
  'recoit_coup (4).png',
];

export function karonuxBossTexKey(filename) {
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

export function karonuxBossTexPath(filename) {
  return `assets/boss/boss_karonux/${filename}`;
}

/** Boss à pied — même hauteur d’affichage qu’un joueur (scaleBase 0.82). */
export const KARONUX_BOSS_SCALE = 1 / 1.22;

export function karonuxBossDisplayH(playerScale = 0.82) {
  return FH * playerScale * 0.75 * 1.22 * KARONUX_BOSS_SCALE;
}

/** Golf — échelle compensée pour conserver la taille visuelle de la voiture. */
export const KARONUX_CAR_SCALE = 0.875 * 1.22 * 1.22;

export function karonuxCarDisplayH(playerScale = 0.82) {
  return karonuxBossDisplayH(playerScale) * 1.22 * KARONUX_CAR_SCALE;
}

const fk = (name) => karonuxBossTexKey(name);

export const KARONUX_ANIMS = [
  { key: 'bk_idle', files: ['idle (1).png', 'idle (2).png', 'idle (3).png', 'idle (4).png', 'idle (5).png'], rate: 5, repeat: -1 },
  { key: 'bk_marche', files: ['marche (1).png', 'marche (2).png', 'marche (3).png', 'marche (4).png', 'marche (5).png'], rate: 10, repeat: -1 },
  { key: 'bk_destruction_golf', files: ['destruction_golf (1).png', 'destruction_golf (2).png', 'destruction_golf (3).png', 'destruction_golf (4).png'], rate: 10, repeat: 0 },
  { key: 'bk_clope', files: ['clope1.png', 'clope2.png', 'clope3.png', 'clope4.png'], rate: 12, repeat: 0 },
  { key: 'bk_clope_fume', files: ['clope3.png', 'clope4.png'], rate: 6, repeat: -1 },
  { key: 'bk_charge_windup', files: ['charge1.png', 'charge2.png'], rate: 10, repeat: 0 },
  { key: 'bk_charge_run', files: ['charge2.png', 'charge3.png'], rate: 14, repeat: -1 },
  { key: 'bk_rage', files: ['attaque5_rage_rouge (1).png', 'attaque5_rage_rouge (2).png', 'attaque5_rage_rouge (3).png', 'attaque5_rage_rouge (4).png', 'attaque5_rage_rouge (5).png'], rate: 14, repeat: 0 },
  { key: 'bk_poing', files: ['coup_poing (1).png', 'coup_poing (2).png', 'coup_poing (3).png', 'coup_poing (4).png', 'coup_poing (5).png'], rate: 16, repeat: 0 },
  { key: 'bk_pied', files: ['coup_pied (1).png', 'coup_pied (2).png', 'coup_pied (3).png', 'coup_pied (4).png'], rate: 14, repeat: 0 },
  { key: 'bk_hurt', files: ['recoit_coup (1).png', 'recoit_coup (2).png', 'recoit_coup (3).png', 'recoit_coup (4).png'], rate: 18, repeat: 0 },
  { key: 'bk_mort', files: ['mort (1).png', 'mort (2).png'], rate: 5, repeat: 0 },
];

export const KARONUX_CAR_FRAMES = {
  drive: fk('entree_golf (1).png'),
  skid: fk('entree_golf (2).png'),
  park: fk('entree_golf (1).png'),
  /** Golf garée, yeux rouges allumés (après le tremblement / phares). */
  awake: fk('entree_golf (4).png'),
};

export const KARONUX_BOSS_DEF = {
  name: 'KARONUX — LE FATIGUÉ',
  custom: 'karonux_boss',
  sheet: 'karonux',
  hp: 400,
  fightSpeed: 172,
  fightDamage: 24,
  reach: 92,
  score: 2200,
  carHp: 380,
};

export function createKaronuxBossAnims(scene) {
  for (const def of KARONUX_ANIMS) {
    if (scene.anims.exists(def.key)) continue;
    const frames = def.files.map((f) => {
      const key = fk(f);
      if (!scene.textures.exists(key)) return null;
      return { key };
    }).filter(Boolean);
    if (!frames.length) continue;
    scene.anims.create({
      key: def.key,
      frames,
      frameRate: def.rate,
      repeat: def.repeat,
    });
  }
}
