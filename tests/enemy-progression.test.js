import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { ENCOUNTER_ROSTER, STARTING_ENEMIES, streetEnemyRoster } from '../game/encounters.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';

test('each street adds one persistent random rival, including across chapters', () => {
  const sim = new Simulation(['jo'], 0, 123);
  assert.deepEqual(new Set(sim.state.waves.flatMap(w => w.kinds)), new Set(STARTING_ENEMIES));
  const order = [...sim.state.enemyOrder];
  assert.notDeepEqual(order, new Simulation(['jo'], 0, 456).state.enemyOrder);
  for (let street = 1; street < 36; street++) {
    const s = sim.state;
    s.chapter = Math.floor(street / 6); s.stage = street % 6;
    sim.enterStreet();
    const roster = streetEnemyRoster(s.chapter, s.stage, order);
    assert.equal(roster.length, Math.min(3 + street, ENCOUNTER_ROSTER.length));
    assert.ok(s.waves.flatMap(w => w.kinds).every(k => roster.includes(k)));
    if (street <= order.length) assert.equal(s.waves[0].kinds[0], order[street - 1]);
    if (s.stage === 3) {
      sim.beginSurprise();
      assert.ok(s.spawnQueue.every(k => roster.includes(k)));
    }
    assert.deepEqual(s.enemyOrder, order);
  }
});

test('saving preserves unlock order, street waves and the next street', () => {
  const sim = new Simulation(['jo'], 0, 321);
  sim.state.stage = 3; sim.enterStreet();
  const restored = restoreCheckpoint(JSON.parse(JSON.stringify(checkpoint(sim.snapshot()))));
  assert.deepEqual(restored.state.enemyOrder, sim.state.enemyOrder);
  assert.deepEqual(restored.state.waves, sim.state.waves);
  for (const run of [sim, restored]) { run.state.stage++; run.enterStreet(); }
  assert.deepEqual(restored.state.waves, sim.state.waves);
});
