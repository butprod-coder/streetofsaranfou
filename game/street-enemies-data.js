// Fictional neighbourhood rivals. Shared by simulation, asset loading and HUD.
export const STREET_ENEMIES = {
  albero: { name: 'Albero Chwan', firstName: 'Albero', hp: 145, speed: 158, power: 14, reach: 105, score: 470, color: '#ed546b', height: 151, pattern: 'supporterCharge', alternate: 'megaphone', windup: 1, active: .65, recovery: 1.9, range: 420, distance: 160 },
  oliver: { name: 'Oliver Twist', firstName: 'Oliver', hp: 115, speed: 155, power: 12, reach: 120, score: 440, color: '#60d3bb', height: 151, pattern: 'tacoVolley', alternate: 'sombrero', windup: .95, active: .4, recovery: 2, range: 630, distance: 270 },
  titou: { name: 'Titou', firstName: 'Titou', hp: 175, speed: 120, power: 16, reach: 130, score: 540, color: '#ffad65', height: 170, pattern: 'huntingDog', alternate: 'hunterShove', windup: 1.15, active: .45, recovery: 2.5, range: 620, distance: 260 },
  pichoff: { name: 'Le Taillandier', firstName: 'Le Taillandier', hp: 110, speed: 190, power: 12, reach: 150, score: 460, color: '#c9a0ef', height: 148, pattern: 'bluff', alternate: 'fastTalk', windup: .9, active: .3, recovery: 1.7, range: 180, distance: 95 },
  cedric: { name: 'Cédric Lemaire', firstName: 'Cédric', hp: 125, speed: 130, power: 11, reach: 115, score: 450, color: '#e3cc61', height: 148, pattern: 'puddle', alternate: 'awkwardSlap', windup: 1.1, active: .5, recovery: 2.2, range: 230, distance: 125 },
};
export const STREET_LABELS = {
  supporterCharge: 'LA RÉVOLUTION ! · CHANGE DE LIGNE', megaphone: 'MÉGAPHONE · RECULE !',
  tacoVolley: 'TACOS VOLANTS !', sombrero: 'COUP DE SOMBRERO !',
  huntingDog: 'AU PIED… CHARGE !', hunterShove: 'COUP D’ÉPAULE !',
  bluff: 'REGARDE LÀ-BAS…', fastTalk: 'ATTENDS, ON DISCUTE !',
  puddle: 'ENVIE PRESSANTE · ÉCARTE-TOI !', awkwardSlap: 'MOULINET MALADROIT !',
};
export const STREET_RULES = { projectileLimit: 5, dogLimit: 2, puddleLimit: 4, puddleDuration: 3.4 };
