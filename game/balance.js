// All progression and encounter tuning lives here. Multipliers never alter input or hit detection.
export const DIFFICULTIES = {
  easy: { name: 'Balade', damage: .72, speed: .9, recovery: 1.25, telegraph: 1.18, extra: 0, lives: 4 },
  normal: { name: 'Arcade', damage: .85, speed: 1, recovery: 1, telegraph: 1, extra: 0, lives: 5 },
  hard: { name: 'Sans quartier', damage: 1.2, speed: 1.12, recovery: .82, telegraph: .92, extra: 1, lives: 3 },
};
export const difficulty = id => DIFFICULTIES[id] || DIFFICULTIES.normal;
export const BALANCE = {
  dodge: { duration: .26, invincible: .22, cooldown: .95, speedX: 690, speedY: 460, buffer: .14 },
  scenery: { crateHp: 3, binHp: 4, barrelHp: 3, explosionDelay: .8, explosionRadius: 170, explosionDamage: 45, debrisTime: 7, food: 35, energy: 40, enemyFoodChance: .04, bossReliefHealth: .4 },
  surprises: { carTime: 25, carHp: 24, carDuoHp: 1.55, deliveryTime: 22, deliveryCount: 2, ambushTime: 30, ambushCount: 5, duoExtra: 2, score: 650, warning: 2.2 },
  waves: { early: 2, standard: 3, late: 4, rest: 2.5, calmRest: 4, spawnDelay: .85, activeSolo: 5, activeDuo: 7, attackersSolo: 2, attackersDuo: 3 },
  enemy: { chapterHp: .14, chapterPower: .1, duoHp: 1.18, chapterSpeed: .025, chapterRecovery: .065, eliteChance: .09, eliteChapterChance: .02 },
  wrestler: { statBonus: .3, radius: 180 },
  thunder: { strikeAt: .32, sleepAt: .65, lifetime: .24 },
  tornado: { speedX: 350, speedY: 225 },
  embers: { count: 5, flight: .5, stagger: .09, ignition: 1.05, duration: 3.6, pulse: .8 },
  triso: { range: 410, distance: 240, windup: 1.05, recovery: 2.8, flight: .6, duration: 4.5, radius: 76, pulse: 1, maxPuddles: 3 },
  specials: {
    karonux: { cost: 50, cooldown: 12, duration: 3.6, damage: 1.9, radius: 100, golfDistance: 450, golfAt: .25, turnAt: 1.05, sleepAt: 1.85 },
    jualos: { cost: 50, cooldown: 9, duration: 1.45, damage: 1.6, radius: 115 },
    yanu: { cost: 50, cooldown: 10, duration: 2.1, damage: 1.15, radius: 180 },
    lorenzo: { cost: 50, cooldown: 10, duration: .65, damage: .45, radius: 78 },
    jo: { cost: 50, cooldown: 12, duration: 3, damage: .85, radius: 130 },
    kikor: { cost: 50, cooldown: 13, duration: 1, damage: .75, radius: 105, paintAt: .18, spawnAt: .65, allyDuration: 10, emergeDuration: .3 },
    gustavax: { cost: 50, cooldown: 14, duration: 6 },
  },
  bosses: {
    karonux: { hp: 640, power: 20, carHp: 240, phases: [.4], recovery: 1.6, healing: 36, healUses: 3 },
    kikor: { hp: 620, power: 20, phases: [.5], recovery: 1.25, creationHp: 70 },
    yanu: { hp: 650, power: 22, phases: [.5], recovery: 1.5 },
    lorenzo: { hp: 700, power: 24, phases: [.6], recovery: 1.3, sofaHp: 180 },
    jo: { hp: 720, power: 24, phases: [.5], recovery: 1.4 },
    jualos: { hp: 800, power: 26, phases: [.5], recovery: 1.3 },
  },
  bossCombat: { duoHp: 1.6, windup: .82, chargeWindup: .95, healWindup: 1.7, chargeDuration: .85, carSpeed: 650, bikeSpeed: 610, rushSpeed: 470 },
  bossShow: { signatureEvery: 4, windup: 1.2, recovery: 1.8, ringSpeed: 230, ringRadius: 26 },
};
