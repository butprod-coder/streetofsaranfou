import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.waitForFunction(() => !!window.saranfou);
  await page.locator('[data-action="boss-lab"]').first().click(); await page.selectOption('#test-boss', '2');
  await page.check('#test-cinema'); await page.click('[data-action="test-boss-play"]');
  await page.waitForFunction(() => window.saranfou.inspect().state?.enemies[0]?.pattern?.kind === 'yanuTsunami', null, { timeout: 60000 });
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { createBossPractice } = await import('/game/boss-practice.js');
    const assets = new Assets(); await assets.prepare(2);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const r = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 720; r.scale = 1;
    window.yanuQA = { r, assets, createBossPractice };
  });
  for (const key of ['bossYanu', 'bossYanuWater']) {
    const atlas = await page.evaluate(key => {
      const { assets } = window.yanuQA, image = assets.arcadeFrame(key).image, canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height; const c = canvas.getContext('2d'); c.drawImage(image, 0, 0);
      const pixels = c.getImageData(0, 0, image.width, image.height).data; let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
      return { alpha: transparent / (image.width * image.height), rects: Array.from({ length: key === 'bossYanu' ? 16 : 6 }, (_, i) => assets.arcadeFrame(key, i).rect) };
    }, key);
    console.log(key, JSON.stringify(atlas)); assert.ok(atlas.alpha > .25, `${key}: transparency`); assert.ok(atlas.rects.every(r => r[2] > 30 && r[3] > 30));
  }
  await mkdir('test-results', { recursive: true });
  for (const pose of ['intro', 'idle', 'wave-warning', 'kayak', 'scream', 'transform', 'wolf', 'lunge', 'kick', 'dead']) {
    await page.evaluate(pose => {
      const { r, createBossPractice } = window.yanuQA, sim = createBossPractice({ chapter: 2, cinema: pose === 'intro' });
      const e = sim.state.enemies[0], p = sim.state.players[0]; e.x = 830; e.y = 560; p.x = 440; p.y = 560;
      sim.state.time = 2; sim.state.events = [];
      if (pose === 'intro') sim.state.bossCinema.elapsed = 1.3;
      if (['wave-warning', 'kayak'].includes(pose)) e.pattern = { kind: 'yanuTsunami', elapsed: pose === 'kayak' ? 1.5 : .7, windup: 1.3, active: 1.8, hit: pose === 'kayak' };
      if (['scream', 'transform', 'wolf', 'lunge'].includes(pose)) {
        e.pattern = { kind: 'yanuHowl', elapsed: 1.25 + ({ scream: .1, transform: .4, wolf: .7, lunge: 1.2 })[pose], windup: 1.25, active: 1.85, hit: true, lunging: pose === 'lunge', targetX: p.x, targetY: p.y };
        if (pose === 'scream') p.yanuFrozen = { owner: e.id, remaining: .5 };
      }
      if (pose === 'kick') e.pattern = { kind: 'yanuKick', elapsed: .8, windup: .65, active: .85, hit: true };
      if (pose === 'dead') { e.hp = 0; e.deadTime = .3; }
      r.reset(); r.draw(sim.state, .016);
    }, pose);
    await page.screenshot({ path: `test-results/yanu-${pose}.png` });
  }
  assert.deepEqual(errors, []); console.log('PASS Yanu practice, both transparent atlases and ten rendered scenes.');
} finally { await browser.close(); await server.close(); }
