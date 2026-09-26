import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossPractice } from '../game/boss-practice.js';
import { blankInput, STEP } from '../game/data.js';
import { applyProfile } from '../game/progression.js';

function arena(phase = 0) {
  const sim = createBossPractice({ chapter: 3, phase, invulnerable: false, freeSpecial: false });
  const e = sim.state.enemies[0], p = sim.state.players[0];
  Object.assign(e, { x: 850, y: 550, cooldown: 0 }); Object.assign(p, { x: 500, y: 550, invincible: 0 });
  return { sim, e, p };
}
function land(sim, e) {
  sim.beginLorenzoSofa(e);
  for (let i = 0; i < 150; i++) sim.updateLorenzo(e, STEP);
  assert.ok(e.sofa.landed);
}

test('fire expands as a hollow ring, hitting the perimeter once and sparing its interior', () => {
  for (const position of ['inside', 'edge', 'outside', 'jump']) {
    const { sim, e, p } = arena();
    const h = sim.hazard(e, { kind: 'lorenzoRing', shape: 'ring', x: 500, y: 550, radius: 100, maxRadius: 700, growth: 185, thickness: 16, delay: 0, ttl: 4, pulse: 99, damage: 24 });
    p.x = position === 'inside' ? 500 : position === 'outside' ? 800 : 601;
    if (position === 'jump') p.z = 60;
    const hp = p.hp; sim.updateWorld(STEP); assert.ok(h.radius > 100);
    assert.equal(p.hp < hp, position === 'edge', position);
    const after = p.hp; p.invincible = 0; sim.updateWorld(STEP); assert.equal(p.hp, after);
  }
});

test('a well-timed jump clears the growing edge, while grounded player takes damage', () => {
  for (const jump of [false, true]) {
    const { sim, e, p } = arena(); e.cooldown = 99;
    sim.hazard(e, { kind: 'lorenzoRing', shape: 'ring', x: p.x - 100, y: p.y, radius: 16, maxRadius: 700, growth: 185, thickness: 16, delay: 0, ttl: 4, pulse: 99, damage: 24 });
    const hp = p.hp;
    for (let i = 0; i < 60; i++) sim.step([{ ...blankInput(), jump: jump && i === 10 }]);
    assert.equal(p.hp < hp, !jump);
  }
});

test('lethal phase-one blow starts sofa delivery instead of skipping the second phase', () => {
  const { sim, e, p } = arena(); sim.damage(e, 99999, p, true);
  assert.equal(e.hp, e.maxHp * .6); assert.equal(e.bossPhase, 2); assert.ok(e.sofa); assert.equal(e.enraged, false);
  const hp = e.sofa.hp; sim.damage(e, 99999, p, true); assert.equal(e.sofa.hp, hp, 'delivery cannot be skipped');
  land(sim, e); assert.equal(sim.state.enemies.filter(a => a.lorenzoMinion).length, 2);
});

test('sofa absorbs hits, heavy attacks break it faster, then rage is permanent', () => {
  const { sim, e, p } = arena(); e.hp = e.maxHp * .6; land(sim, e);
  const hp = e.hp, sofaHp = e.sofa.hp;
  sim.damage(e, 10, p, false); assert.equal(e.sofa.hp, sofaHp - 3); assert.equal(e.hp, hp);
  sim.damage(e, 10, p, true); assert.equal(e.sofa.hp, sofaHp - 19); assert.equal(e.hp, hp);
  sim.damage(e, 999, p, true); assert.equal(e.sofa.hp, 0); assert.equal(e.bossPhase, 3); assert.equal(e.enraged, true);
  const count = sim.state.enemies.length; sim.beginLorenzoSofa(e); assert.equal(sim.state.enemies.length, count);
  e.hp = e.maxHp; sim.updateLorenzo(e, STEP); assert.equal(e.bossPhase, 3);
  sim.damage(e, 10, p, true); assert.ok(e.hp < e.maxHp);
});

test('reinforcements have a finite budget and boss death removes all owned dangers and minions', () => {
  const { sim, e, p } = arena(); land(sim, e);
  for (const a of sim.state.enemies) if (a.lorenzoMinion) a.hp = 0;
  e.sofa.elapsed = 11; sim.updateLorenzo(e, STEP);
  assert.equal(sim.state.enemies.filter(a => a.lorenzoMinion).length, 3);
  for (const a of sim.state.enemies) if (a.lorenzoMinion) a.hp = 0;
  for (let i = 0; i < 10; i++) sim.lorenzoReinforcements(e);
  assert.equal(sim.state.enemies.filter(a => a.lorenzoMinion).length, 3);
  sim.breakLorenzoSofa(e); sim.lorenzoRing(e, { targetX: p.x, targetY: p.y });
  sim.damage(e, 99999, p, true);
  assert.ok(sim.state.enemies.filter(a => a.owner === e.id).every(a => a.hp === 0));
  assert.ok(!sim.state.hazards.some(h => h.owner === e.id));
});

test('enraged phase throws two spaced rings and all three phases can be practiced', () => {
  const { sim, e } = arena(3); assert.equal(e.enraged, true); sim.updateLorenzo(e, STEP);
  assert.equal(e.pattern.kind, 'lorenzoCigarette');
  for (let i = 0; i < 180; i++) sim.updateLorenzo(e, STEP);
  assert.equal(sim.state.hazards.filter(h => h.kind === 'lorenzoRing').length, 2);
  assert.ok(arena(2).e.sofa); assert.ok(!arena(1).e.sofa);
});

test('co-op sofa scales, pause freezes the wave and snapshots serialize the encounter', () => {
  const { sim, e } = arena(); const partner = sim.makePlayer('jo', 1); applyProfile(partner, {}, false); sim.state.players.push(partner);
  land(sim, e); assert.equal(e.sofa.maxHp, 540); assert.equal(sim.state.enemies.filter(a => a.lorenzoMinion).length, 3);
  sim.lorenzoRing(e, { targetX: 500, targetY: 550 }); sim.pause(true);
  const before = sim.snapshot(); sim.step(); assert.deepEqual(sim.snapshot(), before);
  assert.equal(JSON.parse(JSON.stringify(before)).enemies[0].sofa.maxHp, 540);
});

