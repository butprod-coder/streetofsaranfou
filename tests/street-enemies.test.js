import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { Simulation } from '../game/simulation.js';
import { STREET_ENEMIES } from '../game/street-enemies-data.js';
import { blankInput, FLOOR } from '../game/data.js';

function arena(kind) {
  const sim = new Simulation(['karonux'], 0, 771);
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], spawnQueue: [], waves: [{ kinds: [] }], wave: 0 });
  const enemy = sim.spawnEnemy(kind, { x: 760, y: 540, cooldown: 0, invincible: 0 });
  const player = sim.state.players[0]; player.x = 550; player.y = 540; player.invincible = 99;
  return { sim, enemy, player };
}

test('new street rivals have an asset for every animation and stay inside the floor', async () => {
  for (const [kind, config] of Object.entries(STREET_ENEMIES)) {
    await access(new URL(`../assets/enemies/street/${kind}.png`, import.meta.url));
    const { sim, enemy } = arena(kind), patterns = new Set();
    for (let i = 0; i < 900; i++) { sim.step([blankInput()]); if (enemy.pattern) patterns.add(enemy.pattern.kind); }
    assert.ok(patterns.size, kind);
    assert.ok(enemy.x >= FLOOR.left && enemy.x <= FLOOR.right, kind);
    assert.ok(enemy.y >= FLOOR.top && enemy.y <= FLOOR.bottom, kind);
  }
});

test('street rivals expose their signature hazards', () => {
  for (const [kind, expected] of [['albero', 'impact'], ['oliver', 'streetProjectile'], ['titou', 'huntingDog'], ['cedric', 'streetPuddle']]) {
    const { sim, enemy } = arena(kind);
    const kindForTest = { albero: 'supporterCharge', oliver: 'tacoVolley', titou: 'huntingDog', cedric: 'puddle' }[kind];
    sim.executeStreetPattern(enemy, { kind: kindForTest, targetX: 520, targetY: 540, dx: -1, dy: 0, active: .65 });
    assert.ok(sim.state.hazards.some(h => h.kind === expected), `${kind} should create ${expected}`);
  }
});

test('street rivals cannot attack after KO or outside combat; heavy hits interrupt tells', () => {
  for (const kind of Object.keys(STREET_ENEMIES)) {
    const { sim, enemy, player } = arena(kind);
    enemy.eliteState = { sequence: 0 };
    sim.updateStreetEnemy(enemy, player, .01);
    // Close-distance rivals need a closer target to start their tell.
    if (!enemy.pattern) { enemy.x = player.x + 70; sim.updateStreetEnemy(enemy, player, .01); }
    assert.ok(enemy.pattern, kind);
    sim.damage(enemy, 1, player, true);
    assert.equal(enemy.pattern, null, `${kind}: heavy hit interrupts preparation`);
    sim.executeStreetPattern(enemy, { kind: STREET_ENEMIES[kind].pattern, targetX: player.x, targetY: player.y, dx: -1, dy: 0, active: .65 });
    sim.damage(enemy, enemy.hp, player, true);
    assert.ok(!sim.state.hazards.some(h => h.owner === enemy.id));
    const position = [enemy.x, enemy.y];
    enemy.stun = 0; enemy.cooldown = 0;
    for (let i = 0; i < 120; i++) sim.updateStreetEnemy(enemy, player, 1 / 60);
    assert.deepEqual([enemy.x, enemy.y], position);
    assert.equal(enemy.pattern, null);
    enemy.hp = 10; sim.state.phase = 'clear'; sim.updateStreetEnemy(enemy, player, 1);
    assert.equal(enemy.pattern, null);
  }
});
