import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput } from '../game/data.js';
import { neighborhoodPlan, cleanNeighborhood, neighborhoodChoices } from '../game/neighborhood-events.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';

function encounter(kind, team=['jo']) {
  const g=new Simulation(team,0,42);
  g.state.neighborhood.plan=[{stage:1,kind},{stage:3,kind:kind==='merchant'?'parking':'merchant'}];
  g.state.stage=1;g.enterStreet();g.state.wave=0;g.spawnWave();
  return g;
}
function choose(g,id,slot=0) {
  const p=g.state.players[slot],c=neighborhoodChoices(g.state.neighborhoodEncounter).find(c=>c.id===id);
  p.x=c.x;p.y=c.y;
  g.step(g.state.players.map(()=>blankInput()));
  g.step(g.state.players.map((_,i)=>({...blankInput(),interact:i===slot})));
}
function win(g) { g.state.enemies=[];g.state.spawnQueue=[];g.step(); }

test('two distinct seeded encounters replace waves only in the first neighborhood',()=>{
  const seen=new Set();
  for(let seed=1;seed<100;seed++){
    const plan=neighborhoodPlan(seed);assert.deepEqual(plan,neighborhoodPlan(seed));assert.equal(new Set(plan.plan.map(p=>p.kind)).size,2);seen.add(plan.plan.map(p=>p.kind).join(','));
    const g=new Simulation(['jo'],0,seed);
    for(let stage=0;stage<6;stage++){g.state.stage=stage;g.enterStreet();assert.equal(g.state.waves.filter(w=>w.neighborhood).length,[1,3].includes(stage)?1:0);assert.equal(g.state.waves.length,stage===5?4:3);}
    g.state.chapter=4;g.state.stage=0;g.enterStreet();assert.equal(g.state.waves.some(w=>w.neighborhood),false);assert.equal(g.state.surpriseDone,false);
  }
  assert.ok(seen.size>=10);
});
test('merchant gifts are individual, free and cannot be collected twice in coop',()=>{
  const g=encounter('merchant',['jo','yanu']);g.state.players[0].hp=40;
  choose(g,'food');assert.equal(g.state.players[0].hp,75);assert.equal(g.state.phase,'encounter');
  choose(g,'food');assert.equal(g.state.players[0].hp,75);
  choose(g,'bat',1);assert.equal(g.state.players[1].weapon.kind,'bat');assert.equal(g.state.phase,'rest');
  assert.equal(g.state.players[0].progression.xp,0);assert.equal(g.state.neighborhood.outcomes.length,1);
});
test('risk is opt-in for both players and one refusal safely skips the replacement',()=>{
  for(const kind of ['rescue','parking']) {
    const g=encounter(kind,['jo','yanu']);choose(g,'accept');assert.equal(g.state.enemies.length,0);assert.equal(g.state.phase,'encounter');
    choose(g,'skip',1);assert.equal(g.state.phase,'rest');assert.equal(g.state.neighborhoodEncounter.status,'skipped');
    assert.equal(g.state.pickups.some(p=>p.weapon==='shotgun'),false);g.state.phaseTime=0;g.step();assert.equal(g.state.wave,2);assert.equal(g.state.phase,'fight');
  }
});
test('parking guard grants one shotgun per player after victory, never on entry',()=>{
  const g=encounter('parking',['jo','yanu']);choose(g,'accept');choose(g,'accept',1);
  assert.equal(g.state.phase,'fight');assert.ok(g.state.enemies[0].maxHp>=300);assert.equal(g.state.pickups.length,0);
  win(g);assert.equal(g.state.pickups.filter(p=>p.weapon==='shotgun').length,2);
  g.finishNeighborhoodWave();assert.equal(g.state.pickups.filter(p=>p.weapon==='shotgun').length,2);
});
test('cargo can be stolen, defended and broken for a single reward',()=>{
  const g=encounter('delivery'),p=g.state.players[0],crate=g.state.props.find(p=>p.cargo);
  g.state.spawnQueue=[];g.state.enemies=[];p.x=80;p.y=640;
  const thief=g.spawnEnemy('remy',{x:crate.x,y:crate.y,stun:0});
  g.updateNeighborhood(3);assert.equal(crate.hp,3);
  p.x=crate.x;p.y=crate.y;g.updateNeighborhood(1);assert.ok(crate.steal<3);
  p.x=80;p.y=640;g.updateNeighborhood(4);assert.equal(crate.hp,0);assert.equal(g.state.neighborhoodEncounter.stolen,1);
  const second=g.state.props.find(p=>p.cargo);g.hitProp(second,99,p);g.hitProp(second,99,p);assert.equal(g.state.neighborhoodEncounter.recovered,1);
  thief.hp=0;g.step();assert.equal(g.state.neighborhoodEncounter.recovered,2);assert.equal(g.state.phase,'rest');
});
test('rescue outcome has a one-time consequence on the following street',()=>{
  const g=encounter('rescue');choose(g,'accept');win(g);assert.equal(g.state.neighborhood.helpStage,2);
  const save=checkpoint(g.snapshot()),resumed=restoreCheckpoint(JSON.parse(JSON.stringify(save)));
  assert.deepEqual(resumed.state.neighborhood,g.state.neighborhood);assert.equal(resumed.state.wave,1);
  resumed.state.stage=2;resumed.enterStreet();resumed.spawnWave();assert.ok(resumed.state.enemies[0].stun>=4);assert.equal(resumed.state.neighborhood.helpStage,null);assert.ok(resumed.state.neighborVisit);
  const count=resumed.state.pickups.length;resumed.neighborAssist();assert.equal(resumed.state.pickups.length,count);
});
test('failed rescue and total cargo theft still allow progression',()=>{
  const g=encounter('rescue');choose(g,'accept');g.state.players[0].x=70;
  g.state.enemies[0].x=720;g.state.enemies[0].y=525;g.updateNeighborhood(20);assert.equal(g.state.neighborhoodEncounter.courage,0);
  win(g);assert.equal(g.state.neighborhoodEncounter.status,'missed');assert.equal(g.state.neighborhood.helpStage,null);assert.equal(g.state.phase,'rest');
  const d=encounter('delivery');d.state.players[0].x=70;d.state.spawnQueue=[];
  for(const prop of d.state.props.filter(p=>p.cargo))d.spawnEnemy('remy',{x:prop.x,y:prop.y});
  d.updateNeighborhood(5);win(d);assert.equal(d.state.neighborhoodEncounter.status,'missed');assert.equal(d.state.phase,'rest');
});
test('pause freezes encounter state; choices use tap counters and snapshots are serializable',()=>{
  const g=encounter('merchant'),p=g.state.players[0];p.x=650;p.y=555;
  g.pause(true);g.step([{...blankInput(),taps:{interact:1}}]);assert.equal(p.energy,0);
  g.pause(false);g.step([{...blankInput(),taps:{interact:1}}]);assert.equal(p.energy,50);assert.equal(g.state.phase,'rest');
  assert.deepEqual(JSON.parse(JSON.stringify(g.snapshot())).neighborhood,g.state.neighborhood);
});
test('imported encounter data is whitelisted and deterministic on checkpoint resume',()=>{
  const g=encounter('delivery');g.state.phase='rest';g.state.wave=0;g.state.props=[];g.state.enemies=[];g.state.spawnQueue=[];
  const save=checkpoint(g.snapshot());const resumed=restoreCheckpoint(save);assert.deepEqual(resumed.state.waves,g.state.waves);
  assert.deepEqual(cleanNeighborhood({plan:[{stage:1,kind:'__proto__'}]},42),neighborhoodPlan(42));
  assert.equal(checkpoint(encounter('merchant').snapshot()),null);
});
