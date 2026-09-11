import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { blankInput, STEP } from '../game/data.js';
import { randomEnemyKinds } from '../game/encounters.js';

const run = (game, seconds) => { for (let i = 0; i < seconds / STEP; i++) game.step([blankInput()]); };

test('racket and cane attacks remain available at contact and every classic can be drawn immediately', () => {
  for (const kind of ['orelsan', 'papy_jala']) {
    const game = new Simulation(['yanu'], 0, 79); game.state.phase = 'fight'; game.state.enemies = [];
    const p = game.state.players[0]; p.invincible = 0;
    const e = game.spawnEnemy(kind, { x: p.x + 60, y: p.y, cooldown: 0, invincible: 0 });
    game.step(); assert.equal(e.attack?.type, 'punch');
    const hp = p.hp; run(game, .7); assert.ok(p.hp < hp, `${kind} contact strike deals damage`);
  }
  for (let i = 0; i < 8; i++) {
    const sequence = [.99, (i + .1) / 8];
    assert.ok(randomEnemyKinds(0, 1, () => sequence.shift())[0]);
  }
});

test('legacy enemies use their distinct signature attacks', () => {
  const expected = {
    remy: 'impact', makouille: 'impact', papy_jala: 'pepper', orelsan: 'tennis',
    charlingals: 'knife', guylux: 'magicCard', kikor_e: 'pencil',
  };
  for (const [kind, hazardKind] of Object.entries(expected)) {
    const game = new Simulation(['yanu'], 3, 77); game.state.enemies = []; game.state.phase = 'fight';
    const player = game.state.players[0]; player.x = 500; player.y = 535; player.invincible = 999;
    const enemy = game.spawnEnemy(kind, { x: 760, y: 535, cooldown: 0, invincible: 0, attackCount: kind === 'remy' || kind === 'makouille' ? 2 : 0 });
    run(game, 1.15);
    assert.ok(game.state.hazards.some(h => h.kind === hazardKind), `${kind} should create ${hazardKind}`);
    assert.ok(enemy.attack || enemy.cooldown > 0, `${kind} should enter a readable attack cycle`);
  }
});

test('Papy Jala pepper briefly immobilizes a player', () => {
  const game = new Simulation(['yanu'], 3, 78); game.state.enemies = []; game.state.phase = 'fight';
  const player = game.state.players[0]; player.x = 500; player.y = 535; player.invincible = 0;
  game.spawnEnemy('papy_jala', { x: 760, y: 535, cooldown: 0, invincible: 0 });
  run(game, 1.1);
  const pepper = game.state.hazards.find(h => h.kind === 'pepper'); assert.ok(pepper);
  pepper.delay = 0; pepper.ttl = 1; game.updateWorld(STEP);
  assert.ok(player.stun > 0, 'pepper should apply a short stun');
});
