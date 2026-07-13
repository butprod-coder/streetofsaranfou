/** Réglages rendu — réduction charge GPU / compositeur navigateur. */

export const GFX_PRESETS = {
  high: {
    label: 'HAUTE',
    resolution: 1,
    sparkMax: 14,
    ambientMul: 1,
    padWakeMs: 80,
  },
  balanced: {
    label: 'ÉQUILIBRÉE',
    resolution: 0.75,
    sparkMax: 8,
    ambientMul: 0.5,
    padWakeMs: 140,
  },
  perf: {
    label: 'PERFORMANCES',
    resolution: 0.5,
    sparkMax: 4,
    ambientMul: 0,
    padWakeMs: 220,
  },
};

const STORAGE_KEY = 'sosf_gfx';

let currentKey = 'balanced';

export function loadGfxKey() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && GFX_PRESETS[saved]) return saved;
  } catch (_) {}
  return 'balanced';
}

export function initGfx(overrideKey) {
  if (overrideKey && GFX_PRESETS[overrideKey]) {
    currentKey = overrideKey;
    return;
  }
  currentKey = loadGfxKey();
}

export function getGfxKey() {
  return currentKey;
}

export function getGfx() {
  return GFX_PRESETS[currentKey] ?? GFX_PRESETS.balanced;
}

export function cycleGfxKey() {
  const keys = Object.keys(GFX_PRESETS);
  const i = keys.indexOf(currentKey);
  currentKey = keys[(i + 1) % keys.length];
  try {
    localStorage.setItem(STORAGE_KEY, currentKey);
  } catch (_) {}
  return getGfx();
}

/** Applique la résolution interne Phaser (sans recharger la page). */
export function applyGfxToGame(game) {
  const gfx = getGfx();
  if (game?.scale?.setResolution) {
    game.scale.setResolution(gfx.resolution, true);
  }
  return gfx;
}
