import { fighter } from './data.js';
import { BALANCE } from './balance.js';
// Two paths of three nodes. One point per distinct completed chapter, independently per fighter.
const path = (branch, entries) => entries.map(([id, name, description, effects], i) => ({ id, name, description, effects, branch, requires: i ? entries[i - 1][0] : null }));
export const TALENTS = {
  karonux: [...path('La sieste', [
    ['matelas', 'Matelas humain', '+30 % de vie maximum.', { life: .3 }],
    ['micro-sieste', 'Micro-sieste', 'Sommeil après la Golf raccourci de 1,25 s.', { sleepReduction: 1.25 }],
    ['reveil', 'Siège massant', 'Le retour de la Golf rend 30 PV si tu es debout.', { blastHeal: 30 }],
  ]), ...path('Le garage', [
    ['souffle', 'Pare-chocs large', '+35 % de portée des impacts de la Golf.', { radius: .35 }],
    ['detonateur', 'Moteur préparé', '+45 % de dégâts de la Golf.', { special: .45 }],
    ['encore', 'Encore cinq minutes', 'Recharge spéciale réduite de 35 %.', { cooldown: -.35 }],
  ])],
  jualos: [...path('Le roc', [
    ['couche', 'Une bonne couche', '+35 % de vie maximum.', { life: .35 }],
    ['cuir', 'Cuir de porc', '22 % de dégâts reçus en moins.', { defense: .22 }],
    ['gourmand', 'Gourmand', 'Sandwichs : 35 PV supplémentaires.', { food: 35 }],
  ]), ...path('Le sanglier', [
    ['galop', 'Petit galop', 'Charge du porc 35 % plus rapide.', { chargeSpeed: .35 }],
    ['defenses', 'Défenses sorties', '+50 % de dégâts spéciaux.', { special: .5 }],
    ['traversee', 'La grande traversée', 'Transformation prolongée de 1,5 s.', { duration: 1.5 }],
  ])],
  yanu: [...path('Le sportif', [
    ['foulee', 'Grande foulée', '+18 % de vitesse de déplacement.', { speed: .18 }],
    ['souplesse', 'Souplesse', 'Recharge d’esquive réduite de 35 %.', { dodge: -.35 }],
    ['endurance', 'Endurance', '+30 % de vie maximum.', { life: .3 }],
  ]), ...path('La meute', [
    ['griffes', 'Griffes ouvertes', '+35 % de rayon des griffes.', { radius: .35 }],
    ['predateur', 'Prédateur', '+45 % de dégâts spéciaux.', { special: .45 }],
    ['pleine-lune', 'Pleine lune', 'Forme de loup prolongée de 2 s.', { duration: 2 }],
  ])],
  lorenzo: [...path('Le dur à cuire', [
    ['crane', 'Crâne de béton', '22 % de dégâts reçus en moins.', { defense: .22 }],
    ['boule', 'Bras de bouliste', '+30 % de dégâts normaux.', { attack: .3 }],
    ['apero', 'Pause apéro', 'Boissons : 40 énergie supplémentaires.', { drink: 40 }],
  ]), ...path('Le pyromane', [
    ['braises', 'Braises tenaces', 'Feux de mégots prolongés de 3 s.', { fireDuration: 3 }],
    ['cendrier', 'Grand cendrier', '+40 % de rayon des feux.', { radius: .4 }],
    ['fournaise', 'Fournaise', '+50 % de dégâts spéciaux.', { special: .5 }],
  ])],
  jo: [...path('L’insaisissable', [
    ['savonnette', 'Savonnette', 'Recharge d’esquive réduite de 40 %.', { dodge: -.4 }],
    ['agite', 'Toujours agité', '+20 % de vitesse de déplacement.', { speed: .2 }],
    ['rebond', 'Rebond', '+30 % de vie maximum.', { life: .3 }],
  ]), ...path('Le cyclone', [
    ['rafale', 'Rafale', '+35 % de rayon du tourbillon.', { radius: .35 }],
    ['toupie', 'Toupie folle', 'Tourbillon prolongé de 2 s.', { duration: 2 }],
    ['ouragan', 'Ouragan', '+50 % de dégâts spéciaux.', { special: .5 }],
  ])],
  kikor: [...path('L’artisan', [
    ['pigments', 'Pigments frais', 'Régénération d’énergie +60 %.', { energyRegen: .6 }],
    ['atelier', 'Atelier express', 'Recharge spéciale réduite de 35 %.', { cooldown: -.35 }],
    ['vernis', 'Vernis protecteur', '20 % de dégâts reçus en moins.', { defense: .2 }],
  ]), ...path('Le créateur', [
    ['esquisse', 'Esquisse vivante', 'Le bonhomme vert reste 7 s de plus.', { allyDuration: 7 }],
    ['chef-oeuvre', 'Chef-d’œuvre', '+60 % de puissance du bonhomme vert.', { special: .6 }],
    ['vernissage', 'Grand vernissage', 'Intervalle entre ses attaques réduit de 45 %.', { allyRate: -.45 }],
  ])],
  gustavax: [...path('Le philosophe', [
    ['aplomb', 'Aplomb', '22 % de dégâts reçus en moins.', { defense: .22 }],
    ['repartie', 'Répartie', '+30 % de dégâts normaux.', { attack: .3 }],
    ['second-souffle', 'Second souffle', 'Recharge spéciale réduite de 35 %.', { cooldown: -.35 }],
  ]), ...path('Le champion', [
    ['chauffe', 'Échauffement', 'Forme de catcheur prolongée de 3 s.', { duration: 3 }],
    ['marteau', 'Marteau-pilon', '+40 % de rayon du coup au sol du catcheur.', { radius: .4 }],
    ['ceinture', 'Ceinture bleue', '+50 % de puissance en catcheur.', { special: .5 }],
  ])],
};
export const TALENT_SAVE_KEY = 'saranfou-talents-v1';
export function normalizeProfile(raw = {}, kind = raw?.kind || 'karonux') {
  kind = fighter(kind).id;
  const completed = [...new Set(Array.isArray(raw?.completed) ? raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n < 6) : [])].sort();
  const requested = new Set(Array.isArray(raw?.talents) ? raw.talents : []), talents = [];
  for (const node of TALENTS[kind]) if (talents.length < completed.length && requested.has(node.id) && (!node.requires || talents.includes(node.requires))) talents.push(node.id);
  return { kind, completed, talents, points: completed.length - talents.length };
}
export function completeChapter(profile, chapter) { return normalizeProfile({ ...profile, completed: [...profile.completed, chapter] }); }
export function spendPoint(profile, talent) {
  const p = normalizeProfile(profile), node = TALENTS[p.kind].find(n => n.id === talent);
  if (!node || !p.points || p.talents.includes(talent) || node.requires && !p.talents.includes(node.requires)) return null;
  return normalizeProfile({ ...p, talents: [...p.talents, talent] });
}
export function bonuses(profile) {
  const p = normalizeProfile(profile);
  const b = { life: 1, attack: 1, defense: 0, special: 1, radius: 1, cooldown: 1, speed: 1, dodge: 1,
    energyRegen: 1, duration: 0, sleepReduction: 0, blastHeal: 0, chargeSpeed: 1, fireDuration: 0, allyDuration: 0, allyRate: 1, food: 0, drink: 0 };
  for (const node of TALENTS[p.kind]) if (p.talents.includes(node.id)) for (const [key, value] of Object.entries(node.effects)) b[key] += value;
  return b;
}
export function refreshPlayerStats(player, proportionalHealth = false) {
  const oldMax = player.maxHp, ratio = oldMax > 0 ? player.hp / oldMax : 1, c = fighter(player.kind);
  player.bonuses = bonuses(player.progression);
  const b = player.bonuses, boost = player.specialState?.kind === 'gustavax' ? 1 + BALANCE.wrestler.statBonus : 1;
  player.maxHp = Math.round(c.hp * b.life * boost); player.power = c.power * b.attack * boost; player.speed = c.speed * b.speed * boost;
  // Special damage is calculated independently so the +30% is not accidentally applied twice.
  player.specialPower = c.power * b.attack * b.special * boost;
  b.defense = 1 - (1 - b.defense) * (boost > 1 ? 1 - BALANCE.wrestler.statBonus : 1);
  if (proportionalHealth) player.hp = Math.min(player.maxHp, Math.max(0, ratio * player.maxHp));
  else player.hp = Math.min(player.maxHp, player.hp > 0 ? player.hp + Math.max(0, player.maxHp - oldMax) : 0);
}
export function applyProfile(player, profile, preserveHealth = true) {
  player.progression = normalizeProfile(profile, player.kind); player.bonuses = bonuses(player.progression);
  refreshPlayerStats(player); if (!preserveHealth) player.hp = player.maxHp;
}
