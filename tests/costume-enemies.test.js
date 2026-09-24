import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput, FLOOR } from '../game/data.js';
import { COSTUME_ENEMIES, executeCostumePattern } from '../game/costume-enemies.js';

function arena(kind) {
  const sim = new Simulation(['jo'], 0, 771);
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], hazards: [], spawnQueue: [], waves: [{ kinds: [] }], wave: 0 });
  const enemy = sim.spawnEnemy(kind, { x: 600, y: 540, cooldown: 0, invincible: 0 });
  const player = sim.state.players[0]; Object.assign(player, { x: 650, y: 540, invincible: 0 });
  return { sim, enemy, player };
}
test('all eight costumes perform their own signature', () => {
  for (const [kind, config] of Object.entries(COSTUME_ENEMIES)) {
    const { sim, enemy, player } = arena(kind);
    sim.updateStreetEnemy(enemy, player, .01);
    assert.equal(enemy.pattern.kind, config.pattern);
    sim.updateStreetEnemy(enemy, player, enemy.pattern.windup);
    assert.ok(sim.state.hazards.some(h => h.owner === enemy.id && h.damage > 0), kind);
  }
});
test('pigeons wait for approach, then take off before diving', () => {
  const { sim, enemy, player } = arena('lorenzo_pigeons');player.x=100;
  sim.updateStreetEnemy(enemy,player,1);assert.equal(enemy.x,600);assert.ok(!enemy.pattern);
  player.x=500;sim.updateStreetEnemy(enemy,player,.01);assert.equal(enemy.pattern.hit,false);
  assert.equal(sim.state.hazards.length,0);
  sim.updateStreetEnemy(enemy,player,1.3);assert.ok(enemy.x<600);
});
test('bowling pins appear beyond the player and the ball travels toward them', () => {
  const { sim, enemy, player }=arena('titou_bowling');sim.updateStreetEnemy(enemy,player,.01);
  const pins=sim.state.hazards.find(h=>h.kind==='bowlingPins');assert.ok(pins.x>player.x);
  sim.updateStreetEnemy(enemy,player,1.2);assert.ok(sim.state.hazards.find(h=>h.kind==='bowlingBall').vx>0);
  for(let i=0;i<90;i++){sim.state.time+=1/60;sim.updateWorld(1/60);}
  assert.ok(!sim.state.hazards.some(h=>h.kind==='bowlingPins'));
});
test('Jo sticks on contact and releases after timeout or owner KO', () => {
  for(const ko of [false,true]){
    const {sim,enemy,player}=arena('jo_rose');executeCostumePattern.call(sim,enemy,{kind:'sticky'});sim.updateWorld(.01);
    assert.equal(player.sticky.owner,enemy.id);
    if(ko)enemy.hp=0;
    for(let i=0;i<80;i++)sim.updatePlayer(player,blankInput(),1/60);
    assert.equal(player.sticky,null);
  }
});
test('karaoke paralyzes only inside its zone; infernal lines cover the floor', () => {
  for(const inside of [true,false]){
    const {sim,enemy,player}=arena('jualos_karaoke');player.x=inside?650:1000;
    executeCostumePattern.call(sim,enemy,{kind:'karaoke'});sim.updateWorld(.01);
    assert.equal(player.stun>=1,inside);
  }
  const {sim,enemy}=arena('gustavax_diable');executeCostumePattern.call(sim,enemy,{kind:'hell',targetY:540});
  assert.equal(sim.state.hazards.length,2);
  assert.ok(sim.state.hazards.every(h=>h.x===FLOOR.left&&h.width===FLOOR.right-FLOOR.left&&h.delay>0));
});
test('opening trio differs across seeds and has no duplicates',()=>{
  const openings=new Set();for(let seed=1;seed<16;seed++){
    const sim=new Simulation(['jo'],0,seed),trio=sim.state.enemyOrder.slice(0,3);
    assert.equal(new Set(trio).size,3);assert.equal(new Set(sim.state.waves[0].kinds).size,3);openings.add(trio.join(','));
  }assert.ok(openings.size>10);
});
