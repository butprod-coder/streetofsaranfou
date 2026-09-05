import { BALANCE } from './balance.js';
import { fighter } from './data.js';
export const STATS = ['life', 'attack', 'defense', 'special'];
export const STAT_NAMES = { life: 'Vie', attack: 'Attaque', defense: 'Défense', special: 'Coup spécial' };
const R = BALANCE.rpg;
export const xpNeeded = level => level >= R.maxLevel ? 0 : R.baseXp + R.linearXp * (level - 1) + R.quadraticXp * (level - 1) ** 2;
export const maxXp = Array.from({ length: R.maxLevel - 1 }, (_, i) => xpNeeded(i + 1)).reduce((a, b) => a + b, 0);
export function normalizeProfile(raw = {}) {
  let totalXp = Number.isFinite(raw?.totalXp) ? Math.max(0, Math.min(maxXp, Math.floor(raw.totalXp))) : 0;
  let xp = totalXp, level = 1;
  while (level < R.maxLevel && xp >= xpNeeded(level)) { xp -= xpNeeded(level); level++; }
  let points = (level - 1) * R.pointsPerLevel;
  const stats = {};
  for (const key of STATS) {
    stats[key] = Math.min(points, R.maxStat, Number.isInteger(raw?.stats?.[key]) ? Math.max(0, raw.stats[key]) : 0);
    points -= stats[key];
  }
  return { totalXp, xp, level, nextXp: xpNeeded(level), points, stats };
}
export function gainXp(profile, amount) { return normalizeProfile({ ...profile, totalXp: profile.totalXp + Math.max(0, amount) }); }
export function spendPoint(profile, stat) {
  const p = normalizeProfile(profile);
  if (!STATS.includes(stat) || !p.points || p.stats[stat] >= R.maxStat) return null;
  return normalizeProfile({ ...p, stats: { ...p.stats, [stat]: p.stats[stat] + 1 } });
}
export function bonuses(profile) {
  const s = normalizeProfile(profile).stats;
  return { life: 1 + s.life * R.life, attack: 1 + s.attack * R.attack, defense: s.defense * R.defense,
    special: 1 + s.special * R.special, radius: 1 + s.special * R.specialRadius, cooldown: 1 - s.special * R.specialCooldown };
}
export function applyProfile(player, profile, preserveHealth = true) {
  const oldMax = player.maxHp, c = fighter(player.kind);
  player.progression = normalizeProfile(profile); player.bonuses = bonuses(player.progression);
  player.maxHp = Math.round(c.hp * player.bonuses.life); player.power = c.power * player.bonuses.attack;
  player.hp = preserveHealth ? Math.min(player.maxHp, player.hp > 0 ? player.hp + Math.max(0, player.maxHp - oldMax) : 0) : player.maxHp;
}
