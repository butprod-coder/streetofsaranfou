import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`); await page.waitForFunction(() => !!window.saranfou);
  await page.locator('[data-action="boss-lab"]').first().click(); await page.selectOption('#test-boss', '5');
  assert.match(await page.locator('#test-phase option[value="2"]').textContent(), /Commercial/);
  await page.selectOption('#test-phase', '2'); await page.click('[data-action="test-boss-play"]');
  await page.waitForFunction(() => window.saranfou.inspect().state?.hazards.some(e => e.kind === 'jualosCash'), null, { timeout: 60000 });

  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { createBossPractice } = await import('/game/boss-practice.js');
    const assets = new Assets(); await assets.prepare(5);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const r = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 720; r.scale = 1;
    window.jualosQA = { r, assets, createBossPractice };
  });
  for (const key of ['bossJualos', 'bossJualosSuit', 'bossJualosProps']) {
    const atlas = await page.evaluate(key => {
      const { assets } = window.jualosQA, image = assets.arcadeFrame(key).image, canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height; const c = canvas.getContext('2d'); c.drawImage(image, 0, 0);
      const pixels = c.getImageData(0, 0, image.width, image.height).data; let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
      return { alpha: transparent / (image.width * image.height), rects: Array.from({ length: key === 'bossJualos' ? 16 : key === 'bossJualosSuit' ? 12 : 4 }, (_, i) => assets.arcadeFrame(key, i).rect) };
    }, key);
    console.log(key, JSON.stringify(atlas)); assert.ok(atlas.alpha > .25); assert.ok(atlas.rects.every(r => r[2] > 30 && r[3] > 30));
  }
  await mkdir('test-results', { recursive: true });
  for (const pose of ['intro','idle','belly','impact','transform','commercial','cash','ground','slip','swing','slam','dead']) {
    await page.evaluate(pose => {
      const { r, createBossPractice } = window.jualosQA, sim = createBossPractice({ chapter: 5, cinema: pose === 'intro' });
      const e = sim.state.enemies[0], p = sim.state.players[0]; e.x = 860; e.y = 560; p.x = 440; p.y = 560;
      sim.state.time = 2; sim.state.events = [];
      if (pose === 'intro') sim.state.bossCinema.elapsed = 1.6;
      if (['belly','impact'].includes(pose)) e.pattern = {kind:'jualosBelly',elapsed:1,windup:1.25,hit:pose==='impact',beat:2};
      if (pose === 'transform') sim.beginJualosCommercial(e);
      if (['commercial','cash','ground','slip','swing','slam','dead'].includes(pose)) { e.commercial=true; e.bossPhase=2; e.enraged=true; }
      if (['cash','ground','slip'].includes(pose)) { e.pattern={kind:'jualosCash',hit:true}; sim.scatterJualosCash(e,{targetX:p.x,targetY:p.y}); for(const h of sim.state.hazards) if(pose!=='cash') h.delay=0; }
      if (pose === 'slip') { const h=sim.state.hazards[0]; p.x=h.x;p.y=h.y;p.invincible=0;sim.updateJualosCash(h);p.jualosSlip.elapsed=.5; }
      if (pose === 'swing') e.pattern={kind:'jualosBagSwing',hit:true};
      if (pose === 'slam') e.pattern={kind:'jualosBagSlam',hit:true};
      if (pose === 'dead') {e.hp=0;e.deadTime=.3;}
      sim.state.events=[]; r.reset(); r.draw(sim.state,.1);
    },pose);
    await page.screenshot({path:`test-results/jualos-${pose}.png`});
  }  assert.deepEqual(errors, []); console.log('PASS Jualos practice, cash gameplay, three transparent atlases and twelve rendered scenes.');
} finally { await browser.close(); await server.close(); }

