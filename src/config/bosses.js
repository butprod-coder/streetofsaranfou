import { CHARACTERS } from './characters.js';
import { KARONUX_BOSS_DEF } from './bossKaronux.js';

export const KARONUX_BOSS = { ...KARONUX_BOSS_DEF };

/** Stats de boss derivees d'un perso jouable. */
export function playableBoss(charKey, levelIdx, extra = {}) {
  const c = CHARACTERS.find((ch) => ch.key === charKey);
  if (!c) throw new Error(`playableBoss: perso inconnu ${charKey}`);
  const tier = levelIdx + 1;
  return {
    name: `${c.name} — ${c.subtitle}`,
    sheet: c.sheet,
    tint: 0xffffff,
    hp: Math.round(200 + levelIdx * 50 + c.hp * 0.35),
    speed: Math.round(c.speed * 0.52),
    damage: Math.round(c.damage * (1.25 + levelIdx * 0.06)),
    reach: c.range + 4,
    attackCd: Math.max(380, Math.round(c.attackCd * 1.05)),
    scale: 1.28 + levelIdx * 0.06,
    score: 1200 + levelIdx * 750,
    custom: charKey,
    enrageAt: 0.48,
    ...extra,
  };
}

export const GUSTAVAX_BOSS = {
  name: 'GUSTAVAX — BOSS FINAL',
  sheet: 'gustavax',
  tint: 0xffffff,
  hp: 560,
  speed: 90,
  damage: 20,
  reach: 90,
  attackCd: 780,
  scale: 1.6,
  score: 6000,
  custom: 'gustavax',
  enrageAt: 0.5,
};
