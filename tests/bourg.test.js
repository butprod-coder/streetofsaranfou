import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { neighborhoodPlan, neighborhoodChoices, cleanNeighborhood } from '../game/neighborhood-events.js';
import { BOURG_KINDS, BAKERY, CUPS, SHELL_EXIT, shellPositions } from '../game/bourg-events.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
import { blankInput } from '../game/data.js';
function arena(kind, team=['jo']) {
  const g=new Simulation(team,3,123);g.state.bourg.plan=[{stage:1,kind},{stage:3,kind:kind==='shells'?'bakery':'shells'}];
  g.state.stage=1;g.enterStreet();g.state.wave=0;g.spawnWave();return g;
}
function choose(g,slot=0,id='accept') {const p=g.state.players[slot],c=neighborhoodChoices(g.state.neighborhoodEncounter).find(c=>c.id===id);Object.assign(p,{x:c.x,y:c.y});g.interactNeighborhood(p);}
function accept(g){g.state.players.forEach((_,i)=>choose(g,i));}
function win(g){g.state.enemies=[];g.state.spawnQueue=[];g.step();}
function guessPhase(g){g.updateBourg(1.5);g.updateBourg(3.6);assert.equal(g.state.neighborhoodEncounter.shellPhase,'guess');}

test('Bourg draws two different seeded encounters without changing previous chapter draws',()=>{
  const seen=new Set();for(let seed=0;seed<80;seed++){const p=neighborhoodPlan(seed,3);assert.deepEqual(p,neighborhoodPlan(seed,3));assert.equal(new Set(p.plan.map(p=>p.kind)).size,2);assert.ok(p.plan.every(p=>BOURG_KINDS.includes(p.kind)));seen.add(p.plan.map(p=>p.kind).join());for(let c=0;c<3;c++)assert.ok(neighborhoodPlan(seed,c).plan.every(p=>!BOURG_KINDS.includes(p.kind)));}assert.ok(seen.size>=10);
  const g=arena('bakery');for(let i=0;i<6;i++){g.state.stage=i;g.enterStreet();assert.equal(g.state.waves.filter(w=>w.neighborhood).length,[1,3].includes(i)?1:0);}
  g.state.chapter=4;g.state.stage=0;g.enterStreet();assert.equal(g.state.waves.some(w=>w.neighborhood),false);
  assert.deepEqual(cleanNeighborhood(neighborhoodPlan(9,2),9,3),neighborhoodPlan(9,3));
});
test('every Bourg choice is optional and requires both active players consent',()=>{
  for(const kind of BOURG_KINDS){const g=arena(kind,['jo','yanu']);choose(g);assert.equal(g.state.phase,'encounter');assert.equal(g.state.pickups.filter(p=>p.weapon==='bat').length,0);choose(g,1,'skip');assert.equal(g.state.phase,'rest');assert.equal(g.state.bourg.outcomes[0].status,'skipped');assert.equal(g.state.players[0].progression.xp,0);}
});
test('bakery stock is shared and capped; eating and throwing consume the same finite resource',()=>{
  const g=arena('bakery',['jo','yanu']);accept(g);const e=g.state.neighborhoodEncounter,[p,q]=g.state.players;g.updateBourg(30);assert.equal(e.stock,4);Object.assign(p,BAKERY);p.hp=40;
  g.interactNeighborhood(p);assert.equal(e.stock,3);assert.equal(e.held[p.id],true);g.interactNeighborhood(p);assert.equal(p.hp,55);assert.equal(e.held[p.id],false);
  g.interactNeighborhood(p);p.weapon={kind:'bat',uses:8};const foe=g.spawnEnemy('remy',{x:p.x+80,y:p.y,invincible:0});g.startAttack(p,'punch');assert.equal(p.weapon.uses,8);assert.equal(e.held[p.id],false);assert.equal(e.loaves.length,1);g.updateBourg(.1);assert.equal(foe.stun,2.5);assert.equal(e.loaves.length,0);assert.equal(g.throwBourgBread(p),false);
  Object.assign(q,BAKERY);for(let i=0;i<6;i++)g.interactNeighborhood(q);assert.equal(e.stock,0);assert.equal(e.taken,4);g.updateBourg(100);assert.equal(e.stock,0);win(g);assert.equal(g.state.phase,'rest');assert.deepEqual(e.held,{});
});
test('held bread is returned to shared stock on KO or disconnect and cannot duplicate',()=>{
  const g=arena('bakery',['jo','yanu']);accept(g);const p=g.state.players[0],e=g.state.neighborhoodEncounter;Object.assign(p,BAKERY);g.interactNeighborhood(p);p.connected=false;g.updateBourg(0);assert.equal(e.stock,1);g.updateBourg(0);assert.equal(e.stock,1);assert.equal(e.held[p.id],false);
});
test('scooter announces ambush before consent, gives one bat each and cannot repeat rewards',()=>{
 const g=arena('scooter',['jo','yanu']);assert.match(neighborhoodChoices(g.state.neighborhoodEncounter)[0].detail,/Alarme/);accept(g);assert.equal(g.state.spawnQueue[0],'makouille');assert.equal(g.state.pickups.filter(p=>p.weapon==='bat').length,2);g.startBourg();assert.equal(g.state.pickups.filter(p=>p.weapon==='bat').length,2);win(g);assert.equal(g.state.neighborhoodEncounter.status,'success');
});
test('terrace tables shield either camp, take both sides hits and yield a bounded proportional reward',()=>{
 const g=arena('terrace');accept(g);const p=g.state.players[0],table=g.state.props.find(p=>p.bourgTable);Object.assign(p,{x:table.x-60,y:table.y});const foe=g.spawnEnemy('remy',{x:table.x+60,y:table.y,invincible:0});const hp=foe.hp;g.damage(foe,20,p,false);assert.equal(foe.hp,hp);assert.equal(table.hp,5);g.state.tick++;const php=p.hp;g.damage(p,20,foe,true);assert.equal(p.hp,php);assert.equal(table.hp,3);
 for(const t of g.state.props.filter(p=>p.bourgTable).slice(0,2)){g.state.tick++;g.hitProp(t,99,p);}win(g);assert.equal(g.state.neighborhoodEncounter.saved,1);assert.equal(p.energy,10);g.finishNeighborhoodWave();assert.equal(p.energy,10);
 const h=arena('terrace');accept(h);for(const t of h.state.props.filter(p=>p.bourgTable))h.hitProp(t,99,h.state.players[0]);win(h);assert.equal(h.state.phase,'rest');assert.equal(h.state.neighborhoodEncounter.status,'missed');
});
test('enemy melee and enemy projectiles damage nearby terrace furniture',()=>{
 const g=arena('terrace');accept(g);const table=g.state.props.find(p=>p.bourgTable),foe=g.spawnEnemy('remy',{x:table.x-50,y:table.y,facing:1});g.state.players[0].x=1100;g.startAttack(foe,'punch');g.resolveAttack(foe);assert.equal(table.hp,5);g.state.tick++;g.hazard(foe,{x:table.x,y:table.y,delay:0,radius:50,damage:10,ttl:1});g.updateWorld(.02);assert.equal(table.hp,3);
});
test('cup positions interpolate visible swaps and match final identity permutation',()=>{
 const e={shellPhase:'mix',roundTime:.45,swaps:[[0,2],[1,2],[0,1],[1,2]]};assert.deepEqual(shellPositions(e),[1,1,1]);e.roundTime=.9;assert.deepEqual(shellPositions(e),[2,1,0]);e.roundTime=3.6;assert.deepEqual(shellPositions(e),[0,1,2]);e.shellPhase='show';assert.deepEqual(shellPositions(e),[0,1,2]);
});
test('bonneteau gives three independent guesses each, waits for coop and rewards only correct answers once',()=>{
 const g=arena('shells',['jo','yanu']);accept(g);const e=g.state.neighborhoodEncounter,[p,q]=g.state.players;
 for(let round=1;round<=3;round++){guessPhase(g);const answer=shellPositions(e)[e.ballCup];Object.assign(p,CUPS[answer]);g.interactNeighborhood(p);assert.equal(e.shellPhase,'guess');g.interactNeighborhood(p);assert.equal(p.energy,(round-1)*15);Object.assign(q,CUPS[(answer+1)%3]);g.interactNeighborhood(q);assert.equal(e.shellPhase,'reveal');assert.equal(p.energy,round*15);assert.equal(q.energy,0);g.interactNeighborhood(q);assert.equal(p.energy,round*15);g.updateBourg(1.8);}
 assert.equal(g.state.phase,'rest');assert.equal(e.status,'success');assert.equal(e.round,3);assert.equal(p.progression.xp,0);assert.equal(g.state.bourg.outcomes.length,1);
});
test('bonneteau supports exit, pause, disconnected partners and unanswered-round timeout',()=>{
 const g=arena('shells',['jo','yanu']);accept(g);const e=g.state.neighborhoodEncounter;g.pause(true);g.step();assert.equal(e.roundTime,0);g.pause(false);Object.assign(g.state.players[0],SHELL_EXIT);g.interactNeighborhood(g.state.players[0]);assert.equal(e.status,'active');g.state.players[1].connected=false;g.updateBourg(0);assert.equal(g.state.phase,'rest');
 const h=arena('shells');accept(h);for(let i=0;i<3;i++){guessPhase(h);h.updateBourg(20);h.updateBourg(1.8);}assert.equal(h.state.phase,'rest');assert.equal(h.state.players[0].energy,0);
});
test('Bourg checkpoints preserve draws and rewards, and old saves acquire a valid plan',()=>{
 const g=arena('terrace');g.state.phase='rest';g.state.wave=0;const before=checkpoint(g.snapshot());assert.equal(checkpoint(arena('shells').snapshot()),null);const resumed=restoreCheckpoint(before);assert.deepEqual(resumed.state.bourg.plan,g.state.bourg.plan);resumed.spawnWave();accept(resumed);win(resumed);const after=restoreCheckpoint(checkpoint(resumed.snapshot()));assert.equal(after.state.players[0].energy,30);assert.equal(after.state.bourg.outcomes.length,1);delete before.bourg;assert.equal(restoreCheckpoint(before).state.bourg.plan.length,2);
});
