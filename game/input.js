import { blankInput, ACTIONS, clamp } from './data.js';
const KEYMAP = { KeyW: 'up', KeyZ: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', KeyQ: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyJ: 'punch', KeyK: 'kick', KeyL: 'special', Space: 'jump', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyE: 'revive', KeyG: 'grab', KeyF: 'interact' };
export class Input {
  constructor({ pause, blur, menu, wake }) {
    this.keys = new Set(); this.touch = {}; this.stick = { x: 0, y: 0 }; this.taps = {}; this.seq = 0; this.padPrevious = {}; this.enabled = false;
    this.pause = pause; this.onMenu = menu; this.wake = wake;
    addEventListener('keydown', e => {
      if (this.controllersOnly) return;
      if (e.code === 'Escape' && !e.repeat) { e.preventDefault(); pause(); return; }
      if (!this.enabled && e.target.type === 'range' && ['ArrowUp', 'ArrowDown'].includes(e.code)) { e.preventDefault(); if (!e.repeat) this.onMenu(KEYMAP[e.code]); return; }
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (!this.enabled && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); if (!e.repeat) this.onMenu(KEYMAP[e.code]); return; }
      const action = KEYMAP[e.code];
      if (!action || !this.enabled || this.controllersOnly) return;
      e.preventDefault(); wake();
      if (!this.keys.has(e.code) && ACTIONS.includes(action)) this.tap(action);
      this.keys.add(e.code);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.clear(); blur(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clear(); blur(); } });
    const stick = document.querySelector('#touch-stick');
    let pointer = null;
    const move = e => {
      const rect = stick.getBoundingClientRect(), radius = rect.width * .36;
      const dx = e.clientX - rect.left - rect.width / 2, dy = e.clientY - rect.top - rect.height / 2;
      const d = Math.max(radius, Math.hypot(dx, dy)); this.stick = { x: dx / d, y: dy / d };
      stick.firstElementChild.style.transform = `translate(${this.stick.x * radius}px,${this.stick.y * radius}px)`;
    };
    stick.addEventListener('pointerdown', e => { if (pointer !== null) return; pointer = e.pointerId; stick.setPointerCapture(pointer); move(e); wake(); });
    stick.addEventListener('pointermove', e => { if (pointer === e.pointerId) move(e); });
    const release = () => { pointer = null; this.stick = { x: 0, y: 0 }; stick.firstElementChild.style.transform = ''; };
    stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release); stick.addEventListener('lostpointercapture', release);
    document.querySelectorAll('[data-touch]').forEach(button => {
      const key = button.dataset.touch;
      button.addEventListener('pointerdown', e => { if (this.controllersOnly) return; e.preventDefault(); button.setPointerCapture(e.pointerId); this.touch[key] = true; this.tap(key); wake(); });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => { this.touch[key] = false; });
    });
  }
  tap(key) { this.taps[key] = (this.taps[key] || 0) + 1; }
  clear() { this.keys.clear(); this.touch = {}; this.stick = { x: 0, y: 0 }; this.menuDirection = null; this.menuNeedsNeutral = true; if (this.slotStates?.[1]) Object.assign(this.slotStates[1], { menuDirection: null, menuNeedsNeutral: true }); const knob = document.querySelector('#touch-stick i'); if (knob) knob.style.transform = ''; }
  neutral() { return { ...blankInput(), seq: ++this.seq, taps: { ...this.taps } }; }
  resetRun() { this.clear(); this.taps = {}; this.seq = 0; this.padBlocked = true; if (this.slotStates?.[1]) Object.assign(this.slotStates[1], { taps: {}, seq: 0, padBlocked: true, menuNeedsNeutral: true }); }
  sample(slot = 0) {
    this.padSlots ??= [];
    this.slotStates ??= [{}, {}];
    const pads = [...(navigator.getGamepads?.() || [])].filter(p => p?.connected);
    // Native indices distinguish identical models and do not shift on disconnect.
    for (const p of pads) if (this.padSlots.length < 2 && !this.padSlots.includes(p.index)) this.padSlots.push(p.index);
    const fields = ['padPrevious', 'previousEnabled', 'padBlocked', 'menuDirection', 'menuNeedsNeutral', 'menuRepeatAt', 'taps', 'seq'];
    const saved = Object.fromEntries(fields.map(k => [k, this[k]]));
    if (slot) for (const k of fields) this[k] = this.slotStates[slot][k];
    this.padPrevious ??= {}; this.taps ??= {}; this.seq ??= 0;
    const result = this.sampleDevice(pads.find(p => p.index === this.padSlots[slot]), slot);
    if (slot) { this.slotStates[slot] = Object.fromEntries(fields.map(k => [k, this[k]])); Object.assign(this, saved); }
    return result;
  }
  sampleDevice(gamepad, slot) {
    const input = blankInput(); input.seq = ++this.seq;
    const pressed = action => !slot && !this.controllersOnly && [...this.keys].some(key => KEYMAP[key] === action);
    input.x = Number(pressed('right')) - Number(pressed('left')) + (!slot && !this.controllersOnly ? this.stick.x : 0);
    input.y = Number(pressed('down')) - Number(pressed('up')) + (!slot && !this.controllersOnly ? this.stick.y : 0);
    for (const action of [...ACTIONS, 'revive']) input[action] = pressed(action) || (!slot && !this.controllersOnly && !!this.touch[action]);
    if (gamepad) {
      const button = i => gamepad.buttons[i]?.pressed || false;
      const axis = i => Math.abs(gamepad.axes[i] || 0) > .2 ? gamepad.axes[i] : 0;
      const pad = { jump: button(0), special: button(1), punch: button(2), kick: button(3), revive: button(4), dodge: button(5), grab: button(6), interact: button(7), pause: button(9), up: button(12) || axis(1) < -.55, down: button(13) || axis(1) > .55, left: button(14) || axis(0) < -.55, right: button(15) || axis(0) > .55, accept: button(0), back: button(1) };
      const wasEnabled = this.enabled;
      if (this.previousEnabled !== wasEnabled) this.padBlocked = true;
      if (![0, 1, 2, 3, 4, 5, 6, 7].some(button)) this.padBlocked = false;
      for (const action of ACTIONS) { if (wasEnabled && !this.padBlocked) { input[action] ||= pad[action]; if (pad[action] && !this.padPrevious[action]) this.tap(action); } }
      input.revive ||= pad.revive;
      input.x += axis(0) + Number(button(15)) - Number(button(14));
      input.y += axis(1) + Number(button(13)) - Number(button(12));
      if (pad.pause && !this.padPrevious.pause) { this.wake(); if (wasEnabled) this.pause(slot); else this.onMenu('start', slot); }
      else if (!wasEnabled) {
        // Buttons fire once; held directions repeat only within the current menu.
        const edge = ['back', 'accept'].find(action => pad[action] && !this.padPrevious[action]);
        const dx = Number(button(15)) - Number(button(14)), dy = Number(button(13)) - Number(button(12));
        const x = dx || (!dy ? axis(0) : 0), y = dy || (!dx ? axis(1) : 0);
        const threshold = this.menuDirection ? .4 : .55;
        const direction = Math.max(Math.abs(x), Math.abs(y)) < threshold ? null
          : Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
        if (!direction) { this.menuDirection = null; this.menuNeedsNeutral = false; }
        if (edge) { this.wake(); this.onMenu(edge, slot); }
        else if (direction && !this.menuNeedsNeutral) {
          const now = performance.now(), changed = direction !== this.menuDirection;
          if (changed || now >= this.menuRepeatAt) {
            this.menuDirection = direction; this.menuRepeatAt = now + (changed ? 350 : 120);
            this.wake(); this.onMenu(direction, slot);
          }
        }
      }
      this.padPrevious = pad;
      this.previousEnabled = wasEnabled;
    } else { this.padPrevious = {}; this.menuDirection = null; this.menuNeedsNeutral = false; }
    input.x = clamp(input.x, -1, 1); input.y = clamp(input.y, -1, 1); input.taps = { ...this.taps };
    if (!this.enabled) { const empty = blankInput(); empty.seq = input.seq; empty.taps = input.taps; return empty; }
    return input;
  }
}
