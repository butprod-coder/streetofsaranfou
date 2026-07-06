export const W = 960;
export const H = 540;
export const FLOOR_TOP = 330;
export const FLOOR_BOTTOM = 505;

export const COL = {
  ink: '#0a0712',
  cream: '#f3ead6',
  gold: '#ffcf4d',
  blood: '#e2453f',
  cyan: '#46d0e0',
  grey: '#8a8f98',
};

export const NUM = (n) => parseInt(COL[n].slice(1), 16);

export const FW = 150;
export const FH = 140;

export const FRAMES = {
  idle: [0],
  walk: [5, 6, 7, 8, 9],
  attack: [10, 11, 12, 13],
  jump: [15, 16, 17],
  hurt: [20, 21, 22, 23],
  ko: [25, 26, 27],
};

export const GUST = { gun: 30, shock: 31, enrage: 32, rifle: 33, flame: 34 };

export const F = (s, o) => Object.assign({ fontFamily: 'monospace' }, o);

export const SHEETS = ['karonux', 'jualos', 'yanu', 'lorenzo', 'jo', 'kikor', 'gustavax'];

export const SHEETS_CUSTOM = [
  { key: 'kikor_e', fw: 180, fh: 150 },
  { key: 'makouille', fw: 220, fh: 165 },
];

export const SOLID_DECOR = { obj_caisse: 1, obj_baril: 1, obj_benne: 1 };
