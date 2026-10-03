import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { WEAPONS } from '../game/weapons.js';
import { ENCOUNTER_ROSTER } from '../game/encounters.js';
const arena = () => {
  const g = new Simulation(['karonux','jo'],0,42); g.spawnWave();
  Object.assign(g.state,{phase:'fight',enemies:[],props:[],pickups:[],spawnQueue:[],bossCinema:null});
  const p=g.state.players[0];Object.assign(p,{x:400,y:540,facing:1});return {g,p};
};
const fire=(g,p,kind)=>{p.weapon={kind,uses:WEAPONS[kind].uses};g.startWeaponAttack(p);g.resolveWeaponAttack(p);};

test('children are one encounter and spawn together, including old queued identities',()=>{
  assert.ok(ENCOUNTER_ROSTER.includes('kids_duo'));
  assert.ok(!ENCOUNTER_ROSTER.includes('julioKid')&&!ENCOUNTER_ROSTER.includes('djeKid'));
  for(const kind of ['kids_duo','julioKid','djeKid']){
    const {g}=arena();g.spawnEncounterEnemy(kind);
    assert.deepEqual(g.state.enemies.map(e=>e.kind),['julioKid','djeKid']);
    assert.equal(g.state.enemies[0].x,g.state.enemies[1].x);
  }
});

test('Jualas drops one usable ladle on death, either partner can pick it up',()=>{
  const {g,p}=arena(),e=g.spawnEnemy('jualasAlarm',{x:500,y:540,invincible:0});
  assert.ok(ENCOUNTER_ROSTER.includes('jualasAlarm'));
  g.damage(e,999,p,false);g.damage(e,999,p,false);
  const drops=g.state.pickups.filter(i=>i.weapon==='ladle');assert.equal(drops.length,1);assert.equal(drops[0].uses,10);
  const friend=g.state.players[1];Object.assign(friend,{x:500,y:540});assert.ok(g.pickWeapon(friend));assert.equal(friend.weapon.kind,'ladle');
  friend.interaction=null;friend.facing=1;const victim=g.spawnEnemy('tchoin',{x:600,y:540,invincible:0}),offLane=g.spawnEnemy('tchoin',{x:600,y:650,invincible:0});
  g.startWeaponAttack(friend);g.resolveWeaponAttack(friend);assert.ok(victim.hp<victim.maxHp);assert.equal(offLane.hp,offLane.maxHp);assert.equal(friend.weapon.uses,9);
});

test('Jualas winds up and swings his ladle in the locked facing direction',()=>{
  const {g,p}=arena(),e=g.spawnEnemy('jualasAlarm',{x:500,y:540,cooldown:0});
  g.updateNewEnemy(e,.016);assert.equal(e.newPattern.kind,'ladle');assert.equal(e.newPattern.facing,-1);
  p.x=900;g.updateNewEnemy(e,e.newPattern.windup+.01);
  assert.ok(g.state.hazards.some(h=>h.kind==='ladleStrike'&&h.facing===-1));
});
test('caddie hits a group once, keeps partner safe and consumes one use',()=>{
  const {g,p}=arena(),friend=g.state.players[1],hp=friend.hp;
  const enemies=[530,650].map(x=>g.spawnEnemy('triso',{x,y:540,hp:1000,maxHp:1000,invincible:0}));
  fire(g,p,'cart');for(let i=0;i<80;i++)g.updateWeaponProjectiles(1/60);
  assert.ok(enemies.every(e=>e.hp<1000));assert.equal(friend.hp,hp);assert.equal(p.weapon.uses,3);assert.equal(g.state.weaponProjectiles.length,0);
});
test('foam blinds opponents, interrupts their attack and propels user backwards',()=>{
  const {g,p}=arena(),e=g.spawnEnemy('tchoin',{x:540,y:540,invincible:0});
  fire(g,p,'extinguisher');g.updateWeaponProjectiles(1/60);
  assert.ok(p.vx<0);assert.ok(e.blindedUntil>g.state.time);e.cooldown=0;g.updateEnemy(e,1/60);assert.equal(e.newPattern,null);assert.equal(e.action,'hurt');
});
test('parasol repels several targets across a wide lane',()=>{
  const {g,p}=arena(),es=[500,590].map((x,i)=>g.spawnEnemy('triso',{x,y:540+i*75,invincible:0}));
  fire(g,p,'parasol');assert.ok(es.every(e=>e.vx===540&&e.hp<e.maxHp));
});
test('partner can kick football back; pause and serialized simulation preserve projectiles',()=>{
  const {g,p}=arena();fire(g,p,'football');const ball=g.state.weaponProjectiles[0],friend=g.state.players[1];
  Object.assign(friend,{x:ball.x+30,y:540,facing:-1,attack:{type:'kick',elapsed:0,windup:.2,duration:.5,hit:false}});
  g.updateWeaponProjectiles(1/60);assert.equal(ball.facing,-1);assert.equal(ball.owner,friend.id);
  const copy=new Simulation(['karonux','jo'],0,42);copy.state=g.snapshot();copy.nextId=g.nextId;copy.seed=g.seed;
  g.updateWeaponProjectiles(.1);copy.updateWeaponProjectiles(.1);assert.deepEqual(g.snapshot(),copy.snapshot());
  g.pause(true);const before=JSON.stringify(g.state.weaponProjectiles);g.step([]);assert.equal(JSON.stringify(g.state.weaponProjectiles),before);
});
test('new enemies join campaign roster; children telegraph sprint then lock their lane',()=>{
  for(const kind of ['tchoin','jalatrixGamer','kids_duo'])assert.ok(ENCOUNTER_ROSTER.includes(kind));
  for(const kind of ['julioKid','djeKid']){
    const {g,p}=arena(),e=g.spawnEnemy(kind,{x:650,y:540,cooldown:0,invincible:0});g.updateNewEnemy(e,1/60);
    assert.equal(e.newPattern.kind,'kidRush');const x=e.x;g.updateNewEnemy(e,.2);assert.equal(e.x,x);
    p.y=620;g.updateNewEnemy(e,.6);assert.ok(e.x<x);assert.equal(e.y,540);assert.equal(p.hp,p.maxHp);
  }
});
test('gamer invokes one Warcraft ally, capped and removed when owner falls',()=>{
  const {g}=arena(),e=g.spawnEnemy('jalatrixGamer',{x:700,y:540,cooldown:0,invincible:0});
  g.updateNewEnemy(e,.01);assert.equal(e.newPattern.kind,'summon');g.updateNewEnemy(e,1.6);
  const summons=g.state.enemies.filter(a=>a.gamerSummon);assert.equal(summons.length,1);assert.ok(summons[0].kind.startsWith('remy'));
  e.newPattern=null;e.cooldown=0;g.updateNewEnemy(e,.01);assert.equal(e.newPattern,null);
  e.hp=0;g.updateEnemy(summons[0],.01);assert.equal(summons[0].hp,0);
});
test('whip respects facing and lane, and damaging the gamer interrupts invocation',()=>{
  for(const facing of [1,-1]){
    const {g,p}=arena(),e=g.spawnEnemy('tchoin',{x:p.x-facing*200,y:p.y,facing,cooldown:0,invincible:0});
    g.state.players[1].hp=0;
    g.updateNewEnemy(e,.01);assert.equal(e.newPattern.kind,'whip');p.y+=90;g.updateNewEnemy(e,1);
    g.step([]);assert.equal(p.hp,p.maxHp);
  }
  const {g,p}=arena(),e=g.spawnEnemy('jalatrixGamer',{x:700,y:540,cooldown:0,invincible:0});
  g.updateNewEnemy(e,.01);g.damage(e,5,p,false);g.updateNewEnemy(e,2);
  assert.equal(g.state.enemies.filter(a=>a.gamerSummon).length,0);
});
