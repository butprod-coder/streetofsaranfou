import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer();
await new Promise(resolve => server.server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('test-results', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js');
    const { Renderer } = await import('/game/renderer.js');
    const { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await assets.prepare(0);
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} });
    canvas.width = 1280; canvas.height = 900; renderer.scale = 1;
    window.streetQA = { assets, canvas, renderer, Simulation };
  });
  for (const kind of ['albero', 'oliver', 'titou', 'pichoff', 'cedric']) {
    const result = await page.evaluate(kind => {
      const { assets, renderer: r } = window.streetQA, c = r.ctx, key = `street_${kind}`;
      const source = assets.arcadeFrame(key).image;
      const probe = document.createElement('canvas'); probe.width = source.width; probe.height = source.height;
      const ctx = probe.getContext('2d'); ctx.drawImage(source, 0, 0);
      const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
      let transparent = 0; for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
      c.fillStyle = '#192838'; c.fillRect(0, 0, 1280, 900);
      const rects = [];
      for (let cell = 0; cell < 12; cell++) {
        const x = 160 + cell % 4 * 320, y = 245 + Math.floor(cell / 4) * 295;
        if (cell === 9 || cell === 10) r.classicFX(key, cell, x, y - 80, 190);
        else r.arcadeSprite(key, x, y, cell, 220);
        c.fillStyle = '#ffe2ac'; c.font = '14px monospace'; c.textAlign = 'center'; c.fillText(`${kind} · ${cell}`, x, y + 22);
        rects.push(assets.arcadeFrame(key, cell).rect);
      }
      return { transparent: transparent / (source.width * source.height), rects };
    }, kind);
    assert.ok(result.transparent > .35, `${kind}: genuine alpha`);
    assert.ok(result.rects.every(r => r[2] > 20 && r[3] > 20), `${kind}: no empty cells`);
    assert.notDeepEqual(result.rects[8], result.rects[9], `${kind}: projectile is distinct from actor`);
    await page.screenshot({ path: `test-results/street-${kind}-atlas.png` });
    console.log(kind, JSON.stringify(result.rects));
  }
  const poses = await page.evaluate(() => {
    const { renderer: r, Simulation } = window.streetQA;
    const calls = [], sprite = r.arcadeSprite.bind(r);
    r.arcadeSprite = (key, x, y, cell) => calls.push([key, cell]);
    for (const [kind, pattern] of [['albero', 'megaphone'], ['oliver', 'tacoVolley'], ['titou', 'huntingDog'], ['pichoff', 'fastTalk'], ['cedric', 'puddle']]) {
      const sim = new Simulation(['karonux'], 0, 7), e = sim.spawnEnemy(kind);
      for (const hit of [false, true]) r.drawStreetEnemy({ ...e, pattern: { kind: pattern, hit } }, sim.state);
    }
    r.arcadeSprite = sprite;
    return calls;
  });
  assert.deepEqual(poses.map(p => p[1]), [7, 8, 7, 8, 7, 8, 7, 8, 7, 8]);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => {
    const { renderer: r, canvas, Simulation } = window.streetQA;
    canvas.width = 1280; canvas.height = 720; r.scale = 1;
    const sim = new Simulation(['karonux'], 0, 7);
    Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], decor: [], pickups: [], events: [], spawnQueue: [] });
    sim.state.players[0].x = 80; sim.state.players[0].y = 630;
    for (const [i, kind] of ['albero', 'oliver', 'titou', 'pichoff', 'cedric'].entries()) {
      sim.spawnEnemy(kind, { x: 145 + i * 245, y: 565, invincible: 0, facing: 1 });
    }
    sim.state.events = []; r.draw(sim.state, .01);
    for (const h of [
      { kind: 'streetProjectile', atlas: 'oliver', cell: 9, x: 405, y: 620, vx: 100 },
      { kind: 'huntingDog', atlas: 'titou', x: 660, y: 615, vx: 100 },
      { kind: 'streetProjectile', atlas: 'pichoff', cell: 9, x: 900, y: 620, vx: 100 },
      { kind: 'streetPuddle', atlas: 'cedric', x: 1120, y: 615, radius: 48 },
    ]) r.drawHazard({ ttl: 2, delay: 0, activeAge: .3, facing: 1, ...h }, 0);
  });
  await page.screenshot({ path: 'test-results/street-enemies-final.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: five PNG atlases, 60 cells, alpha, signature poses and in-game FX.');
} finally { await browser.close(); await server.close(); }
