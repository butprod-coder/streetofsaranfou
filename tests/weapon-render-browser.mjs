import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';

const server = createGameServer();
await new Promise(resolve => server.server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.server.address().port}`);
  await page.evaluate(async () => {
    const { Assets } = await import('/game/assets.js');
    const { Renderer } = await import('/game/renderer.js');
    const { FIGHTERS } = await import('/game/data.js');
    const { arcadeUrl } = await import('/game/visuals.js');
    const assets = new Assets();
    await Promise.all(['weaponItems', ...FIGHTERS.map(f => `actions_${f.id}`)].map(key => assets.load(arcadeUrl(key))));
    document.body.replaceChildren();
    const canvas = document.createElement('canvas'); canvas.style.width = '1280px'; canvas.style.height = '900px'; document.body.append(canvas);
    const renderer = new Renderer(canvas, assets, { effect() {} });
    canvas.width = 1280; canvas.height = 900;
    const c = canvas.getContext('2d'); c.fillStyle = '#253a50'; c.fillRect(0, 0, 1280, 900);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
      c.save(); c.translate(col * 180 + 80, row * 285 + 200 - 540);
      const weapon = ['pistol', 'shotgun', 'smg'][row];
      renderer.drawInteraction({ kind: FIGHTERS[col].id, x: 0, y: 540, z: 0, stun: 0, facing: col % 2 ? -1 : 1, weapon: { kind: weapon, uses: 3 } }, { time: 0 });
      c.fillStyle = 'white'; c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText(`${FIGHTERS[col].name} / ${weapon}`, 0, 565); c.restore();
    }
    renderer.consume({ events: [{ id: 1, type: 'gunshot', weapon: 'shotgun', x: 800, y: 850, facing: 1, range: 400 }] });
    renderer.drawEffects(.035);
  });
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/weapon-grips.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: seven heroes, three firearms, both facings and shotgun effects render without browser errors.');
} finally { await browser.close(); await server.close(); }
