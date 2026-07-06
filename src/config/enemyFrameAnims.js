/** Config animations frame pour les ennemis (idle = 1ère frame marche). */
function enemyFrames(key, marche, attaque, special, tombe, mort = 1) {
  const walk = Array.from({ length: marche }, (_, i) => `${key}_marche${i + 1}`);
  const attack = Array.from({ length: attaque }, (_, i) => `${key}_attaque${i + 1}`);
  const spec = Array.from({ length: special }, (_, i) => `${key}_special${i + 1}`);
  const fall = Array.from({ length: tombe }, (_, i) => `${key}_tombe${i + 1}`);
  const ko = Array.from({ length: mort }, (_, i) => `${key}_mort${i + 1}`);
  return {
    idle: [walk[0]],
    walk,
    attack,
    special: spec,
    fall,
    hurt: [fall[0]],
    ko,
    idleRate: 3,
    walkRate: 9,
    attackRate: 14,
    specialRate: 12,
    fallRate: 14,
    koRate: 8,
  };
}

export const ENEMY_FRAME_ANIMS = {
  charlingals: enemyFrames('charlingals', 4, 4, 3, 3),
  orelsan: enemyFrames('orelsan', 3, 3, 2, 3),
  papy_jala: enemyFrames('papy_jala', 3, 4, 2, 3),
  remy: enemyFrames('remy', 3, 3, 2, 3),
  triso: enemyFrames('triso', 3, 3, 0, 3),
  guylux: enemyFrames('guylux', 4, 4, 2, 3),
};
