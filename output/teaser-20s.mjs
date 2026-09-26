import { chromium } from 'playwright';
import { createGameServer } from '../server/index.js';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = new URL('./teaser-20s/', import.meta.url); await mkdir(dir,{recursive:true});
const server=createGameServer(); await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 page.on('pageerror',e=>console.error(e));
 await page.goto(`http://127.0.0.1:${server.server.address().port}`); await page.waitForFunction(()=>window.saranfou);
 await page.click('[data-action=solo]');
 const menus=[];
 for(const id of ['karonux','yanu','gustavax']){await page.click(`[data-fighter=${id}]`);await page.waitForTimeout(180);menus.push((await page.screenshot()).toString('base64'));}
 await page.click('#select [data-action=evolution]');await page.waitForTimeout(250);
 menus.push((await page.screenshot()).toString('base64'));
 await page.locator('.talent-node').first().click();await page.mouse.move(0,0);await page.waitForTimeout(220);
 menus.push((await page.screenshot()).toString('base64'));
 await page.evaluate(async menus=>{
  const [{Assets},{Renderer},{Simulation},{Audio},{createBossPractice},{TALENT_BRANCHES},{applyProfile}]=await Promise.all(['/game/assets.js','/game/renderer.js','/game/simulation.js','/game/audio.js','/game/boss-practice.js','/game/rogue-talents.js','/game/progression.js'].map(p=>import(p)));
  const imgs=await Promise.all(menus.map(b=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+b;})));
  const assets=new Assets();await assets.prepare(0);await Promise.all([4,5].map(i=>assets.preloadChapter(i)));
  const game=document.createElement('canvas'),canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';document.body.append(canvas);
  const audio=new Audio(false);audio.wake();audio.say=()=>{};const r=new Renderer(game,assets,audio);game.width=1280;game.height=720;r.scale=1;
  const configs=[['jo',0,0],['karonux',4,0],['yanu',0,0],['gustavax',5,1]];
  const sims=configs.map(([hero,ch,branch],idx)=>{
   const sim=idx===3?createBossPractice({chapter:5,character:hero,phase:1}):new Simulation([hero],ch,82+idx);
   const s=sim.state;Object.assign(s,{phase:'fight',chapterStory:false,events:[],props:[],spawnQueue:[],surpriseDone:true,bossCinema:null});
   const p=s.players[0];Object.assign(p,{x:460,y:555,energy:100,invincible:99});
   applyProfile(p,{kind:hero,milestones:['start','boss:1','boss:2','boss:3','boss:4','boss:5'],talents:TALENT_BRANCHES[hero][branch].nodes.map(n=>n.id)});
   if(idx!==3){s.enemies=[];['remy','orelsan','charlingals','makouille'].forEach((k,j)=>sim.spawnEnemy(k,{x:610+j*125,y:540+j%2*45,hp:350,maxHp:350,cooldown:.4+j*.3}));}
   else {s.enemies[0].x=735;s.enemies[0].y=555;}
   s.events=[];return sim;
  });
  window.teaser={canvas,game,r,audio,imgs,sims};
 },menus);
 console.log('Menus et scènes prêts. Enregistrement…');
 const result=await page.evaluate(async()=>{
  const {canvas,game,r,audio,imgs,sims}=window.teaser,c=canvas.getContext('2d');
  const dest=audio.context.createMediaStreamDestination();audio.master.connect(dest);
  const stream=canvas.captureStream(30);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const mime=['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus'].find(m=>MediaRecorder.isTypeSupported(m));
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:12000000,audioBitsPerSecond:192000});const chunks=[];rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);
  const cuts=[0,3,6,10,12,14,18],stills=[],proof=[];let old=-1,last=0,beat=-1;
  function txt(s,x,y,size,color='#f6f0df',align='left'){c.font=`900 ${size}px Arial`;c.textAlign=align;c.fillStyle=color;c.fillText(s,x,y);}
  function frame(t){
   const idx=cuts.findLastIndex(x=>t>=x),local=t-cuts[idx],dt=Math.min(.04,Math.max(.001,t-last));last=t;
   if(idx!==old){r.reset();old=idx;audio.tone(95,.4,.6,'sine',0,28);audio.hiss(.18,.14,0,1100);}
   const b=Math.floor(t*2.4);if(b!==beat){beat=b;audio.tone(b%4===0?60:85,.16,b%4===0?.38:.20,'sine',0,30);if(b%2)audio.hiss(.07,.08,0,2200);}
   if(idx<2){const im=idx===0?imgs[Math.min(2,Math.floor(local))]:imgs[local<1.35?3:4];const z=1+local*.009;c.save();c.translate(640,360);c.scale(z,z);c.drawImage(im,-640,-360);c.restore();}
   else {
    const si=idx===2?0:idx===3?1:idx===4?2:3,sim=sims[si],p=sim.state.players[0];
    if(idx<6){
     if(si===3&&local>1.7&&!sim.state.enemies[0].commercial){sim.beginJualosCommercial(sim.state.enemies[0]);}
     p.invincible=9;p.energy=100;
     const e=sim.state.enemies.filter(x=>x.hp>0).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
     const dx=e?e.x-p.x:0,dy=e?e.y-p.y:0;
     sim.step([{x:Math.abs(dx)>83?Math.sign(dx):0,y:Math.abs(dy)>14?Math.sign(dy)*.7:0,punch:Math.floor(local*8)%2===0,kick:Math.floor(local*6)%3===0,special:si>0&&local>.30&&local<.48,jump:false,taps:{}}],dt);
    }
    audio.update(true,sim.state.chapter,si===3,false);r.draw(sim.state,dt);
    const z=idx===5?1.05+Math.min(local,3)*.015:1.025;
    c.save();c.translate(640,390);c.scale(z,z);c.drawImage(game,-640,-390);c.restore();
    if(idx===6){c.fillStyle='#090e18ed';c.fillRect(0,0,1280,720);}
   }
   c.fillStyle='#080c15';c.fillRect(0,0,1280,42);c.fillRect(0,664,1280,56);
   txt('STREETS OF SARANFOU',40,27,15,'#f4c66d');txt('REBORN',1240,27,14,'#b8b5af','right');
   if(idx<6){
    const grad=c.createLinearGradient(0,530,0,665);grad.addColorStop(0,'#080c1500');grad.addColorStop(.5,'#080c15d9');grad.addColorStop(1,'#080c15');c.fillStyle=grad;c.fillRect(0,530,1280,135);
    const titles=['CHOISIS TA BANDE.','FORGE TON STYLE.','FAIS PARLER LES POINGS.','LÂCHE LES CHEVAUX.','RÉVEILLE LA BÊTE.','JUALOS T’ATTEND.'];
    const stats=['7 COMBATTANTS JOUABLES','21 SPÉCIALITÉS  /  126 TALENTS','34 TYPES D’ENNEMIS  /  7 CHAPITRES','DES POUVOIRS COMPLÈTEMENT DÉJANTÉS','TRANSFORME-TOI. DÉCHAÎNE-TOI.','7 BOSS À DÉFIER'];
    const slide=Math.max(0,1-local/.24)*25;c.fillStyle='#f4c66d';c.fillRect(42,574,5,63);txt(titles[idx],64+slide,600,36);txt(stats[idx],65+slide,634,18,'#f4c66d');
   }else{
    const z=1+local*.015;c.save();c.translate(640,350);c.scale(z,z);txt('STREETS OF',0,-85,35,'#f6f0df','center');txt('SARANFOU',0,10,100,'#f4c66d','center');txt('LA RUE ATTEND SA BANDE.',0,67,27,'#f6f0df','center');txt('7 COMBATTANTS  •  21 SPÉCIALITÉS  •  7 BOSS',0,125,20,'#bcbec7','center');txt('SOLO  /  COOP EN LIGNE',0,172,17,'#f4c66d','center');c.restore();
   }
   c.fillStyle='#f4c66d';c.fillRect(40,692,1200*Math.min(1,t/20),2);
   if(local<.12&&idx>0){c.fillStyle=`rgba(255,222,160,${.22*(1-local/.12)})`;c.fillRect(0,42,1280,622);}
   const fade=t<.25?1-t/.25:t>19.6?(t-19.6)/.4:0;if(fade>0){c.fillStyle=`rgba(6,9,16,${fade})`;c.fillRect(0,0,1280,720);}
   if(t>19.4)audio.master.gain.setTargetAtTime(.001,audio.context.currentTime,.12);
   const moments=[1.5,4.8,8,11,13,16.5,18.8];if(stills.length<moments.length&&t>=moments[stills.length]){stills.push(canvas.toDataURL('image/png').split(',')[1]);proof.push({time:t,scene:idx,special:sims.map(s=>s.state.players[0].specialState?.kind),boss:sims[3].state.enemies[0]?.kind});}
  }
  frame(0);rec.start();const start=performance.now();await new Promise(resolve=>{function tick(){const t=(performance.now()-start)/1000;if(t>=20){rec.stop();resolve();return;}frame(t);requestAnimationFrame(tick);}requestAnimationFrame(tick);});await done;
  const blob=new Blob(chunks,{type:mime}),buf=new Uint8Array(await blob.arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=32768)bin+=String.fromCharCode(...buf.subarray(i,i+32768));
  return {base64:btoa(bin),mime,stills,proof};
 });
 const ext=result.mime.includes('mp4')?'mp4':'webm';const name=`Streets-of-SaranFou-Teaser-20s.${ext}`;await writeFile(new URL(name,dir),Buffer.from(result.base64,'base64'));
 for(let i=0;i<result.stills.length;i++)await writeFile(new URL(`plan-${i+1}.png`,dir),Buffer.from(result.stills[i],'base64'));
 await writeFile(new URL('verification.json',dir),JSON.stringify({mime:result.mime,proof:result.proof,stats:{combattants:7,specialites:21,talents:126,chapitres:7,ennemis:34,boss:7},sources:['game/data.js','game/rogue-talents.js']},null,2));
 console.log(JSON.stringify({file:name,bytes:Buffer.from(result.base64,'base64').length,proof:result.proof}));
}finally{await browser.close();await server.close();}

