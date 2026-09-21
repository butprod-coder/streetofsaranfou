import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { ELITES, ELITE_RULES } from '../game/elite-data.js';
import { randomEnemyKinds, wavePlan } from '../game/encounters.js';
import { blankInput, ENEMIES, FLOOR, STEP } from '../game/data.js';
import { audioSettings, AUDIO_DEFAULTS } from '../game/audio-settings.js';

function arena(kind) {
  const sim = new Simulation(['gustavax'], 0, 231);
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], spawnQueue: [], waves: [{ kinds: [] }], wave: 0 });
  const e = sim.spawnEnemy(kind, { x: 750, y: 540, cooldown: 0, invincible: 0 });
  sim.state.players[0].x = 520; sim.state.players[0].y = 540; sim.state.players[0].invincible = 0;
  return { sim, e, p: sim.state.players[0] };
}
test('audio defaults are quiet, persisted values are bounded and malformed settings are safe', () => {
  assert.deepEqual(audioSettings(null), AUDIO_DEFAULTS);
  assert.deepEqual(audioSettings({ master: -1, music: 9, effects: '100' }), { master: 0, music: 1, effects: .65 });
});
test('the complete enemy roster appears equally from chapter one across consecutive bags', () => {
  const sim = new Simulation(['jo'], 0, 17), bag = [];
  const values = randomEnemyKinds(0, Object.keys(ENEMIES).length * 3, () => sim.random(), bag);
  for (const kind of Object.keys(ENEMIES)) assert.equal(values.filter(v => v === kind).length, 3);
});
test('each elite executes its ability, respects bounds and finite hazards, and is killable', () => {
  for (const kind of Object.keys(ELITES)) {
    const { sim, e, p } = arena(kind); const kinds = new Set();
    for (let i = 0; i < 1300; i++) {
      p.hp = p.maxHp; p.invincible = 2; sim.step([blankInput()]);
      if (e.pattern) kinds.add(e.pattern.kind);
      assert.ok(e.x >= FLOOR.left && e.x <= FLOOR.right);
      assert.ok(sim.state.hazards.length <= 12, kind);
    }
    assert.ok(kinds.has(ELITES[kind].pattern), kind);
    sim.damage(e, e.hp, p, true); assert.equal(e.hp, 0);
    assert.ok(!sim.state.hazards.some(h => h.owner === e.id));
    sim.step(); assert.equal(sim.state.phase, 'clear');
  }
});
test('sofa drops, Lorenzo is ejected by heavy hits, sitting enrages once without trapping players', () => {
  const { sim, e, p } = arena('canape');
  for (let i = 0; i < 100; i++) sim.step();
  assert.equal(e.eliteState.landing, 0);
  for (let i = 0; i < ELITE_RULES.sofaHeavyHits; i++) sim.damage(e, 1, p, true);
  assert.equal(e.eliteState.seated, false);
  const sofa = sim.state.props.find(x => x.kind === 'sofa'); assert.ok(sofa);
  p.x = sofa.x; p.y = sofa.y; p.invincible = 2;
  for (let i = 0; i < 35; i++) sim.step([{ ...blankInput(), revive: true }]);
  assert.equal(e.enraged, true); assert.equal(p.sitting, sofa.id);
  assert.equal(sim.state.events.filter(x => x.type === 'rage').length, 1);
  sim.step([{ ...blankInput(), x: -1 }]); assert.equal(p.sitting, null);
  sim.hitProp(sofa, 10, p); assert.equal(sofa.hp, 0);
});
test('elites share the attack budget, pause is deterministic and snapshots preserve their states', () => {
  const { sim, e } = arena('precieux');
  for (let i = 0; i < 5; i++) sim.spawnEnemy('princesse', { cooldown: 0, x: 800, y: 540 });
  sim.step(); assert.ok(sim.state.enemies.filter(x => x.pattern).length <= 2);
  assert.deepEqual(sim.snapshot().enemies[0].eliteState, e.eliteState);
  const before = sim.snapshot(); sim.pause(true); sim.step(); sim.pause(false); assert.deepEqual(sim.snapshot(), before);
});
test('every boss introduces a signature after phase change and leaves a counterattack window', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const sim = new Simulation(['gustavax'], chapter, 9); sim.state.stage = 5; sim.enterStreet(); sim.state.wave = sim.state.waves.length - 2; sim.spawnWave();
    const boss = sim.state.enemies.find(x => x.boss), p = sim.state.players[0];
    boss.vehicle = false; boss.hp = boss.maxHp * .25; boss.cooldown = 0;
    for (let i = 0; i < 500; i++) { p.hp = p.maxHp; p.invincible = 10; sim.step([blankInput()]); if (boss.pattern?.signature) break; }
    assert.ok(boss.pattern?.signature, boss.kind);
    const pattern = boss.pattern; assert.ok(pattern.windup >= 1);
    for (let i = 0; i < 420 && boss.pattern; i++) { p.hp = p.maxHp; p.invincible = 10; sim.step([blankInput()], STEP); }
    assert.ok(boss.recovering > 1, boss.kind);
    sim.damage(boss, boss.hp + 100, p, true);
    assert.ok(!sim.state.hazards.some(h => h.owner === boss.id));
  }
});
