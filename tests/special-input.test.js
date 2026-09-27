import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../game/input.js';
import { Simulation } from '../game/simulation.js';
import { STEP } from '../game/data.js';
import { TALENTS, applyProfile } from '../game/progression.js';

function arena(kind, talent) {
  const sim = new Simulation([kind]); sim.spawnWave();
  sim.state.enemies = []; sim.state.props = []; sim.state.spawnQueue = [];
  const p = sim.state.players[0];
  applyProfile(p, { talents: [talent.id] }); p.energy = 100;
  return { sim, p };
}

test('DualSense standard Circle activates each unlocked transformation at full energy', t => {
  const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
  t.after(() => { delete navigator.getGamepads; });
  for (const [kind, talents] of Object.entries(TALENTS)) for (const talent of talents.filter(n => n.tier === 0)) {
    const { sim, p } = arena(kind, talent);
    const input = Object.assign(Object.create(Input.prototype), { keys: new Set(), touch: {}, stick: { x: 0, y: 0 }, taps: {}, seq: 0, padPrevious: {}, enabled: true });
    pad.buttons[1].pressed = false; input.sample();
    pad.buttons[1].pressed = true; const pressed = input.sample();
    assert.equal(pressed.special, true);
    sim.updatePlayer(p, pressed, STEP);
    assert.ok(p.specialState, `${kind}: ${talent.name}`);
    assert.equal(p.energy, 0);
  }
});

