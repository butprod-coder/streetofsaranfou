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

 for(const kind of ['karonux','lorenzo','jualos','yanu','jo','kikor','gustavax'])for(let branch=0;branch<3;branch++){
 await page.evaluate(async({kind,branch})=>{
 const {r,Simulation}=qa,{TALENTS}=await import('/game/rogue-talents.js');const g=new Simulation([kind],0,71),p=g.state.players[0];g.state.bossCinema=null;g.state.phase='fight';g.state.props=[];g.state.enemies=[];g.state.spawnQueue=[];p.x=500;p.y=550;p.energy=100;p.progression.talents=TALENTS[kind].filter(n=>n.branchIndex===branch).map(n=>n.id);
 for(let i=0;i<5;i++)g.spawnEnemy('remy',{x:590+i*85,y:530+i%2*50,hp:5000,maxHp:5000,cooldown:99,invincible:0});g.activateSpecial(p);
 if(kind==='karonux'&&branch===1)for(const e of g.state.enemies)g.karonuxFrost(p,e,3);
 g.updateSpecial(p,{},.016);g.updateSpecial(p,{special:true},.016);if(p.specialState.ultimateCount!==1)throw Error('No ultimate '+kind+branch);
 r.reset();for(let i=0;i<30;i++){g.state.time+=1/60;g.updateSpecial(p,{},1/60);g.updateWorld(1/60);r.draw(g.state,1/60);}r.hud(g.state,0,false,0);
 },{kind,branch});await page.screenshot({path:'test-results/miniboss/ultimate-'+kind+'-'+branch+'.png'});
 }
 assert.deepEqual(errors,[]);console.log('PASS 21 manual ultimates rendered without browser errors');
}finally{await browser?.close();await server.close();}
