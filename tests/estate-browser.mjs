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
  sim.state.chapter=1;sim.state.estate.plan=[{stage:1,kind},{stage:3,kind:kind==='picnic'?'sluice':'picnic'}];sim.state.stage=1;sim.enterStreet();sim.state.wave=0;sim.spawnWave();
  for(const p of sim.state.players){p.invincible=999;p.energy=60;p.hp=60;}
  await page.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
  await guest.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
 }
 async function interact(p,slot,x,y) {
  sim.state.players[slot].x=x;sim.state.players[slot].y=y;
  await p.waitForFunction(({slot,x})=>Math.abs(window.saranfou.inspect().state.players[slot].x-x)<5,{slot,x});await p.keyboard.press('KeyF');
 }
 async function accept() {await interact(page,0,500,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.choices[1]==='accept');await interact(guest,1,500,555);}
 await stage('sluice');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');
 await interact(page,0,450,490);await interact(guest,1,930,600);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.switches.length===2);await page.screenshot({path:'test-results/estate-sluice.png'});
 await stage('poachers');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');
 await interact(page,0,420,500);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.released.length===1);await page.screenshot({path:'test-results/estate-poachers.png'});
 await stage('picnic');await page.screenshot({path:'test-results/estate-picnic.png'});await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.estate.helpStage===2);assert.equal(sim.state.players[0].energy,35);
 sim.state.stage=2;sim.enterStreet();sim.spawnWave();await page.waitForFunction(()=>!!window.saranfou.inspect().state.estateVisit);await page.screenshot({path:'test-results/estate-gift.png'});
 await stage('petanque');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');
 await interact(page,0,510,550);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.shots[1]===1);await page.screenshot({path:'test-results/estate-petanque.png'});
 await guest.setViewportSize({width:844,height:390});sim.state.players[1].x=510;sim.state.players[1].y=550;
 await guest.waitForFunction(()=>Math.abs(window.saranfou.inspect().state.players[1].x-510)<5);await guest.locator('[data-touch=interact]').tap();await guest.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.shots[2]===1);await guest.screenshot({path:'test-results/estate-mobile.png'});
 const sprite=await page.evaluate(async()=>{const {Assets}=await import('/game/assets.js');const a=new Assets();const image=await a.load('/assets/shared/scenery/estate-events.png');const ctx=image.getContext('2d');const d=ctx.getImageData(0,0,image.width,image.height).data;let clear=0;for(let i=3;i<d.length;i+=4)if(d[i]===0)clear++;return {clear:clear/(d.length/4),rects:Array.from({length:6},(_,i)=>a.arcadeFrame('estateProps',i).rect)};});
 assert.ok(sprite.clear>.45);assert.ok(sprite.rects.every(r=>r[2]>150&&r[3]>150));assert.deepEqual(errors,[]);console.log('PASS estate: four events, two real coop clients, keyboard + touch, six keyed sprites, no browser errors',sprite);
} finally {await browser?.close();await server.close();}
