import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { ENEMIES, animation } from '../game/data.js';
import { ENCOUNTER_ROSTER, wavePlan } from '../game/encounters.js';

test('Cap Saran introduces Remy after stage three with a four-summon shield gate', () => {
  const waves = wavePlan(4, 2);
  assert.equal(waves.length, 4);
  assert.equal(waves[3].bossKind, 'remyGeek');
  assert.equal(waves[3].miniBoss, true);
  for (const kind of ['remyGeek', 'remyOrc', 'remyPaladin', 'remyElf', 'remyTauren']) assert.equal(ENCOUNTER_ROSTER.includes(kind), false);

  const game = new Simulation(['jo'], 4, 71);
  game.state.stage = 2;
  game.enterStreet();
  game.state.wave = game.state.waves.length - 2;
  game.spawnWave();
  const remy = game.state.enemies.find(enemy => enemy.kind === 'remyGeek');
  assert.ok(remy?.miniBoss && remy.remyShielded);

  game.startMiniBossPattern(remy, game.state.players[0]);
  assert.equal(remy.pattern.kind, 'summonParty');
  game.updateMiniBoss(remy, remy.pattern.windup + .02);
  const party = game.state.enemies.filter(enemy => enemy.remySummon);
  assert.deepEqual(party.map(enemy => enemy.kind).sort(), ['remyElf', 'remyOrc', 'remyPaladin', 'remyTauren']);

  const player = game.state.players[0], hp = remy.hp;
  player.x=remy.x-80;player.y=remy.y;player.facing=1;
  game.damage(remy, 100, player, true);
  assert.equal(remy.hp, hp, 'Remy is immune while any summon is alive');
  remy.invincible = 0;
  remy.recovering = 0;
  game.state.bossCinema = null;
  for (const summon of party.slice(0, -1)) { summon.hp = 0; game.updateRemyShield(remy); assert.equal(remy.remyShielded, true); }
  party.at(-1).hp = 0;
  game.updateRemyShield(remy);
  assert.equal(remy.remyShielded, false);
  game.startAttack(player, 'kick');
  player.attack.elapsed = player.attack.windup;
  player.attack.hit = true;
  game.resolveAttack(player);
  assert.ok(remy.hp < hp, 'Remy becomes vulnerable after all four summons fall');

  assert.equal(animation('remyGeek', 'special', true)[0].url, '/assets/boss/cap_saran/remy.png');
  for (const kind of ['remyOrc', 'remyPaladin', 'remyElf', 'remyTauren']) assert.equal(animation(kind, 'walk', true).length, 1);
  assert.ok(ENEMIES.remyOrc.summonOnly && ENEMIES.remyGeek.storyBossOnly);
});

test('Remy purple phase-two pulse damages and electrifies nearby players',()=>{
 const g=new Simulation(['jo'],4,71);g.state.stage=2;g.enterStreet();g.state.wave=g.state.waves.length-2;g.spawnWave();g.state.bossCinema=null;
 const b=g.state.enemies.find(e=>e.kind==='remyGeek'),p=g.state.players[0];Object.assign(b,{remyPartySpawned:true,remyShielded:false,remyOnyxiaSpawned:true,bossPhase:2,enraged:true,attackCount:0});p.x=b.x-100;p.y=b.y;p.invincible=0;
 g.startMiniBossPattern(b,p);g.updateMiniBoss(b,b.pattern.windup+.01);const h=g.state.hazards.find(h=>h.kind==='remyScreenPulse');assert.equal(h.electric,true);const hp=p.hp;g.updateWorld(.1);g.updateWorld(.02);assert.ok(p.hp<hp);assert.ok(p.stun>=.85);assert.ok(p.electrifiedUntil>g.state.time);
});

 test('Onyxia restores Remy shield once in rage and releases it on defeat',()=>{
 const g=new Simulation(['jo'],4,71);g.state.stage=2;g.enterStreet();g.state.wave=g.state.waves.length-2;g.spawnWave();g.state.bossCinema=null;
 const b=g.state.enemies.find(e=>e.kind==='remyGeek');b.remyPartySpawned=true;b.remyShielded=false;b.hp=b.maxHp*.4;b.invincible=0;g.updateMiniBoss(b,.02);
 const dragon=g.state.enemies.find(e=>e.kind==='remyOnyxia');assert.ok(dragon);assert.equal(b.remyShielded,true);const hp=b.hp;g.damage(b,50,g.state.players[0],true);assert.equal(b.hp,hp);g.spawnRemyOnyxia(b);assert.equal(g.state.enemies.filter(e=>e.kind==='remyOnyxia').length,1);
 dragon.hp=0;g.updateRemyShield(b);assert.equal(b.remyShielded,false);g.damage(b,50,g.state.players[0],true);assert.ok(b.hp<hp);assert.equal(ENCOUNTER_ROSTER.includes('remyOnyxia'),false);
 });
