import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.TEST_URL || 'http://localhost:3000');
  await page.getByRole('button', { name: /Descendre dans la rue/ }).click();
  await page.locator('#chapter-select').selectOption(process.env.TEST_CHAPTER || '0');
  await page.getByRole('button', { name: /C’est parti/ }).click();
  await page.waitForFunction(() => document.body.classList.contains('chapter-story'), null, { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.saranfou.inspect().state.phase), 'intro');
  await page.screenshot({ path: `test-results/chapter-intro-${process.env.TEST_CHAPTER || '0'}.png` });
  await page.locator('#chapter-story-next').click();
  await page.waitForFunction(() => window.saranfou.inspect().state.phase === 'fight');
  assert.equal(await page.locator('#chapter-story-next').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('Introduction, clavier, bouton et retour au combat : OK');
} finally { await browser.close(); }
