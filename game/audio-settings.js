export const AUDIO_DEFAULTS = Object.freeze({ master: .65, music: .40, effects: .65 });
export const AUDIO_SAVE_KEY = 'saranfou-audio-v1';
export function audioSettings(raw = {}) {
  return Object.fromEntries(Object.entries(AUDIO_DEFAULTS).map(([key, value]) => [key,
    Number.isFinite(raw?.[key]) ? Math.max(0, Math.min(1, raw[key])) : value]));
}
export function installAudioUI(game) {
  document.querySelector('#app').insertAdjacentHTML('beforeend', `<section id="sound" class="screen modal-screen" aria-labelledby="sound-title"><div class="modal sound-modal"><p class="eyebrow">À TON VOLUME.</p><h2 id="sound-title">LE BON <em>NIVEAU.</em></h2><p class="muted">Réglages enregistrés sur cet appareil. ← → pour ajuster, ↑ ↓ pour changer de ligne.</p>${[['master', 'Volume général'], ['music', 'Musique'], ['effects', 'Bruitages et voix']].map(([key, label]) => `<label class="sound-row" for="volume-${key}"><span>${label}</span><output id="value-${key}"></output><input id="volume-${key}" data-volume="${key}" type="range" min="0" max="100" step="5" aria-label="${label}"></label>`).join('')}<p id="sound-muted" class="tip"></p><button class="button secondary" data-action="sound-test">Tester le volume</button><button class="button primary" data-action="close-sound">Retour</button></div></section>`);
  for (const parent of ['.home-copy', '.pause-modal', '.result-modal']) {
    const button = document.createElement('button'); button.className = 'text-button'; button.dataset.action = 'sound'; button.textContent = 'Réglages audio ♪';
    document.querySelector(parent).append(button);
  }
  for (const slider of document.querySelectorAll('[data-volume]')) slider.addEventListener('input', () => {
    game.audio.setVolume(slider.dataset.volume, Number(slider.value) / 100); renderAudioUI(game.audio);
  });
  renderAudioUI(game.audio);
}
export function renderAudioUI(audio) {
  for (const [key, value] of Object.entries(audio.volumes)) {
    document.querySelector('#volume-' + key).value = Math.round(value * 100);
    document.querySelector('#value-' + key).textContent = Math.round(value * 100) + ' %';
  }
  document.querySelector('#sound-muted').textContent = audio.muted ? 'Son coupé avec ♪ : active-le pour écouter les réglages.' : 'La musique baisse brièvement pendant les impacts. Les voix utilisent une voix locale si disponible.';
}
