import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.waitForFunction(()=>document.querySelector('#talent-tree'));
  await page.evaluate(async()=>{
    const {renderEvolution}=await import('/game/evolution-ui.js'),{normalizeProfile,spendPoint}=await import('/game/progression.js');
    let profile=normalizeProfile({milestones:Array.from({length:12},(_,i)=>`encounter:0:0:0:${i}`)},'jo');
    const render=()=>renderEvolution('jo',profile,id=>{const next=spendPoint(profile,id);if(next){profile=next;render();}});
    render();document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));document.querySelector('#evolution').classList.add('active');
  });
  const first=page.locator('[data-talent="jo_v3_0_0"]');
  assert.equal(await first.locator('.talent-rank').textContent(),'☆☆☆');
  for(const stars of ['★☆☆','★★☆','★★★']){await first.click();assert.equal(await first.locator('.talent-rank').textContent(),stars);}
  assert.equal(await first.getAttribute('aria-disabled'),'true');
  assert.equal(await page.locator('[data-talent="jo_v3_1_0"]').getAttribute('aria-disabled'),'true');
  await page.locator('[data-talent="jo_v3_0_1"]').click();
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/talent-stars-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/talent-stars-mobile.png'});
  assert.deepEqual(errors,[]);console.log('PASS three star purchases, maximum, permanent branch, next tier, desktop and mobile');
}finally{await browser.close();await server.close();}
