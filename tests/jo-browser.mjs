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
  await page.locator('[data-action="boss-lab"]').first().click(); await page.selectOption('#test-boss', '4');
  assert.match(await page.locator('#test-phase option[value="2"]').textContent(), /30 transpalettes/);
  await page.selectOption('#test-phase', '2'); await page.click('[data-action="test-boss-play"]');
  await page.waitForFunction(() => window.saranfou.inspect().state?.enemies.some(e => e.joPallet && e.delay <= 0), null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.saranfou.inspect().state.enemies[0].pattern.kind), 'joChannel');
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { createBossPractice } = await import('/game/boss-practice.js');
    const assets = new Assets(); await assets.prepare(4);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const r = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 720; r.scale = 1;
    window.joQA = { r, assets, createBossPractice };
  });
  for (const key of ['bossJo', 'bossJoProps']) {
    const atlas = await page.evaluate(key => {
      const { assets } = window.joQA, image = assets.arcadeFrame(key).image, canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height; const c = canvas.getContext('2d'); c.drawImage(image, 0, 0);
      const pixels = c.getImageData(0, 0, image.width, image.height).data; let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
      return { alpha: transparent / (image.width * image.height), rects: Array.from({ length: key === 'bossJo' ? 16 : 6 }, (_, i) => assets.arcadeFrame(key, i).rect) };
    }, key);
    console.log(key, JSON.stringify(atlas)); assert.ok(atlas.alpha > .25); assert.ok(atlas.rects.every(r => r[2] > 30 && r[3] > 30));
  }
  await mkdir('test-results', { recursive: true });
  for (const pose of ['intro', 'idle', 'windup', 'long-arm', 'mma', 'knee', 'channel', 'traffic', 'wreck', 'opening', 'hurt', 'dead']) {
    await page.evaluate(pose => {
      const { r, createBossPractice } = window.joQA, sim = createBossPractice({ chapter: 4, cinema: pose === 'intro' });
      const e = sim.state.enemies[0], p = sim.state.players[0]; e.x = 1030; e.y = 560; p.x = 440; p.y = 560;
      sim.state.time = 2; sim.state.events = [];
      if (pose === 'intro') sim.state.bossCinema.elapsed = 1.6;
      if (['windup', 'long-arm'].includes(pose)) e.pattern = { kind: 'joStretch', elapsed: pose === 'windup' ? .5 : 1, windup: .95, active: .5, hit: pose === 'long-arm' };
      if (pose === 'mma') e.pattern = { kind: 'joMMA', elapsed: .8, windup: .5, hit: true, beat: 3 };
      if (pose === 'knee') e.pattern = { kind: 'joRush', elapsed: .8, windup: .7, hit: true };
      if (['channel', 'traffic', 'wreck'].includes(pose)) {
        e.pattern = { kind: 'joChannel', elapsed: pose === 'channel' ? .6 : 3, windup: 1.25, active: 5.4, hit: pose !== 'channel', safeLane: 2, waves: 0 }; e.enraged = true;
        if (pose !== 'channel') for (let i = 0; i < 4; i++) sim.spawnJoPalletWave(e, e.pattern);
        for (const [i, a] of sim.state.enemies.filter(a => a.joPallet).entries()) { a.x = 135 + Math.floor(i / 3) * 245; a.delay = i < 3 ? .5 : 0; }
        if (pose === 'wreck') { const a = sim.state.enemies.find(a => a.joPallet); a.x = 520; a.y = 600; a.hp = 0; a.deadTime = .2; a.delay = 0; }
      }
      if (pose === 'opening') e.recovering = 2;
      if (pose === 'hurt') e.stun = .2;
      if (pose === 'dead') { e.hp = 0; e.deadTime = .3; }
      sim.state.events = []; r.reset(); r.draw(sim.state, .1);
    }, pose);
    await page.screenshot({ path: `test-results/jo-${pose}.png` });
  }
  assert.deepEqual(errors, []); console.log('PASS Jo phase selector, channel/pallet gameplay, two transparent atlases and twelve rendered scenes.');
} finally { await browser.close(); await server.close(); }
