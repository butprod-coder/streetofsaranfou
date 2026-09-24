import { BALANCE, difficulty } from './balance.js';
import { ENEMIES } from './data.js';
import { ELITE_ORDER } from './elite-data.js';
export const ENCOUNTER_ROSTER = [...new Set([...Object.keys(ENEMIES), ...ELITE_ORDER])];
export const STARTING_ENEMIES = ['remy', 'charlingals', 'orelsan'];
export function createEnemyOrder(random = Math.random) {
  const order = [...ENCOUNTER_ROSTER];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export function streetEnemyRoster(chapter, stage, order) {
  return order.slice(0, 3 + chapter * 6 + stage);
}
export const activeEnemyLimit = (chapter, players = 1) => Math.min(5, 3 + Math.floor(chapter / 2)) + (players > 1 ? 2 : 0);
// Serializable shuffle bag spans waves and streets. Each identity has equal frequency.
export function randomEnemyKinds(chapter, count, random = Math.random, bag = [], roster = ENCOUNTER_ROSTER) {
  for (let i = bag.length - 1; i >= 0; i--) if (!roster.includes(bag[i])) bag.splice(i, 1);
  const result = [];
  for (let n = 0; n < count; n++) {
    if (!bag.length) {
      bag.push(...roster);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor(random() * (i + 1))); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    result.push(bag.pop());
  }
  return result;
}
export function wavePlan(chapter, stage, players = 1, mode = 'normal', random = Math.random, bag = [], order = createEnemyOrder(random)) {
  const roster = streetEnemyRoster(chapter, stage, order);
  const newcomer = chapter * 6 + stage > 0 ? order[chapter * 6 + stage + 2] : null;
  // Present the newly unlocked rival immediately, even if the previous bag is not empty.
  if (newcomer) {
    const index = bag.indexOf(newcomer);
    if (index >= 0) bag.splice(index, 1);
    bag.push(newcomer);
  }
  const count = stage === 5 ? 4 : 3 + Math.floor(chapter / 2);
  return Array.from({ length: count }, (_, wave) => {
    if (stage === 5 && wave === count - 1) return { kinds: [], boss: true, label: 'LE PATRON', rest: 5 };
    const size = Math.min(8, 3 + Math.floor((chapter * 6 + stage) / 8) + (wave % 3 === 2 ? 1 : 0)) + (players > 1 ? 2 : 0) + difficulty(mode).extra;
    return { kinds: randomEnemyKinds(chapter, size, random, bag, roster), boss: false, label: wave ? 'LES RENFORTS' : 'PREMIER CONTACT', rest: BALANCE.waves.calmRest };
  });
}
