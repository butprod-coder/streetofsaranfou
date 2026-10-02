import { usesTransformationTree, TRANSFORMATION_MILESTONES } from './transformation-rules.js';
import { fighter, clamp } from './data.js';
import { BALANCE } from './balance.js';
import { TALENTS, hasTalent } from './rogue-talents.js';
export { TALENTS };
export const TALENT_SAVE_KEY = 'saranfou-talents-v1';
export const ATTRIBUTES = { strength: 'Force', endurance: 'Endurance', attackSpeed: 'Vitesse de frappe', moveSpeed: 'Vitesse de déplacement', specialCharge: 'Recharge de spécial' };
export const xpForLevel = level => Math.round(65 * (level - 1) ** 2 + 120 * (level - 1));
const finite = (n, max) => Number.isFinite(n) ? clamp(Math.floor(n), 0, max) : 0;
export const TALENT_MILESTONES = ['start', 'street:0:2', 'boss:0', 'street:1:2', 'boss:1', 'boss:2', 'boss:3', 'boss:4'];
export function awardTalent(profile, milestone) {
  return normalizeProfile({ ...profile, milestones: [...(profile.milestones || []), milestone] });
}
export function canLearn(profile, node) {
  if (!node || profile.talents.includes(node.id)) return false;
  if (usesTransformationTree(profile.kind) && TALENTS[profile.kind].some(n => profile.talents.includes(n.id) && n.branchIndex !== node.branchIndex)) return false;
  const branch = TALENTS[profile.kind].filter(n => n.branch === node.branch);
  if (node.tier && !branch.some(n => n.tier === node.tier - 1 && profile.talents.includes(n.id))) return false;
  if (node.ultimate && (TALENTS[profile.kind].some(n => n.ultimate && profile.talents.includes(n.id)))) return false;
  return true;
}
export function normalizeProfile(raw = {}, kind = raw?.kind || 'karonux') {
  kind = fighter(kind).id; raw ||= {};
  const completed = [...new Set(Array.isArray(raw.completed) ? raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n < 6) : [])].sort();
  const xp = finite(raw.xp, Number.MAX_SAFE_INTEGER);
  let level = Math.max(1, Math.floor((-120 + Math.sqrt(14400 + 260 * xp)) / 130) + 1);
  while (xp >= xpForLevel(level + 1)) level++;
  while (level > 1 && xp < xpForLevel(level)) level--;
  const earned = new Set(Array.isArray(raw.milestones) ? raw.milestones : []);
  // Preserve earned ranks when resuming a run made before the reward schedule changed.
  if (raw.progressionVersion !== 2 && (earned.has('boss:5') || completed.includes(0))) earned.add('boss:0');
  const milestones = (usesTransformationTree(kind) ? TRANSFORMATION_MILESTONES : TALENT_MILESTONES).filter(key => key === 'start' || earned.has(key));
  const total = milestones.length;
  const p = { progressionVersion: 2, kind, xp, level, completed, milestones, talents: [], points: total, attributes: {}, statPoints: (level - 1) * 2 };
  const requested = new Set(Array.isArray(raw.talents) ? raw.talents : []);
  const firstBranch = usesTransformationTree(kind) ? TALENTS[kind].find(n => n.id === [...requested].find(id => TALENTS[kind].some(t => t.id === id)))?.branchIndex : undefined;
  for (const node of TALENTS[kind]) if ((firstBranch === undefined || node.branchIndex === firstBranch) && requested.has(node.id) && p.points > 0 && canLearn(p, node)) { p.talents.push(node.id); p.points--; }
  const attributes = { ...raw.attributes, endurance: (raw.attributes?.endurance || 0) + (raw.attributes?.vitality || 0), moveSpeed: raw.attributes?.moveSpeed ?? raw.attributes?.mobility };
  for (const key of Object.keys(ATTRIBUTES)) { p.attributes[key] = Math.min(p.statPoints, finite(attributes[key], Number.MAX_SAFE_INTEGER)); p.statPoints -= p.attributes[key]; }
  return p;
}
export function addExperience(profile, amount) { const p = normalizeProfile(profile); return normalizeProfile({ ...p, xp: p.xp + finite(amount, 10000) }); }
export function completeChapter(profile, chapter) { return awardTalent({ ...profile, completed: [...profile.completed, chapter] }, `boss:${chapter}`); }
export function spendPoint(profile, talent) {
  const p = normalizeProfile(profile), node = TALENTS[p.kind].find(n => n.id === talent);
  if (!p.points || !canLearn(p, node)) return null;
  return normalizeProfile({ ...p, talents: [...p.talents, talent] });
}
export function spendAttribute(profile, key) {
  const p = normalizeProfile(profile);
  if (!Object.hasOwn(ATTRIBUTES, key) || !p.statPoints) return null;
  return normalizeProfile({ ...p, attributes: { ...p.attributes, [key]: p.attributes[key] + 1 } });
}
export function bonuses(profile) {
  const p = normalizeProfile(profile), a = p.attributes;
  const b = { life: 1 + a.endurance * .08, attack: 1 + a.strength * .07, defense: 1 - 1 / (1 + a.endurance * .015), special: 1, radius: 1, cooldown: 1, speed: 1 + a.moveSpeed * .025, dodge: 1 / (1 + a.endurance * .025),
    attackSpeed: 1 + a.attackSpeed * .05, energyPerHitBonus: a.specialCharge,
    energyRegen: 1, duration: 0, sleepReduction: 0, blastHeal: 0, chargeSpeed: 1, fireDuration: 0, allyDuration: 0, allyRate: 1, food: 0, drink: 0, weaponPower: 1, stagger: 1 / (1 + a.endurance * .035) };
  for (const node of TALENTS[p.kind]) if (p.talents.includes(node.id)) for (const [key, value] of Object.entries(node.effects)) b[key] = (b[key] || 0) + value;
  const actor = { kind: p.kind, progression: p };

  if (hasTalent(actor, 'Pas de côté')) b.dodge *= .8;
  b.defense = Math.min(.99, b.defense); b.dodge = Math.max(.01, b.dodge); b.cooldown = Math.max(.45, b.cooldown);
  return b;
}
export function refreshPlayerStats(player, proportionalHealth = false) {
  const oldMax = player.maxHp, ratio = oldMax > 0 ? player.hp / oldMax : 1, c = fighter(player.kind);
  player.bonuses = bonuses(player.progression);
  const b = player.bonuses, boost = player.specialState?.kind === 'gustavax' && !player.specialState.transformation ? 1 + BALANCE.wrestler.statBonus : 1;
  player.maxHp = Math.round(c.hp * b.life * boost); player.power = c.power * b.attack * boost; player.speed = c.speed * b.speed * boost;
  player.specialPower = c.power * b.attack * b.special * boost;
  b.defense = 1 - (1 - b.defense) * (boost > 1 ? 1 - BALANCE.wrestler.statBonus : 1);
  if (proportionalHealth) player.hp = Math.min(player.maxHp, Math.max(0, ratio * player.maxHp));
  else player.hp = Math.min(player.maxHp, player.hp > 0 ? player.hp + Math.max(0, player.maxHp - oldMax) : 0);
}
export function applyProfile(player, profile, preserveHealth = true) {
  player.progression = normalizeProfile(profile, player.kind);
  refreshPlayerStats(player); if (!preserveHealth) player.hp = player.maxHp;
}
