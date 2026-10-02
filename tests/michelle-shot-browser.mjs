import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
import { mkdir } from 'node:fs/promises';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  const shots=await page.evaluate(async()=>{
    const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js'),{Simulation}=await import('/game/simulation.js');
    const assets=new Assets();await assets.load('/assets/enemies/street/michelle_police.png');
    const canvas=document.createElement('canvas');canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';document.body.append(canvas);
    const r=new Renderer(canvas,assets,{effect(){}});canvas.width=1280;canvas.height=720;r.scale=1;r.ctx.fillStyle='#192838';r.ctx.fillRect(0,0,1280,720);
    const sim=new Simulation(['jo']);sim.state.enemies=[];sim.state.hazards=[];
    const result=[];
    for(const [x,y,facing] of [[270,470,1],[1010,580,-1]]){
      const enemy=sim.spawnEnemy('michelle_police',{x,y,facing,invincible:0});
      const pattern={kind:'pistolShot',targetX:x+facing*400,targetY:y+40,hit:true};enemy.pattern=pattern;
      sim.executeStreetPattern(enemy,pattern);const h=sim.state.hazards.at(-1);
      r.drawStreetEnemy(enemy,sim.state);r.drawHazard(h,0);
      result.push({x:h.x,y:h.y,height:h.renderHeight,facing,sourceX:x,sourceY:y});
    }
    return result;
  });
  for(const shot of shots){assert.equal(shot.y,shot.sourceY);assert.equal(shot.height,114);assert.equal(shot.x,shot.sourceX+shot.facing*65);}
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/michelle-shot-height.png'});assert.deepEqual(errors,[]);
  console.log('PASS: Michelle shots originate at gun height in both directions and on different combat lanes.');
}finally{await browser?.close();await new Promise(r=>server.server.close(r));}
