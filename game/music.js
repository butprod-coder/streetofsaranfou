// Original FM / early-1990s house soundtrack, synthesized locally without samples.
import { MUSIC, themeFor, stepDuration } from './music-score.js';
export { MUSIC, themeFor, stepDuration } from './music-score.js';
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
export function musicScene(active, paused, boss) { return paused ? 'pause' : !active ? 'menu' : boss ? 'boss' : 'street'; }
const PATCHES = {
  bass:  { wave: 'sine', ratio: 1, index: 2.6, end: .12, cutoff: 2400, tail: 700, attack: .003 },
  acid:  { wave: 'sawtooth', ratio: 1, index: .1, end: .02, cutoff: 4300, tail: 320, attack: .003, q: 7 },
  keys:  { wave: 'sine', ratio: 3, index: 1.7, end: .08, cutoff: 6800, tail: 2600, attack: .004 },
  organ: { wave: 'sine', ratio: 2, index: 1.3, end: .9, cutoff: 6500, tail: 3800, attack: .006 },
  pluck: { wave: 'sine', ratio: 2, index: 3.5, end: .1, cutoff: 7200, tail: 1600, attack: .002 },
  lead:  { wave: 'sawtooth', ratio: 2, index: .22, end: .08, cutoff: 4000, tail: 1700, attack: .012 },
  brass: { wave: 'sawtooth', ratio: 1, index: .3, end: .06, cutoff: 3200, tail: 900, attack: .012 },
  bell:  { wave: 'sine', ratio: 3.5, index: 1.9, end: .12, cutoff: 8200, tail: 3400, attack: .002 },
  pad:   { wave: 'triangle', ratio: 2, index: .25, end: .15, cutoff: 2200, tail: 1400, attack: .18 },
  fm:    { wave: 'sine', ratio: 2, index: 2.1, end: .12, cutoff: 6400, tail: 2500, attack: .004 },
};
export class Soundtrack {
  constructor(context, destination, noise) {
    this.ctx = context; this.noise = noise; this.step = 0; this.next = 0; this.scene = ''; this.chapter = -1;
    this.voices = new Set();
    this.bus = context.createGain(); this.bus.gain.value = 0;
    this.filter = context.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 12000;
    this.compressor = context.createDynamicsCompressor(); this.compressor.threshold.value = -15;
    this.compressor.knee.value = 15; this.compressor.ratio.value = 4;
    this.compressor.attack.value = .008; this.compressor.release.value = .16;
    this.makeup = context.createGain(); this.makeup.gain.value = 1.65;
    this.bus.connect(this.filter).connect(this.compressor).connect(this.makeup).connect(destination);
    this.delay = context.createDelay(1); this.delay.delayTime.value = .18;
    this.echo = context.createGain(); this.echo.gain.value = .19;
    this.echoFilter = context.createBiquadFilter(); this.echoFilter.type = 'lowpass'; this.echoFilter.frequency.value = 3400;
    this.echoPan = context.createStereoPanner(); this.echoPan.pan.value = -.4;
    this.delay.connect(this.echoFilter).connect(this.echo).connect(this.echoPan).connect(this.bus);
    this.feedback = context.createGain(); this.feedback.gain.value = .23;
    this.echoFilter.connect(this.feedback).connect(this.delay);
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
  note(midi, at, duration, volume, kind = 'fm', pan = 0) {
    const c = this.ctx, patch = PATCHES[kind] || PATCHES.fm;
    const envelope = c.createGain(), filter = c.createBiquadFilter(), stereo = c.createStereoPanner();
    const bass = kind === 'bass', acid = kind === 'acid', pad = kind === 'pad';
    stereo.pan.value = pan;
    filter.type = 'lowpass'; filter.Q.value = patch.q || .7;
    filter.frequency.setValueAtTime(patch.cutoff, at);
    filter.frequency.exponentialRampToValueAtTime(patch.tail, at + duration);
    const attack = Math.min(patch.attack, duration * .2);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + attack);
    envelope.gain.exponentialRampToValueAtTime(volume * (pad ? .8 : .48), at + duration * .45);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    envelope.connect(filter).connect(stereo).connect(this.bus);
    if (!bass && !acid) stereo.connect(this.delay);
    const carrier = c.createOscillator(), modulator = c.createOscillator(), depth = c.createGain();
    carrier.type = patch.wave; carrier.frequency.value = hz(midi);
    modulator.frequency.value = hz(midi) * patch.ratio;
    depth.gain.setValueAtTime(hz(midi) * patch.index, at);
    depth.gain.exponentialRampToValueAtTime(hz(midi) * patch.end, at + duration * .8);
    modulator.connect(depth).connect(carrier.frequency); carrier.connect(envelope);
    const sources = [carrier, modulator], nodes = [depth, envelope, filter, stereo];
    if (bass || kind === 'lead' || pad) {
      const layer = c.createOscillator(), gain = c.createGain();
      layer.type = bass ? 'sine' : 'triangle'; layer.frequency.value = hz(midi);
      layer.detune.value = bass ? 0 : 7; gain.gain.value = bass ? .32 : .24;
      layer.connect(gain).connect(envelope); sources.push(layer); nodes.push(gain);
    }
    this.register(sources, nodes, envelope, at, duration);
  }
  drum(kind, at, volume) {
    const c = this.ctx, envelope = c.createGain(), filter = c.createBiquadFilter(), pan = c.createStereoPanner();
    const kick = kind === 'kick', snare = kind === 'snare', clap = kind === 'clap', tom = kind === 'tom';
    const open = kind === 'open', crash = kind === 'crash', tonal = kick || tom;
    const length = kick ? .32 : tom ? .2 : snare ? .19 : clap ? .16 : crash ? .9 : open ? .19 : .045;
    const source = tonal ? c.createOscillator() : c.createBufferSource();
    pan.pan.value = kind === 'hat' ? .22 : open ? -.24 : tom ? -.35 : crash ? .38 : 0;
    if (tonal) {
      source.type = 'sine'; source.frequency.setValueAtTime(kick ? 165 : 220, at);
      source.frequency.exponentialRampToValueAtTime(kick ? 47 : 82, at + (kick ? .065 : .14));
      filter.type = 'lowpass'; filter.frequency.value = 2600;
    } else {
      source.buffer = this.noise; filter.type = snare || clap ? 'bandpass' : 'highpass';
      filter.frequency.value = snare ? 1800 : clap ? 1300 : crash ? 5300 : 7600;
      filter.Q.value = clap ? .65 : .8;
    }
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + .001);
    if (clap) for (const offset of [.009, .018, .027]) {
      envelope.gain.setValueAtTime(volume * .16, at + offset - .002);
      envelope.gain.setValueAtTime(volume * .8, at + offset);
    }
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    source.connect(filter).connect(envelope).connect(pan).connect(this.bus);
    const sources = [source], nodes = [filter, envelope, pan];
    if (snare) {
      const body = c.createOscillator(), gain = c.createGain();
      body.type = 'triangle'; body.frequency.setValueAtTime(190, at); body.frequency.exponentialRampToValueAtTime(120, at + .1);
      gain.gain.value = .35; body.connect(gain).connect(envelope); sources.push(body); nodes.push(gain);
    }
    this.register(sources, nodes, envelope, at, length);
  }
  schedule(step, at, scene, chapter) {
    const t = themeFor(scene, chapter), boss = scene === 'boss';
    const beat = 60 / (t.bpm + (boss ? MUSIC.bossTempo : 0));
    const s = step % 16, bar = Math.floor(step / 16) % MUSIC.bars;
    // 64-bar club form: groove, hook, development, break, return, peak and turnaround.
    const intro = bar < 4, breakdown = bar >= 24 && bar < 32;
    const lift = bar >= 40 && bar < 56, outro = bar >= 60;
    const chord = t.harmony[Math.floor(bar / 2) % t.harmony.length], root = t.root + chord;
    const melody = Math.floor(bar / 8) % 2 ? t.answer : t.melody;
    if (!breakdown || boss) {
      if (t.kick.includes(s)) this.drum('kick', at, .92);
      if (t.snare.includes(s)) {
        this.drum('snare', at, .42);
        this.drum('clap', at + .008, .34);
      }
      if (s % 2 === 0) this.drum(s % 4 === 2 && !intro ? 'open' : 'hat', at, s % 4 === 2 ? .18 : .12);
      if ((lift || boss || t.groove === 'break') && s % 2) this.drum('hat', at, .05 + (s % 4 === 3 ? .025 : 0));
      if (t.groove === 'break' && [7, 15].includes(s)) this.drum('snare', at, .12);
    } else if (s % 4 === 2) this.drum('hat', at, .07);
    if ([4, 16, 32, 40, 56].includes(bar) && s === 0) this.drum('crash', at, .24);
    if (bar % 8 === 7 && s >= 12 && !intro) {
      if (s % 2 === 0 || s === 15) this.drum(s < 14 ? 'tom' : 'snare', at, .20 + (s - 12) * .035);
    }
    const bass = t.bass[(s + (bar % 4 === 3 ? 8 : 0)) % 16];
    if (bass !== null && (!breakdown || boss)) {
      this.note(root + bass, at, beat * (s % 4 === 3 ? .22 : .39), .40, 'bass');
      if (t.voice === 'acid' && !intro) this.note(root + bass + 12, at, beat * .28, .095, 'acid', -.12);
    }
    if (t.stabs.includes(s) && !intro && !outro && (!breakdown || s === t.stabs[0])) {
      // Minor ninth voicings, kept above the bass; staggered attacks avoid a harsh block chord.
      for (const [i, n] of [3, 7, 10, 14].entries()) {
        this.note(root + 12 + n, at + i * .004, beat * (breakdown ? 1.6 : .48), .095,
          t.groove === 'break' || boss ? 'brass' : 'keys', (i - 1.5) * .23);
      }
    }
    if (!intro && !outro && s % 2 === 0 && (!breakdown || bar >= 28)) {
      const n = melody[Math.floor(s / 2) + (bar % 4) * 8];
      if (n !== null) this.note(t.root + 24 + n, at, beat * (breakdown ? 1.2 : .7), breakdown ? .14 : .19, t.voice, .12);
    }
    if (lift && s % 4 === 3) this.note(root + 36 + [0, 7, 10, 14][Math.floor(s / 4)], at, beat * .27, .07, 'pluck', -.3);
    if ((breakdown || scene === 'menu') && s === 0 && bar % 2 === 0) {
      for (const [i,n] of [3,7,10].entries()) this.note(root + 24 + n, at, beat * 6, .045, 'pad', (i-1)*.5);
    }
    if (boss && [3, 11].includes(s) && bar % 4 >= 2) this.drum('kick', at, .58);
  }
  duck() { this.duckUntil = this.ctx.currentTime + .12; }
  raveBeat(beat) {
    if(this.raveMuted||this.ctx.state==='suspended')return;
    const now=this.ctx.currentTime+.01;
    this.drum('kick',now,.55);this.drum(beat%2?'hat':'clap',now,.2);
    this.note(36+[0,0,3,7][beat%4],now,.2,.35,'bass');
    this.note(72+[0,7,10,7,3,7,12,10][beat%8],now,.18,.18,'acid',.15);
  }
  update(scene, chapter = 0, muted = false, rave = false) {
    const now = this.ctx.currentTime;
    this.raveMuted=muted||scene==='pause';
    if(rave!==this.rave){this.release();this.rave=rave;this.next=now+.04;}
    chapter = scene === 'menu' ? 0 : Math.max(0, Math.min(5, Math.trunc(chapter) || 0));
    if (scene !== this.scene || chapter !== this.chapter) {
      this.release();
      this.scene = scene; this.chapter = chapter; this.step = 0; this.next = now + .065;
      const tempo = themeFor(scene, chapter).bpm + (scene === 'boss' ? MUSIC.bossTempo : 0);
      this.delay.delayTime.setTargetAtTime(60 / tempo * .75, now, .05);
    }
    const target = muted || scene === 'pause' ? 0 : MUSIC.level * (now < this.duckUntil ? MUSIC.duck : 1);
    if (target !== this.target) { this.bus.gain.setTargetAtTime(target, now, target === 0 ? .06 : .035); this.target = target; }
    if (muted || scene === 'pause' || this.ctx.state === 'suspended') { this.next = now + .04; return; }
    if(rave){this.next=now+.04;return;}
    if (this.next < now - .2) { this.release(); this.next = now + .065; }
    while (this.next < now + .10) {
      this.schedule(this.step, this.next, scene, chapter);
      this.next += stepDuration(scene, chapter, this.step++);
    }
  }
}
