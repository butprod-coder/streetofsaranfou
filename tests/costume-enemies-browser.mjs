import { chromium } from 'playwright';
import { createGameServer } from '../server/index.js';
import { mkdir } from 'node:fs/promises';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true, executablePath:process.env.BROWSER_PATH || undefined});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 await page.evaluate(async()=>{
 const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js'),{Simulation}=await import('/game/simulation.js'),{COSTUME_ENEMIES}=await import('/game/costume-enemies.js');
 const assets=new Assets();await assets.prepare(0);const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:1280px;height:720px';document.body.append(canvas);const r=new Renderer(canvas,assets,{effect(){}});canvas.width=1280;canvas.height=720;r.scale=1;
 for (const kind of Object.keys(COSTUME_ENEMIES)) {
 const key='street_'+kind, image=assets.arcadeFrame(key).image;
 const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const ctx=probe.getContext('2d');ctx.drawImage(image,0,0);
 const data=ctx.getImageData(0,0,image.width,image.height).data;let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)transparent++;
 if(transparent/(image.width*image.height)<.3)throw Error(kind+': missing transparency');
 for(let cell=0;cell<12;cell++){const rect=assets.arcadeFrame(key,cell).rect;if(rect[2]<20||rect[3]<20)throw Error(kind+': empty cell '+cell);r.arcadeSprite(key,100,200,cell,145);}
 for(const pattern of [null,{hit:false},{hit:true}]){const a={kind,x:100,y:200,z:0,facing:1,hp:100,stun:0,pattern,action:'walk'};r.drawStreetEnemy(a,{time:.3});r.drawStreetEnemy({...a,hp:0,deadTime:0},{time:.3});}
 }
 for(const kind of ['bowlingPins','bowlingBall','hell','neon','karaoke','sticky','pigeonDive','stoppie','flippers'])r.drawHazard({kind,costumeFX:true,x:100,y:300,width:700,band:25,radius:100,shape:['hell','neon','flippers'].includes(kind)?'line':'circle',delay:0,facing:1},.3);
 const sim=new Simulation(['jo'],0,123);r.ctx.fillStyle='#172331';r.ctx.fillRect(0,0,1280,720);
 Object.keys(COSTUME_ENEMIES).forEach((kind,i)=>{const e=sim.spawnEnemy(kind,{x:160+(i%4)*320,y:290+Math.floor(i/4)*330});e.pattern={kind:COSTUME_ENEMIES[kind].pattern,hit:false,elapsed:.2,windup:1};r.drawStreetEnemy(e,sim.state);});
 });
 await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/costume-enemies.png'});if(errors.length)throw Error(errors.join('\n'));console.log('Eight atlases / 96 cells validated; alpha, poses and effects rendered; no browser errors.');
}finally{await browser?.close();await new Promise(r=>server.server.close(r));}

