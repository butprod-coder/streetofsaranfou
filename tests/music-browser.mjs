import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'], ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
try {
  const page = await browser.newPage(), errors = [];
  page.on('console', message => { if (message.text().startsWith('Music rendered:')) console.log(message.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3010');
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  const result = await page.evaluate(async () => {
    const { Soundtrack, MUSIC, musicScene, stepDuration, themeFor } = await import('/game/music.js');
    if (musicScene(false, false, false) !== 'menu' || musicScene(true, true, true) !== 'pause' || musicScene(true, false, true) !== 'boss') throw Error('Scene selection');
    const reports = [], previews = [];
    for (const scene of ['menu', 'street', 'boss']) for (let chapter = 0; chapter < (scene === 'menu' ? 1 : 6); chapter++) {
      const sections = [8, 9, 24, 28, 32, 40, 55, 63, 0];
      const duration = sections.length * 4 * 60 / (themeFor(scene, chapter).bpm + (scene === 'boss' ? MUSIC.bossTempo : 0));
      const c = new OfflineAudioContext(1, Math.ceil(24000 * (duration + 1)), 24000), noise = c.createBuffer(1, 24000, 24000);
      let seed = 42;
      const n = noise.getChannelData(0); for (let i = 0; i < n.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; n[i] = seed / 2147483648 - 1; }
      const output = c.createGain(); output.gain.value = .24; output.connect(c.destination);
      const music = new Soundtrack(c, output, noise); music.bus.gain.value = MUSIC.level;
      let at = .05, step = 0;
      while (step < sections.length * 16) { const scoreStep = sections[Math.floor(step / 16)] * 16 + step % 16; music.schedule(scoreStep, at, scene, chapter); at += stepDuration(scene, chapter, scoreStep); step++; }
      const pcm = (await c.startRendering()).getChannelData(0);
      let peak = 0, sum = 0;
      for (const sample of pcm) { if (!Number.isFinite(sample)) throw Error('Invalid sample'); peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
      reports.push({ scene, chapter, peak, rms: Math.sqrt(sum / pcm.length) });
      console.info(`Music rendered: ${scene} ${chapter + 1}, ${Math.round(duration)} s / all arrangement sections`);
      const previewStart = 0;
      previews.push(Array.from(pcm.slice(previewStart, previewStart + 24000 * 6), (x, i) => Math.round(Math.max(-1, Math.min(1, x)) * 32767 * Math.min(1, i / 480, (24000 * 6 - i) / 2400))));
    }
    const c = new AudioContext(), noise = c.createBuffer(1, c.sampleRate, c.sampleRate), m = new Soundtrack(c, c.destination, noise);
    await c.resume(); m.update('street'); m.update('pause'); if (m.target !== 0) throw Error('Pause');
    m.update('menu', 0, true); if (m.target !== 0) throw Error('Mute');
    m.duck(); m.update('boss'); if (m.target >= MUSIC.level) throw Error('Ducking');
    await c.close();
    return { reports, preview: previews.flat() };
  });
  for (const r of result.reports) { assert.ok(r.peak < .95, `No clipping: ${JSON.stringify(r)}`); assert.ok(r.rms > .025, `Audible: ${JSON.stringify(r)}`); }
  assert.deepEqual(errors, []);
  await mkdir('test-results', { recursive: true });
  const wav = Buffer.alloc(44 + result.preview.length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  result.preview.forEach((v, i) => wav.writeInt16LE(v, 44 + i * 2));
  await writeFile('test-results/arcade-themes-preview.wav', wav);
  console.log('PASS: 13 independently composed tracks, finite audible signal, no clipping, pause/mute/ducking, WAV preview.', result.reports);
} finally { await browser.close(); }
