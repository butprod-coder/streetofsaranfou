import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { applyProfile, normalizeProfile, spendPoint } from '../game/progression.js';
import { JUALOS_BRANCHES } from '../game/jualos-talents.js';
import { TRANSFORMATION_MILESTONES } from '../game/transformation-rules.js';
import { blankInput, FIGHTERS, FLOOR } from '../game/data.js';
import { checkpoint, restoreCheckpoint, validateCheckpoint } from '../game/run-save.js';
function arena(branch=0,rank=6){
  const sim=new Simulation(['jualos','jo'],0,76),p=sim.state.players[0];sim.state.phase='fight';sim.state.props=[];sim.state.enemies=[];sim.state.spawnQueue=[];
  applyProfile(p,{milestones:TRANSFORMATION_MILESTONES,talents:JUALOS_BRANCHES[branch].nodes.slice(0,rank).map(n=>n.id)});Object.assign(p,{x:500,y:550,energy:100,invincible:0});
  const enemy=(x=575,y=550)=>sim.spawnEnemy('remy',{x,y,hp:10000,maxHp:10000,invincible:0,cooldown:0,speed:100});return{sim,p,enemy};
}
function run(sim,p,seconds,input={}){for(let t=0;t<seconds;t+=1/60){sim.state.time+=1/60;if(p.specialState)sim.updateSpecial(p,{...blankInput(),...input},1/60);sim.updateWorld(1/60);}}
test('every new game starts with one point; Jualos locks its chosen branch',()=>{
  for(const f of FIGHTERS)assert.equal(new Simulation([f.id]).state.players[0].progression.points,1);
  const first=spendPoint(normalizeProfile({},'jualos'),JUALOS_BRANCHES[2].nodes[0].id);assert.equal(first.points,0);
  assert.equal(spendPoint({...first,milestones:TRANSFORMATION_MILESTONES},JUALOS_BRANCHES[0].nodes[0].id),null);
});
test('all 18 Jualos ranks respect energy, 5/7/9 durations and friendly fire',()=>{
  for(let branch=0;branch<3;branch++)for(let rank=1;rank<=6;rank++){
    const {sim,p,enemy}=arena(branch,rank);enemy();const partner=sim.state.players[1],hp=partner.hp;
    p.energy=99;assert.equal(sim.activateSpecial(p),false);p.energy=100;assert.equal(sim.activateSpecial(p),true);assert.equal(p.energy,0);
    const duration=rank===6?9:rank>=4?7:5;assert.equal(p.specialState.duration,duration);run(sim,p,duration-.1);assert.ok(p.specialState);run(sim,p,.2);assert.equal(p.specialState,null);assert.equal(p.z,0);assert.equal(partner.hp,hp);assert.doesNotThrow(()=>JSON.stringify(sim.snapshot()));
  }
});
test('commercial recruits one weak target, N2 speeds attacks, N3 allows two',()=>{
  const {sim,p,enemy}=arena(0,3),a=enemy(),b=enemy(590),c=enemy(610);sim.activateSpecial(p);
  assert.equal(sim.recruitJualos(p,a),true);assert.equal(sim.recruitJualos(p,b),true);assert.equal(sim.recruitJualos(p,c),false);assert.equal(sim.state.enemies.length,1);
  a.x=c.x-20;sim.updateWorld(.2);assert.ok(c.hp<10000);assert.ok(a.cooldown<=.42);assert.equal(a.aggressive,true);
  const single=arena(0,1),one=single.enemy(),two=single.enemy();single.sim.activateSpecial(single.p);assert.equal(single.sim.recruitJualos(single.p,one),true);assert.equal(single.sim.recruitJualos(single.p,two),false);
});
test('temporary recruits return to enemies; long contract lasts four extra seconds',()=>{
  for(const rank of [1,4]){const {sim,p,enemy}=arena(0,rank),e=enemy();sim.activateSpecial(p);sim.recruitJualos(p,e);sim.endSpecial(p);run(sim,p,.1);
    assert.equal(sim.state.allies.length,rank===4?1:0);run(sim,p,4.1);assert.equal(sim.state.allies.length,0);assert.equal(sim.state.enemies[0].id,e.id);assert.equal(sim.state.kills,0);}
});
test('permanent recruits survive special, streets and checkpoint with sanitized data',()=>{
  const {sim,p,enemy}=arena(0,5),e=enemy();sim.activateSpecial(p);sim.recruitJualos(p,e);sim.endSpecial(p);run(sim,p,15);assert.equal(sim.state.allies.length,1);
  sim.enterStreet();assert.equal(sim.state.allies.length,1);const save=checkpoint(sim.snapshot()),restored=restoreCheckpoint(save);assert.equal(restored.state.allies.length,1);assert.equal(restored.state.allies[0].permanent,true);assert.equal(restored.state.allies[0].kind,'remy');
  const forged=structuredClone(save);forged.players[0].recruits.push({kind:'__proto__',health:1});assert.equal(validateCheckpoint(forged).players[0].recruits.length,1);
});
test('OPA recruits every nearby ordinary enemy but excludes boss, elites and distant enemies',()=>{
  const {sim,p,enemy}=arena();for(let i=0;i<5;i++)enemy(530+i*15);const boss=enemy(600);boss.boss=true;const elite=enemy(610);elite.elite=true;const distant=enemy(1150);
  sim.activateSpecial(p);assert.equal(sim.state.allies.length,5);assert.deepEqual(sim.state.enemies.map(e=>e.id),[boss.id,elite.id,distant.id]);
  p.x=100;const a=sim.state.allies[0];distant.x=a.x;const hp=a.hp;sim.updateJualosRecruitTarget(distant,.1);assert.ok(a.hp<hp);assert.equal(distant.action,'punch');
});
test('pig snout launches, low-rank charge stops and wild charge hits multiple',()=>{
  const {sim,p,enemy}=arena(1,2),e=enemy();sim.activateSpecial(p);run(sim,p,.02,{punch:true});assert.ok(e.vx>=600);
  run(sim,p,.02,{kick:true});run(sim,p,.02);assert.equal(p.specialState.chargeUntil,0);
  const wild=arena(1,4),a=wild.enemy(),b=wild.enemy(660);wild.sim.activateSpecial(wild.p);run(wild.sim,wild.p,.55,{kick:true});assert.ok(a.hp<10000&&b.hp<10000);assert.ok(wild.p.x>800);
});
test('pig rolls directionally, slams radially and finishes with screen charge',()=>{
  const {sim,p,enemy}=arena(1,5),e=enemy(450);sim.activateSpecial(p);run(sim,p,.1,{x:-1,dodge:true});assert.ok(p.x<500);assert.equal(p.specialState.pose,5);
  run(sim,p,.7,{jump:true});assert.ok(e.hp<10000);assert.equal(p.z,0);
  const mega=arena(1),far=mega.enemy(1100);mega.sim.activateSpecial(mega.p);run(mega.sim,mega.p,9.1);assert.ok(far.hp<10000);assert.ok(mega.p.x>FLOOR.right-60);
});
test('guitar first wave stops, distortion pierces and rank five emits both directions',()=>{
  for(const rank of [1,2,5]){const {sim,p,enemy}=arena(2,rank),a=enemy(570),b=enemy(650),behind=enemy(400);sim.activateSpecial(p);sim.jualosChord(p);assert.equal(sim.state.jualosWaves.length,rank>=5?2:1);run(sim,p,.5);assert.ok(a.hp<10000);assert.equal(b.hp<10000,rank>=2);assert.equal(behind.hp<10000,rank>=5);}
});
test('charged feedback stuns; ultimate final chord fires only once across the arena',()=>{
  const {sim,p,enemy}=arena(2,3),e=enemy();sim.activateSpecial(p);run(sim,p,.6,{kick:true});assert.ok(e.stun>=1);assert.ok(p.specialState.feedbackUntil>p.specialState.elapsed);
  const concert=arena(2),far=concert.enemy(1180);concert.sim.activateSpecial(concert.p);run(concert.sim,concert.p,8.1);assert.ok(far.hp<10000);const hp=far.hp;run(concert.sim,concert.p,.8);assert.equal(far.hp,hp);assert.equal(concert.p.specialState.pose,7);
});
test('Jualos world state is deterministic after network snapshot continuation',()=>{
  const {sim,p,enemy}=arena(2,5);enemy();sim.activateSpecial(p);run(sim,p,.2,{punch:true});const copy=new Simulation(['jualos','jo'],0,76);copy.state=structuredClone(sim.state);copy.nextId=sim.nextId;copy.seed=sim.seed;
  run(sim,p,.5);run(copy,copy.state.players[0],.5);assert.deepEqual(copy.state,sim.state);
});
