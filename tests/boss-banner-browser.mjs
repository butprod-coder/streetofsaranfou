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
  for (let chapter = 0; chapter < 6; chapter++) {
    for (const elapsed of [.25, 2, 4.55]) {
      await page.evaluate(async ({chapter,elapsed}) => {
        const {r,assets,createBossPractice}=window.jualosQA; await assets.prepare(chapter);
        const sim=createBossPractice({chapter,cinema:true});sim.state.time=elapsed;sim.state.bossCinema.elapsed=elapsed;sim.state.events=[];
        r.reset();r.draw(sim.state,.1);
      },{chapter,elapsed});
      await page.screenshot({path:`test-results/boss-banner-${chapter}-${elapsed}.png`});
    }
  }  assert.deepEqual(errors, []); console.log('PASS six boss banners: entry, centered hold and exit.');
} finally { await browser.close(); await server.close(); }


