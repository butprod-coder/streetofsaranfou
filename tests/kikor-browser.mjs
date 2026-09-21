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
  await page.locator('[data-action="boss-lab"]').first().click(); await page.selectOption('#test-boss', '1');
  await page.click('[data-action="test-boss-play"]');
  await page.waitForFunction(() => window.saranfou.inspect().state?.enemies.some(e => e.kikorCreation), null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.saranfou.inspect().state.enemies[0].shielded), true);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { createBossPractice } = await import('/game/boss-practice.js');
    const assets = new Assets(); await assets.prepare(1);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const r = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 720; r.scale = 1;
    window.kikorQA = { r, assets, createBossPractice };
  });
  const atlas = await page.evaluate(() => {
    const { assets } = window.kikorQA, image = assets.arcadeFrame('bossKikor').image, canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height; const c = canvas.getContext('2d'); c.drawImage(image, 0, 0);
    const pixels = c.getImageData(0, 0, image.width, image.height).data; let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
    return { alpha: transparent / (image.width * image.height), rects: Array.from({ length: 16 }, (_, i) => assets.arcadeFrame('bossKikor', i).rect) };
  });
  console.log(JSON.stringify(atlas)); assert.ok(atlas.alpha > .25); assert.ok(atlas.rects.every(r => r[2] > 30 && r[3] > 30));
  await mkdir('test-results', { recursive: true });
  for (const pose of ['intro', 'paint', 'shield', 'transform', 'hunt', 'grip', 'hurt']) {
    await page.evaluate(pose => {
      const { r, createBossPractice } = window.kikorQA, sim = createBossPractice({ chapter: 1, cinema: pose === 'intro' });
      const e = sim.state.enemies[0], p = sim.state.players[0]; e.x = 830; e.y = 560; p.x = 440; p.y = 560;
      sim.state.time = 2; sim.state.events = [];
      if (pose === 'intro') sim.state.bossCinema.elapsed = 1.5;
      if (pose === 'paint') e.pattern = { kind: 'kikorPaint', elapsed: .6, windup: 1.3, active: .5 };
      if (pose === 'shield') { sim.spawnEnemy('creation', { owner: e.id, kikorCreation: true, x: 660, y: 580, hp: 70, maxHp: 70 }); e.shielded = true; }
      if (['transform', 'hunt', 'grip'].includes(pose)) e.pattern = { kind: 'kikorHunt', elapsed: pose === 'transform' ? .8 : 1.6, windup: 1.2, active: 4.2, hit: pose !== 'transform', lunging: pose === 'hunt' };
      if (pose === 'grip') { e.kikorGrip = { victim: p.id, elapsed: .8, nextDrain: 1 }; p.caughtBy = e.id; p.x = e.x - 38; p.y = e.y + 2; p.action = 'hurt'; p.escapePresses = 2; }
      if (pose === 'hurt') { e.stun = 1; e.recovering = 2; }
      r.reset(); r.draw(sim.state, .016);
    }, pose);
    await page.screenshot({ path: `test-results/kikor-${pose}.png` });
  }
  assert.deepEqual(errors, []); console.log('PASS Kikor practice, shield, atlas alpha and seven rendered scenes.');
} finally { await browser.close(); await server.close(); }
