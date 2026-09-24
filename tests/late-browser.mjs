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
 let loadedChapter=0;
 async function stage(kind) {
  const night=['lastBus','cart','blackout','vending'].includes(kind),chapter=night?4:5;
  sim.state.chapter=chapter;sim.state[night?'night':'school'].plan=[{stage:1,kind},{stage:3,kind:night?(kind==='cart'?'blackout':'cart'):(kind==='bell'?'photo':'bell')}];sim.state.stage=1;sim.enterStreet();sim.state.wave=0;sim.spawnWave();
  if(loadedChapter!==chapter){const room=server.rooms.get(code);sim.pause(true,'loading');for(const client of room.players){client.loaded=false;client.ws.send(JSON.stringify({type:'prepare',chapter,resume:true}));}await Promise.all([screen(page,'loading'),screen(guest,'loading')]);await Promise.all([screen(page,null),screen(guest,null)]);loadedChapter=chapter;}
  for(const p of sim.state.players){p.invincible=999;p.energy=60;p.hp=60;p.gymBalls=0;}
  await page.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
  await guest.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
 }
 async function interact(p,slot,x,y) {
  sim.state.players[slot].x=x;sim.state.players[slot].y=y;
  await p.waitForFunction(({slot,x})=>Math.abs(window.saranfou.inspect().state.players[slot].x-x)<5,{slot,x});await p.keyboard.press('KeyF');
 }
 async function accept() {await interact(page,0,500,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.choices[1]==='accept');await interact(guest,1,500,555);}



 const active=()=>page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');
 await stage('lastBus');await accept();await active();sim.state.neighborhoodEncounter.elapsed=6.1;sim.state.spawnTimer=30;await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.elapsed>6);await page.screenshot({path:'test-results/night-bus-event.png'});await interact(page,0,860,540);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.boarded[1]);await interact(guest,1,860,540);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.tookBus);
 await stage('cart');await accept();await active();sim.state.players[0].facing=1;await interact(page,0,620,550);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.cart.vx>50);await page.screenshot({path:'test-results/night-cart-event.png'});
 await stage('blackout');await accept();await active();await page.screenshot({path:'test-results/night-blackout-event.png'});await interact(guest,1,1020,490);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.powerOn);
 await stage('vending');await accept();await active();await interact(page,0,630,530);assert.equal(sim.state.neighborhoodEncounter.attempts,0);await interact(guest,1,630,530);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.attempts===1);await page.screenshot({path:'test-results/night-vending-event.png'});await interact(page,0,1090,620);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='success');
 await stage('bell');await accept();await active();sim.state.neighborhoodEncounter.elapsed=2.4;sim.state.spawnTimer=30;await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.elapsed>2.4);await page.screenshot({path:'test-results/school-jualos-event.png'});
 await stage('exam');await accept();await active();await page.screenshot({path:'test-results/school-exam-event.png'});
 await stage('gym');await accept();await active();await page.screenshot({path:'test-results/school-gym-event.png'});await interact(page,0,380,550);await page.waitForFunction(()=>window.saranfou.inspect().state.players[0].gymBalls===1);await guest.setViewportSize({width:844,height:390});sim.state.players[1].x=900;sim.state.players[1].y=550;await guest.waitForFunction(()=>Math.abs(window.saranfou.inspect().state.players[1].x-900)<5);await guest.locator('[data-touch=interact]').tap();await guest.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='success');await guest.screenshot({path:'test-results/school-gym-mobile.png'});assert.equal(sim.state.players[1].hp,95);
 sim.state.phase='fight';sim.state.spawnQueue=['remy'];sim.state.spawnTimer=30;await page.waitForFunction(()=>window.saranfou.inspect().state.phase==='fight');await page.keyboard.press('KeyJ');await page.waitForFunction(()=>window.saranfou.inspect().state.players[0].gymBalls===0);
 await stage('photo');await accept();await active();sim.state.spawnTimer=30;sim.state.players[0].x=640;sim.state.players[0].y=550;sim.state.neighborhoodEncounter.elapsed=5.8;await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.photos===1);assert.equal(sim.state.players[0].hp,75);await page.screenshot({path:'test-results/school-photo-event.png'});
 assert.deepEqual(errors,[]);console.log('PASS late chapters: eight events, two coop clients, bus departure, cart, lights, vending consent, Jualos parade, gym keyboard/touch and photo healing');
} finally {await browser?.close();await server.close();}
