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
  await page.locator('[data-action="boss-lab"]').first().click(); await page.selectOption('#test-boss', '3');
  assert.equal(await page.locator('#test-phase option[value="3"]').count(), 1);
  await page.selectOption('#test-phase', '2'); await page.click('[data-action="test-boss-play"]');
  await page.waitForFunction(() => window.saranfou.inspect().state?.enemies.some(e => e.lorenzoMinion), null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.saranfou.inspect().state.enemies[0].sofa.landed), true);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { createBossPractice } = await import('/game/boss-practice.js');
    const assets = new Assets(); await assets.prepare(3);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const r = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 720; r.scale = 1;
    window.lorenzoQA = { r, assets, createBossPractice };
  });
  for (const key of ['bossLorenzo', 'bossLorenzoProps']) {
    const atlas = await page.evaluate(key => {
      const { assets } = window.lorenzoQA, image = assets.arcadeFrame(key).image, canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height; const c = canvas.getContext('2d'); c.drawImage(image, 0, 0);
      const pixels = c.getImageData(0, 0, image.width, image.height).data; let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
      return { alpha: transparent / (image.width * image.height), rects: Array.from({ length: key === 'bossLorenzo' ? 16 : 6 }, (_, i) => assets.arcadeFrame(key, i).rect) };
    }, key);
    console.log(key, JSON.stringify(atlas)); assert.ok(atlas.alpha > .25); assert.ok(atlas.rects.every(r => r[2] > 30 && r[3] > 30));
  }
  await mkdir('test-results', { recursive: true });
  for (const pose of ['intro', 'idle', 'cigarette', 'ring', 'jump', 'delivery', 'seated', 'damaged', 'ejected', 'rage', 'kick', 'dead']) {
    await page.evaluate(pose => {
      const { r, createBossPractice } = window.lorenzoQA, sim = createBossPractice({ chapter: 3, cinema: pose === 'intro' });
      const e = sim.state.enemies[0], p = sim.state.players[0]; e.x = 850; e.y = 560; p.x = 440; p.y = 560;
      sim.state.time = 2; sim.state.events = [];
      if (pose === 'intro') sim.state.bossCinema.elapsed = 1.6;
      if (['cigarette', 'ring', 'jump'].includes(pose)) {
        e.pattern = { kind: 'lorenzoCigarette', elapsed: 1.3, windup: 1.2, active: 1, hit: true };
        const h = sim.hazard(e, { kind: 'lorenzoRing', x: 560, y: 560, radius: 160, thickness: 16, delay: pose === 'cigarette' ? .3 : 0, flight: .65, ttl: 3, fromX: e.x, fromY: e.y - 180 });
        if (pose === 'jump') { p.x = h.x - h.radius; p.z = 75; p.action = 'jump'; }
      }
      if (['delivery', 'seated', 'damaged', 'ejected', 'rage'].includes(pose)) {
        sim.beginLorenzoSofa(e); e.pattern.elapsed = .7;
        if (pose !== 'delivery') { e.sofa.landed = true; e.pattern = null; sim.lorenzoReinforcements(e); }
        if (pose === 'damaged') e.sofa.hp = 60;
        if (['ejected', 'rage'].includes(pose)) { sim.breakLorenzoSofa(e); e.pattern.elapsed = pose === 'rage' ? .9 : .2; sim.updateLorenzo(e, .01); }
      }
      if (pose === 'kick') e.pattern = { kind: 'lorenzoKick', elapsed: .8, windup: .7, active: .85, hit: true };
      if (pose === 'dead') { e.hp = 0; e.deadTime = .3; }
      sim.state.events = []; r.reset(); r.draw(sim.state, .1);
    }, pose);
    await page.screenshot({ path: `test-results/lorenzo-${pose}.png` });
  }
  assert.deepEqual(errors, []); console.log('PASS Lorenzo phase selector, sofa reinforcements, two transparent atlases and twelve rendered scenes.');
} finally { await browser.close(); await server.close(); }
