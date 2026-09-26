import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { applyProfile, normalizeProfile, spendPoint, awardTalent } from '../game/progression.js';
import { YANU_BRANCHES } from '../game/yanu-talents.js';
import { TRANSFORMATION_MILESTONES } from '../game/transformation-rules.js';
import { blankInput } from '../game/data.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
import { Soundtrack } from '../game/music.js';
function arena(branch=0,rank=6){
  const sim=new Simulation(['yanu','jo'],0,476),p=sim.state.players[0];sim.state.phase='fight';sim.state.props=[];sim.state.enemies=[];sim.state.spawnQueue=[];
  applyProfile(p,{milestones:TRANSFORMATION_MILESTONES,talents:YANU_BRANCHES[branch].nodes.slice(0,rank).map(n=>n.id)});Object.assign(p,{x:500,y:550,energy:100,invincible:0});
  const enemy=(x=580,y=550)=>sim.spawnEnemy('remy',{x,y,hp:10000,maxHp:10000,invincible:0,speed:100,cooldown:0});return{sim,p,enemy};
}
function run(sim,p,seconds,input={}){for(let t=0;t<seconds;t+=1/60){sim.state.time+=1/60;if(p.specialState)sim.updateSpecial(p,{...blankInput(),...input},1/60);sim.updateWorld(1/60);}}
test('Yanu starts with one point, never doubles first reward and locks one branch across save',()=>{
  let p=normalizeProfile({},'yanu');assert.equal(p.points,1);p=spendPoint(p,YANU_BRANCHES[1].nodes[0].id);assert.equal(awardTalent(p,'street:0:0').points,0);assert.equal(awardTalent(p,'boss:0').points,0);
  p=awardTalent(p,'boss:1');assert.equal(spendPoint(p,YANU_BRANCHES[0].nodes[0].id),null);
  const {sim}=arena(1);sim.state.phase='clear';assert.deepEqual(restoreCheckpoint(checkpoint(sim.snapshot())).state.players[0].progression,sim.state.players[0].progression);
});
test('all 18 Yanu ranks obey energy and duration with no friendly damage',()=>{
  for(let branch=0;branch<3;branch++)for(let rank=1;rank<=6;rank++){const {sim,p,enemy}=arena(branch,rank);enemy();const ally=sim.state.players[1],hp=ally.hp;p.energy=99;assert.equal(sim.activateSpecial(p),false);p.energy=100;assert.equal(sim.activateSpecial(p),true);assert.equal(p.energy,0);
    const duration=rank===6?9:rank>=4?7:5;run(sim,p,duration-.1);assert.ok(p.specialState);run(sim,p,.2);assert.equal(p.specialState,null);assert.equal(p.z,0);assert.equal(ally.hp,hp);assert.doesNotThrow(()=>JSON.stringify(sim.snapshot()));}
});
test('beast leaps to a target, claws repeatedly, and predator immediately rearms leap',()=>{
  const {sim,p,enemy}=arena(0,3),e=enemy(700),other=enemy(900);sim.activateSpecial(p);run(sim,p,.1,{kick:true});assert.ok(p.z>0);run(sim,p,.3);assert.ok(e.hp<10000);assert.ok(p.specialState.nextLeap<=p.specialState.elapsed);
  const hp=e.hp;run(sim,p,.3);assert.ok(e.hp<hp);run(sim,p,.02,{jump:true});assert.equal(p.specialState.leap.target,other.id);
});
test('beast kill frenzy expires and chase chains different targets with extended ultimate range',()=>{
  const {sim,p,enemy}=arena(0,5),a=enemy(650),b=enemy(880);sim.activateSpecial(p);sim.leapYanu(p);run(sim,p,.9);assert.ok(a.hp<10000&&b.hp<10000);assert.ok(p.specialState.visited.includes(a.id)&&p.specialState.visited.includes(b.id));
  const victim=enemy(p.x);victim.hp=1;sim.yanuHit(p,victim,1);assert.equal(p.specialState.frenzy.length,1);run(sim,p,2.6);assert.equal(p.specialState.frenzy.length,0);
  const ultimate=arena(0);ultimate.enemy(1120);ultimate.sim.activateSpecial(ultimate.p);assert.equal(ultimate.sim.leapYanu(ultimate.p),true);
});
test('fluo stuns, every third successful hit pulses, movement leaves expiring tiles',()=>{
  const {sim,p,enemy}=arena(1,3),e=enemy();sim.activateSpecial(p);sim.yanuFluoAttack(p,false);assert.ok(e.stun>=.35);sim.yanuFluoAttack(p,false);sim.yanuFluoAttack(p,false);assert.equal(p.specialState.combo,3);assert.ok(sim.state.events.some(e=>e.atlas==='yanuFX'&&e.cell===2));
  run(sim,p,.4,{x:1});assert.ok(sim.state.yanuTiles.length>=2);sim.endSpecial(p);run(sim,p,2);assert.equal(sim.state.yanuTiles.length,0);
});
test('mobile rave pulses, combos accelerate BPM and idle restores base period',()=>{
  const {sim,p,enemy}=arena(1,5),e=enemy(400);sim.activateSpecial(p);run(sim,p,.02);assert.ok(e.hp<10000);
  e.x=p.x+40;for(let i=0;i<8;i++)sim.yanuFluoAttack(p,false);run(sim,p,.02);assert.ok(p.specialState.beatPeriod<.5);run(sim,p,1.5);assert.equal(p.specialState.beatPeriod,.5);
});
test('ultimate fluo attacks are quantized to beats and arena pulse reaches distant foes',()=>{
  const {sim,p,enemy}=arena(1),e=enemy(1150);sim.activateSpecial(p);run(sim,p,.02);const hp=e.hp;assert.ok(hp<10000);p.specialState.nextBeat=p.specialState.elapsed+.3;
  run(sim,p,.1,{punch:true});assert.equal(p.specialState.queued,'punch');assert.equal(e.hp,hp);run(sim,p,.3);assert.ok(e.hp<hp);assert.ok(sim.state.events.filter(e=>e.type==='yanuBeat').length>=2);
  const calls=[],fake={ctx:{currentTime:5,state:'running'},drum:(...a)=>calls.push(a),note:(...a)=>calls.push(a)};Soundtrack.prototype.raveBeat.call(fake,2);assert.equal(calls.length,4);assert.ok(calls.every(c=>c[1]===5.01));
});
test('plants bite, root ordinary targets, respect plant caps and grow after four bites',()=>{
  const {sim,p,enemy}=arena(2,4),e=enemy(575);sim.activateSpecial(p);sim.plantYanu(p,650,550);assert.equal(sim.plantYanu(p,700,550),false);assert.equal(sim.state.yanuPlants.length,2);
  run(sim,p,2.4);assert.ok(e.hp<10000);assert.ok(sim.state.yanuPlants[0].giant);assert.ok(e.yanuRoots);e.yanuRoots.until=sim.state.time+1;const x=e.x;sim.updateEnemy(e,.1);sim.physics(e,.1);assert.equal(e.x,x);
  e.boss=true;assert.equal(sim.updateYanuRoots(e,.1),false);
});
test('plant kills reproduce; ultimate grows bounded spreading garden and death removes it',()=>{
  const {sim,p,enemy}=arena(2,5),e=enemy(575);e.hp=1;sim.activateSpecial(p);run(sim,p,.3);assert.equal(e.hp,0);assert.equal(sim.state.yanuPlants.length,2);
  const full=arena(2);full.sim.activateSpecial(full.p);run(full.sim,full.p,5);assert.ok(full.sim.state.yanuPlants.length>=8);assert.ok(full.sim.state.yanuPlants.length<=12);assert.ok(new Set(full.sim.state.yanuPlants.map(t=>Math.round(t.x))).size>=6);
  full.p.hp=0;full.sim.updateWorld(.1);assert.equal(full.sim.state.yanuPlants.length,0);
});
test('Yanu state resumes deterministically and street transition clears temporary plants and tiles',()=>{
  const {sim,p,enemy}=arena(2);enemy();sim.activateSpecial(p);run(sim,p,.5);const copy=new Simulation(['yanu','jo'],0,476);copy.state=structuredClone(sim.state);copy.seed=sim.seed;copy.nextId=sim.nextId;run(sim,p,.7);run(copy,copy.state.players[0],.7);assert.deepEqual(copy.state,sim.state);
  sim.enterStreet();assert.equal(sim.state.yanuPlants.length,0);assert.equal(sim.state.yanuTiles.length,0);assert.equal(p.specialState,null);
});
