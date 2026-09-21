import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossPractice } from '../game/boss-practice.js';
import { blankInput } from '../game/data.js';
import { applyProfile } from '../game/progression.js';

function arena() {
  const sim = createBossPractice({ chapter: 2, invulnerable: false, freeSpecial: false });
  const e = sim.state.enemies[0], p = sim.state.players[0];
  Object.assign(e, { x: 700, y: 550, cooldown: 0, attackCount: 2 });
  Object.assign(p, { x: 560, y: 550, invincible: 0 });
  sim.updateYanu(e, .01); return { sim, e, p };
}
function roar(sim, e) { sim.updateYanu(e, e.pattern.windup); }

test('Yanu scream freezes only exposed players and blocks movement and specials', () => {
  for (const defense of ['none', 'jump', 'dodge', 'invincible', 'distance']) {
    const { sim, e, p } = arena();
    if (defense === 'jump') p.z = 60;
    if (defense === 'dodge') p.action = 'dodge';
    if (defense === 'invincible') p.invincible = 1;
    if (defense === 'distance') p.x = 150;
    roar(sim, e); assert.equal(!!p.yanuFrozen, defense === 'none', defense);
    if (defense === 'none') {
      const x = p.x; sim.updatePlayer(p, { ...blankInput(), x: 1, special: true, punch: true }, .1); sim.physics(p, .1);
      assert.equal(p.x, x); assert.equal(p.attack, null); assert.equal(p.specialState, null);
      for (let i = 0; i < 40; i++) sim.updatePlayer(p, blankInput(), 1 / 60);
      assert.equal(p.yanuFrozen, null); assert.equal(e.pattern.lunging, false);
    }
  }
});

test('wolf lunge respects jumping, dodging and one hit per attack', () => {
  for (const defense of ['none', 'jump', 'dodge']) {
    const { sim, e, p } = arena(); roar(sim, e); sim.releaseYanuFreeze(e.id);
    e.pattern.elapsed = e.pattern.windup + 1.1; e.pattern.dx = e.pattern.dy = 0; p.x = e.x;
    if (defense === 'jump') p.z = 60;
    if (defense === 'dodge') p.action = 'dodge';
    const hp = p.hp; sim.updateYanu(e, .01); assert.equal(p.hp < hp, defense === 'none');
    const after = p.hp; p.invincible = 0; sim.updateYanu(e, .01); assert.equal(p.hp, after);
  }
});

test('KO, guard break, phase transition and street cleanup never leave frozen players', () => {
  for (const cleanup of ['ko', 'guard', 'street']) {
    const { sim, e, p } = arena(); roar(sim, e);
    assert.ok(p.yanuFrozen);
    if (cleanup === 'ko') sim.damage(e, 9999, p, true);
    if (cleanup === 'guard') for (let i = 0; i < 3; i++) sim.damage(e, 1, p, true);
    if (cleanup === 'street') sim.enterStreet();
    assert.equal(p.yanuFrozen, null);
  }
  const { sim, e } = arena(); e.hp = e.maxHp * .4; sim.updateYanu(e, .01); assert.equal(e.bossPhase, 2);
  e.hp = e.maxHp; sim.updateYanu(e, .01); assert.equal(e.bossPhase, 2);
});

test('tsunami lane can be avoided and grants a punish window after the crossing', () => {
  for (const avoid of [false, true]) {
    const { sim, e, p } = arena(); e.pattern = null; e.attackCount = 0; sim.updateYanu(e, .01);
    assert.equal(e.pattern.kind, 'yanuTsunami'); assert.ok(e.pattern.windup >= 1);
    p.x = e.x - 60; if (avoid) p.y = e.y - 80;
    const hp = p.hp; while (!e.pattern.hit) sim.updateYanu(e, 1 / 60); assert.equal(p.hp < hp, !avoid);
    for (let i = 0; i < 120 && e.pattern; i++) sim.updateYanu(e, 1 / 60);
    assert.equal(e.pattern, null); assert.ok(e.recovering > 1);
  }
});

test('pause preserves freeze and all Yanu states serialize for co-op', () => {
  const { sim, e, p } = arena(); roar(sim, e); sim.pause(true);
  const before = sim.snapshot(); sim.step(); assert.deepEqual(sim.snapshot(), before);
  assert.equal(JSON.parse(JSON.stringify(before)).players[0].yanuFrozen.owner, e.id);
  assert.ok(p.yanuFrozen.remaining > 0);
});

test('co-op scream checks each player independently and fixed-step thaw precedes lunge', () => {
  const { sim, e, p } = arena(), partner = sim.makePlayer('karonux', 1);
  applyProfile(partner, {});
  sim.state.players.push(partner); Object.assign(partner, { x: p.x, y: p.y, invincible: 1 });
  roar(sim, e); assert.ok(p.yanuFrozen); assert.ok(!partner.yanuFrozen);
  for (let i = 0; i < 41; i++) sim.step([blankInput(), blankInput()]);
  assert.equal(p.yanuFrozen, null); assert.equal(e.pattern.lunging, false);
  sim.updatePlayer(p, { ...blankInput(), dodge: true, y: -1 }, 1 / 60);
  assert.equal(p.action, 'dodge');
});
