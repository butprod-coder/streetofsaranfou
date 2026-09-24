import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server=createGameServer(); await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
try {
 const page=await browser.newPage({hasTouch:true,viewport:{width:1894,height:877}}),errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 await page.evaluate(async()=>{
  const {Simulation}=await import('/game/simulation.js');
  const enter=Simulation.prototype.enterStreet;
  Simulation.prototype.enterStreet=function(){enter.call(this);this.awardXP(500,'hud-qa');this.awardTalentMilestone('street:0:0');Object.assign(this.state,{phase:'clear',chapterStory:false,score:1900,events:[]});};
 });
 await page.locator('[data-action="solo"]').click();
 await page.locator('[data-fighter="jualos"]').click();
 await page.locator('[data-action="play"]').click();
 await page.waitForFunction(()=>window.saranfou?.inspect().state?.phase==='clear',null,{timeout:90000});
 await page.waitForFunction(()=>document.querySelector('.upgrade-stats .upgrade-count').textContent==='4');
 assert.equal(await page.locator('.upgrade-talents .upgrade-count').textContent(),'1');
 let score=await page.locator('#hud-p2').boundingBox();assert.ok(score.width<=280&&score.height<75,JSON.stringify(score));
 await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/hud-upgrades-desktop.png'});
 for (const size of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);await page.screenshot({path:`test-results/hud-upgrades-${size.width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const box=await page.locator('#upgrade-notice').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=size.width);
  const player=await page.locator("#hud-p1").boundingBox();assert.ok(player.height<85,JSON.stringify(player));assert.ok(box.height<=46,JSON.stringify(box));
 }
 await page.setViewportSize({width:1280,height:900});
 await page.locator('.upgrade-stats').click();
 await page.waitForFunction(()=>window.saranfou.inspect().screen==='attributes');
 assert.equal(await page.evaluate(()=>window.saranfou.inspect().state.paused),true);
 for(let i=0;i<4;i++)await page.locator('[data-attribute="vitality"]').click();
 await page.locator('[data-action="close-attributes"]').click();
 await page.waitForFunction(()=>window.saranfou.inspect().screen===null&&!window.saranfou.inspect().state.paused);
 await page.waitForFunction(()=>document.querySelector('.upgrade-stats').hidden);
 await page.locator('.upgrade-talents').click();
 await page.waitForFunction(()=>window.saranfou.inspect().screen==='evolution');
 await page.locator('.talent-node.available').first().click();
 await page.locator('[data-action="close-evolution"]').click();
 await page.waitForFunction(()=>window.saranfou.inspect().screen===null&&!window.saranfou.inspect().state.paused);
 await page.waitForFunction(()=>document.querySelector('#upgrade-notice').hidden);
 // Menus opened through pause must still return to pause, including keyboard Back.
 await page.keyboard.press('Escape');
 await page.locator('#pause-attributes').click();
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>window.saranfou.inspect().screen==='pause'&&window.saranfou.inspect().state.paused);
 await page.locator('#pause-talents').click();
 await page.locator('[data-action="close-evolution"]').click();
 await page.waitForFunction(()=>window.saranfou.inspect().screen==='pause'&&window.saranfou.inspect().state.paused);
 await page.locator('[data-action="resume"]').click();
 // The notice follows the local player in coop, never the teammate's points.
 await page.evaluate(async()=>{
  const {Renderer}=await import('/game/renderer.js');const {Simulation}=await import('/game/simulation.js');
  const sim=new Simulation(['jo','yanu'],0,12);sim.state.players[0].progression.statPoints=0;sim.state.players[0].progression.points=0;
  const fake={hudKey:''};Renderer.prototype.hud.call(fake,sim.state,1,true,0);
  if(document.querySelector('#hud-p2').classList.contains('score-only')||document.querySelector('#upgrade-notice').hidden)throw Error('Coop HUD');
  Renderer.prototype.hud.call(fake,sim.state,0,true,0);
  if(!document.querySelector('#upgrade-notice').hidden)throw Error('Teammate points shown as local');
 });
 assert.deepEqual(errors,[]);console.log('PASS: compact score, responsive badges, direct menus pause, spending clears indicators, coop local points.');
} finally {await browser.close();await server.close();}
