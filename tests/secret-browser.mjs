import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 const screen=n=>page.waitForFunction(n=>window.saranfou?.inspect().screen===n,n,{timeout:60000});await screen('home');
 assert.equal(await page.locator('.home-buttons [data-action=secret-menu]').isVisible(),false);
 await page.keyboard.type('gustavax45');await screen('secret-menu');
 await page.screenshot({path:'test-results/secret-menu.png'});
 await page.locator('#secret-mode').selectOption('boss');await page.locator('#secret-chapter').selectOption('6');await page.locator('#secret-phase').selectOption('3');await page.locator('#secret-invulnerable').check();
 await page.locator('[data-action=secret-play]').click();await screen(null);
 const state=await page.evaluate(()=>window.saranfou.inspect().state);assert.equal(state.chapter,6);assert.equal(state.enemies[0].bossPhase,3);assert.ok(state.sandbox.invulnerable);
 await page.locator('[data-action=pause]').click();await screen('pause');await page.locator('#pause [data-action=secret-menu]').click();await screen('secret-menu');
 await page.locator('#secret-mode').selectOption('enemy');
 assert.equal(await page.locator('#secret-enemy-label').isVisible(),true);assert.equal(await page.locator('#secret-chapter-label').isVisible(),false);assert.equal(await page.locator('#secret-phase-label').isVisible(),false);
 const enemyCount=await page.evaluate(async()=>Object.keys((await import('/game/data.js')).ENEMIES).length);assert.equal(await page.locator('#secret-enemy option').count(),enemyCount);
 await page.locator('#secret-enemy').selectOption('jo_rose');await page.locator('[data-action=secret-play]').click();await screen(null);
 const trial=await page.evaluate(()=>window.saranfou.inspect().state);assert.equal(trial.sandbox.mode,'enemy');assert.equal(trial.enemies.length,1);assert.equal(trial.enemies[0].kind,'jo_rose');assert.equal(trial.spawnQueue.length,0);
 await page.locator('[data-action=pause]').click();await screen('pause');await page.locator('#pause [data-action=secret-menu]').click();await screen('secret-menu');
 await page.screenshot({path:'test-results/secret-enemy-menu.png'});
 await page.locator('[data-action=secret-lock]').click();await screen('home');assert.equal(await page.locator('.home-buttons [data-action=secret-menu]').isVisible(),false);
 await page.locator('.brand').click({clickCount:5,delay:90});await screen('secret-code');await page.locator('#secret-password').fill('GUSTAVAX45');await page.locator('#secret-code-form button[type=submit]').click();await screen('secret-menu');
 assert.deepEqual(errors,[]);console.log('PASS secret menu: hidden gate, code, phase selection, sandbox, pause return, relock and touch entry');
}finally{await browser?.close();await server.close();}
