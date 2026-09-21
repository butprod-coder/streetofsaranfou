import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { BALANCE } from '../game/balance.js';
import { STEP } from '../game/data.js';

function arena(duo = false) {
  const sim = new Simulation(duo ? ['jo', 'yanu'] : ['jo'], 0, 42);
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], hazards: [], spawnQueue: [] });
  const p = sim.state.players[0]; Object.assign(p, { x: 620, y: 550, invincible: 0 });
  const e = sim.spawnEnemy('karonux', { boss: true, x: 700, y: 550, hp: 640, maxHp: 640, power: 20, bossPhase: 1, cooldown: 0, invincible: 0, attackCount: 0, healUses: 0 });
  return { sim, p, e };
}
const run = (sim, seconds) => { for (let i = 0; i < Math.ceil(seconds / STEP); i++) sim.step(); };

test('Golf destruction begins protected exit and restores the correctly scaled boss', () => {
  for (const duo of [false, true]) {
    const { sim, p, e } = arena(duo); e.vehicle = true; e.hp = 1;
    sim.damage(e, 50, p, true);
    assert.equal(e.vehicle, false); assert.equal(sim.state.bossCinema.kind, 'exit');
    assert.equal(e.hp, Math.round(BALANCE.bosses.karonux.hp * (duo ? 1.6 : 1)));
    const hp = e.hp; sim.damage(e, 999, p, true); assert.equal(e.hp, hp);
    run(sim, 2.8); assert.equal(sim.state.bossCinema, null); assert.equal(e.attackCount, 0);
  }
});
test('collapse is delayed, dodgeable, hits on landing and exposes sleep without healing', () => {
  for (const dodging of [false, true]) {
    const { sim, p, e } = arena(); e.attackCount = 2; e.hp = 500;
    sim.updateKaronux(e, STEP); assert.equal(e.pattern.kind, 'sleep');
    p.x = e.x + e.facing * 65;
    const hp = p.hp; sim.updateKaronux(e, .5); sim.updateWorld(STEP); assert.equal(p.hp, hp);
    if (dodging) p.invincible = 2;
    sim.updateKaronux(e, .7); sim.updateWorld(STEP);
    assert.equal(p.hp < hp, !dodging); assert.equal(e.hp, 500);
    sim.damage(e, 20, p, false); assert.equal(e.hp, 475); assert.equal(e.pattern.kind, 'sleep');
  }
});
test('cigarette heals progressively, is capped and a hit cancels future healing', () => {
  const { sim, p, e } = arena(); e.attackCount = 4; e.hp = 400;
  sim.updateKaronux(e, STEP); assert.equal(e.pattern.kind, 'smoke');
  sim.updateKaronux(e, 1.2); assert.equal(e.hp, 406);
  sim.damage(e, 10, p, false); assert.equal(e.pattern, null);
  const hp = e.hp; sim.updateKaronux(e, .3); assert.equal(e.hp, hp);
  e.cooldown = 0; e.stun = 0; e.attackCount = 4; e.healUses = 3;
  sim.updateKaronux(e, STEP); assert.equal(e.pattern.kind, 'combo');
});
test('sustained hits break boss guard; spaced hits do not; opening is bounded', () => {
  const { sim, p, e } = arena();
  for (let i = 0; i < 4; i++) { sim.state.time += 1.5; sim.damage(e, 1, p, false); }
  assert.equal(e.guardHits, 1); assert.ok(!(e.recovering > 0));
  for (let i = 0; i < 4; i++) { sim.state.time += .2; sim.damage(e, 1, p, false); }
  assert.equal(e.recovering, 1.6); assert.equal(e.guardHits, 0);
  sim.damage(e, 1, p, true); assert.equal(e.recovering, 1.6);
});
test('combo approaches continuously, rush hits each player once and death clears owned hazards', () => {
  const { sim, p, e } = arena(true); e.attackCount = 1; p.x = 200;
  const x = e.x; sim.updateKaronux(e, STEP); assert.ok(Math.abs(e.x - x) < 6); assert.equal(e.pattern, undefined);
  e.pattern = { kind: 'rush', elapsed: 0, windup: .1, active: .8, charge: true, dx: 0, dy: 0, speed: 500, hits: [] };
  p.x = e.x; sim.updateKaronux(e, .2); const hp = p.hp; assert.ok(hp < p.maxHp);
  p.invincible = 0; sim.updateKaronux(e, .2); assert.equal(p.hp, hp);
  sim.hazard(e, { delay: 1 }); sim.damage(e, 10000, p, true); assert.equal(sim.state.hazards.some(h => h.owner === e.id), false);
  assert.doesNotThrow(() => JSON.stringify(sim.snapshot()));
});
