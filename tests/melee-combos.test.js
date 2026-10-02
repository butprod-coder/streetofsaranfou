import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput, STEP } from '../game/data.js';
import { MELEE_COMBOS, COMBO_RULES } from '../game/melee-combos.js';

function arena() {
  const g = new Simulation(['karonux', 'yanu'], 0, 22); g.state.phase = 'fight'; g.state.enemies = []; g.state.props = []; g.state.spawnQueue = [];
  const p = g.state.players[0]; Object.assign(p, { x: 450, y: 550, invincible: 0, energy: 0 });
  g.state.players[1].x = 100;
  const e = g.spawnEnemy('remy', { x: 540, y: 550, hp: 100000, maxHp: 100000, speed: 0, cooldown: 999, invincible: 0 });
  return { g, p, e };
}
function frame(f, input = blankInput(), follow = f.follow !== false) { if (follow) { f.e.x = f.p.x + 90 * f.p.facing; f.e.y = f.p.y; } f.g.step([input, blankInput()]); }
function move(f, token) {
  if (token === 'J') { frame(f, { ...blankInput(), jump: true }); frame(f); return; }
  const action = token.endsWith('K') ? 'kick' : 'punch', direction = token.startsWith('→') ? f.p.facing : token.startsWith('←') ? -f.p.facing : 0;
  frame(f, { ...blankInput(), [action]: true, x: direction });
  const attack = f.p.attack; assert.ok(attack, `Attack starts for ${token}`);
  for (let i = 0; (f.p.attack || f.p.cooldown > 0) && i < 90; i++) frame(f);
  return attack;
}
test('all six combos are reachable with real press/release inputs and bounded finisher bonuses', () => {
  for (const combo of MELEE_COMBOS) {
    const f = arena(); let last;
    for (const token of combo.steps) last = move(f, token);
    assert.equal(last.chain?.finisher, combo.id, combo.name);
    assert.ok(last.chain.multiplier <= COMBO_RULES.maxMultiplier);
    assert.ok(f.g.state.events.some(e => e.type === 'comboFinish' && e.label === combo.name));
    assert.equal(f.g.state.players[1].meleeChain, null);
  }
});
test('damage bonus applies to normal damage and updated character power', () => {
  const f = arena(); f.p.power = 40;
  for (const token of ['P', 'P', 'P', 'P', 'K']) move(f, token);
  const before = f.e.hp, attack = move(f, 'K');
  assert.ok(Math.abs(attack.chain.multiplier - 1.5) < .0001); assert.equal(before - f.e.hp, Math.round(40 * 1.5 * 1.5));
});
test('all chains connect through natural recoil without repositioning the target', () => {
  for (const combo of MELEE_COMBOS) {
    const f = arena(); f.follow = false; let last;
    for (const token of combo.steps) last = move(f, token);
    assert.equal(last.chain?.finisher, combo.id); assert.ok(f.g.state.events.some(e => e.type === 'comboFinish' && e.label === combo.name), `${combo.name}: distance ${f.e.x - f.p.x}`);
  }
});
test('buffered taps during an attack execute once, while holding punch keeps the simple combo', () => {
  const f = arena(); frame(f, { ...blankInput(), punch: true }); frame(f);
  frame(f, { ...blankInput(), punch: true }); frame(f);
  for (let i = 0; i < 25; i++) frame(f);
  assert.deepEqual(f.p.meleeChain?.steps, ['P', 'P']);
  const held = arena(); for (let i = 0; i < 100; i++) frame(held, { ...blankInput(), punch: true });
  assert.ok(held.e.hp < held.e.maxHp); assert.equal(held.g.state.events.some(e => e.type === 'comboFinish'), false);
});
test('misses, timeout, dodge, special and received hits interrupt the chain', () => {
  for (const reason of ['miss', 'timeout', 'dodge', 'special', 'hurt']) {
    const f = arena(); move(f, 'P');
    if (reason === 'miss') { f.e.x = 1100; f.g.step([{ ...blankInput(), kick: true }]); for (let i = 0; i < 35; i++) frame(f, blankInput(), false); }
    if (reason === 'timeout') for (let i = 0; i < 60; i++) frame(f);
    if (reason === 'dodge') frame(f, { ...blankInput(), dodge: true });
    if (reason === 'special') frame(f, { ...blankInput(), special: true });
    if (reason === 'hurt') f.g.damage(f.p, 10, f.e, true);
    assert.equal(f.p.meleeChain, null, reason);
  }
});
test('finishers deal only strikes: no launch, air movement, charge or collision damage', () => {
  for (const combo of MELEE_COMBOS) {
    const f = arena(), playerX = f.p.x;
    const other = f.g.spawnEnemy('remy', { x: 1100, y: 650, hp: 1000, maxHp: 1000, speed: 0, cooldown: 999, invincible: 0 });
    for (const token of combo.steps) move(f, token);
    assert.equal(f.e.comboLaunch, undefined); assert.equal(f.e.z, 0); assert.equal(f.e.vz, 0); assert.equal(f.p.x, playerX); assert.equal(other.hp, 1000);
    assert.ok(Math.abs(f.e.vx) <= 70);
  }
});
test('chain and input buffer serialize, pause freezes them and a street transition clears them', () => {
  const f = arena(); move(f, 'P'); const snapshot = f.g.snapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)).players[0].meleeChain, f.p.meleeChain);
  const copy = structuredClone(f.p.meleeChain); f.g.pause(true); for (let i = 0; i < 100; i++) frame(f); assert.deepEqual(f.p.meleeChain, copy);
  f.g.pause(false); f.g.enterStreet(); assert.equal(f.p.meleeChain, null); assert.equal(f.p.comboQueued, null);
});
