import { KARONUX_MILESTONES } from '../game/karonux-talents.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { TALENTS, TALENT_MILESTONES, normalizeProfile, addExperience, spendPoint, applyProfile, canLearn } from '../game/progression.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
import { blankInput, FLOOR } from '../game/data.js';

function arena(kind, branch=0, rank=5, duo=false) {
  const sim=new Simulation(duo?[kind,kind]:[kind],0,713);
  sim.state.phase='fight';sim.state.props=[];sim.state.spawnQueue=[];sim.state.enemies=[];
  for(const p of sim.state.players){applyProfile(p,{milestones:[...TALENT_MILESTONES, ...KARONUX_MILESTONES],talents:TALENTS[kind].filter(n=>n.branchIndex===branch&&n.tier<rank).map(n=>n.id)});p.x=500;p.y=550;p.invincible=0;p.energy=100;}
  const e=sim.spawnEnemy('remy',{x:580,y:550,hp:10000,maxHp:10000,cooldown:999,speed:0,invincible:0});
  return {sim,p:sim.state.players[0],e};
}
function hit(sim,p,type='punch',final=false) {p.attack=null;p.cooldown=0;if(final){p.comboStep=2;p.comboWindow=1;}sim.startAttack(p,type);sim.resolveAttack(p);}

test('six campaign milestones, including KO partner, never stack on replays or XP',()=>{
  const sim=new Simulation(['gustavax','gustavax']);
  assert.deepEqual(sim.state.players.map(p=>p.progression.points),[1,1]);
  const totals=[];
  for(let chapter=0;chapter<6;chapter++)for(let stage=0;stage<6;stage++){
    sim.state.chapter=chapter;sim.state.stage=stage;sim.state.players[1].hp=0;sim.clearStreet();sim.clearStreet();
    if(stage===2||stage===5)totals.push(sim.state.players[0].progression.points);
  }
  assert.deepEqual(totals,[1,1,1,2,2,3,3,4,4,5,5,6]);
  for(const p of sim.state.players){assert.equal(p.progression.points,6);assert.equal(addExperience(p.progression,10000).points,6);}
  sim.state.chapter=0;sim.state.stage=2;sim.clearStreet();assert.equal(sim.state.players[0].progression.points,6);
  assert.equal(new Simulation(['jo']).state.players[0].progression.points,1);
});
test('linear prerequisite and global ultimate exclusivity survive normalization',()=>{
  let p=normalizeProfile({milestones:[...TALENT_MILESTONES, ...KARONUX_MILESTONES]},'gustavax');
  assert.equal(spendPoint(p,TALENTS.gustavax[4].id),null);
  for(const n of TALENTS.gustavax.slice(0,5))p=spendPoint(p,n.id);
  assert.equal(p.points,1);assert.equal(p.completed.length,0);
  assert.equal(canLearn({...p,talents:[...p.talents,...TALENTS.gustavax.slice(5,9).map(n=>n.id)]},TALENTS.gustavax[9]),false);
  assert.equal(spendPoint(p,TALENTS.gustavax[0].id),null);
  assert.equal(normalizeProfile({...p,milestones:[...KARONUX_MILESTONES,...KARONUX_MILESTONES,'forged'],points:99}).points,1);
});
test('checkpoint preserves awards and purchases without regranting the first-street reward',()=>{
  const sim=new Simulation(['gustavax']);sim.clearStreet();sim.state.stage=2;sim.clearStreet();sim.spendStat(0,TALENTS.gustavax[0].id);
  const restored=restoreCheckpoint(checkpoint(sim.snapshot()));
  assert.deepEqual(restored.state.players[0].progression,sim.state.players[0].progression);
  restored.clearStreet();assert.equal(restored.state.players[0].progression.points,0);
});
test('all 21 ultimates activate in both player slots, have finite state and no friendly fire',()=>{
  for(const kind of Object.keys(TALENTS))for(let branch=0;branch<3;branch++){
    const {sim,p,e}=arena(kind,branch,['karonux','lorenzo','jualos','yanu','jo','kikor','gustavax'].includes(kind)?6:5,true),ally=sim.state.players[1];p.rogueRhythm=3;p.rogueInstinctGauge=3;
    sim.activateSpecial(p);assert.ok(p.specialState.ultimate,`${kind}/${branch}`);assert.equal(p.specialCd,0);
    const hp=ally.hp;for(let i=0;i<100;i++){sim.state.time+=.1;sim.updateRoguePlayer(p,blankInput(),.1);if(p.specialState)sim.updateSpecial(p,blankInput(),.1);sim.updateWorld(.1);}
    assert.equal(ally.hp,hp,`${kind}/${branch}: friendly fire`);assert.equal(p.specialState,null);
    assert.doesNotThrow(()=>JSON.stringify(sim.snapshot()));assert.ok(Number.isFinite(e.hp));assert.ok(sim.state.allies.length<=(kind==='gustavax'&&branch===1?6:3));assert.ok((sim.state.rogueZones||[]).length<=8);
  }
});
test('Jo transformations no longer require the old rhythm meter',()=>{
  const {sim,p}=arena('jo',0,6);sim.activateSpecial(p);assert.equal(p.specialState.ultimate,true);assert.equal(p.specialState.branch,0);
});
test('Jualos recruits fight for him and are no longer counted as hostile enemies',()=>{
  const {sim,p,e}=arena('jualos',0,2);sim.activateSpecial(p);sim.updateSpecial(p,{...blankInput(),punch:true},.1);
  assert.ok(sim.state.allies.includes(e));assert.ok(!sim.state.enemies.includes(e));assert.equal(e.enemy,false);assert.equal(e.aggressive,true);
});
test('Jualos new tree has no passive Couenne outside transformations',()=>{
  const {sim,p,e}=arena('jualos',0,1);sim.startAttack(p,'punch');sim.damage(p,10,e,true);assert.equal(p.attack,null);
});
test('Karonux rejects mixed-branch investments',()=>{
  const {p}=arena('karonux',2,4);
  const other=TALENTS.karonux.find(n=>n.branchIndex===0);
  assert.equal(spendPoint(p.progression,other.id),null);
});
test('Golf reverses with main and drifts with foot',()=>{
  const {sim,p}=arena('karonux',0,6);sim.activateSpecial(p);sim.updateSpecial(p,{...blankInput(),x:1},.4);
  const x=p.x;sim.updateSpecial(p,{...blankInput(),punch:true,y:1},.1);assert.ok(p.x<x);assert.equal(p.facing,1);
  sim.updateSpecial(p,{...blankInput(),kick:true},.1);assert.ok(p.specialState.driftUntil>p.specialState.elapsed);
  sim.updateSpecial(p,blankInput(),10);assert.equal(p.specialState,null);
});
test('Yanu plant branch starts a carnivore without the old instinct meter',()=>{
  const {sim,p}=arena('yanu',2);sim.activateSpecial(p);assert.equal(p.specialState.branch,2);assert.equal(sim.state.yanuPlants.length,1);assert.equal(p.rogueInstinctGauge,undefined);
});
test('Jualos has no old feast healing and Yanu durations remain fixed',()=>{
  const {sim,p,e}=arena('jualos',2);p.hp=10;sim.activateSpecial(p);for(let i=0;i<40;i++){sim.state.time+=.4;sim.rogueOnHit(p,e,true);}assert.ok(p.hp<=10+p.maxHp*.2);
  const wolf=arena('yanu',0,6);wolf.sim.activateSpecial(wolf.p);for(let i=0;i<30;i++)wolf.sim.yanuTransformationKill(wolf.p);assert.equal(wolf.p.specialState.duration,9);assert.equal(wolf.p.specialState.frenzy.length,5);
});
test('Jo and Lorenzo lock their transformation branches',()=>{
  const jo=arena('jo',0,4);assert.equal(spendPoint(jo.p.progression,TALENTS.jo[6].id),null);jo.sim.activateSpecial(jo.p);assert.equal(jo.p.specialState.branch,0);
  const l=arena('lorenzo',0,3);assert.equal(spendPoint(l.p.progression,TALENTS.lorenzo[12].id),null);l.sim.activateSpecial(l.p);assert.equal(l.p.specialState.branch,0);
});
test('Gustavax new talents have no passive aerial dive outside special',()=>{const {sim,p}=arena('gustavax',2,4);p.z=40;hit(sim,p,'kick');assert.ok(!p.attack.rogueDive);});
