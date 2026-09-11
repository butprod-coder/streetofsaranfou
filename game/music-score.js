// Seven original compositions. Notes are semitone offsets; null is a rest.
// Each theme owns its groove, harmony, bass rhythm and two answering melodies.
export const THEMES = [
  { id: 'menu', title: 'Saran après minuit', bpm: 112, root: 45, swing: .07, voice: 'bell',
    harmony: [0, -5, -2, -7], kick: [0, 6, 8, 11], snare: [4, 12], stabs: [2, 7, 10],
    bass: [0, null, 0, 7, null, 12, 10, null, 0, null, 3, null, 7, 5, null, 3],
    melody: [12, null, 7, 10, 14, null, 12, 7, 10, 12, null, 15, 14, 10, 7, null],
    answer: [19, 15, null, 14, 12, null, 10, 7, 5, 7, 10, null, 7, 3, 2, null] },
  { id: 'street-1', title: 'Bitume électrique', bpm: 124, root: 43, swing: .025, voice: 'fm',
    harmony: [0, -2, -5, -2], kick: [0, 4, 8, 12], snare: [4, 12], stabs: [2, 6, 11, 14],
    bass: [0, null, 12, 0, null, 7, 0, 10, 0, null, 12, 7, null, 3, 7, 10],
    melody: [7, 12, 14, null, 15, 14, 12, 7, 10, null, 7, 3, 7, 10, 12, null],
    answer: [19, null, 17, 15, 14, 12, null, 10, 12, 15, 19, null, 17, 14, 12, 7] },
  { id: 'street-2', title: 'Chrome et néons', bpm: 128, root: 46, swing: .015, voice: 'acid',
    harmony: [0, 0, -7, -5], kick: [0, 4, 8, 12, 15], snare: [4, 12], stabs: [0, 3, 9],
    bass: [0, 12, null, 0, 7, null, 10, 12, 0, 3, 0, null, 12, 10, 7, null],
    melody: [0, 12, null, 10, 7, 12, 3, null, 0, 7, 10, 12, null, 15, 10, 7],
    answer: [12, 19, 15, null, 12, 10, null, 7, 10, 15, 14, 12, 7, null, 3, 2] },
  { id: 'street-3', title: 'Course nocturne', bpm: 130, root: 45, swing: .06, voice: 'fm',
    harmony: [0, -5, 3, -2], kick: [0, 3, 7, 8, 10], snare: [4, 12], stabs: [1, 6, 10, 15],
    bass: [0, null, 7, null, 12, 10, null, 7, 0, 3, null, 5, 7, null, 12, 10],
    melody: [3, 7, null, 12, 10, 7, 5, null, 7, 10, 14, 12, null, 10, 7, 5],
    answer: [15, 14, 12, null, 19, 17, 15, 14, 12, null, 10, 14, 12, 7, 5, null] },
  { id: 'street-4', title: 'Braises sur béton', bpm: 122, root: 41, swing: .10, voice: 'brass',
    harmony: [0, 3, -5, -7], kick: [0, 5, 8, 11], snare: [4, 12, 14], stabs: [0, 7, 13],
    bass: [0, null, 3, 5, 7, null, 10, 7, 12, null, 10, 7, 5, 3, null, 7],
    melody: [10, null, 12, 7, 3, 5, 7, null, 12, 10, null, 7, 15, 12, 10, null],
    answer: [7, 10, 12, 15, null, 14, 12, 10, 7, null, 5, 3, 2, 3, 7, null] },
  { id: 'street-5', title: 'Cyclone urbain', bpm: 134, root: 48, swing: .015, voice: 'bell',
    harmony: [0, -7, -2, -5], kick: [0, 4, 8, 10, 12], snare: [4, 12], stabs: [2, 5, 10, 14],
    bass: [0, 0, null, 12, 7, 0, null, 10, 12, null, 7, 0, 3, null, 7, 10],
    melody: [12, 7, 15, 10, 19, null, 15, 14, 12, 7, 10, null, 14, 10, 7, 3],
    answer: [7, 12, 19, null, 17, 15, 14, 12, 10, 14, 17, 15, 12, null, 10, 7] },
  { id: 'street-6', title: 'Dernier round', bpm: 138, root: 40, swing: 0, voice: 'brass',
    harmony: [0, -2, 3, -7], kick: [0, 4, 6, 8, 12, 14], snare: [4, 12], stabs: [0, 6, 8, 14],
    bass: [0, null, 0, 12, 0, 7, 10, null, 0, 12, 0, 7, 3, 0, 10, 7],
    melody: [0, 7, 12, null, 15, 14, 12, 7, 3, 10, 15, null, 19, 17, 14, 12],
    answer: [24, null, 19, 15, 14, 17, 12, null, 15, 14, 10, 7, 12, 10, 7, 2] },
];

export const MUSIC = { level: 1.12, duck: .76, bossTempo: 8, bars: 32 };
export function themeFor(scene, chapter = 0) {
  return THEMES[scene === 'menu' ? 0 : 1 + Math.max(0, Math.min(5, Math.trunc(chapter) || 0))];
}
export function stepDuration(scene, chapter, step) {
  const t = themeFor(scene, chapter), bpm = t.bpm + (scene === 'boss' ? MUSIC.bossTempo : 0);
  return 60 / bpm / 4 * (1 + (step % 2 ? -t.swing : t.swing));
}
