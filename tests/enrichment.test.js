import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { FIGHTERS, CHAPTERS, STEP, FLOOR, blankInput } from '../game/data.js';
import { BALANCE } from '../game/balance.js';
import { wavePlan } from '../game/encounters.js';
import { normalizeProfile, gainXp, spendPoint, maxXp, xpNeeded, applyProfile } from '../game/progression.js';
const run = (g, seconds, input = blankInput()) => { for (let i = 0; i < seconds / STEP; i++) g.step([input]); };
function bossArena(chapter, mode = 'normal') {
  const g = new Simulation(['karonux'], chapter, 556, { difficulty: mode });
  g.state.stage = 5; g.enterStreet(); g.state.wave = g.state.waves.length - 2; g.spawnWave();
  g.state.players[0].invincible = 999; return g;
}
test('all 36 streets have varied multi-wave plans, delayed reinforcement and locked exits', () => {
  for (let c = 0; c < 6; c++) for (let street = 0; street < 6; street++) {
    const waves = wavePlan(c, street); assert.ok(waves.length >= 2);
    assert.ok(new Set(waves.map(w => JSON.stringify(w.kinds))).size > 1);
    assert.equal(waves.at(-1).boss, street === 5);
    const g = new Simulation(['jo'], c, 1); g.state.stage = street; g.enterStreet(); g.spawnWave();
    g.state.players[0].x = 1200; g.state.players[0].invincible = 999;
    assert.ok(g.state.spawnQueue.length > 0); assert.equal(g.state.enemies.length, 1);
    for (let wave = 0; wave < waves.length; wave++) {
      // Test the gate independently of combat: defeat all currently scheduled actors.
      g.state.spawnQueue = []; g.state.enemies = []; g.step();
      if (wave < waves.length - 1) { assert.equal(g.state.phase, 'rest'); assert.equal(g.state.stage, street); run(g, 4.1); assert.equal(g.state.phase, 'fight'); }
    }
    assert.equal(g.state.phase, 'transition');
  }
});
test('difficulty changes aggression and telegraphs without HP inflation', () => {
  const easy = new Simulation(['jo'], 4, 1, { difficulty: 'easy' }), hard = new Simulation(['jo'], 4, 1, { difficulty: 'hard' });
  easy.spawnWave(); hard.spawnWave(); const a = easy.state.enemies[0], b = hard.state.enemies[0];
  assert.equal(a.hp, b.hp); assert.ok(b.speed > a.speed);
  easy.startAttack(a, 'punch'); hard.startAttack(b, 'punch'); assert.ok(a.attack.windup > b.attack.windup); assert.ok(a.cooldown > b.cooldown);
});
test('RPG curve, stat limits, malformed profiles and maximum level are bounded', () => {
  let p = normalizeProfile({ totalXp: Infinity, stats: { attack: 999 } }); assert.equal(p.level, 1); assert.equal(p.stats.attack, 0);
  p = gainXp(p, xpNeeded(1)); assert.equal(p.level, 2); assert.equal(p.points, 2); assert.equal(p.xp, 0);
  p = spendPoint(p, 'attack'); assert.equal(p.points, 1); assert.equal(p.stats.attack, 1); assert.equal(spendPoint(p, '__proto__'), null);
  p = normalizeProfile({ totalXp: maxXp * 9, stats: { attack: 999, life: 999, defense: 999, special: 999 } });
  assert.equal(p.level, BALANCE.rpg.maxLevel); assert.equal(p.totalXp, maxXp); assert.equal(p.nextXp, 0);
  assert.ok(Object.values(p.stats).reduce((a, b) => a + b) <= 38); assert.ok(Object.values(p.stats).every(n => n <= 12));
});
test('XP rewards are shared in duo, independent by fighter and stats spend only in safe states', () => {
  const g = new Simulation(['jo', 'yanu'], 0, 1, { profiles: [{ totalXp: 120 }, {}] });
  assert.equal(g.state.players[0].progression.level, 2); assert.equal(g.state.players[1].progression.level, 1);
  assert.ok(g.spendStat(0, 'life')); assert.equal(g.state.players[0].maxHp, Math.round(120 * 1.03));
  g.spawnWave(); assert.equal(g.spendStat(0, 'attack'), false); g.pause(true); assert.ok(g.spendStat(0, 'attack'));
  const totals = g.state.players.map(p => p.progression.totalXp); g.awardXp(100);
  g.state.players.forEach((p, i) => assert.equal(p.progression.totalXp, totals[i] + 100));
  const enemy = g.state.enemies[0], xp = g.state.players[0].progression.totalXp;
  g.damage(enemy, 999, g.state.players[0], true); g.damage(enemy, 999, g.state.players[0], true);
  assert.equal(g.state.players[0].progression.totalXp, xp + BALANCE.xp[enemy.kind]);
});
test('every boss has monotonic visible phases, different patterns and recovery windows', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const g = bossArena(chapter), boss = g.state.enemies[0], p = g.state.players[0];
    if (boss.vehicle) { const kills = g.state.kills; g.damage(boss, 999, p, true); assert.equal(boss.vehicle, false); assert.equal(g.state.kills, kills); }
    boss.cooldown = 0;
    const patterns = new Set(); let openings = 0;
    for (let i = 0; i < 60 * 30; i++) { g.step(); if (boss.pattern) patterns.add(boss.pattern.kind); if (boss.recovering > 0) openings++; }
    assert.ok(patterns.size >= 2, `${boss.kind}: ${[...patterns]}`); assert.ok(openings > 0, boss.kind);
    for (const [i, threshold] of BALANCE.bosses[boss.kind].phases.entries()) {
      boss.hp = boss.maxHp * (threshold - .01); g.step(); assert.equal(boss.bossPhase, i + 2, boss.kind);
      boss.hp = boss.maxHp; g.step(); assert.equal(boss.bossPhase, i + 2, 'healing cannot rewind a phase');
    }
    assert.ok(g.state.enemies.every(e => e.x >= FLOOR.left && e.x <= FLOOR.right && e.y >= FLOOR.top && e.y <= FLOOR.bottom));
  }
});
test('Karonux smoke and Yanu whisky are limited and interruptible', () => {
  for (const chapter of [0, 2]) {
    const g = bossArena(chapter), e = g.state.enemies[0]; if (e.vehicle) g.damage(e, 999, g.state.players[0], true);
    e.hp = e.maxHp * .4; e.bossPhase = 2; e.attackCount = 3; e.cooldown = 0; e.invincible = 0; e.stun = 0; g.step();
    assert.ok(e.pattern?.healing); const hp = e.hp; g.damage(e, 5, g.state.players[0], false);
    assert.equal(e.pattern, null); assert.ok(e.hp < hp); assert.equal(e.healUses, 1);
  }
});
test('each playable special is distinct, expires, respects cooldown, and stays in bounds', () => {
  for (const f of FIGHTERS) {
    const g = new Simulation([f.id], 0, 42); g.spawnWave(); g.state.spawnQueue = [];
    const p = g.state.players[0], e = g.state.enemies[0]; e.hp = e.maxHp = 10000; e.speed = 0; e.cooldown = 999; e.invincible = 0; e.x = p.x + 75; e.y = p.y;
    g.step([{ ...blankInput(), special: true }]); assert.equal(p.specialState.kind, f.id); assert.ok(p.specialCd > 0);
    run(g, .7); if (f.id === 'karonux') assert.equal(p.action, 'sleep');
    if (f.id === 'kikor') { assert.equal(g.state.allies.length, 1); assert.ok(g.state.props.some(p => p.kind === 'easel')); }
    if (f.id === 'lorenzo') assert.equal(g.state.hazards.filter(h => h.kind === 'fire').length, 3);
    run(g, 3); assert.equal(p.specialState, null); const energy = p.energy;
    g.step([{ ...blankInput(), special: true }]); assert.ok(p.energy >= energy); assert.equal(p.specialState, null);
    assert.ok(p.x >= FLOOR.left && p.x <= FLOOR.right && p.y >= FLOOR.top && p.y <= FLOOR.bottom);
    run(g, 12); assert.equal(g.state.allies.length, 0);
  }
});
test('boss summons are finite, paintings breakable, boss death cleans owned hazards', () => {
  const g = bossArena(1), e = g.state.enemies[0]; e.cooldown = 0; run(g, 4);
  const easel = g.state.props.find(p => p.kind === 'easel'); assert.ok(easel); assert.ok(g.state.enemies.some(e => e.kind === 'creation'));
  const p = g.state.players[0]; p.x = easel.x - 50; p.y = easel.y; p.facing = 1;
  for (let i = 0; i < 2; i++) { g.startAttack(p, 'kick'); g.resolveAttack(p); }
  assert.equal(easel.hp, 0);
  g.hazard(e, { kind: 'fire', ttl: 5 }); g.damage(e, 9999, p, true);
  assert.equal(g.state.hazards.filter(h => h.owner === e.id).length, 0);
});
test('defense and special investment are modest and do not refill existing health', () => {
  const g = new Simulation(['yanu']), p = g.state.players[0]; p.hp = 30;
  applyProfile(p, { totalXp: maxXp, stats: { defense: 12, special: 12 } }); assert.equal(p.hp, 30);
  const before = p.hp; g.damage(p, 20, { x: 0, facing: 1 }, false); assert.equal(before - p.hp, 15);
  assert.ok(p.bonuses.special < 1.5); assert.ok(p.bonuses.cooldown > .8);
});

test('level-up feedback reports multiple levels correctly and XP stops at the cap', () => {
  const g = new Simulation(['kikor']); g.awardXp(600);
  const event = g.state.events.find(e => e.type === 'levelup'); assert.equal(event.pointsGained, 6); assert.equal(event.level, 4);
  g.awardXp(maxXp); const seq = g.state.eventSeq; g.awardXp(99); assert.equal(g.state.eventSeq, seq);
});

test('ordinary attackers share the telegraph budget with bosses', () => {
  for (const team of [['jo'], ['jo', 'yanu']]) {
    const g = new Simulation(team, 4, 900); g.spawnWave(); g.state.spawnQueue = []; g.state.enemies = [];
    for (const p of g.state.players) p.invincible = 999;
    for (let i = 0; i < 9; i++) g.spawnEnemy('remy', { x: 265, y: 535, invincible: 0, cooldown: 0 });
    const boss = bossArena(4).state.enemies[0]; boss.id = 999; boss.cooldown = 0; boss.x = 400;
    g.state.enemies.unshift(boss);
    for (let tick = 0; tick < 600; tick++) {
      g.step(); const count = g.state.enemies.filter(e => e.pattern || e.attack && !e.attack.hit).length;
      assert.ok(count <= (team.length > 1 ? 3 : 2));
    }
  }
});
