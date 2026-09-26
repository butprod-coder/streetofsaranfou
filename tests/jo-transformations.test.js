import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { applyProfile, normalizeProfile, spendPoint, awardTalent } from '../game/progression.js';
import { JO_BRANCHES } from '../game/jo-talents.js';
import { TRANSFORMATION_MILESTONES } from '../game/transformation-rules.js';
import { blankInput, FLOOR } from '../game/data.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
function arena(branch=0,rank=6){
  const sim=new Simulation(['jo','kikor'],0,567),p=sim.state.players[0];sim.state.phase='fight';sim.state.enemies=[];sim.state.props=[];sim.state.pickups=[];sim.state.spawnQueue=[];
  applyProfile(p,{milestones:TRANSFORMATION_MILESTONES,talents:JO_BRANCHES[branch].nodes.slice(0,rank).map(n=>n.id)});Object.assign(p,{x:500,y:550,energy:100,invincible:0});
  const enemy=(x=575,y=550)=>sim.spawnEnemy('remy',{x,y,hp:10000,maxHp:10000,invincible:0,speed:0,cooldown:999});return{sim,p,enemy};
}
function run(sim,p,seconds,input={}){for(let t=0;t<seconds;t+=1/60){sim.state.time+=1/60;if(p.specialState)sim.updateSpecial(p,{...blankInput(),...input},1/60);for(const e of sim.state.enemies)if(e.joCargo)sim.updateJoCargo(e,1/60);sim.updateWorld(1/60);}}
test('Jo receives one initial point and locks chosen branch across save',()=>{
  let p=normalizeProfile({},'jo');assert.equal(p.points,1);p=spendPoint(p,JO_BRANCHES[2].nodes[0].id);assert.equal(awardTalent(p,'street:0:0').points,0);assert.equal(awardTalent(p,'boss:0').points,0);p=awardTalent(p,'boss:1');assert.equal(spendPoint(p,JO_BRANCHES[0].nodes[0].id),null);
  const {sim}=arena(2);sim.state.phase='clear';assert.deepEqual(restoreCheckpoint(checkpoint(sim.snapshot())).state.players[0].progression,sim.state.players[0].progression);
});
test('all 18 Jo ranks respect energy, fixed durations, bounds and friendly fire',()=>{
  for(let branch=0;branch<3;branch++)for(let rank=1;rank<=6;rank++){const {sim,p,enemy}=arena(branch,rank);enemy();const ally=sim.state.players[1],hp=ally.hp;p.energy=99;assert.equal(sim.activateSpecial(p),false);p.energy=100;assert.equal(sim.activateSpecial(p),true);assert.equal(p.energy,0);
    const duration=rank===6?9:rank>=4?7:5;run(sim,p,duration-.1);assert.ok(p.specialState);run(sim,p,.2);assert.equal(p.specialState,null);assert.equal(p.joInvisible,false);assert.equal(ally.hp,hp);assert.ok(p.x>=FLOOR.left&&p.x<=FLOOR.right);}
});
test('pallet broadens collision and loaded enemies follow without attacking',()=>{
  for(const rank of [1,2]){const {sim,p,enemy}=arena(0,rank),e=enemy(530,610);sim.activateSpecial(p);run(sim,p,.1,{x:1});assert.equal(e.hp<10000,rank===2);}
  const {sim,p,enemy}=arena(0,3),e=enemy();sim.activateSpecial(p);run(sim,p,.3,{x:1});assert.ok(e.joCargo);assert.equal(e.attack,null);assert.ok(e.z>0);assert.equal(e.x,p.x+80);const x=e.x;sim.physics(e,.1);assert.equal(e.x,x);
});
test('express boosts speed, stacks three and braking projects entire cargo',()=>{
  const {sim,p,enemy}=arena(0,5),a=enemy(560),b=enemy(600),c=enemy(640);sim.activateSpecial(p);run(sim,p,.3,{x:1,punch:true});assert.equal(p.specialState.cargo.length,3);assert.ok(p.specialState.speed>300);
  run(sim,p,.02,{kick:true});for(const e of [a,b,c]){assert.equal(e.joCargo,null);assert.ok(e.thrown);assert.ok(e.thrown.toX>e.thrown.fromX);}assert.equal(p.specialState.speed,0);
});
test('industrial delivery crosses screen and interruption releases cargo',()=>{
  const {sim,p,enemy}=arena(),e=enemy();sim.activateSpecial(p);run(sim,p,.2,{x:1});assert.ok(e.joCargo);sim.unloadJo(p,true);assert.equal(e.thrown.toX,FLOOR.right);for(let i=0;i<45;i++)sim.updateThrown(e,1/60);assert.equal(e.x,FLOOR.right);assert.equal(e.thrown,null);
  const second=arena(0,3),victim=second.enemy();second.sim.activateSpecial(second.p);run(second.sim,second.p,.2,{x:1});second.sim.endSpecial(second.p);assert.equal(victim.joCargo,null);assert.equal(victim.z,0);
});
test('redhead attacks burn, charged hair explodes and dash leaves fire trail',()=>{
  const {sim,p,enemy}=arena(1,3),e=enemy();sim.activateSpecial(p);run(sim,p,.1,{punch:true});assert.ok(e.hp<10000);assert.ok(sim.state.hazards.some(h=>h.joFire));
  run(sim,p,.7,{kick:true});assert.ok(sim.state.events.some(e=>e.atlas==='joFX'&&e.cell===7));const count=sim.state.hazards.length;run(sim,p,.2,{x:1,dodge:true});assert.ok(sim.state.hazards.length>count);
});
test('heat grows, full-heat combo explodes and super redhead ends at maximum heat',()=>{
  const {sim,p,enemy}=arena(1,5);enemy();sim.activateSpecial(p);for(let i=0;i<6;i++)sim.joFireAttack(p);assert.equal(p.specialState.heat,100);assert.ok(sim.state.events.some(e=>e.atlas==='joFX'&&e.cell===7));
  const full=arena(1);full.sim.activateSpecial(full.p);run(full.sim,full.p,6.1);assert.equal(full.p.specialState.heat,100);full.sim.joFireAttack(full.p,true);assert.ok(full.sim.state.events.some(e=>e.atlas==='joFX'&&e.cell===7));
});
test('weasel crosses enemy and first attack hits from behind, stealing weapon only once',()=>{
  const {sim,p,enemy}=arena(2,3),e=enemy(590);e.kind='charlingals';e.facing=-1;sim.activateSpecial(p);run(sim,p,.23,{x:1,dodge:true});assert.ok(p.x>e.x);assert.equal(p.specialState.crossed,e.id);
  run(sim,p,.02,{punch:true});assert.equal(p.facing,e.facing);assert.ok(p.x>e.x);assert.equal(sim.state.pickups.filter(i=>i.weapon==='knife').length,1);assert.equal(e.joDisarmed,true);sim.joBackstab(p,e);assert.equal(sim.state.pickups.filter(i=>i.weapon==='knife').length,1);
});
test('disappearance hides Jo during dodge; ambush reaches nearby target without crossing',()=>{
  const {sim,p,enemy}=arena(2,5),e=enemy(700,590);sim.activateSpecial(p);run(sim,p,.1,{x:-1,dodge:true});assert.equal(p.joInvisible,true);run(sim,p,.02,{punch:true});assert.equal(p.y,e.y);assert.equal(p.joInvisible,false);assert.ok(e.hp<10000);
  sim.endSpecial(p);assert.equal(p.joInvisible,false);
});
test('master weasel hits several distinct enemies automatically with deterministic state',()=>{
  const {sim,p,enemy}=arena(2),a=enemy(600),b=enemy(800),c=enemy(1000);sim.activateSpecial(p);run(sim,p,.1,{dodge:true,x:1});
  const copy=new Simulation(['jo','kikor'],0,567);copy.state=structuredClone(sim.state);copy.seed=sim.seed;copy.nextId=sim.nextId;run(sim,p,1);run(copy,copy.state.players[0],1);assert.deepEqual(copy.state,sim.state);for(const e of [a,b,c])assert.ok(e.hp<10000);assert.equal(p.specialState.chain.length,0);
});
