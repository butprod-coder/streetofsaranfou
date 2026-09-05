import { BALANCE, difficulty } from './balance.js';
// Authored combinations: skirmishers first, flankers, then heavy / ranged support.
const COMPOSITIONS = [
  [['remy', 'remy'], ['remy', 'orelsan'], ['orelsan', 'remy', 'charlingals']],
  [['orelsan', 'remy'], ['charlingals', 'remy', 'remy'], ['guylux', 'orelsan', 'remy']],
  [['orelsan', 'orelsan', 'remy'], ['guylux', 'charlingals', 'remy'], ['papy_jala', 'orelsan', 'remy']],
  [['remy', 'guylux', 'orelsan'], ['charlingals', 'orelsan', 'orelsan'], ['papy_jala', 'guylux', 'remy']],
  [['guylux', 'orelsan', 'remy'], ['papy_jala', 'charlingals', 'orelsan'], ['charlingals', 'guylux', 'orelsan', 'remy']],
  [['papy_jala', 'remy', 'orelsan'], ['guylux', 'charlingals', 'orelsan'], ['papy_jala', 'guylux', 'charlingals', 'orelsan']],
];
export function wavePlan(chapter, stage, players = 1, mode = 'normal') {
  const b = BALANCE.waves, pool = COMPOSITIONS[chapter];
  const count = stage === 5 ? 3 : chapter === 0 && stage < 2 ? b.early : chapter >= 4 && stage >= 3 ? b.late : b.standard;
  return Array.from({ length: count }, (_, wave) => {
    if (stage === 5 && wave === count - 1) return { kinds: [], boss: true, label: 'LE PATRON', rest: b.calmRest };
    const kinds = [...pool[(stage + wave) % pool.length]];
    if (chapter === 0 && stage === 0) kinds.splice(0, kinds.length, ...(wave === 0 ? ['remy', 'remy'] : ['remy', 'orelsan', 'remy']));
    if (wave === count - 1 && stage !== 5 && (stage >= 2 || chapter >= 2)) kinds.push(chapter >= 3 ? 'charlingals' : 'orelsan');
    if (players === 2) kinds.push(wave % 2 ? 'orelsan' : 'remy');
    if (difficulty(mode).extra) kinds.push(wave % 2 ? 'orelsan' : 'remy');
    return { kinds, boss: false, label: wave === 0 ? 'PREMIER CONTACT' : wave === count - 1 ? 'DERNIÈRE POUSSÉE' : 'LES RENFORTS', rest: wave % 2 ? b.calmRest : b.rest };
  });
}
