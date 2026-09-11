import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput, STEP, FLOOR } from '../game/data.js';
import { BALANCE } from '../game/balance.js';
import { surprisePlan } from '../game/street-events.js';
const run = (g, seconds, input = blankInput()) => { for (let n = 0; n < seconds / STEP; n++) g.step([input]); };
function arena(team = ['yanu']) {
  const g = new Simulation(team, 0, 42); g.spawnWave(); g.state.spawnQueue = [];
  g.state.enemies[0].hp = 9999; g.state.enemies[0].cooldown = 999; g.state.enemies[0].speed = 0;
  for (const p of g.state.players) p.invincible = 0;
  return g;
}
function bonus(kind, duo = false) {
  const g = arena(duo ? ['yanu', 'jo'] : ['yanu']); g.state.enemies = [];
  g.state.chapter = kind === 'delivery' ? 1 : 0; g.state.stage = kind === 'ambush' ? 3 : 1;
  assert.ok(g.beginSurprise()); return g;
}
test('dodge starts immediately, requires release, consumes no energy, stays in bounds', () => {
  const g = arena(), p = g.state.players[0], x = p.x, energy = p.energy;
  g.step([{ ...blankInput(), dodge: true, x: -1 }]);
  assert.ok(p.x < x - 5); assert.equal(p.action, 'dodge'); assert.ok(p.energy >= energy);
  run(g, 2, { ...blankInput(), dodge: true }); assert.equal(p.dodgeCd, 0, 'holding cannot repeat');
  g.step([blankInput()]); g.step([{ ...blankInput(), dodge: true, y: -1 }]); assert.ok(p.dodgeCd > 0);
  run(g, .4); assert.ok(p.x >= FLOOR.left && p.y >= FLOOR.top);
});
test('dodge tap counters survive released network input; brief recovery buffers a new press', () => {
  const g = arena(), p = g.state.players[0]; p.dodgeCd = .06;
  g.step([{ ...blankInput(), taps: { dodge: 1 } }]);
  run(g, .1, { ...blankInput(), taps: { dodge: 1 } }); assert.equal(p.action, 'dodge');
  assert.equal(g.state.events.filter(e => e.type === 'dodge').length, 1);
});
test('scenery has damage stages, drops once and can be broken by specials', () => {
  const g = arena(), p = g.state.players[0], crate = g.state.props.find(p => p.kind === 'crate');
  g.hitProp(crate, 1, p); assert.equal(crate.hp, crate.maxHp - 1);
  g.hitProp(crate, 9, p); g.hitProp(crate, 9, p);
  assert.equal(g.state.pickups.length, 1); assert.ok(crate.rubble > 0);
  const bin = g.state.props.find(p => p.kind === 'bin');
  g.hazard(p, { x: bin.x, y: bin.y, delay: 0, ttl: .1, damage: 30 }); run(g, .12);
  assert.equal(bin.hp, bin.maxHp - 2, 'one hit per special hazard');
});
test('barrel blast is delayed, hurts both teams, supports dodge and chain reactions', () => {
  const g = arena(['yanu', 'jo']), [p, safe] = g.state.players, e = g.state.enemies[0];
  const barrel = g.state.props.find(p => p.kind === 'barrel'); p.x = safe.x = e.x = barrel.x; p.y = safe.y = e.y = barrel.y; e.invincible = 0;
  const second = g.makeProp('barrel', barrel.x - 80, barrel.y); g.state.props.push(second);
  const hp = p.hp, enemyHp = e.hp; g.hitProp(barrel, 9, p); run(g, .5);
  assert.equal(p.hp, hp); assert.equal(e.hp, enemyHp);
  safe.invincible = 1; const safeHp = safe.hp; run(g, .4);
  assert.ok(p.hp < hp); assert.ok(e.hp < enemyHp); assert.equal(safe.hp, safeHp); assert.equal(second.hp, 0);
  assert.equal(g.state.hazards.filter(h => h.kind === 'barrelBlast').length, 2);
});
test('all surprise types time out safely and cannot reward or trigger twice', () => {
  for (const kind of ['car', 'delivery', 'ambush']) {
    const g = bonus(kind); for (const p of g.state.players) p.invincible = 999;
    g.state.players[0].x = 1200; g.step(); assert.equal(g.state.phase, 'surprise', 'exit is locked during bonus');
    const frozen = g.state.surprise.warning; g.pause(true); run(g, 3); assert.equal(g.state.surprise.warning, frozen); g.pause(false);
    g.state.players[0].x = 200; run(g, 36); assert.equal(g.state.phase, 'clear', kind);
    assert.equal(g.state.spawnQueue.length, 0); assert.equal(g.state.enemies.length, 0); assert.equal(g.beginSurprise(), false);
    assert.equal(g.state.surprise.status, 'missed');
  }
});
test('bonus success rewards the team once and the next street resets event state', () => {
  for (const kind of ['car', 'delivery', 'ambush']) {
    const g = bonus(kind, true); run(g, 2.3); const points = g.state.players.map(p => p.progression.points);
    if (kind === 'ambush') { g.state.enemies = []; g.state.spawnQueue = []; }
    else for (const p of g.state.props.filter(p => p.bonus)) g.hitProp(p, 999, g.state.players[0]);
    g.step(); assert.equal(g.state.phase, 'clear'); assert.equal(g.state.surprise.status, 'success');
    g.state.players.forEach((p, i) => assert.equal(p.progression.points, points[i]));
    const score = g.state.score; run(g, 1); assert.equal(g.state.score, score);
    g.enterStreet(); assert.equal(g.state.surprise, null); assert.equal(g.state.surpriseDone, false);
  }
});
test('surprise death stays game over, no timeout resurrection; serialized snapshots are complete', () => {
  const g = bonus('ambush'); const p = g.state.players[0]; p.hp = 0; p.lives = 0;
  g.state.surprise.warning = 0; g.state.surprise.remaining = .1; run(g, 3); assert.equal(g.state.phase, 'over');
  const copy = g.snapshot(); assert.deepEqual(copy.surprise, g.state.surprise); assert.ok(copy.props.every(p => Number.isFinite(p.maxHp)));
});
test('surprises are paced twice per chapter, never in the tutorial street or boss arena', () => {
  for (let c = 0; c < 6; c++) { assert.equal(surprisePlan(c, 0), null); assert.equal(surprisePlan(c, 5), null); assert.equal(surprisePlan(c, 3), 'ambush'); }
});
test('car can be punched from its bumper without standing inside the sprite', () => {
  const g = bonus('car'); g.state.surprise.warning = 0;
  const car = g.state.props.find(p => p.kind === 'car'), p = g.state.players[0];
  p.x = car.x - 215; p.y = car.y; p.facing = 1;
  g.startAttack(p, 'punch'); g.resolveAttack(p); assert.equal(car.hp, car.maxHp - 1);
  p.y += 90; g.startAttack(p, 'punch'); g.resolveAttack(p); assert.equal(car.hp, car.maxHp - 1, 'different lane misses');
});
test('simultaneous last-enemy/player KO cannot grant a free bonus resurrection', () => {
  const g = arena(); g.state.stage = 1; g.state.wave = g.state.waves.length - 1;
  g.state.players[0].hp = 0; g.state.players[0].lives = 0; g.state.enemies = [];
  run(g, 3); assert.equal(g.state.phase, 'over'); assert.equal(g.state.surprise, null);
});
