import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { STREET_ACTION, trafficStreet } from '../game/street-action.js';

function arena() {
  const g = new Simulation(['karonux', 'yanu'], 0, 42);
  g.state.stage = 2; g.enterStreet(); g.spawnWave(); g.state.spawnQueue = [];
  for (const p of g.state.players) { p.invincible = 0; p.x = 400; p.y = 600; }
  const enemy = g.state.enemies[0]; enemy.hp = 500; enemy.invincible = 0; enemy.x = 750; enemy.y = 600;
  g.state.props = [g.makeProp('bin', 500, 600, { hp: 4, maxHp: 4, vx: 0 })];
  return g;
}
test('a kicked bin hits the first enemy, stops, loses durability and never hurts a partner', () => {
  const g = arena(), s = g.state, p = s.players[0], bin = s.props.find(p => p.kind === 'bin');
  bin.x = 500; bin.y = 600; p.facing = 1;
  s.players[1].x = 530; const hp = s.players[1].hp, enemyHp = s.enemies[0].hp;
  const other = { ...s.enemies[0], id: 999, x: 850 }; s.enemies.push(other);
  assert.ok(g.launchBin(bin, p));
  for (let i = 0; i < 60; i++) g.updateStreetAction(1 / 60);
  assert.equal(s.enemies[0].hp, enemyHp - STREET_ACTION.binDamage);
  assert.equal(other.hp, enemyHp); assert.equal(s.players[1].hp, hp); assert.equal(bin.vx, 0); assert.equal(bin.hp, 3);
  assert.equal(g.launchBin({ ...bin, hp: 0 }, p), false);
});
test('a normal kick launches a bin; punches damage it and destruction cannot duplicate rewards', () => {
  const g = arena(), p = g.state.players[0], bin = g.state.props.find(p => p.kind === 'bin');
  bin.x = p.x + 90; bin.y = p.y; p.facing = 1;
  p.attack = { type: 'kick', heavy: true }; g.resolveAttack(p);
  assert.ok(bin.vx > 0); assert.equal(bin.hp, 4);
  g.hitProp(bin, 4, p); const score = g.state.score; g.hitProp(bin, 4, p); assert.equal(g.state.score, score);
});
test('traffic gives a full warning, hits both teams once and respects lane, jump and dodge', () => {
  const g = arena(), s = g.state; assert.ok(g.startTraffic());
  const car = s.traffic; for (const a of [...s.players, ...s.enemies]) { a.x = 500; a.y = car.y; }
  const hp = s.players[0].hp, enemyHp = s.enemies[0].hp;
  g.updateStreetAction(1); assert.equal(car.x, -190); assert.equal(s.players[0].hp, hp);
  g.updateStreetAction(1); assert.equal(car.x, -190);
  car.x = 390; s.players[1].z = 80;
  g.updateStreetAction(.15); assert.ok(s.players[0].hp < hp); assert.equal(s.players[1].hp, s.players[1].maxHp); assert.ok(s.enemies[0].hp < enemyHp);
  const after = s.enemies[0].hp; car.x = 470; g.updateStreetAction(.02); assert.equal(s.enemies[0].hp, after);
  s.players[1].z = 0; s.players[1].action = 'dodge'; car.x = 470; g.updateStreetAction(.02); assert.equal(s.players[1].hp, s.players[1].maxHp);
  s.players[1].action = 'idle'; s.players[1].y = car.y - 90; car.x = 470; g.updateStreetAction(.02); assert.equal(s.players[1].hp, s.players[1].maxHp);
});
test('traffic is bounded, stops outside combat, resets per street and round-trips through snapshots', () => {
  const g = arena(); assert.ok(trafficStreet(g.state)); g.startTraffic();
  const snapshot = JSON.parse(JSON.stringify(g.snapshot())); assert.deepEqual(snapshot.traffic, g.state.traffic);
  g.state.phase = 'rest'; g.updateStreetAction(.1); assert.equal(g.state.traffic, null);
  g.state.phase = 'fight'; g.startTraffic(); g.state.traffic = null; assert.equal(g.startTraffic(), false);
  g.enterStreet(); assert.equal(g.state.trafficCount, 0); assert.equal(g.state.traffic, null);
  for (const chapter of [1, 2, 5, 6]) assert.equal(trafficStreet({ chapter, stage: 2 }), false);
  assert.equal(trafficStreet({ chapter: 0, stage: 5 }), false);
});
test('heavy and finishing impacts carry directional feedback without changing boss protections', () => {
  const g = arena(), e = g.state.enemies[0], p = g.state.players[0];
  p.attack = { type: 'kick', heavy: true };
  g.damage(e, 10, p, true); assert.ok(e.vx >= 390);
  let hit = g.state.events.findLast(e => e.type === 'hit'); assert.equal(hit.heavy, true); assert.equal(hit.facing, 1);
  g.damage(e, 9999, p, true); hit = g.state.events.findLast(e => e.type === 'hit'); assert.equal(hit.finishing, true);
});
