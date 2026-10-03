import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({viewport:{width:1280,height:1120}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);await mkdir('test-results',{recursive:true});
  await page.evaluate(async()=>{
    const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js'),{Simulation}=await import('/game/simulation.js');
    const assets=new Assets();await assets.prepare(0);const canvas=document.createElement('canvas');canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';document.body.append(canvas);
    const r=new Renderer(canvas,assets,{effect(){}});canvas.width=1280;canvas.height=1120;r.scale=1;window.qa={assets,r,canvas,Simulation};
  });
  for(const id of ['jualasAlarm','ladle','tchoin','jalatrixGamer','julioKid','djeKid','improvised']){
    const result=await page.evaluate(id=>{
      const {assets,r}=window.qa,key=['improvised','ladle'].includes(id)?id:`new_${id}`,image=assets.arcadeFrame(key,0).image;
      const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const c=probe.getContext('2d');c.drawImage(image,0,0);
      const pixels=c.getImageData(0,0,image.width,image.height).data;let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)transparent++;
      r.ctx.fillStyle='#192838';r.ctx.fillRect(0,0,1280,1120);const rects=[];
      for(let cell=0;cell<(id==='ladle'?2:id==='improvised'?12:16);cell++){const frame=assets.arcadeFrame(key,cell);rects.push(frame.rect);r.arcadeSprite(key,160+cell%4*320,235+Math.floor(cell/4)*270,cell,180);}
      return {transparent:transparent/(image.width*image.height),rects};
    },id);
    assert.ok(result.transparent>.25,`${id}: real alpha`);assert.ok(result.rects.every(r=>r[2]>10&&r[3]>10),`${id}: nonempty frames`);
    console.log(id,JSON.stringify(result.rects));await page.screenshot({path:`test-results/improvised-${id}-atlas.png`});
  }
  await page.setViewportSize({width:1280,height:720});
  for(const facing of [1,-1]){
    await page.evaluate(facing=>{
      const {r,canvas,Simulation}=window.qa;canvas.width=1280;canvas.height=720;
      const sim=new Simulation(['karonux','kikor'],0,42);Object.assign(sim.state,{phase:'fight',enemies:[],props:[],pickups:[],spawnQueue:[],bossCinema:null});
      ['tchoin','jalatrixGamer','julioKid','djeKid'].forEach((kind,i)=>{const e=sim.spawnEnemy(kind,{x:240+i*260,y:530,facing,invincible:0});e.newPattern={kind:['whip','summon','kidRush','kidRush'][i],elapsed:.9,windup:.7,width:285,band:30,targetY:530,facing,fired:true};});
      const p=sim.state.players[0];p.x=640;p.y=625;p.facing=facing;
      for(const kind of ['cart','extinguisher','football']){p.weapon={kind,uses:5};sim.startWeaponAttack(p);sim.resolveWeaponAttack(p);}
      sim.state.weaponProjectiles.forEach((shot,i)=>{shot.x=250+i*360;shot.elapsed=.2;});
      sim.state.players[1].weapon={kind:'parasol',uses:5};sim.startWeaponAttack(sim.state.players[1]);r.draw(sim.state,.016);
    },facing);
    await page.screenshot({path:`test-results/improvised-combat-${facing}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS: 64 enemy poses, 12 weapon/FX cells, both facing directions, no browser errors.');
  for(const facing of [1,-1]){
    await page.evaluate(facing=>{
      const {r,Simulation}=window.qa,sim=new Simulation(['karonux','kikor'],0,42);
      Object.assign(sim.state,{phase:'fight',enemies:[],props:[],pickups:[],spawnQueue:[],bossCinema:null});
      const e=sim.spawnEnemy('jualasAlarm',{x:700,y:535,facing});e.newPattern={kind:'ladle',elapsed:1.1,windup:1.05,fired:true,facing,width:160,band:42,targetY:535};
      const p=sim.state.players[0];Object.assign(p,{x:420,y:555,facing,weapon:{kind:'ladle',uses:10}});sim.startWeaponAttack(p);p.attack.hit=true;
      sim.state.players[1].x=160;sim.state.pickups.push({id:999,kind:'weapon',weapon:'ladle',uses:10,x:1000,y:600});r.draw(sim.state,.016);
    },facing);await page.screenshot({path:`test-results/jualas-ladle-${facing}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS: Jualas 16 poses, ladle pickup/held/swing, both facing directions.');
} finally {await browser?.close();await new Promise(r=>server.server.close(r));}
