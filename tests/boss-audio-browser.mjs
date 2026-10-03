import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createGameServer} from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 const levels=await page.evaluate(async()=>{
  const {Audio}=await import('/game/audio.js');const levels=[];
  for(const event of [{type:'bossAction',style:0,kind:'impact'},{type:'bossAction',style:1,kind:'impact'},{type:'bossAction',style:2,kind:'impact'},{type:'bossAction',style:1,kind:'prepare'},...['karonux','kikor','yanu','lorenzo','jo','jualos','gustavax'].map(kind=>({type:'ko',boss:true,kind}))]){
   const ctx=new OfflineAudioContext(1,44100*2,44100),audio=new Audio();audio.context=ctx;audio.effectsBus=ctx.createGain();audio.effectsBus.connect(ctx.destination);audio.noise=ctx.createBuffer(1,44100,44100);const data=audio.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.sin(i*87.19);
   audio.effect(event);const buffer=await ctx.startRendering();let power=0;for(const sample of buffer.getChannelData(0))power+=sample*sample;levels.push(power);
  }return levels;
 });assert.equal(levels.length,11);assert.ok(levels.every(v=>v>1&&Number.isFinite(v)));console.log('PASS: three boss impacts, attack preparation and seven death groans produce valid audio.');
}finally{await browser.close();await server.close();}
