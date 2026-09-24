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

 assert.equal(sim.state.chapter,sim.state.route.order[0]);
 for(let i=0;i<6;i++){
  sim.state.stage=5;sim.enterStreet();sim.state.enemies=[];sim.state.spawnQueue=[];sim.state.wave=sim.state.waves.length-1;sim.clearStreet();
  await Promise.all([screen(page,'badges'),screen(guest,'badges')]);
  await page.waitForFunction(n=>document.querySelectorAll('.boss-medallion.defeated').length===n,i+1);
  if(i===0||i===5)await page.screenshot({path:'test-results/route-'+(i+1)+'.png'});
  if(i===0){await guest.setViewportSize({width:844,height:390});await guest.screenshot({path:'test-results/route-mobile.png'});}
  await page.locator('#route-next-button').click();await page.waitForFunction(()=>document.querySelector('#route-next-button').disabled);
  assert.equal(sim.state.phase,'badges');await guest.locator('#route-next-button').click();
  await Promise.all([screen(page,null),screen(guest,null)]);
 }
 await page.waitForFunction(()=>window.saranfou.inspect().state.chapter===6);
 assert.equal(sim.state.stage,0);assert.notEqual(sim.state.phase,'won');
 assert.equal(sim.state.route.completed.length,6);assert.deepEqual(errors,[]);console.log('PASS shuffled tour: six boards, portraits, coop readiness, district loading and final arena unlock');
} finally {await browser?.close();await server.close();}
