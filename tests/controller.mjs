import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
import { Simulation } from '../game/simulation.js';

// Only this isolated test server exposes fixtures to the test process, never to browser clients.
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => {
  window.testPad = { connected: true, id: 'Xbox standard / DualSense standard test fixture', mapping: 'standard', index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  Object.defineProperty(navigator, 'getGamepads', { value: () => [window.testPad] });
  if (!localStorage.getItem('saranfou-progression-v1')) localStorage.setItem('saranfou-progression-v1', JSON.stringify({ karonux: { totalXp: 600, stats: {} } }));
});
await mkdir('test-results', { recursive: true });
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const screen = name => page.waitForFunction(n => window.saranfou?.inspect().screen === n, name, { timeout: 60000 });
const inspect = () => page.evaluate(() => window.saranfou.inspect());
async function pad(index, duration = 90) {
  await page.evaluate(i => { window.testPad.buttons[i] = { pressed: true, value: 1 }; }, index); await page.waitForTimeout(duration);
  await page.evaluate(i => { window.testPad.buttons[i] = { pressed: false, value: 0 }; }, index); await page.waitForTimeout(65);
}
async function focus(selector) {
  for (let i = 0; i < 45; i++) {
    if (await page.evaluate(s => document.activeElement?.matches(s), selector)) return;
    await pad(13, 45);
  }
  throw new Error(`Controller cannot reach ${selector}`);
}
async function choose(selector) { await focus(selector); await pad(0); }
try {
  await page.goto(url); await screen('home');
  await choose('[data-action=solo]'); await screen('select');
  const initialFocus = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() => { window.testPad.axes[1] = .8; }); await page.waitForTimeout(200);
  const analogFocus = await page.evaluate(() => document.activeElement.outerHTML); assert.notEqual(analogFocus, initialFocus);
  await page.waitForTimeout(450); assert.equal(await page.evaluate(() => document.activeElement.outerHTML), analogFocus, 'Held analog direction navigates only once');
  await page.evaluate(() => { window.testPad.axes[1] = 0; }); await page.waitForTimeout(80);
  await focus('[data-fighter=karonux]'); await pad(0);
  await choose('[data-action=evolution]'); await screen('evolution');
  await page.screenshot({ path: 'test-results/evolution.png' });
  await focus('[data-stat=life]'); await pad(0, 850);
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('saranfou-progression-v1')));
  assert.equal(saved.karonux.stats.life, 1, 'Held A spends exactly one point');
  await pad(1); await screen('select');
  await choose('[data-fighter=yanu]'); await choose('[data-action=evolution]');
  assert.match(await page.locator('#evolution-level').textContent(), /NIVEAU 1 /);
  await pad(1); await choose('[data-fighter=karonux]');
  await focus('#difficulty-select'); await pad(15); assert.equal(await page.locator('#difficulty-select').inputValue(), 'hard'); await pad(14);
  await choose('[data-action=play]'); await screen(null);
  await page.waitForFunction(() => window.saranfou.inspect().state.phase === 'fight');
  let state = (await inspect()).state, x = state.players[0].x;
  await page.evaluate(() => { window.testPad.axes[0] = .7; }); await page.waitForTimeout(400); await page.evaluate(() => { window.testPad.axes[0] = 0; });
  assert.ok((await inspect()).state.players[0].x > x + 30, 'Analog stick moves');
  x = (await inspect()).state.players[0].x; await pad(14, 250); assert.ok((await inspect()).state.players[0].x < x - 20, 'Dpad moves');
  await pad(0, 100); assert.ok((await inspect()).state.players[0].z > 0, 'A jumps'); await page.waitForTimeout(750);
  await pad(2); assert.equal((await inspect()).state.players[0].action, 'punch'); await page.waitForTimeout(300);
  await pad(3); assert.equal((await inspect()).state.players[0].action, 'kick'); await page.waitForTimeout(500);
  await pad(5); assert.ok((await inspect()).state.players[0].dodgeCd > 0);
  await page.waitForTimeout(350); await pad(1); assert.equal((await inspect()).state.players[0].specialState.kind, 'karonux');
  await page.waitForTimeout(550); assert.equal((await inspect()).state.players[0].action, 'sleep');
  await pad(9, 700); await screen('pause');
  const tick = (await inspect()).state.tick; await page.waitForTimeout(200); assert.equal((await inspect()).state.tick, tick);
  await choose('[data-action=evolution]'); await screen('evolution'); await focus('[data-stat=attack]'); await pad(0);
  assert.equal((await inspect()).state.players[0].progression.stats.attack, 1);
  await pad(1); await screen('pause'); await choose('[data-action=controls]'); await pad(1); await screen('pause');
  await pad(1); await screen(null); await pad(9); await choose('[data-action=quit]'); await screen('home');
  await page.reload(); await screen('home'); saved = await page.evaluate(() => JSON.parse(localStorage.getItem('saranfou-progression-v1')));
  assert.equal(saved.karonux.stats.attack, 1); assert.equal(saved.yanu.level, 1);
  console.log('PASS controller: character selection, analog + dpad, all attacks, pause, controls, RPG, held buttons, persistence.');

  // Entire host flow uses only the virtual controller. Guest represents another real browser.
  await choose('[data-action=online]'); await choose('[data-action=host]'); await screen('lobby');
  const code = (await inspect()).room;
  const guestContext = await browser.newContext(); const guest = await guestContext.newPage();
  await guest.goto(`${url}/?room=${code}`); await guest.getByRole('button', { name: /Rejoindre/ }).click();
  await guest.waitForFunction(() => window.saranfou?.inspect().screen === 'lobby');
  await choose('[data-action=ready]'); await guest.locator('#ready-button').click(); await screen(null);
  const room = server.rooms.get(code);
  room.sim.awardXp(250); await pad(9); await screen('pause'); await choose('[data-action=evolution]');
  const previous = room.sim.state.players[0].progression.stats.defense;
  await focus('[data-stat=defense]'); await pad(0, 800); assert.equal(room.sim.state.players[0].progression.stats.defense, previous + 1);
  await pad(1); await screen('pause'); await pad(1); await screen(null);
  room.sim.state.phase = 'over'; room.sim.pause(false);
  // Ping recovers the final state even when simulation ticking has stopped.
  await screen('result'); await choose('[data-action=evolution]'); await pad(1); await screen('result');
  await choose('[data-action=retry]'); await screen('lobby');
  assert.equal(room.players[0].profile.stats.defense, previous + 1, 'Retry retains RPG');
  await choose('[data-action=leave]'); await screen('home');
  // Join a fresh lobby with a code entered entirely via controller, no on-screen keyboard dependency.
  await guest.goto(url); await guest.getByRole('button', { name: /Ramener un pote/ }).click(); await guest.getByRole('button', { name: /Créer un salon/ }).click();
  await guest.waitForFunction(() => window.saranfou?.inspect().screen === 'lobby');
  const joinCode = await guest.locator('#room-code').textContent();
  await choose('[data-action=online]'); await focus('#room-input');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (const character of joinCode) {
    await pad(0); const index = alphabet.indexOf(character), direction = index > 16 ? 14 : 15, steps = index > 16 ? 32 - index : index;
    for (let i = 0; i < steps; i++) await pad(direction, 40);
  }
  assert.equal(await page.locator('#room-input').inputValue(), joinCode);
  await pad(13); await pad(0); await screen('lobby'); assert.equal((await inspect()).slot, 1);
  await choose('[data-action=leave]'); await screen('home');
  await guestContext.close();
  console.log('PASS controller: online hosting and code entry/join, ready, shared RPG allocation, Game Over / Continue, retry and return.');

  // Render deterministic boss / transformation fixtures through the actual production renderer.
  await choose('[data-action=solo]'); await choose('[data-action=play]'); await screen(null); await pad(9); await screen('pause');
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'); const { Renderer } = await import('/game/renderer.js');
    const { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await assets.prepare(0); window.visualQA = { assets, Renderer, Simulation };
    const atlas = assets.get('/assets/shared/specials/transformations-v3.png'), c = document.createElement('canvas'); c.width = atlas.width; c.height = atlas.height; const ctx = c.getContext('2d'); ctx.drawImage(atlas, 0, 0); window.atlasAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
  });
  assert.equal(await page.evaluate(() => window.atlasAlpha), 0, 'Generated sprite sheet has real transparency');
  for (const [name, kind, chapter, boss] of [['wolf', 'yanu', 0, false], ['pig', 'jualos', 0, false], ['tornado', 'jo', 4, false], ['golf', 'karonux', 0, true], ['bicycle', 'kikor', 1, true], ['petanque', 'lorenzo', 3, true]]) {
    await page.evaluate(async ({ kind, chapter, boss }) => {
      const qa = window.visualQA; await qa.assets.prepare(chapter); const g = new qa.Simulation([kind], chapter, 44);
      if (boss) { g.state.stage = 5; g.enterStreet(); g.state.wave = g.state.waves.length - 2; }
      g.spawnWave(); const p = g.state.players[0]; p.x = 430; p.y = 555;
      if (!boss) { g.activateSpecial(p); g.updateSpecial(p, { x: 0, y: 0 }, .5); }
      else { const e = g.state.enemies[0]; if (kind === 'kikor') { e.hp = e.maxHp * .4; e.bossPhase = 2; e.attackCount = 1; e.cooldown = 0; g.updateBoss(e, .016); } if (kind === 'lorenzo') { e.cooldown = 0; g.updateBoss(e, .016); g.executeBossPattern(e, e.pattern); } }
      g.state.time = 7.25; const r = new qa.Renderer(document.querySelector('#game'), qa.assets, { effect() {} });
      const fixtureCanvas = document.createElement('canvas'); fixtureCanvas.id = 'qa-canvas'; fixtureCanvas.width = 1280; fixtureCanvas.height = 720; fixtureCanvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.querySelector('#qa-canvas')?.remove(); document.body.append(fixtureCanvas); r.canvas = fixtureCanvas; r.ctx = fixtureCanvas.getContext('2d'); r.scale = 1;
      r.draw(g.state, .016); window.qaState = g.snapshot();
    }, { kind, chapter, boss });
    await page.screenshot({ path: `test-results/visual-${name}.png` });
  }
  assert.deepEqual(errors, []); console.log('PASS visual fixtures: transparent atlas, three transformations, Golf, bicycle, pétanque; no browser errors.');
} catch (error) {
  await page.screenshot({ path: 'test-results/controller-failure.png' }); console.error(await inspect()); throw error;
} finally { await browser.close(); await server.close(); }
