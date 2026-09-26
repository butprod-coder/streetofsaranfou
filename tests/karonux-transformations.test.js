import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput } from '../game/data.js';
import { applyProfile, normalizeProfile, spendPoint, awardTalent } from '../game/progression.js';
import { KARONUX_BRANCHES, KARONUX_MILESTONES } from '../game/karonux-talents.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';

function arena(branch = 0, rank = 6) {
  const sim = new Simulation(['karonux', 'jo'], 0, 99), p = sim.state.players[0];
  sim.state.phase = 'fight'; sim.state.enemies = []; sim.state.props = []; sim.state.spawnQueue = [];
  applyProfile(p, { milestones: KARONUX_MILESTONES, talents: KARONUX_BRANCHES[branch].nodes.slice(0, rank).map(n => n.id) });
  Object.assign(p, { x: 500, y: 550, energy: 100 });
  const enemy = (x = 580, y = 550) => sim.spawnEnemy('remy', { x, y, hp: 10000, maxHp: 10000, invincible: 0, cooldown: 999, speed: 0 });
  return { sim, p, enemy };
}
function advance(sim, p, seconds, input = {}) {
  for (let t = 0; t < seconds; t += 1/60) { sim.state.time += 1/60; if (p.specialState) sim.updateSpecial(p, { ...blankInput(), ...input }, 1/60); sim.updateKaronuxWorld(1/60); }
}
test('six awards only: initial point, five later bosses, no duplicate stage reward', () => {
  let p = normalizeProfile({}, 'karonux'); assert.equal(p.points, 1);
  for (const key of ['street:0:0','street:0:2','boss:0','street:1:2','boss:1','boss:2','boss:3','boss:4','boss:5']) p = awardTalent(awardTalent(p,key),key);
  assert.equal(p.points, 6); assert.deepEqual(p.milestones, KARONUX_MILESTONES);
});
test('first purchase locks both other branches, prerequisites and saved lock survive normalization', () => {
  let p = normalizeProfile({ milestones: KARONUX_MILESTONES }, 'karonux');
  assert.equal(spendPoint(p, KARONUX_BRANCHES[1].nodes[1].id), null);
  p = spendPoint(p, KARONUX_BRANCHES[1].nodes[0].id);
  assert.equal(spendPoint(p, KARONUX_BRANCHES[0].nodes[0].id), null);
  assert.equal(spendPoint(p, KARONUX_BRANCHES[2].nodes[0].id), null);
  const forged = normalizeProfile({ ...p, talents: [...p.talents, KARONUX_BRANCHES[0].nodes[0].id] });
  assert.deepEqual(forged.talents, p.talents);
  for (const n of KARONUX_BRANCHES[1].nodes.slice(1)) p = spendPoint(p, n.id);
  assert.equal(p.talents.length, 6); assert.equal(p.points, 0);
  const { sim } = arena(1); sim.state.phase = 'clear';
  assert.deepEqual(restoreCheckpoint(checkpoint(sim.snapshot())).state.players[0].progression.talents, p.talents);
});
test('all 18 ranks cost full energy, last exactly 5/7/9 seconds, revert without friendly fire', () => {
  for (let branch = 0; branch < 3; branch++) for (let rank = 1; rank <= 6; rank++) {
    const {sim,p,enemy} = arena(branch,rank); enemy(); const ally = sim.state.players[1], hp = ally.hp;
    p.energy = 99; assert.equal(sim.activateSpecial(p), false); p.energy = 100; assert.equal(sim.activateSpecial(p), true);
    const duration = rank >= 6 ? 9 : rank >= 4 ? 7 : 5;
    assert.equal(p.specialState.duration, duration); assert.equal(p.energy, 0);
    advance(sim,p,duration-.1); assert.ok(p.specialState); advance(sim,p,.2);
    assert.equal(p.specialState,null); assert.equal(p.action,'idle'); assert.equal(ally.hp,hp); assert.equal(p.cooldown,0);
    assert.doesNotThrow(()=>JSON.stringify(sim.snapshot()));
  }
  const {sim,p} = arena(0,0); assert.equal(sim.activateSpecial(p),false); assert.equal(p.energy,100);
});
test('Golf acceleration, reverse, drift and collision chains depend on rank', () => {
  const {sim,p,enemy} = arena(0,5), e = enemy(); sim.activateSpecial(p);
  advance(sim,p,.3,{x:1}); assert.ok(e.hp<10000); assert.ok(p.specialState.chain>0);
  const x=p.x; advance(sim,p,.15,{punch:true}); assert.ok(p.x<x); assert.equal(p.facing,1);
  const back=enemy(p.x-70); advance(sim,p,.02,{kick:true}); assert.ok(back.hp<10000);
  advance(sim,p,1.6); assert.equal(p.specialState.chain,0);
});
test('frost slows, freezes and heavy attacks shatter with bounded contagion', () => {
  const {sim,p,enemy}=arena(1,5), e=enemy(), neighbour=enemy(640); sim.activateSpecial(p);
  sim.karonuxFrost(p,e,1); assert.equal(e.karonuxFrost.amount,1);
  sim.karonuxFrost(p,e,2); assert.ok(e.karonuxFrost.frozenUntil>sim.state.time);
  const x=e.x; sim.updateEnemy(e,.1); assert.equal(e.x,x);
  sim.karonuxFrost(p,neighbour,1); sim.karonuxStrike(p,150,1,{frost:true,heavy:true});
  assert.ok(e.hp<10000); assert.ok(neighbour.hp<10000);
  assert.ok(sim.state.events.filter(e=>e.type==='spectacle').length<10);
});
test('ice dodge leaves slippery trail and ultimate applies opening frost and final shatter', () => {
  const {sim,p,enemy}=arena(1), e=enemy(1000); sim.activateSpecial(p); assert.equal(e.karonuxFrost.amount,1.5);
  advance(sim,p,.2,{dodge:true,x:1}); assert.ok(sim.state.karonuxTrails.length>0);
  const trail=sim.state.karonuxTrails[0], slipping=enemy(trail.x,trail.y); sim.updateKaronuxWorld(.01); assert.ok(slipping.stun>0);
  sim.karonuxFrost(p,e,3); p.specialState.elapsed=8.54; const hp=e.hp; advance(sim,p,.05); assert.ok(e.hp<hp);
});
test('Handikaron combo, charged launch, vault, spin and final fall damage enemies', () => {
  const {sim,p,enemy}=arena(2), e=enemy(); sim.activateSpecial(p);
  advance(sim,p,.55,{punch:true}); assert.equal(p.specialState.combo,3); assert.ok(e.hp<10000);
  advance(sim,p,.3); advance(sim,p,.8,{kick:true}); assert.ok(p.specialState.charge>.7);
  advance(sim,p,.02); assert.ok(e.karonuxLaunch); assert.ok(Math.abs(e.vx)>700);
  const hp=e.hp; advance(sim,p,.7,{jump:true}); assert.ok(e.hp<hp); assert.equal(p.z,0);
  const back=enemy(p.x-100); advance(sim,p,.02,{dodge:true}); assert.ok(back.hp<10000);
  p.specialState.elapsed=8.54; const hp2=e.hp; advance(sim,p,.05); assert.ok(e.hp<hp2);
});
test('interruption and death cancel transformations without triggering ultimate finish', () => {
  const {sim,p,enemy}=arena(0), e=enemy(); sim.activateSpecial(p); sim.endSpecial(p); assert.equal(e.hp,10000);
  p.energy=100; sim.activateSpecial(p); p.invincible=0; sim.damage(p,9999,e,true); assert.equal(p.specialState,null); assert.equal(e.hp,10000);
});
