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
  sim.state.chapter=3;sim.state.bourg.plan=[{stage:1,kind},{stage:3,kind:kind==='shells'?'bakery':'shells'}];sim.state.stage=1;sim.enterStreet();sim.state.wave=0;sim.spawnWave();
  if (kind === 'bakery') { const room=server.rooms.get(code); sim.pause(true,'loading'); for(const client of room.players){client.loaded=false;client.ws.send(JSON.stringify({type:'prepare',chapter:3,resume:true}));} await Promise.all([screen(page,'loading'),screen(guest,'loading')]); await Promise.all([screen(page,null),screen(guest,null)]); }
  for(const p of sim.state.players){p.invincible=999;p.energy=60;p.hp=60;}
  await page.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
  await guest.waitForFunction(k=>window.saranfou.inspect().state?.neighborhoodEncounter?.kind===k&&window.saranfou.inspect().screen===null,kind);
 }
 async function interact(p,slot,x,y) {
  sim.state.players[slot].x=x;sim.state.players[slot].y=y;
  await p.waitForFunction(({slot,x})=>Math.abs(window.saranfou.inspect().state.players[slot].x-x)<5,{slot,x});await p.keyboard.press('KeyF');
 }
 async function accept() {await interact(page,0,500,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.choices[1]==='accept');await interact(guest,1,500,555);}


 await stage('bakery');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');sim.state.spawnTimer=20;
 await interact(page,0,610,495);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.held[1]);await page.screenshot({path:'test-results/bourg-bakery.png'});
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>!window.saranfou.inspect().state.neighborhoodEncounter.held[1]);assert.equal(sim.state.neighborhoodEncounter.taken,1);
 await stage('scooter');await page.screenshot({path:'test-results/bourg-scooter-choice.png'});await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');assert.ok(sim.state.spawnQueue.includes('makouille')||sim.state.enemies.some(e=>e.kind==='makouille'));await interact(page,0,720,550);await page.waitForFunction(()=>window.saranfou.inspect().state.players[0].weapon?.kind==='bat');await page.screenshot({path:'test-results/bourg-scooter.png'});
 await stage('terrace');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='active');sim.state.spawnTimer=20;
 sim.state.players[0].x=365;sim.state.players[0].y=490;sim.state.players[0].facing=1;await page.waitForFunction(()=>Math.abs(window.saranfou.inspect().state.players[0].x-365)<5);await page.keyboard.press('KeyK');await page.waitForFunction(()=>window.saranfou.inspect().state.props.some(p=>p.bourgTable&&p.hp<6));await page.screenshot({path:'test-results/bourg-terrace.png'});
 await stage('shells');await accept();await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.shellPhase==='mix');await page.screenshot({path:'test-results/bourg-shells-mix.png'});await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.shellPhase==='guess');
 const {shellPositions,CUPS}=await import('../game/bourg-events.js');const e=sim.state.neighborhoodEncounter,answer=shellPositions(e)[e.ballCup];await interact(page,0,CUPS[answer].x,555);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.guesses[1]!=null);assert.equal(e.shellPhase,'guess');
 await guest.setViewportSize({width:844,height:390});sim.state.players[1].x=CUPS[(answer+1)%3].x;sim.state.players[1].y=555;await guest.waitForFunction(x=>Math.abs(window.saranfou.inspect().state.players[1].x-x)<5,CUPS[(answer+1)%3].x);await guest.locator('[data-touch=interact]').tap();await guest.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.shellPhase==='reveal');await guest.screenshot({path:'test-results/bourg-shells-mobile.png'});assert.equal(sim.state.players[0].energy,75);assert.equal(sim.state.players[1].energy,60);
 await interact(page,0,1090,625);await interact(guest,1,1090,625);await page.waitForFunction(()=>window.saranfou.inspect().state.neighborhoodEncounter.status==='success');
 assert.deepEqual(errors,[]);console.log('PASS Bourg: four encounters, coop consent, bread throw, scooter weapon, breakable tables, visible cup shuffle, individual guesses, touch, no browser errors');
} finally {await browser?.close();await server.close();}
