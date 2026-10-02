import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], failures = []; page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
await mkdir('test-results', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.waitForFunction(() => window.saranfou);
  const metadata = await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await assets.prepare(0);
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720; canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} });
    const sim = new Simulation(['karonux', 'yanu'], 0, 42); sim.state.stage = 2; sim.enterStreet(); sim.spawnWave(); sim.state.chapterStory = false; sim.state.spawnQueue = [];
    sim.state.players.forEach((p, i) => { p.x = 310 + i * 135; p.y = 610; p.invincible = 0; });
    const bin = sim.makeProp('bin', 630, 520, { hp: 4, maxHp: 4, vx: 0 }); sim.state.props = [bin];
    sim.startTraffic(); renderer.draw(sim.state, .016); window.streetQA = { sim, renderer, assets, bin };
    const image = assets.get('/assets/shared/arcade/street-action-v1.png'), probe = document.createElement('canvas'); probe.width = image.width; probe.height = image.height;
    const ctx = probe.getContext('2d'); ctx.drawImage(image, 0, 0);
    return { alpha: ctx.getImageData(0, 0, 1, 1).data[3], frames: ['streetBin', 'streetCar'].map(key => Array.from({ length: 3 }, (_, i) => assets.arcadeFrame(key, i).rect)) };
  });
  assert.equal(metadata.alpha, 0, 'Atlas has real transparency');
  for (const frames of metadata.frames) for (const rect of frames) { assert.ok(rect[2] > 80); assert.ok(rect[3] > 80); assert.ok(rect[2] < 512); }
  await page.screenshot({ path: 'test-results/street-action-warning.png' });
  await page.evaluate(() => { const q = window.streetQA; q.sim.state.traffic.warning = 0; q.sim.state.traffic.x = 830; q.renderer.draw(q.sim.state, .016); });
  await page.screenshot({ path: 'test-results/street-action-car.png' });
  await page.evaluate(() => {
    const q = window.streetQA, enemy = q.sim.state.enemies[0], player = q.sim.state.players[0];
    enemy.x = 730; enemy.y = q.bin.y; enemy.invincible = 0; enemy.hp = 500; player.facing = 1;
    q.sim.launchBin(q.bin, player); for (let i = 0; i < 12; i++) q.sim.updateStreetAction(1 / 60);
    q.renderer.draw(q.sim.state, .016); q.heldAtImpact = q.renderer.impactHold > performance.now();
  });
  await page.screenshot({ path: 'test-results/street-action-impact.png' });
  assert.ok(await page.evaluate(() => window.streetQA.renderer.effects.some(e => e.type === 'impactRing')));
  const frozen = await page.evaluate(() => window.streetQA.heldAtImpact); assert.equal(frozen, true);
  await page.evaluate(() => { const q = window.streetQA; q.renderer.reducedMotion = true; q.renderer.impactHold = 0; q.sim.damage(q.sim.state.enemies[0], 5, q.sim.state.players[0], true); q.renderer.draw(q.sim.state, .016); });
  assert.equal(await page.evaluate(() => window.streetQA.renderer.impactHold), 0, 'Reduced motion suppresses visual hit pause');
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  console.log('PASS street visuals: transparent complete sprite cells, telegraph, moving car, bin collision impacts and reduced motion; no browser errors.');
} finally { await browser.close(); await server.close(); }
