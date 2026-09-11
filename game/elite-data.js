import { ENCORE_ELITES, ENCORE_LABELS } from './elite-encore-data.js';
export const ELITES = {
  ...ENCORE_ELITES,
  precieux: { name: 'Kikor · Le Précieux', hp: 115, speed: 230, power: 15, reach: 85, score: 430, color: '#8fe1b9', height: 126, pattern: 'pounce', windup: .85, active: .55, recovery: 1.5 },
  bolorouet: { name: 'Le Bolorouet', hp: 160, speed: 148, power: 17, reach: 100, score: 520, color: '#e79fbd', height: 154, pattern: 'cigars', windup: 1.05, active: .5, recovery: 2.1 },
  fouine: { name: 'Jo · La Fouine', hp: 125, speed: 185, power: 14, reach: 88, score: 460, color: '#d1a4ff', height: 147, pattern: 'ferret', windup: .75, active: 2.4, recovery: 2.4 },
  princesse: { name: 'Karonux · Princesse', hp: 125, speed: 145, power: 14, reach: 100, score: 450, color: '#ffa8eb', height: 152, pattern: 'magic', windup: 1.15, active: .4, recovery: 2 },
  kayak: { name: 'Yanu · Kayak', hp: 155, speed: 185, power: 17, reach: 155, score: 500, color: '#78e4f4', height: 142, pattern: 'paddle', windup: 1, active: .65, recovery: 1.7 },
  canape: { name: 'Lorenzo · Le Canapé', hp: 185, speed: 140, power: 16, reach: 100, score: 600, color: '#ffcf6f', height: 147, pattern: 'sofaFire', windup: 1.1, active: .5, recovery: 2.3 },
};
export const ELITE_RULES = { fireLimit: 5, projectileLimit: 6, fireDuration: 2.7, sofaHeavyHits: 3, sofaEjectHp: .65, seatTime: .5, landTime: 1.5 };
export const ELITE_LABELS = { pounce: 'MON PRÉCIEUX !', cigars: 'CIGARES · CHANGE DE LIGNE', ferret: 'LA FOUINE TE POURSUIT', magic: 'SORT ARC-EN-CIEL', paddle: 'ATTENTION À LA RAME', sofaFire: 'LE CANAPÉ S’EMBRASE', tantrum: 'ENRAGÉ · RECULE !' };
Object.assign(ELITE_LABELS, ENCORE_LABELS);
export const ELITE_ORDER = Object.keys(ELITES);
