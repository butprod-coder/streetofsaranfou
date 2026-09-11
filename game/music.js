// Original arcade club soundtrack. No borrowed melodies, recordings or samples.
import { MUSIC, themeFor, stepDuration } from './music-score.js';
export { MUSIC, themeFor, stepDuration } from './music-score.js';
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
export function musicScene(active, paused, boss) { return paused ? 'pause' : !active ? 'menu' : boss ? 'boss' : 'street'; }

export class Soundtrack {
  constructor(context, destination, noise) {
    this.ctx = context; this.noise = noise; this.step = 0; this.next = 0; this.scene = ''; this.chapter = -1;
    this.voices = new Set();
    this.bus = context.createGain(); this.bus.gain.value = 0;
    this.filter = context.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 11000;
    this.compressor = context.createDynamicsCompressor(); this.compressor.threshold.value = -12;
    this.compressor.ratio.value = 3; this.compressor.attack.value = .006; this.compressor.release.value = .12;
    this.makeup = context.createGain(); this.makeup.gain.value = 1.5;
    this.bus.connect(this.filter).connect(this.compressor).connect(this.makeup).connect(destination);
    this.delay = context.createDelay(1); this.delay.delayTime.value = .18;
    this.echo = context.createGain(); this.echo.gain.value = .12;
    this.delay.connect(this.echo).connect(this.bus);
    this.duckUntil = 0;
  }
  register(sources, nodes, envelope, at, duration) {
    const voice = { sources, envelope };
    this.voices.add(voice);
    sources.forEach(source => { source.start(at); source.stop(at + duration + .02); });
    sources[0].onended = () => { for (const node of [...sources, ...nodes]) node.disconnect(); this.voices.delete(voice); };
  }
  release() {
    const now = this.ctx.currentTime;
    for (const { sources, envelope } of this.voices) {
      envelope.gain.cancelAndHoldAtTime(now);
      envelope.gain.linearRampToValueAtTime(.0001, now + .045);
      for (const source of sources) source.stop(now + .055);
    }
  }
  note(midi, at, duration, volume, kind = 'fm') {
    const c = this.ctx, envelope = c.createGain(), filter = c.createBiquadFilter();
    const bass = kind === 'bass', acid = kind === 'acid', pad = kind === 'pad';
    filter.type = 'lowpass'; filter.Q.value = acid ? 5 : bass ? 1.4 : .6;
    filter.frequency.setValueAtTime(acid ? 5400 : bass ? 2300 : 8500, at);
    filter.frequency.exponentialRampToValueAtTime(acid ? 380 : bass ? 350 : 2600, at + duration);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + (pad ? .12 : .004));
    envelope.gain.setValueAtTime(volume * (pad ? .7 : .55), at + duration * .35);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    envelope.connect(filter).connect(this.bus);
    if (!bass && !acid) filter.connect(this.delay);
    const carrier = c.createOscillator(), modulator = c.createOscillator(), depth = c.createGain();
    carrier.type = bass || acid ? 'sawtooth' : kind === 'brass' ? 'sawtooth' : 'sine';
    carrier.frequency.value = hz(midi);
    // True two-operator FM for metallic arcade leads; resonant envelopes for acid bass.
    modulator.frequency.value = hz(midi) * (kind === 'bell' ? 3.5 : 2);
    depth.gain.setValueAtTime(hz(midi) * (bass || acid ? .18 : kind === 'bell' ? 1.6 : 2.1), at);
    depth.gain.exponentialRampToValueAtTime(1, at + duration);
    modulator.connect(depth).connect(carrier.frequency); carrier.connect(envelope);
    this.register([carrier, modulator], [depth, envelope, filter], envelope, at, duration);
  }
  drum(kind, at, volume) {
    const c = this.ctx, g = c.createGain(), filter = c.createBiquadFilter();
    const kick = kind === 'kick', snare = kind === 'snare', open = kind === 'open';
    const length = kick ? .28 : snare ? .17 : open ? .16 : .045;
    const source = kick ? c.createOscillator() : c.createBufferSource();
    if (kick) {
      source.type = 'sine'; source.frequency.setValueAtTime(185, at);
      source.frequency.exponentialRampToValueAtTime(48, at + .075);
      filter.type = 'lowpass'; filter.frequency.value = 3200;
    } else {
      source.buffer = this.noise; filter.type = snare ? 'bandpass' : 'highpass';
      filter.frequency.value = snare ? 2300 : 7100; filter.Q.value = snare ? .8 : .5;
    }
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(volume, at + .001);
    if (snare) { // A short triple transient gives the backbeat a clap-like crack.
      for (const offset of [.009, .019]) {
        g.gain.setValueAtTime(volume * .35, at + offset - .003);
        g.gain.setValueAtTime(volume, at + offset);
      }
    }
    g.gain.exponentialRampToValueAtTime(.0001, at + length);
    source.connect(filter).connect(g).connect(this.bus);
    this.register([source], [filter, g], g, at, length);
    if (snare) this.note(55, at, .10, volume * .20, 'bass');
  }
  schedule(step, at, scene, chapter) {
    const t = themeFor(scene, chapter), beat = 60 / (t.bpm + (scene === 'boss' ? MUSIC.bossTempo : 0));
    const s = step % 16, bar = Math.floor(step / 16) % MUSIC.bars;
    const bridge = bar >= 16 && bar < 20 && scene !== 'boss';
    const lift = bar >= 20, chord = t.harmony[Math.floor(bar / 2) % 4];
    const root = t.root + chord, melody = bar % 8 < 4 ? t.melody : t.answer;
    if (!bridge || s === 0) {
      if (t.kick.includes(s)) this.drum('kick', at, 1);
      if (t.snare.includes(s)) this.drum('snare', at + .003, .65);
      if (s % 2 === 0) this.drum(s % 4 === 2 ? 'open' : 'hat', at, s % 4 === 2 ? .12 : .15);
      if ((lift || scene === 'boss') && s % 2 && s > 10) this.drum('hat', at, .075);
    }
    if (bar % 8 === 7 && s >= 13) this.drum('snare', at, .20 + (s - 13) * .08);
    const bass = t.bass[s];
    if (bass !== null && (!bridge || s % 4 === 0)) this.note(root + bass, at, beat * .44, .30, t.voice === 'acid' ? 'acid' : 'bass');
    if (t.stabs.includes(s) && (!bridge || s === t.stabs[0])) {
      for (const n of [0, 3, 7, 10]) this.note(root + 24 + n, at, beat * .42, .085, 'brass');
    }
    if (s % 2 === 0) {
      const n = melody[(Math.floor(s / 2) + (bar % 2) * 8) % 16];
      if (n !== null) this.note(t.root + 24 + n, at, beat * (bridge ? .85 : .55), bridge ? .12 : .20, t.voice);
    }
    if ((lift || scene === 'boss') && s % 2 === 1) {
      this.note(root + 36 + [0, 7, 10, 3][Math.floor(s / 2) % 4], at, beat * .23, .075, 'fm');
    }
    if (bridge && s === 0) for (const n of [0, 7, 10]) this.note(root + 24 + n, at, beat * 3, .06, 'pad');
    if (scene === 'boss' && [3, 10, 15].includes(s)) this.drum('kick', at, .6);
  }
  duck() { this.duckUntil = this.ctx.currentTime + .12; }
  update(scene, chapter = 0, muted = false) {
    const now = this.ctx.currentTime;
    chapter = scene === 'menu' ? 0 : Math.max(0, Math.min(5, Math.trunc(chapter) || 0));
    if (scene !== this.scene || chapter !== this.chapter) {
      this.release();
      this.scene = scene; this.chapter = chapter; this.step = 0; this.next = now + .065;
      this.delay.delayTime.setTargetAtTime(60 / themeFor(scene, chapter).bpm * .375, now, .05);
    }
    const target = muted || scene === 'pause' ? 0 : MUSIC.level * (now < this.duckUntil ? MUSIC.duck : 1);
    if (target !== this.target) { this.bus.gain.setTargetAtTime(target, now, target === 0 ? .06 : .035); this.target = target; }
    if (muted || scene === 'pause' || this.ctx.state === 'suspended') { this.next = now + .04; return; }
    if (this.next < now - .2) { this.release(); this.next = now + .065; }
    while (this.next < now + .10) {
      this.schedule(this.step, this.next, scene, chapter);
      this.next += stepDuration(scene, chapter, this.step++);
    }
  }
}
