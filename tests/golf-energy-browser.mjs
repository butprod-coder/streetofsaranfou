import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async()=>{
    const {Simulation}=await import('/game/simulation.js'),original=Simulation.prototype.enterStreet;
    Simulation.prototype.enterStreet=function(){original.call(this);window.qaSim=this;Object.assign(this.state,{phase:'fight',chapterStory:false,spawnQueue:[],enemies:[],props:[]});this.spawnEnemy('remy',{x:1000,y:550,hp:10000,maxHp:10000,cooldown:999,speed:0,invincible:0});};
  });
  await page.locator('[data-action=solo]').click();await page.locator('[data-fighter=karonux]').click();await page.locator('[data-action=play]').click();
  await page.waitForFunction(()=>window.qaSim?.state.phase==='fight'&&window.saranfou.inspect().screen===null);
  const player=()=>page.evaluate(()=>({...window.qaSim.state.players[0]}));
  assert.equal((await player()).energy,0);assert.equal((await player()).progression.points,0);
  await page.keyboard.press('KeyL');assert.equal((await player()).specialState,null);
  await page.evaluate(()=>{const s=window.qaSim.state,p=s.players[0],e=s.enemies[0];p.energy=93;p.cooldown=0;p.x=500;p.y=550;e.x=560;e.y=550;});
  await page.keyboard.press('KeyJ');await page.waitForFunction(()=>window.qaSim.state.players[0].energy===100);
  await page.waitForFunction(()=>document.querySelector('#hud-p1 .energy-bar').classList.contains('ready'));
  await page.waitForTimeout(400);await page.keyboard.press('KeyL');await page.waitForFunction(()=>!!window.qaSim.state.players[0].specialState);
  assert.equal((await player()).energy,0);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');const right=await player();assert.ok(right.x>570);
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(220);await page.keyboard.up('ArrowUp');const up=await player();assert.ok(up.y<right.y-20);
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(220);await page.keyboard.up('ArrowLeft');const left=await player();assert.ok(left.x<up.x-60);
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/golf-controlled.png'});
  await page.waitForFunction(()=>!window.qaSim.state.players[0].specialState);const stopped=await player();assert.ok(Math.abs(stopped.x-left.x)<15);assert.equal(stopped.energy,0);
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const p=window.qaSim.state.players[0];p.energy=100;p.cooldown=0;p.x=500;p.y=550;});
  await page.locator('[data-touch=special]').tap();await page.waitForFunction(()=>!!window.qaSim.state.players[0].specialState);
  const stick=await page.locator('#touch-stick').boundingBox();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width*.85,stick.y+stick.height*.2);await page.waitForTimeout(500);await page.mouse.up();
  const touch=await player();assert.ok(touch.x>550&&touch.y<530,'Touch stick steers the Golf on both axes');
  await page.screenshot({path:'test-results/golf-controlled-mobile.png'});
  await page.waitForFunction(()=>!window.qaSim.state.players[0].specialState);
  await page.evaluate(()=>{window.qaSim.clearStreet();window.qaSim.clearStreet();});await page.waitForFunction(()=>window.qaSim.state.players[0].progression.points===1);
  await page.locator('.upgrade-talents').click();await page.waitForFunction(()=>window.saranfou.inspect().screen==='evolution');
  assert.equal(await page.locator('[data-talent-art]').count(),15);await page.screenshot({path:'test-results/talents-illustrated-mobile.png'});
  // A review sheet uses the same SVG markup and dimensions as the actual UI.
  await page.setViewportSize({width:1200,height:900});
  await page.evaluate(async()=>{
    const [{TALENTS},{talentIcon}]=await Promise.all([import('/game/rogue-talents.js'),import('/game/talent-icons.js')]);
    const sheet=document.createElement('div');sheet.id='talent-art-sheet';sheet.style.cssText='position:absolute;z-index:9999;inset:0 auto auto 0;width:1180px;background:#0d1420;padding:10px;color:#e5e9f2;font:12px sans-serif;';
    sheet.innerHTML=Object.entries(TALENTS).map(([kind,nodes])=>`<h2 style="color:#ffd587;margin:10px">${kind}</h2><div style="display:grid;grid-template-columns:repeat(15,1fr);gap:3px">${nodes.map(n=>`<div style="text-align:center;background:#172331;padding:8px 2px;min-height:105px"><div style="width:48px;height:48px;margin:auto">${talentIcon(kind,n)}</div><span style="display:block;margin-top:7px">${n.name}</span></div>`).join('')}</div>`).join('');document.body.append(sheet);
  });
  await page.locator('#talent-art-sheet').screenshot({path:'test-results/talent-icons-105.png'});
  assert.deepEqual(errors,[]);console.log('PASS: empty meter, charge on hit, full-bar activation, keyboard and touch Golf, first-street reward and 105 rendered icons.');
} finally {await browser.close();await server.close();}
