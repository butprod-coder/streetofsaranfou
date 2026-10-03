import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({viewport:{width:1280,height:1120}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async()=>{
    const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js'),{Simulation}=await import('/game/simulation.js'),{NEW_SPRITE_IDS}=await import('/game/new-enemies-data.js');
    const assets=new Assets();await Promise.all(NEW_SPRITE_IDS.map(id=>assets.load(`/assets/enemies/new/${id}.png`)));
    const canvas=document.createElement('canvas');canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';document.body.append(canvas);
    const r=new Renderer(canvas,assets,{effect(){}});canvas.width=1280;canvas.height=1120;r.scale=1;
    window.newEnemyQA={assets,r,canvas,Simulation,NEW_SPRITE_IDS};
  });
  await mkdir('test-results',{recursive:true});
  for(const kind of ['yinyin','caro','dje','karmoilefion','triso']){
    const result=await page.evaluate(kind=>{
      const {assets,r}=window.newEnemyQA,c=r.ctx,key=`new_${kind}`,image=assets.get(`/assets/enemies/new/${kind}.png`);
      const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const ctx=probe.getContext('2d');ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,image.width,image.height).data;let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)transparent++;
      c.fillStyle='#192838';c.fillRect(0,0,1280,1120);const rects=[];
      for(let cell=0;cell<16;cell++){
        const frame=assets.arcadeFrame(key,cell);rects.push(frame.rect);
        const x=160+cell%4*320,y=235+Math.floor(cell/4)*270;r.arcadeSprite(key,x,y,cell,190);
        c.fillStyle='#ffe0a0';c.font='14px monospace';c.textAlign='center';c.fillText(`${kind} · ${cell}`,x,y+24);
      }
      return {transparent:transparent/(image.width*image.height),rects};
    },kind);
    assert.ok(result.transparent>.35,`${kind}: transparent background`);assert.ok(result.rects.every(r=>r[2]>40&&r[3]>40),`${kind}: all poses contain a full actor`);
    console.log(kind,JSON.stringify(result.rects));await page.screenshot({path:`test-results/new-${kind}-atlas.png`});
  }
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(async()=>{
    const {assets,r,canvas,Simulation,NEW_SPRITE_IDS}=window.newEnemyQA;await assets.prepare(0);canvas.width=1280;canvas.height=720;r.scale=1;
    const sim=new Simulation(['jo','yanu'],0,89);Object.assign(sim.state,{phase:'fight',enemies:[],props:[],spawnQueue:[],bossCinema:null,chapterStory:false});
    for(const [i,kind] of NEW_SPRITE_IDS.entries()){const e=sim.spawnEnemy(kind,{x:190+i*210,y:520,invincible:0,cooldown:0});e.action='special';e.actionTime=.4;e.attack={type:'special',elapsed:.5,duration:1,windup:.8,hit:false};}
    sim.state.players[0].x=360;sim.state.players[0].y=630;sim.state.players[0].groundGlueUntil=sim.state.time+2;
    sim.state.players[1].x=900;sim.state.players[1].y=630;sim.state.players[1].corruptedUntil=sim.state.time+2;
    const source=sim.state.enemies[0];for(const [i,kind] of ['yinyinCash','djeStretch','wheelRush','pipeStrike'].entries())sim.hazard(source,{kind,x:200+i*250,y:580,width:150,delay:0,ttl:1,damage:0});
    sim.hazard(sim.state.enemies.find(e=>e.kind==='triso'),{kind:'slime',x:650,y:620,radius:76,delay:0,ttl:8,groundResidue:true});
    const labels=[],fillText=r.ctx.fillText.bind(r.ctx);r.ctx.fillText=(text,...args)=>{labels.push(text);fillText(text,...args);};window.newEnemyQA.labels=labels;
    r.draw(sim.state,.016);window.newEnemyQA.sim=sim;
  });
  assert.ok(await page.evaluate(()=>window.newEnemyQA.labels.includes('Triolo')));
  await page.screenshot({path:'test-results/new-enemies-combat.png'});
  const attack=await page.evaluate(()=>{
    const {sim,r,assets}=window.newEnemyQA,e=sim.state.enemies.find(e=>e.kind==='dje');
    const rects=Array.from({length:6},(_,i)=>assets.arcadeFrame('djeStretch',i).rect);
    const draws=[],original=r.ctx.drawImage.bind(r.ctx);
    r.ctx.drawImage=(img,...args)=>{if(img===assets.get('/assets/enemies/new/dje-stretch.png'))draws.push(args);return original(img,...args);};
    e.attack=null;e.stun=0;e.x=520;e.y=560;
    e.newPattern={kind:'stretch',windup:.95,elapsed:0,width:370,facing:1,fired:true};
    for(const elapsed of [.5,.8,.89,1.02,1.17,1.3]){e.newPattern.elapsed=elapsed;r.drawNewEnemy(e,sim.state);}
    r.ctx.drawImage=original;return {rects,draws};
  });
  assert.equal(attack.draws.length,6);
  assert.ok(attack.rects.every(rect=>rect[3]>250),'complete bodies and feet');
  assert.ok(attack.draws[3][6]>attack.draws[2][6],'full extension is longer than half extension');
  assert.ok(attack.draws[4][6]<attack.draws[3][6],'arms retract');
  for(const facing of [1,-1]){
    await page.evaluate(facing=>{const {sim,r}=window.newEnemyQA,e=sim.state.enemies.find(e=>e.kind==='dje');e.x=facing===1?450:830;e.newPattern.facing=facing;e.newPattern.elapsed=1.02;r.draw(sim.state,.016);},facing);
    await page.screenshot({path:`test-results/dje-sprites-${facing===1?'right':'left'}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS: 80 transparent sprite frames, five enemies in combat, status labels and attack effects.');
} finally {await browser?.close();await new Promise(r=>server.server.close(r));}
