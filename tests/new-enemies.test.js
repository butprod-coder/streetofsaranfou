import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { animation, blankInput, ENEMIES } from '../game/data.js';
import { NEW_SPRITE_IDS } from '../game/new-enemies-data.js';
import { ENCOUNTER_ROSTER, randomEnemyKinds } from '../game/encounters.js';
function arena(kind, x=500) {
  const sim=new Simulation(['jo','yanu'],0,471);
  Object.assign(sim.state,{phase:'fight',enemies:[],props:[],spawnQueue:[],bossCinema:null});
  const p=sim.state.players[0];Object.assign(p,{x:700,y:550,invincible:0,stun:0});
  Object.assign(sim.state.players[1],{x:1100,y:630,invincible:0});
  const e=sim.spawnEnemy(kind,{x,y:550,cooldown:0,invincible:0});
  return {sim,p,e};
}
function advance(sim,e,time){for(let t=0;t<time;t+=1/60){sim.state.time+=1/60;sim.tickActor(e,1/60);sim.updateNewEnemy(e,1/60);sim.updateWorld(1/60);}}
test('all five enemies have sixteen unique frames and participate in randomized waves',()=>{
  for(const kind of NEW_SPRITE_IDS){assert.ok(ENCOUNTER_ROSTER.includes(kind));const frames=['idle','walk','punch','special','hurt','dead'].flatMap(a=>animation(kind,a,true));assert.equal(new Set(frames.map(f=>f.cell)).size,16);assert.ok(frames.every(f=>f.url===`/assets/enemies/new/${kind}.png`));}
  const {sim}=arena('yinyin');const kinds=randomEnemyKinds(0,ENCOUNTER_ROSTER.length,()=>sim.random());assert.equal(new Set(kinds).size,ENCOUNTER_ROSTER.length);
});
test('Yinyin alternates pipe attacks and avoidable cash, corrupting only the hit player',()=>{
  const {sim,p,e}=arena('yinyin',600);sim.updateNewEnemy(e,.01);assert.equal(e.newPattern.kind,'pipe');
  advance(sim,e,1.2);assert.ok(p.hp<p.maxHp);
  e.cooldown=0;e.recovering=0;p.invincible=0;Object.assign(e,{x:600,y:550});p.x=700;p.y=550;
  sim.updateNewEnemy(e,.01);assert.equal(e.newPattern.kind,'cash');advance(sim,e,1.1);
  assert.ok(p.corruptedUntil>sim.state.time);assert.equal(sim.state.players[1].corruptedUntil||0,0);
  p.stun=0;p.attack=null;p.vx=0;const x=p.x;sim.updatePlayer(p,{...blankInput(),x:1},.1);assert.ok(p.x<x);
  sim.state.time=p.corruptedUntil+.1;p.attack=null;const left=p.x;sim.updatePlayer(p,{...blankInput(),x:1},.1);assert.ok(p.x>left);
});
test('Caro heals by eating but a hit interrupts her meal',()=>{
  const {sim,p,e}=arena('caro',520);e.hp=Math.round(e.maxHp*.5);const hp=e.hp;
  sim.updateNewEnemy(e,.01);assert.equal(e.newPattern.kind,'eat');advance(sim,e,1.7);assert.ok(e.hp>hp);
  e.newPattern=null;e.eatReadyAt=0;e.cooldown=0;e.recovering=0;e.hp=hp;
  sim.updateNewEnemy(e,.01);sim.damage(e,1,p,false);assert.equal(e.newPattern,null);const damaged=e.hp;advance(sim,e,1.7);assert.equal(e.hp,damaged);
});
test('Dje locks a long attack lane; changing line avoids the stretching blow',()=>{
  const {sim,p,e}=arena('dje',400);sim.updateNewEnemy(e,.01);assert.equal(e.newPattern.kind,'stretch');p.y=615;
  advance(sim,e,1.1);assert.equal(p.hp,p.maxHp);
  e.newPattern=null;e.cooldown=0;e.recovering=0;p.y=550;
  sim.updateNewEnemy(e,.01);advance(sim,e,1.1);assert.ok(p.hp<p.maxHp);
});
test('wheelchair charge is telegraphed, moves along a locked lane and stops on impact',()=>{
  const {sim,p,e}=arena('karmoilefion',400);sim.updateNewEnemy(e,.01);assert.equal(e.newPattern.kind,'wheel');advance(sim,e,.4);assert.equal(e.x,400);
  advance(sim,e,1);assert.ok(e.x>400);const hazard=sim.state.hazards.find(h=>h.kind==='wheelRush');assert.ok(hazard);
  sim.damage(e,1,p,false);assert.equal(e.newPattern,null);assert.equal(hazard.ttl,0);const x=e.x;advance(sim,e,.1);assert.equal(e.x,x);
});
test('Triso slime roots in place without teleporting; jump escapes and immunity prevents a permanent lock',()=>{
  const {sim,p,e}=arena('triso',400);e.spitTarget={x:p.x,y:p.y};sim.startAttack(e,'special');sim.resolveAttack(e);
  assert.ok(sim.state.hazards.some(h=>h.kind==='slime'&&h.groundGlue));sim.updateWorld(1);sim.updateWorld(.02);
  assert.ok(p.groundGlueUntil>sim.state.time);p.stun=0;p.vx=0;const x=p.x,y=p.y;
  sim.updatePlayer(p,{...blankInput(),x:1},.05);assert.equal(p.x,x);assert.equal(p.y,y);
  sim.updatePlayer(p,{...blankInput(),jump:true},.02);assert.equal(p.groundGlueUntil,0);assert.ok(p.z>0);
  const immune=p.glueImmuneUntil;p.z=0;p.invincible=0;sim.updateWorld(.8);assert.equal(p.glueImmuneUntil,immune);
  p.groundGlueUntil=100;p.corruptedUntil=100;sim.enterStreet();assert.equal(p.groundGlueUntil,0);assert.equal(p.corruptedUntil,0);
});
test('new attacks and status effects serialize deterministically and pause freezes them',()=>{
  const {sim,e}=arena('dje');sim.updateNewEnemy(e,.01);sim.state.players[0].corruptedUntil=2;
  sim.pause(true);const before=sim.snapshot();sim.step();assert.deepEqual(sim.snapshot(),before);
  const restored=new Simulation(['jo','yanu'],0,1);restored.state=JSON.parse(JSON.stringify(before));restored.seed=before.rngSeed;restored.nextId=before.nextEntityId;
  sim.pause(false);restored.pause(false);for(let i=0;i<90;i++){sim.step();restored.step();}assert.deepEqual(restored.snapshot(),sim.snapshot());
});
test('Jualos can recruit new enemies without leaving a hostile charge active',()=>{
  const {sim,e}=arena('karmoilefion',400);sim.updateNewEnemy(e,.01);advance(sim,e,1.2);
  const charge=sim.state.hazards.find(h=>h.kind==='wheelRush');assert.ok(charge);
  const recruiter=sim.makePlayer('jualos',2);sim.state.players.push(recruiter);
  recruiter.specialState={branch:0,rank:6,kind:'jualos',duration:9,elapsed:0};
  assert.equal(sim.recruitJualos(recruiter,e,true),true);assert.equal(e.enemy,false);assert.equal(e.newPattern,null);assert.equal(charge.ttl,0);
});
test('Triolo leaves stationary ground slime after KO and wave completion until it dries',()=>{
  assert.equal(ENEMIES.triso.name,'Triolo');
  const {sim,p,e}=arena('triso',400);e.spitTarget={x:650,y:560};sim.startAttack(e,'special');sim.resolveAttack(e);
  const puddle=sim.state.hazards.find(h=>h.kind==='slime');sim.updateWorld(.7);sim.updateWorld(.02);
  const x=puddle.x,y=puddle.y;sim.damage(e,9999,p,true);assert.ok(sim.state.hazards.includes(puddle));
  sim.step();assert.notEqual(sim.state.phase,'fight');assert.ok(sim.state.hazards.includes(puddle));
  sim.updateWorld(4.6);assert.ok(sim.state.hazards.includes(puddle));assert.equal(puddle.x,x);assert.equal(puddle.y,y);
  sim.updateWorld(4);assert.ok(!sim.state.hazards.includes(puddle));
});
