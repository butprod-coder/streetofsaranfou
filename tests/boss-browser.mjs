import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await mkdir('test-results', { recursive: true });
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  const alpha = await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await assets.prepare(0);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} }); renderer.scale = 1; canvas.width = 1280; canvas.height = 720;
    const sim = new Simulation(['jo'], 0, 42); Object.assign(sim.state, { phase: 'fight', enemies: [], spawnQueue: [], props: [], stage: 5 });
    const e = sim.spawnEnemy('karonux', { boss: true, x: 820, y: 570, hp: 640, maxHp: 640, power: 20, bossPhase: 1, cooldown: 0, healUses: 0 });
    sim.state.players[0].x = 450; sim.state.players[0].y = 560;
    window.bossQA = { assets, renderer, sim, e };
    return ['bossKaronux', 'bossGolf'].map(key => {
      const image = assets.arcadeFrame(key).image, probe = document.createElement('canvas'); probe.width = image.width; probe.height = image.height;
      const ctx = probe.getContext('2d'); ctx.drawImage(image, 0, 0); const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      let clear = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) clear++;
      return { key, clear: clear / (image.width * image.height), rects: Array.from({ length: key === 'bossGolf' ? 4 : 16 }, (_, i) => assets.arcadeFrame(key, i).rect) };
    });
  });
  console.log(JSON.stringify(alpha));
  assert.ok(alpha[0].clear > .3);
  assert.ok(alpha[1].clear > .3);
  for (const pose of ['arrival', 'exit', 'combo', 'sleep-windup', 'sleep', 'smoke']) {
    await page.evaluate(pose => {
      const { renderer: r, sim, e } = window.bossQA;
      sim.state.time = 2; sim.state.events = []; sim.state.bossCinema = null; e.vehicle = false; e.pattern = null; e.action = 'idle';
      if (pose === 'arrival' || pose === 'exit') { e.vehicle = pose === 'arrival'; sim.startBossCinema(e, pose); sim.state.bossCinema.elapsed = 1.8; }
      else { const kind = pose.startsWith('sleep') ? 'sleep' : pose; e.pattern = { kind, elapsed: pose === 'sleep-windup' ? .6 : 1.4, windup: 1, active: 2.4, hit: pose !== 'sleep-windup', healing: kind === 'smoke' }; }
      r.reset(); r.draw(sim.state, .016);
    }, pose);
    await page.screenshot({ path: `test-results/boss-${pose}.png` });
  }
  assert.deepEqual(errors, []); console.log('PASS boss scenes render without browser errors');
} finally { await browser.close(); await server.close(); }
