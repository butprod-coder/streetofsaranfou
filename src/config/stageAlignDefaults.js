/** Alignements éditeur ALIGN livrés avec le jeu (niveaux 1–6).
 * Les réglages sauvegardés dans le navigateur (localStorage) restent prioritaires
 * stage par stage ; ce fichier sert de base pour les clones Git et les nouvelles installs. */
export const STAGE_ALIGN_DEFAULTS = {
  0: {
    0: { x: 0, y: -1, scale: 1 },
    1: { x: 48, y: -20, scale: 1.105 },
    2: { x: 37, y: 7, scale: 1.075 },
    3: { x: 0, y: 0, scale: 1 },
    4: { x: 0, y: 0, scale: 1 },
    5: { x: 0, y: 0, scale: 1 },
  },
  1: {
    0: { x: -2, y: 19, scale: 1 },
    1: { x: -21, y: -5, scale: 1.015 },
    2: { x: -17, y: 0, scale: 1 },
    3: { x: -19, y: 0, scale: 1 },
    4: { x: -20, y: -3, scale: 1 },
    5: { x: 0, y: 0, scale: 1 },
  },
  2: {
    0: { x: -111, y: 8, scale: 1.065 },
    1: { x: -50, y: -41, scale: 1.135 },
    2: { x: 59, y: -45, scale: 1.105 },
    3: { x: 72, y: -59, scale: 1.12 },
    4: { x: 41, y: -52, scale: 1.06 },
    5: { x: 0, y: 0, scale: 1 },
  },
  3: {
    0: { x: 0, y: 3, scale: 1 },
    1: { x: -5, y: -72, scale: 1.135 },
    2: { x: 119, y: -115, scale: 1.21 },
    3: { x: 101, y: -114, scale: 1.215 },
    4: { x: 215, y: -140, scale: 1.255 },
    5: { x: 103, y: -111, scale: 1.21 },
  },
  4: {
    0: { x: 13, y: 4, scale: 0.985 },
    1: { x: 0, y: 0, scale: 1 },
    2: { x: 26, y: -34, scale: 1.06 },
    3: { x: 36, y: -60, scale: 1.105 },
    4: { x: 22, y: -17, scale: 1.03 },
    5: { x: 0, y: 0, scale: 1 },
  },
  5: {
    0: { x: -3, y: -5, scale: 1.015 },
    1: { x: 0, y: 0, scale: 1 },
    2: { x: 1, y: -1, scale: 1 },
    3: { x: 0, y: 0, scale: 1 },
    4: { x: 1, y: 0, scale: 1 },
    5: { x: 165, y: -6, scale: 1.35 },
  },
};
