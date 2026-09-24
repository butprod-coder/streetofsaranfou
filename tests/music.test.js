import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Soundtrack, MUSIC, musicScene, stepDuration } from '../game/music.js';
import { THEMES, BOSS_THEMES, themeFor } from '../game/music-score.js';

test('seven original themes own distinct melodies, bass rhythms and a fixed menu score', () => {
  const scores = [];
  assert.equal(THEMES.length, 7);
  assert.equal(new Set(THEMES.map(t => JSON.stringify(t.melody))).size, 7);
  assert.equal(new Set(THEMES.map(t => JSON.stringify(t.bass))).size, 7);
  assert.equal(themeFor('menu', 0), themeFor('menu', 5));
  for (const scene of ['menu', 'street', 'boss']) for (let chapter = 0; chapter < (scene === 'menu' ? 1 : 6); chapter++) {
    const notes = [], drums = [], recorder = { note: (...args) => notes.push(args), drum: (...args) => drums.push(args) };
    for (let step = 0; step < MUSIC.bars * 16; step++) Soundtrack.prototype.schedule.call(recorder, step, step / 8, scene, chapter);
    assert.ok(notes.length > 100 && drums.length > 80);
    for (const note of notes) assert.ok(note.slice(0, 4).every(Number.isFinite));
    scores.push(JSON.stringify([notes, drums]));
  }
  assert.equal(new Set(scores).size, 13);
  assert.equal(musicScene(false, false, false), 'menu');
  assert.equal(musicScene(true, true, true), 'pause');
  assert.equal(musicScene(true, false, true), 'boss');
});

test('swing preserves tempo and boss arrangements accelerate each chapter', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const duration = stepDuration('street', chapter, 0) + stepDuration('street', chapter, 1);
    assert.ok(Math.abs(duration - 30 / themeFor('street', chapter).bpm) < 1e-10);
    assert.ok(stepDuration('boss', chapter, 0) < stepDuration('street', chapter, 0));
  }
});

test('bosses have independent compositions and all hooks span four bars', () => {
  assert.equal(BOSS_THEMES.length, 6);
  const tracks = [...THEMES, ...BOSS_THEMES];
  assert.equal(new Set(tracks.map(t => JSON.stringify(t.melody))).size, 13);
  for (const t of tracks) {
    assert.equal(t.melody.length, 32);
    assert.equal(t.answer.length, 32);
    assert.equal(t.bass.length, 16);
    assert.equal(t.harmony.length, 8);
  }
  for (let chapter = 0; chapter < 6; chapter++) {
    assert.notEqual(themeFor('boss', chapter), themeFor('street', chapter));
  }
});

test('street arrangements leave space in the break and return with the full rhythm section', () => {
  const section = bar => {
    const notes = [], drums = [], recorder = { note: (...n) => notes.push(n), drum: (...d) => drums.push(d) };
    for (let step = bar * 16; step < (bar + 1) * 16; step++) Soundtrack.prototype.schedule.call(recorder, step, step / 8, 'street', 0);
    return { notes, drums };
  };
  const intro = section(0), hook = section(8), breakSection = section(24), drop = section(32);
  assert.ok(hook.notes.length > intro.notes.length);
  assert.ok(!breakSection.drums.some(d => d[0] === 'kick'));
  assert.ok(breakSection.notes.some(n => n[4] === 'pad'));
  assert.ok(drop.drums.some(d => d[0] === 'kick'));
  assert.ok(drop.drums.some(d => d[0] === 'crash'));
});
