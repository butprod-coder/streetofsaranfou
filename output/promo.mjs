import { chromium } from 'playwright';
import { createGameServer } from '../server/index.js';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('./promo/', import.meta.url); await mkdir(out,{recursive:true});
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>console.error(e));
 await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 await page.evaluate(async()=>{
  const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js'),{Simulation}=await import('/game/simulation.js'),{Audio}=await import('/game/audio.js'),{createBossPractice}=await import('/game/boss-practice.js');
  const assets=new Assets();await assets.prepare(0);await Promise.all([1,4,5].map(i=>assets.preloadChapter(i)));
  const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:1280px;height:720px;z-index:99999';document.body.append(canvas);
  const audio=new Audio(false);audio.wake();audio.say=()=>{};
  const r=new Renderer(canvas,assets,audio);canvas.width=1280;canvas.height=720;r.scale=1;
  const scenes=[{chapter:0,heroes:['jo'],title:'LES RUES SONT À VOUS.'},{chapter:1,heroes:['kikor','lorenzo'],title:'RAMÈNE UN POTE.'},{chapter:4,heroes:['karonux'],title:'LÂCHE TON SPÉCIAL.'},{chapter:5,heroes:['yanu'],title:'DÉFIE LES PATRONS.',boss:true}];
  const sims=scenes.map((s,i)=>{
   const sim=s.boss?createBossPractice({chapter:s.chapter,character:s.heroes[0],phase:2}):new Simulation(s.heroes,s.chapter,420+i);
   const st=sim.state;st.phase='fight';st.chapterStory=false;st.events=[];st.props=[];st.bossCinema=null;st.spawnQueue=[];st.surpriseDone=true;
   st.players.forEach((p,j)=>{p.x=490-j*120;p.y=545+j*55;p.energy=100;p.invincible=99;});
   if(!s.boss){st.enemies=[];['remy','remy','remy','remy'].forEach((k,j)=>sim.spawnEnemy(k,{x:650+j*120,y:525+j%2*65,hp:150,maxHp:150,cooldown:.4+j*.2}));}
   else st.enemies[0].x=760;
   st.events=[];return sim;
  });
  window.promo={canvas,r,audio,scenes,sims};
 });
 console.log('Assets ready');
 const result=await page.evaluate(async()=>{
  const {canvas,r,audio,scenes,sims}=window.promo,c=canvas.getContext('2d');
  const dest=audio.context.createMediaStreamDestination();audio.master.connect(dest);
  const stream=canvas.captureStream(30);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const mime=['video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus'].find(m=>MediaRecorder.isTypeSupported(m));
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8500000,audioBitsPerSecond:192000});
  const chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>recorder.onstop=resolve);
  let last=0,previous=-1;const stills=[];
  function text(t,x,y,size,color='#fff',align='left'){c.fillStyle=color;c.textAlign=align;c.font=`900 ${size}px Arial`;c.fillText(t,x,y);}
  function frame(t){
   const idx=Math.min(3,Math.floor(t/4)),local=t-idx*4,sim=sims[idx],sc=scenes[idx];
   if(idx!==previous){r.reset();previous=idx;last=t;}
   const dt=Math.min(.06,Math.max(.001,t-last));last=t;
   if(t<16){for(let j=0;j<2;j++){
    const inputs=sim.state.players.map((p,n)=>{const e=sim.state.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];const dx=e?e.x-p.x:0,dy=e?e.y-p.y:0;return{x:Math.abs(dx)>82?Math.sign(dx):0,y:Math.abs(dy)>16?Math.sign(dy)*.7:0,punch:Math.floor(local*8)%2===0,kick:Math.floor(local*5)%3===0,special:local>.8&&local<.9||local>2.6&&local<2.7,jump:false,taps:{}};});sim.step(inputs,dt/2);
   }}
   audio.update(true,sc.chapter,!!sc.boss,false);r.draw(sim.state,dt);
   c.setTransform(1,0,0,1,0,0);
   const g=c.createLinearGradient(0,0,0,230);g.addColorStop(0,'#070b15ef');g.addColorStop(1,'#070b1500');c.fillStyle=g;c.fillRect(0,0,1280,230);
   text('STREETS OF SARANFOU',48,47,22,'#ffce70');text(sc.title,48,104,43);
   text(['DU COMBAT. DU CHAOS. DU SARAN.','SOLO OU COOP EN LIGNE','7 COMBATTANTS · DES POUVOIRS DÉJANTÉS','6 QUARTIERS · 6 BOSS'][idx],48,142,19,'#ddd');
   c.fillStyle='#ffce70';c.fillRect(48,164,70,4);
   if(t<.35){c.fillStyle=`rgba(7,11,21,${1-t/.35})`;c.fillRect(0,0,1280,720);}
   if(t>=16){c.fillStyle='rgba(5,9,18,.89)';c.fillRect(0,0,1280,720);text('STREETS OF',640,265,42,'#fff','center');text('SARANFOU',640,365,106,'#ffce70','center');text('LA BANDE VOUS ATTEND.',640,430,29,'#fff','center');text('SOLO  /  COOP EN LIGNE',640,500,20,'#bfc8da','center');c.fillStyle='#ffce70';c.fillRect(540,540,200,4);}
   if(t>18.5){audio.master.gain.value=.24*Math.max(0,(19-t)/.5);}
   if(stills.length<5&&t>=[1.5,5.5,10,14,17][stills.length])stills.push(canvas.toDataURL('image/png').split(',')[1]);
  }
  frame(0);recorder.start();const start=performance.now();
  await new Promise(resolve=>{function tick(){const t=(performance.now()-start)/1000;if(t>=19){recorder.stop();resolve();return;}frame(t);requestAnimationFrame(tick);}requestAnimationFrame(tick);});await done;
  const blob=new Blob(chunks,{type:mime});const buffer=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<buffer.length;i+=32768)binary+=String.fromCharCode(...buffer.subarray(i,i+32768));return{base64:btoa(binary),mime,stills};
 });
 const ext=result.mime.includes('mp4')?'mp4':'webm';await writeFile(new URL(`Streets-of-SaranFou-promo-19s.${ext}`,out),Buffer.from(result.base64,'base64'));
 for(let i=0;i<result.stills.length;i++)await writeFile(new URL(`shot-${i}.png`,out),Buffer.from(result.stills[i],'base64'));
 console.log(JSON.stringify({mime:result.mime,bytes:Buffer.from(result.base64,'base64').length}));
}finally{await browser.close();await server.close();}
