import { BALANCE, difficulty } from './balance.js';
import { ENEMIES } from './data.js';
import { ELITE_ORDER } from './elite-data.js';
const OM_SUPPORTERS = ['karonux_om', 'orelsan_om', 'gustavax_om'];
export const ENCOUNTER_ROSTER = [...new Set([...Object.keys(ENEMIES).filter(id=>!ENEMIES[id].miniBoss&&!ENEMIES[id].summonOnly&&!ENEMIES[id].storyBossOnly&&!OM_SUPPORTERS.includes(id)), 'om_supporters', ...ELITE_ORDER])];
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
  return [...ENCOUNTER_ROSTER];
}
export const activeEnemyLimit = (chapter, players = 1) => Math.min(5, 3 + Math.floor(chapter / 2)) + (players > 1 ? 2 : 0);
// Serializable shuffle bag spans waves and streets. Each identity has equal frequency.
export function randomEnemyKinds(chapter, count, random = Math.random, bag = [], roster = ENCOUNTER_ROSTER) {
  roster=roster.filter(id=>ENCOUNTER_ROSTER.includes(id));
  if(!roster.length)roster=STARTING_ENEMIES;
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
export function wavePlan(chapter, stage, players = 1, mode = 'normal', random = Math.random, bag = [], order = createEnemyOrder(random), district = chapter) {
  order=order.filter(id=>ENCOUNTER_ROSTER.includes(id));
  const roster = streetEnemyRoster(chapter, stage, order);
  const middleBosses=district===0&&stage===2;
  const fishingBoss=district===1&&stage===2;
  const stadiumBoss=district===2&&stage===2;
  const mayorBoss=district===3&&stage===2;
  const remyBoss=district===4&&stage===2;
  const harmelinBoss=district===5&&stage===2;
  const count = stage === 5 ? 4 : middleBosses||fishingBoss||stadiumBoss||mayorBoss||remyBoss||harmelinBoss ? 4 : 3 + Math.floor(chapter / 2);
  return Array.from({ length: count }, (_, wave) => {
    if (stage === 5 && wave === count - 1) return { kinds: [], boss: true, label: 'LE PATRON', rest: 5 };
    if(middleBosses&&wave===3)return{kinds:[],boss:true,bossKinds:['damps','cainri'],miniBoss:true,label:'DAMPS & CAINRI',rest:4};
    if(fishingBoss&&wave===3)return{kinds:[],boss:true,bossKind:'jalatrix',miniBoss:true,label:'JALATRIX LE PÉCHEUR',rest:4};
    if(stadiumBoss&&wave===3)return{kinds:[],boss:true,bossKind:'mazzuka',miniBoss:true,label:'MAZZUKA · CONSEIL DE CLASSE',rest:4};
    if(mayorBoss&&wave===3)return{kinds:[],boss:true,bossKind:'maire',miniBoss:true,label:'LE MAIRE · POLICE MUNICIPALE',rest:4};
    if(remyBoss&&wave===3)return{kinds:[],boss:true,bossKind:'remyGeek',miniBoss:true,label:'RÉMY LE NO LIFE · RAID DE CAP SARAN',rest:4};
    if(harmelinBoss&&wave===3)return{kinds:[],boss:true,bossKind:'harmelin',miniBoss:true,label:'MME HARMELIN · CONSEIL DE DISCIPLINE',rest:4};
    const size = Math.min(8, 3 + Math.floor((chapter * 6 + stage) / 8) + (wave % 3 === 2 ? 1 : 0)) + (players > 1 ? 2 : 0) + difficulty(mode).extra;
    return { kinds: randomEnemyKinds(chapter, size, random, bag, roster), boss: false, label: wave ? 'LES RENFORTS' : 'PREMIER CONTACT', rest: BALANCE.waves.calmRest };
  });
}
