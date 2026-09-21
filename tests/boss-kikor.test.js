import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossPractice } from '../game/boss-practice.js';
import { blankInput } from '../game/data.js';

function arena() {
  const sim = createBossPractice({ chapter: 1, invulnerable: false, freeSpecial: false });
  const e = sim.state.enemies[0], p = sim.state.players[0];
  Object.assign(p, { x: 700, y: 550, invincible: 0 }); Object.assign(e, { x: 800, y: 550, cooldown: 0 });
  return { sim, e, p };
}
function paint(sim, e) { e.cooldown = 0; sim.updateKikor(e, .01); sim.updateKikor(e, 1.4); return sim.state.enemies.find(a => a.kikorCreation); }
function grip(sim, e, p) {
  e.pattern = { kind: 'kikorHunt', hit: true, elapsed: 1.49, windup: 1.2, active: 4.2, cycle: 0, dx: 0, dy: 0 };
  p.x = e.x; p.y = e.y; sim.updateKikor(e, .01);
}
test('living green creation is the sole source of immunity and cannot be stacked', () => {
  const { sim, e, p } = arena(), green = paint(sim, e); assert.ok(green); assert.equal(green.owner, e.id);
  assert.equal(sim.kikorShielded(e), true); const hp = e.hp; sim.damage(e, 9999, p, true); assert.equal(e.hp, hp);
  e.pattern = { kind: 'kikorPaint', elapsed: 0, windup: .1, active: .5 }; sim.updateKikor(e, .2);
  assert.equal(sim.state.enemies.filter(a => a.kikorCreation && a.hp > 0).length, 1);
  sim.damage(green, 999, p, true); assert.equal(sim.kikorShielded(e), false);
  sim.updateKikor(e, .01); assert.ok(e.recovering >= 2); sim.damage(e, 10, p, false); assert.ok(e.hp < hp);
});
test('chase must touch a grounded, unprotected player during its lunge', () => {
  for (const defense of ['distance', 'jump', 'dodge', 'invincible', 'none']) {
    const { sim, e, p } = arena(); p.x = e.x; p.y = e.y;
    if (defense === 'jump') p.z = 60;
    if (defense === 'dodge') p.action = 'dodge';
    if (defense === 'invincible') p.invincible = 1;
    e.pattern = { kind: 'kikorHunt', hit: true, elapsed: 1.49, windup: 1.2, active: 4.2, cycle: 0, dx: 0, dy: 0 };
    if (defense === 'distance') p.x -= 200;
    sim.updateKikor(e, .01); assert.equal(!!p.caughtBy, defense === 'none', defense);
  }
});
test('grip drains at 0.2s intervals, blocks movement, supports button escape and expires', () => {
  const { sim, e, p } = arena(); grip(sim, e, p); assert.equal(p.caughtBy, e.id);
  const hp = p.hp; for (let i = 0; i < 5; i++) sim.updateKikor(e, .2); assert.equal(hp - p.hp, 25); // Normal difficulty: 5 HP per pulse.
  const x = p.x; sim.updatePlayer(p, { ...blankInput(), x: -1, special: true }, .016); assert.equal(p.x, x); assert.equal(p.specialState, null);
  for (let i = 0; i < 6; i++) { sim.updatePlayer(p, { ...blankInput(), punch: true }, .016); sim.updatePlayer(p, blankInput(), .016); }
  assert.equal(p.caughtBy, null); assert.equal(e.kikorGrip, null); assert.ok(p.invincible > 0);
  p.invincible = 0; grip(sim, e, p); for (let i = 0; i < 130; i++) sim.updateKikor(e, 1 / 60);
  assert.equal(p.caughtBy, null);
});
test('partner rescue works through shield without damaging Kikor; KO and street change release', () => {
  const { sim, e, p } = arena(); const green = paint(sim, e); grip(sim, e, p);
  const ally = sim.makePlayer('yanu', 1); sim.state.players.push(ally); const hp = e.hp;
  sim.damage(e, 40, ally, true); assert.equal(e.hp, hp); assert.equal(p.caughtBy, null);
  p.invincible = 0; grip(sim, e, p); sim.damage(green, 999, ally, true); sim.updateKikor(e, .01); assert.equal(p.caughtBy, null);
  p.invincible = 0; grip(sim, e, p); sim.enterStreet(); assert.equal(p.caughtBy, null);
});
test('pause freezes capture and serialized state contains no timers or external references', () => {
  const { sim, e, p } = arena(); grip(sim, e, p); sim.pause(true); const before = sim.snapshot(); sim.step(); assert.deepEqual(sim.snapshot(), before);
  assert.equal(JSON.parse(JSON.stringify(before)).enemies[0].kikorGrip.victim, p.id);
});
