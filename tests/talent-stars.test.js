import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { TALENTS, normalizeProfile, spendPoint, bonuses, applyProfile } from '../game/progression.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';
import { ABILITY_UPGRADES, tune } from '../game/talent-upgrades.js';

test('each boss or mini-boss grants one point to both players, including KO partner',()=>{
  const sim=new Simulation(['jo','yanu']);sim.state.phase='fight';sim.state.enemies=[];
  sim.state.players[1].hp=0;
  const source=sim.state.players[0];
  for(const flags of [{boss:true},{miniBoss:true},{boss:true,miniBoss:true}]){
    const before=source.progression.points;
    const enemy=sim.spawnEnemy('remy',{...flags,hp:1,maxHp:1,invincible:0});
    sim.damage(enemy,100,source,true);sim.damage(enemy,100,source,true);
    assert.deepEqual(sim.state.players.map(p=>p.progression.points),[before+1,before+1]);
  }
  const points=source.progression.points;sim.clearStreet();assert.equal(source.progression.points,points);
  const saved=restoreCheckpoint(checkpoint(sim.snapshot()));assert.equal(saved.state.players[0].progression.points,points);
});

test('all characters retain three ranks, permanent branches and local ability upgrades',()=>{
  for(const [kind,nodes] of Object.entries(TALENTS)){
    let p=normalizeProfile({milestones:Array.from({length:24},(_,i)=>`encounter:0:0:0:${i}`)},kind);
    for(const node of nodes.filter(n=>n.branchIndex===0)){
      const results=[],key=Object.keys(ABILITY_UPGRADES[kind][0][node.tier])[0].replace('$','');
      for(let rank=1;rank<=3;rank++){p=spendPoint(p,node.id);assert.equal(p.talentRanks[node.id],rank);results.push(tune({kind,progression:p},node.tier,key,10));}
      assert.equal(spendPoint(p,node.id),null);
      assert.notEqual(results[2],results[1]);assert.notEqual(results[1],results[0]);
      assert.equal(bonuses(p).attack,1,'stars must not add passive generic attack');
    }
    assert.equal(spendPoint(p,nodes.find(n=>n.branchIndex===1).id),null);
    assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(p))),p);
  }
});

test('stars improve driving without generic extra duration and checkpoint retains stars',()=>{
  const sim=new Simulation(['jo']);sim.pause(true);
  let p=normalizeProfile({milestones:['encounter:0:0:0:99','encounter:0:0:0:100']},'jo');
  for(let i=0;i<3;i++)p=spendPoint(p,TALENTS.jo[0].id);
  const actor=sim.state.players[0];applyProfile(actor,p);actor.energy=100;
  sim.activateSpecial(actor);assert.equal(actor.specialState.duration,5);assert.equal(actor.specialPower,actor.power);
  sim.updateSpecial(actor,{x:1},.1);assert.ok(actor.specialState.speed>135,'upgraded acceleration applies to actual vehicle');
  const saved=restoreCheckpoint(checkpoint(sim.snapshot()));assert.deepEqual(saved.state.players[0].progression.talentRanks,p.talentRanks);
});
