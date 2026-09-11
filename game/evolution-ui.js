import { DIFFICULTIES } from './balance.js';
import { TALENTS, normalizeProfile, spendPoint } from './progression.js';
import { fighter, CHAPTERS } from './data.js';
import { branchIcon } from './talent-icons.js';
export function installEvolutionUI() {
  document.querySelector('.edition').textContent = 'ARCADE · TALENTS & CASTAGNE';
  document.querySelector('#join-form').insertAdjacentHTML('beforeend', '<p class="evolution-note">À la manette : sélectionne le code, A / ✕ choisit le caractère, ← → le modifient, ↓ passe à Rejoindre.</p>');
  const options = Object.entries(DIFFICULTIES).map(([id, d]) => `<option value="${id}" ${id === 'normal' ? 'selected' : ''}>${d.name}</option>`).join('');
  document.querySelector('.departure').insertAdjacentHTML('afterbegin', `<label for="difficulty-select">AMBIANCE</label><select id="difficulty-select">${options}</select>`);
  document.querySelector('.fighter-description').insertAdjacentHTML('beforeend', '<button class="button secondary evolution-link" data-action="evolution">Arbre de talents ↗</button>');
  document.querySelector('.lobby-choice').insertAdjacentHTML('beforeend', `<label for="online-difficulty">Difficulté</label><select id="online-difficulty">${options}</select><button class="text-button" data-action="evolution">Arbre de talents ↗</button>`);
  document.querySelector('#resume-button').insertAdjacentHTML('afterend', '<button id="pause-talents" class="button pause-talents" data-action="evolution"><span class="pause-talent-icon" aria-hidden="true"></span><span class="pause-talent-copy"><b>ARBRE DE TALENTS</b><small id="pause-talent-summary"></small><span id="pause-talent-branches"></span></span><strong id="pause-talent-points"></strong></button>');
  document.querySelector('#retry-button').insertAdjacentHTML('afterend', '<button class="button secondary" data-action="evolution">Arbre de talents ↗</button>');
  document.querySelector('#app').insertAdjacentHTML('beforeend', '<section id="evolution" class="screen modal-screen" aria-labelledby="evolution-title"><div class="modal evolution-modal"><div class="evolution-heading"><div class="evolution-portrait-frame"><img id="evolution-portrait" alt=""><span>STYLE DE COMBAT</span></div><div><p class="eyebrow">CHOISIS TA FAÇON DE RETOURNER LA RUE.</p><h2 id="evolution-title"></h2><p id="talent-progress"></p></div></div><div class="evolution-points" role="status"></div><div id="talent-tree"></div><p class="evolution-note">Un point après chaque boss. Les talents ne valent que pour cette sortie et sont remis à zéro dès qu’une nouvelle partie commence.</p><button class="button primary" data-action="close-evolution"><span>Retour au combat</span><span>←</span></button></div></section>');
  document.querySelector('.control-list').insertAdjacentHTML('beforeend', '<div><kbd>Flèches / stick / croix</kbd><span>Menus · naviguer ; ← → sur les listes</span></div><div><kbd>Entrée / A (✕) · Échap / B (○)</kbd><span>Valider / Retour · Start : pause</span></div>');
  document.querySelector('.tip').textContent = 'Lis les gestes des ennemis : saute ou esquive avant le coup. Seuls les bidons explosifs annoncent leur zone au sol. Fin de chapitre → 1 point de talent. Pause → Talents. Manettes : X/□ poing, Y/△ pied, A/✕ saut, B/○ spécial, RB/R1 esquive.';
}
export function renderEvolution(kind, raw, spend) {
  const $ = s => document.querySelector(s), f = fighter(kind), profile = normalizeProfile(raw, kind), active = document.activeElement?.dataset.talent;
  $('#evolution-portrait').src = `/assets/${kind}/${kind}_p.png`; $('#evolution-portrait').alt = f.name;
  $('#evolution-title').textContent = f.name;
  $('#talent-progress').textContent = `${profile.completed.length}/6 CHAPITRES TERMINÉS · ${profile.talents.length}/6 TALENTS`;
  $('#talent-progress').title = profile.completed.map(i => CHAPTERS[i].name).join(' · ');
  $('.evolution-modal').style.setProperty('--fighter-color', f.color);
  $('.evolution-points').innerHTML = profile.points
    ? `<strong>${profile.points}</strong><span>POINT${profile.points > 1 ? 'S' : ''} À DÉPENSER<br><small>Choisis une voie, l’effet est immédiat.</small></span>`
    : `<strong>${profile.talents.length === 6 ? '✓' : '0'}</strong><span>${profile.talents.length === 6 ? 'STYLE AU MAXIMUM' : 'PROCHAIN POINT APRÈS LE BOSS'}<br><small>${profile.talents.length === 6 ? 'Toutes les améliorations sont actives.' : 'Chaque voie se débloque de haut en bas.'}</small></span>`;
  const nodes = TALENTS[kind], branches = [...new Set(nodes.map(n => n.branch))];
  $('#talent-tree').innerHTML = branches.map((branch, branchIndex) => `<div class="talent-branch"><div class="talent-branch-title"><span class="branch-icon">${branchIcon(kind, branchIndex)}</span><div><span>VOIE 0${branchIndex + 1}</span><h3>${branch}</h3></div><b class="branch-count">${nodes.filter(n => n.branch === branch && profile.talents.includes(n.id)).length}/3</b></div><div class="talent-track">${nodes.filter(n => n.branch === branch).map((node, tier) => {
    const owned = profile.talents.includes(node.id), available = !!spendPoint(profile, node.id), parent = nodes.find(n => n.id === node.requires);
    return `<button class="talent-node ${owned ? 'owned' : available ? 'available' : 'locked'}" data-talent="${node.id}" data-tier="${tier + 1}" aria-disabled="${!available}" aria-label="${node.name} : ${node.description} ${owned ? 'Acquis' : available ? 'Débloquer pour un point' : 'Verrouillé'}"><span class="talent-rank">0${tier + 1}</span><span class="talent-copy"><b>${node.name}</b><span>${node.description}</span><small>${owned ? '✓ ACTIF' : available ? 'DÉBLOQUER · 1 POINT' : parent && !profile.talents.includes(parent.id) ? `APRÈS ${parent.name.toUpperCase()}` : 'POINT NÉCESSAIRE'}</small></span></button>`;
  }).join('')}</div></div>`).join('');
  document.querySelectorAll('[data-talent]').forEach(button => button.addEventListener('click', () => { if (button.getAttribute('aria-disabled') !== 'true') spend(button.dataset.talent); }));
  if (active) [...document.querySelectorAll('[data-talent]')].find(b => b.dataset.talent === active)?.focus({ preventScroll: true });
}

export function renderPauseTalents(player) {
  if (!player) return;
  const profile = normalizeProfile(player.progression, player.kind), f = fighter(player.kind), button = document.querySelector('#pause-talents');
  button.style.setProperty('--fighter-color', f.color); button.classList.toggle('has-points', profile.points > 0);
  button.querySelector('.pause-talent-icon').innerHTML = branchIcon(player.kind);
  document.querySelector('#pause-talent-summary').textContent = `${f.name} · ${profile.talents.length}/6 talents actifs`;
  document.querySelector('#pause-talent-points').innerHTML = `${profile.points}<small>POINT${profile.points > 1 ? 'S' : ''}</small>`;
  document.querySelector('#pause-talent-branches').innerHTML = [...new Set(TALENTS[player.kind].map(n => n.branch))].map((name, i) => `<span>${branchIcon(player.kind, i)}${name}</span>`).join('');
  button.setAttribute('aria-label', `Arbre de talents de ${f.name} : ${profile.points} point${profile.points > 1 ? 's' : ''} à dépenser, ${profile.talents.length} talents actifs`);
}
