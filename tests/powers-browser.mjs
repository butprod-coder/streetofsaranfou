import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
page.on('pageerror', e => errors.push(e.message)); await mkdir('test-results', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js');
    const assets = new Assets(); await assets.prepare(1);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 720; renderer.scale = 1;
    window.qaPowers = { assets, renderer, Simulation };
  });
  for (const [name, kind, seconds] of [['golf', 'karonux', .8], ['sleep', 'karonux', 2.1], ['cigarettes', 'lorenzo', .5], ['ignitions', 'lorenzo', 1], ['flames', 'lorenzo', 2], ['triso-spit', 'triso', 1.25], ['triso-puddle', 'triso', 2]]) {
    const state = await page.evaluate(({ kind, seconds }) => {
      const { renderer: r, Simulation } = window.qaPowers, g = new Simulation([kind === 'triso' ? 'gustavax' : kind], 1, 44);
      g.spawnWave(); g.state.spawnQueue = []; g.state.enemies = []; g.state.props = [];
      const p = g.state.players[0]; p.x = 390; p.y = 550; p.invincible = 999;
      const e = g.spawnEnemy(kind === 'triso' ? 'triso' : 'remy', { x: 750, y: 550, hp: 9999, maxHp: 9999, invincible: 0, speed: 0, cooldown: kind === 'triso' ? 0 : 999 });
      if (kind !== 'triso') g.activateSpecial(p);
      for (let i = 0; i < seconds * 60; i++) g.step();
      r.reset(); r.draw(g.state, .016); return g.snapshot();
    }, { kind, seconds });
    await page.screenshot({ path: `test-results/power-${name}.png` });
    if (name === 'golf') { assert.equal(state.players[0].specialState.kind, 'karonux'); assert.equal(state.players[0].action, 'special'); assert.ok(state.events.some(e => e.type === 'golf')); }
    if (name === 'sleep') assert.equal(state.players[0].action, 'sleep');
    if (name === 'flames') assert.equal(state.hazards.filter(h => h.kind === 'fire').length, 5);
    if (name === 'triso-puddle') assert.ok(state.hazards.some(h => h.kind === 'slime' && h.delay <= 0));
  }
  assert.deepEqual(errors, []); console.log('PASS power visual fixtures: Golf, sleep, flying cigarette sprites, five ignitions, ground fire, Triso spit and puddle.');
} finally { await browser.close(); await server.close(); }
