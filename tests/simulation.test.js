import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput, neutralInput, sanitizeInput, STEP, FLOOR } from '../game/data.js';

const input = values => ({ ...blankInput(), ...values });
function arena(characters = ['karonux']) {
  const game = new Simulation(characters, 0, 123);
  game.spawnWave(); game.state.props = [];
  while (game.state.spawnQueue.length) game.spawnEnemy(game.state.spawnQueue.shift());
  for (const enemy of game.state.enemies) { enemy.x = 1100; enemy.y = 620; enemy.cooldown = 100; enemy.speed = 0; enemy.invincible = 0; }
  for (const p of game.state.players) p.invincible = 0;
  return game;
}
const run = (game, seconds, inputs = []) => { for (let i = 0; i < Math.round(seconds / STEP); i++) game.step(inputs); };

test('inputs reject non-finite values, normalize limits and never accept truthy strings', () => {
  const safe = sanitizeInput({ x: Infinity, y: -999, punch: 'true', kick: true, seq: 1e100, taps: { punch: NaN } });
  assert.equal(safe.x, 0); assert.equal(safe.y, -1); assert.equal(safe.punch, false); assert.equal(safe.kick, true); assert.equal(safe.seq, 0); assert.equal(safe.taps.punch, 0);
});
test('movement is fixed-step, diagonal-normalized, and clamped to the street', () => {
  const a = arena(), b = arena();
  const startX = a.state.players[0].x;
  run(a, .25, [input({ x: 1 })]); run(b, .25, [input({ x: 1, y: 1 })]);
  assert.ok(a.state.players[0].x - startX > b.state.players[0].x - startX);
  run(a, 8, [input({ x: 1, y: 1 })]);
  assert.equal(a.state.players[0].x, FLOOR.right); assert.equal(a.state.players[0].y, FLOOR.bottom);
});
test('punch resolves after its wind-up, only once, and only in the correct lane', () => {
  const game = arena(), p = game.state.players[0], [a, b] = game.state.enemies;
  a.x = p.x + 70; a.y = p.y; b.x = p.x + 75; b.y = p.y + 90;
  const aHp = a.hp, bHp = b.hp;
  game.step([input({ punch: true })]); assert.equal(a.hp, aHp);
  run(game, .13); assert.ok(a.hp < aHp); assert.equal(b.hp, bHp);
  const hpAfter = a.hp; run(game, .3); assert.equal(a.hp, hpAfter);
});
test('short button taps received between network snapshots are not lost', () => {
  const game = arena(); game.step([input({ taps: { punch: 1 } })]);
  assert.equal(game.state.players[0].action, 'punch');
});
test('neutralizing a stale network input never replays old special-button presses', () => {
  const game = arena(), pressed = input({ special: true, taps: { special: 1 } });
  game.step([pressed]); run(game, 1, [neutralInput(pressed)]);
  const before = game.state.players[0].energy;
  game.step([input({ taps: { special: 1 } })]);
  assert.ok(game.state.players[0].energy >= before); assert.equal(game.state.players[0].attack, null);
});
test('special consumes energy, grants protection and cannot fire when empty', () => {
  const game = arena(), p = game.state.players[0];
  game.step([input({ special: true })]); assert.ok(p.energy >= 50 && p.energy < 51); assert.ok(p.invincible > .5);
  p.energy = 0; p.attack = null; p.cooldown = 0;
  game.step([input({ special: true })]); assert.equal(p.attack, null);
});
test('dodge and airborne attacks avoid telegraphed enemy damage', () => {
  const game = arena(), p = game.state.players[0], e = game.state.enemies[0];
  e.x = p.x + 65; e.y = p.y; e.facing = -1;
  const hp = p.hp;
  game.step([input({ dodge: true })]); game.startAttack(e, 'punch'); game.resolveAttack(e); assert.equal(p.hp, hp);
  p.invincible = 0; p.z = 50; game.resolveAttack(e); assert.equal(p.hp, hp);
  p.z = 0; game.resolveAttack(e); assert.ok(p.hp < hp);
});
test('two players can revive a teammate without spending a spare life', () => {
  const game = arena(['karonux', 'yanu']), [a, b] = game.state.players;
  b.hp = 0; b.x = a.x + 40; b.y = a.y; const lives = b.lives;
  run(game, 1.85, [input({ revive: true }), blankInput()]);
  assert.ok(b.hp > 0); assert.equal(b.lives, lives); assert.ok(b.invincible > 0);
});
test('solo death uses a spare life; exhausting spares ends the run', () => {
  const game = arena(), p = game.state.players[0]; p.hp = 0;
  run(game, 2.2); assert.ok(p.hp > 0); assert.equal(p.lives, 1);
  p.lives = 0; p.hp = 0; run(game, 2.2); assert.equal(game.state.phase, 'over');
});
test('shared pause freezes the whole simulation', () => {
  const game = arena(['jo', 'jualos']); game.pause(true);
  const before = game.snapshot(); run(game, 3, [input({ x: 1, punch: true }), input({ x: -1 })]);
  assert.deepEqual(game.snapshot(), before);
});
test('cleared streets require both players at the exit; final chapter can be won', () => {
  const game = arena(['jo', 'jualos']); game.state.enemies = [];
  game.state.wave = game.state.waves.length - 1;
  game.step(); assert.equal(game.state.phase, 'clear');
  game.state.players[0].x = 1200; game.step(); assert.equal(game.state.phase, 'clear');
  game.state.players[1].x = 1200; game.step(); assert.equal(game.state.phase, 'transition');
  run(game, .7); assert.equal(game.state.stage, 1); assert.equal(game.state.phase, 'intro');
  game.state.chapter = 5; game.state.stage = 5; game.state.phase = 'clear'; game.state.enemies = [];
  for (const p of game.state.players) p.x = 1200;
  run(game, 1); assert.equal(game.state.phase, 'won');
});
test('same seed and inputs produce identical solo and server game state', () => {
  const a = new Simulation(['yanu', 'gustavax'], 2, 42), b = new Simulation(['yanu', 'gustavax'], 2, 42);
  for (let i = 0; i < 2000; i++) { const inputs = [input({ x: Math.sin(i / 130), punch: i % 4 === 0, special: i % 180 === 0 }), input({ y: Math.sin(i / 75), kick: true })]; a.step(inputs); b.step(inputs); }
  assert.deepEqual(a.snapshot(), b.snapshot());
});
