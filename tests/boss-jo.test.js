import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossPractice } from '../game/boss-practice.js';
import { JO_PALLET_LANES } from '../game/boss-jo.js';
import { blankInput, STEP, FLOOR } from '../game/data.js';
import { applyProfile } from '../game/progression.js';

function arena(phase = 1) {
  const sim = createBossPractice({ chapter: 4, phase, invulnerable: false, freeSpecial: false });
  const e = sim.state.enemies[0], p = sim.state.players[0];
  Object.assign(e, { x: 1050, y: 550, cooldown: 0 }); Object.assign(p, { x: 250, y: 550, invincible: 0 });
  return { sim, e, p };
}
function channel(sim, e) { e.pattern = null; e.cooldown = 0; e.attackCount = 3; sim.updateJo(e, STEP); assert.equal(e.pattern.kind, 'joChannel'); }

test('stretching punch covers 930 pixels, locks its lane and respects dodge and jumping', () => {
  for (const defense of ['none', 'lane', 'jump', 'dodge', 'range']) {
    const { sim, e, p } = arena(); sim.updateJo(e, STEP); assert.equal(e.pattern.kind, 'joStretch');
    if (defense === 'lane') p.y += 70;
    if (defense === 'jump') p.z = 60;
    if (defense === 'dodge') p.invincible = .3;
    if (defense === 'range') p.x = FLOOR.left;
    const hp = p.hp; sim.updateJo(e, e.pattern.windup); sim.updateWorld(STEP);
    assert.equal(p.hp < hp, defense === 'none', defense);
    const after = p.hp; sim.updateWorld(STEP); assert.equal(p.hp, after);
  }
});

test('channel is invincible to all damage and cannot be broken or grabbed; recovery is vulnerable', () => {
  const { sim, e, p } = arena(); channel(sim, e); const hp = e.hp;
  p.x = e.x - 20; p.y = e.y;
  for (let i = 0; i < 6; i++) { sim.damage(e, 999, p, true); sim.bossComboHit(e, true); }
  assert.equal(e.hp, hp); assert.equal(e.pattern.kind, 'joChannel'); assert.equal(sim.tryGrab(p), false);
  sim.hazard(p, { x: e.x, y: e.y, radius: 200, delay: 0, ttl: .1, damage: 100 }); sim.updateWorld(STEP); assert.equal(e.hp, hp);
  for (let i = 0; i < 410; i++) sim.updateJo(e, STEP);
  assert.equal(sim.joChanneling(e), false); assert.ok(e.recovering >= 2);
  sim.damage(e, 10, p, false); assert.ok(e.hp < hp);
});

test('channel summons exactly 20 then 30 destroyable yellow pallet jacks, with a stable safe lane', () => {
  for (const phase of [1, 2]) {
    const { sim, e } = arena(phase); channel(sim, e); const safe = e.pattern.safeLane;
    for (let i = 0; i < 410; i++) sim.updateJo(e, STEP);
    const pallets = sim.state.enemies.filter(a => a.joPallet);
    assert.equal(pallets.length, phase === 1 ? 20 : 30);
    assert.ok(pallets.every(a => a.lane !== safe && a.owner === e.id && a.maxHp === 26));
    assert.ok(pallets.every(a => a.hp === 0), 'no cart remains after the punish window starts');
  }
});

test('pallet warnings are harmless, swept collision hits once, lane change and jump are safe', () => {
  for (const defense of ['none', 'warning', 'jump', 'lane', 'dodge']) {
    const { sim, e, p } = arena(); channel(sim, e); sim.spawnJoPalletWave(e, e.pattern);
    const a = sim.state.enemies.find(x => x.joPallet); a.x = p.x - 70; a.y = p.y;
    if (defense !== 'warning') a.delay = 0;
    if (defense === 'jump') p.z = 60;
    if (defense === 'lane') p.y += 54;
    if (defense === 'dodge') p.invincible = .3;
    const hp = p.hp; sim.updateJoPallet(a, .03); assert.equal(p.hp < hp, defense === 'none', defense);
    if (defense === 'none') p.invincible = 0;
    const after = p.hp; sim.updateJoPallet(a, STEP); assert.equal(p.hp, after);
  }
});

test('ordinary attacks destroy pallets without food or score farming, and grabs cannot move them', () => {
  const { sim, e, p } = arena(); channel(sim, e); sim.spawnJoPalletWave(e, e.pattern);
  const a = sim.state.enemies.find(x => x.joPallet); a.x = p.x + 35; a.y = p.y; a.delay = 0;
  const score = sim.state.score, pickups = sim.state.pickups.length;
  assert.equal(sim.tryGrab(p), false); sim.damage(a, 20, p, false); assert.equal(a.hp, 6);
  sim.damage(a, 20, p, false); assert.equal(a.hp, 0); assert.equal(sim.state.score, score); assert.equal(sim.state.pickups.length, pickups);
  const hp = p.hp; sim.updateJoPallet(a, .2); assert.equal(p.hp, hp);
});

test('pallets leave the floor without clamping, stay in their lane and disappear with their owner', () => {
  const { sim, e } = arena(); channel(sim, e); sim.spawnJoPalletWave(e, e.pattern);
  const a = sim.state.enemies.find(x => x.joPallet), y = a.y; a.delay = 0;
  for (let i = 0; i < 240; i++) { sim.updateJoPallet(a, STEP); sim.physics(a, STEP); sim.separateEnemies(STEP); }
  assert.equal(a.hp, 0); assert.equal(a.y, y);
  sim.spawnJoPalletWave(e, e.pattern); const b = sim.state.enemies.filter(x => x.joPallet).at(-1);
  e.hp = 0; sim.updateJoPallet(b, STEP); assert.equal(b.hp, 0);
});

test('normal kick resolution breaks a pallet before it can run the player over', () => {
  const { sim, e, p } = arena(); channel(sim, e); sim.spawnJoPalletWave(e, e.pattern);
  const a = sim.state.enemies.find(x => x.joPallet); a.x = p.x + 90; a.y = p.y;
  sim.startAttack(p, 'kick');
  for (let i = 0; i < 30; i++) sim.tickActor(p, STEP);
  assert.equal(a.hp, 0); assert.ok(sim.state.events.some(x => x.type === 'break'));
});

test('phase two has two long punches, monotonic phase and direct channel practice', () => {
  const { sim, e } = arena(2); sim.updateJo(e, STEP); assert.equal(e.pattern.kind, 'joChannel');
  e.pattern = null; e.signatureReady = false; e.attackCount = 0; e.cooldown = 0; sim.updateJo(e, STEP);
  for (let i = 0; i < 110; i++) sim.updateJo(e, STEP);
  assert.equal(sim.state.hazards.filter(h => h.kind === 'joArm').length, 2);
  e.hp = e.maxHp; sim.updateJo(e, STEP); assert.equal(e.bossPhase, 2);
});

test('co-op, pause and serialization preserve channels and a player can survive in the free lane', () => {
  const { sim, e, p } = arena(); const partner = sim.makePlayer('yanu', 1); applyProfile(partner, {}, false); sim.state.players.push(partner);
  channel(sim, e); p.y = partner.y = JO_PALLET_LANES[e.pattern.safeLane];
  const hp = [p.hp, partner.hp];
  sim.spawnJoPalletWave(e, e.pattern); assert.ok(sim.state.enemies.filter(a => a.joPallet).every(a => a.maxHp === 36));
  sim.pause(true); const before = sim.snapshot(); sim.step(); assert.deepEqual(sim.snapshot(), before);
  assert.equal(JSON.parse(JSON.stringify(before)).enemies[0].pattern.kind, 'joChannel'); sim.pause(false);
  for (let i = 0; i < 405; i++) sim.step([blankInput(), blankInput()]);
  assert.deepEqual([p.hp, partner.hp], hp); assert.ok(!sim.state.enemies.some(a => a.joPallet && a.hp > 0));
});
