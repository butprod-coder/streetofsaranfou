import { KARONUX_MILESTONES } from '../game/karonux-talents.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput, FLOOR } from '../game/data.js';
import { TALENTS, applyProfile } from '../game/progression.js';
import { TALENT_ART, talentIcon } from '../game/talent-icons.js';

function arena(kind='jo',duo=false){
  const sim=new Simulation(duo?[kind,kind]:[kind],0,731);sim.spawnWave();sim.state.props=[];sim.state.enemies=[];sim.state.spawnQueue=[];
  const p=sim.state.players[0];p.x=500;p.y=550;p.invincible=0;
  const e=sim.spawnEnemy('remy',{x:580,y:550,hp:10000,maxHp:10000,cooldown:999,speed:0,invincible:0});
  if(['karonux','lorenzo','jualos','yanu','jo','kikor','gustavax'].includes(kind)) applyProfile(p,{milestones:KARONUX_MILESTONES,talents:[TALENTS[kind][0].id]});
  return {sim,p,e};
}
function hit(sim,p,type='punch'){p.attack=null;p.cooldown=0;sim.startAttack(p,type);sim.resolveAttack(p);p.attack=null;}

test('the first point is available at startup and never duplicated by the first street',()=>{
  const sim=new Simulation(['jo','karonux']);assert.deepEqual(sim.state.players.map(p=>p.progression.points),[1,1]);
  sim.awardXP(1000,'xp');assert.deepEqual(sim.state.players.map(p=>p.progression.points),[1,1]);
  sim.state.players[1].hp=0;sim.clearStreet();sim.clearStreet();assert.deepEqual(sim.state.players.map(p=>p.progression.points),[1,1]);
  sim.state.stage=1;sim.clearStreet();assert.deepEqual(sim.state.players.map(p=>p.progression.points),[1,1]);
});
test('energy starts empty and does not regenerate with time, received damage, waves or chapters',()=>{
  const {sim,p,e}=arena();assert.equal(p.energy,0);for(let i=0;i<300;i++)sim.step([blankInput()]);assert.equal(p.energy,0);
  sim.damage(p,8,e,false);assert.equal(p.energy,0);
  p.energy=21;sim.state.enemies=[];sim.step();assert.equal(p.energy,21);
  sim.state.phase='transition';sim.state.phaseTime=0;sim.state.stage=5;sim.step();assert.equal(p.energy,21);
});
test('punches, kicks and weapons charge only on successful enemy hits, capped at 100',()=>{
  const {sim,p,e}=arena();hit(sim,p);assert.equal(p.energy,7);e.x=p.x+80;e.y=p.y;hit(sim,p,'kick');assert.equal(p.energy,14);
  e.x=1000;hit(sim,p);assert.equal(p.energy,14);e.x=p.x+80;e.invincible=1;hit(sim,p);assert.equal(p.energy,14);
  e.invincible=0;p.weapon={kind:'bat',uses:8};hit(sim,p);assert.equal(p.energy,21);
  p.energy=98;e.x=p.x+80;hit(sim,p);assert.equal(p.energy,100);
});
test('all seven specials require a full bar, empty it and have no additional recharge timer',()=>{
  for(const kind of Object.keys(TALENTS)){
    const {sim,p}=arena(kind);p.energy=99;assert.equal(sim.activateSpecial(p),false);assert.equal(p.specialState,null);assert.equal(p.energy,99);
    p.energy=100;sim.activateSpecial(p);assert.ok(p.specialState,kind);assert.equal(p.energy,0);assert.equal(p.specialCd,0);
    for(let i=0;i<70;i++)if(p.specialState){sim.state.time+=.1;sim.updateSpecial(p,blankInput(),.1);sim.updateWorld(.1);}
    assert.equal(p.energy,0,kind);assert.equal(sim.activateSpecial(p),false);
    p.energy=100;sim.activateSpecial(p);assert.ok(p.specialState,kind);
  }
});
test('special attacks, burns and summons do not fill the bar; cans restore energy',()=>{
  const {sim,p,e}=arena('yanu');p.energy=100;sim.activateSpecial(p);hit(sim,p);assert.equal(p.energy,0);
  sim.endSpecial(p);sim.rogueBurn(p,e);sim.updateRogueWorld(1);assert.equal(p.energy,0);
  sim.rogueSummon(p,'wolf',1,3);sim.state.allies[0].x=e.x;sim.state.allies[0].y=e.y;sim.state.allies[0].emerging=0;sim.updateWorld(.1);assert.equal(p.energy,0);
  p.hp-=20;const hp=p.hp;sim.state.pickups=[{kind:'energy',x:p.x,y:p.y}];sim.collectPickups();assert.equal(p.energy,25);assert.equal(p.hp,hp);
});

test('each enemy death rolls once for food, energy or no loot',()=>{
  for(const [roll,kind] of [[0,'food'],[.099,'food'],[.10,'energy'],[.199,'energy'],[.20,null],[.99,null]]){
    const {sim,p,e}=arena();sim.random=()=>roll;sim.state.pickups=[];
    sim.damage(e,20000,p,false);assert.deepEqual(sim.state.pickups.map(i=>i.kind),kind?[kind]:[]);
    sim.damage(e,20000,p,false);assert.equal(sim.state.pickups.length,kind?1:0);
  }
});

test('consumables stay when full and restore only their own capped resource',()=>{
  const {sim,p}=arena();p.energy=100;
  sim.state.pickups=[{kind:'food',x:p.x,y:p.y},{kind:'energy',x:p.x,y:p.y}];sim.collectPickups();assert.equal(sim.state.pickups.length,2);
  p.energy=99;sim.collectPickups();assert.equal(p.energy,100);assert.equal(sim.state.pickups.length,1);
  p.hp-=50;sim.collectPickups();assert.equal(p.hp,p.maxHp-15);assert.equal(sim.state.pickups.length,0);
});
test('coop energy belongs to the attacking player only',()=>{
  const {sim,p}=arena('jo',true),ally=sim.state.players[1];hit(sim,p);assert.equal(p.energy,7);assert.equal(ally.energy,0);
});
test('vertical driving uses swept collision and releases at the new position',()=>{
  const {sim,p,e}=arena('karonux');p.y=FLOOR.bottom;e.x=p.x;e.y=FLOOR.top+15;p.energy=100;sim.activateSpecial(p);
  sim.updateSpecial(p,{...blankInput(),y:-1},1.05);assert.ok(e.hp<e.maxHp);assert.equal(p.x,500);const position=p.y;
  sim.updateSpecial(p,blankInput(),4);assert.equal(p.y,position);assert.equal(p.specialState,null);
});
test('diagonal driving is normalized',()=>{
  const straight=arena('karonux'),diagonal=arena('karonux');
  for(const {sim,p} of [straight,diagonal]){p.energy=100;sim.activateSpecial(p);sim.updateSpecial(p,blankInput(),.25);}
  straight.sim.updateSpecial(straight.p,{...blankInput(),x:1},.1);diagonal.sim.updateSpecial(diagonal.p,{...blankInput(),x:1,y:1},.1);
  assert.ok(diagonal.p.x-500<straight.p.x-500);assert.ok(diagonal.p.y>550);
});
test('steered Golf resumes identically from a network snapshot mid-special',()=>{
  const {sim,p}=arena('karonux',true);p.energy=100;sim.activateSpecial(p);
  for(let i=0;i<35;i++)sim.step([{...blankInput(),x:1,y:-.25},blankInput()]);
  const replica=new Simulation(['karonux','karonux'],0,731);replica.state=structuredClone(sim.state);replica.seed=sim.seed;replica.nextId=sim.nextId;
  for(let i=0;i<180;i++){const inputs=[{...blankInput(),x:i%80<40?-1:1,y:i%50<25?.5:-.5},blankInput()];sim.step(inputs);replica.step(inputs);}
  assert.deepEqual(replica.snapshot(),sim.snapshot());
});
test('all 126 talent illustrations are explicitly mapped, distinct and meaningful by name',()=>{
  const images=new Set(),motifs=new Set();
  for(const [kind,nodes] of Object.entries(TALENTS))for(const n of nodes){assert.ok((TALENT_ART[`${kind}:${n.name}`]||TALENT_ART[n.name]),n.name);const svg=talentIcon(kind,n);assert.match(svg,/<svg/);assert.match(svg,/data-talent-art=/);images.add(svg);motifs.add((TALENT_ART[`${kind}:${n.name}`]||TALENT_ART[n.name]).join('-'));}
  assert.equal(images.size,126);assert.equal(motifs.size,126);
});
