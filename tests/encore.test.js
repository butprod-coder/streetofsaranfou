import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { ENCORE_ELITES, ENCORE_RULES as R } from '../game/elite-encore-data.js';
function arena(kind) {
  const sim = new Simulation(['gustavax'], 0, 41);
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], spawnQueue: [], waves: [{ kinds: [] }], wave: 0 });
  const e = sim.spawnEnemy(kind, { x: 600, y: 540, cooldown: 0, invincible: 0 });
  const p = sim.state.players[0]; Object.assign(p, { x: 500, y: 540, invincible: 0 });
  return { sim, e, p };
}
test('all fourteen encore patterns telegraph, resolve, recover and stay serializable', () => {
  for (const [kind, config] of Object.entries(ENCORE_ELITES)) for (const attack of [config.pattern, config.alternate]) {
    const { sim, e, p } = arena(kind); p.invincible = 99;
    e.pattern = { kind: attack, secondary: attack === config.alternate, elapsed: 0, windup: config.windup, active: config.active, targetX: p.x, targetY: p.y, dx: -1, dy: 0, hit: false };
    for (let i = 0; i < Math.ceil((config.windup + config.active + .1) * 60); i++) sim.step();
    assert.equal(e.pattern, null, attack); assert.ok(e.recovering > 1, attack);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(sim.state)));
    assert.ok(sim.state.hazards.length <= 6);
  }
});
test('street dancer closes into real windmill range, and his first attack hits a stationary target', () => {
  const { sim, e, p } = arena('rappeur'); e.x = 760; const hp = p.hp;
  for (let i = 0; i < 300 && p.hp === hp; i++) sim.step();
  assert.ok(p.hp < hp); assert.equal(e.pattern?.kind, 'breakdance');
});
test('carnivorous plants only bite on their visible beat, respect their cap and clear on owner death', () => {
  const { sim, e, p } = arena('carnivore');
  for (let i = 0; i < 10; i++) sim.executeEncore(e, { kind: 'plantGarden', targetX: p.x, targetY: p.y });
  assert.equal(sim.state.hazards.length, R.plantLimit);
  const h = sim.state.hazards[0]; p.x = h.x; p.y = h.y;
  h.delay = 0; h.activeAge = .4; const hp = p.hp;
  sim.updateWorld(.01); assert.equal(p.hp, hp, 'closed mouth is harmless');
  h.activeAge = R.plantCycle; sim.updateWorld(.01); assert.ok(p.hp < hp, 'open mouth bites');
  sim.damage(e, e.hp, p, true); assert.equal(sim.state.hazards.length, 0);
});
