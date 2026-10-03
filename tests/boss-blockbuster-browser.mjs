import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createGameServer} from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 const result=await page.evaluate(async()=>{
  const [{Assets},{Renderer},{createBossPractice}]=await Promise.all([import('/game/assets.js'),import('/game/renderer.js'),import('/game/boss-practice.js')]);
  const assets=new Assets();for(let chapter=0;chapter<7;chapter++)await assets.prepare(chapter);await assets.load('/assets/shared/arcade/boss-blockbuster-fx.png');
  const image=assets.get('/assets/shared/arcade/boss-blockbuster-fx.png'),probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const pc=probe.getContext('2d');pc.drawImage(image,0,0);const rgba=pc.getImageData(0,0,probe.width,probe.height).data;let transparent=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]===0)transparent++;if(transparent/(probe.width*probe.height)<.25)throw Error('Boss FX must be transparent');
  const sheet=document.createElement('canvas');sheet.width=1280;sheet.height=1440;const ctx=sheet.getContext('2d');
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const r=new Renderer(canvas,assets,{effect(){}});r.scale=1;r.hud=()=>{};
  for(let chapter=0;chapter<7;chapter++){
   const sim=createBossPractice({chapter,phase:chapter===0?1:chapter===3?3:1});const e=sim.state.enemies[0],p=sim.state.players[0];sim.state.bossCinema=null;sim.state.chapterStory=false;e.x=740;e.y=550;e.pattern=null;e.recovering=0;e.guardBreakReadyAt=99;e.vehicle=false;e.sofa=false;p.x=650;p.y=550;
   for(let i=0;i<4;i++){sim.state.time+=.15;sim.bossPressureHit(e);}
   if(!e.cinematicCounter)throw Error(`No counter ${e.kind}`);
   sim.updateBossBlockbuster(e,.81);r.reset();r.draw(sim.state,1/60);r.draw(sim.state,.1);
   ctx.drawImage(canvas,(chapter%2)*640,Math.floor(chapter/2)*360,640,360);ctx.fillStyle='#080c18';ctx.fillRect((chapter%2)*640,Math.floor(chapter/2)*360,640,30);ctx.fillStyle='#ffdb8a';ctx.font='bold 18px sans-serif';ctx.fillText(e.kind,(chapter%2)*640+15,Math.floor(chapter/2)*360+22);
  }
  return sheet.toDataURL('image/png');
 });assert.deepEqual(errors,[]);await mkdir('test-results',{recursive:true});await writeFile('test-results/boss-blockbuster.png',Buffer.from(result.split(',')[1],'base64'));console.log('PASS: seven boss counter animations render without errors.');
}finally{await browser.close();await server.close();}
