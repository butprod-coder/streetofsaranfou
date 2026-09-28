import {chromium} from 'playwright';
import {createGameServer} from '../server/index.js';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 await mkdir('test-results/transformations',{recursive:true});
 const keys=await page.evaluate(async()=>{
 const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js'),{Simulation}=await import('/game/simulation.js'),{ARCADE_SPRITES}=await import('/game/visuals.js'),{ENEMIES,animation}=await import('/game/data.js');
 const assets=new Assets();await assets.prepare(0);const canvas=document.createElement('canvas');canvas.style='position:fixed;inset:0;z-index:9999;width:1280px;height:900px';document.body.append(canvas);const r=new Renderer(canvas,assets,{effect(){}});canvas.width=1280;canvas.height=900;r.scale=1;window.qa={assets,r,Simulation,ENEMIES,animation,ARCADE_SPRITES};
 for(const id of Object.keys(ENEMIES).filter(id=>ENEMIES[id].miniBoss||ENEMIES[id].summonOnly))for(const action of ['idle','walk','special','hurt','dead'])for(const f of animation(id,action,true))if(!assets.arcadeFrame(f.atlas,f.cell))throw Error('Missing '+id+' '+action+' '+f.atlas);
 return Object.keys(ARCADE_SPRITES).filter(k=>ARCADE_SPRITES[k].folder?.startsWith('heroes/talents')&&!/Minions/.test(k));
 });
 for(const key of keys){await page.evaluate(key=>{const {r,ARCADE_SPRITES}=qa,c=r.ctx;c.fillStyle='#253540';c.fillRect(0,0,1280,900);for(let i=0;i<(ARCADE_SPRITES[key].frameCount||16);i++){const col=i%5,row=Math.floor(i/5),x=125+col*250,y=195+row*220;r.arcadeSprite(key,x,y,i,135);c.fillStyle='#fff';c.font='14px monospace';c.fillText(key+' '+i,col*250+8,y+20);}},key);await page.screenshot({path:`test-results/transformations/${key}.png`});}
 assert.deepEqual(errors,[]);console.log('PASS transformation atlas audit');
}finally{await browser?.close();await server.close();}
