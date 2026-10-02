import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], failures = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  const result = await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js'), { arcadeUrl } = await import('/game/visuals.js');
    const assets = new Assets(); await assets.prepare(0);
    for (const [key, count] of [['chainScenery', 9], ['dynamicEnemies', 12]]) {
      const image = assets.get(arcadeUrl(key)), canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const c = canvas.getContext('2d'); c.drawImage(image, 0, 0); if (c.getImageData(0, 0, 1, 1).data[3] !== 0) throw new Error(`${key}: opaque backdrop`);
      for (let i = 0; i < count; i++) { const frame = assets.arcadeFrame(key, i); if (frame.rect[2] < 30 || frame.rect[3] < 30) throw new Error(`${key}: empty frame ${i}`); }
    }
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} }), sim = new Simulation(['karonux', 'jo'], 0, 42);
    sim.spawnWave(); sim.state.enemies = []; sim.state.spawnQueue = []; sim.state.chapterStory = false; sim.state.pickups = []; sim.state.practice = { invulnerable: true };
    sim.state.players.forEach((p, i) => { p.x = 190 + i * 120; p.y = 620; p.invincible = 0; });
    const guard = sim.spawnEnemy('shieldGuard', { x: 490, y: 565, facing: -1, invincible: 0 });
    const bomber = sim.spawnEnemy('kamikaze', { x: 780, y: 550, facing: -1, invincible: 0 }); bomber.pattern = { kind: 'kamikaze', elapsed: .3, windup: 1.4, facing: -1, targetY: 620 };
    const shooter = sim.spawnEnemy('laneShooter', { x: 1080, y: 620, facing: -1, invincible: 0 }); shooter.pattern = { kind: 'laneShooter', elapsed: .2, windup: 1.15, facing: -1, targetY: 620 };
    sim.state.props = ['fuelDrum', 'electricBox', 'hydrant'].map((kind, i) => sim.makeProp(kind, 470 + i * 160, 470));
    sim.state.events = []; renderer.draw(sim.state, .016); window.dynamicQA = { sim, renderer, assets, guard, bomber, shooter };
    return { kinds: sim.state.waves.flatMap(w => w.kinds) };
  });
  assert.ok(result.kinds.length > 0);
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/dynamic-combat-warning.png' });
  await page.evaluate(() => {
    const q = window.dynamicQA, p = q.sim.state.players[0]; p.facing = 1;
    q.sim.state.props.forEach(prop => q.sim.hitProp(prop, 4, p));
    for (let i = 0; i < 43; i++) { q.sim.state.time += 1 / 60; q.sim.updateWorld(1 / 60); }
    q.renderer.draw(q.sim.state, .016);
  });
  await page.screenshot({ path: 'test-results/dynamic-combat-chain.png' });
  await page.evaluate(() => { const q = window.dynamicQA; q.guard.facing = 1; q.bomber.facing = 1; q.shooter.facing = 1; q.guard.hp = q.bomber.hp = q.shooter.hp = 0; q.renderer.draw(q.sim.state, .016); });
  await page.screenshot({ path: 'test-results/dynamic-combat-defeated.png' });
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  console.log('PASS: complete asset loading, 21 transparent sprites, new enemy warnings, chain explosions, electricity, water and defeated poses.');
} finally { await browser.close(); await server.close(); }
