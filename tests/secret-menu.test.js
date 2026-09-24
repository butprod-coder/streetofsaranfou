import test from 'node:test';
import assert from 'node:assert/strict';
import { secretCodeMatcher, createSecretSession } from '../game/secret-menu.js';
import { checkpoint, recordRun, finalDuelCheckpoint } from '../game/run-save.js';

test('secret code is case insensitive, tolerates leading keys and expires after a pause',()=>{
  const match=secretCodeMatcher();let opened=false;
  for(const [i,key] of [...'helloGustavax45'].entries())opened=match(key,i*100);
  assert.equal(opened,true);
  const expired=secretCodeMatcher();for(const [i,key] of [...'GUSTAVAX4'].entries())assert.equal(expired(key,i*100),false);
  assert.equal(expired('5',10000),false);
});
test('secret level access includes level seven, preserves full waves and limits normal tests to their selected district',()=>{
  for(let chapter=0;chapter<7;chapter++){
    const sim=createSecretSession({chapter,character:'jo'});assert.equal(sim.state.chapter,chapter);assert.equal(sim.state.stage,0);assert.equal(sim.state.practice,undefined);
    if(chapter===6){assert.equal(sim.state.waves.length,3);assert.equal(new Set(sim.state.finale.order).size,6);}
    else {sim.state.stage=5;sim.enterStreet();sim.clearStreet();assert.equal(sim.state.phase,'won');assert.equal(sim.state.chapter,chapter);}
  }
});
test('secret menu selects any boss phase and supports the direct Gustavax cinematic',()=>{
  for(let phase=1;phase<=3;phase++){
    const sim=createSecretSession({mode:'boss',chapter:6,phase});assert.equal(sim.state.enemies[0].kind,'gustavax');assert.equal(sim.state.enemies[0].bossPhase,phase);
  }
  const direct=createSecretSession({chapter:6,stage:6});assert.equal(direct.state.stage,6);assert.equal(direct.state.waves[0].bossKind,'gustavax');assert.equal(direct.state.phase,'intro');
});
test('secret modifiers work in full levels without ending at the first wave and cannot overwrite a run or records',()=>{
  const sim=createSecretSession({chapter:6,invulnerable:true,freeSpecial:true,boost:true}),p=sim.state.players[0];
  assert.equal(p.progression.level,20);assert.equal(p.progression.points,8);
  assert.equal(checkpoint(sim.snapshot()),null);recordRun(sim.snapshot(),0,{setItem(){throw Error('must not write');}});
  sim.damage(p,999,{x:100,y:500,power:999,enemy:true},true);assert.equal(p.hp,p.maxHp);
  sim.state.phase='fight';sim.state.wave=0;sim.state.enemies=[];sim.state.spawnQueue=[];p.energy=0;sim.step();
  assert.equal(p.energy,100);assert.equal(sim.state.phase,'rest');
  sim.state.stage=6;sim.state.phase='over';assert.equal(finalDuelCheckpoint(sim.snapshot()),null);
});
