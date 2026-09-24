import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { FIGHTERS, blankInput, STEP } from '../game/data.js';
import { TALENTS, spendPoint } from '../game/progression.js';
import { neighborhoodChoices } from '../game/neighborhood-events.js';

// A player bot uses only normal input. It cannot change health, skip waves or deal damage directly.
function bot(state, player) {
  const input = blankInput();
  if (state.phase === 'badges') { input.jump = !player.routeHeld; return input; }
  if (player.grapple) { input.punch = true; input.x = -player.grapple.facing; return input; }
  if (player.hp <= 0) return input;
  if (state.phase === 'encounter' && state.neighborhoodEncounter.kind === 'petanque' && state.neighborhoodEncounter.status === 'active') {
    input.x = Math.abs(510-player.x)>20 ? Math.sign(510-player.x) : 0;
    input.y = Math.abs(550-player.y)>15 ? Math.sign(550-player.y) : 0;
    input.interact = !input.x && !input.y && !player.interactHeld;
    return input;
  }
  if (state.phase === 'encounter' && ['shells','gym','vending'].includes(state.neighborhoodEncounter.kind) && state.neighborhoodEncounter.status === 'active') {
    input.x = Math.abs(1090-player.x)>20 ? Math.sign(1090-player.x) : 0;
    input.y = Math.abs(625-player.y)>15 ? Math.sign(625-player.y) : 0;
    input.interact = !input.x && !input.y && !player.interactHeld; return input;
  }
  if (state.phase === 'encounter') {
    if (state.neighborhoodEncounter.choices[player.id]) return input;
    const choices = neighborhoodChoices(state.neighborhoodEncounter);
    const choice = state.neighborhoodEncounter.kind === 'picnic' && state.players.some(p => p.hp > 0 && p.energy < 25) ? choices.find(c => c.id === 'skip') : choices.find(c => c.id === 'food') || choices.find(c => c.id === 'accept');
    input.x = Math.abs(choice.x - player.x) > 20 ? Math.sign(choice.x - player.x) : 0;
    input.y = Math.abs(choice.y - player.y) > 15 ? Math.sign(choice.y - player.y) : 0;
    input.interact = !input.x && !input.y;
    return input;
  }
  if (state.phase === 'clear') { input.x = 1; return input; }
  if (!['fight', 'surprise'].includes(state.phase)) return input;
  const distance = target => Math.hypot(target.x - player.x, (target.y - player.y) * 1.5);
  const down = state.players.find(p => p.hp <= 0);
  if (down && distance(down) < 100) { input.revive = true; return input; }
  const food = state.pickups.filter(p => p.kind === 'food').sort((a, b) => distance(a) - distance(b))[0];
  const enemies = state.enemies.filter(e => e.hp > 0).sort((a, b) => distance(a) - distance(b));
  const bonus = state.phase === 'surprise' ? state.props.filter(p => p.bonus && p.hp > 0).sort((a, b) => distance(a) - distance(b))[0] : null;
  const target = player.hp < player.maxHp * .6 && food ? food : enemies[0] || bonus;
  if (!target) return input;
  const dx = target.x - player.x, dy = target.y - player.y;
  const stop = target === food ? 10 : 74;
  input.x = Math.abs(dx) > stop ? Math.sign(dx) : 0;
  input.y = Math.abs(dy) > (target === food ? 10 : 24) ? Math.sign(dy) : 0;
  const threat = enemies.find(e => (e.attack && !e.attack.hit && distance(e) < (e.attack.type === 'special' ? 260 : 145) && e.attack.elapsed > e.attack.windup * .4) || (e.pattern && !e.pattern.hit && e.pattern.elapsed > e.pattern.windup * .4 && distance(e) < 500));
  const hazard = state.hazards.find(h => h.enemy && Math.hypot(h.x-player.x,(h.y-player.y)*1.5)<(h.radius||80)+100 && h.delay<.5);
  if (hazard || threat) input.jump = true;
  if (threat && player.dodgeCd <= 0) { input.dodge = true; input.x = 0; input.y = player.y > 550 ? -1 : 1; }
  if (Math.abs(dx) < 140 && Math.abs(dy) < 50 && target !== food) {
    input.punch = true;
    input.special = player.energy >= 100 && (enemies.filter(e => distance(e) < 240).length >= 2 || target.boss);
  }
  return input;
}

function spendRunTalents(game) {
  for (const [slot, player] of game.state.players.entries()) {
    for (const key of ['strength', 'vitality', 'endurance', 'mobility', 'weapons']) if (player.progression.statPoints && player.progression.attributes[key] < (key === 'strength' || key === 'vitality' ? 10 : 6)) game.spendAttribute(slot, key);
    if (!player.progression?.points) continue;
    const next = TALENTS[player.kind].find(node => spendPoint(player.progression, node.id));
    if (next) game.spendStat(slot, next.id);
  }
}

test('every fighter can complete a six-street chapter through ordinary controls', () => {
  const results = [];
  for (const f of FIGHTERS) {
    const game = new Simulation([f.id], 0, 555);
    let ticks = 0;
    while (ticks++ < 60 * 1200 && game.state.chapter === 0 && game.state.phase !== 'over') { spendRunTalents(game); game.step(game.state.players.map(p => bot(game.state, p))); }
    results.push({ fighter: f.id, chapter: game.state.chapter, street: game.state.stage, phase: game.state.phase, seconds: Math.round(ticks * STEP), score: game.state.score });
  }
  console.log('Chapter playthroughs:', results);
  for (const r of results) assert.equal(r.chapter, 1, `${r.fighter}: stopped at street ${r.street + 1}, ${r.phase}`);
});

test('solo and duo complete the entire campaign without skipping encounters', () => {
  for (const team of [['karonux'], ['yanu', 'jualos']]) {
    // The no-reward route is intentionally verified on the accessible preset;
    // Arcade and Sans quartier keep their intended pressure for real players.
    const game = new Simulation(team, 0, 789, { difficulty: 'easy' });
    let ticks = 0;
    while (ticks++ < 60 * 7200 && !['over', 'won'].includes(game.state.phase)) {
      spendRunTalents(game);
      game.step(game.state.players.map(p => bot(game.state, p)));
    }
    console.log('Campaign:', team.join('+'), game.state.phase, `chapter ${game.state.chapter + 1}, street ${game.state.stage + 1}`, `${Math.round(ticks * STEP)}s`, `${game.state.kills} KOs`);
    assert.equal(game.state.phase, 'won', team.join('+'));
    assert.ok(game.state.kills > 100);
  }
});


test('shuffled solo and duo campaigns complete all six districts through ordinary controls',()=>{
 for(const team of [['karonux'],['yanu','jualos']]){
  const game=new Simulation(team,0,789,{difficulty:'easy',randomRoute:true});let ticks=0;
  while(ticks++<60*7200&&!['over','won'].includes(game.state.phase)){spendRunTalents(game);game.step(game.state.players.map(p=>bot(game.state,p)));}
  console.log('Shuffled campaign:',team.join('+'),game.state.phase,game.state.route.completed);
  assert.equal(game.state.phase,'won');assert.equal(game.state.route.completed.length,6);
 }
});
