import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { TALENTS, TALENT_MILESTONES, normalizeProfile, addExperience, spendPoint, applyProfile, canLearn } from '../game/progression.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
import { blankInput, FLOOR } from '../game/data.js';

function arena(kind, branch=0, rank=5, duo=false) {
  const sim=new Simulation(duo?[kind,kind]:[kind],0,713);
  sim.state.phase='fight';sim.state.props=[];sim.state.spawnQueue=[];sim.state.enemies=[];
  for(const p of sim.state.players){applyProfile(p,{milestones:TALENT_MILESTONES,talents:TALENTS[kind].filter(n=>n.branchIndex===branch&&n.tier<rank).map(n=>n.id)});p.x=500;p.y=550;p.invincible=0;p.energy=100;}
  const e=sim.spawnEnemy('remy',{x:580,y:550,hp:10000,maxHp:10000,cooldown:999,speed:0,invincible:0});
  return {sim,p:sim.state.players[0],e};
}
function hit(sim,p,type='punch',final=false) {p.attack=null;p.cooldown=0;if(final){p.comboStep=2;p.comboWindow=1;}sim.startAttack(p,type);sim.resolveAttack(p);}

test('eight campaign milestones, including KO partner, never stack on replays or XP',()=>{
  const sim=new Simulation(['jo','kikor']);
  assert.deepEqual(sim.state.players.map(p=>p.progression.points),[0,0]);
  const totals=[];
  for(let chapter=0;chapter<6;chapter++)for(let stage=0;stage<6;stage++){
    sim.state.chapter=chapter;sim.state.stage=stage;sim.state.players[1].hp=0;sim.clearStreet();sim.clearStreet();
    if(stage===2||stage===5)totals.push(sim.state.players[0].progression.points);
  }
  assert.deepEqual(totals,[2,3,4,5,5,6,6,7,7,8,8,8]);
  for(const p of sim.state.players){assert.equal(p.progression.points,8);assert.equal(addExperience(p.progression,10000).points,8);}
  sim.state.chapter=0;sim.state.stage=2;sim.clearStreet();assert.equal(sim.state.players[0].progression.points,8);
  assert.equal(new Simulation(['jo']).state.players[0].progression.points,0);
});
test('linear prerequisite and global ultimate exclusivity survive normalization',()=>{
  let p=normalizeProfile({milestones:TALENT_MILESTONES},'jo');
  assert.equal(spendPoint(p,TALENTS.jo[4].id),null);
  for(const n of TALENTS.jo.slice(0,5))p=spendPoint(p,n.id);
  assert.equal(p.points,3);assert.equal(p.completed.length,0);
  assert.equal(canLearn({...p,talents:[...p.talents,...TALENTS.jo.slice(5,9).map(n=>n.id)]},TALENTS.jo[9]),false);
  assert.equal(spendPoint(p,TALENTS.jo[0].id),null);
  assert.equal(normalizeProfile({...p,milestones:[...TALENT_MILESTONES,...TALENT_MILESTONES,'forged'],points:99}).points,3);
});
test('checkpoint preserves awards and purchases without regranting the first-street reward',()=>{
  const sim=new Simulation(['jo']);sim.clearStreet();sim.state.stage=2;sim.clearStreet();sim.spendStat(0,TALENTS.jo[0].id);
  const restored=restoreCheckpoint(checkpoint(sim.snapshot()));
  assert.deepEqual(restored.state.players[0].progression,sim.state.players[0].progression);
  restored.clearStreet();assert.equal(restored.state.players[0].progression.points,1);
});
test('all 21 ultimates activate in both player slots, have finite state and no friendly fire',()=>{
  for(const kind of Object.keys(TALENTS))for(let branch=0;branch<3;branch++){
    const {sim,p,e}=arena(kind,branch,5,true),ally=sim.state.players[1];p.rogueRhythm=3;p.rogueInstinctGauge=3;
    sim.activateSpecial(p);assert.ok(p.specialState.ultimate,`${kind}/${branch}`);assert.equal(p.specialCd,0);
    const hp=ally.hp;for(let i=0;i<80;i++){sim.state.time+=.1;sim.updateRoguePlayer(p,blankInput(),.1);if(p.specialState)sim.updateSpecial(p,blankInput(),.1);sim.updateWorld(.1);}
    assert.equal(ally.hp,hp,`${kind}/${branch}: friendly fire`);assert.equal(p.specialState,null);
    assert.doesNotThrow(()=>JSON.stringify(sim.snapshot()));assert.ok(Number.isFinite(e.hp));assert.ok(sim.state.allies.length<=3);assert.ok((sim.state.rogueZones||[]).length<=8);
  }
});
test('conditional ultimates fall back to normal special until their meter is full',()=>{
  for(const [kind,branch,meter] of [['jo',0,'rogueRhythm'],['yanu',2,'rogueInstinctGauge']]){
    const {sim,p}=arena(kind,branch);sim.activateSpecial(p);assert.equal(p.specialState.ultimate,undefined);
    p[meter]=3;sim.endSpecial(p);p.energy=100;sim.activateSpecial(p);assert.ok(p.specialState.ultimate);assert.equal(p[meter],0);
  }
});
test('Jualos debt has immediate rank-two value and rank-four protection works solo',()=>{
  const {sim,p,e}=arena('jualos',0,2);const health=p.hp;sim.damage(p,20,e,true);assert.ok(p.rogueDebt>0);assert.ok(p.hp<health);
  const before=e.hp;hit(sim,p,'kick');assert.ok(e.hp<before);assert.equal(p.rogueDebt,0);
  const tank=arena('jualos',0,4);tank.p.rogueDebt=20;hit(tank.sim,tank.p,'kick');const zone=tank.sim.state.rogueZones.find(z=>z.kind==='guard');assert.ok(zone);tank.p.x=zone.x;
  const hp=tank.p.hp;tank.sim.damage(tank.p,20,tank.e,false);assert.ok(hp-tank.p.hp<17);
});
test('Couenne preserves the current attack once after a respite',()=>{
  const {sim,p,e}=arena('jualos',0,1);sim.startAttack(p,'punch');const attack=p.attack;sim.damage(p,10,e,true);assert.equal(p.attack,attack);assert.equal(p.stun,0);
  sim.damage(p,10,e,true);assert.equal(p.attack,null);
});
test('Karonux mixed branches preserve reversal, shoulder, oil and ignition',()=>{
  const {sim,p}=arena('karonux',2,4);applyProfile(p,{milestones:TALENT_MILESTONES,talents:[...TALENTS.karonux.slice(5,9),...TALENTS.karonux.slice(10,14)].map(n=>n.id)});
  sim.rogueOnDodge(p);hit(sim,p,'punch');assert.equal(p.attack.rogueRange,180);hit(sim,p,'kick');assert.ok(p.attack.rogueBoot&&p.attack.rogueShoulder);assert.ok(sim.state.rogueZones.some(z=>z.kind==='fire'));
});
test('steered convoy shares the impact limit and special re-press performs a lateral U-turn',()=>{
  const {sim,p,e}=arena('karonux');e.boss=true;e.kind='gustavax';sim.activateSpecial(p);sim.updateSpecial(p,{...blankInput(),x:1},.4);
  const a=p.specialState,x=p.x,y=p.y;sim.updateSpecial(p,{...blankInput(),special:true,y:1},.1);assert.ok(p.x<x);assert.ok(p.y>y);assert.equal(p.facing,-1);
  for(let i=0;i<200;i++)if(p.specialState)sim.updateSpecial(p,{...blankInput(),x:i%30<15?1:-1},.02);
  assert.ok(Object.values(a.hits).every(h=>h.count<=2));assert.notEqual(p.action,'sleep');assert.equal(p.specialState,null);
});
test('paint detonates on three touches, propagation cannot recursively detonate neighbours',()=>{
  const {sim,p,e}=arena('kikor',1,4),other=sim.spawnEnemy('remy',{x:e.x+30,y:e.y,hp:1000,maxHp:1000,invincible:0});
  sim.roguePaint(p,other,false);sim.roguePaint(p,other,false);const hp=other.hp;
  for(let i=0;i<3;i++)sim.roguePaint(p,e);
  assert.equal(e.roguePaint[p.id].stacks,3,'Three marks remain visible before the explosion');
  assert.equal(sim.state.events.filter(e=>e.label==='TROP DE COUCHES').length,0);
  sim.state.time+=.2;sim.updateRogueWorld(.2);
  assert.equal(e.roguePaint[p.id].stacks,0);assert.equal(other.roguePaint[p.id].stacks,3);assert.ok(other.hp<hp);assert.equal(sim.state.events.filter(e=>e.label==='TROP DE COUCHES').length,1);
});
test('same-character coop paint and curse ownership stay independent',()=>{
  const {sim,p,e}=arena('kikor',1,4,true),other=sim.state.players[1];sim.roguePaint(p,e);sim.roguePaint(other,e);assert.equal(e.roguePaint[p.id].stacks,1);assert.equal(e.roguePaint[other.id].stacks,1);
});
test('illusion swap needs a new press, occurs only once, and reproduces an attack',()=>{
  const {sim,p}=arena('kikor',2,4);sim.rogueOnDodge(p);const old=p.x;p.x+=100;assert.equal(sim.rogueTrySwap(p),true);assert.equal(p.x,old);assert.equal(sim.rogueTrySwap(p),false);
  hit(sim,p,'kick');assert.ok(sim.state.rogueZones.every(z=>z.ttl===0));
});
test('gallery remains bounded at the wall and never cancels boss attacks',()=>{
  const {sim,p,e}=arena('kikor',2);p.x=FLOOR.left;p.y=FLOOR.top;sim.activateSpecial(p);
  assert.equal(sim.state.rogueZones.length,3);assert.ok(sim.state.rogueZones.every(z=>z.x>=FLOOR.left&&z.y>=FLOOR.top));
  e.boss=true;e.x=p.x;e.y=p.y;e.pattern={windup:.1,elapsed:.09,hit:false};sim.updateRogueWorld(.01);assert.equal(e.pattern.hit,false);
});
test('precise dodges require an imminent threat and instinct has vulnerable gaps',()=>{
  const {sim,p,e}=arena('yanu',2);sim.rogueOnDodge(p);assert.equal(p.rogueCounter,undefined);
  e.attack={windup:.6,elapsed:.5,hit:false};sim.rogueOnDodge(p);assert.ok(p.rogueCounter>0);assert.equal(p.rogueInstinctGauge,1);
  p.rogueInstinctGauge=3;sim.activateSpecial(p);p.invincible=.22;sim.rogueOnDodge(p);assert.ok(p.dodgeCd>p.invincible);
});
test('food, feast healing and wolf extensions are explicitly capped',()=>{
  const {sim,p,e}=arena('jualos',2);p.hp=10;sim.activateSpecial(p);for(let i=0;i<40;i++){sim.state.time+=.4;sim.rogueOnHit(p,e,true);}assert.ok(p.hp<=10+p.maxHp*.2);
  const wolf=arena('yanu',1);wolf.sim.activateSpecial(wolf.p);for(let i=0;i<30;i++)wolf.sim.rogueOnKill(wolf.p,wolf.e);assert.equal(wolf.p.specialState.duration,9);
});
test('giant creation appears without existing allies, and coordinated strikes extend only three seconds',()=>{
  const {sim,p,e}=arena('kikor',0);sim.activateSpecial(p);assert.equal(sim.state.allies.length,1);const a=sim.state.allies[0];assert.equal(a.rogueForm,'masterpiece');
  for(let i=0;i<30;i++){a.cooldown=0;sim.rogueCoordinated(p,e);}assert.equal(a.rogueExtended,3);assert.equal(a.ttl,9);
});
test('projectile reflection, circular rhythm attack and fire/head combo can coexist',()=>{
  const {sim,p}=arena('jo',2,3);const h=sim.hazard({id:99,x:560,y:550,enemy:true,facing:-1},{kind:'bullet',vx:-200});hit(sim,p,'kick');assert.equal(h.enemy,false);assert.equal(h.owner,p.id);
  const jo=arena('jo',0,4);jo.p.rogueRhythm=3;hit(jo.sim,jo.p,'kick');assert.equal(jo.p.attack.rogueRadial,true);hit(jo.sim,jo.p,'punch');assert.ok(jo.p.rogueEcho);
  const l=arena('lorenzo',0,3);applyProfile(l.p,{milestones:TALENT_MILESTONES,talents:[...TALENTS.lorenzo.slice(0,3),TALENTS.lorenzo[5]].map(n=>n.id)});hit(l.sim,l.p,'punch',true);assert.ok(l.p.attack.rogueHead);assert.ok(l.e.rogueBurns?.[l.p.id]);
});
test('aerial dive is available without special, and second diagonal dive unlocks at rank four',()=>{
  const {sim,p,e}=arena('gustavax',1,4);p.z=40;hit(sim,p,'kick');assert.ok(p.attack.rogueDive);assert.ok(p.rogueRejump);sim.updateRoguePlayer(p,{...blankInput(),x:1,y:1},.01);assert.ok(p.vz>0);assert.ok(p.rogueSecondJump);hit(sim,p,'kick');assert.ok(p.attack.rogueDive);assert.ok(e.hp<e.maxHp);
});
