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
 const room=server.rooms.get(code);let sim=room.sim;
 sim.state.chapter=6;sim.state.stage=0;sim.state.route.completed=[...sim.state.route.order];sim.enterStreet();sim.pause(true,'loading');
 for(const client of room.players){client.loaded=false;client.ws.send(JSON.stringify({type:'prepare',chapter:6,resume:true}));}
 await Promise.all([screen(page,'loading'),screen(guest,'loading')]);await Promise.all([screen(page,null),screen(guest,null)]);


 const publish=()=>{for(const client of room.players)client.ws.send(JSON.stringify({type:'state',state:sim.snapshot()}));};
 sim.pause(true);sim.state.phase='rest';sim.state.phaseTime=4;sim.state.events=[];publish();await page.waitForFunction(()=>window.saranfou.inspect().state.chapter===6);
 await page.screenshot({path:'test-results/final-office-preview.png'});
 for(let i=0;i<6;i++){
  sim.state.wave=sim.state.waves.length-2;sim.spawnWave();sim.state.bossCinema=null;
  assert.notEqual(sim.state.enemies.find(e=>e.boss).kind,'gustavax');
  sim.state.enemies=[];sim.state.spawnQueue=[];sim.clearStreet();
 }
 assert.equal(sim.state.stage,6);sim.state.phaseTime=2;sim.state.events=[];publish();
 await page.waitForFunction(()=>window.saranfou.inspect().state.stage===6);await page.screenshot({path:'test-results/final-desk-break.png'});
 sim.spawnWave();sim.state.bossCinema=null;let boss=sim.state.enemies.find(e=>e.boss);assert.equal(boss.kind,'gustavax');
 for(let phase=1;phase<=3;phase++){
  boss.bossPhase=phase;boss.hp=boss.maxHp*[1,1,.65,.3][phase];boss.x=820;boss.y=550;boss.pattern=null;
  sim.state.finale.smoke=phase===2?8:0;sim.state.events=[];publish();
  await page.waitForFunction(n=>window.saranfou.inspect().state.enemies.find(e=>e.kind==='gustavax')?.bossPhase===n,phase);
  await page.screenshot({path:'test-results/final-phase-'+phase+'.png'});
 }
 await guest.setViewportSize({width:844,height:390});await guest.screenshot({path:'test-results/final-mobile.png'});
 for(const p of sim.state.players){p.hp=0;p.lives=0;}sim.state.phase='over';sim.pause(false);publish();
 await screen(page,'result');await page.locator('#retry-button').click();await Promise.all([screen(page,null),screen(guest,null)]);
 sim=room.sim;assert.equal(sim.state.chapter,6);assert.equal(sim.state.stage,6);assert.ok(sim.state.players.every(p=>p.hp>0));
 sim.state.phaseTime=0;await page.waitForFunction(()=>window.saranfou.inspect().state.enemies.some(e=>e.kind==='gustavax'));
 sim.state.bossCinema=null;sim.state.enemies=[];sim.state.spawnQueue=[];sim.state.phase='fight';sim.step();publish();await screen(page,'result');assert.equal(sim.state.phase,'won');
 assert.deepEqual(errors,[]);console.log('PASS final arena: coop loading, six rematches, desk destruction, all three phases, mobile, direct retry and final victory');
} finally {await browser?.close();await server.close();}
