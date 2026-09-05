import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { FIGHTERS, blankInput, STEP } from '../game/data.js';

// A player bot uses only normal input. It cannot change health, skip waves or deal damage directly.
function bot(state, player) {
  const input = blankInput();
  if (player.hp <= 0) return input;
  if (state.phase === 'clear') { input.x = 1; return input; }
  if (state.phase !== 'fight') return input;
  const distance = target => Math.hypot(target.x - player.x, (target.y - player.y) * 1.5);
  const down = state.players.find(p => p.hp <= 0);
  if (down && distance(down) < 100) { input.revive = true; return input; }
  const food = state.pickups.filter(p => p.kind === 'food').sort((a, b) => distance(a) - distance(b))[0];
  const enemies = state.enemies.filter(e => e.hp > 0).sort((a, b) => distance(a) - distance(b));
  const target = player.hp < player.maxHp * .6 && food ? food : enemies[0];
  if (!target) return input;
  const dx = target.x - player.x, dy = target.y - player.y;
  const stop = target === food ? 10 : 74;
  input.x = Math.abs(dx) > stop ? Math.sign(dx) : 0;
  input.y = Math.abs(dy) > (target === food ? 10 : 24) ? Math.sign(dy) : 0;
  const threat = enemies.find(e => e.attack && !e.attack.hit && distance(e) < (e.attack.type === 'special' ? 260 : 145) && e.attack.elapsed > e.attack.windup * .4);
  if (threat && player.dodgeCd <= 0) { input.dodge = true; input.x = 0; input.y = player.y > 550 ? -1 : 1; }
  if (Math.abs(dx) < 140 && Math.abs(dy) < 50 && target !== food) {
    input.punch = true;
    input.special = player.energy >= 50 && (enemies.filter(e => distance(e) < 240).length >= 2 || target.boss);
  }
  return input;
}

test('every fighter can complete a six-street chapter through ordinary controls', () => {
  const results = [];
  for (const f of FIGHTERS) {
    const game = new Simulation([f.id], 0, 555);
    let ticks = 0;
    while (ticks++ < 60 * 450 && game.state.chapter === 0 && game.state.phase !== 'over') game.step(game.state.players.map(p => bot(game.state, p)));
    results.push({ fighter: f.id, chapter: game.state.chapter, street: game.state.stage, phase: game.state.phase, seconds: Math.round(ticks * STEP), score: game.state.score });
  }
  console.log('Chapter playthroughs:', results);
  for (const r of results) assert.equal(r.chapter, 1, `${r.fighter}: stopped at street ${r.street + 1}, ${r.phase}`);
});

test('solo and duo complete the entire campaign without skipping encounters', () => {
  for (const team of [['karonux'], ['yanu', 'jualos']]) {
    const game = new Simulation(team, 0, 789);
    let ticks = 0;
    while (ticks++ < 60 * 2000 && !['over', 'won'].includes(game.state.phase)) game.step(game.state.players.map(p => bot(game.state, p)));
    console.log('Campaign:', team.join('+'), game.state.phase, `chapter ${game.state.chapter + 1}, street ${game.state.stage + 1}`, `${Math.round(ticks * STEP)}s`, `${game.state.kills} KOs`);
    assert.equal(game.state.phase, 'won', team.join('+'));
    assert.ok(game.state.kills > 100);
  }
});
