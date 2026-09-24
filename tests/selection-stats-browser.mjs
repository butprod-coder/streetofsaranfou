import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
let browser;
try {
 browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {channel:"msedge"})});
 const page = await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 await page.locator('[data-action="solo"]').click();
 assert.equal(await page.locator('.starting-stat').count(),21);
 for(const [width,height] of [[1280,720],[390,844],[844,390]]) {
  await page.setViewportSize({width,height});
  assert.equal(await page.locator('#select').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  assert.equal(await page.locator('.fighter-card').evaluateAll(cards=>cards.every(c=>{const name=c.querySelector('.card-name').getBoundingClientRect(),stats=c.querySelector('.starting-stats').getBoundingClientRect();return name.bottom<=stats.top;})),true);
  await page.screenshot({path:`test-results/selection-stats-${width}.png`});
 }
 await page.locator('[data-fighter="jualos"]').click();
 assert.equal(await page.locator('#fighter-name').textContent(),'Jualos'); assert.deepEqual(errors,[]);
 console.log('Selection: 21 bars, 3 viewports, selection and no browser errors OK');
} finally {await browser?.close(); await server.close();}
