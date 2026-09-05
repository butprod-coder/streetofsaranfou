export class Audio {
  constructor(muted = false) { this.muted = muted; this.context = null; this.music = false; this.beat = 0; this.nextBeat = 0; this.chapter = 0; }
  wake() {
    if (this.muted) return;
    try {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = .24; this.master.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      this.context.resume().catch(() => {});
    } catch { /* The game remains playable without an audio device. */ }
  }
  mute(value) { this.muted = value; if (this.master) this.master.gain.setTargetAtTime(value ? 0 : .24, this.context.currentTime, .03); if (!value) this.wake(); }
  tone(freq, length, volume = .2, type = 'triangle', when = 0, end = freq) {
    if (!this.context || this.muted) return;
    const at = when || this.context.currentTime, osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, at); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + length);
    gain.gain.setValueAtTime(.001, at); gain.gain.linearRampToValueAtTime(volume, at + .004); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    osc.connect(gain).connect(this.master); osc.start(at); osc.stop(at + length + .01); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  hiss(length, volume, when = 0, freq = 1600) {
    if (!this.context || this.muted) return;
    const at = when || this.context.currentTime, source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = freq;
    gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    source.connect(filter).connect(gain).connect(this.master); source.start(at); source.stop(at + length); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  effect(event) {
    if (event.type === 'levelup') { for (const [i, note] of [440, 554, 659, 880].entries()) this.tone(note, .32, .2, 'triangle', this.context?.currentTime + i * .09); }
    if (event.type === 'hit') { this.tone(event.heavy ? 105 : 150, .12, .65, 'triangle', 0, 32); this.hiss(.07, event.heavy ? .22 : .12, 0, 650); }
    else if (event.type === 'swing' && !event.special) this.hiss(.07, .06, 0, 2200);
    else if (event.type === 'special') { this.tone(70, .4, .4, 'sawtooth', 0, 350); this.hiss(.3, .15); }
    else if (event.type === 'pickup' || event.type === 'revive') { this.tone(520, .16, .25); this.tone(780, .22, .2, 'sine', this.context?.currentTime + .08); }
    else if (event.type === 'dodge') this.hiss(.14, .12, 0, 3300);
    else if (event.type === 'clear') { this.tone(330, .3, .2); this.tone(440, .35, .15, 'triangle', this.context?.currentTime + .1); this.tone(660, .4, .15, 'triangle', this.context?.currentTime + .2); }
    else if (event.type === 'break') this.hiss(.15, .3, 0, 500);
  }
  confirm() { this.wake(); this.tone(430, .075, .15, 'square', 0, 600); }
  update(active, chapter = 0) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    if (!active) { this.nextBeat = now; return; }
    if (this.nextBeat < now) this.nextBeat = now;
    const roots = [55, 65.4, 61.7, 55, 73.4, 65.4];
    while (this.nextBeat < now + .09) {
      const at = this.nextBeat, beat = this.beat++ % 32, root = roots[chapter];
      if (beat % 4 === 0) this.tone(130, .15, .45, 'sine', at, 35);
      if (beat % 8 === 4) { this.hiss(.11, .12, at, 950); this.tone(180, .09, .11, 'triangle', at, 70); }
      this.hiss(.028, beat % 2 ? .025 : .055, at, 7000);
      const bass = [0, 0, 7, 0, 10, 0, 7, 3][Math.floor(beat / 2) % 8];
      if (beat % 2 === 0) this.tone(root * 2 ** (bass / 12), .19, .19, 'sawtooth', at);
      if (beat % 4 === 2) this.tone(root * 4 * 2 ** ([0, 7, 10, 12][Math.floor(beat / 8)] / 12), .23, .047, 'triangle', at);
      this.nextBeat += 60 / 112 / 4;
    }
  }
}
