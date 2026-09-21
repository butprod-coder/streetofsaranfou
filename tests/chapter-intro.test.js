import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { hasChapterIntro, INTRO_DURATION, INTRO_REVEAL } from '../game/chapter-intro.js';

test('opening freezes combat, supports guest advance, and does not repeat on later streets', () => {
  const sim = new Simulation(['jo', 'yanu'], 0, 42);
  assert.ok(hasChapterIntro(sim.state));
  const x = sim.state.players[0].x;
  for (let i = 0; i < 60; i++) sim.step([{ x: 1 }]);
  assert.equal(sim.state.players[0].x, x);
  assert.equal(sim.state.enemies.length, 0);
  sim.step([{}, { taps: { jump: 1 } }]);
  assert.ok(sim.state.phaseTime <= INTRO_DURATION - INTRO_REVEAL);
  for (let i = 0; i < 30; i++) sim.step([{}, { taps: { jump: 1 } }]);
  assert.equal(sim.state.phase, 'intro', 'held input does not skip twice');
  sim.step([{}, { taps: { jump: 2 } }]);
  assert.equal(sim.state.phase, 'fight');
  sim.state.stage = 1; sim.enterStreet();
  assert.equal(hasChapterIntro(sim.state), false);
  assert.equal(sim.state.phaseTime, 1.15);
});

test('opening finishes automatically and respects pause; other chapters keep their short intro', () => {
  const sim = new Simulation(['jo'], 0, 42);
  sim.pause(true); sim.step(); assert.equal(sim.state.phaseTime, INTRO_DURATION);
  sim.pause(false);
  for (let i = 0; i < 850; i++) sim.step();
  assert.equal(sim.state.phase, 'fight');
  const kikor = new Simulation(['jo'], 1, 42);
  assert.ok(hasChapterIntro(kikor.state));
  assert.equal(kikor.state.phaseTime, INTRO_DURATION);
  const yanu = new Simulation(['jo'], 2, 42);
  assert.ok(hasChapterIntro(yanu.state));
  assert.equal(yanu.state.phaseTime, INTRO_DURATION);
  const next = new Simulation(['jo'], 3, 42);
  assert.equal(hasChapterIntro(next.state), false);
  assert.equal(next.state.phaseTime, 2.4);
});
