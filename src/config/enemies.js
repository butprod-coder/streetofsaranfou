export const ENEMY_TYPES = {
  kikor_e: { name: 'Kikor le Lapin', sheet: 'kikor_e', tint: 0xffffff, hp: 55, speed: 140, damage: 10, reach: 82, attackCd: 950, scale: 0.70, score: 200, special: 'skate' },
  makouille: { name: 'Makouille à Moto', sheet: 'makouille', tint: 0xffffff, hp: 110, speed: 185, damage: 18, reach: 130, attackCd: 1400, scale: 0.80, score: 350, special: 'charge' },
  charlingals: { name: 'Charlingals', sheet: 'charlingals', tint: 0xffffff, hp: 46, speed: 102, damage: 8, reach: 70, attackCd: 1400, scale: 0.68, score: 175, special: 'bills' },
  orelsan: { name: 'Orelsan', sheet: 'orelsan', tint: 0xffffff, hp: 58, speed: 118, damage: 11, reach: 78, attackCd: 1050, scale: 0.72, score: 210, special: 'racket' },
  papy_jala: { name: 'Papy Jala', sheet: 'papy_jala', tint: 0xffffff, hp: 50, speed: 88, damage: 7, reach: 68, attackCd: 1500, scale: 0.70, score: 190, special: 'pepper' },
  remy: { name: 'Remy', sheet: 'remy', tint: 0xffffff, hp: 44, speed: 132, damage: 9, reach: 72, attackCd: 1000, scale: 0.66, score: 180, special: 'scooter' },
  triso: { name: 'Triso', sheet: 'triso', tint: 0xffffff, hp: 48, speed: 112, damage: 8, reach: 74, attackCd: 1800, scale: 0.74, score: 220, special: 'slime' },
  guylux: { name: 'Guylux', sheet: 'guylux', tint: 0xffffff, hp: 48, speed: 96, damage: 9, reach: 76, attackCd: 1100, scale: 0.68, score: 200, special: 'cards' },
  /** sheet kikor + teinte bleue */
  grunt: { name: 'Sbire', sheet: 'kikor', tint: 0xbcd0ff, hp: 42, speed: 95, damage: 8, reach: 74, attackCd: 1100, scale: 0.66, score: 100 },
  /** sheet jo + teinte chaude — course auto si vitesse haute */
  runner: { name: 'Rôdeur', sheet: 'jo', tint: 0xffd9a0, hp: 28, speed: 170, damage: 6, reach: 70, attackCd: 850, scale: 0.62, score: 150 },
  /** sheet lorenzo + teinte violette */
  heavy: { name: 'Brute', sheet: 'lorenzo', tint: 0xe6c0ff, hp: 92, speed: 66, damage: 15, reach: 80, attackCd: 1500, scale: 0.92, score: 280 },
};
