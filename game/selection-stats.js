import { FIGHTERS } from './data.js';

// Shared scales keep every card directly comparable; no talents or run bonuses.
const stats = [
  { key: 'hp', label: 'Vie' },
  { key: 'power', label: 'Force' },
  { key: 'speed', label: 'Vitesse' },
];
export function renderStartingStats(fighter) {
  const rows = stats.map(stat => ({ ...stat, value: fighter[stat.key], max: Math.max(...FIGHTERS.map(c => c[stat.key])) }));
  return `<span class="starting-stats">${rows.map(({ key, label, value, max }) => `<span class="starting-stat" data-stat="${key}"><span>${label}</span><strong>${value}</strong><span class="starting-track" aria-hidden="true"><i style="width:${value / max * 100}%"></i></span></span>`).join('')}</span>`;
}
