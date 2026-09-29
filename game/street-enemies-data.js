// Fictional neighbourhood rivals. Shared by simulation, asset loading and HUD.
import { COSTUME_ENEMIES } from './costume-enemies.js';
export const STREET_ENEMIES = {
  ...COSTUME_ENEMIES,
  albero: { name: 'Albero Chwan', firstName: 'Albero', hp: 145, speed: 158, power: 14, reach: 105, score: 470, color: '#ed546b', height: 151, pattern: 'supporterCharge', alternate: 'megaphone', windup: 1, active: .65, recovery: 1.9, range: 420, distance: 160 },
  oliver: { name: 'Oliver Twist', firstName: 'Oliver', hp: 115, speed: 155, power: 12, reach: 120, score: 440, color: '#60d3bb', height: 151, pattern: 'tacoVolley', alternate: 'sombrero', windup: .95, active: .4, recovery: 2, range: 630, distance: 270 },
  titou: { name: 'Titou', firstName: 'Titou', hp: 175, speed: 120, power: 16, reach: 130, score: 540, color: '#ffad65', height: 170, pattern: 'huntingDog', alternate: 'hunterShove', windup: 1.15, active: .45, recovery: 2.5, range: 620, distance: 260 },
  pichoff: { name: 'Le Taillandier', firstName: 'Le Taillandier', hp: 110, speed: 190, power: 12, reach: 150, score: 460, color: '#c9a0ef', height: 148, pattern: 'bluff', alternate: 'fastTalk', windup: .9, active: .3, recovery: 1.7, range: 180, distance: 95 },
  cedric: { name: 'Cédric Lemaire', firstName: 'Cédric', hp: 125, speed: 130, power: 11, reach: 115, score: 450, color: '#e3cc61', height: 148, pattern: 'puddle', alternate: 'awkwardSlap', windup: 1.1, active: .5, recovery: 2.2, range: 230, distance: 125 },
  lorenzo_raclette: { name: 'Lorenzo · Crâne Fondue', firstName: 'Lorenzo', hp: 135, speed: 128, power: 13, reach: 120, score: 490, color: '#ffd266', height: 154, pattern: 'raclettePan', alternate: 'cheeseSplash', windup: 1, active: .5, recovery: 2.2, range: 250, distance: 135 },
  karonux_om: { name: 'Karonux · Supporter', firstName: 'Karonux', hp: 148, speed: 145, power: 14, reach: 105, score: 500, color: '#f1bd54', height: 157, pattern: 'barrierThrow', alternate: 'megaphoneCharge', windup: 1, active: .55, recovery: 2.1, range: 490, distance: 150 },
  orelsan_om: { name: 'Orelsan · Supporter', firstName: 'Orelsan', hp: 125, speed: 168, power: 12, reach: 95, score: 465, color: '#a9bde1', height: 151, pattern: 'barrierThrow', alternate: 'megaphoneCharge', windup: .9, active: .5, recovery: 1.9, range: 510, distance: 170 },
  gustavax_om: { name: 'Gustavax · Supporter', firstName: 'Gustavax', hp: 170, speed: 122, power: 15, reach: 115, score: 530, color: '#6e9fcc', height: 168, pattern: 'barrierThrow', alternate: 'megaphoneCharge', windup: 1.1, active: .6, recovery: 2.3, range: 475, distance: 145 },
  michelle_police: { name: 'Michelle · Police Municipale', firstName: 'Michelle', hp: 155, speed: 105, power: 13, reach: 560, score: 520, color: '#e2c45d', height: 158, pattern: 'pistolShot', alternate: 'pistolShot', windup: 1.05, active: .25, recovery: 1.8, range: 570, distance: 390 },
  herve_mbk: { name: 'Hervé · MBK 51', firstName: 'Hervé', hp: 190, speed: 225, power: 16, reach: 115, score: 570, color: '#719de0', height: 160, pattern: 'mbkCharge', alternate: 'mbkCharge', windup: 1.15, active: .75, recovery: 2.6, range: 650, distance: 210, vehicle: true },
};
export const STREET_LABELS = {
  supporterCharge: 'LA RÉVOLUTION ! · CHANGE DE LIGNE', megaphone: 'MÉGAPHONE · RECULE !',
  tacoVolley: 'TACOS VOLANTS !', sombrero: 'COUP DE SOMBRERO !',
  huntingDog: 'AU PIED… CHARGE !', hunterShove: 'COUP D’ÉPAULE !',
  bluff: 'REGARDE LÀ-BAS…', fastTalk: 'ATTENDS, ON DISCUTE !',
  puddle: 'ENVIE PRESSANTE · ÉCARTE-TOI !', awkwardSlap: 'MOULINET MALADROIT !',
  raclettePan: 'POÊLON BRÛLANT · CHANGE DE LIGNE !', cheeseSplash: 'FROMAGE FONDU · ÇA COLLE !',
  barrierThrow: 'BARRIÈRE EN APPROCHE · ESQUIVE !', megaphoneCharge: 'MÉGAPHONE · CHARGE DE SUPPORTER !',
  pistolShot: 'TIR DE SOMMATION · BOUGE !', mbkCharge: 'MBK 51 LANCÉE · DÉGAGE DE LA ROUTE !',
};
export const STREET_RULES = { projectileLimit: 5, dogLimit: 2, puddleLimit: 4, puddleDuration: 3.4, barrierLimit: 3 };
