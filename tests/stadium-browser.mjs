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
  sim.state.chapter=2;sim.state.stadium.plan=[{stage:1,kind},{stage:3,kind:kind==='coach'?'relay':'coach'}];sim.state.stage=1;sim.enterStreet();sim.state.wave=0;sim.spawnWave();
  if (kind === 'football') { const room=server.rooms.get(code); sim.pause(true,'loading'); for(const client of room.players){client.loaded=false;client.ws.send(JSON.stringify({type:'prepare',chapter:2,resume:true}));} await Promise.all([screen(page,'loading'),screen(guest,'loading')]); await Promise.all([screen(page,null),screen(guest,null)]); }
  for(const p of sim.state.players){p.invincible=999;p.energy=60;p.hp=60;}
  await page.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
  await guest.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
 }
 async function interact(p,slot,x,y) {
  sim.state.players[slot].x=x;sim.state.players[slot].y=y;
  await p.waitForFunction(({slot,x})=>Math.abs(window.saranfou.inspect().state.players[slot].x-x)<5,{slot,x});await p.keyboard.press('KeyF');
 }
 async function accept() {await interact(page,0,500,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.choices[1]==='accept');await interact(guest,1,500,555);}

 await stage('football');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');
 sim.state.players[0].x=560;sim.state.players[0].y=550;await page.waitForFunction(()=>Math.abs(window.saranfou.inspect().state.players[0].x-560)<5);await page.keyboard.press('KeyK');await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.ball.owner===1||window.saranfou.inspect().state.neighborhoodEncounter.goals>0);await page.screenshot({path:'test-results/stadium-football.png'});
 await stage('relay');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');await interact(page,0,580,550);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.carrier===1);await page.screenshot({path:'test-results/stadium-relay.png'});
 await stage('coach');await page.screenshot({path:'test-results/stadium-coach.png'});await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');
 await stage('sprinklers');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');await page.screenshot({path:'test-results/stadium-sprinklers.png'});await interact(page,0,350,490);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.valves.includes(0));
 await guest.setViewportSize({width:844,height:390});sim.state.players[1].x=930;sim.state.players[1].y=620;await guest.waitForFunction(()=>Math.abs(window.saranfou.inspect().state.players[1].x-930)<5);await guest.locator('[data-touch=interact]').tap();await guest.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.valves.length===2);await guest.screenshot({path:'test-results/stadium-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS stadium: four encounters, real coop clients, kick, baton, valves, touch and no browser errors');
} finally {await browser?.close();await server.close();}
