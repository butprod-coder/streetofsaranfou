import { Soundtrack, musicScene } from './music.js';
import { audioSettings, AUDIO_SAVE_KEY } from './audio-settings.js';

export class Audio {
  constructor(muted = false) {
    this.muted = muted; this.context = null; this.soundtrack = null; this.lastSpeech = -10;
    let saved; try { saved = JSON.parse(localStorage.getItem(AUDIO_SAVE_KEY)); } catch {}
    this.volumes = audioSettings(saved);
  }
  setVolume(key, value) {
    if (!(key in this.volumes)) return;
    this.volumes = audioSettings({ ...this.volumes, [key]: value });
    try { localStorage.setItem(AUDIO_SAVE_KEY, JSON.stringify(this.volumes)); } catch {}
    this.applyVolumes();
    window.speechSynthesis?.cancel();
  }
  applyVolumes() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : .24 * this.volumes.master, now, .035);
    this.musicBus.gain.setTargetAtTime(this.volumes.music, now, .035);
    this.effectsBus.gain.setTargetAtTime(this.volumes.effects, now, .035);
  }
  wake() {
    if (this.muted) return;
    try {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = this.muted ? 0 : .24 * this.volumes.master; this.master.connect(this.context.destination);
        this.musicBus = this.context.createGain(); this.musicBus.gain.value = this.volumes.music; this.musicBus.connect(this.master);
        this.effectsBus = this.context.createGain(); this.effectsBus.gain.value = this.volumes.effects; this.effectsBus.connect(this.master);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.soundtrack = new Soundtrack(this.context, this.musicBus, this.noise);
      }
      this.context.resume().catch(() => {});
    } catch { /* The game remains playable without an audio device. */ }
  }
  mute(value) { this.muted = value; this.applyVolumes(); if (value) window.speechSynthesis?.cancel(); else this.wake(); }
  tone(freq, length, volume = .2, type = 'triangle', when = 0, end = freq) {
    if (!this.context || this.muted) return;
    const at = when || this.context.currentTime, osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, at); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + length);
    gain.gain.setValueAtTime(.001, at); gain.gain.linearRampToValueAtTime(volume, at + .004); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    osc.connect(gain).connect(this.effectsBus); osc.start(at); osc.stop(at + length + .01); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  hiss(length, volume, when = 0, freq = 1600) {
    if (!this.context || this.muted) return;
    const at = when || this.context.currentTime, source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = freq;
    gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    source.connect(filter).connect(gain).connect(this.effectsBus); source.start(at); source.stop(at + length); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  effect(event) {
    if (event.type === 'taunt') {
      this.say(event.label);
      if (event.label === 'BUUUUUUUUU') { this.tone(115, .65, .28, 'sawtooth', 0, 55); this.hiss(.5, .12, 0, 450); }
      if (event.label === 'HAHAHA !') { for (let i = 0; i < 3; i++) this.tone(150 + i % 2 * 65, .12, .17, 'triangle', this.context?.currentTime + i * .16, 90); }
    }
    if (['hit', 'explosion', 'thunder', 'special'].includes(event.type)) this.soundtrack?.duck();
    if (event.type === 'talent') { for (const [i, note] of [440, 554, 659, 880].entries()) this.tone(note, .32, .2, 'triangle', this.context?.currentTime + i * .09); }
    if (event.type === 'hit') { this.tone(event.heavy ? 105 : 150, .12, .65, 'triangle', 0, 32); this.hiss(.07, event.heavy ? .22 : .12, 0, 650); }
    else if (event.type === 'swing' && !event.special) this.hiss(.07, .06, 0, 2200);
    else if (event.type === 'skid') this.hiss(.18, .08, 0, 650);
    else if (event.type === 'freight') { this.tone(240, .16, .16, 'square'); this.tone(180, .24, .16, 'square', this.context?.currentTime + .22); this.hiss(.45, .12, 0, 360); }
    else if (event.type === 'belly') { this.tone(160, .3, .25, 'triangle', 0, 45); this.hiss(.1, .08, 0, 400); }
    else if (event.type === 'special') { this.tone(event.kind === 'thunder' ? 95 : 70, .4, .4, 'sawtooth', 0, 350); this.hiss(.3, .15); }
    else if (event.type === 'thunder') { this.tone(65, .75, .6, 'triangle', 0, 22); this.hiss(.6, .32, 0, 90); }
    else if (event.type === 'ember') { this.tone(120, .2, .18, 'triangle', 0, 30); this.hiss(.16, .14, 0, 300); }
    else if (event.type === 'spit') { this.tone(170, .18, .18, 'sawtooth', 0, 55); this.hiss(.15, .1, 0, 600); }
    else if (event.type === 'pickup' || event.type === 'revive') { this.tone(520, .16, .25); this.tone(780, .22, .2, 'sine', this.context?.currentTime + .08); }
    else if (event.type === 'dodge') this.hiss(.14, .12, 0, 3300);
    else if (event.type === 'surprise') { this.tone(220, .2, .22, 'square'); this.tone(440, .3, .18, 'triangle', this.context?.currentTime + .18); }
    else if (event.type === 'explosion') { this.tone(90, .4, .6, 'triangle', 0, 22); this.hiss(.4, .35, 0, 180); }
    else if (event.type === 'clear') { this.tone(330, .3, .2); this.tone(440, .35, .15, 'triangle', this.context?.currentTime + .1); this.tone(660, .4, .15, 'triangle', this.context?.currentTime + .2); }
    else if (event.type === 'break') this.hiss(.15, .3, 0, 500);
    else if (event.type === 'gunshot') { this.hiss(.10, .3, 0, 2200); this.tone(105, .1, .32, 'triangle', 0, 35); }
    else if (event.type === 'grab' || event.type === 'throw') this.hiss(.12, .18, 0, 1100);
    else if (event.type === 'equip') this.tone(610, .11, .16, 'triangle');
  }
  confirm() { this.wake(); this.tone(430, .075, .15, 'square', 0, 600); }
  say(text) {
    if (this.muted || !this.context || !this.volumes.master || !this.volumes.effects || this.context.currentTime - this.lastSpeech < 4) return;
    const voice = window.speechSynthesis?.getVoices().find(v => v.localService && /^fr/i.test(v.lang));
    if (!voice) return; // Caption remains visible, never request a remote speech service.
    this.lastSpeech = this.context.currentTime;
    const line = new SpeechSynthesisUtterance(text); line.voice = voice; line.lang = 'fr-FR'; line.pitch = 1.35; line.rate = 1.15;
    line.volume = this.volumes.master * this.volumes.effects * .45;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(line);
  }
  update(active, chapter = 0, boss = false, paused = false) {
    if (paused) window.speechSynthesis?.cancel();
    this.soundtrack?.update(musicScene(active, paused, boss), chapter, this.muted);
  }
}
