import {chromium} from 'playwright';
import {createGameServer} from '../server/index.js';
import {writeFile} from 'node:fs/promises';
const s=createGameServer();await new Promise(r=>s.server.listen(0,'127.0.0.1',r));
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const p=await b.newPage();await p.goto(`http://127.0.0.1:${s.server.address().port}`);
await p.route('**/output/teaser-20s/*.mp4',route=>route.fulfill({path:'output/teaser-20s/Streets-of-SaranFou-Teaser-20s.mp4',contentType:'video/mp4'}));
const result=await p.evaluate(async()=>{
 const url='/output/teaser-20s/Streets-of-SaranFou-Teaser-20s.mp4',v=document.createElement('video');v.muted=true;v.src=URL.createObjectURL(await(await fetch(url)).blob());await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});
 const meta={duration:v.duration,width:v.videoWidth,height:v.videoHeight};
 v.currentTime=16;await new Promise(r=>v.onseeked=r);const c=document.createElement('canvas');c.width=1280;c.height=720;c.getContext('2d').drawImage(v,0,0);meta.frame=c.toDataURL().split(',')[1];
 const ctx=new AudioContext(),ab=await ctx.decodeAudioData(await(await fetch(url)).arrayBuffer());const d=ab.getChannelData(0);let sum=0,peak=0;for(const x of d){sum+=x*x;peak=Math.max(peak,Math.abs(x));}meta.audio={duration:ab.duration,channels:ab.numberOfChannels,rms:Math.sqrt(sum/d.length),peak};return meta;
});await writeFile('output/teaser-20s/export-check.png',Buffer.from(result.frame,'base64'));delete result.frame;console.log(JSON.stringify(result));await writeFile('output/teaser-20s/export-check.json',JSON.stringify(result,null,2));
}finally{await b.close();await s.close();}
