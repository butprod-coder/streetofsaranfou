import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
import { HERO_IDS } from '../game/hero-sprites.js';

const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 1040 } }), errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await mkdir('test-results', { recursive: true });
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await assets.prepare(0);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} });
    window.heroQA = { assets, renderer, Simulation };
  });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  for (const key of [...HERO_IDS.map(id => `hero_${id}`), 'creation', 'golf']) {
    const result = await page.evaluate(key => {
      const { assets, renderer: r } = window.heroQA, c = r.ctx;
      r.canvas.width = 1280; r.canvas.height = 1040; r.scale = 1;
      c.fillStyle = '#182d39'; c.fillRect(0, 0, 1280, 1040);
      const image = assets.arcadeFrame(key).image, count = key === 'golf' ? 3 : key === 'creation' ? 12 : 16;
      const probe = document.createElement('canvas'); probe.width = image.width; probe.height = image.height;
      if (key !== 'golf' && (image.width !== 2048 || image.height !== count / 4 * 512)) throw Error(`Unpacked atlas ${key}`);
      const p = probe.getContext('2d'); p.drawImage(image, 0, 0); const pixels = p.getImageData(0, 0, image.width, image.height).data;
      let clear = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) clear++;
      const rects = Array.from({ length: count }, (_, cell) => {
        const frame = assets.arcadeFrame(key, cell), [sx, sy, sw, sh] = frame.rect;
        if (!(sw > 8 && sh > 8)) throw Error(`Empty crop ${key}/${cell}`);
        const left = cell % 4 * 512, top = Math.floor(cell / 4) * 512;
        if (key !== 'golf' && (sx <= left + 8 || sy <= top + 8 || sx + sw >= left + 504 || sy + sh >= top + 504)) throw Error(`Missing gutter ${key}/${cell}`);
        r.arcadeSprite(key, 160 + cell % 4 * 320, 225 + Math.floor(cell / 4) * 260, cell, key === 'golf' ? 100 : 175);
        c.fillStyle = '#ffe1a4'; c.font = '14px monospace'; c.fillText(`${key} · ${cell}`, 35 + cell % 4 * 320, 250 + Math.floor(cell / 4) * 260);
        return frame.rect;
      });
      return { clear: clear / (image.width * image.height), rects };
    }, key);
    assert.ok(result.clear > .5, `${key} needs real transparency`);
    await page.screenshot({ path: `test-results/${key}-atlas.png` });
    console.log(key, JSON.stringify(result));
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  for (const [kind, seconds] of [...HERO_IDS.map(id => [id, 0]), ['karonux', .8], ['karonux', 1.4], ['karonux', 2.1], ['kikor', .4], ['kikor', .75], ['kikor', 1.2], ['gustavax', 1]]) {
    await page.evaluate(({kind, seconds}) => {
      const { renderer: r, Simulation } = window.heroQA; r.canvas.width = 1280; r.canvas.height = 720; r.scale = 1;
      const sim = new Simulation([kind], 0, 42); sim.spawnWave(); sim.state.props = []; sim.state.spawnQueue = []; sim.state.enemies = [];
      const p = sim.state.players[0]; p.x = 420; p.y = 550; p.invincible = 999;
      sim.spawnEnemy('remy', { x: 730, y: 550, cooldown: 999, speed: 0, hp: 10000 });
      if (seconds) sim.activateSpecial(p);
      for (let i = 0; i < seconds * 60; i++) sim.step();
      r.reset(); r.draw(sim.state, .016);
    }, {kind, seconds});
    await page.screenshot({ path: `test-results/hero-combat-${kind}-${seconds}.png` });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 127 poses, real alpha, margins, seven heroes, Golf and painting combat renders.');
} finally { await browser.close(); await server.close(); }
