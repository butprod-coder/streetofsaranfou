import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossPractice } from '../game/boss-practice.js';
import { CHAPTERS, FIGHTERS, blankInput, STEP } from '../game/data.js';

function arena(phase = 1) {
  const sim = createBossPractice({ chapter: 5, phase, invulnerable: false, freeSpecial: false });
  const e = sim.state.enemies[0], p = sim.state.players[0];
  Object.assign(e, { x: 800, y: 550, cooldown: 0 }); Object.assign(p, { x: 610, y: 550, invincible: 0 });
  return { sim, e, p };
}
function commercial(sim, e) {
  sim.beginJualosCommercial(e);
  for (let i = 0; i < 140; i++) sim.updateJualos(e, STEP);
  assert.equal(e.pattern, null);
}
function money(sim, e, p, options = {}) { return sim.hazard(e, { kind: 'jualosCash', x: p.x, y: p.y, radius: 34, delay: 0, ttl: 5, damage: 0, ...options }); }

test('Jualos replaces only the final boss and Gustavax remains a playable fighter', () => {
  assert.equal(CHAPTERS[5].boss, 'jualos'); assert.ok(FIGHTERS.some(f => f.id === 'gustavax'));
  assert.equal(arena().e.kind, 'jualos'); assert.equal(arena().e.maxHp, 1600);
});

test('belly dance has three timed impacts, avoided by distance, jumping or invulnerability', () => {
  for (const defense of ['none', 'distance', 'jump', 'dodge']) {
    const { sim, e, p } = arena(); sim.updateJualos(e, STEP); assert.equal(e.pattern.kind, 'jualosBelly');
    if (defense === 'distance') p.x = 100;
    if (defense === 'jump') p.z = 60;
    if (defense === 'dodge') p.invincible = 1;
    const hp = p.hp;
    sim.updateJualos(e, e.pattern.windup); p.x = defense === 'distance' ? 100 : e.x - 140; sim.updateWorld(STEP);
    assert.equal(p.hp < hp, defense === 'none');
    for (let i = 0; i < 65; i++) sim.updateJualos(e, STEP);
    assert.equal(sim.state.events.filter(x => x.type === 'belly').length, 3);
  }
});

test('strong blows cannot skip commercial phase and costume change has bounded protection', () => {
  const { sim, e, p } = arena(); sim.damage(e, 9999, p, true);
  assert.equal(e.hp, 800); assert.equal(e.bossPhase, 2); assert.equal(e.commercial, true); assert.equal(e.pattern.kind, 'jualosSuit');
  sim.damage(e, 9999, p, true); assert.equal(e.hp, 800);
  for (let i = 0; i < 140; i++) sim.updateJualos(e, STEP);
  assert.equal(sim.jualosChanging(e), false); assert.ok(e.recovering > 1);
  e.hp = e.maxHp; sim.updateJualos(e, STEP); assert.equal(e.bossPhase, 2); assert.equal(e.commercial, true);
});

test('cash only trips exposed grounded players after landing and makes Jualos laugh', () => {
  for (const defense of ['none', 'flight', 'jump', 'dodge', 'distance']) {
    const { sim, e, p } = arena(); commercial(sim, e);
    const h = money(sim, e, p, { delay: defense === 'flight' ? .5 : 0 });
    if (defense === 'jump') p.z = 60;
    if (defense === 'dodge') p.invincible = .3;
    if (defense === 'distance') p.x -= 100;
    sim.updateWorld(STEP); assert.equal(!!p.jualosSlip, defense === 'none', defense);
    if (defense === 'none') { assert.ok(e.laughTime > 0); assert.equal(h.ttl, 0); assert.ok(sim.state.events.some(x => x.label === 'HAHAHA !')); }
  }
});

test('slip blocks actions, expires, and get-up protection prevents a chain of falls', () => {
  const { sim, e, p } = arena(); commercial(sim, e); money(sim, e, p); sim.updateWorld(STEP);
  const x = p.x; sim.updatePlayer(p, { ...blankInput(), x: 1, special: true, punch: true }, STEP); sim.physics(p, STEP);
  assert.equal(p.x, x); assert.equal(p.attack, null); assert.equal(p.specialState, null);
  for (let i = 0; i < 52; i++) sim.updatePlayer(p, blankInput(), STEP);
  assert.equal(p.jualosSlip, null); assert.ok(p.invincible > .5);
  money(sim, e, p); sim.updateWorld(STEP); assert.equal(p.jualosSlip, null);
});

test('cash has a finite ground lifetime and a strict ten-pile cap', () => {
  const { sim, e, p } = arena(); commercial(sim, e); p.invincible = 99;
  for (let i = 0; i < 5; i++) sim.scatterJualosCash(e, { targetX: p.x, targetY: p.y });
  assert.equal(sim.state.hazards.filter(h => h.kind === 'jualosCash').length, 10);
  for (let i = 0; i < 420; i++) sim.updateWorld(STEP);
  assert.equal(sim.state.hazards.length, 0);
});

test('commercial fights with his pouch, damage can be avoided and laughs expose him', () => {
  for (const attackCount of [1, 2]) {
    const { sim, e, p } = arena(); commercial(sim, e); e.cooldown = e.recovering = 0; e.attackCount = attackCount; p.x = e.x - 100;
    sim.updateJualos(e, STEP); assert.equal(e.pattern.kind, attackCount === 1 ? 'jualosBagSwing' : 'jualosBagSlam');
    p.z = 60; const hp = p.hp;
    for (let i = 0; i < 100; i++) { sim.updateJualos(e, STEP); sim.updateWorld(STEP); }
    assert.equal(p.hp, hp);
  }
  const { sim, e, p } = arena(); commercial(sim, e); money(sim, e, p); sim.updateWorld(STEP);
  const hp = e.hp; sim.damage(e, 20, p, false); assert.equal(hp - e.hp, 25);
});

test('pause, boss KO, street change and revival never leave a player stuck on the floor', () => {
  for (const cleanup of ['ko', 'street', 'revive']) {
    const { sim, e, p } = arena(); commercial(sim, e); money(sim, e, p); sim.updateWorld(STEP); assert.ok(p.jualosSlip);
    sim.pause(true); const before = sim.snapshot(); sim.step(); assert.deepEqual(sim.snapshot(), before);
    assert.equal(JSON.parse(JSON.stringify(before)).players[0].jualosSlip.owner, e.id); sim.pause(false);
    if (cleanup === 'ko') { sim.damage(e, 9999, p, true); assert.ok(!sim.state.hazards.some(h => h.owner === e.id)); }
    if (cleanup === 'street') sim.enterStreet();
    if (cleanup === 'revive') sim.revivePlayer(p, .5);
    assert.equal(p.jualosSlip, null);
  }
});

