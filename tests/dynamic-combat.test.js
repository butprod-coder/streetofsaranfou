import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { STEP, blankInput } from '../game/data.js';
import { ENCOUNTER_ROSTER, randomEnemyKinds, wavePlan } from '../game/encounters.js';

function arena() {
  const g = new Simulation(['karonux', 'jo'], 0, 42); g.spawnWave(); g.state.enemies = []; g.state.spawnQueue = []; g.state.props = []; g.state.pickups = []; g.state.practice = { invulnerable: false };
  for (const [i, p] of g.state.players.entries()) { p.x = 250 + i * 65; p.y = 540; p.invincible = 0; }
  return g;
}
function enemy(g, kind, x, y = 540) { const e = g.spawnEnemy(kind, { x, y, invincible: 0, cooldown: 0, facing: -1 }); e.hp = e.maxHp = 300; return e; }
function run(g, seconds) { for (let i = 0; i < seconds / STEP; i++) g.step([blankInput(), blankInput()]); }

test('shield blocks front strikes, opens at the back, and area explosions bypass it', () => {
  for (const facing of [-1, 1]) {
    const g = arena(), p = g.state.players[0], e = enemy(g, 'shieldGuard', 500); e.facing = facing;
    p.x = e.x + facing * 60; g.damage(e, 20, p, true); assert.equal(e.hp, 300);
    p.x = e.x - facing * 60; g.damage(e, 20, p, true); assert.equal(e.hp, 280);
    e.stun = 0; e.recovering = 0; p.x = e.x + facing * 60; g.damage(e, 20, { ...p, areaDamage: true }, true); assert.equal(e.hp, 260);
  }
});
test('kamikaze gives a full warning, can be interrupted, and does not explode on defeat', () => {
  const g = arena(), p = g.state.players[0], e = enemy(g, 'kamikaze', p.x + 100);
  g.updateDynamicEnemy(e, STEP); assert.ok(e.pattern); const hp = p.hp;
  for (let i = 0; i < 60; i++) g.updateDynamicEnemy(e, STEP); assert.equal(p.hp, hp); assert.equal(g.state.hazards.length, 0);
  g.damage(e, 10, p, false); assert.equal(e.pattern, null); assert.equal(g.state.hazards.length, 0);
  g.damage(e, 9999, p, true); run(g, 2); assert.equal(p.hp, hp); assert.equal(g.state.events.filter(e => e.type === 'weaponExplosion').length, 0);
});
test('kamikaze detonates once after its tell, damaging surroundings and consuming itself', () => {
  const g = arena(), p = g.state.players[0], e = enemy(g, 'kamikaze', p.x + 100); e.speed = 0;
  const prop = g.makeProp('fuelDrum', e.x + 70, e.y, { hp: 3, maxHp: 3 }); g.state.props = [prop];
  g.updateDynamicEnemy(e, STEP); for (let i = 0; i < 90; i++) g.updateDynamicEnemy(e, STEP);
  assert.equal(e.hp, 0); assert.equal(g.state.hazards.length, 1); g.updateWorld(STEP); assert.ok(p.hp < p.maxHp); assert.equal(prop.hp, 0);
  assert.equal(g.state.hazards.find(h => h.x === prop.x && h.delay > 0).enemy, false, 'Environmental chains survive the end of their triggering enemy');
  assert.equal(g.state.events.filter(e => e.type === 'weaponExplosion').length, 1);
});
test('shooter locks its firing lane during warning, allowing either player to sidestep', () => {
  const g = arena(), p = g.state.players[0], other = g.state.players[1], e = enemy(g, 'laneShooter', 850);
  g.updateDynamicEnemy(e, STEP); assert.equal(e.pattern.targetY, 540); const hp = p.hp, friendHp = other.hp;
  p.y = 620; for (let i = 0; i < 75; i++) g.updateDynamicEnemy(e, STEP); g.updateWorld(STEP);
  assert.equal(p.hp, hp); assert.ok(other.hp < friendHp);
});
test('fuel drums chain after a delay, electrical cabinets stun, and hydrants push', () => {
  const g = arena(), p = g.state.players[0]; p.x = 80;
  const e = enemy(g, 'triso', 785); e.cooldown = 999; e.speed = 0;
  const first = g.makeProp('fuelDrum', 500, 540), second = g.makeProp('fuelDrum', 640, 540), box = g.makeProp('electricBox', 785, 540);
  g.state.props = [first, second, box]; g.hitProp(first, 3, p); assert.equal(second.hp, 3); run(g, .3); assert.equal(second.hp, 3); run(g, 1.2); assert.equal(second.hp, 0); assert.equal(box.hp, 0);
  run(g, .7); assert.ok(e.stun > .7); assert.ok(e.electrifiedUntil > g.state.time);
  g.state.hazards = []; const hydrant = g.makeProp('hydrant', 500, 540); g.state.props = [hydrant]; e.x = 650; e.y = 540; e.invincible = 0; e.stun = 0;
  g.hitProp(hydrant, 3, p); for (let i = 0; i < 45; i++) g.updateWorld(STEP); assert.ok(e.vx > 400);
});
test('new dangers and enemy warnings freeze on pause and snapshots continue deterministically', () => {
  const g = arena(), p = g.state.players[0], e = enemy(g, 'laneShooter', 850); g.updateDynamicEnemy(e, STEP); g.hitProp(g.makeProp('fuelDrum', 650, 540), 3, p);
  g.pause(true); const before = g.snapshot(); run(g, 2); assert.deepEqual(g.snapshot(), before); g.pause(false);
  const copy = arena(); copy.state = g.snapshot(); copy.seed = g.seed; copy.nextId = g.nextId; run(g, .8); run(copy, .8); assert.deepEqual(g.snapshot(), copy.snapshot());
});
test('full pool includes all new rivals, remains fair and keeps scripted bosses separate', () => {
  const g = arena(), bag = [], kinds = randomEnemyKinds(0, ENCOUNTER_ROSTER.length * 2, () => g.random(), bag);
  for (const kind of ENCOUNTER_ROSTER) assert.equal(kinds.filter(k => k === kind).length, 2);
  for (const kind of ['shieldGuard', 'kamikaze', 'laneShooter']) assert.ok(ENCOUNTER_ROSTER.includes(kind));
  for (let c = 0; c < 6; c++) { const waves = wavePlan(c, 5); assert.equal(waves.at(-1).boss, true); assert.deepEqual(waves.at(-1).kinds, []); }
});
