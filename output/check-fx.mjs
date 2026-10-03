import {chromium} from 'playwright';
import {createGameServer} from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.server.address().port}`);console.log(await page.evaluate(async()=>{
 const img=new Image();img.src='/assets/shared/arcade/talent-upgrade-fx.png';await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0;for(let i=3;i<d.length;i+=4)if(d[i]===0)transparent++;return {width:c.width,height:c.height,transparent:transparent/(c.width*c.height),cornerAlpha:d[3]};
}));}finally{await browser.close();await server.close();}
