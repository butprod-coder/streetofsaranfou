import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossPractice } from '../game/boss-practice.js';
import { CHAPTERS } from '../game/data.js';
import { BALANCE } from '../game/balance.js';
import { checkpoint, recordRun } from '../game/run-save.js';

test('every boss and phase starts directly in its arena without waves or props', () => {
  for (let chapter = 0; chapter < CHAPTERS.length; chapter++) for (let phase = 0; phase <= BALANCE.bosses[CHAPTERS[chapter].boss].phases.length + 1; phase++) {
    const sim = createBossPractice({ chapter, phase }); const s = sim.state, boss = s.enemies[0];
    assert.equal(s.stage, chapter===6?6:5); assert.equal(s.phase, 'fight'); assert.equal(s.enemies.length, 1);
    assert.equal(boss.kind, CHAPTERS[chapter].boss); assert.equal(s.spawnQueue.length, 0); assert.equal(s.props.length, 0);
    assert.equal(s.bossCinema, null); assert.equal(boss.vehicle, chapter === 0 && phase === 0);
    if (phase) assert.equal(boss.bossPhase, phase);
  }
});
test('practice options control damage, energy and intro; replay resets boss state', () => {
  const sim = createBossPractice({ phase: 1 }), p = sim.state.players[0], boss = sim.state.enemies[0];
  sim.damage(p, 25, boss, true); assert.equal(p.hp, p.maxHp);
  p.energy = 1; p.specialCd = 5; sim.step(); assert.equal(p.energy, 100); assert.equal(p.specialCd, 0);
  boss.hp = 12; const replay = createBossPractice(sim.state.practice); assert.equal(replay.state.enemies[0].hp, 640);
  const regular = createBossPractice({ invulnerable: false, freeSpecial: false });
  regular.damage(regular.state.players[0], 25, regular.state.enemies[0], true); assert.ok(regular.state.players[0].hp < regular.state.players[0].maxHp);
  assert.ok(createBossPractice({ cinema: true }).state.bossCinema);
});
test('victory ends the test without chapter completion or persisted records', () => {
  const sim = createBossPractice({ phase: 1 }); sim.damage(sim.state.enemies[0], 9999, sim.state.players[0], true); sim.step();
  assert.equal(sim.state.phase, 'won'); assert.deepEqual(sim.state.players[0].progression.completed, []);
  assert.equal(checkpoint(sim.state), null);
  recordRun(sim.state, 0, { getItem() { throw Error('must not read records'); }, setItem() { throw Error('must not write records'); } });
});
