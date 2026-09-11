import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
import { CLASSIC_SPRITES } from '../game/classic-sprites.js';

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
    const renderer = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 900; renderer.scale = 1;
    window.classicQA = { assets, renderer, Simulation };
  });
  for (const key of Object.keys(CLASSIC_SPRITES)) {
    const result = await page.evaluate(key => {
      const { assets, renderer: r } = window.classicQA, c = r.ctx;
      c.fillStyle = '#182d39'; c.fillRect(0, 0, 1280, 900);
      const image = assets.arcadeFrame(key).image, probe = document.createElement('canvas'); probe.width = image.width; probe.height = image.height;
      if (image.width !== 2048 || image.height !== 1536) throw Error(`Unpacked atlas ${key}`);
      const p = probe.getContext('2d'); p.drawImage(image, 0, 0); const pixels = p.getImageData(0, 0, image.width, image.height).data;
      let clear = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) clear++;
      const rects = Array.from({ length: 12 }, (_, cell) => {
        const frame = assets.arcadeFrame(key, cell), [sx, sy, sw, sh] = frame.rect;
        if (!(sw > 8 && sh > 8 && sx >= 0 && sy >= 0 && sx + sw <= image.width && sy + sh <= image.height)) throw Error(`Invalid crop ${key}/${cell}`);
        const left = cell % 4 * 512, top = Math.floor(cell / 4) * 512;
        if (sx <= left + 8 || sy <= top + 8 || sx + sw >= left + 504 || sy + sh >= top + 504) throw Error(`Missing gutter ${key}/${cell}`);
        r.arcadeSprite(key, 160 + cell % 4 * 320, 240 + Math.floor(cell / 4) * 295, cell, 170);
        c.fillStyle = '#ffe1a4'; c.font = '14px monospace'; c.fillText(`${key} · ${cell}`, 35 + cell % 4 * 320, 275 + Math.floor(cell / 4) * 295);
        return frame.rect;
      });
      return { clear: clear / (image.width * image.height), rects };
    }, key);
    assert.ok(result.clear > .25, `${key} requires real alpha, got ${result.clear}`);
    await page.screenshot({ path: `test-results/classic-atlas-${key}.png` });
    console.log(key, JSON.stringify(result));
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  // Let the resize event settle before drawing the first fixed combat frame.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  for (const key of Object.keys(CLASSIC_SPRITES)) {
    await page.evaluate(key => {
      const { renderer: r, Simulation } = window.classicQA; r.canvas.width = 1280; r.canvas.height = 720; r.scale = 1;
      const sim = new Simulation(['gustavax'], 0, 42); sim.spawnWave(); sim.state.enemies = []; sim.state.props = []; sim.state.spawnQueue = [];
      const p = sim.state.players[0]; p.x = 450; p.y = 550; p.invincible = 999;
      const e = sim.spawnEnemy(key, { x: 790, y: 550, cooldown: 999, invincible: 0 }); e.targetX = p.x; e.targetY = p.y; e.facing = -1;
      sim.startAttack(e, 'special');
      const ticks = key === 'papy_jala' ? 75 : key === 'charlingals' ? 92 : 64;
      for (let i = 0; i < ticks; i++) sim.step();
      r.reset(); r.draw(sim.state, .016);
    }, key);
    await page.screenshot({ path: `test-results/classic-combat-${key}.png` });
  }
  // The skid event must schedule at current time, not a negative Web Audio time.
  await page.evaluate(async () => {
    const { Audio } = await import('/game/audio.js'); const audio = new Audio(); audio.wake(); audio.effect({ type: 'skid' }); await audio.context.close();
  });
  assert.deepEqual(errors, []);
  console.log('PASS: 84 sprite cells, alpha, seven real combat renders and skid audio.');
} finally { await browser.close(); await server.close(); }
