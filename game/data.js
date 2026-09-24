import { ELITES } from './elite-data.js';
import { ENCORE_ELITES } from './elite-encore-data.js';
import { CLASSIC_SPRITES, CLASSIC_POSES } from './classic-sprites.js';
import { HERO_IDS, HERO_POSES } from './hero-sprites.js';
import { STREET_ENEMIES } from './street-enemies-data.js';
export const W = 1280;
export const H = 720;
export const FLOOR = { top: 448, bottom: 646, left: 55, right: 1225 };
export const STEP = 1 / 60;
export const VERSION = 5;
export const FIGHTERS = [
  { id: 'karonux', name: 'Karonux', title: 'Le Fatigué', hp: 140, speed: 255, power: 19, color: '#ffb34d', special: 'Tour de Golf blanche', technique: 'golf', description: 'Pilote sa Golf blanche avec les directions et reprend le combat là où il s’arrête.', stats: [4, 3, 4] },
  { id: 'jualos', name: 'Jualos', title: 'Le Poporc', hp: 185, speed: 220, power: 24, color: '#f594a9', special: 'Charge Poporc', technique: 'charge', description: 'Une montagne de tendresse. Sauf sur son chemin.', stats: [5, 2, 5] },
  { id: 'yanu', name: 'Yanu', title: 'La Bête', hp: 110, speed: 315, power: 16, color: '#6ee7cf', special: 'Instinct du loup', technique: 'frenzy', description: 'Toujours le premier dans la mêlée. Toujours debout.', stats: [3, 5, 2] },
  { id: 'lorenzo', name: 'Lorenzo', title: 'Crâne de Chmère', hp: 165, speed: 235, power: 22, color: '#ff795c', special: 'Clope infernale', technique: 'fire', description: 'Le crâne lisse, les poings lourds, le sang chaud.', stats: [5, 2, 4] },
  { id: 'jo', name: 'Jo', title: 'La Mouk', hp: 120, speed: 295, power: 17, color: '#c2a3ff', special: 'Tourbillon Mouk', technique: 'spin', description: 'Un petit grain de folie. Un très grand tourbillon.', stats: [3, 5, 3] },
  { id: 'kikor', name: 'Kikor', title: 'Le Peintre', hp: 145, speed: 260, power: 19, color: '#86b9ff', special: 'Toile vivante', technique: 'paint', description: 'Un tableau, un petit bonhomme vert. Et un allié dans la mêlée.', stats: [4, 3, 4] },
  { id: 'gustavax', name: 'Gustavax le Sheitan', title: 'Le Sheitan', hp: 155, speed: 230, power: 21, color: '#e4d183', special: 'Le Catcheur', technique: 'wrestle', description: 'Short bleu : +30 % vie, force, vitesse et puissance spéciale ; 30 % de dégâts reçus en moins.', stats: [4, 2, 5] },
];
export const fighter = id => FIGHTERS.find(c => c.id === id) || FIGHTERS[0];
const chapter = (name, short, folder, prefix, quote, boss, color, padded = false) => ({ name, short, quote, boss, color, backgrounds: Array.from({ length: 6 }, (_, i) => `/assets/shared/levels/${folder}/${prefix}${padded ? String(i + 1).padStart(2, '0') : i + 1}.png`) });
export const CHAPTERS = [
  chapter('Le Chêne Maillard', 'Chêne Maillard', 'level1', 'chene_maillard', '« On rentre à pied. Qu’est-ce qui peut arriver ? »', 'karonux', '#ffb34d'),
  chapter('Château de l’Étang', 'L’Étang', 'level2', 'chateau_etang_', '« Je connais un raccourci. Faites-moi confiance. »', 'kikor', '#91beff', true),
  chapter('Stade Colette Besson', 'Le Stade', 'level3', 'stade', '« Le prochain qui marque a gagné. »', 'yanu', '#72e7b7'),
  chapter('Bourg de Saran', 'Le Bourg', 'level4', 'bourg', '« Rendez-vous devant la boulangerie. »', 'lorenzo', '#ff8f79'),
  chapter('Saran by Night', 'Cap Saran', 'level5', 'capsaran', '« Le dernier bus ? Il est déjà passé. »', 'jo', '#b4a3ff'),
  chapter('Collège Montjoie', 'Montjoie', 'level6', 'college_montjoie', '« Une dernière tournée. Pour la bande. »', 'jualos', '#ffe09a'),
];
CHAPTERS.push({name:'Le bureau de Gustavax',short:'Le dernier mot',quote:'« Vous avez fini de jouer ? »',boss:'gustavax',color:'#e8bf73',backgrounds:Array(7).fill('/assets/shared/levels/level7/gustavax-office.png')});
export const ENEMIES = {
  ...Object.fromEntries(Object.entries(ELITES).map(([id, data]) => [id, { ...data, elite: true }])),
  ...STREET_ENEMIES,
  remy: { name: 'Rémy', hp: 54, speed: 145, power: 10, reach: 88, score: 115, color: '#ff8873', walk: 3, attack: 3, style: 'scooter' },
  orelsan: { name: 'Orelsan', hp: 64, speed: 154, power: 11, reach: 92, score: 150, color: '#c2a3ff', walk: 3, attack: 3, style: 'tennis' },
  charlingals: { name: 'Charlingals', hp: 82, speed: 118, power: 13, reach: 98, score: 190, color: '#ffc46e', walk: 4, attack: 4, style: 'knife' },
  guylux: { name: 'Guylux', hp: 74, speed: 142, power: 12, reach: 94, score: 170, color: '#8dbaff', walk: 4, attack: 4, style: 'magic' },
  papy_jala: { name: 'Papy Jala', hp: 100, speed: 108, power: 15, reach: 106, score: 220, color: '#a9d280', walk: 3, attack: 4, style: 'pepper' },
  makouille: { name: 'Makouille', hp: 105, speed: 128, power: 16, reach: 112, score: 230, color: '#e88362', walk: 3, attack: 3, style: 'motorcycle' },
  kikor_e: { name: 'Kikor · Ennemi', hp: 68, speed: 175, power: 12, reach: 88, score: 175, color: '#b9f56d', walk: 3, attack: 3, style: 'skateboard' },
  triso: { name: 'Triso', hp: 76, speed: 116, power: 10, reach: 86, score: 190, color: '#b6d85a', walk: 3, attack: 3 },
};
export const ACTIONS = ['punch', 'kick', 'special', 'jump', 'dodge', 'grab', 'interact'];
export const blankInput = () => ({ x: 0, y: 0, punch: false, kick: false, special: false, jump: false, dodge: false, grab: false, interact: false, revive: false, seq: 0, taps: {} });
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
  if (enemy && STREET_ENEMIES[id]) {
    const cells = { idle: [0], walk: [1, 2], punch: [3, 4], special: [7, 8], hurt: [5], dead: [6] }[action] || [0];
    return cells.map(cell => ({ url: `/assets/enemies/street/${id}.png`, atlas: `street_${id}`, cell }));
  }
  if (enemy && CLASSIC_SPRITES[id]) return (CLASSIC_POSES[action] || [0]).map(cell => ({ url: `/assets/enemies/classics/${id}.png`, atlas: id, cell }));
  if (enemy && ELITES[id]) {
    const cells = { idle: [0], walk: [1, 2], punch: [3, 4], special: [3, 4], hurt: [5], dead: [6] }[action] || [0];
    return cells.map(cell => ({ url: `/assets/enemies/${ENCORE_ELITES[id] ? 'encore' : 'elites'}/${id}.png`, atlas: id, cell }));
  }
  if (enemy && ENEMIES[id]) {
    if (id === 'triso' && action === 'special') return [1, 2, 3].map((n, i) => ({ url: `/assets/enemies/triso/triso_special${n}.png`, rect: [0, 0, [330, 320, 300][i], 330], referenceHeight: 330 }));
    const config = ENEMIES[id];
    // Triso's wide special images include the spit; render that FX separately, not as a giant actor.
    const type = id === 'triso' && action === 'special' ? 'attaque' : { idle: 'marche', walk: 'marche', punch: 'attaque', kick: 'attaque', special: 'special', hurt: 'tombe', dead: 'mort' }[action] || 'marche';
    const count = type === 'marche' ? (action === 'idle' ? 1 : config.walk) : type === 'attaque' ? config.attack : type === 'mort' ? 1 : type === 'special' ? 2 : 3;
    return Array.from({ length: count }, (_, i) => ({ url: `/assets/enemies/${id}/${id}_${type}${i + 1}.png` }));
  }
  if (HERO_IDS.includes(id)) {
    return (HERO_POSES[action] || [0]).map(cell => ({ url: `/assets/heroes/${id}.png`, atlas: `hero_${id}`, cell }));
  }
  const type = { idle: 'idle', walk: 'court', punch: 'poing', kick: 'pied', special: 'pied', jump: id === 'jualos' ? 'saut' : 'saute', hurt: 'tombe', dead: id === 'yanu' ? 'meurt' : 'mort', dodge: 'court' }[action] || 'idle';
  const count = type === 'court' ? 6 : type === 'mort' || type === 'meurt' ? (id === 'karonux' ? 5 : 6) : type === 'poing' || type === 'pied' ? (id === 'jo' ? 3 : 4) : type === 'tombe' ? (id === 'yanu' ? 4 : 5) : 4;
  return Array.from({ length: count }, (_, i) => ({ url: `/assets/${id}/${id}_${type}${id === 'jo' && type === 'saute' ? i + 1 : ` (${i + 1})`}.png` }));
}
