export const W = 1280;
export const H = 720;
export const FLOOR = { top: 448, bottom: 646, left: 55, right: 1225 };
export const STEP = 1 / 60;
export const VERSION = 3;
export const FIGHTERS = [
  { id: 'karonux', name: 'Karonux', title: 'Le Fatigué', hp: 140, speed: 255, power: 19, color: '#ffb34d', special: 'Sieste explosive', technique: 'blast', description: 'Il économise ses forces. Puis il fait tout exploser.', stats: [4, 3, 4] },
  { id: 'jualos', name: 'Jualos', title: 'Le Poporc', hp: 185, speed: 220, power: 24, color: '#f594a9', special: 'Charge Poporc', technique: 'charge', description: 'Une montagne de tendresse. Sauf sur son chemin.', stats: [5, 2, 5] },
  { id: 'yanu', name: 'Yanu', title: 'La Bête', hp: 110, speed: 315, power: 16, color: '#6ee7cf', special: 'Instinct du loup', technique: 'frenzy', description: 'Toujours le premier dans la mêlée. Toujours debout.', stats: [3, 5, 2] },
  { id: 'lorenzo', name: 'Lorenzo', title: 'Crâne de Chmère', hp: 165, speed: 235, power: 22, color: '#ff795c', special: 'Clope infernale', technique: 'fire', description: 'Le crâne lisse, les poings lourds, le sang chaud.', stats: [5, 2, 4] },
  { id: 'jo', name: 'Jo', title: 'La Mouk', hp: 120, speed: 295, power: 17, color: '#c2a3ff', special: 'Tourbillon Mouk', technique: 'spin', description: 'Un petit grain de folie. Un très grand tourbillon.', stats: [3, 5, 3] },
  { id: 'kikor', name: 'Kikor', title: 'Le Peintre', hp: 145, speed: 260, power: 19, color: '#86b9ff', special: 'Toile vivante', technique: 'paint', description: 'Un tableau, un petit bonhomme vert. Et un allié dans la mêlée.', stats: [4, 3, 4] },
  { id: 'gustavax', name: 'Gustavax', title: 'Le Philosophe', hp: 155, speed: 230, power: 21, color: '#e4d183', special: 'Argument définitif', technique: 'gun', description: 'Il a réponse à tout. Surtout au bout de sa manche.', stats: [4, 2, 5] },
];
export const fighter = id => FIGHTERS.find(c => c.id === id) || FIGHTERS[0];
const chapter = (name, short, folder, prefix, quote, boss, color, padded = false) => ({ name, short, quote, boss, color, backgrounds: Array.from({ length: 6 }, (_, i) => `/assets/shared/levels/${folder}/${prefix}${padded ? String(i + 1).padStart(2, '0') : i + 1}.png`) });
export const CHAPTERS = [
  chapter('Le Chêne Maillard', 'Chêne Maillard', 'level1', 'chene_maillard', '« On rentre à pied. Qu’est-ce qui peut arriver ? »', 'karonux', '#ffb34d'),
  chapter('Château de l’Étang', 'L’Étang', 'level2', 'chateau_etang_', '« Je connais un raccourci. Faites-moi confiance. »', 'kikor', '#91beff', true),
  chapter('Stade Colette Besson', 'Le Stade', 'level3', 'stade', '« Le prochain qui marque a gagné. »', 'yanu', '#72e7b7'),
  chapter('Bourg de Saran', 'Le Bourg', 'level4', 'bourg', '« Rendez-vous devant la boulangerie. »', 'lorenzo', '#ff8f79'),
  chapter('Saran by Night', 'Cap Saran', 'level5', 'capsaran', '« Le dernier bus ? Il est déjà passé. »', 'jo', '#b4a3ff'),
  chapter('Collège Montjoie', 'Montjoie', 'level6', 'college_montjoie', '« Une dernière tournée. Pour la bande. »', 'gustavax', '#ffe09a'),
];
export const ENEMIES = {
  remy: { name: 'Rémy', hp: 48, speed: 132, power: 9, reach: 82, score: 100, color: '#ff8873', walk: 3, attack: 3 },
  orelsan: { name: 'Orelsan', hp: 60, speed: 152, power: 10, reach: 86, score: 140, color: '#c2a3ff', walk: 3, attack: 3 },
  charlingals: { name: 'Charlingals', hp: 78, speed: 115, power: 13, reach: 94, score: 180, color: '#ffc46e', walk: 4, attack: 4 },
  guylux: { name: 'Guylux', hp: 70, speed: 140, power: 11, reach: 90, score: 160, color: '#8dbaff', walk: 4, attack: 4 },
  papy_jala: { name: 'Papy Jala', hp: 95, speed: 105, power: 15, reach: 102, score: 210, color: '#a9d280', walk: 3, attack: 4 },
};
export const ACTIONS = ['punch', 'kick', 'special', 'jump', 'dodge'];
export const blankInput = () => ({ x: 0, y: 0, punch: false, kick: false, special: false, jump: false, dodge: false, revive: false, seq: 0, taps: {} });
export const neutralInput = previous => ({ ...blankInput(), seq: previous?.seq || 0, taps: { ...previous?.taps } });
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function sanitizeInput(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) value = {};
  const n = v => Number.isFinite(v) ? clamp(v, -1, 1) : 0;
  const result = { x: n(value.x), y: n(value.y), revive: value.revive === true, seq: Number.isSafeInteger(value.seq) ? clamp(value.seq, 0, 1e12) : 0, taps: {} };
  for (const key of ACTIONS) { result[key] = value[key] === true; result.taps[key] = Number.isSafeInteger(value.taps?.[key]) ? clamp(value.taps[key], 0, 1e9) : 0; }
  return result;
}
export function animation(id, action = 'idle', enemy = false) {
  if (enemy && ENEMIES[id]) {
    const config = ENEMIES[id];
    const type = { idle: 'marche', walk: 'marche', punch: 'attaque', kick: 'attaque', special: 'special', hurt: 'tombe', dead: 'mort' }[action] || 'marche';
    const count = type === 'marche' ? (action === 'idle' ? 1 : config.walk) : type === 'attaque' ? config.attack : type === 'mort' ? 1 : type === 'special' ? 2 : 3;
    return Array.from({ length: count }, (_, i) => ({ url: `/assets/enemies/${id}/${id}_${type}${i + 1}.png` }));
  }
  if (id === 'gustavax') {
    const cells = { idle: [5, 6], walk: [5, 6, 7, 8, 9], punch: [10, 11], kick: [12, 13, 14], special: [30, 33], jump: [15, 16, 17], hurt: [20, 21], dead: [25, 26, 27], dodge: [15, 16] }[action] || [5];
    return cells.map(cell => ({ url: '/assets/gustavax/gustavax_sheet.png', rect: [(cell % 5) * 150, Math.floor(cell / 5) * 140, 150, 140] }));
  }
  const type = { idle: 'idle', walk: 'court', punch: 'poing', kick: 'pied', special: 'pied', jump: id === 'jualos' ? 'saut' : 'saute', hurt: 'tombe', dead: id === 'yanu' ? 'meurt' : 'mort', dodge: 'court' }[action] || 'idle';
  const count = type === 'court' ? 6 : type === 'mort' || type === 'meurt' ? (id === 'karonux' ? 5 : 6) : type === 'poing' || type === 'pied' ? (id === 'jo' ? 3 : 4) : type === 'tombe' ? (id === 'yanu' ? 4 : 5) : 4;
  return Array.from({ length: count }, (_, i) => ({ url: `/assets/${id}/${id}_${type}${id === 'jo' && type === 'saute' ? i + 1 : ` (${i + 1})`}.png` }));
}
