import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => localStorage.setItem('saranfou-talents-v1', JSON.stringify({ gustavax: { completed: [0, 1, 2], talents: ['chauffe'] } })));
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const screen = (p, name) => p.waitForFunction(n => window.saranfou?.inspect().screen === n, name, { timeout: 60000 });
await mkdir('test-results', { recursive: true });
try {
  await page.goto(url); await screen(page, 'home');
  await page.getByRole('button', { name: /Descendre dans la rue/ }).click();
  await page.locator('[data-fighter=gustavax]').click(); await page.locator('#select [data-action=evolution]').click();
  assert.match(await page.locator('#talent-progress').textContent(), /0\/8 TALENTS/);
  assert.equal(await page.locator('.talent-node.available').count(), 0, 'A new run ignores previous talent storage');
  assert.equal(await page.evaluate(() => localStorage.getItem('saranfou-talents-v1')), null);
  assert.equal(await page.locator('.talent-links').count(), 3);
  assert.equal(await page.locator('.talent-art svg').count(), 15);
  await page.locator('.talent-node').first().hover();
  await page.locator('#talent-tooltip').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#talent-tooltip p').textContent());
  assert.equal(await page.locator('.talent-copy').count(), 0);
  await page.locator('#evolution-title').hover();
  await page.locator('#talent-tooltip').waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape'); await screen(page, 'select'); await page.keyboard.press('Escape'); await screen(page, 'home');
  await page.locator('[data-action=online]').click(); await page.locator('[data-action=host]').click(); await screen(page, 'lobby');
  const code = await page.locator('#room-code').textContent();
  const guestContext = await browser.newContext(); const guest = await guestContext.newPage(); guest.on('pageerror', e => errors.push(e.message));
  await guest.goto(`${url}/?room=${code}`); await guest.getByRole('button', { name: /Rejoindre/ }).click(); await screen(guest, 'lobby');
  await page.locator('#ready-button').click(); await guest.locator('#ready-button').click(); await Promise.all([screen(page, null), screen(guest, null)]);
  const sim = server.rooms.get(code).sim;
  sim.state.stage = 5; sim.state.spawnQueue = []; sim.state.enemies = []; sim.clearStreet();
  await page.waitForFunction(() => window.saranfou.inspect().state.players[0].progression.points === 1);
  await guest.waitForFunction(() => window.saranfou.inspect().state.players[1].progression.points === 1);
  await page.keyboard.press('Escape'); await screen(page, 'pause');
  await page.locator('#pause [data-action=evolution]').click();
  await screen(page, 'evolution'); await page.waitForFunction(() => document.activeElement?.dataset.talent === 'gustavax_v2_0_0'); await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.talent), 'gustavax_v2_1_0', 'Right changes talent branch');
  await page.keyboard.press('Enter'); await page.waitForFunction(() => window.saranfou.inspect().state.players[0].progression.talents.includes('gustavax_v2_1_0'));
  await page.locator('[data-talent="gustavax_v2_1_0"].owned').waitFor();
  assert.equal(await page.locator('[data-talent="gustavax_v2_1_0"] .talent-rank').textContent(), '1/1');
  assert.equal(await page.locator('.talent-links .lit').count(), 1);
  assert.equal(sim.state.players[1].progression.talents.length, 0, 'Allocation is character and player specific');
  await page.screenshot({ path: 'test-results/talents-gustavax.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('[data-action=close-evolution]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'test-results/talents-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.keyboard.press('Escape'); await screen(page, 'pause'); await page.getByRole('button', { name: /Reprendre/ }).click(); await screen(page, null);
  sim.state.players[0].energy=100;
  await page.keyboard.press('KeyL'); await page.waitForFunction(() => window.saranfou.inspect().state.players[0].specialState?.kind === 'gustavax');
  await guest.waitForFunction(() => window.saranfou.inspect().state.players[0].specialState?.duration === 6);
  await guest.waitForFunction(() => window.saranfou.inspect().state.players[0].maxHp > 200 && window.saranfou.inspect().state.players[0].speed > 250);
  const p = sim.state.players[0], x = p.x;
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight'); assert.ok(p.x > x + 40);
  await page.keyboard.down('KeyK'); await page.waitForTimeout(180); await page.screenshot({ path: 'test-results/gustavax-wrestler-game.png' }); await page.keyboard.up('KeyK');
  assert.ok(!sim.state.hazards.some(h => h.owner === p.id && h.kind === 'bullet'));
  await page.waitForFunction(() => !window.saranfou.inspect().state.players[0].specialState);
  assert.equal(sim.state.players[0].maxHp, 155); assert.equal(sim.state.players[0].speed, 230);
  await page.screenshot({ path: 'test-results/gustavax-normal-game.png' });
  await page.reload(); await screen(page, null);
  await page.waitForFunction(() => window.saranfou.inspect().state?.players[0].progression.talents.includes('gustavax_v2_1_0'));
  assert.equal(await page.evaluate(() => localStorage.getItem('saranfou-talents-v1')), null);
  await page.keyboard.press('Escape'); await screen(page, 'pause');
  const rendering = await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js');
    const a = new Assets(); await a.prepare(0);
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const r = new Renderer(canvas, a, { effect() {} }); r.scale = 1; canvas.width = 1280; canvas.height = 720;
    const c = r.ctx, transparent = () => c.getImageData(0, 0, 1280, 720).data.some((v, i) => i % 4 !== 3 && v !== 0);
    const hazard = { x: 300, y: 500, radius: 100, width: 200, band: 30, facing: 1, shape: 'circle', enemy: true, delay: .5 };
    const zones = [];
    for (const kind of ['warning', 'shock', 'impact', 'special', 'fist', 'barrelBlast']) {
      c.fillStyle = '#000'; c.fillRect(0, 0, 1280, 720); r.drawHazard({ ...hazard, kind }, 0); zones.push([kind, transparent()]);
    }
    c.fillStyle = '#182c36'; c.fillRect(0, 0, 1280, 720);
    const cells = [];
    for (const [key, count, offset] of [['gustavax', 16, 0], ['wrestler', 12, 360]]) for (let i = 0; i < count; i++) {
      r.arcadeSprite(key, 80 + i % 8 * 160, offset + 164 + Math.floor(i / 8) * 170, i, 115);
      c.font = '12px monospace'; c.fillStyle = '#e4dfd0'; c.fillText(`${key} ${i}`, 25 + i % 8 * 160, offset + 185 + Math.floor(i / 8) * 170);
      cells.push({ key, i, rect: a.arcadeFrame(key, i).rect });
    }
    return { zones, cells };
  });
  for (const [kind, visible] of rendering.zones) assert.equal(visible, kind === 'barrelBlast', `${kind}: no impact warning zones except barrel`);
  await page.screenshot({ path: 'test-results/gustavax-animation-atlas.png' });
  assert.deepEqual(errors, []);
  console.log('PASS talents: keyboard tree, mobile layout, per-run reset, chapter award to both peers and reconnect; wrestler controls, expiry and network form; only barrels retain ground warnings.', rendering.cells);
  await guestContext.close();
} catch (e) { await page.screenshot({ path: 'test-results/talents-failure.png' }); throw e; }
finally { await browser.close(); await server.close(); }
