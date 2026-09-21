import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.waitForFunction(() => !!window.saranfou);
  const original = await page.evaluate(async () => {
    const { Simulation } = await import('/game/simulation.js'); const { checkpoint, RUN_SAVE_KEY, RECORDS_KEY } = await import('/game/run-save.js');
    const saved = JSON.stringify(checkpoint(new Simulation(['jo'], 0, 42).snapshot()));
    localStorage.setItem(RUN_SAVE_KEY, saved); localStorage.setItem(RECORDS_KEY, '{}'); return { saved, key: RUN_SAVE_KEY, records: RECORDS_KEY };
  });
  await page.locator('[data-action="boss-lab"]').first().click();
  await page.selectOption('#test-fighter', 'yanu'); await page.selectOption('#test-phase', '1');
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/boss-practice-menu.png' });
  await page.click('[data-action="test-boss-play"]');
  await page.waitForFunction(() => window.saranfou.inspect().state?.practice && window.saranfou.inspect().screen === null, null, { timeout: 60000 });
  let state = await page.evaluate(() => window.saranfou.inspect().state);
  assert.equal(state.players[0].kind, 'yanu'); assert.equal(state.enemies[0].vehicle, false);
  await page.keyboard.press('Escape'); await page.click('[data-action="test-boss-retry"]');
  await page.waitForFunction(() => window.saranfou.inspect().screen === null);
  state = await page.evaluate(() => window.saranfou.inspect().state); assert.equal(state.enemies[0].hp, 640);
  await page.keyboard.press('Escape'); await page.locator('#pause [data-action="boss-lab"]').click();
  await page.selectOption('#test-boss', '5'); await page.selectOption('#test-phase', '3');
  await page.click('[data-action="test-boss-play"]');
  await page.waitForFunction(() => window.saranfou.inspect().screen === null && window.saranfou.inspect().state?.chapter === 5, null, { timeout: 60000 });
  state = await page.evaluate(() => window.saranfou.inspect().state); assert.equal(state.enemies[0].bossPhase, 3);
  await page.keyboard.press('Escape'); await page.click('#pause [data-action="quit"]');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), original.key), original.saved);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), original.records), '{}');
  assert.deepEqual(errors, []); console.log('PASS: menu, chosen hero, foot phase, pause/retry, change boss, final phase, saved run and records preserved.');
} finally { await browser.close(); await server.close(); }
