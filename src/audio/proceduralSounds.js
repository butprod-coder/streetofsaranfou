/** Génération de sons rétro via Web Audio (aucun fichier mp3/wav requis). */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function fillBuffer(ctx, duration, sampleFn) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    data[i] = clamp(sampleFn(t, i, len, sr), -1, 1);
  }
  return buf;
}

function envelope(t, attack, decay, duration) {
  if (t < attack) return t / attack;
  if (t >= duration) return 0;
  return Math.exp(-((t - attack) / decay) * 4);
}

function square(phase) {
  return phase % 1 < 0.5 ? 1 : -1;
}

function noise() {
  return Math.random() * 2 - 1;
}

function tone(t, freq, type = 'square') {
  const phase = (t * freq) % 1;
  if (type === 'square') return square(phase) * 0.55;
  if (type === 'saw') return (2 * phase - 1) * 0.45;
  return Math.sin(2 * Math.PI * freq * t) * 0.6;
}

export function makePunchBuffer(ctx) {
  return fillBuffer(ctx, 0.09, (t) => {
    const freq = 380 - t * 2200;
    const e = envelope(t, 0.004, 0.05, 0.09);
    return (tone(t, freq, 'square') * 0.55 + noise() * 0.35) * e * 0.7;
  });
}

export function makeHitBuffer(ctx) {
  return fillBuffer(ctx, 0.07, (t) => {
    const freq = 280 - t * 1400;
    const e = envelope(t, 0.003, 0.04, 0.07);
    return (tone(t, freq, 'square') * 0.5 + noise() * 0.4) * e * 0.65;
  });
}

export function makeHurtBuffer(ctx) {
  return fillBuffer(ctx, 0.14, (t) => {
    const freq = 220 - t * 600;
    const e = envelope(t, 0.006, 0.08, 0.14);
    return (tone(t, freq, 'saw') * 0.5 + noise() * 0.25) * e * 0.75;
  });
}

export function makeShootBuffer(ctx) {
  return fillBuffer(ctx, 0.06, (t) => {
    const e = envelope(t, 0.002, 0.03, 0.06);
    return (tone(t, 920, 'square') * 0.4 + tone(t, 460, 'square') * 0.25 + noise() * 0.2) * e * 0.6;
  });
}

export function makeJumpBuffer(ctx) {
  return fillBuffer(ctx, 0.11, (t) => {
    const freq = 180 + t * 2800;
    const e = envelope(t, 0.004, 0.06, 0.11);
    return tone(t, freq, 'square') * e * 0.55;
  });
}

export function makePickupBuffer(ctx) {
  const notes = [523, 659, 784];
  return fillBuffer(ctx, 0.22, (t) => {
    const step = Math.floor(t / 0.07);
    const freq = notes[Math.min(step, notes.length - 1)];
    const local = (t % 0.07) / 0.07;
    const e = envelope(local * 0.07, 0.003, 0.04, 0.07);
    return tone(t, freq, 'square') * e * 0.5;
  });
}

export function makeExplosionBuffer(ctx) {
  return fillBuffer(ctx, 0.28, (t) => {
    const e = envelope(t, 0.004, 0.12, 0.28);
    const low = tone(t, 90 + t * 40, 'saw') * 0.35;
    return (noise() * 0.75 + low) * e * 0.8;
  });
}

export function makeSpecialBuffer(ctx) {
  return fillBuffer(ctx, 0.35, (t) => {
    const freq = 160 + t * 900;
    const e = envelope(t, 0.01, 0.14, 0.35);
    return (
      tone(t, freq, 'square') * 0.35 +
      tone(t, freq * 1.5, 'square') * 0.25 +
      noise() * 0.15
    ) * e * 0.7;
  });
}

export function makeSelectBuffer(ctx) {
  return fillBuffer(ctx, 0.05, (t) => tone(t, 640, 'square') * envelope(t, 0.002, 0.03, 0.05) * 0.45);
}

export function makeConfirmBuffer(ctx) {
  return fillBuffer(ctx, 0.12, (t) => {
    const freq = t < 0.06 ? 520 : 780;
    const local = t < 0.06 ? t : t - 0.06;
    const e = envelope(local, 0.003, 0.04, 0.06);
    return tone(t, freq, 'square') * e * 0.5;
  });
}

export function makeBossBuffer(ctx) {
  return fillBuffer(ctx, 0.45, (t) => {
    const e = envelope(t, 0.02, 0.2, 0.45);
    return (
      tone(t, 110, 'saw') * 0.5 +
      tone(t, 55, 'square') * 0.35 +
      noise() * 0.1
    ) * e * 0.75;
  });
}

export function makeVictoryBuffer(ctx) {
  const notes = [392, 523, 659, 784, 988];
  return fillBuffer(ctx, 0.55, (t) => {
    const step = Math.floor(t / 0.1);
    const freq = notes[Math.min(step, notes.length - 1)];
    const local = (t % 0.1) / 0.1;
    const e = envelope(local * 0.1, 0.004, 0.06, 0.1);
    return tone(t, freq, 'square') * e * 0.55;
  });
}

export function makeGameOverBuffer(ctx) {
  const notes = [440, 370, 311, 247];
  return fillBuffer(ctx, 0.5, (t) => {
    const step = Math.floor(t / 0.12);
    const freq = notes[Math.min(step, notes.length - 1)];
    const local = (t % 0.12) / 0.12;
    const e = envelope(local * 0.12, 0.005, 0.08, 0.12);
    return tone(t, freq, 'saw') * e * 0.55;
  });
}

export function makeKoBuffer(ctx) {
  return fillBuffer(ctx, 0.3, (t) => {
    const freq = 300 - t * 700;
    const e = envelope(t, 0.01, 0.15, 0.3);
    return (tone(t, freq, 'square') * 0.5 + noise() * 0.2) * e * 0.7;
  });
}

/** Boucle ambiance menu (~6 s). */
export function makeTitleMusicBuffer(ctx) {
  const bpm = 92;
  const beat = 60 / bpm;
  const duration = beat * 8;
  const bass = [110, 110, 147, 110, 98, 98, 131, 98];
  return fillBuffer(ctx, duration, (t) => {
    const beatIdx = Math.floor(t / beat) % 8;
    const local = (t % beat) / beat;
    const bassFreq = bass[beatIdx];
    const bassEnv = envelope(local * beat, 0.02, beat * 0.35, beat);
    const melodyNotes = [0, 0, 440, 0, 0, 523, 0, 587];
    const melFreq = melodyNotes[beatIdx];
    let mel = 0;
    if (melFreq > 0 && local > 0.15) {
      mel = tone(t, melFreq, 'square') * envelope(local * beat - 0.15 * beat, 0.01, beat * 0.5, beat) * 0.18;
    }
    return tone(t, bassFreq, 'square') * bassEnv * 0.22 + mel;
  });
}

/**
 * Boucle de combat paramétrable (8 temps).
 * bass: 8 fréquences · lead: 8 fréquences (0 = silence) · doubleKick: kick aussi au demi-temps.
 */
function makeFightLoop(ctx, { bpm, bass, bassType = 'square', lead = null, leadVol = 0.14, doubleKick = false, hatVol = 0.12 }) {
  const beat = 60 / bpm;
  const duration = beat * 8;
  return fillBuffer(ctx, duration, (t) => {
    const beatIdx = Math.floor(t / beat) % 8;
    const local = (t % beat) / beat;
    const bassFreq = bass[beatIdx];
    let kick = local < 0.08 ? envelope(t % beat, 0.001, 0.04, beat) * noise() * 0.35 : 0;
    if (doubleKick && local > 0.5 && local < 0.56) {
      kick += envelope((local - 0.5) * beat, 0.001, 0.03, beat) * noise() * 0.22;
    }
    const bassEnv = envelope(local * beat, 0.005, beat * 0.25, beat);
    const hat = local > 0.45 && local < 0.52 ? noise() * hatVol : 0;
    let mel = 0;
    if (lead) {
      const lf = lead[beatIdx];
      if (lf > 0 && local > 0.1) {
        mel = tone(t, lf, 'square') * envelope((local - 0.1) * beat, 0.008, beat * 0.4, beat) * leadVol;
      }
    }
    return tone(t, bassFreq, bassType) * bassEnv * 0.2 + kick + hat + mel;
  });
}

/** Boucle combat par défaut (compatibilité : clé 'music_fight'). */
export function makeFightMusicBuffer(ctx) {
  return makeFightLoop(ctx, { bpm: 128, bass: [98, 98, 123, 98, 87, 87, 110, 87] });
}

/** Variante nerveuse — ruelles nocturnes. */
export function makeFightMusic2Buffer(ctx) {
  return makeFightLoop(ctx, {
    bpm: 140,
    bass: [110, 110, 131, 147, 98, 98, 117, 131],
    lead: [0, 440, 0, 523, 0, 440, 587, 0],
    hatVol: 0.15,
  });
}

/** Variante lourde et menaçante — basse saw. */
export function makeFightMusic3Buffer(ctx) {
  return makeFightLoop(ctx, {
    bpm: 116,
    bass: [82, 82, 98, 82, 73, 73, 87, 92],
    bassType: 'saw',
    hatVol: 0.09,
  });
}

/** Variante mélodique — plus lumineuse. */
export function makeFightMusic4Buffer(ctx) {
  return makeFightLoop(ctx, {
    bpm: 134,
    bass: [92, 110, 92, 123, 87, 104, 87, 117],
    lead: [349, 0, 392, 0, 440, 0, 523, 466],
    leadVol: 0.16,
  });
}

/** Thème de boss — grave, double kick, sirène d'alerte. */
export function makeBossMusicBuffer(ctx) {
  const bpm = 150;
  const beat = 60 / bpm;
  const duration = beat * 8;
  const bass = [65, 65, 78, 65, 62, 62, 73, 78];
  return fillBuffer(ctx, duration, (t) => {
    const beatIdx = Math.floor(t / beat) % 8;
    const local = (t % beat) / beat;
    let kick = local < 0.08 ? envelope(t % beat, 0.001, 0.04, beat) * noise() * 0.4 : 0;
    if (local > 0.5 && local < 0.56) {
      kick += envelope((local - 0.5) * beat, 0.001, 0.03, beat) * noise() * 0.28;
    }
    const bassEnv = envelope(local * beat, 0.005, beat * 0.3, beat);
    // Sirène lente sur toute la boucle
    const siren = tone(t, 620 + Math.sin((t / duration) * Math.PI * 2) * 140, 'sine') * 0.06;
    const hat = local > 0.45 && local < 0.5 ? noise() * 0.1 : 0;
    return (
      tone(t, bass[beatIdx], 'saw') * bassEnv * 0.24 +
      tone(t, bass[beatIdx] * 2, 'square') * bassEnv * 0.08 +
      kick +
      hat +
      siren
    );
  });
}
