import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';

const server = createGameServer();
await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.testPad = { id: 'DualSense standard test', mapping: 'standard', connected: true, index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.testPad] });
  });
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async () => {
    const { Simulation } = await import('/game/simulation.js');
    const { TALENTS, applyProfile } = await import('/game/progression.js');
    const original = Simulation.prototype.enterStreet;
    Simulation.prototype.enterStreet = function () {
      original.call(this); window.qaSim = this;
      Object.assign(this.state, { phase: 'fight', chapterStory: false, spawnQueue: [], enemies: [], props: [] });
      const p = this.state.players[0]; applyProfile(p, { talents: [TALENTS[p.kind][0].id] }); p.energy = 100;
      this.spawnEnemy('remy', { x: 1100, y: 550, hp: 10000, maxHp: 10000, cooldown: 999, speed: 0 });
    };
  });
  await page.locator('[data-action=solo]').click();
  await page.locator('[data-fighter=karonux]').click();
  await page.locator('[data-action=play]').click();
  await page.waitForFunction(() => window.qaSim?.state.phase === 'fight' && window.saranfou.inspect().screen === null);
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.testPad.buttons[1] = { pressed: true, value: 1 }; });
  await page.waitForFunction(() => !!window.qaSim.state.players[0].specialState);
  assert.equal(await page.evaluate(() => window.qaSim.state.players[0].energy), 0);
  console.log('PASS: Circle activates the unlocked special through the browser game loop.');
} finally { await browser.close(); await server.close(); }
