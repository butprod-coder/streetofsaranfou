import { KARONUX_MILESTONES } from '../game/karonux-talents.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { BALANCE } from '../game/balance.js';
import { blankInput, FLOOR, STEP } from '../game/data.js';
import { applyProfile, TALENTS, xpForLevel } from '../game/progression.js';
const run = (g, seconds, input = blankInput()) => { for (let i = 0; i < seconds / STEP; i++) g.step([input]); };
function arena(kind) {
  const g = new Simulation([kind]); g.spawnWave(); g.state.props = []; g.state.spawnQueue = [];
  const p = g.state.players[0], e = g.state.enemies[0];
  p.invincible = 0; e.hp = e.maxHp = 10000; e.speed = 0; e.cooldown = 999; e.invincible = 0; e.x = p.x + 100; e.y = p.y;
  if(['karonux','lorenzo','jualos','yanu','jo','kikor','gustavax'].includes(kind)) applyProfile(p,{milestones:KARONUX_MILESTONES,talents:TALENTS[kind].slice(0,4).map(n=>n.id)});
  return { g, p, e };
}
test('transformations preserve base stats through refresh, expiry, street change and death',()=>{
 const {g,p,e}=arena('gustavax');p.hp=77.5;const base={hp:p.hp,maxHp:p.maxHp,power:p.power,speed:p.speed};for(let i=0;i<3;i++){p.energy=100;g.activateSpecial(p);applyProfile(p,p.progression);g.updateSpecial(p,blankInput(),7.1);assert.equal(p.hp,base.hp);assert.equal(p.maxHp,base.maxHp);assert.equal(p.power,base.power);assert.equal(p.speed,base.speed);}p.energy=100;g.activateSpecial(p);g.enterStreet();assert.equal(p.specialState,null);p.invincible=0;g.damage(p,9999,e,false);assert.equal(p.hp,0);g.revivePlayer(p,.5);assert.equal(p.hp,Math.round(155*.5));
});

test('Golf follows all directions, stops when released and exits at the chosen position', () => {
  const {g,p,e}=arena('karonux');p.energy=100;g.activateSpecial(p);const start={x:p.x,y:p.y};run(g,.3);assert.equal(p.x,start.x);assert.equal(p.y,start.y);assert.equal(e.hp,10000);
  run(g,.4,{...blankInput(),x:1});assert.ok(p.x>start.x+90);assert.ok(e.hp<10000);
  const right=p.x;run(g,.2,{...blankInput(),x:-1});assert.ok(p.x<right-80);assert.equal(p.facing,-1);
  run(g,.2,{...blankInput(),y:-1});assert.ok(p.y<start.y-35);run(g,.1,{...blankInput(),y:1});assert.ok(p.y>start.y-40);
  const stop={x:p.x,y:p.y};run(g,8);assert.equal(p.specialState,null);assert.equal(p.x,stop.x);assert.equal(p.y,stop.y);assert.notEqual(p.x,start.x);assert.notEqual(p.action,'sleep');assert.equal(p.energy,0);
});
test('Golf cannot leave the street or hit a boss repeatedly without leaving contact',()=>{
  const {g,p,e}=arena('karonux');e.boss=true;e.kind='karonux';p.energy=100;g.activateSpecial(p);const a=p.specialState;
  for(let i=0;i<480;i++){g.step([{...blankInput(),x:i%80<40?1:-1,y:i%60<30?1:-1}]);assert.ok(p.x>=FLOOR.left&&p.x<=FLOOR.right);assert.ok(p.y>=FLOOR.top&&p.y<=FLOOR.bottom);}
  assert.ok(Object.values(a.hits).every(h=>h.next>0));assert.equal(p.specialState,null);
});

test('Kikor summons immediately, attacks and cleans companions on expiry', () => {
 const {g,p,e}=arena('kikor');applyProfile(p,{milestones:KARONUX_MILESTONES,talents:TALENTS.kikor.filter(n=>n.branchIndex===1).slice(0,1).map(n=>n.id)});p.energy=100;g.activateSpecial(p);assert.equal(g.state.allies.length,1);const ally=g.state.allies[0];e.x=ally.x+35;e.y=ally.y;run(g,1);assert.ok(e.hp<10000);run(g,6);assert.equal(g.state.allies.length,0);
});
test('Jo transpalette accelerates, steers, stops when released and remains in bounds', () => {
  const { g, p } = arena('jo'); p.energy = 100; g.activateSpecial(p); const x = p.x, y = p.y;
  run(g, .2); assert.equal(p.x, x); assert.equal(p.y, y);
  run(g, .4, { ...blankInput(), x: 1 }); assert.ok(p.x > x + 50);
  const right = p.x; run(g, .2, { ...blankInput(), x: -1 }); assert.ok(p.x < right - 50);
  const stopped = p.x; run(g, .2); assert.equal(p.x, stopped);
  p.x = FLOOR.right - 1; run(g, .2, { ...blankInput(), x: 1, y: -1 }); assert.equal(p.x, FLOOR.right); assert.ok(p.y < y);
});
test('Lorenzo throws three cigarettes, leaves finite fire and never hurts teammates', () => {
  const { g, p, e } = arena('lorenzo'); applyProfile(p,{milestones:KARONUX_MILESTONES,talents:TALENTS.lorenzo.slice(0,5).map(n=>n.id)}); p.energy = 100; g.activateSpecial(p); run(g, .4,{...blankInput(),kick:true});
  const fires = g.state.hazards.filter(h => h.kind === 'fire'); assert.equal(fires.length, 3); assert.equal(new Set(fires.map(h => `${h.x}:${h.y}`)).size, 3);
  e.x = fires[0].x; e.y = fires[0].y; p.x = e.x; p.y = e.y; const hp = p.hp;
  run(g, .7); assert.ok(e.hp < 10000); assert.equal(p.hp, hp);
  assert.ok(g.state.hazards.every(h=>!h.enemy));
  run(g, 4.5); assert.equal(g.state.hazards.filter(h => h.kind === 'fire').length, 0);
});
test('Triso locks his target before spitting; puddles can be jumped and expire', () => {
  const { g, p } = arena('jo'); g.state.enemies = [];
  const triso = g.spawnEnemy('triso', { x: p.x + 250, y: p.y, cooldown: 0, invincible: 0 });
  g.step(); assert.equal(triso.attack.type, 'special'); const target = { ...triso.spitTarget }; p.x += 120;
  run(g, 1.1); const puddle = g.state.hazards.find(h => h.kind === 'slime'); assert.ok(puddle); assert.equal(puddle.x, target.x); assert.equal(puddle.y, target.y);
  triso.cooldown = 999; p.x = puddle.x; p.y = puddle.y; p.z = 100; p.vz = 0; const hp = p.hp;
  puddle.delay = 0; g.updateWorld(STEP); assert.equal(p.hp, hp); p.z = 0; p.invincible = 0; g.updateWorld(STEP); assert.ok(p.hp < hp);
  p.invincible = 999; run(g, 5); assert.ok(!g.state.hazards.some(h => h.kind === 'slime'));
});
