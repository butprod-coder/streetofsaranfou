export function installInteractionUI() {
  const controls = document.querySelector('.control-list');
  for (const [key, text] of [['Contact', 'Saisie automatique · poing + direction arrière pour projeter'], ['F / RT ou R2', 'Interagir avec une rencontre · ramasser / échanger une arme · à vide, la déposer'], ['J / X manette avec arme', 'Frapper / tirer · usages et munitions limités']]) {
    const row = document.createElement('div'), kbd = document.createElement('kbd'), span = document.createElement('span'); kbd.textContent = key; span.textContent = text; row.append(kbd, span); controls.append(row);
  }
  for (const [key, label, text] of [['interact', 'Interagir / ramasser une arme', 'F']]) {
    const button = document.createElement('button'); button.dataset.touch = key; button.setAttribute('aria-label', label); button.textContent = text; document.querySelector('.touch-buttons').append(button);
  }
  document.querySelector('.keyboard-hint').innerHTML = 'J <i>FRAPPER / ARME</i> K <i>PIED</i> L <i>SPÉCIAL</i> J + ←/→ <i>PROJECTION</i> F <i>INTERAGIR / RAMASSER</i>';
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = '/styles/interactions.css'; document.head.append(style);
}
