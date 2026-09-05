// All progression and encounter tuning lives here. Multipliers never alter input or hit detection.
export const DIFFICULTIES = {
  easy: { name: 'Balade', damage: .72, speed: .9, recovery: 1.25, telegraph: 1.18, extra: 0, lives: 4, xp: .85 },
  normal: { name: 'Arcade', damage: 1, speed: 1, recovery: 1, telegraph: 1, extra: 0, lives: 2, xp: 1 },
  hard: { name: 'Sans quartier', damage: 1.2, speed: 1.12, recovery: .82, telegraph: .92, extra: 1, lives: 2, xp: 1.2 },
};
export const difficulty = id => DIFFICULTIES[id] || DIFFICULTIES.normal;
export const BALANCE = {
  waves: { early: 2, standard: 3, late: 4, rest: 2.5, calmRest: 4, spawnDelay: .85, activeSolo: 5, activeDuo: 7, attackersSolo: 2, attackersDuo: 3 },
  enemy: { chapterHp: .035, duoHp: 1.18, chapterSpeed: .045, chapterRecovery: .045 },
  rpg: { maxLevel: 20, pointsPerLevel: 2, maxStat: 12, baseXp: 120, linearXp: 45, quadraticXp: 8, life: .03, attack: .025, defense: .02, special: .03, specialRadius: .012, specialCooldown: .012 },
  xp: { remy: 18, orelsan: 23, charlingals: 32, guylux: 29, papy_jala: 38, creation: 8, wave: 30, street: 45, chapter: 180, boss: 300 },
  specials: {
    karonux: { cost: 50, cooldown: 12, duration: 2.6, damage: 3.8, radius: 260 },
    jualos: { cost: 50, cooldown: 9, duration: 1.45, damage: 1.6, radius: 115 },
    yanu: { cost: 50, cooldown: 10, duration: 2.1, damage: 1.15, radius: 180 },
    lorenzo: { cost: 50, cooldown: 10, duration: .65, damage: .65, radius: 78 },
    jo: { cost: 50, cooldown: 12, duration: 3, damage: .85, radius: 130 },
    kikor: { cost: 50, cooldown: 13, duration: .8, damage: .75, radius: 105 },
    gustavax: { cost: 50, cooldown: 9, duration: .7, damage: 2.5, radius: 680 },
  },
  bosses: {
    karonux: { hp: 350, power: 18, carHp: 180, phases: [.55], recovery: 1.6, healing: 18, healUses: 3 },
    kikor: { hp: 410, power: 20, phases: [.55], recovery: 1.25 },
    yanu: { hp: 470, power: 22, phases: [.55], recovery: 1.5, healing: 24, healUses: 3 },
    lorenzo: { hp: 490, power: 24, phases: [.55], recovery: 1.3 },
    jo: { hp: 520, power: 26, phases: [.55], recovery: 1.4 },
    gustavax: { hp: 680, power: 28, phases: [.65, .3], recovery: 1.15 },
  },
  bossCombat: { duoHp: 1.6, windup: .82, chargeWindup: .95, healWindup: 1.7, chargeDuration: .85, carSpeed: 650, bikeSpeed: 610, rushSpeed: 470 },
};
