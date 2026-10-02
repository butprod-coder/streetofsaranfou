import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { FIGHTERS } from '../game/data.js';
import { normalizeProfile, xpForLevel, spendAttribute, applyProfile, completeChapter, TALENTS } from '../game/progression.js';

test('XP levels and all five attribute ranks extend beyond the previous caps', () => {
  let profile = normalizeProfile({ xp: xpForLevel(80) }, 'jo');
  assert.equal(profile.level, 80); assert.equal(profile.statPoints, 158);
  for (const key of Object.keys(profile.attributes)) {
    for (let rank = 0; rank < 25; rank++) profile = spendAttribute(profile, key);
    assert.equal(profile.attributes[key], 25);
  }
  assert.equal(profile.statPoints, 33);
  assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(profile))), profile);
  assert.equal(normalizeProfile({ xp: xpForLevel(81) - 1 }).level, 80);
});

test('attributes improve actual damage, life, movement, strike timing and successful-hit energy', () => {
  const sim = new Simulation(['jo']), p = sim.state.players[0];
  const base = { power: p.power, life: p.maxHp, speed: p.speed };
  sim.startAttack(p, 'kick'); const timing = { ...p.attack }, cooldown = p.cooldown;
  applyProfile(p, { xp: xpForLevel(31), attributes: { strength: 12, endurance: 12, attackSpeed: 12, moveSpeed: 12, specialCharge: 12 } });
  assert.ok(p.power > base.power); assert.ok(p.maxHp > base.life); assert.ok(p.speed > base.speed);
  p.attack = null; p.cooldown = 0; sim.startAttack(p, 'kick');
  assert.ok(p.attack.duration < timing.duration); assert.ok(p.attack.windup < timing.windup); assert.ok(p.cooldown < cooldown);
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], spawnQueue: [], bossCinema: null });
  const enemy = sim.spawnEnemy('remy', { x: p.x + 50, y: p.y, hp: 10000, invincible: 0 });
  p.energy = 0; sim.damage(enemy, 10, p, false, true); assert.equal(p.energy, 19);
  sim.damage(enemy, 10, p, false, false); assert.equal(p.energy, 19);
  p.energy = 95; sim.damage(enemy, 10, p, false, true); assert.equal(p.energy, 100);
});

test('every enemy defeat shares XP once, including ally kills and summons', () => {
  const sim = new Simulation(['jo', 'yanu']);
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], spawnQueue: [], bossCinema: null });
  const p = sim.state.players[0], enemy = sim.spawnEnemy('remy', { invincible: 0 });
  sim.damage(enemy, 9999, { ...p, ally: true }, true);
  assert.deepEqual(sim.state.players.map(p => p.progression.xp), [10, 10]);
  sim.damage(enemy, 9999, p, true);
  assert.equal(p.progression.xp, 10);
  const summon = sim.spawnEnemy('creation', { owner: 999, invincible: 0 });
  sim.damage(summon, 9999, p, true);
  assert.deepEqual(sim.state.players.map(p => p.progression.xp), [15, 15]);
});

test('each hero earns its last talent at level five and old saves retain earned ranks', () => {
  for (const f of FIGHTERS) {
    let p = normalizeProfile({}, f.id); assert.equal(p.points, 1);
    for (let chapter = 0; chapter < 5; chapter++) {
      p = completeChapter(p, chapter); assert.equal(p.points, chapter + 2);
      p = completeChapter(p, chapter); assert.equal(p.points, chapter + 2);
    }
    assert.equal(completeChapter(p, 5).points, 6);
    const talents = TALENTS[f.id].filter(n => n.branchIndex === 0).map(n => n.id);
    const migrated = normalizeProfile({ milestones: ['start', 'boss:1', 'boss:2', 'boss:3', 'boss:4', 'boss:5'], talents }, f.id);
    assert.equal(migrated.talents.length, 6);
  }
  const migrated = normalizeProfile({ xp: xpForLevel(20), attributes: { vitality: 10, endurance: 10, mobility: 8, weapons: 10 } });
  assert.equal(migrated.attributes.endurance, 20); assert.equal(migrated.attributes.moveSpeed, 8); assert.equal(migrated.statPoints, 10);
  assert.deepEqual(normalizeProfile(migrated), migrated);
});
