import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { BALANCE } from '../game/balance.js';
import { blankInput, FLOOR, STEP } from '../game/data.js';
import { applyProfile } from '../game/progression.js';
const run = (g, seconds, input = blankInput()) => { for (let i = 0; i < seconds / STEP; i++) g.step([input]); };
function arena(kind) {
  const g = new Simulation([kind]); g.spawnWave(); g.state.props = []; g.state.spawnQueue = [];
  const p = g.state.players[0], e = g.state.enemies[0];
  p.invincible = 0; e.hp = e.maxHp = 10000; e.speed = 0; e.cooldown = 999; e.invincible = 0; e.x = p.x + 100; e.y = p.y;
  return { g, p, e };
}
test('wrestler grants exactly 30 percent once, preserves health ratio and restores all stats', () => {
  const { g, p } = arena('gustavax'); p.hp = 77.5;
  const base = { hp: p.hp, maxHp: p.maxHp, power: p.power, specialPower: p.specialPower, speed: p.speed, defense: p.bonuses.defense };
  for (let i = 0; i < 5; i++) {
    g.activateSpecial(p);
    assert.equal(p.maxHp, Math.round(base.maxHp * 1.3)); assert.equal(p.hp / p.maxHp, .5);
    assert.equal(p.power, base.power * 1.3); assert.equal(p.specialPower, base.specialPower * 1.3); assert.equal(p.speed, base.speed * 1.3);
    assert.ok(Math.abs(p.bonuses.defense - .3) < 1e-9);
    applyProfile(p, p.progression); assert.equal(p.power, base.power * 1.3, 'Safe menu refresh cannot stack the buff');
    g.updateSpecial(p, blankInput(), 6.1);
    assert.equal(p.maxHp, base.maxHp); assert.equal(p.hp, base.hp); assert.equal(p.power, base.power); assert.equal(p.specialPower, base.specialPower); assert.equal(p.speed, base.speed); assert.equal(p.bonuses.defense, base.defense);
  }
});
test('wrestler damage, death and street changes never leave a permanent buff or resurrect', () => {
  const { g, p, e } = arena('gustavax'); g.activateSpecial(p); g.damage(p, 20, e, false); assert.equal(p.maxHp - p.hp, 14);
  const ratio = p.hp / p.maxHp; g.enterStreet(); assert.equal(p.maxHp, 155); assert.equal(p.hp / p.maxHp, ratio); assert.equal(p.specialState, null);
  g.activateSpecial(p); g.damage(p, 9999, e, false); assert.equal(p.hp, 0); assert.equal(p.maxHp, 155); assert.equal(p.power, 21);
  g.revivePlayer(p, .5); assert.equal(p.hp, Math.round(155 * .5)); assert.equal(p.specialState, null);
});
test('Karonux drives the white Golf once before sleeping, retaining his talent benefits', () => {
  const { g, p, e } = arena('karonux'); applyProfile(p, { completed: [0, 1, 2], talents: ['matelas', 'micro-sieste', 'reveil'] }); p.hp = 50;
  const start = p.x; g.activateSpecial(p); run(g, .2); assert.equal(e.hp, 10000);
  run(g, .7); assert.ok(e.hp < 10000); assert.ok(p.x > start + 250); assert.equal(p.hp, 50);
  run(g, .4); assert.equal(p.facing, -1); assert.equal(p.action, 'special');
  run(g, .6); assert.equal(p.x, start); assert.equal(p.action, 'sleep'); assert.equal(p.hp, 80);
  const hp = e.hp; run(g, .3); assert.equal(e.hp, hp);
  assert.equal(g.state.events.filter(e => e.type === 'golf').length, 1); assert.ok(!g.state.events.some(e => e.type === 'thunder'));
  run(g, 1); assert.equal(p.specialState, null);
});

test('Golf is bounded near both walls and each opponent can be hit at most once per pass', () => {
  for (const start of [FLOOR.left, FLOOR.right]) {
    const { g, p, e } = arena('karonux'); p.x = start; p.facing = start === FLOOR.left ? -1 : 1;
    e.x = start === FLOOR.left ? 380 : 900;
    g.activateSpecial(p);
    const hits = new Set();
    for (let i = 0; i < 230; i++) {
      g.step(); assert.ok(p.x >= FLOOR.left && p.x <= FLOOR.right);
      for (const event of g.state.events) if (event.type === 'hit' && event.actor === e.id) hits.add(event.id);
    }
    assert.ok(hits.size >= 1 && hits.size <= 2); assert.equal(p.specialState, null);
  }
});

test('Kikor paints ahead, summons from the easel, holds attack poses and cleans up', () => {
  const { g, p, e } = arena('kikor'); g.activateSpecial(p); run(g, .3);
  const easel = g.state.props.find(q => q.kind === 'easel'); assert.ok(easel.x > p.x); assert.equal(g.state.allies.length, 0);
  run(g, .4); const ally = g.state.allies[0]; assert.equal(ally.x, easel.x); assert.ok(ally.emerging > 0);
  e.x = ally.x + 35; e.y = ally.y; run(g, .3); assert.equal(ally.action, 'punch');
  run(g, .08); assert.equal(ally.action, 'punch'); assert.ok(e.hp < 10000);
  g.hazard(p, { x: easel.x, y: easel.y, radius: 150, delay: 0, ttl: .2, damage: 30 }); g.updateWorld(STEP); assert.equal(easel.hp, 3);
  run(g, 12); assert.equal(g.state.allies.length, 0); assert.equal(easel.hp, 0);
});
test('Jo tornado follows normalized player input, stops when released and remains in bounds', () => {
  const { g, p } = arena('jo'); g.activateSpecial(p); const x = p.x, y = p.y;
  run(g, .2); assert.equal(p.x, x); assert.equal(p.y, y);
  run(g, .2, { ...blankInput(), x: 1 }); assert.ok(p.x > x + 50);
  const right = p.x; run(g, .2, { ...blankInput(), x: -1 }); assert.ok(p.x < right - 50);
  const stopped = p.x; run(g, .2); assert.equal(p.x, stopped);
  p.x = FLOOR.right - 1; run(g, .2, { ...blankInput(), x: 1, y: -1 }); assert.equal(p.x, FLOOR.right); assert.ok(p.y < y);
});
test('Lorenzo throws five distinct delayed blasts, leaves finite fire and never hurts teammates', () => {
  const { g, p, e } = arena('lorenzo'); g.activateSpecial(p); run(g, .25);
  const fires = g.state.hazards.filter(h => h.kind === 'fire'); assert.equal(fires.length, 5); assert.equal(new Set(fires.map(h => `${h.x}:${h.y}`)).size, 5);
  e.x = fires[0].x; e.y = fires[0].y; p.x = e.x; p.y = e.y; const hp = p.hp;
  run(g, .35); assert.equal(e.hp, 10000); run(g, .25); assert.ok(e.hp < 10000); assert.equal(p.hp, hp);
  run(g, .5); assert.equal(g.state.events.filter(e => e.type === 'ember').length, 5);
  run(g, 4.5); assert.equal(g.state.hazards.filter(h => h.kind === 'fire').length, 0);
});
test('Triso locks his target before spitting; puddles can be jumped and expire', () => {
  const { g, p } = arena('jo'); g.state.enemies = [];
  const triso = g.spawnEnemy('triso', { x: p.x + 250, y: p.y, cooldown: 0, invincible: 0 });
  g.step(); assert.equal(triso.attack.type, 'special'); const target = { ...triso.spitTarget }; p.x += 120;
  run(g, 1.1); const puddle = g.state.hazards.find(h => h.kind === 'slime'); assert.ok(puddle); assert.equal(puddle.x, target.x); assert.equal(puddle.y, target.y);
  triso.cooldown = 999; p.x = puddle.x; p.y = puddle.y; p.z = 100; p.vz = 0; const hp = p.hp;
  puddle.delay = 0; g.updateWorld(STEP); assert.equal(p.hp, hp); p.z = 0; p.invincible = 0; g.updateWorld(STEP); assert.ok(p.hp < hp);
  p.invincible = 999; run(g, 5); assert.ok(!g.state.hazards.some(h => h.kind === 'slime'));
});
