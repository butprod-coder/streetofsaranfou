/**
 * Profil de combat `ai` par type :
 * - dodge   : proba d'esquiver (pas de côté / bond arrière) quand un joueur attaque à portée
 * - feint   : proba de feinter (reculer au lieu de frapper) une fois au contact
 * - retreat : proba de se replier juste après avoir frappé (hit & run)
 * - armor   : proba d'encaisser un coup sans broncher (dégâts pris, pas de recul)
 */
export const ENEMY_TYPES = {
  kikor_e: { name: 'Kikor le Lapin', sheet: 'kikor_e', tint: 0xffffff, hp: 55, speed: 140, damage: 10, reach: 82, attackCd: 950, scale: 0.70, score: 200, special: 'skate',
    ai: { dodge: 0.32, feint: 0.2, retreat: 0.45 } },
  makouille: { name: 'Makouille à Moto', sheet: 'makouille', tint: 0xffffff, hp: 130, speed: 185, damage: 18, reach: 130, attackCd: 1400, scale: 0.80, score: 400, special: 'charge',
    ai: { dodge: 0.05, feint: 0, retreat: 0.15, armor: 0.35 } },
  charlingals: { name: 'Charlingals', sheet: 'charlingals', tint: 0xffffff, hp: 46, speed: 102, damage: 8, reach: 70, attackCd: 1400, scale: 0.68, score: 175, special: 'bills',
    ai: { dodge: 0.15, feint: 0.3, retreat: 0.55 } },
  orelsan: { name: 'Orelsan', sheet: 'orelsan', tint: 0xffffff, hp: 68, speed: 118, damage: 11, reach: 78, attackCd: 900, scale: 0.72, score: 240, special: 'racket',
    ai: { dodge: 0.35, feint: 0.25, retreat: 0.4 } },
  papy_jala: { name: 'Papy Jala', sheet: 'papy_jala', tint: 0xffffff, hp: 50, speed: 88, damage: 7, reach: 68, attackCd: 1500, scale: 0.70, score: 190, special: 'pepper',
    ai: { dodge: 0.1, feint: 0.35, retreat: 0.55 } },
  remy: { name: 'Remy', sheet: 'remy', tint: 0xffffff, hp: 44, speed: 132, damage: 9, reach: 72, attackCd: 1000, scale: 0.66, score: 180, special: 'scooter',
    ai: { dodge: 0.4, feint: 0.2, retreat: 0.5 } },
  triso: { name: 'Triso', sheet: 'triso', tint: 0xffffff, hp: 48, speed: 112, damage: 8, reach: 74, attackCd: 1800, scale: 0.74, score: 220, special: 'slime',
    ai: { dodge: 0.05, feint: 0.1, retreat: 0.25, armor: 0.25 } },
  guylux: { name: 'Guylux', sheet: 'guylux', tint: 0xffffff, hp: 58, speed: 96, damage: 9, reach: 76, attackCd: 1100, scale: 0.68, score: 230, special: 'cards',
    ai: { dodge: 0.3, feint: 0.3, retreat: 0.45 } },
  /** sheet kikor + teinte bleue */
  grunt: { name: 'Sbire', sheet: 'kikor', tint: 0xbcd0ff, hp: 42, speed: 95, damage: 8, reach: 74, attackCd: 1100, scale: 0.66, score: 100,
    ai: { dodge: 0.1, feint: 0.12, retreat: 0.3 } },
  /** sheet jo + teinte chaude — course auto si vitesse haute */
  runner: { name: 'Rôdeur', sheet: 'jo', tint: 0xffd9a0, hp: 28, speed: 170, damage: 6, reach: 70, attackCd: 850, scale: 0.62, score: 150,
    ai: { dodge: 0.35, feint: 0.15, retreat: 0.35 } },
  /** sheet lorenzo + teinte violette */
  heavy: { name: 'Brute', sheet: 'lorenzo', tint: 0xe6c0ff, hp: 125, speed: 72, damage: 17, reach: 80, attackCd: 1500, scale: 0.92, score: 340,
    ai: { dodge: 0, feint: 0, retreat: 0.1, armor: 0.45 } },
};
