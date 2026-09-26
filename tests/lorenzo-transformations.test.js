import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { applyProfile, normalizeProfile, spendPoint, awardTalent } from '../game/progression.js';
import { LORENZO_BRANCHES } from '../game/lorenzo-talents.js';
import { TRANSFORMATION_MILESTONES } from '../game/transformation-rules.js';
import { blankInput } from '../game/data.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
function arena(branch=0,rank=6){
  const sim=new Simulation(['lorenzo','jo'],0,456),p=sim.state.players[0];sim.state.phase='fight';sim.state.enemies=[];sim.state.props=[];sim.state.spawnQueue=[];
  applyProfile(p,{milestones:TRANSFORMATION_MILESTONES,talents:LORENZO_BRANCHES[branch].nodes.slice(0,rank).map(n=>n.id)});Object.assign(p,{x:500,y:550,energy:100,invincible:0});
  const enemy=(x=570,y=550)=>sim.spawnEnemy('remy',{x,y,hp:10000,maxHp:10000,speed:100,cooldown:999,invincible:0});return{sim,p,enemy};
}
function run(sim,p,seconds,input={}){for(let t=0;t<seconds;t+=1/60){sim.state.time+=1/60;if(p.specialState)sim.updateSpecial(p,{...blankInput(),...input},1/60);sim.updateWorld(1/60);}}
test('Lorenzo starts with one point and locks a six-rank branch across saves',()=>{
  let p=normalizeProfile({},'lorenzo');assert.equal(p.points,1);p=spendPoint(p,LORENZO_BRANCHES[1].nodes[0].id);assert.equal(p.points,0);
  assert.equal(awardTalent(p,'street:0:0').points,0);assert.equal(awardTalent(p,'boss:0').points,0);
  for(const key of TRANSFORMATION_MILESTONES.slice(1))p=awardTalent(awardTalent(p,key),key);
  assert.equal(p.points,5);assert.equal(spendPoint(p,LORENZO_BRANCHES[0].nodes[0].id),null);
  for(const n of LORENZO_BRANCHES[1].nodes.slice(1))p=spendPoint(p,n.id);
  assert.equal(p.talents.length,6);assert.equal(p.points,0);
  const {sim}=arena(1);sim.state.phase='clear';assert.deepEqual(restoreCheckpoint(checkpoint(sim.snapshot())).state.players[0].progression.talents,p.talents);
});
test('all 18 Lorenzo ranks consume full energy and last 5/7/9 seconds without friendly fire',()=>{
  for(let b=0;b<3;b++)for(let rank=1;rank<=6;rank++){
    const {sim,p,enemy}=arena(b,rank);enemy();const ally=sim.state.players[1],hp=ally.hp;
    p.energy=99;assert.equal(sim.activateSpecial(p),false);p.energy=100;assert.equal(sim.activateSpecial(p),true);assert.equal(p.energy,0);
    const duration=rank===6?9:rank>=4?7:5;assert.equal(p.specialState.duration,duration);run(sim,p,duration-.1);assert.ok(p.specialState);run(sim,p,.2);assert.equal(p.specialState,null);assert.equal(p.z,0);assert.equal(ally.hp,hp);
    assert.doesNotThrow(()=>JSON.stringify(sim.snapshot()));
  }
});
test('smoke persists, illusions attract enemies, bad trip damages another enemy',()=>{
  const {sim,p,enemy}=arena(0,3),e=enemy(500),other=enemy(525);sim.activateSpecial(p);sim.updateLorenzoWorld(.01);
  assert.ok(e.lorenzoConfused);const hp=other.hp;sim.updateLorenzoEnemy(e,.1);assert.ok(other.hp<hp);
  sim.updateLorenzoEnemy(other,.1);assert.match(String(other.lorenzoTarget),/illusion/);
  run(sim,p,.4,{punch:true});assert.ok(sim.state.lorenzoClouds.length>=2);
  sim.endSpecial(p);assert.ok(sim.state.lorenzoClouds.length);run(sim,p,3);assert.equal(sim.state.lorenzoClouds.length,0);
});
test('N4 smoke follows, N5 throws three cigarettes and N6 launches dozens across screen',()=>{
  const {sim,p}=arena(0,5);sim.activateSpecial(p);run(sim,p,.1,{x:1,kick:true});
  const c=sim.state.lorenzoClouds.find(c=>c.follow);assert.equal(c.x,p.x);assert.equal(sim.state.lorenzoShots.length,3);
  run(sim,p,.4);assert.equal(sim.state.hazards.filter(h=>h.lorenzoCigarette).length,3);
  const full=arena(0);full.sim.activateSpecial(full.p);assert.equal(full.sim.state.lorenzoShots.length,36);run(full.sim,full.p,1.8);assert.equal(full.sim.state.hazards.filter(h=>h.lorenzoCigarette).length,36);
});
test('pigeon flies, drops vertically, charged dive hits, alpha carries and releases light enemy',()=>{
  const {sim,p,enemy}=arena(1,4),e=enemy(500);sim.activateSpecial(p);assert.equal(p.z,85);
  run(sim,p,.1,{punch:true});assert.equal(sim.state.lorenzoShots[0].x,p.x);run(sim,p,.3);assert.ok(e.hp<10000);
  run(sim,p,.9,{punch:true});assert.ok(Math.abs(e.vx)>=380);
  e.x=p.x;e.y=p.y;run(sim,p,.02,{jump:true});assert.ok(e.lorenzoCarry);sim.updateEnemy(e,.1);assert.ok(e.z>0);
  sim.state.time+=1;sim.updateEnemy(e,.1);assert.equal(e.lorenzoCarry,null);assert.equal(e.z,0);
});
test('successful dives summon swarm; king has permanent companions and cleanup',()=>{
  const {sim,p,enemy}=arena(1,5);enemy();sim.activateSpecial(p);run(sim,p,.5,{kick:true});assert.ok(sim.state.lorenzoBirds.length>=3);
  const king=arena(1,6);king.sim.activateSpecial(king.p);assert.equal(king.sim.state.lorenzoBirds.length,6);king.sim.endSpecial(king.p);assert.equal(king.sim.state.lorenzoBirds.length,0);
});
test('skull breaks combat guard and reflects only eligible frontal projectiles',()=>{
  const {sim,p,enemy}=arena(2,4),e=enemy();e.boss=true;e.kind='karonux';e.recovering=0;sim.activateSpecial(p);
  sim.lorenzoHit(p,e,1,true);assert.ok(e.recovering>0);
  const h=sim.hazard(e,{kind:'bullet',x:p.x+50,y:p.y,vx:-200,delay:0,ttl:3}),fire=sim.hazard(e,{kind:'fire',x:p.x+20,y:p.y,vx:0,delay:0,ttl:3});
  sim.reflectLorenzoProjectiles(p);assert.equal(h.owner,p.id);assert.equal(h.enemy,false);assert.equal(h.vx,200);assert.equal(fire.enemy,true);
});
test('skull ricochets, carries several enemies and rolls at N6',()=>{
  const {sim,p,enemy}=arena(2,5),a=enemy(560),b=enemy(580,560);sim.activateSpecial(p);run(sim,p,.1,{kick:true});assert.ok(a.lorenzoCarry);assert.ok(b.lorenzoCarry);
  run(sim,p,.6);assert.equal(a.lorenzoCarry,null);run(sim,p,.4,{jump:true});assert.ok(p.specialState.reboundUntil>p.specialState.elapsed);assert.ok(p.z>0);
  const king=arena(2);king.sim.activateSpecial(king.p);run(king.sim,king.p,.3,{x:1,kick:true});assert.ok(king.p.x>650);assert.equal(king.p.specialState.pose,7);
});
test('death and interruption release carried enemy and restore grounded normal form',()=>{
  const {sim,p,enemy}=arena(1,4),e=enemy(500);sim.activateSpecial(p);run(sim,p,.02,{jump:true});assert.ok(e.lorenzoCarry);sim.endSpecial(p);assert.equal(e.lorenzoCarry,null);assert.equal(p.z,0);
});
test('network snapshot continues deterministically with smoke, projectiles and flock',()=>{
  for(const branch of [0,1,2]){
    const {sim,p,enemy}=arena(branch);enemy();sim.activateSpecial(p);run(sim,p,.2,{x:1,punch:true});
    const replica=new Simulation(['lorenzo','jo']);replica.state=structuredClone(sim.state);replica.seed=sim.seed;replica.nextId=sim.nextId;
    for(let i=0;i<100;i++){const inputs=[{...blankInput(),x:i%40<20?1:-1,punch:i%35<20,kick:i%30<5},blankInput()];sim.step(inputs);replica.step(inputs);}
    assert.deepEqual(replica.snapshot(),sim.snapshot());
  }
});
