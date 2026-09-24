import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{channel:'msedge'})});
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${server.server.address().port}`;
 const screen=(p,name)=>p.waitForFunction(n=>window.saranfou?.inspect().screen===n,name,{timeout:60000});
 await page.goto(url);await screen(page,'home');await page.locator('[data-action=online]').click();await page.locator('[data-action=host]').click();await screen(page,'lobby');
 const code=await page.locator('#room-code').textContent(),guestContext=await browser.newContext({viewport:{width:1280,height:720},hasTouch:true,isMobile:true}),guest=await guestContext.newPage();guest.on('pageerror',e=>errors.push(e.message));
 await guest.goto(`${url}/?room=${code}`);await guest.getByRole('button',{name:/Rejoindre/}).click();await screen(guest,'lobby');await page.locator('#ready-button').click();await guest.locator('#ready-button').click();await Promise.all([screen(page,null),screen(guest,null)]);
 const sim=server.rooms.get(code).sim;
 async function stage(kind) {
  sim.state.neighborhood.plan=[{stage:1,kind},{stage:3,kind:kind==='merchant'?'parking':'merchant'}];sim.state.stage=1;sim.enterStreet();sim.state.wave=0;sim.spawnWave();
  for(const p of sim.state.players)p.invincible=999;
  await page.waitForFunction(k=>window.saranfou.inspect().state.neighborhoodEncounter?.kind===k,kind);
 }
 async function interact(p,slot,x,y) {
  sim.state.players[slot].x=x;sim.state.players[slot].y=y;
  await p.waitForFunction(({slot,x})=>Math.abs(window.saranfou.inspect().state.players[slot].x-x)<5,{slot,x});
  await p.keyboard.press('KeyF');
 }
 await stage('merchant');await page.screenshot({path:'test-results/neighborhood-merchant.png'});
 await interact(page,0,410,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.choices[1]==='food');assert.equal(sim.state.phase,'encounter');
 await interact(guest,1,890,555);await guest.waitForFunction(()=>window.saranfou.inspect().state.players[1].weapon?.kind==='bat');assert.equal(sim.state.phase,'rest');
 await stage('parking');await interact(page,0,535,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.choices[1]==='accept');assert.equal(sim.state.phase,'encounter');
 await page.screenshot({path:'test-results/neighborhood-parking-choice.png'});
 await interact(guest,1,535,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');
 await page.screenshot({path:'test-results/neighborhood-parking-fight.png'});
 sim.state.enemies=[];sim.state.spawnQueue=[];
 await page.waitForFunction(()=>window.saranfou.inspect().state.pickups.filter(p=>p.weapon==='shotgun').length===2);
 await stage('rescue');await interact(page,0,535,555);await interact(guest,1,535,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');await page.screenshot({path:'test-results/neighborhood-rescue.png'});
 sim.state.enemies=[];sim.state.spawnQueue=[];await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhood.helpStage===2);
 sim.state.stage=2;sim.enterStreet();sim.spawnWave();await page.waitForFunction(()=>!!window.saranfou.inspect().state.neighborVisit);await page.screenshot({path:'test-results/neighborhood-neighbor-help.png'});
 await stage('delivery');await page.waitForFunction(()=>window.saranfou.inspect().state.enemies.length>0);await page.screenshot({path:'test-results/neighborhood-delivery.png'});
 await stage('merchant');await guest.setViewportSize({width:844,height:390});
 await guest.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter?.kind==='merchant');
 await guest.screenshot({path:'test-results/neighborhood-mobile.png'});assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 sim.state.players[1].x=650;sim.state.players[1].y=555;
 await guest.waitForFunction(()=>Math.abs(window.saranfou.inspect().state.players[1].x-650)<5);
 await guest.locator('[data-touch=interact]').tap();
 await guest.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.choices[2]==='energy');
 assert.deepEqual(errors,[]);console.log('PASS: actual two-client keyboard choices, consent, rewards, rescue consequence, delivery and mobile rendering.');
} finally {await browser?.close();await server.close();}
