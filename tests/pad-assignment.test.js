import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../game/input.js';

const pad = (index, id = 'Xbox Controller (STANDARD GAMEPAD)') => ({ index, id, connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) });
function setup(t, list) {
  const state = { list };
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => state.list });
  t.after(() => { delete navigator.getGamepads; });
  const input = Object.assign(Object.create(Input.prototype), { keys: new Set(), touch: {}, stick: { x: 0, y: 0 }, taps: {}, seq: 0, padPrevious: {}, enabled: false });
  return { state, input };
}

test('audio/HID devices never take a player slot', t => {
  const { input } = setup(t, [pad(0, 'Jabra Evolve2 65 (Vendor: 0b0e)'), pad(1), pad(2)]);
  input.sample();
  assert.deepEqual(input.padSlots, [1, 2]);
});

test('two identical pads on sparse indices keep their own slot', t => {
  const { input } = setup(t, [pad(0), null, null, pad(3)]);
  input.sample();
  assert.deepEqual(input.padSlots, [0, 3]);
  input.sample(1);
  assert.deepEqual(input.padSlots, [0, 3]);
});

test('a Bluetooth pad that comes back on another index keeps its slot, in a menu and in a run', t => {
  for (const enabled of [false, true]) {
    const { state, input } = setup(t, [pad(0, 'Pad A'), pad(1, 'Pad B')]);
    input.sample(); input.enabled = enabled;
    state.list = [null, pad(1, 'Pad B')];
    input.sample();
    assert.equal(input.padConnected(0), false);
    assert.equal(input.padConnected(1), true);
    state.list = [null, pad(1, 'Pad B'), pad(2, 'Pad A')];
    input.sample();
    assert.deepEqual(input.padSlots, [2, 1]);
    assert.equal(input.padConnected(0) && input.padConnected(1), true);
  }
});

test('outside a run a vanished pad frees its slot for another pad', t => {
  const { state, input } = setup(t, [pad(0, 'Pad A'), pad(1, 'Pad B')]);
  input.sample();
  state.list = [null, pad(1, 'Pad B'), pad(2, 'Pad C')];
  input.sample();
  assert.deepEqual(input.padSlots, [2, 1]);
});

test('during a run a vanished pad keeps its slot reserved', t => {
  const { state, input } = setup(t, [pad(0, 'Pad A'), pad(1, 'Pad B')]);
  input.sample(); input.enabled = true;
  state.list = [null, pad(1, 'Pad B'), pad(2, 'Pad C')];
  input.sample();
  assert.equal(input.padConnected(0), false);
  assert.deepEqual(input.padSlots, [0, 1]);
});
