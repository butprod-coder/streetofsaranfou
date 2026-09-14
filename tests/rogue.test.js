import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { FIGHTERS, blankInput, STEP } from '../game/data.js';
import { TALENTS, normalizeProfile, spendPoint, spendAttribute, applyProfile, xpForLevel } from '../game/progression.js';
import { checkpoint, restoreCheckpoint, validateCheckpoint, recordRun, RECORDS_KEY } from '../game/run-save.js';
import { ENCOUNTER_ROSTER, randomEnemyKinds, activeEnemyLimit } from '../game/encounters.js';

function learn(p, name) {
  const node=TALENTS[p.kind].find(n=>n.name===name), path=TALENTS[p.kind].filter(n=>n.branch===node.branch&&n.tier<node.tier&&TALENTS[p.kind].find(q=>q.branch===n.branch&&q.tier===n.tier)===n).map(n=>n.id);
  applyProfile(p,{xp:xpForLevel(20),completed:[0,1,2,3,4],talents:[...path,node.id]});
  assert.ok(p.progression.talents.includes(node.id),name);
}
function arena(kind) {
  const sim=new Simulation([kind],0,42);sim.state.phase='fight';sim.state.enemies=[];sim.state.spawnQueue=[];sim.state.props=[];
  const p=sim.state.players[0];p.x=500;p.y=550;p.invincible=0;
  const e=sim.spawnEnemy('remy',{x:540,y:550,hp:10000,maxHp:10000,cooldown:999,speed:0,invincible:0});
  return {sim,p,e};
}
test('252 unique nodes, three branches, six tiers, legal investments and exclusive ultimates',()=>{
  const ids=new Set();
  for(const f of FIGHTERS){const nodes=TALENTS[f.id];assert.equal(nodes.length,36);assert.equal(new Set(nodes.map(n=>n.branch)).size,3);
    for(const n of nodes){assert.ok(!ids.has(n.id));ids.add(n.id);const {p}=arena(f.id);learn(p,n.name);assert.ok(n.description.length>12);}
    let p=normalizeProfile({xp:xpForLevel(20),completed:[0,1,2,3,4,5]},f.id);assert.equal(p.points,14);assert.equal(p.statPoints,38);
    for(const n of nodes.filter(n=>n.branchIndex===0&&nodes.find(q=>q.branch===n.branch&&q.tier===n.tier)===n))p=spendPoint(p,n.id);
    assert.equal(spendPoint(p,nodes[11].id),null);assert.equal(spendPoint(p,nodes[0].id),null);
    assert.equal(normalizeProfile({xp:Infinity,points:999},f.id).points,0);
    for(let i=0;i<10;i++)p=spendAttribute(p,'vitality');assert.equal(spendAttribute(p,'vitality'),null);
  }assert.equal(ids.size,252);
});
test('enemy bags have exactly equal frequencies and arrivals obey active cap',()=>{
  const bag=[],sim=new Simulation(['jo'],0,10);const kinds=randomEnemyKinds(0,ENCOUNTER_ROSTER.length*4,()=>sim.random(),bag);
  for(const k of ENCOUNTER_ROSTER)assert.equal(kinds.filter(n=>n===k).length,4);
  sim.spawnWave();assert.equal(sim.state.enemies.length,1);sim.state.players[0].invincible=999;
  for(let i=0;i<60;i++)sim.step();assert.equal(sim.state.enemies.length,1);
  for(let i=0;i<500;i++)sim.step();assert.ok(sim.state.enemies.filter(e=>e.hp>0).length<=activeEnemyLimit(0));
});
test('XP is shared, deduplicated; summons grant none; streets have no reward menu',()=>{
  const sim=new Simulation(['jo','yanu'],0,8);sim.awardXP(1000,'wave:test');sim.awardXP(1000,'wave:test');
  assert.deepEqual(sim.state.players.map(p=>p.progression.xp),[1000,1000]);
  const e=sim.spawnEnemy('creation',{owner:999});sim.damage(e,999,sim.state.players[0],true);assert.equal(sim.state.players[0].progression.xp,1000);
  sim.clearStreet();assert.equal(sim.state.players.every(p=>!p.rewardOptions?.length),true);
  sim.clearStreet();assert.equal(sim.state.players[0].rogueRewards,undefined);
});
test('all 42 ultimate paths run finite in solo and serialize without errors',()=>{
  for(const f of FIGHTERS)for(const n of TALENTS[f.id].filter(n=>n.ultimate)){
    const {sim,p,e}=arena(f.id);learn(p,n.name);p.energy=100;sim.activateSpecial(p);
    for(let tick=0;tick<60*20;tick++){p.invincible=1;sim.step([{...blankInput(),x:tick%120<60?1:-1,punch:true,kick:tick%100<5}]);}
    const state=sim.snapshot();assert.ok(Number.isFinite(p.hp)&&Number.isFinite(e.hp),n.name);assert.ok(state.allies.length<=6,n.name);assert.ok((state.rogueZones||[]).length<=8,n.name);assert.equal(p.specialState,null,n.name);
  }
});
test('heavy throw ultimate, on-site slam, shields, burns and slows change real combat',()=>{
  const {sim,p,e}=arena('gustavax');learn(p,'Personne n’est trop lourd');e.kind='bolorouet';e.elite=false;
  assert.ok(sim.tryGrab(p));sim.updateInteraction(p,true,.01);sim.updateInteraction(p,false,.5);assert.equal(e.thrown.heavy,false);
  const other=arena('gustavax');learn(other.p,'Changement de programme');assert.ok(other.sim.tryGrab(other.p));other.sim.updateInteraction(other.p,false,.01,{punch:true,y:1});other.sim.updateInteraction(other.p,false,.5);assert.equal(other.e.thrown.toX,other.e.thrown.fromX);
  const paint=arena('kikor');learn(paint.p,'Bleu froid');paint.sim.damage(paint.e,1,paint.p,false);assert.ok(paint.e.rogueSlow>0);
  const burn=arena('lorenzo');learn(burn.p,'Braises collantes');burn.sim.damage(burn.e,1,burn.p,false);const hp=burn.e.hp;burn.sim.updateRogueWorld(.8);assert.ok(burn.e.hp<hp);
  const tank=arena('jualos');learn(tank.p,'Digestion musclée');tank.p.hp=tank.p.maxHp;tank.sim.state.pickups=[{kind:'food',x:tank.p.x,y:tank.p.y}];tank.sim.collectPickups();assert.ok(tank.p.rogueShield>0);const health=tank.p.hp;tank.sim.damage(tank.p,1,tank.e,false);assert.equal(tank.p.hp,health);
});
test('rest checkpoints round trip without replaying wave XP, restoring consumed props or carrying buffs',()=>{
  const sim=new Simulation(['gustavax','kikor'],2,442);sim.spawnWave();sim.state.enemies=[];sim.state.spawnQueue=[];sim.step();assert.equal(sim.state.phase,'rest');
  sim.awardXP(1000,'test');sim.state.players[0].weapon={kind:'shotgun',uses:4};sim.state.props[0].hp=0;
  const save=checkpoint(sim.snapshot()),restored=restoreCheckpoint(JSON.parse(JSON.stringify(save)));
  assert.equal(restored.state.phase,'rest');assert.equal(restored.state.wave,sim.state.wave);assert.deepEqual(restored.state.waves,sim.state.waves);
  assert.deepEqual(restored.state.players.map(p=>p.progression),sim.state.players.map(p=>p.progression));assert.equal(restored.state.props[0].hp,0);assert.equal(restored.state.players[0].weapon.uses,4);
  const before=restored.state.players[0].progression.xp;for(let i=0;i<301;i++)restored.step();assert.equal(restored.state.wave,1);assert.equal(restored.state.players[0].progression.xp,before);
  assert.throws(()=>validateCheckpoint({...save,players:[{kind:'__proto__'}]}));assert.throws(()=>validateCheckpoint({...save,chapter:99}));
  const cleaned=validateCheckpoint({...save,players:save.players.map(p=>({...p,health:2,rewards:{attack:999},profile:{xp:Infinity,talents:['__proto__']}}))});assert.equal(cleaned.players[0].health,1);assert.deepEqual(cleaned.players[0].rewards,{});assert.equal(cleaned.players[0].profile.xp,0);
});
test('per-character records deduplicate repeated snapshots and do not grant starting power',()=>{
  const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},sim=new Simulation(['jo']);sim.awardXP(500,'test');
  recordRun(sim.state,0,storage);recordRun(sim.state,0,storage);sim.state.phase='won';recordRun(sim.state,0,storage);recordRun(sim.state,0,storage);
  const r=JSON.parse(storage.getItem(RECORDS_KEY)).jo;assert.equal(r.xp,500);assert.equal(r.wins,1);assert.ok(r.unlocks.includes('first-victory'));assert.equal(new Simulation(['jo']).state.players[0].progression.level,1);
});
