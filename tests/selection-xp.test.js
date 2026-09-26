import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { normalizeProfile, xpForLevel } from '../game/progression.js';
test('combat XP is halved, shared equally and awarded only once', () => {
  const sim = new Simulation(['jo', 'jualos']);
  sim.awardXP(120, 'wave:test'); sim.awardXP(120, 'wave:test');
  sim.awardXP(20, 'enemy:test'); sim.awardXP(100, 'objective:test');
  for (const p of sim.state.players) { assert.equal(p.progression.xp, 120); assert.equal(p.progression.level, 1); }
  sim.awardXP(130, 'next');
  for (const p of sim.state.players) { assert.equal(p.progression.level, 2); assert.equal(p.progression.statPoints, 2); assert.equal(p.progression.points, 1); }
});
test('existing earned levels and spent attributes remain intact', () => {
  const p = normalizeProfile({ xp: xpForLevel(6), attributes: { endurance: 10 } });
  assert.equal(p.level, 6); assert.equal(p.attributes.endurance, 10);
});
