import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer();
await new Promise(resolve => server.server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 1120 } }), errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('test-results', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js');
    const { Renderer } = await import('/game/renderer.js');
    const { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await Promise.all(['lorenzo_raclette','karonux_om','orelsan_om','gustavax_om','michelle_police','herve_mbk'].map(kind => assets.load(`/assets/enemies/street/${kind}.png`)));
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} });
    canvas.width = 1280; canvas.height = 1120; renderer.scale = 1;
    window.streetQA = { assets, canvas, renderer, Simulation };
  });
  for (const kind of ['lorenzo_raclette','karonux_om','orelsan_om','gustavax_om','michelle_police','herve_mbk']) {
    const result = await page.evaluate(kind => {
      const { assets, renderer: r } = window.streetQA, c = r.ctx, key = `street_${kind}`;
      const source = assets.arcadeFrame(key).image;
      const probe = document.createElement('canvas'); probe.width = source.width; probe.height = source.height;
      const ctx = probe.getContext('2d'); ctx.drawImage(source, 0, 0);
      const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
      let transparent = 0; for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
      c.fillStyle = '#192838'; c.fillRect(0, 0, 1280, 1120);
      const rects = [];
      for (let cell = 0; cell < 16; cell++) {
        const x = 160 + cell % 4 * 320, y = 225 + Math.floor(cell / 4) * 270;
        if (cell >= 12) r.classicFX(key, cell, x, y - 80, 190);
        else r.arcadeSprite(key, x, y, cell, 190);
        c.fillStyle = '#ffe2ac'; c.font = '14px monospace'; c.textAlign = 'center'; c.fillText(`${kind} · ${cell}`, x, y + 22);
        rects.push(assets.arcadeFrame(key, cell).rect);
      }
      return { transparent: transparent / (source.width * source.height), rects };
    }, kind);
    assert.ok(result.transparent > .35, `${kind}: genuine alpha`);
    assert.ok(result.rects.every(r => r[2] > 20 && r[3] > 20), `${kind}: no empty cells`);
    assert.notDeepEqual(result.rects[0], result.rects[12], `${kind}: projectile is distinct from actor`);
    await page.screenshot({ path: `test-results/street-${kind}-atlas.png` });
    console.log(kind, JSON.stringify(result.rects));
  }
  const sequences = await page.evaluate(() => {
    const {renderer:r, Simulation} = window.streetQA, result = {};
    const original = r.arcadeSprite;
    for (const [kind, patterns] of Object.entries({lorenzo_raclette:['raclettePan','cheeseSplash'],karonux_om:['barrierThrow','megaphoneCharge'],orelsan_om:['barrierThrow','megaphoneCharge'],gustavax_om:['barrierThrow','megaphoneCharge'],michelle_police:['pistolShot'],herve_mbk:['mbkCharge']})) {
      const sim = new Simulation(['karonux'],0,7), enemy = sim.spawnEnemy(kind);
      const cells = []; r.arcadeSprite = (key,x,y,cell) => cells.push(cell);
      for (const time of [0,.125]) r.drawStreetEnemy({...enemy,action:'walk',stun:0}, {...sim.state,time});
      for (const pattern of patterns) for (const hit of [false,true]) r.drawStreetEnemy({...enemy,stun:0,pattern:{kind:pattern,hit}},sim.state);
      r.drawStreetEnemy({...enemy,stun:1},sim.state); r.drawStreetEnemy({...enemy,hp:0},sim.state);
      result[kind] = cells;
    }
    r.arcadeSprite = original; return result;
  });
  assert.deepEqual(sequences, {lorenzo_raclette:[0,1,2,3,4,5,6,7],karonux_om:[1,2,4,5,3,9,6,7],orelsan_om:[1,2,4,5,3,9,6,7],gustavax_om:[1,2,4,5,3,8,6,7],michelle_police:[1,2,3,4,5,7],herve_mbk:[1,2,4,6,8,8]});
  assert.deepEqual(errors, []);
  console.log('PASS: six recent enemy atlases, 96 frames rendered.');
} finally { await browser.close(); await server.close(); }
