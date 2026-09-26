import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
const server=createGameServer(); await new Promise(r=>server.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true, executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.waitForFunction(()=>window.saranfou);
  const result=await page.evaluate(async()=>{
    const {Assets}=await import('/game/assets.js'),{Renderer}=await import('/game/renderer.js');
    const {Simulation}=await import('/game/simulation.js'),{applyProfile}=await import('/game/progression.js');
    const {GUSTAVAX_BRANCHES}=await import('/game/gustavax-talents.js');
    const {TRANSFORMATION_MILESTONES}=await import('/game/transformation-rules.js');
    const {renderEvolution}=await import('/game/evolution-ui.js');
    const assets=new Assets();
    await Promise.all(["demon","boss","wrestler","minions","fx"].map(name=>assets.load(`/assets/heroes/talents/gustavax/${name}.png`)));
    const canvas=document.createElement('canvas');canvas.style='position:fixed;inset:0;width:1280px;height:720px;z-index:99999;background:#162130';document.body.append(canvas);
    const renderer=new Renderer(canvas,assets,{effect(){}});renderer.ctx.fillStyle='#162130';renderer.ctx.fillRect(0,0,canvas.width,canvas.height);
    const stats=[];
    for(let branch=0;branch<3;branch++)for(const rank of [1,6]){
      const sim=new Simulation(['gustavax']),p=sim.state.players[0];
      applyProfile(p,{milestones:TRANSFORMATION_MILESTONES,talents:GUSTAVAX_BRANCHES[branch].nodes.slice(0,rank).map(n=>n.id)});
      p.energy=100;sim.activateSpecial(p);p.specialState.pose=branch===0?0:branch===1?3:2;p.x=240+branch*390;p.y=rank===1?300:620;
      renderer.actor(p,sim.state,0,0);
      const key=["gustavaxDemon","gustavaxBossForm","gustavaxWrestler"][branch];
      for(let frame=0;frame<16;frame++){const a=assets.arcadeFrame(key,frame);if(a.rect[2]<10||a.rect[3]<10)throw Error(`${key}/${frame} empty`);}
    }
    for(const key of ['gustavaxMinions','gustavaxFX'])for(let frame=0;frame<16;frame++){const a=assets.arcadeFrame(key,frame);if(a.rect[2]<10||a.rect[3]<10)throw Error(key+'/'+frame+' empty');}
    for(const image of assets.images.values()){
      const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      const data=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)transparent++;
      stats.push({width:c.width,height:c.height,transparent:transparent/(c.width*c.height)});
    }
    window.gustavaxQA={canvas,renderEvolution,profile:{milestones:TRANSFORMATION_MILESTONES,talents:[GUSTAVAX_BRANCHES[1].nodes[0].id]}};
    return stats;
  });
  assert.ok(result.every(s=>s.transparent>.2));
  await page.screenshot({path:'test-results/gustavax-transformations.png'});
  await page.evaluate(()=>{window.gustavaxQA.canvas.remove();document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));document.querySelector('#evolution').classList.add('active');window.gustavaxQA.renderEvolution('gustavax',window.gustavaxQA.profile,()=>{});});
  assert.equal(await page.locator('.talent-node').count(),18);assert.equal(await page.locator('.branch-disabled').count(),2);assert.equal(await page.locator('.talent-node.available').count(),1);
  await page.screenshot({path:'test-results/gustavax-talents-lock.png'});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('Browser QA passed: six forms, 80 nonempty sprite frames, five alpha atlases, 18 talents, branch lock, mobile.',result);
}finally{await browser.close();await new Promise(r=>server.server.close(r));}
