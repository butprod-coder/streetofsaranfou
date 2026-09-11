import { BALANCE, difficulty } from './balance.js';
import { ENEMIES } from './data.js';
import { ELITE_ORDER } from './elite-data.js';

const ELITES = new Set(ELITE_ORDER);
const REGULARS = Object.keys(ENEMIES).filter(kind => !ELITES.has(kind));
const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

/** Tous les ennemis sont disponibles dès le premier chapitre. */
export function randomEnemyKinds(chapter, count, random = Math.random) {
  const kinds = [];
  let eliteUsed = false;
  const eliteChance = BALANCE.enemy.eliteChance + chapter * BALANCE.enemy.eliteChapterChance;
  for (let i = 0; i < count; i++) {
    // Les élites restent rares et limitées à une par vague pour préserver la lisibilité.
    const elite = !eliteUsed && random() < eliteChance;
    kinds.push(pick(elite ? ELITE_ORDER : REGULARS, random));
    eliteUsed ||= elite;
  }
  return kinds;
}

export function wavePlan(chapter, stage, players = 1, mode = 'normal', random = Math.random) {
  const b = BALANCE.waves;
  const count = stage === 5 ? 3 : chapter === 0 && stage < 2 ? b.early : chapter >= 4 && stage >= 3 ? b.late : b.standard;
  return Array.from({ length: count }, (_, wave) => {
    if (stage === 5 && wave === count - 1) return { kinds: [], boss: true, label: 'LE PATRON', rest: b.calmRest };

    // La quantité augmente doucement ; l'identité des ennemis ne dépend jamais du niveau.
    const danger = chapter * 2 + stage + wave;
    let size = 2 + Math.floor(danger / 6);
    if (players === 2) size++;
    if (difficulty(mode).extra) size++;
    size = Math.min(size, players === 2 ? b.activeDuo : b.activeSolo);
    return {
      kinds: randomEnemyKinds(chapter, size, random),
      boss: false,
      label: wave === 0 ? 'PREMIER CONTACT' : wave === count - 1 ? 'DERNIÈRE POUSSÉE' : 'LES RENFORTS',
      rest: wave % 2 ? b.calmRest : b.rest,
    };
  });
}
