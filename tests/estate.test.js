import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { neighborhoodPlan, cleanNeighborhood, neighborhoodChoices } from '../game/neighborhood-events.js';
import { ESTATE_KINDS } from '../game/estate-events.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
import { blankInput } from '../game/data.js';
function arena(kind,team=['jo']) {const g=new Simulation(team,1,123);g.state.estate.plan=[{stage:1,kind},{stage:3,kind:kind==='picnic'?'sluice':'picnic'}];g.state.stage=1;g.enterStreet();g.state.wave=0;g.spawnWave();return g;}
function act(g,id,slot=0){const p=g.state.players[slot],c=neighborhoodChoices(g.state.neighborhoodEncounter).find(c=>c.id===id);p.x=c.x;p.y=c.y;g.interactNeighborhood(p);}
function win(g){g.state.enemies=[];g.state.spawnQueue=[];g.step();}
test('estate draws two distinct events independently and preserves first neighborhood',()=>{
 const seen=new Set();for(let seed=0;seed<80;seed++){const a=neighborhoodPlan(seed),b=neighborhoodPlan(seed,1);assert.deepEqual(b,neighborhoodPlan(seed,1));assert.ok(b.plan.every(p=>ESTATE_KINDS.includes(p.kind)));assert.equal(new Set(b.plan.map(p=>p.kind)).size,2);seen.add(b.plan.map(p=>p.kind).join(','));assert.ok(a.plan.every(p=>!ESTATE_KINDS.includes(p.kind)));}
 assert.ok(seen.size>=10);
 const g=new Simulation(['jo'],1,2);for(let stage=0;stage<6;stage++){g.state.stage=stage;g.enterStreet();assert.equal(g.state.waves.filter(w=>w.neighborhood).length,[1,3].includes(stage)?1:0);}
 g.state.chapter=4;g.state.stage=0;g.enterStreet();assert.equal(g.state.waves.some(w=>w.neighborhood),false);
});
test('all estate choices are optional and require both coop approvals',()=>{
 for(const kind of ESTATE_KINDS){const g=arena(kind,['jo','yanu']);act(g,'accept');assert.equal(g.state.neighborhoodEncounter.status,'choice');act(g,'skip',1);assert.equal(g.state.phase,'rest');assert.equal(g.state.neighborhoodEncounter.status,'skipped');assert.equal(g.state.players[0].progression.xp,0);}
});
test('picnic is charged atomically, rejects insufficient energy and preserves deferred gift',()=>{
 const g=arena('picnic',['jo','yanu']);g.state.players.forEach(p=>{p.energy=40;p.hp=40;});g.state.players[1].energy=10;act(g,'accept');act(g,'accept',1);assert.equal(g.state.players[0].energy,40);assert.equal(g.state.neighborhoodEncounter.status,'choice');
 g.state.players[1].energy=30;act(g,'accept');act(g,'accept',1);assert.deepEqual(g.state.players.map(p=>p.energy),[15,5]);assert.deepEqual(g.state.players.map(p=>p.hp),[75,75]);assert.equal(g.state.estate.helpStage,2);
 const resumed=restoreCheckpoint(checkpoint(g.snapshot()));assert.deepEqual(resumed.state.estate,g.state.estate);resumed.state.stage=2;resumed.enterStreet();resumed.spawnWave();assert.equal(resumed.state.pickups.filter(p=>p.kind==='food'&&p.amount===25).length,2);resumed.estateAssist();assert.equal(resumed.state.pickups.filter(p=>p.amount===25).length,2);
});
test('two sluices stun enemies and charge energy only once',()=>{
 const g=arena('sluice'),p=g.state.players[0];act(g,'accept');const e=g.spawnEnemy('remy',{x:700,y:540});
 p.x=450;p.y=490;g.interactNeighborhood(p);assert.equal(p.energy,0);g.interactNeighborhood(p);assert.equal(g.state.neighborhoodEncounter.switches.length,1);
 p.x=930;p.y=600;g.interactNeighborhood(p);assert.equal(p.energy,30);assert.equal(e.stun,3);g.interactNeighborhood(p);assert.equal(p.energy,30);win(g);assert.equal(g.state.neighborhoodEncounter.status,'success');
 const missed=arena('sluice');act(missed,'accept');win(missed);assert.equal(missed.state.phase,'rest');assert.equal(missed.state.neighborhoodEncounter.status,'missed');
});
test('each freed duck interrupts nearby enemies and yields a single small meal at victory',()=>{
 const g=arena('poachers'),p=g.state.players[0];act(g,'accept');const e=g.spawnEnemy('remy',{x:440,y:510});p.x=420;p.y=500;g.interactNeighborhood(p);g.interactNeighborhood(p);assert.equal(e.stun,2.5);assert.equal(g.state.neighborhoodEncounter.released.length,1);
 win(g);assert.equal(g.state.pickups.filter(p=>p.amount===15).length,1);assert.equal(g.state.neighborhoodEncounter.status,'missed');g.finishNeighborhoodWave();assert.equal(g.state.pickups.filter(p=>p.amount===15).length,1);
});
test('petanque limits throws, rewards timing, supports stopping and pauses its cursor',()=>{
 const g=arena('petanque',['jo','yanu']);act(g,'accept');act(g,'accept',1);const e=g.state.neighborhoodEncounter,p=g.state.players[0];p.x=510;p.y=550;
 for(let i=0;i<3;i++){e.elapsed=i*Math.PI/2.3;e.nextThrow=0;g.interactNeighborhood(p);}
 assert.equal(e.shots[p.id],3);assert.equal(p.energy,45);g.interactNeighborhood(p);assert.equal(p.energy,45);assert.equal(g.state.phase,'encounter');
 g.pause(true);const before=e.elapsed;g.step();assert.equal(e.elapsed,before);g.pause(false);
 const q=g.state.players[1];q.x=1040;q.y=615;g.interactNeighborhood(q);assert.equal(g.state.phase,'rest');assert.equal(g.state.players[0].progression.xp,0);
});
test('estate save import rejects mixed chapter plans and resume does not reroll choices',()=>{
 assert.deepEqual(cleanNeighborhood(neighborhoodPlan(7),7,1),neighborhoodPlan(7,1));
 const g=arena('poachers');g.state.phase='rest';g.state.wave=0;const resumed=restoreCheckpoint(checkpoint(g.snapshot()));assert.deepEqual(resumed.state.waves,g.state.waves);assert.deepEqual(resumed.state.estate,g.state.estate);
 assert.equal(checkpoint(arena('petanque').snapshot()),null);
});

test('coop players can throw simultaneously without consuming each other’s cooldown',()=>{
 const g=arena('petanque',['jo','yanu']);act(g,'accept');act(g,'accept',1);
 const e=g.state.neighborhoodEncounter;e.elapsed=0;
 for(const p of g.state.players){p.x=510;p.y=550;g.interactNeighborhood(p);}
 assert.deepEqual(e.shots,{1:1,2:1});assert.deepEqual(g.state.players.map(p=>p.energy),[15,15]);
 for(const p of g.state.players)g.interactNeighborhood(p);
 assert.deepEqual(e.shots,{1:1,2:1});
});
