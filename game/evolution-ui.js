import { DIFFICULTIES } from './balance.js';
import { TALENTS, normalizeProfile, spendPoint, xpForLevel } from './progression.js';
import { fighter, CHAPTERS } from './data.js';
import { branchIcon, talentIcon } from './talent-icons.js';
export function installEvolutionUI() {
  document.querySelector('.edition').textContent = 'ROGUELIKE · UNE NUIT, UNE VIE';
  document.querySelector('#join-form').insertAdjacentHTML('beforeend', '<p class="evolution-note">À la manette : sélectionne le code, A / ✕ choisit le caractère, ← → le modifient, ↓ passe à Rejoindre.</p>');
  const options = Object.entries(DIFFICULTIES).map(([id, d]) => `<option value="${id}" ${id === 'normal' ? 'selected' : ''}>${d.name}</option>`).join('');
  document.querySelector('.departure').insertAdjacentHTML('afterbegin', `<label for="difficulty-select">AMBIANCE</label><select id="difficulty-select">${options}</select>`);
  document.querySelector('.fighter-description').insertAdjacentHTML('beforeend', '<button class="button secondary evolution-link" data-action="evolution">Arbre de talents ↗</button>');
  document.querySelector('.lobby-choice').insertAdjacentHTML('beforeend', `<label for="online-difficulty">Difficulté</label><select id="online-difficulty">${options}</select><button class="text-button" data-action="evolution">Arbre de talents ↗</button>`);
  document.querySelector('#resume-button').insertAdjacentHTML('afterend', '<button id="pause-talents" class="button pause-talents" data-action="evolution"><span class="pause-talent-icon" aria-hidden="true"></span><span class="pause-talent-copy"><b>ARBRE DE TALENTS</b><small id="pause-talent-summary"></small><span id="pause-talent-branches"></span></span><strong id="pause-talent-points"></strong></button>');
  document.querySelector('#retry-button').insertAdjacentHTML('afterend', '<button class="button secondary" data-action="evolution">Arbre de talents ↗</button>');
  document.querySelector('#app').insertAdjacentHTML('beforeend', '<section id="evolution" class="screen modal-screen" aria-labelledby="evolution-title"><div class="modal evolution-modal"><div class="evolution-heading"><div class="evolution-portrait-frame"><img id="evolution-portrait" alt=""><span>STYLE DE COMBAT</span></div><div><p class="eyebrow">CHOISIS TA FAÇON DE RETOURNER LA RUE.</p><h2 id="evolution-title"></h2><p id="talent-progress"></p></div></div><div class="evolution-points" role="status"></div><div id="talent-tree"></div><div class="talent-legend"><span>◇ Disponible</span><span>◆ Actif</span><span>Survole ou sélectionne un talent</span><span class="talent-help" tabindex="0" aria-label="Règles de progression">? <span role="tooltip">Un point aux niveaux impairs dès le niveau 3, puis après les cinq premiers boss. Un talent du palier précédent ouvre le suivant. Ultimes : trois boss vaincus, un par voie. Progression remise à zéro à chaque sortie.</span></span></div><div id="talent-tooltip" role="tooltip" hidden></div><button class="button primary" data-action="close-evolution"><span>Retour au combat</span><span>←</span></button></div></section>');
  document.querySelector('.control-list').insertAdjacentHTML('beforeend', '<div><kbd>Flèches / stick / croix</kbd><span>Menus · naviguer ; maintenir pour défiler à la manette ; ← → pour choisir le personnage ou modifier une liste</span></div><div><kbd>Entrée / A (✕) · Échap / B (○)</kbd><span>Valider / Retour</span></div><div><kbd>Start / Options</kbd><span>Choix du personnage : lancer la partie · En jeu : pause / reprise</span></div>');
  document.querySelector('.tip').textContent = 'Lis les gestes des ennemis : saute ou esquive avant le coup. Seuls les bidons explosifs annoncent leur zone au sol. XP → caractéristiques et talents. Pause → Progression. Manettes : X/□ poing, Y/△ pied, A/✕ saut, B/○ spécial, RB/R1 esquive.';
}
export function renderEvolution(kind, raw, spend) {
  const $ = s => document.querySelector(s), f = fighter(kind), profile = normalizeProfile(raw, kind), active = document.activeElement?.dataset.talent;
  $('#evolution-portrait').src = `/assets/${kind}/${kind}_p.png`; $('#evolution-portrait').alt = f.name;
  $('#evolution-title').textContent = f.name;
  $('#talent-progress').textContent = `NIVEAU ${profile.level}/20 · ${profile.xp} XP${profile.level < 20 ? ' / ' + xpForLevel(profile.level + 1) : ''} · ${profile.talents.length}/14 TALENTS ACTIFS`;
  $('#talent-progress').title = profile.completed.map(i => CHAPTERS[i].name).join(' · ');
  $('.evolution-modal').style.setProperty('--fighter-color', f.color);
  $('.evolution-points').innerHTML = `<strong>${profile.points}</strong><span>POINTS DE TALENT<br><small>3 voies · 6 paliers · 36 talents · 14 choix par sortie</small></span>`;
  const nodes = TALENTS[kind], branches = [...new Set(nodes.map(n => n.branch))];
  $('#talent-tree').innerHTML = branches.map((branch, branchIndex) => `<div class="talent-branch" style="--branch-color:${['#ffb454', '#b891ff', '#59d6be'][branchIndex]}"><div class="talent-branch-title"><span class="branch-icon">${branchIcon(kind, branchIndex)}</span><div><span>VOIE 0${branchIndex + 1}</span><h3>${branch}</h3></div><b class="branch-count">${nodes.filter(n => n.branch === branch && profile.talents.includes(n.id)).length}/12</b></div><div class="talent-track">${talentLinks(nodes.filter(n => n.branch === branch), profile)}${nodes.filter(n => n.branch === branch).map(node => {
    const owned = profile.talents.includes(node.id), available = !!spendPoint(profile, node.id);
    const reason = owned ? '✓ ACTIF' : available ? 'DÉBLOQUER · 1 POINT' : node.ultimate && profile.completed.length < 3 ? '3 BOSS REQUIS' : node.ultimate && nodes.some(n => n.branch === branch && n.ultimate && profile.talents.includes(n.id)) ? 'AUTRE ULTIME CHOISI' : !profile.points ? 'POINT NÉCESSAIRE' : 'PALIER PRÉCÉDENT REQUIS';
    return `<button class="talent-node ${node.ultimate ? 'ultimate' : ''} ${owned ? 'owned' : available ? 'available' : 'locked'}" data-talent="${node.id}" data-tier="${node.tier + 1}" aria-disabled="${!available}" aria-label="${node.name} : ${node.description} — ${reason}" data-reason="${reason}"><span class="talent-art">${talentIcon(kind, node)}</span><span class="talent-rank">${owned ? '1/1' : '0/1'}</span>${node.ultimate ? '<span class="talent-star" aria-hidden="true">★</span>' : ''}</button>`;

  }).join('')}</div></div>`).join('');
  const tooltip = $('#talent-tooltip');
  tooltip.hidden = true;
  document.querySelectorAll('[data-talent]').forEach(button => {
    const node = nodes.find(n => n.id === button.dataset.talent);
    const show = () => {
      tooltip.innerHTML = '<b>' + node.name + '</b><small>' + node.branch + ' · Palier ' + (node.tier + 1) + (node.ultimate ? ' · Ultime' : '') + '</small><p>' + node.description + '</p><strong>' + button.dataset.reason + '</strong>';
      tooltip.hidden = false;
      button.setAttribute('aria-describedby', 'talent-tooltip');
      const rect = button.getBoundingClientRect(), box = tooltip.getBoundingClientRect();
      tooltip.style.left = Math.max(8, Math.min(innerWidth - box.width - 8, rect.left + rect.width / 2 - box.width / 2)) + 'px';
      tooltip.style.top = Math.max(8, rect.bottom + box.height + 12 < innerHeight ? rect.bottom + 12 : rect.top - box.height - 12) + 'px';
    };
    const hide = () => { tooltip.hidden = true; button.removeAttribute('aria-describedby'); };
    button.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') show(); });
    button.addEventListener('pointerleave', hide);
    button.addEventListener('focus', show);
    button.addEventListener('blur', hide);
    let previewTouch = false;
    button.addEventListener('pointerdown', e => { previewTouch = e.pointerType === 'touch' && document.activeElement !== button; });
    button.addEventListener('click', () => {
      if (previewTouch) { previewTouch = false; show(); return; }
      if (button.getAttribute('aria-disabled') !== 'true') { hide(); spend(button.dataset.talent); }
    });
  });
  $('.evolution-modal').onscroll = () => { tooltip.hidden = true; };
  if (active) [...document.querySelectorAll('[data-talent]')].find(b => b.dataset.talent === active)?.focus({ preventScroll: true });
}

export function renderPauseTalents(player) {
  if (!player) return;
  const profile = normalizeProfile(player.progression, player.kind), f = fighter(player.kind), button = document.querySelector('#pause-talents');
  button.style.setProperty('--fighter-color', f.color); button.classList.toggle('has-points', profile.points > 0);
  button.querySelector('.pause-talent-icon').innerHTML = branchIcon(player.kind);
  document.querySelector('#pause-talent-summary').textContent = `${f.name} · Niv. ${profile.level} · ${profile.talents.length}/14 talents actifs`;
  document.querySelector('#pause-talent-points').innerHTML = `${profile.points}<small>POINT${profile.points > 1 ? 'S' : ''}</small>`;
  document.querySelector('#pause-talent-branches').innerHTML = [...new Set(TALENTS[player.kind].map(n => n.branch))].map((name, i) => `<span>${branchIcon(player.kind, i)}${name}</span>`).join('');
  button.setAttribute('aria-label', `Arbre de talents de ${f.name} : ${profile.points} point${profile.points > 1 ? 's' : ''} à dépenser, ${profile.talents.length} talents actifs`);
}

// A talent in either column opens both choices on the next tier.
function talentLinks(nodes, profile) {
  const lines = nodes.filter(n => n.tier < 5).map(node => {
    const index = nodes.indexOf(node), x = index % 2 ? 150 : 50, y = node.tier * 72 + 30;
    return nodes.filter(next => next.tier === node.tier + 1).map(next => {
      const active = profile.talents.includes(node.id);
      return '<path class="' + (active ? 'lit' : '') + '" d="M' + x + ' ' + y + ' L' + (nodes.indexOf(next) % 2 ? 150 : 50) + ' ' + (y + 72) + '"/>';
    }).join('');
  }).join('');
  return '<svg class="talent-links" viewBox="0 0 200 420" preserveAspectRatio="none" aria-hidden="true">' + lines + '</svg>';
}
