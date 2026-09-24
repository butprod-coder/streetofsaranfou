import { ATTRIBUTES, normalizeProfile, xpForLevel } from './progression.js';

const DETAILS = {
  vitality: '+8 % de vie maximale par rang.', strength: '+7 % de dégâts au corps à corps et du spécial par rang.',
  mobility: '+2,5 % de vitesse par rang.', endurance: '−1,5 % de dégâts subis, −2,5 % de recharge d’esquive et −3,5 % de durée d’étourdissement par rang.',
  weapons: '+8 % de dégâts avec les armes par rang.',
};
export function installRogueUI() {
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/styles/rogue.css'; document.head.append(link);
  document.querySelector('#pause-talents').insertAdjacentHTML('afterend', '<button id="pause-attributes" class="button secondary" data-action="attributes">Caractéristiques & XP</button>');
  document.querySelector('#app').insertAdjacentHTML('beforeend', '<section id="attributes" class="screen modal-screen" aria-labelledby="attributes-title"><div class="modal rogue-modal"><p class="eyebrow">PROGRESSION DE CETTE SORTIE</p><h2 id="attributes-title">CARACTÉRISTIQUES</h2><p id="attribute-progress"></p><div id="attribute-list"></div><p class="evolution-note">Deux points par niveau. Dix rangs maximum par caractéristique. Une nouvelle partie repart au niveau 1.</p><button class="button primary" data-action="close-attributes">Retour</button></div></section>');
}
export function renderAttributes(player, spend) {
  if (!player) return;
  const p = normalizeProfile(player.progression, player.kind), active = document.activeElement?.dataset.attribute;
  document.querySelector('#attribute-progress').textContent = `Niveau ${p.level}/20 · ${p.xp} XP${p.level < 20 ? ' / ' + xpForLevel(p.level + 1) : ''} · ${p.statPoints} points disponibles`;
  document.querySelector('#attribute-list').innerHTML = Object.entries(ATTRIBUTES).map(([id, name]) => `<button class="attribute-node" data-attribute="${id}" ${p.statPoints && p.attributes[id] < 10 ? '' : 'disabled'}><span><b>${name}</b><small>${DETAILS[id]}</small></span><strong>${p.attributes[id]}/10 ＋</strong></button>`).join('');
  document.querySelectorAll('[data-attribute]').forEach(b => b.onclick = () => spend(b.dataset.attribute));
  if (active) document.querySelector(`[data-attribute="${active}"]`)?.focus();
}
