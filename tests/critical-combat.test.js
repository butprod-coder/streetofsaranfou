import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../game/simulation.js';
import {ATTRIBUTES,applyProfile,bonuses,normalizeProfile} from '../game/progression.js';
import {checkpoint,restoreCheckpoint} from '../game/run-save.js';
function arena(chance=1){
 const sim=new Simulation(['jo','yanu'],0,721);Object.assign(sim.state,{phase:'fight',bossCinema:null,enemies:[],spawnQueue:[],props:[],hazards:[]});
 const p=sim.state.players[0];Object.assign(p,{x:500,y:550,invincible:0});p.bonuses.criticalChance=chance;
 const enemy=(x=550)=>sim.spawnEnemy('remy',{x,y:550,hp:1000,maxHp:1000,invincible:0,cooldown:999});
 return {sim,p,enemy};
}
test('eight stats retain a 72 point budget and precision, weapons and healing have distinct effects',()=>{
 assert.equal(Object.keys(ATTRIBUTES).length,8);
 const profile=normalizeProfile({completed:[0,1,2,3,4,5],attributes:{precision:10,weaponMastery:10,recovery:10}}),b=bonuses(profile);
 assert.equal(profile.statPoints,42);assert.equal(b.criticalChance,.25);assert.equal(b.weaponPower,1.4);assert.equal(b.healing,1.5);
 assert.equal(bonuses({}).criticalChance,.05);
});
test('one melee attack shares its roll across victims, multiplies damage only and resets for next attack',()=>{
 const {sim,p,enemy}=arena(),a=enemy(),b=enemy(570);p.attack={type:'punch'};
 sim.damage(a,20,p,false);const seed=sim.state.criticalSeed;sim.state.time+=.02;sim.damage(b,20,p,false);
 assert.equal(a.hp,970);assert.equal(b.hp,970);assert.equal(sim.state.criticalSeed,seed);assert.equal(a.stun,b.stun);assert.equal(a.vx,b.vx);
 p.attack={type:'punch'};sim.damage(a,20,p,false);assert.notEqual(sim.state.criticalSeed,seed);
 const event=sim.state.events.find(e=>e.type==='hit');assert.equal(event.critical,true);assert.equal(event.criticalVisual,true);
});
test('enemy hits never crit and shields or boss cinematics never consume rolls',()=>{
 const {sim,p,enemy}=arena(),e=enemy();sim.damage(p,20,e,true);assert.equal(sim.state.criticalSeed,undefined);
 sim.state.bossCinema={};sim.damage(e,20,p,true);assert.equal(e.hp,1000);assert.equal(sim.state.criticalSeed,undefined);
 sim.state.bossCinema=null;e.kind='remyGeek';e.remyShielded=true;sim.damage(e,20,p,true);assert.equal(e.hp,1000);assert.equal(sim.state.criticalSeed,undefined);
});
test('fire rolls at creation and retains one critical result over pulses and a saved snapshot',()=>{
 const {sim,p,enemy}=arena(),e=enemy();const h=sim.hazard(p,{x:550,y:550,kind:'fire',radius:100,damage:20,delay:0,ttl:3,pulse:.3});
 assert.equal(h.critical,true);const seed=sim.state.criticalSeed;p.bonuses.criticalChance=0;
 sim.state.time=.1;sim.updateWorld(.1);assert.equal(e.hp,970);assert.equal(sim.state.criticalSeed,seed);
 const copy=new Simulation(['jo','yanu'],0,721);copy.state=structuredClone(sim.state);copy.seed=sim.seed;copy.nextId=sim.nextId;
 for(const s of [sim,copy]){s.state.time=.5;s.updateWorld(.4);}
 assert.equal(e.hp,940);assert.deepEqual(copy.state,sim.state);
});
test('summons inherit owner precision and use quieter critical feedback',()=>{
 const {sim,p,enemy}=arena(),e=enemy();const summon={id:999,owner:p.id,ally:true,x:500,y:550,facing:1};
 sim.damage(e,20,summon,false,false,{summoned:true});assert.equal(e.hp,970);
 assert.equal(sim.state.events.find(e=>e.type==='hit').quietCritical,true);
});
test('heavy weapons scale with mastery and share one roll over explosion targets',()=>{
 const {sim,p,enemy}=arena(),e=enemy();applyProfile(p,{completed:[0],attributes:{weaponMastery:10}});p.bonuses.criticalChance=1;
 sim.fireHeavyWeapon(p,'bazooka');const shot=sim.state.weaponProjectiles[0];assert.equal(shot.critical,true);
 const expected=shot.damage;shot.x=e.x;shot.y=e.y;const other=enemy(580);sim.explodeWeapon(shot,p);
 assert.equal(e.hp,1000-Math.round(expected*1.5));assert.equal(other.hp,e.hp);
});
test('recovery amplifies food and healing while respecting missing health and never reviving',()=>{
 const {sim,p}=arena();applyProfile(p,{completed:[0],attributes:{recovery:10}});p.hp=10;
 assert.equal(sim.healPlayer(p,20),30);assert.equal(p.hp,40);
 p.hp=p.maxHp-5;assert.equal(sim.healPlayer(p,20),5);
 p.hp=0;assert.equal(sim.healPlayer(p,20),0);assert.equal(p.hp,0);
});
test('critical RNG is independent from AI RNG and matches configured probability',()=>{
 const {sim,p}=arena(.25);const aiSeed=sim.seed;let hits=0;
 for(let i=0;i<20000;i++)if(sim.rollCritical(p,{}))hits++;
 assert.equal(sim.seed,aiSeed);assert.ok(hits>4700&&hits<5300,String(hits));
});
test('checkpoints preserve the next critical roll and new investments',()=>{
 const {sim,p}=arena();applyProfile(p,{completed:[0,1],attributes:{precision:10,recovery:10}});
 sim.rollCritical(p,{});sim.state.enemies=[];sim.state.phase='rest';
 const restored=restoreCheckpoint(checkpoint(sim.state));
 assert.equal(restored.state.players[0].progression.attributes.precision,10);
 assert.equal(restored.state.players[0].progression.attributes.recovery,10);
 assert.equal(restored.rollCritical(restored.state.players[0],{}),sim.rollCritical(p,{}));
 assert.equal(restored.state.criticalSeed,sim.state.criticalSeed);
});
