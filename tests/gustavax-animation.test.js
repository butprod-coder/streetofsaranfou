import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossPractice } from '../game/boss-practice.js';
import { gustavaxPose,GUSTAVAX_ACTIVE,GUSTAVAX_BEATS } from '../game/gustavax-animation.js';
import { Audio } from '../game/audio.js';
function arena(phase=1){const g=createBossPractice({chapter:6,phase}),b=g.state.enemies[0];b.cooldown=b.stun=0;g.state.players[0].x=b.x-100;g.state.players[0].y=b.y;return {g,b};}
function pattern(b,kind){b.pattern={kind,elapsed:0,windup:1,active:GUSTAVAX_ACTIVE[kind],hit:false,beat:0,dx:-1,dy:0,charge:false,hits:[],marks:Array.from({length:5},(_,i)=>({x:250+i*150,y:550}))};}

test('both punches and the kick use strike poses exactly when damage is created, then recover',()=>{
  const {g,b}=arena();pattern(b,'executiveCombo');g.updateGustavax(b,.99);
  assert.equal(g.state.hazards.length,0);assert.equal(gustavaxPose(b).frame,3);
  g.updateGustavax(b,.011);assert.equal(g.state.hazards.length,1);assert.equal(gustavaxPose(b).frame,4);
  g.updateGustavax(b,.32);assert.equal(g.state.hazards.length,2);assert.equal(gustavaxPose(b).frame,5);
  g.updateGustavax(b,.46);assert.equal(g.state.hazards.length,3);assert.equal(gustavaxPose(b).frame,7);
  assert.ok(g.state.hazards[2].damage>g.state.hazards[1].damage);
  g.updateGustavax(b,.5);assert.equal(b.pattern,null);assert.equal(b.recovering,0);assert.ok(b.cooldown<.3);assert.equal(gustavaxPose(b).frame,0);
});

test('a rolled chair starts at the boss lane and wall collision exposes him without repeated damage',()=>{
  const {g,b}=arena();b.x=900;b.y=560;b.facing=-1;pattern(b,'chairRush');g.updateGustavax(b,1.01);
  const chair=g.state.hazards[0];assert.equal(chair.y,b.y);assert.equal(chair.delay,0);assert.equal(chair.pulse,10);
  for(let i=0;i<100;i++)g.updateWorld(1/60);
  assert.equal(g.state.hazards.length,0);assert.equal(b.pattern,null);assert.equal(b.recoveryKind,'angry');assert.equal(b.recovering,0);assert.ok(b.cooldown<.3);assert.equal(gustavaxPose(b).frame,0);
});

test('single cigar lands on its announced position and ember rain guarantees a free corridor',()=>{
  for(const phase of [1,2]){
    const {g,b}=arena(phase);b.attackCount=1;g.updateGustavax(b,.01);const p=b.pattern;
    assert.equal(p.kind,'cigarRain');g.updateGustavax(b,p.windup+.01);
    assert.equal(g.state.hazards.length,phase===1?1:4);
    for(const [i,h] of g.state.hazards.entries()){assert.equal(h.x,p.marks[i].x);assert.equal(h.y,p.marks[i].y);assert.ok(h.delay>=.55);}
    if(phase===2){const safeX=[160,400,640,880,1120][p.safeLane];assert.ok(g.state.hazards.every(h=>Math.abs(h.x-safeX)>h.radius+70));}
  }
});

test('charge gives a distinct audible warning before moving and smoke stays suppressed after debris impact',()=>{
  const {g,b}=arena(2);b.x=310;b.y=500;g.state.players[0].x=600;g.state.players[0].y=500;g.updateGustavax(b,.01);
  assert.ok(g.state.events.some(e=>e.type==='gustavaxCharge'));assert.equal(b.x,310);assert.equal(gustavaxPose(b).frame,3);
  const tones=[];Audio.prototype.effect.call({tone:(...args)=>tones.push(args),hiss(){},context:{currentTime:0}},{type:'gustavaxCharge'});assert.equal(tones.length,2);
  for(let i=0;i<75&&b.pattern;i++)g.updateGustavax(b,1/60);assert.equal(g.state.finale.smoke,0);assert.ok(g.state.finale.smokeSuppressedUntil>g.state.time);assert.equal(b.recoveryKind,'crash');
});

test('two desk sweeps and final slam use their own frames, then Gustavax immediately returns to guard',()=>{
  const {g,b}=arena(3);pattern(b,'deskSweep');g.updateGustavax(b,1.01);assert.equal(gustavaxPose(b).frame,5);g.updateGustavax(b,.62);assert.equal(gustavaxPose(b).frame,7);assert.equal(g.state.hazards.length,2);
  g.state.hazards=[];pattern(b,'lastWord');
  let previous=0;for(const beat of GUSTAVAX_BEATS.lastWord){const at=1+beat+.001;g.updateGustavax(b,at-previous);previous=at;}
  assert.equal(g.state.hazards.length,5);assert.equal(gustavaxPose(b).frame,13);assert.ok(g.state.hazards[4].damage>g.state.hazards[0].damage);
  g.updateGustavax(b,.6);assert.equal(b.pattern,null);assert.equal(gustavaxPose(b).frame,0);assert.equal(b.recovering,0);assert.ok(b.cooldown<.3);
});

test('phase transitions have timed dressing and weapon poses and freeze attacks until finished',()=>{
  const {g,b}=arena();b.hp=b.maxHp*.65;g.updateGustavax(b,.01);assert.equal(gustavaxPose(b).frame,12);assert.ok(b.invincible>=2.4);
  g.updateGustavax(b,.8);assert.equal(gustavaxPose(b).frame,8);assert.equal(g.state.hazards.length,0);
  g.updateGustavax(b,2);assert.equal(b.phaseChange,null);b.hp=b.maxHp*.3;g.updateGustavax(b,.01);
  assert.equal(gustavaxPose(b).atlas,'gustavaxLast');assert.equal(gustavaxPose(b).frame,3);assert.equal(g.state.finale.smoke,0);
});
