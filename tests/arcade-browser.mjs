import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const errors = [], badResponses = [];
const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const host = await hostContext.newPage(), guest = await guestContext.newPage();
for (const p of [host, guest]) { p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) badResponses.push(r.url()); }); }
const screen = (p, name) => p.waitForFunction(n => window.saranfou?.inspect().screen === n, name, { timeout: 60000 });
const inspect = p => p.evaluate(() => window.saranfou.inspect());
await mkdir('test-results', { recursive: true });
try {
  await host.goto(url); await host.getByRole('button', { name: /Ramener un pote/ }).click();
  await host.getByRole('button', { name: /Créer un salon/ }).click(); await screen(host, 'lobby');
  const code = (await inspect(host)).room;
  await guest.goto(`${url}/?room=${code}`); await guest.getByRole('button', { name: /Rejoindre/ }).click(); await screen(guest, 'lobby');
  await host.getByRole('button', { name: /Je suis prêt/ }).click(); await guest.getByRole('button', { name: /Je suis prêt/ }).click();
  await Promise.all([screen(host, null), screen(guest, null)]);
  await host.waitForFunction(() => window.saranfou.inspect().state.phase === 'fight');
  const sim = server.rooms.get(code).sim;
  for (const p of sim.state.players) p.invincible = 999;
  for (const e of sim.state.enemies) { e.speed = 0; e.cooldown = 999; } sim.state.spawnQueue = [];
  await host.screenshot({ path: 'test-results/arcade-street.png' });
  const x = sim.state.players[1].x;
  await guest.keyboard.down('ArrowRight'); await guest.keyboard.down('ShiftLeft'); await guest.waitForTimeout(170); await guest.keyboard.up('ArrowRight');
  assert.ok(sim.state.players[1].x > x + 70, 'guest dodge reaches authoritative server immediately');
  await guest.screenshot({ path: 'test-results/arcade-dodge.png' });
  await guest.waitForTimeout(1100); assert.equal(sim.state.players[1].dodgeCd, 0, 'held dodge does not repeat online'); await guest.keyboard.up('ShiftLeft');
  for (const kind of ['car', 'delivery', 'ambush']) {
    sim.state.chapter = kind === 'delivery' ? 1 : 0; sim.state.stage = kind === 'ambush' ? 3 : 1;
    sim.enterStreet(); sim.state.phase = 'fight'; sim.state.wave = sim.state.waves.length - 1; sim.state.enemies = []; sim.state.spawnQueue = [];
    // Final wave resolution must start the event naturally on the server.
    await host.waitForFunction(k => window.saranfou.inspect().state.surprise?.kind === k, kind, { timeout: 3000 });
    await guest.waitForFunction(k => window.saranfou.inspect().state.surprise?.kind === k, kind);
    await Promise.all([screen(host, null), screen(guest, null)]);
    await host.waitForTimeout(2400);
    const target = sim.state.props.find(p => p.bonus);
    if (target) {
      sim.state.players[1].x = target.x - 70; sim.state.players[1].y = target.y; sim.state.players[1].facing = 1;
      const hp = target.hp; await guest.keyboard.down('KeyJ'); await guest.waitForTimeout(400); await guest.keyboard.up('KeyJ');
      assert.ok(target.hp < hp, `${kind}: real guest punches damage server props`);
      await host.waitForTimeout(150);
      const hpHost = (await inspect(host)).state.props.find(p => p.id === target.id).hp;
      const hpGuest = (await inspect(guest)).state.props.find(p => p.id === target.id).hp;
      assert.equal(hpHost, hpGuest, 'both players see the same damaged scenery');
    }
    await host.screenshot({ path: `test-results/arcade-${kind}.png` });
    await guest.keyboard.press('Escape'); await Promise.all([screen(host, 'pause'), screen(guest, 'pause')]);
    const time = sim.state.surprise.remaining; await host.waitForTimeout(180); assert.equal(sim.state.surprise.remaining, time, 'bonus timer freezes during shared pause');
    await host.getByRole('button', { name: /Reprendre/ }).click(); await Promise.all([screen(host, null), screen(guest, null)]);
    // Success/failure cleanup is extensively tested in arcade.test.js. Here verify the resulting network state and UI.
    if (kind === 'ambush') sim.state.surprise.remaining = .03;
    else for (const p of sim.state.props.filter(p => p.bonus)) sim.hitProp(p, 999, sim.state.players[0]);
    await host.waitForFunction(() => window.saranfou.inspect().state.phase === 'clear');
    await guest.waitForFunction(() => window.saranfou.inspect().state.phase === 'clear');
    await host.waitForFunction(() => document.querySelector('#objective').textContent.includes('Rue dégagée'));
  }
  const alpha = await host.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { ARCADE_SPRITES, arcadeUrl } = await import('/game/visuals.js');
    const a = new Assets(), result = [];
    for (const key of Object.keys(ARCADE_SPRITES)) {
      const img = await a.load(arcadeUrl(key)), canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const c = canvas.getContext('2d'); c.drawImage(img, 0, 0); const data = c.getImageData(0, 0, img.width, img.height).data;
      let transparent = 0, opaque = 0; for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) transparent++; if (data[i] > 200) opaque++; }
      const cfg = ARCADE_SPRITES[key];
      for (let frame = 0; frame < cfg.cols * cfg.rows; frame++) { const r = a.arcadeFrame(key, frame).rect; if (r[2] < 10 || r[3] < 10) throw Error(`${key} empty frame`); }
      result.push({ key, transparent: transparent / (img.width * img.height), opaque });
    } return result;
  });
  for (const asset of alpha) { assert.ok(asset.transparent > .15, `${asset.key} has real transparent cutouts`); assert.ok(asset.opaque > 1000); }
  assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
  console.log('PASS: generated alpha and frames, keyboard dash, authoritative duo prop damage, 3 surprise types, shared pause/timer, unlocked exits, no browser errors.', alpha);
} catch (e) { await host.screenshot({ path: 'test-results/arcade-failure.png' }); throw e; }
finally { await browser.close(); await server.close(); }
