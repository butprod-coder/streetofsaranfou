import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput, STEP } from '../game/data.js';
import { WEAPONS } from '../game/weapons.js';

function arena(kind, facing = 1) {
  const g = new Simulation(['karonux', 'jo'], 0, 42); g.spawnWave(); g.state.spawnQueue = []; g.state.enemies = []; g.state.props = []; g.state.pickups = [];
  const [p, friend] = g.state.players; p.x = 640; p.y = friend.y = 540; p.facing = facing; friend.x = p.x + facing * 130;
  for (const distance of [130, 210]) { g.spawnEnemy('triso', { x: p.x + facing * distance, y: 540 }); const e = g.state.enemies.at(-1); e.hp = e.maxHp = 1000; e.invincible = 0; e.speed = 0; e.cooldown = 999; }
  p.weapon = { kind, uses: 2 }; return { g, p, friend };
}
const run = (g, n) => { for (let i = 0; i < n; i++) g.step([blankInput(), blankInput()]); };

test('heavy weapons damage groups in both directions, preserve friendly HP and consume one round', () => {
  for (const kind of ['bazooka', 'grenade', 'flamethrower']) for (const facing of [-1, 1]) {
    const { g, p, friend } = arena(kind, facing), hp = friend.hp;
    g.startWeaponAttack(p); g.resolveWeaponAttack(p); assert.equal(p.weapon.uses, 1); assert.ok(g.state.enemies.every(e => e.hp === 1000));
    run(g, 70); assert.ok(g.state.enemies.every(e => e.hp < 1000), kind); assert.equal(friend.hp, hp); assert.equal(g.state.weaponProjectiles.length, 0);
  }
});
test('grenades arc, pause freezes the fuse, and street changes discard all projectiles', () => {
  const { g, p } = arena('grenade'); g.startWeaponAttack(p); g.resolveWeaponAttack(p); run(g, 10);
  assert.ok(g.state.weaponProjectiles[0].z > 80); const before = JSON.stringify(g.state.weaponProjectiles); g.pause(true); run(g, 90); assert.equal(JSON.stringify(g.state.weaponProjectiles), before);
  g.pause(false); const copy = new Simulation(['karonux', 'jo'], 0, 42); copy.state = g.snapshot(); copy.nextId = g.nextId; copy.seed = g.seed;
  run(g, 50); run(copy, 50); assert.deepEqual(g.snapshot(), copy.snapshot());
  g.state.weaponProjectiles.push({ kind: 'rocket' }); g.enterStreet(); assert.deepEqual(g.state.weaponProjectiles, []);
});
test('flames respect facing, lane and range, while rockets hit scenery before enemies', () => {
  const { g, p } = arena('flamethrower'); const enemies = g.state.enemies; enemies[0].x = p.x - 130; enemies[1].y += 100;
  g.startWeaponAttack(p); g.resolveWeaponAttack(p); run(g, 40); assert.ok(enemies.every(e => e.hp === 1000));
  const r = arena('bazooka'); r.g.state.props = [{ id: 800, kind: 'bin', x: 710, y: 540, hp: 3, maxHp: 3 }]; r.g.state.enemies.forEach(e => e.x = 1050);
  r.g.startWeaponAttack(r.p); r.g.resolveWeaponAttack(r.p); run(r.g, 20); assert.equal(r.g.state.props[0].hp, 0); assert.ok(r.g.state.enemies.every(e => e.hp === 1000));
});
test('new weapons appear in campaign pickup rotation', () => {
  const g = new Simulation(['karonux'], 0, 42), found = new Set();
  for (let chapter = 0; chapter < 6; chapter++) for (const stage of [0, 2, 4]) { g.state.chapter = chapter; g.state.stage = stage; for (const item of g.streetWeapons()) { found.add(item.weapon); assert.equal(item.uses, WEAPONS[item.weapon].uses); } }
  for (const kind of ['bazooka', 'flamethrower', 'grenade']) assert.ok(found.has(kind));
});
