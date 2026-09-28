import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { ENEMIES, animation } from '../game/data.js';
import { ENCOUNTER_ROSTER, wavePlan } from '../game/encounters.js';

test('the Bourg de Saran stage-three encounter introduces the mayor mini-boss', () => {
  const waves = wavePlan(3, 2);
  assert.equal(waves.length, 4);
  assert.equal(waves[3].bossKind, 'maire');
  assert.equal(waves[3].miniBoss, true);
  assert.equal(ENCOUNTER_ROSTER.includes('mairePolice'), false);
});

test('the mayor summons two animated municipal officers who time out with the encounter', () => {
  const game = new Simulation(['jo'], 3, 71);
  game.state.stage = 2;
  game.enterStreet();
  game.state.wave = game.state.waves.length - 2;
  game.spawnWave();
  const mayor = game.state.enemies.find(enemy => enemy.kind === 'maire');
  assert.ok(mayor?.miniBoss);
  game.startMiniBossPattern(mayor, game.state.players[0]);
  assert.equal(mayor.pattern.kind, 'callPolice');
  game.updateMiniBoss(mayor, mayor.pattern.windup + .02);
  const officers = game.state.enemies.filter(enemy => enemy.kind === 'mairePolice');
  assert.equal(officers.length, 2);
  assert.ok(officers.every(officer => officer.owner === mayor.id && officer.summonTTL > 0));
  const officer=officers[0],player=game.state.players[0];
  officer.x=player.x-25;officer.y=player.y;officer.cooldown=0;
  game.updateEnemyAction(officer,.02);
  assert.equal(officer.attack?.type,'punch');
  assert.equal(animation('maire', 'special', true)[0].url, '/assets/boss/bourg_saran/maire.png');
  assert.equal(animation('mairePolice', 'walk', true).length, 2);
  officers.forEach(officer => game.updateMairePolice(officer, officer.summonTTL + .01));
  assert.ok(officers.every(officer => officer.hp === 0));
  assert.ok(ENEMIES.mairePolice.summonOnly);
});
