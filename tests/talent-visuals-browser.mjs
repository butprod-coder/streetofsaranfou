import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server=createGameServer();await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  const result=await page.evaluate(async()=>{
    const [{Assets},{Renderer},{Simulation},{TALENTS,TALENT_MILESTONES,applyProfile},{blankInput}]=await Promise.all([import('/game/assets.js'),import('/game/renderer.js'),import('/game/simulation.js'),import('/game/progression.js'),import('/game/data.js')]);
    const assets=new Assets();await assets.prepare(0);
    const sheet=document.createElement('canvas');sheet.width=1920;sheet.height=2520;const ctx=sheet.getContext('2d');
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const renderer=new Renderer(canvas,assets,{effect(){}});renderer.scale=1;renderer.hud=()=>{};renderer.reducedMotion=true;
    let count=0;
    for(const [row,kind] of Object.keys(TALENTS).entries())for(let branch=0;branch<3;branch++){
      const sim=new Simulation([kind,'jo'],0,99);sim.state.phase='fight';sim.state.chapterStory=false;sim.state.props=[];sim.state.spawnQueue=[];sim.state.enemies=[];
      const p=sim.state.players[0];p.x=500;p.y=550;applyProfile(p,{milestones:TALENT_MILESTONES,talents:TALENTS[kind].filter(n=>n.branchIndex===branch).map(n=>n.id)});p.rogueRhythm=3;p.rogueInstinctGauge=3;
      for(let i=0;i<4;i++)sim.spawnEnemy('remy',{x:600+i*70,y:490+i*35,hp:10000,maxHp:10000,cooldown:999,speed:0,invincible:0});
      p.energy=100;sim.activateSpecial(p);renderer.reset();
      const duration=kind==='karonux'&&branch>0?4:.55;
      for(let tick=0;tick<duration*60;tick++){
        const input={...blankInput(),punch:tick%30===0,kick:tick%30===15,x:tick%90<45?.2:-.2};
        sim.step([input,blankInput()]);renderer.draw(sim.state,1/60);
      }
      ctx.drawImage(canvas,branch*640,row*360,640,360);ctx.fillStyle='#08111eea';ctx.fillRect(branch*640,row*360,640,33);ctx.font='bold 17px sans-serif';ctx.fillStyle='#ffe0a1';ctx.fillText(`${kind} — ${TALENTS[kind][branch*5+4].name}`,branch*640+12,row*360+23);count++;
    }
    const preview=document.createElement('canvas');preview.width=960;preview.height=1260;preview.getContext('2d').drawImage(sheet,0,0,960,1260);
    return {count,png:sheet.toDataURL('image/png'),preview:preview.toDataURL('image/png')};
  });
  assert.equal(result.count,21);assert.deepEqual(errors,[]);await mkdir('test-results',{recursive:true});await writeFile('test-results/talent-ultimates.png',Buffer.from(result.png.split(',')[1],'base64'));
  await writeFile('test-results/talent-ultimates-preview.png',Buffer.from(result.preview.split(',')[1],'base64'));
  console.log('PASS: all 21 ultimates render with a partner and four opponents.');
} finally {await browser.close();await server.close();}
