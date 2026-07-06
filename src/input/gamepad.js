import { slotBinding } from '../config/coopInput.js';
import { ensureGamepadPatch } from './gamepadPatch.js';

/** Boutons manette — mapping standard W3C (PS4 / Xbox). */
export const PAD = {
  CROIX: 0,
  ROND: 1,
  CARRE: 2,
  TRIANGLE: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  SHARE: 8,
  OPTIONS: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
};

const STICK_DEADZONE = 0.3;
const BTN_THRESHOLD = 0.15;
/** Délai après ouverture d'un menu — évite de valider 2 écrans d'un coup. */
const MENU_PAD_GRACE_MS = 420;
const rawPadCache = new Map();
let lastDebugHint = '';
let lastIgnoredDevices = [];

/** Périphériques audio / HID fantômes — pas une manette de jeu. */
const PAD_NAME_BLOCK = [
  /headset/i,
  /headphone/i,
  /earphone/i,
  /earbud/i,
  /microphone/i,
  /\bmic\b/i,
  /casque/i,
  /oreillette/i,
  /audio device/i,
  /communication device/i,
  /sound\s*bar/i,
  /\bspeaker/i,
  /webcam/i,
  /\bcamera\b/i,
  /line\s*in/i,
  /line\s*out/i,
  // Casques USB pro / visio (souvent vus comme « gamepad » par Windows)
  /jabra/i,
  /evolv/i,
  /\blink\s*ms\b/i,
  /plantronics/i,
  /\bpoly\b/i,
  /yealink/i,
  /sennheiser/i,
  /\bepos\b/i,
  /teams.?cert/i,
  /voip/i,
  /telephony/i,
  /usb\s*phone/i,
  /logitech\s*zone/i,
  /hyperx\s*cloud/i,
  /arctis/i,
  /steelseries\s*arctis/i,
  /corsair\s*void/i,
  /corsair\s*hs/i,
  /razer\s*kraken/i,
  /razer\s*barracuda/i,
];

/** Profils manette reconnus — prioritaires même si le nom est ambigu. */
const PAD_NAME_ALLOW = [
  /xbox/i,
  /xinput/i,
  /dualsense/i,
  /dualshock/i,
  /playstation/i,
  /wireless controller/i,
  /nintendo/i,
  /pro controller/i,
  /8bitdo/i,
  /gamepad/i,
  /joystick/i,
  /flydigi/i,
  /hori/i,
  /razer/i,
  /logitech\s*f/i,
  /switch/i,
  /manette/i,
];

function rawFromDevice(device) {
  if (!device) return null;
  return device._raw || device.pad || device;
}

function deviceName(device) {
  const raw = rawFromDevice(device);
  return raw?.id || device?.id || '';
}

function isLikelyGamepad(device) {
  const raw = rawFromDevice(device);
  if (!raw) return false;

  const name = deviceName(device);
  if (PAD_NAME_BLOCK.some((re) => re.test(name))) return false;
  if (PAD_NAME_ALLOW.some((re) => re.test(name))) return true;

  const btnCount = raw.buttons?.length ?? 0;
  const axisCount = raw.axes?.length ?? 0;

  if (raw.mapping === 'standard' && btnCount >= 4) return true;
  if (btnCount >= 8 && axisCount >= 2) return true;
  if (btnCount <= 2 && axisCount <= 1) return false;

  return btnCount >= 4 || axisCount >= 2;
}

function padSortRank(pad) {
  const name = deviceName(pad);
  if (PAD_NAME_ALLOW.some((re) => re.test(name))) return 0;
  return 1;
}

function readAllNativeRaw() {
  const nav = navigator.getGamepads?.() || navigator.webkitGetGamepads?.();
  if (!nav) return [];
  const out = [];
  for (let i = 0; i < nav.length; i++) {
    const raw = nav[i];
    if (!raw) continue;
    if (!raw.connected && !hasAnyInput(raw)) continue;
    out.push(raw);
  }
  return out;
}

function btnDown(pad, idx) {
  const b = pad?.buttons?.[idx];
  if (!b) return false;
  return !!b.pressed || (b.value ?? 0) > BTN_THRESHOLD;
}

function padId(pad, fallbackIdx = 0) {
  return pad.id || pad.pad?.id || pad._raw?.id || `gamepad-${pad.index ?? fallbackIdx}`;
}

function hasAnyInput(raw) {
  if (!raw) return false;
  for (const b of raw.buttons || []) {
    if (b?.pressed || (b?.value ?? 0) > BTN_THRESHOLD) return true;
  }
  for (const a of raw.axes || []) {
    if (Math.abs(a) > STICK_DEADZONE) return true;
  }
  return false;
}

function wrapRawGamepad(raw) {
  if (!raw) return null;
  const id = raw.id || `gamepad-${raw.index}`;
  let wrapped = rawPadCache.get(id);
  if (!wrapped) {
    wrapped = {
      id,
      index: raw.index,
      get connected() {
        return wrapped._raw?.connected ?? true;
      },
      get buttons() {
        return wrapped._raw?.buttons ?? [];
      },
      pad: raw,
      _raw: raw,
      _isRaw: true,
    };
    wrapped.axes = Array.from({ length: Math.max(4, raw.axes?.length ?? 0) }, (_, i) => ({
      getValue: () => {
        const v = wrapped._raw?.axes?.[i];
        return typeof v === 'number' ? v : 0;
      },
    }));
    rawPadCache.set(id, wrapped);
  } else {
    wrapped._raw = raw;
    wrapped.index = raw.index;
  }
  return wrapped;
}

function menuPadBlocked(scene) {
  if (!scene?._padGraceUntil) return false;
  const now = scene.time?.now ?? performance.now();
  return now < scene._padGraceUntil;
}

function syncPadMenuPrev(scene, padIndex, pad, opts = {}) {
  const allowStartConfirm = opts.allowStartConfirm !== false;
  const storeKey = 'nav' + padIndex;
  if (!scene._mpb) scene._mpb = {};
  if (!scene._mpb[storeKey]) scene._mpb[storeKey] = {};
  const prev = scene._mpb[storeKey];
  const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
  const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
  prev.left = ax < -STICK_DEADZONE || btnDown(pad, PAD.LEFT);
  prev.right = ax > STICK_DEADZONE || btnDown(pad, PAD.RIGHT);
  prev.up = ay < -STICK_DEADZONE || btnDown(pad, PAD.UP);
  prev.down = ay > STICK_DEADZONE || btnDown(pad, PAD.DOWN);
  prev.confirm = btnDown(pad, PAD.CROIX) || (allowStartConfirm && btnDown(pad, PAD.OPTIONS));
  prev.back = btnDown(pad, PAD.ROND);
}

function syncPadBtnPrev(scene, storeKey, pad) {
  if (!scene._mpb) scene._mpb = {};
  if (!scene._mpb[storeKey]) scene._mpb[storeKey] = {};
  const prev = scene._mpb[storeKey];
  for (let i = 0; i < 16; i++) {
    prev[i] = btnDown(pad, i);
  }
}

/** À appeler dans create() de chaque scène menu. */
export function beginMenuPadGrace(scene, ms = MENU_PAD_GRACE_MS) {
  if (!scene) return;
  const now = scene.time?.now ?? performance.now();
  scene._padGraceUntil = now + ms;
  const pads = connectedPads(scene);
  for (let i = 0; i < pads.length; i++) {
    syncPadMenuPrev(scene, i, pads[i]);
    syncPadBtnPrev(scene, 'confirm' + i, pads[i]);
    syncPadBtnPrev(scene, 'start' + i, pads[i]);
  }
}

const MENU_PAD_NEUTRAL = Object.freeze({
  left: false,
  right: false,
  up: false,
  down: false,
  confirm: false,
  back: false,
});

function readNativeGamepads() {
  const ignored = [];
  const out = [];
  for (const raw of readAllNativeRaw()) {
    if (!isLikelyGamepad(raw)) {
      ignored.push(deviceName(raw));
      continue;
    }
    const wrapped = wrapRawGamepad(raw);
    if (wrapped) out.push(wrapped);
  }
  lastIgnoredDevices = ignored;
  return out;
}

function readPhaserGamepads(scene) {
  const gp = scene?.input?.gamepad;
  if (!gp?.getAll) return [];
  return gp.getAll().filter((p) => p && isLikelyGamepad(p));
}

/** Infos debug (écran titre). */
export function gamepadDebugInfo(scene) {
  const pads = connectedPads(scene);
  const ignored = lastIgnoredDevices.filter(Boolean);
  if (!pads.length) {
    const ignoreHint =
      ignored.length > 0
        ? `Ignoré (audio/HID) : ${ignored[0].slice(0, 42)}`
        : lastDebugHint || 'Cliquez dans le jeu puis appuyez sur un bouton manette';
    return {
      count: 0,
      hint: ignoreHint,
      active: ignored.length > 1 ? `+${ignored.length - 1} autre(s) filtré(s)` : '',
    };
  }
  const pad = pads[0];
  const ax = pad.axes?.[0]?.getValue?.() ?? 0;
  const ay = pad.axes?.[1]?.getValue?.() ?? 0;
  const pressed = [];
  for (let i = 0; i < (pad.buttons?.length ?? 0); i++) {
    if (btnDown(pad, i)) pressed.push(i);
  }
  const ignoreLine =
    ignored.length > 0 ? `  (${ignored.length} audio/HID ignoré${ignored.length > 1 ? 's' : ''})` : '';
  return {
    count: pads.length,
    hint: (pad.id?.slice(0, 48) || 'Manette') + ignoreLine,
    active: `axes ${ax.toFixed(2)},${ay.toFixed(2)}  btns [${pressed.join(',')}]`,
  };
}

export function ensureGamepadReady(scene) {
  if (!scene) return;
  const gp = scene.input?.gamepad;
  if (gp) {
    ensureGamepadPatch(scene.game);
    if (typeof gp.start === 'function') {
      try {
        gp.start();
      } catch (_) {
        /* noop */
      }
    }
  }
}

export function initGamepadBridge(game) {
  if (!game || game._gamepadBridge) return;
  game._gamepadBridge = true;

  const wake = () => {
    readNativeGamepads();
  };

  window.addEventListener('gamepadconnected', (e) => {
    const gp = e.gamepad;
    if (gp && !isLikelyGamepad(gp)) {
      lastDebugHint = `Ignoré (audio/HID) : ${gp.id?.slice(0, 48) || 'périphérique'}`;
    } else {
      lastDebugHint = `Connectée : ${gp?.id || 'manette'}`;
    }
    wake();
  });
  window.addEventListener('gamepaddisconnected', () => {
    rawPadCache.clear();
    lastDebugHint = 'Manette déconnectée';
    wake();
  });
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('focus', wake);

  game.events.on('step', wake);

  const setupCanvas = () => {
    const canvas = game.canvas;
    if (!canvas || canvas._padFocus) return;
    canvas._padFocus = true;
    canvas.setAttribute('tabindex', '0');
    canvas.style.outline = 'none';
    const focusCanvas = () => {
      try {
        canvas.focus({ preventScroll: true });
      } catch (_) {
        canvas.focus();
      }
      wake();
    };
    canvas.addEventListener('pointerdown', focusCanvas);
    focusCanvas();
  };

  if (game.isBooted) setupCanvas();
  else game.events.once('ready', setupCanvas);
  setTimeout(setupCanvas, 250);
}

/** Manettes — API native navigateur en priorité (comme webcammictest.com). */
export function connectedPads(scene) {
  if (scene) ensureGamepadReady(scene);

  const out = [];
  const ids = new Set();
  const add = (pad, idx) => {
    if (!pad) return;
    if (!isLikelyGamepad(pad)) return;
    const id = padId(pad, idx);
    if (ids.has(id)) return;
    ids.add(id);
    out.push(pad);
  };

  readNativeGamepads().forEach(add);
  if (!out.length && scene) {
    readPhaserGamepads(scene).forEach(add);
  }

  out.sort((a, b) => padSortRank(a) - padSortRank(b));

  return out;
}

export function padOf(scene, index = 0) {
  return connectedPads(scene)[index] ?? null;
}

export function padForBinding(scene, slot) {
  const b = slotBinding(scene, slot);
  if (!b || b.type !== 'pad') return null;
  const pads = connectedPads(scene);
  if (b.padId != null) {
    const found = pads.find((p) => padId(p) === b.padId);
    if (found) return found;
  }
  if (b.padIndex != null) return pads[b.padIndex] ?? null;
  return null;
}

export function padIndexForSlot(scene, slot) {
  const pad = padForBinding(scene, slot);
  if (!pad) return -1;
  const id = padId(pad);
  return connectedPads(scene).findIndex((p) => padId(p) === id);
}

export function padLabel(scene, slot) {
  const idx = padIndexForSlot(scene, slot);
  return idx >= 0 ? `Manette ${idx + 1}` : 'Manette ?';
}

export function padForPlayer(scene, slot) {
  if (scene.coop && scene.coopInputBindings) {
    return padForBinding(scene, slot);
  }
  return padOf(scene, slot);
}

export function padBtnEdge(scene, storeKey, btnIndex, pad) {
  if (!pad) return false;
  if (!scene._mpb) scene._mpb = {};
  if (!scene._mpb[storeKey]) scene._mpb[storeKey] = {};
  const prev = scene._mpb[storeKey];
  const now = btnDown(pad, btnIndex);
  const was = prev[btnIndex];
  prev[btnIndex] = now;
  if (menuPadBlocked(scene)) return false;
  return now && !was;
}

export function padConfirm(scene, padIndex = 0) {
  const pad = padOf(scene, padIndex);
  if (!pad) return false;
  const store = 'confirm' + padIndex;
  return (
    padBtnEdge(scene, store, PAD.CROIX, pad) ||
    padBtnEdge(scene, store, PAD.CARRE, pad) ||
    padBtnEdge(scene, store, PAD.OPTIONS, pad)
  );
}

export function padMenu(scene, padIndex = 0, opts = {}) {
  const allowStartConfirm = opts.allowStartConfirm !== false;
  const pad = padOf(scene, padIndex);
  if (!pad) return null;

  if (menuPadBlocked(scene)) {
    syncPadMenuPrev(scene, padIndex, pad, opts);
    return MENU_PAD_NEUTRAL;
  }

  const storeKey = 'nav' + padIndex;
  if (!scene._mpb) scene._mpb = {};
  if (!scene._mpb[storeKey]) scene._mpb[storeKey] = {};
  const prev = scene._mpb[storeKey];

  const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
  const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;

  const st = {
    left: ax < -STICK_DEADZONE || btnDown(pad, PAD.LEFT),
    right: ax > STICK_DEADZONE || btnDown(pad, PAD.RIGHT),
    up: ay < -STICK_DEADZONE || btnDown(pad, PAD.UP),
    down: ay > STICK_DEADZONE || btnDown(pad, PAD.DOWN),
    confirm: btnDown(pad, PAD.CROIX) || (allowStartConfirm && btnDown(pad, PAD.OPTIONS)),
    back: btnDown(pad, PAD.ROND),
  };

  const out = {};
  for (const key in st) {
    out[key] = st[key] && !prev[key];
    prev[key] = st[key];
  }
  return out;
}

export function padStart(scene, padIndex = 0) {
  const pad = padOf(scene, padIndex);
  return padBtnEdge(scene, 'start' + padIndex, PAD.OPTIONS, pad);
}

export function anyPadStart(scene) {
  const n = connectedPads(scene).length;
  for (let i = 0; i < n; i++) {
    if (padStart(scene, i)) return true;
  }
  return false;
}
