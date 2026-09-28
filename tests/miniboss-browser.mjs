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
 await mkdir('test-results/miniboss',{recursive:true});
 const keys=await page.evaluate(async()=>{
 const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js'),{Simulation}=await import('/game/simulation.js'),{ARCADE_SPRITES}=await import('/game/visuals.js'),{ENEMIES,animation}=await import('/game/data.js');
 const assets=new Assets();await assets.prepare(0);const canvas=document.createElement('canvas');canvas.style='position:fixed;inset:0;z-index:9999;width:1280px;height:900px';document.body.append(canvas);const r=new Renderer(canvas,assets,{effect(){}});canvas.width=1280;canvas.height=900;r.scale=1;window.qa={assets,r,Simulation,ENEMIES,animation,ARCADE_SPRITES};
 for(const id of Object.keys(ENEMIES).filter(id=>ENEMIES[id].miniBoss||ENEMIES[id].summonOnly))for(const action of ['idle','walk','special','hurt','dead'])for(const f of animation(id,action,true))if(!assets.arcadeFrame(f.atlas,f.cell))throw Error('Missing '+id+' '+action+' '+f.atlas);
 return Object.keys(ARCADE_SPRITES).filter(k=>k.startsWith('miniBoss')&&!k.endsWith('FX'));
 });
 for(const key of keys){await page.evaluate(key=>{const {r,ARCADE_SPRITES}=qa,c=r.ctx;c.fillStyle='#253540';c.fillRect(0,0,1280,900);for(let i=0;i<(ARCADE_SPRITES[key].frameCount||16);i++){const col=i%5,row=Math.floor(i/5),x=125+col*250,y=195+row*220;r.arcadeSprite(key,x,y,i,135);c.fillStyle='#fff';c.font='14px monospace';c.fillText(key+' '+i,col*250+8,y+20);}},key);await page.screenshot({path:`test-results/miniboss/${key}.png`});}
 for(let chapter=0;chapter<6;chapter++){
  const result=await page.evaluate(async chapter=>{const {r,Simulation,assets}=qa;await assets.preloadChapter(chapter);const g=new Simulation(['jo'],chapter,71);g.state.stage=2;g.enterStreet();g.state.wave=g.state.waves.length-2;g.spawnWave();r.canvas.height=720;r.canvas.style.height='720px';r.reset();r.draw(g.state,.016);const b=g.state.enemies.find(e=>e.miniBoss);r.bossPresentation(b,{...g.state.bossCinema,elapsed:1},g.state);g.state.bossCinema=null;for(let i=0;i<480;i++){g.state.players[0].invincible=100;g.step();r.draw(g.state,.016);}r.hud(g.state,0,false,0);return {name:document.querySelector('#boss-name').textContent,kind:b.kind,invocations:g.state.enemies.filter(e=>e.remySummon).length};},chapter);
  assert.ok(result.name);if(chapter===4){assert.match(result.name,/RÉMY LE NO LIFE/);assert.equal(result.invocations,4);}
  await page.screenshot({path:`test-results/miniboss/combat-${chapter}.png`});console.log(result);
 }
 for(const kind of ['damps','cainri','jalatrix','mazzuka','maire','remyGeek','harmelin']){
 await page.evaluate(kind=>{const {r,Simulation}=qa,g=new Simulation(['jo'],0,12),c=r.ctx;r.canvas.height=900;r.canvas.style.height='900px';c.fillStyle='#253540';c.fillRect(0,0,1280,900);const boss={...g.actor(kind,50,true),miniBoss:true,hp:500,maxHp:500,enraged:true,bossPhase:2,attackCount:0,remyPartySpawned:true};for(let i=0;i<10;i++){const b={...boss,x:125+i%5*250,y:330+Math.floor(i/5)*400,attackCount:i};g.startMiniBossPattern(b,g.state.players[0]);b.pattern.elapsed=b.pattern.windup+(i%2?.1:-.1);r.drawMiniBoss(b,{...g.state,time:i});}},kind);await page.screenshot({path:'test-results/miniboss/rage-'+kind+'.png'});
 }
 assert.deepEqual(errors,[]);console.log('PASS all mini-boss atlases, summons, banners and six live fights');
}finally{await browser?.close();await server.close();}
