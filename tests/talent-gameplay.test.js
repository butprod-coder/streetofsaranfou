import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { TALENTS,applyProfile } from '../game/progression.js';
import { blankInput, FLOOR } from '../game/data.js';
function arena(kind,branch,rank=6,level=3){
 const sim=new Simulation([kind,'jo'],0,347),p=sim.state.players[0];
 Object.assign(sim.state,{phase:'fight',props:[],spawnQueue:[],enemies:[],bossCinema:null});
 const nodes=TALENTS[kind].filter(n=>n.branchIndex===branch&&n.tier<rank);
 applyProfile(p,{milestones:Array.from({length:24},(_,i)=>`encounter:0:0:0:${i}`),talents:nodes.map(n=>n.id),talentRanks:Object.fromEntries(nodes.map(n=>[n.id,level]))});
 p.energy=100;p.x=500;p.y=550;p.invincible=0;
 const enemy=(x=600,y=550)=>sim.spawnEnemy('remy',{x,y,hp:10000,maxHp:10000,invincible:0,cooldown:999,speed:0});
 sim.activateSpecial(p);return {sim,p,enemy};
}
function tick(sim,input=blankInput(),dt=.02){sim.state.time+=dt;const p=sim.state.players[0];if(p.specialState)sim.updateSpecial(p,input,dt);sim.updateWorld(dt);}

test('all 21 fully upgraded branches stay bounded, protect partners, expire and resume deterministically',()=>{
 for(const kind of Object.keys(TALENTS))for(let branch=0;branch<3;branch++){
  const {sim,p,enemy}=arena(kind,branch);for(let i=0;i<8;i++)enemy(300+i*85,490+(i%3)*45);
  const partner=sim.state.players[1],hp=partner.hp;
  const input=i=>({...blankInput(),x:i%60<30?1:-1,y:i%80<40?.4:-.4,punch:i%9<4,kick:i%27<15,dodge:i%40===0,jump:i%55===0,special:i%140===0});
  for(let i=0;i<75;i++)tick(sim,input(i));
  const copy=new Simulation([kind,'jo'],0,347);copy.state=structuredClone(sim.state);copy.seed=sim.seed;copy.nextId=sim.nextId;
  for(let i=75;i<700;i++){
   tick(sim,input(i));tick(copy,input(i));
   assert.ok(Number.isFinite(p.x)&&p.x>=FLOOR.left&&p.x<=FLOOR.right,`${kind}/${branch} x`);
   assert.ok(Number.isFinite(p.y)&&p.y>=FLOOR.top&&p.y<=FLOOR.bottom,`${kind}/${branch} y`);
  }
  assert.deepEqual(copy.state,sim.state,`${kind}/${branch} snapshot determinism`);
  assert.equal(partner.hp,hp,`${kind}/${branch} friendly fire`);assert.equal(p.specialState,null);
  assert.ok(sim.state.allies.length<=24);assert.ok((sim.state.yanuPlants||[]).length<=14);
 }
});

test('input just before recharge is buffered once, and short network taps still attack',()=>{
 const {sim,p,enemy}=arena('gustavax',0,1,1),e=enemy(580);
 p.specialState.nextAttack=.1;
 tick(sim,{punch:true},.02);assert.equal(e.hp,10000);
 for(let i=0;i<5;i++)tick(sim,{},.02);
 assert.ok(e.hp<10000);const hp=e.hp;tick(sim,{},.02);assert.equal(e.hp,hp);
 p.specialState.nextAttack=0;tick(sim,{taps:{punch:1}},.02);assert.ok(e.hp<hp);
});

test('frost upgrades reduce required hits and charged ice trail actually shatters frozen foes',()=>{
 const {sim,p,enemy}=arena('karonux',1,3),e=enemy(500);
 sim.karonuxFrost(p,e,1);sim.karonuxFrost(p,e,1);assert.ok(e.karonuxFrost.frozenUntil>sim.state.time);
 const hp=e.hp;sim.state.karonuxTrails=[{owner:p.id,x:e.x,y:e.y,until:10}];sim.updateKaronuxWorld(.02);assert.ok(e.hp<hp);assert.equal(e.karonuxFrost,null);
});

test('unarmed enemies supply energy only once through improved pickpocketing',()=>{
 const {sim,p,enemy}=arena('jo',2,3),e=enemy();sim.joBackstab(p,e);assert.equal(p.energy,8);
 const power=e.power;sim.joBackstab(p,e);assert.equal(p.energy,8);assert.equal(e.power,power);
});

test('all three summoning trees grow their capacity from actual stars',()=>{
 {const {sim,p,enemy}=arena('jualos',0,3);for(let i=0;i<5;i++)sim.recruitJualos(p,enemy(600+i*15));assert.equal(sim.state.allies.filter(e=>e.recruit).length,4);}
 {const {sim,p}=arena('kikor',1,2);for(let i=0;i<8;i++)sim.spawnKikorMinion(p);assert.equal(sim.state.allies.filter(e=>e.kikorSummon).length,4);assert.equal(sim.state.allies[0].maxHp,60);}
 {const {sim}=arena('gustavax',1,2);assert.equal(sim.state.allies.filter(e=>e.gustavaxMinion).length,4);assert.equal(sim.state.allies[0].maxHp,105);}
});

test('plants mature after two bites and reproduce without requiring a kill',()=>{
 const {sim,p,enemy}=arena('yanu',2,5),e=enemy(575);const plant=sim.state.yanuPlants[0];
 for(let i=0;i<2;i++){sim.state.time=plant.nextBite+.01;sim.updateYanuWorld(.02);}
 assert.equal(plant.giant,true);assert.ok(e.hp>0);assert.equal(sim.state.yanuPlants.length,2);
});

test('Kikor selects creatures directionally and ordinary drawings attack twice',()=>{
 const {sim,p,enemy}=arena('kikor',0,5);enemy(600,500);
 tick(sim,{y:-1},.02);sim.drawKikorCreature(p);assert.equal(sim.state.kikorDrawings.at(-1).variant,1);
 tick(sim,{y:1},.02);sim.drawKikorCreature(p);assert.equal(sim.state.kikorDrawings.at(-1).variant,2);
 const drawing=sim.state.kikorDrawings[0];drawing.x=600;drawing.y=500;drawing.age=.4;
 sim.updateKikorWorld(.02);assert.equal(drawing.attacks,1);assert.equal(drawing.attacked,false);
 sim.state.time=drawing.nextAttack+.01;sim.updateKikorWorld(.02);assert.equal(drawing.attacks,2);assert.equal(drawing.attacked,true);
});

test('boss-like summons do not create extra talent rewards',()=>{
 const {sim,p,enemy}=arena('jo',0);const points=p.progression.points,e=enemy();e.boss=true;e.owner=999;e.hp=1;
 sim.damage(e,100,p,true);assert.equal(p.progression.points,points);
});
