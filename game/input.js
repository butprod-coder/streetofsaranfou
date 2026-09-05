import { blankInput, ACTIONS, clamp } from './data.js';
const KEYMAP = { KeyW: 'up', KeyZ: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', KeyQ: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyJ: 'punch', KeyK: 'kick', KeyL: 'special', Space: 'jump', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyE: 'revive' };
export class Input {
  constructor({ pause, blur, menu, wake }) {
    this.keys = new Set(); this.touch = {}; this.stick = { x: 0, y: 0 }; this.taps = {}; this.seq = 0; this.padPrevious = {}; this.enabled = false;
    this.pause = pause; this.onMenu = menu; this.wake = wake;
    addEventListener('keydown', e => {
      if (e.code === 'Escape' && !e.repeat) { e.preventDefault(); pause(); return; }
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (!this.enabled && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); if (!e.repeat) this.onMenu(KEYMAP[e.code]); return; }
      const action = KEYMAP[e.code];
      if (!action || !this.enabled) return;
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
      button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); this.touch[key] = true; this.tap(key); wake(); });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => { this.touch[key] = false; });
    });
  }
  tap(key) { this.taps[key] = (this.taps[key] || 0) + 1; }
  clear() { this.keys.clear(); this.touch = {}; this.stick = { x: 0, y: 0 }; const knob = document.querySelector('#touch-stick i'); if (knob) knob.style.transform = ''; }
  neutral() { return { ...blankInput(), seq: ++this.seq, taps: { ...this.taps } }; }
  resetRun() { this.clear(); this.taps = {}; this.seq = 0; this.padBlocked = true; }
  sample() {
    const input = blankInput(); input.seq = ++this.seq;
    const pressed = action => [...this.keys].some(key => KEYMAP[key] === action);
    input.x = Number(pressed('right')) - Number(pressed('left')) + this.stick.x;
    input.y = Number(pressed('down')) - Number(pressed('up')) + this.stick.y;
    for (const action of [...ACTIONS, 'revive']) input[action] = pressed(action) || !!this.touch[action];
    const gamepad = [...(navigator.getGamepads?.() || [])].find(p => p?.connected);
    if (gamepad) {
      const button = i => gamepad.buttons[i]?.pressed || false;
      const axis = i => Math.abs(gamepad.axes[i] || 0) > .2 ? gamepad.axes[i] : 0;
      const pad = { jump: button(0), special: button(1), punch: button(2), kick: button(3), revive: button(4), dodge: button(5), pause: button(9), up: button(12) || axis(1) < -.55, down: button(13) || axis(1) > .55, left: button(14) || axis(0) < -.55, right: button(15) || axis(0) > .55, accept: button(0), back: button(1) };
      const wasEnabled = this.enabled;
      if (this.previousEnabled !== wasEnabled) this.padBlocked = true;
      if (![0, 1, 2, 3, 4, 5].some(button)) this.padBlocked = false;
      for (const action of ACTIONS) { if (wasEnabled && !this.padBlocked) { input[action] ||= pad[action]; if (pad[action] && !this.padPrevious[action]) this.tap(action); } }
      input.revive ||= pad.revive;
      input.x += axis(0) + Number(button(15)) - Number(button(14));
      input.y += axis(1) + Number(button(13)) - Number(button(12));
      if (pad.pause && !this.padPrevious.pause) this.pause();
      else if (!wasEnabled) for (const action of ['up', 'down', 'left', 'right', 'accept', 'back']) if (pad[action] && !this.padPrevious[action]) { this.wake(); this.onMenu(action); break; }
      this.padPrevious = pad;
      this.previousEnabled = wasEnabled;
    } else this.padPrevious = {};
    input.x = clamp(input.x, -1, 1); input.y = clamp(input.y, -1, 1); input.taps = { ...this.taps };
    if (!this.enabled) { const empty = blankInput(); empty.seq = input.seq; empty.taps = input.taps; return empty; }
    return input;
  }
}
