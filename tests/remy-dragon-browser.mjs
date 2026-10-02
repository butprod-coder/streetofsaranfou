import { chromium } from 'playwright';
import { createGameServer } from '../server/index.js';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  const result = await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js'), { ENEMIES } = await import('/game/data.js');
    const assets = new Assets(); await assets.prepare(4);
    const canvas = document.createElement('canvas'); canvas.style = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99999'; document.body.append(canvas);
    const r = new Renderer(canvas, assets, { effect() {} }), g = new Simulation(['jo'], 4, 71);
    g.state.stage = 2; g.enterStreet(); g.state.wave = g.state.waves.length - 2; g.spawnWave(); g.state.bossCinema = null; g.state.chapterStory = false;
    const boss = g.state.enemies.find(e => e.kind === 'remyGeek'); g.state.enemies = [boss]; boss.x = 950; boss.y = 560; boss.remyPartySpawned = true; boss.bossPhase = 2;
    g.spawnRemyOnyxia(boss); const dragon = g.state.enemies.find(e => e.kind === 'remyOnyxia'); dragon.x = 600; dragon.y = 590; dragon.hp = Math.floor(dragon.maxHp / 2); dragon.invincible = 0; g.state.events = [];
    const rects = [], labels = [], fillRect = r.ctx.fillRect.bind(r.ctx), fillText = r.ctx.fillText.bind(r.ctx);
    r.ctx.fillRect = (...args) => { rects.push({ args, color: r.ctx.fillStyle }); fillRect(...args); };
    r.ctx.fillText = (...args) => { labels.push(args); fillText(...args); }; r.draw(g.state, .016);
    const bar = rects.find(rect => rect.color === ENEMIES.remyOnyxia.color && rect.args[3] === 5);
    window.healthQA = { r, g, ENEMIES }; return { name: ENEMIES.remyOnyxia.name, labels, bar, top: dragon.y - ENEMIES.remyOnyxia.height, ratio: dragon.hp / dragon.maxHp };
  });
  assert.ok(result.labels.some(label => label[0] === result.name)); assert.ok(result.bar); assert.ok(result.bar.args[1] + 5 < result.top, 'Health bar stays above the large dragon sprite'); assert.ok(result.ratio < .51);
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/remy-dragon-health.png' }); assert.deepEqual(errors, []);
  const cases = await page.evaluate(() => {
    const { r, g, ENEMIES } = window.healthQA; r.ctx.fillStyle = '#253540'; r.ctx.fillRect(0, 0, 1280, 720);
    const kinds = ['shieldGuard', 'kamikaze', 'laneShooter', 'damps', 'cainri', 'jalatrix', 'mazzuka', 'maire', 'remyGeek', 'harmelin'];
    return kinds.map((kind, i) => {
      const miniBoss = i >= 3, actor = { ...g.actor(kind, 100 + i, true), x: 140 + i % 5 * 245, y: 330 + Math.floor(i / 5) * 335, hp: 100, maxHp: 400, boss: miniBoss, miniBoss };
      const rects = [], texts = [], oldRect = r.ctx.fillRect.bind(r.ctx), oldText = r.ctx.fillText.bind(r.ctx);
      r.ctx.fillRect = (...args) => { rects.push({ args, color: r.ctx.fillStyle }); oldRect(...args); }; r.ctx.fillText = (...args) => { texts.push(args); oldText(...args); };
      r.actor(actor, g.state, 0, 0); r.ctx.fillRect = oldRect; r.ctx.fillText = oldText;
      const bar = rects.find(rect => rect.color === ENEMIES[kind].color && rect.args[3] === 5), name = ENEMIES[kind].name.split(' ·')[0];
      return { kind, bar, nameShown: texts.some(text => text[0] === name), spriteTop: actor.y - (miniBoss ? kind === 'remyGeek' ? 185 : 170 : 144) };
    });
  });
  for (const item of cases) { assert.ok(item.nameShown, item.kind); assert.ok(item.bar, item.kind); assert.ok(item.bar.args[1] + 5 < item.spriteTop, item.kind); }
  await page.screenshot({ path: 'test-results/enemy-health-bars.png' }); assert.deepEqual(errors, []);
  console.log('PASS: health bars above the three new rivals, all seven minibosses, and Remy second-phase dragon.');
} finally { await browser?.close(); await server.close(); }
