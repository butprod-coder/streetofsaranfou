import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.waitForFunction(() => window.saranfou?.inspect().screen === 'home', null, { timeout: 60000 });
  await page.evaluate(async () => {
    const { renderAttributes } = await import('/game/rogue-ui.js');
    const { normalizeProfile, xpForLevel, spendAttribute } = await import('/game/progression.js');
    const player = { kind: 'yanu', progression: normalizeProfile({ xp: xpForLevel(40), completed:[0,1,2,3,4,5], attributes: { strength: 9, endurance: 9, attackSpeed: 9, moveSpeed: 9, specialCharge: 9, precision:9, weaponMastery:9, recovery:0 } }, 'yanu') };
    const render = () => renderAttributes(player, key => { player.progression = spendAttribute(player.progression, key); render(); });
    render(); document.querySelector('#attributes').classList.add('active');
    window.xpQA = player;
  });
  assert.equal(await page.locator('[data-attribute]').count(), 8);
  for (const key of ['strength', 'endurance', 'attackSpeed', 'moveSpeed', 'specialCharge', 'precision', 'weaponMastery']) {
    await page.locator(`[data-attribute=${key}]`).click();
    assert.match(await page.locator(`[data-attribute=${key}]`).textContent(), /10\/10 MAX/);
    assert.equal(await page.locator(`[data-attribute=${key}]`).isDisabled(), true);
  }
  assert.match(await page.locator('#attribute-progress').textContent(), /Niveau 40/);
  assert.match(await page.locator('#attribute-progress').textContent(), /72\/72 gagnés/);
  assert.equal(await page.evaluate(() => window.xpQA.progression.statPoints), 2);
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/xp-attributes.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: eight capped attributes, disabled maximum ranks and 72 earned stage points.');
} finally { await browser?.close(); await new Promise(r => server.server.close(r)); }
