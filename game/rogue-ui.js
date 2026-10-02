import { ATTRIBUTES, normalizeProfile, xpForLevel } from './progression.js';

const DETAILS = {
 strength: '+7 % de dégâts au corps à corps et du spécial par rang.',
 endurance: '+8 % de vie maximale par rang ; résistance, esquive et récupération améliorées.',
 attackSpeed: '+5 % de vitesse de frappe par rang, avec ou sans arme.',
 moveSpeed: '+2,5 % de vitesse de déplacement par rang.',
 specialCharge: '+1 point d’énergie par coup réussi et par rang.',
};
export function installRogueUI() {
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/styles/rogue.css'; document.head.append(link);
  document.querySelector('#pause-talents').insertAdjacentHTML('afterend', '<button id="pause-attributes" class="button secondary" data-action="attributes">Caractéristiques & XP</button>');
  document.querySelector('#app').insertAdjacentHTML('beforeend', '<section id="attributes" class="screen modal-screen" aria-labelledby="attributes-title"><div class="modal rogue-modal"><p class="eyebrow">PROGRESSION DE CETTE SORTIE</p><h2 id="attributes-title">CARACTÉRISTIQUES</h2><p id="attribute-progress"></p><div id="attribute-list"></div><p class="evolution-note">XP à chaque ennemi vaincu. Deux points par niveau, sans limite de rang. Une nouvelle partie repart au niveau 1.</p><button class="button primary" data-action="close-attributes">Retour</button></div></section>');
}
export function renderAttributes(player, spend) {
  if (!player) return;
  const p = normalizeProfile(player.progression, player.kind), active = document.activeElement?.dataset.attribute;
  document.querySelector('#attribute-progress').textContent = `Niveau ${p.level} · ${p.xp} / ${xpForLevel(p.level + 1)} XP · ${p.statPoints} points disponibles`;
  document.querySelector('#attribute-list').innerHTML = Object.entries(ATTRIBUTES).map(([id, name]) => `<button class="attribute-node" data-attribute="${id}" ${p.statPoints ? '' : 'disabled'}><span><b>${name}</b><small>${DETAILS[id]}</small></span><strong>Rang ${p.attributes[id]} ＋</strong></button>`).join('');
  document.querySelectorAll('[data-attribute]').forEach(b => b.onclick = () => spend(b.dataset.attribute));
  if (active) document.querySelector(`[data-attribute="${active}"]`)?.focus();
}
