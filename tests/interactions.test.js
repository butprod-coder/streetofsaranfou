import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { FIGHTERS, blankInput, STEP, FLOOR, sanitizeInput } from '../game/data.js';
import { WEAPONS } from '../game/weapons.js';
import { THEME_DECOR, streetDecor } from '../game/scenery.js';
import { validateLayouts, validateDecor, layoutFor, saveLayouts, readLayouts } from '../game/level-layouts.js';

function arena(team = ['karonux']) {
  const g = new Simulation(team, 0, 42); g.spawnWave(); g.state.spawnQueue = []; g.state.enemies = []; g.state.props = []; g.state.pickups = [];
  const p = g.state.players[0]; p.x = 650; p.y = 540; p.facing = 1; p.invincible = 0;
  g.spawnEnemy('triso', { x: 695, y: 540 }); const e = g.state.enemies[0]; e.invincible = 0; e.cooldown = 999; e.hp = e.maxHp = 500; e.speed = 0;
  return { g, p, e };
}
const run = (g, seconds, input = blankInput()) => { for (let i = 0; i < Math.ceil(seconds / STEP); i++) g.step([input]); };

test('all seven heroes grab then throw backwards, damaging only once at landing', () => {
  for (const f of FIGHTERS) {
    const { g, p, e } = arena([f.id]), hp = e.hp;
    g.step([blankInput()]); assert.equal(e.grabbedBy, p.id, f.id);
    run(g, .2); g.step([{ ...blankInput(), punch: true, x: -1 }]); run(g, .32);
    assert.ok(e.thrown, f.id); assert.equal(e.hp, hp, 'damage waits for landing');
    run(g, 1); assert.ok(e.x < p.x - 180); assert.ok(e.hp < hp); assert.equal(e.grabbedBy, null); assert.equal(p.grapple, null); assert.equal(e.thrown, null);
    const landedHp = e.hp; run(g, .2); assert.equal(e.hp, landedHp);
  }
});
test('held input does not retrigger a grab; stale taps and pause are safe', () => {
  const { g, p, e } = arena();
  const input = sanitizeInput({ grab: false, taps: { grab: 1 } }); g.step([input]); assert.ok(p.grapple);
  run(g, .3, input); assert.equal(p.grapple.throwing, false);
  const time = p.grapple.elapsed; g.pause(true); run(g, 2); assert.equal(p.grapple.elapsed, time); g.pause(false);
  run(g, 2.3, input); assert.equal(p.grapple, null); assert.ok(e.x > p.x);
});
test('damage, street change and KO release grapples without orphan enemies', () => {
  for (const mode of ['damage', 'street', 'death']) {
    const { g, p, e } = arena(); assert.ok(g.tryGrab(p));
    if (mode === 'street') g.enterStreet(); else g.damage(p, mode === 'death' ? 9999 : 1, e, true);
    assert.equal(p.grapple, null); assert.equal(e.grabbedBy, null); assert.equal(e.z, 0);
  }
});
test('one enemy cannot be grabbed by both players; boss requires an opening; air and lanes reject grabs', () => {
  const { g, p, e } = arena(['karonux', 'jo']), other = g.state.players[1]; other.x = p.x; other.y = p.y;
  e.boss = true; e.recovering = 0; assert.equal(g.tryGrab(p), false); p.grabCd = 0;
  e.recovering = 2; assert.ok(g.tryGrab(p)); assert.equal(g.tryGrab(other), false); g.releaseGrab(p); p.grabCd = 0;
  e.boss = false; e.y += 80; assert.equal(g.tryGrab(p), false); p.grabCd = 0; e.y = p.y; p.z = 20; assert.equal(g.tryGrab(p), false);
});
test('throws stay within both borders and can knock down a second opponent', () => {
  for (const [x, facing] of [[80, 1], [1200, -1]]) {
    const { g, p, e } = arena(); p.x = x; p.facing = facing; e.x = x + facing * 45;
    assert.ok(g.tryGrab(p)); g.step([{ ...blankInput(), punch: true, x: -p.facing }]); run(g, 1.4); assert.ok(e.x >= FLOOR.left && e.x <= FLOOR.right); assert.equal(e.thrown, null);
  }
  const { g, p, e } = arena(); g.spawnEnemy('triso', { x: 230, y: 540 }); const second = g.state.enemies[1]; second.hp = 500; second.invincible = 0; second.speed = 0; second.cooldown = 999;
  assert.ok(g.tryGrab(p)); g.step([{ ...blankInput(), punch: true, x: -p.facing }]); run(g, 1.4); assert.ok(second.hp < 500); assert.ok(e.hp < 500);
});
test('each weapon is picked up explicitly, used once per attack, and exhausted safely', () => {
  for (const [kind, b] of Object.entries(WEAPONS)) {
    const { g, p, e } = arena(); e.x = p.x + 100; g.state.pickups = [{ id: 800, kind: 'weapon', weapon: kind, uses: 1, x: p.x, y: p.y }];
    g.collectPickups(); assert.equal(g.state.pickups.length, 1, 'weapons are not energy drinks');
    g.step([{ ...blankInput(), interact: true }]); assert.equal(p.weapon.kind, kind); assert.equal(p.interaction.kind, 'pickup');
    run(g, .5); const hp = e.hp; g.step([{ ...blankInput(), punch: true }]); assert.equal(e.hp, hp);
    run(g, b.duration + .1); assert.ok(e.hp < hp, kind); assert.equal(p.weapon, null); const after = e.hp; run(g, .3); assert.equal(e.hp, after);
  }
});
test('weapon swap preserves uses; no double pickup in duo; death drops the held weapon', () => {
  const { g, p } = arena(['karonux', 'jo']), other = g.state.players[1]; other.x = p.x; other.y = p.y;
  p.weapon = { kind: 'bat', uses: 3 }; g.state.pickups = [{ id: 800, kind: 'weapon', weapon: 'pistol', uses: 6, x: p.x, y: p.y }];
  assert.ok(g.pickWeapon(p)); assert.equal(p.weapon.kind, 'pistol'); assert.equal(g.state.pickups[0].uses, 3);
  assert.ok(g.pickWeapon(other)); assert.equal(other.weapon.kind, 'bat'); assert.equal(g.state.pickups.length, 0);
  g.damage(p, 9999, g.state.enemies[0], true); assert.equal(p.weapon, null); assert.equal(g.state.pickups[0].weapon, 'pistol'); assert.equal(g.state.pickups[0].uses, 6);
});
test('gun lanes, facing, range and friendlies are respected', () => {
  const { g, p, e } = arena(['karonux', 'jo']), other = g.state.players[1]; other.x = 800; other.y = p.y;
  p.weapon = { kind: 'pistol', uses: 8 }; const hp = e.hp, friendHp = other.hp;
  for (const [x, y] of [[p.x - 90, p.y], [p.x + 90, p.y + 80], [p.x + 750, p.y]]) { e.x = x; e.y = y; g.startWeaponAttack(p); g.resolveWeaponAttack(p); assert.equal(e.hp, hp); }
  e.x = 950; e.y = p.y; g.startWeaponAttack(p); g.resolveWeaponAttack(p); assert.ok(e.hp < hp); assert.equal(other.hp, friendHp);
});
test('36 streets have rare breakables; six theme atlases contain twelve unique props each', () => {
  const keys = THEME_DECOR.flat().map(d => d.key); assert.equal(new Set(keys).size, 72);
  for (let chapter = 0; chapter < 6; chapter++) {
    const g = new Simulation(['karonux'], chapter, 42); let count = 0, drops = 0;
    for (let stage = 0; stage < 6; stage++) { g.state.stage = stage; g.enterStreet(); count += g.state.props.length; drops += g.state.props.filter(p => p.drop).length; assert.ok(streetDecor(chapter, stage).length >= 3); }
    assert.equal(count, 4); assert.equal(drops, 3);
  }
});
test('edited layouts round trip, preserve deliberately empty streets and reject hostile data', () => {
  let value; const storage = { setItem: (k, v) => { value = v; }, getItem: () => value };
  const data = { version: 1, streets: { '0:0': [], '2:4': [{ key: THEME_DECOR[2][6].key, x: 612, y: 559, height: 88, facing: -1 }] } };
  saveLayouts(data, storage); assert.deepEqual(readLayouts(storage).streets['0:0'], []); assert.equal(layoutFor(0, 0, readLayouts(storage)).length, 0);
  assert.equal(readLayouts(storage).streets['2:4'][0].facing, -1); assert.ok(layoutFor(1, 0, data).length);
  assert.throws(() => validateLayouts({ version: 1, streets: { '9:9': [] } }));
  assert.throws(() => validateDecor([{ key: '__proto__', x: 0, y: 0, height: 30 }]));
  assert.throws(() => validateDecor([{ key: keysForTest(), x: NaN, y: 0, height: 30 }]));
});
function keysForTest() { return THEME_DECOR[0][0].key; }

test('automatic contact requires punch and opposite direction to throw', () => {
  for (const facing of [-1, 1]) {
    const { g, p, e } = arena(); e.x = p.x + facing * 45;
    g.step([blankInput()]); assert.ok(p.grapple);
    for (const input of [{ punch: true }, { x: -facing }, { punch: true, x: facing }, { grab: true }]) {
      g.step([{ ...blankInput(), ...input }]); assert.equal(p.grapple.throwing, false);
    }
    g.step([{ ...blankInput(), punch: true, x: -facing }]); assert.equal(p.grapple.throwing, true);
  }
});

test('heavy enemies fall in place and crush the holder only once', () => {
  const { g, p, e } = arena(); e.kind = 'elephant';
  const hp = p.hp, enemyHp = e.hp;
  g.step([blankInput()]); g.step([{ ...blankInput(), punch: true, x: -1 }]);
  run(g, .3); assert.ok(e.thrown.heavy); const landingX = e.thrown.fromX;
  run(g, .8); assert.equal(e.x, landingX); assert.equal(e.hp, enemyHp); assert.ok(p.hp < hp);
  const after = p.hp; run(g, .2); assert.equal(p.hp, after);
});

test('shotgun recoil moves the shooter backwards and stays inside street bounds', () => {
  for (const facing of [-1, 1]) {
    const { g, p, e } = arena(); e.x = 1100; e.y = 620; p.facing = facing;
    p.weapon = { kind: 'shotgun', uses: 2 }; const x = p.x;
    g.startWeaponAttack(p); run(g, .4);
    assert.ok((p.x - x) * facing < -15); assert.equal(p.weapon.uses, 1);
    const shot = g.state.events.find(e => e.type === 'gunshot'); assert.equal(shot.facing, facing); assert.ok(shot.range > 0);
    p.x = facing > 0 ? FLOOR.left : FLOOR.right; p.cooldown = 0; p.attack = null;
    g.startWeaponAttack(p); run(g, .4); assert.ok(p.x >= FLOOR.left && p.x <= FLOOR.right);
  }
});
