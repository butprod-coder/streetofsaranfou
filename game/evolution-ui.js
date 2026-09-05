import { DIFFICULTIES, BALANCE } from './balance.js';
import { STAT_NAMES, STATS, bonuses, spendPoint } from './progression.js';
import { fighter } from './data.js';
export function installEvolutionUI() {
  document.querySelector('.edition').textContent = 'ÉVOLUTION ARCADE · VOL. 03';
  document.querySelector('#join-form').insertAdjacentHTML('beforeend', '<p class="evolution-note">À la manette : sélectionne le code, A / ✕ choisit le caractère, ← → le modifient, ↓ passe à Rejoindre.</p>');
  const options = Object.entries(DIFFICULTIES).map(([id, d]) => `<option value="${id}" ${id === 'normal' ? 'selected' : ''}>${d.name}</option>`).join('');
  document.querySelector('.departure').insertAdjacentHTML('afterbegin', `<label for="difficulty-select">AMBIANCE</label><select id="difficulty-select">${options}</select>`);
  document.querySelector('.fighter-description').insertAdjacentHTML('beforeend', '<button class="button secondary evolution-link" data-action="evolution">Évolution du personnage ↗</button>');
  document.querySelector('.lobby-choice').insertAdjacentHTML('beforeend', `<label for="online-difficulty">Difficulté</label><select id="online-difficulty">${options}</select><button class="text-button" data-action="evolution">Évolution du personnage ↗</button>`);
  document.querySelector('#resume-button').insertAdjacentHTML('afterend', '<button class="button secondary" data-action="evolution">Évolution · Dépenser mes points</button>');
  document.querySelector('#retry-button').insertAdjacentHTML('afterend', '<button class="button secondary" data-action="evolution">Évolution du personnage ↗</button>');
  document.querySelector('#app').insertAdjacentHTML('beforeend', `<section id="evolution" class="screen modal-screen" aria-labelledby="evolution-title"><div class="modal evolution-modal"><div class="evolution-heading"><img id="evolution-portrait" alt=""><div><p class="eyebrow">LA RUE TE CHANGE.</p><h2 id="evolution-title"></h2><p id="evolution-level"></p></div></div><div class="evolution-xp"><i></i></div><p id="evolution-xp-label" class="muted"></p><div class="evolution-points" role="status"></div><div id="stat-list"></div><p class="evolution-note">Chaque personnage garde sa progression sur ce navigateur. 2 points par niveau · 12 rangs maximum par statistique.</p><button class="button primary" data-action="close-evolution"><span>Retour</span><span>←</span></button></div></section>`);
  document.querySelector('.control-list').insertAdjacentHTML('beforeend', '<div><kbd>Flèches / stick / croix</kbd><span>Menus · naviguer ; ← → sur les listes</span></div><div><kbd>Entrée / A (✕) · Échap / B (○)</kbd><span>Valider / Retour · Start : pause</span></div>');
  document.querySelector('.tip').textContent = 'Les zones rouges annoncent le danger : change de ligne, saute ou esquive. Spécial : 50 énergie + recharge propre au personnage. Pause → Évolution pour dépenser tes points. Manettes standard Xbox / PlayStation : X/□ poing, Y/△ pied, A/✕ saut, B/○ spécial.';
}
const percent = n => `${Math.round(n * 1000) / 10} %`;
export function statEffect(kind, stat, profile) {
  const b = bonuses(profile), f = fighter(kind);
  return stat === 'life' ? `${Math.round(f.hp * b.life)} PV` : stat === 'attack' ? `${percent(b.attack)} dégâts` : stat === 'defense' ? `−${percent(b.defense)} dégâts reçus` : `${percent(b.special)} puissance · ${(BALANCE.specials[kind].cooldown * b.cooldown).toFixed(1)} s`;
}
export function renderEvolution(kind, profile, spend) {
  const $ = s => document.querySelector(s), f = fighter(kind), active = document.activeElement?.dataset.stat;
  $('#evolution-portrait').src = `/assets/${kind}/${kind}_p.png`; $('#evolution-portrait').alt = f.name;
  $('#evolution-title').textContent = f.name; $('#evolution-level').textContent = `NIVEAU ${profile.level} / ${BALANCE.rpg.maxLevel}`;
  $('.evolution-xp i').style.width = `${profile.nextXp ? profile.xp / profile.nextXp * 100 : 100}%`;
  $('#evolution-xp-label').textContent = profile.nextXp ? `${profile.xp} / ${profile.nextXp} XP avant le prochain niveau` : 'Niveau maximum atteint';
  $('.evolution-points').textContent = `${profile.points} POINT${profile.points > 1 ? 'S' : ''} À DISTRIBUER`;
  $('#stat-list').innerHTML = STATS.map(stat => {
    const next = spendPoint(profile, stat), preview = { ...profile, stats: { ...profile.stats, [stat]: Math.min(BALANCE.rpg.maxStat, profile.stats[stat] + 1) } };
    // Preview uses a funded temporary profile; no allocation is persisted by rendering.
    preview.totalXp = Math.max(profile.totalXp, 10000);
    return `<button class="stat-upgrade" data-stat="${stat}" aria-disabled="${!next}"><span><b>${STAT_NAMES[stat]}</b><small>Rang ${profile.stats[stat]}${profile.stats[stat] < BALANCE.rpg.maxStat ? ` → ${profile.stats[stat] + 1}` : ' · MAX'}</small></span><span class="stat-effect">${statEffect(kind, stat, profile)}<small>${profile.stats[stat] < BALANCE.rpg.maxStat ? `→ ${statEffect(kind, stat, preview)}` : 'Plafond atteint'}</small></span><strong>${next ? '+ 1' : '—'}</strong></button>`;
  }).join('');
  document.querySelectorAll('[data-stat]').forEach(button => button.addEventListener('click', () => { if (button.getAttribute('aria-disabled') !== 'true') spend(button.dataset.stat); }));
  if (active) $(`[data-stat="${active}"]`)?.focus({ preventScroll: true });
}
