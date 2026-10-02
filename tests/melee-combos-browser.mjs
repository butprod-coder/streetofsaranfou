import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
page.on('pageerror', e => errors.push(e.message)); await mkdir('test-results', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`); await page.waitForFunction(() => window.saranfou);
  await page.locator('#home [data-action=combos]').click();
  await page.waitForFunction(() => document.activeElement.matches('.combo-list article'));
  await page.keyboard.press('ArrowDown'); assert.equal(await page.locator('.combo-list article').nth(1).evaluate(el => document.activeElement === el), true);
  assert.equal(await page.locator('.combo-list article').count(), 6);
  assert.match(await page.locator('.combo-rules').first().textContent(), /95 %/);
  await page.screenshot({ path: 'test-results/combo-help-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('.combo-list').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
  await page.locator('[data-action=close-combos]').scrollIntoViewIfNeeded(); await page.locator('[data-action=close-combos]').click();
  await page.locator('#home [data-action=controls]').click(); await page.locator('#controls [data-action=combos]').click();
  await page.screenshot({ path: 'test-results/combo-help-mobile.png' });
  await page.locator('[data-action=close-combos]').click(); assert.equal(await page.evaluate(() => window.saranfou.inspect().screen), 'controls');
  await page.setViewportSize({ width: 1280, height: 720 });
  const fixture = await page.evaluate(async () => {
    // Fixtures use the real Input/Simulation/Renderer without exposing mutable production state.
    window.requestAnimationFrame = () => 0;
    const [{ Input }, { Simulation }, { Assets }, { Renderer }, { blankInput }] = await Promise.all([import('/game/input.js'), import('/game/simulation.js'), import('/game/assets.js'), import('/game/renderer.js'), import('/game/data.js')]);
    window.comboPads = [0, 3].map(index => ({ index, connected: true, id: 'Identical Xbox fixture', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }));
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.comboPads[0], null, null, window.comboPads[1]] });
    const input = new Input({ pause() {}, blur() {}, menu() {}, wake() {} }); input.enabled = true; input.controllersOnly = true;
    const sim = new Simulation(['karonux', 'yanu'], 0, 42); sim.state.phase = 'fight'; sim.state.chapterStory = false; sim.state.props = []; sim.state.enemies = []; sim.state.spawnQueue = [];
    Object.assign(sim.state.players[0], { x: 400, y: 580, invincible: 0 }); Object.assign(sim.state.players[1], { x: 800, y: 490, invincible: 0 });
    const enemy = sim.spawnEnemy('remy', { x: 490, y: 580, hp: 10000, maxHp: 10000, speed: 0, cooldown: 999, invincible: 0 });
    const enemy2 = sim.spawnEnemy('remy', { x: 890, y: 490, hp: 10000, maxHp: 10000, speed: 0, cooldown: 999, invincible: 0 });
    const assets = new Assets(); await assets.prepare(0);
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720; canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} }); renderer.reducedMotion = true;
    const tick = (follow = true) => { if (follow) { enemy.x = sim.state.players[0].x + 90; enemy.y = sim.state.players[0].y; enemy2.x = sim.state.players[1].x + 90; enemy2.y = sim.state.players[1].y; } sim.step([input.sample(), input.sample(1)]); };
    tick();
    for (const button of [2, 2, 2, 2, 3, 3]) { window.comboPads[0].buttons[button] = { pressed: true, value: 1 }; tick(); window.comboPads[0].buttons[button] = { pressed: false, value: 0 }; for (let i = 0; i < 31; i++) tick(); }
    renderer.draw(sim.state, .016);
    const launch = sim.state.events.find(e => e.type === 'comboFinish' && e.actor === 1);
    for (const button of [3, 3, 3, 2, 2]) { window.comboPads[1].buttons[button] = { pressed: true, value: 1 }; tick(); window.comboPads[1].buttons[button] = { pressed: false, value: 0 }; for (let i = 0; i < 31; i++) tick(); }
    const steps = sim.state.players[1].meleeChain?.steps;
    const sample = sim.snapshot(), roundTrip = JSON.parse(JSON.stringify(sample));
    window.comboQA = { sim, renderer, input, tick, enemy, enemy2 };
    renderer.draw(sim.state, .016);
    return { launch, steps, roundTrip: roundTrip.players[1].meleeChain };
  });
  assert.equal(fixture.launch.label, 'DOUBLE IMPACT');
  assert.deepEqual(fixture.steps, ['K', 'K', 'K', 'P', 'P']); assert.deepEqual(fixture.roundTrip.steps, fixture.steps);
  await page.screenshot({ path: 'test-results/combo-finish.png' });
  assert.deepEqual(errors, []); console.log('PASS combos: six-row desktop/mobile help, return routing, native independent pads, repeated strike chains and serializable progression.');
} finally { await browser.close(); await server.close(); }
