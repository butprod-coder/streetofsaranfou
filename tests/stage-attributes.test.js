import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../game/simulation.js';
import {normalizeProfile,awardStageAttributes} from '../game/progression.js';
import {checkpoint,validateCheckpoint} from '../game/run-save.js';
test('older checkpoints recover points for already cleared stages and clamp investments',()=>{
 const sim=new Simulation(['jo']);Object.assign(sim.state,{chapter:0,stage:2,phase:'clear',enemies:[],spawnQueue:[],props:[]});
 const saved=checkpoint(sim.state);saved.players[0].profile={progressionVersion:3,xp:9999,attributes:{strength:12}};
 const profile=validateCheckpoint(saved).players[0].profile;
 assert.equal(profile.attributeStages.length,3);assert.equal(profile.attributes.strength,6);assert.equal(profile.statPoints,0);
 assert.deepEqual(validateCheckpoint({...saved,players:[{...saved.players[0],profile}]}).players[0].profile,profile);
});
test('stage rewards are unique, persistent and capped at the six campaign chapters',()=>{
 let p=normalizeProfile();
 for(let chapter=0;chapter<6;chapter++)for(let stage=0;stage<6;stage++){
  p=awardStageAttributes(p,chapter,stage);const points=p.statPoints;
  assert.equal(points,(chapter*6+stage+1)*2);
  p=awardStageAttributes(p,chapter,stage);assert.equal(p.statPoints,points);
  p=normalizeProfile(JSON.parse(JSON.stringify(p)));
 }
 assert.equal(awardStageAttributes(p,6,0).statPoints,72);
 assert.equal(awardStageAttributes(p,0,7).statPoints,72);
});
test('clearing each street grants two points to both players only once',()=>{
 const sim=new Simulation(['jo','yanu']);Object.assign(sim.state,{chapter:0,stage:0,phase:'fight',enemies:[],spawnQueue:[],props:[]});
 sim.clearStreet();assert.deepEqual(sim.state.players.map(p=>p.progression.statPoints),[2,2]);
 sim.clearStreet();assert.deepEqual(sim.state.players.map(p=>p.progression.statPoints),[2,2]);
 sim.state.stage=1;sim.clearStreet();assert.deepEqual(sim.state.players.map(p=>p.progression.statPoints),[4,4]);
 sim.state.sandbox=true;sim.state.stage=2;sim.clearStreet();assert.deepEqual(sim.state.players.map(p=>p.progression.statPoints),[4,4]);
});
