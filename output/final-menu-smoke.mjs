import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page = await browser.newPage({viewport:{width:1440,height:900}}), errors=[];
 page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(() => localStorage.setItem('saranfou-v2', JSON.stringify({chapter:5,character:'jo',muted:true})));
 await page.goto('http://localhost:3000');
 await page.waitForFunction(() => window.saranfou?.inspect().screen === 'home');
 assert.equal(await page.locator('#level-editor, #boss-lab, [data-action="resume-run"], #run-import, #chapter-select, #online-chapter, [data-action="export-run"], [data-action="import-run"], [data-action="editor"], [data-action="boss-lab"], [data-action="restore-coop"]').count(),0);
 await page.locator('[data-action="solo"]').click();
 await page.locator('[data-action="play"]').click();
 await page.waitForFunction(() => window.saranfou?.inspect().state && window.saranfou.inspect().screen === null, {timeout:60000});
 assert.equal(await page.evaluate(() => window.saranfou.inspect().state.chapter),0);
 await page.keyboard.press('Escape');
 await page.waitForFunction(() => window.saranfou.inspect().screen === 'pause');
 await page.locator('#pause [data-action="quit"]').click();
 await page.locator('[data-action="online"]').click();
 await page.locator('[data-action="host"]').click();
 await page.waitForFunction(() => window.saranfou.inspect().screen === 'lobby');
 assert.equal(await page.locator('#online-fighter').count(),1);
 assert.equal(await page.locator('#online-difficulty').count(),1);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'output/final-lobby.png'});
 await page.locator('[data-action="leave"]').click();
 console.log('PASS: final menus, solo starts at chapter 0 despite old preferences, pause, coop lobby; no browser errors.');
} finally { await browser.close(); }
