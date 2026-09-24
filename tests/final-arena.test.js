import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { finalWaves } from '../game/final-arena.js';
import { checkpoint, restoreCheckpoint, validateCheckpoint, finalDuelCheckpoint } from '../game/run-save.js';
import { createBossPractice } from '../game/boss-practice.js';

test('final arena has six distinct shortened rematches, two or three waves each, then Gustavax',()=>{
  const sim=new Simulation(['jo'],6,437);const seen=[];
  for(let stage=0;stage<6;stage++){
    const s=sim.state;assert.equal(s.stage,stage);assert.ok(s.waves.length===3||s.waves.length===4);
    assert.ok(s.waves.slice(0,-1).every(w=>!w.boss&&w.kinds.length===3));
    s.wave=s.waves.length-2;sim.spawnWave();const b=s.enemies.find(e=>e.boss);seen.push(b.kind);
    assert.ok(b.maxHp<600);assert.equal(s.chapter,6);assert.equal(s.neighborhoodEncounter,null);
    s.enemies=[];s.spawnQueue=[];s.bossCinema=null;sim.clearStreet();
  }
  assert.equal(new Set(seen).size,6);assert.equal(sim.state.stage,6);assert.equal(sim.state.phase,'intro');
  assert.equal(sim.state.waves[0].bossKind,'gustavax');
  sim.spawnWave();assert.equal(sim.state.enemies[0].kind,'gustavax');
  sim.state.enemies=[];sim.state.bossCinema=null;sim.clearStreet();assert.equal(sim.state.phase,'won');
});

test('final arena checkpoints preserve rematch order and completed waves; corrupt finale is rejected',()=>{
  const g=new Simulation(['jo','yanu'],6,876);g.state.stage=3;g.enterStreet();g.state.phase='rest';g.state.wave=1;
  const saved=checkpoint(g.snapshot()),r=restoreCheckpoint(saved);
  assert.deepEqual(r.state.finale.order,g.state.finale.order);assert.deepEqual(r.state.waves,g.state.waves);assert.equal(r.state.wave,1);assert.equal(r.state.stage,3);
  assert.throws(()=>validateCheckpoint({...saved,finale:{order:[0,0,1,2,3,4]}}));
  g.state.stage=6;g.enterStreet();g.state.phase='over';for(const p of g.state.players){p.hp=0;p.lives=0;}
  const retry=restoreCheckpoint(finalDuelCheckpoint(g.snapshot()));assert.equal(retry.state.stage,6);assert.equal(retry.state.phase,'intro');
  assert.ok(retry.state.players.every(p=>p.hp===p.maxHp&&p.lives>=2));assert.deepEqual(retry.state.finale.order,g.state.finale.order);
  retry.spawnWave();assert.equal(retry.state.enemies[0].kind,'gustavax');
});

test('Gustavax phases cannot be skipped by one huge hit and phase three has no smoke or reinforcements',()=>{
  const g=createBossPractice({chapter:6,invulnerable:false}),b=g.state.enemies[0],p=g.state.players[0];
  g.damage(b,99999,p,true);assert.equal(b.hp,b.maxHp*.65);g.updateGustavax(b,.02);assert.equal(b.bossPhase,2);
  g.updateGustavax(b,2.5);b.invincible=0;g.damage(b,99999,p,true);assert.equal(b.hp,b.maxHp*.3);g.updateGustavax(b,.02);assert.equal(b.bossPhase,3);assert.equal(g.state.finale.smoke,0);
  assert.equal(g.state.enemies.length,1);assert.equal(g.state.spawnQueue.length,0);
});

test('smoke charge colliding with desk debris creates a long opening and clears the smoke',()=>{
  const g=createBossPractice({chapter:6,phase:2}),b=g.state.enemies[0];b.x=310;b.y=500;g.state.finale.smoke=6;
  b.pattern={kind:'smokeCharge',charge:true,hit:true,elapsed:1,windup:1,active:1,dx:1,dy:0,hits:[]};
  g.updateGustavax(b,.1);assert.equal(b.pattern,null);assert.ok(b.recovering>=3);assert.equal(g.state.finale.smoke,0);assert.ok(g.state.finale.debris[0].broken);
});

test('slam shockwave can be jumped and its damage is dealt by authoritative simulation',()=>{
  for(const jump of [false,true]){
    const g=createBossPractice({chapter:6,phase:3,invulnerable:false}),b=g.state.enemies[0],p=g.state.players[0];
    b.x=600;b.y=540;p.x=700;p.y=540;p.invincible=0;p.z=jump?65:0;const hp=p.hp;
    g.executeGustavax(b,{kind:'deskSlam'});for(let i=0;i<45;i++)g.updateWorld(1/60);
    assert.equal(p.hp<hp,!jump);
  }
});

test('same seed produces the same final encounter order and attacks in solo/server simulation',()=>{
  const a=createBossPractice({chapter:6,phase:2}),b=restoreLike(a);
  for(let i=0;i<500;i++){a.step();b.step();}assert.deepEqual(a.state,b.state);
  function restoreLike(g){const copy=new Simulation(['jo'],6,1);copy.state=structuredClone(g.state);copy.seed=g.seed;copy.nextId=g.nextId;return copy;}
});
