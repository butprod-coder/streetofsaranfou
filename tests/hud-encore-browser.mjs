import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
import { ENCORE_ELITES } from '../game/elite-encore-data.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await mkdir('test-results', { recursive: true });
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await assets.prepare(0);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const r = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 900; r.scale = 1;
    window.encoreQA = { assets, r, Simulation, canvas };
  });
  for (const key of Object.keys(ENCORE_ELITES)) {
    const result = await page.evaluate(key => {
      const { assets, r } = window.encoreQA, c = r.ctx; c.fillStyle = '#182d39'; c.fillRect(0, 0, 1280, 900);
      const image = assets.arcadeFrame(key).image, probe = document.createElement('canvas'); probe.width = image.width; probe.height = image.height;
      const p = probe.getContext('2d'); p.drawImage(image, 0, 0); const pixels = p.getImageData(0, 0, image.width, image.height).data;
      let clear = 0; for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) clear++;
      for (let i = 0; i < 12; i++) { r.arcadeSprite(key, 155 + i % 4 * 320, 240 + Math.floor(i / 4) * 295, i, 180); c.fillStyle = '#ffe2ac'; c.font = '14px monospace'; c.fillText(`${key} ${i}`, 90 + i % 4 * 320, 275 + Math.floor(i / 4) * 295); }
      return { width: image.width, height: image.height, clear: clear / (image.width * image.height) };
    }, key);
    assert.equal(result.width, 2048); assert.equal(result.height, 1536); assert.ok(result.clear > .4, key);
    await page.screenshot({ path: `test-results/encore-${key}.png` });
  }
  await page.evaluate(async () => {
    const { r, canvas, Simulation } = window.encoreQA;
    canvas.width = 1280; canvas.height = 720; r.scale = 1; canvas.style.cssText = 'position:absolute;left:0;top:50%;transform:translateY(-50%);width:100vw;height:auto;z-index:1;pointer-events:none'; document.querySelector('#app').append(canvas);
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active')); document.querySelector('#game-ui').classList.remove('hidden'); document.body.classList.add('playing');
    const sim = new Simulation(['karonux', 'gustavax'], 0, 31); sim.spawnWave(); sim.state.enemies = []; sim.state.props = []; sim.state.spawnQueue = [];
    for (const [i, kind] of ['elephant', 'transpalette', 'poids', 'rappeur'].entries()) sim.spawnEnemy(kind, { x: 180 + i * 290, y: 570 });
    sim.awardChapterTalent(); sim.state.events = []; r.reset(); r.draw(sim.state, .1); window.encoreQA.sim = sim;
  });
  await page.screenshot({ path: 'test-results/hud-duo.png' });
  await page.evaluate(async () => {
    const { ENEMIES } = await import('/game/data.js'), { r, sim } = window.encoreQA;
    const c = r.ctx, text = [], fillText = c.fillText.bind(c); c.fillText = (...args) => { text.push(args[0]); fillText(...args); };
    for (const kind of Object.keys(ENEMIES)) r.enemyBar({ kind, x: 640, y: 550, hp: 10, maxHp: 10 });
    c.fillText = fillText;
    if (text.length !== Object.keys(ENEMIES).length || text.some(t => !t || t.includes('undefined') || t.includes(' ·'))) throw Error('Missing enemy first name');
    for (const delay of [0, .3]) for (const [kind, atlas, cell] of [['plant', 'carnivore', 10], ['shotPut', 'poids', 9], ['encoreProjectile', 'rappeur', 9], ['encoreFX', 'elephant', 10]]) r.drawHazard({ kind, atlas, cell, delay, ttl: 1, flight: .7, x: 600, y: 550, fromX: 400, fromY: 470, vx: 100, facing: 1, activeAge: .1 }, 1);
    r.draw(sim.state, .1);
  });
  assert.equal(await page.locator('.special-caption').count(), 2);
  for (const kind of ['karonux', 'jualos', 'yanu', 'lorenzo', 'jo', 'kikor', 'gustavax']) {
    await page.evaluate(async kind => { const { renderEvolution } = await import('/game/evolution-ui.js'); renderEvolution(kind, null, () => {}); }, kind);
    assert.equal(await page.locator('.branch-icon svg').count(), 3);
  }
  await page.evaluate(async () => {
    const { renderPauseTalents } = await import('/game/evolution-ui.js'); renderPauseTalents(window.encoreQA.sim.state.players[0]);
    document.querySelector('#pause').classList.add('active'); window.encoreQA.canvas.style.display = 'none';
  });
  await page.screenshot({ path: 'test-results/hud-pause.png' });
  assert.equal(await page.locator('#pause-talents.has-points').count(), 1);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `test-results/hud-pause-${viewport.width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(async () => { document.querySelector('#pause').classList.remove('active'); document.querySelector('#evolution').classList.add('active'); const { renderEvolution } = await import('/game/evolution-ui.js'); renderEvolution('karonux', window.encoreQA.sim.state.players[0].progression, () => {}); });
  await page.screenshot({ path: 'test-results/hud-tree.png' });
  assert.deepEqual(errors, []); console.log('PASS 84 transparent elite cells, 14 branch icons, duo HUD, pause talent points, portrait/landscape layouts.');
} finally { await browser.close(); await server.close(); }
