import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));let browser;
try {
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(`http://127.0.0.1:${server.server.address().port}`);
 const results=await page.evaluate(async()=>{
  const {Assets}=await import('/game/assets.js');const {arcadeUrl}=await import('/game/visuals.js');const a=new Assets();
  const keys=['nightBus','nightCart','nightElectric','nightVending'];await Promise.all(keys.map(k=>a.load(arcadeUrl(k))));
  document.body.innerHTML='<canvas id="preview" width="1280" height="900"></canvas>';document.body.style.margin='0';
  const c=document.querySelector('canvas').getContext('2d');c.fillStyle='#182939';c.fillRect(0,0,1280,900);c.font='bold 18px sans-serif';const out=[];
  for(let row=0;row<4;row++)for(let frame=0;frame<2;frame++){
   const f=a.arcadeFrame(keys[row],frame),[x,y,w,h]=f.rect,scale=Math.min(530/w,170/h),left=frame*640+40,top=row*220;
   c.fillStyle='#e4c691';c.fillText(keys[row]+' · état '+frame,left,top+25);c.fillStyle='#30495c';c.fillRect(left,top+38,550,176);c.drawImage(f.image,x,y,w,h,left+(550-w*scale)/2,top+210-h*scale,w*scale,h*scale);
   const probe=document.createElement('canvas');probe.width=f.image.width;probe.height=f.image.height;const ctx=probe.getContext('2d');ctx.drawImage(f.image,0,0);const d=ctx.getImageData(0,0,probe.width,probe.height).data;let transparent=0;for(let i=3;i<d.length;i+=4)if(d[i]===0)transparent++;
   out.push({key:keys[row],frame,rect:f.rect,clear:transparent/(d.length/4)});
  }return out;
 });
 assert.equal(results.length,8);assert.ok(results.every(r=>r.rect[2]>150&&r.rect[3]>150&&r.clear>.3));
 await page.screenshot({path:'test-results/night-sprites-preview.png'});console.log(JSON.stringify(results));
}finally{await browser?.close();await server.close();}
