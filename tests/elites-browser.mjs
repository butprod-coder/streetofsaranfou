import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
const server = createGameServer(); await new Promise(r => server.server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
page.on('pageerror', e => errors.push(e.message)); await mkdir('test-results', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.locator('#home [data-action=sound]').click();
  assert.equal(await page.locator('#volume-master').inputValue(), '65');
  await page.locator('#volume-music').focus(); await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#volume-music').inputValue(), '35');
  await page.keyboard.press('ArrowDown'); assert.equal(await page.evaluate(() => document.activeElement.id), 'volume-effects');
  await page.evaluate(() => {
    window.testPad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.testPad] });
    window.testPad.buttons[14].pressed = true;
  });
  await page.waitForTimeout(450); assert.equal(await page.locator('#volume-effects').inputValue(), '60', 'Held dpad changes volume once');
  await page.evaluate(() => { window.testPad.buttons[14].pressed = false; });
  await page.screenshot({ path: 'test-results/audio-menu.png' });
  await page.reload(); await page.locator('#home [data-action=sound]').click();
  assert.equal(await page.locator('#volume-effects').inputValue(), '60'); assert.equal(await page.locator('#volume-music').inputValue(), '35');
  await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: 'test-results/audio-mobile.png' }); await page.setViewportSize({ width: 1280, height: 900 });
  const gains = await page.evaluate(async () => {
    const { Audio } = await import('/game/audio.js'); const audio = new Audio(), saved = { ...audio.volumes };
    audio.wake(); audio.setVolume('music', 0); audio.setVolume('master', .5); audio.setVolume('effects', .2);
    await new Promise(r => setTimeout(r, 220));
    const values = [audio.musicBus.gain.value, audio.master.gain.value, audio.effectsBus.gain.value];
    audio.mute(true); await new Promise(r => setTimeout(r, 220)); values.push(audio.master.gain.value);
    for (const [key, value] of Object.entries(saved)) audio.setVolume(key, value);
    await audio.context.close(); return values;
  });
  assert.ok(gains[0] < .002 && Math.abs(gains[1] - .12) < .002 && Math.abs(gains[2] - .2) < .002 && gains[3] < .002, 'Independent real audio buses and mute');
  const alpha = await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js'), { Renderer } = await import('/game/renderer.js'), { Simulation } = await import('/game/simulation.js'), { ELITES } = await import('/game/elite-data.js');
    const assets = new Assets(); await assets.prepare(0);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} }); canvas.width = 1280; canvas.height = 900; renderer.scale = 1;
    window.qaElites = { assets, renderer, Simulation, ELITES };
    return Object.keys(ELITES).map(key => {
      const image = assets.arcadeFrame(key).image, canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const c = canvas.getContext('2d'); c.drawImage(image, 0, 0); const data = c.getImageData(0, 0, image.width, image.height).data;
      let clear = 0; for (let i = 3; i < data.length; i += 4) if (data[i] === 0) clear++;
      return [key, clear / (image.width * image.height)];
    });
  });
  for (const [key, clear] of alpha) assert.ok(clear > .25, `${key}: real transparency, got ${clear}`);
  for (const key of ['precieux', 'bolorouet', 'fouine', 'princesse', 'kayak', 'canape']) {
    const cells = await page.evaluate(key => {
      const { assets, renderer: r } = window.qaElites, c = r.ctx; c.fillStyle = '#142c38'; c.fillRect(0, 0, 1280, 900);
      return Array.from({ length: 12 }, (_, i) => {
        r.arcadeSprite(key, 145 + i % 4 * 320, 240 + Math.floor(i / 4) * 295, i, 180);
        c.fillStyle = '#ffe2ac'; c.font = '14px monospace'; c.fillText(`${key} ${i}`, 50 + i % 4 * 320, 270 + Math.floor(i / 4) * 295);
        return assets.arcadeFrame(key, i).rect;
      });
    }, key);
    await page.screenshot({ path: `test-results/atlas-${key}.png` }); console.log(key, cells);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const [key, seconds] of [['precieux', 1.1], ['bolorouet', 1.4], ['fouine', 1.3], ['princesse', 1.4], ['kayak', 1.4], ['canape', .6], ['canape', 3.2]]) {
    await page.evaluate(({ key, seconds }) => {
      const { renderer: r, Simulation } = window.qaElites; r.canvas.width = 1280; r.canvas.height = 720; r.scale = 1;
      const sim = new Simulation(['gustavax'], 0, 53); sim.spawnWave(); sim.state.enemies = []; sim.state.props = []; sim.state.spawnQueue = [];
      const p = sim.state.players[0]; p.x = 460; p.y = 550; p.invincible = 99;
      sim.spawnEnemy(key, { x: 740, y: 550, cooldown: 0 });
      for (let i = 0; i < seconds * 60; i++) sim.step();
      r.reset(); r.draw(sim.state, .016);
    }, { key, seconds });
    await page.screenshot({ path: `test-results/elite-${key}-${seconds}.png` });
  }
  for (let chapter = 0; chapter < 6; chapter++) {
    await page.evaluate(chapter => {
      const { renderer: r, Simulation } = window.qaElites; const sim = new Simulation(['gustavax'], chapter, 9); sim.state.stage = 5; sim.enterStreet(); sim.state.wave = sim.state.waves.length - 2; sim.spawnWave();
      const boss = sim.state.enemies.find(e => e.boss), p = sim.state.players[0]; boss.vehicle = false; boss.hp = boss.maxHp * .25;
      for (let i = 0; i < 300; i++) { p.invincible = 99; sim.step(); if (boss.pattern?.signature && boss.pattern.elapsed > .85) break; }
      r.reset(); r.draw(sim.state, .016);
    }, chapter);
    await page.screenshot({ path: `test-results/boss-signature-${chapter + 1}.png` });
  }
  assert.deepEqual(errors, []); console.log('PASS audio keyboard/gamepad/persistence/mobile; 72 transparent elite cells and 13 combat/boss visual fixtures.', alpha);
} catch (e) { await page.screenshot({ path: 'test-results/elites-failure.png' }); throw e; }
finally { await browser.close(); await server.close(); }
