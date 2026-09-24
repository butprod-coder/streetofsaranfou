// Small inline vectors stay crisp on every HUD size and need no external font.
const art = {
  sleep: '<path d="M5 17h22M7 17v-6h6v6m0-3h12v3M7 17v5m18-5v5M17 5h6l-6 5h6"/>',
  car: '<path d="m5 15 3-7h16l3 7v8H5ZM5 15h22M9 23v3m14-3v3M9 19h2m10 0h2"/>',
  rock: '<path d="m5 24 3-14 8-6 9 7 3 13ZM8 10l8 6 9-5m-9 5v8"/>',
  boar: '<path d="m7 12-2-6 8 4m12 2 2-6-8 4M7 12c-6 13 24 13 18 0-4-5-14-5-18 0ZM11 20h10v5H11ZM10 16h1m10 0h1m-9 6h1m4 0h1"/>',
  shoe: '<path d="m8 6 7 2-2 7 6 5 8 2v5H5V14Zm5 9 5-3m-2 6 5-3M5 23h22"/>',
  wolf: '<path d="m6 5 8 6h4l8-6-2 17-8 6-8-6ZM9 15l4 2m10-2-4 2m-6 4 3 3 3-3"/>',
  shield: '<path d="M16 4 27 8v8c0 6-11 12-11 12S5 22 5 16V8ZM16 9v13m-6-7h12"/>',
  fire: '<path d="M18 3c2 9-7 9-2 15 3-1 4-4 5-6 12 16-16 22-15 7 0-5 5-10 6-13-1 8 4 9 6-3Z"/>',
  dodge: '<path d="M4 10h8M2 16h7m-4 6h7m8-17-6 9 5 4-6 9m1-13 10-3m-5 7 8 4"/><circle cx="24" cy="5" r="2"/>',
  storm: '<path d="M5 7c20-7 31 7 0 6m4 5c18-5 24 4 1 4m4 5h5M9 4h14"/>',
  brush: '<path d="m12 18 12-14 4 4-14 12ZM12 18c-8-1-4 8-9 9 12 3 15-4 9-9Z"/>',
  palette: '<path d="M27 19C34 4 7-2 4 15c-2 9 11 16 14 9 2-5 7 1 9-5Z"/><circle cx="10" cy="12" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="23" cy="12" r="1"/><circle cx="10" cy="20" r="1"/>',
  book: '<path d="M16 8C10 4 5 5 3 6v19c4-2 9-1 13 2 4-3 9-4 13-2V6c-2-1-7-2-13 2ZM16 8v19M7 11l5 1m8 0 5-1"/>',
  belt: '<path d="M3 11h7l3-4h6l3 4h7v12h-7l-3 4h-6l-3-4H3Z"/><path d="m16 11 2 4 4 1-3 3v4l-3-2-3 2v-4l-3-3 4-1Z"/>',
};
Object.assign(art, {
  fist:'<path d="M7 27V16l-3-4 3-3 5 5V7l3-2 3 2 3-1 3 2 3 1v12l-5 6ZM12 14v5m6-12v8m6-7v8M7 23h18"/>',
  head:'<path d="M8 27v-6C2 15 6 4 16 4c8 0 11 5 10 12l3 4h-6v7ZM18 12h7m-4 4h3M8 27h15"/>',
  door:'<path d="M5 26V6h20v20ZM8 9h14v8H8Zm10 12h5M5 26l-3 3m23-3 4 2"/>',
  shoulder:'<path d="M4 28v-9l8-6 9 1 7 8v6ZM12 13l-3-4 3-5 6 1 2 5-4 4M7 20l7 4 9-6"/>',
  oil:'<path d="M17 3c0 7-8 10-8 16a8 8 0 0 0 16 0c0-6-8-10-8-16ZM4 26c-8 5 26 8 25 0M14 18c-3 4 0 5 1 5"/>',
  magnet:'<path d="M5 5h7v11a4 4 0 0 0 8 0V5h7v11a11 11 0 0 1-22 0ZM5 11h7m8 0h7"/>',
  reverse:'<path d="M5 13h14c12 0 12 14 0 14h-7M5 13l7-7M5 13l7 7"/>',
  steer:'<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="3"/><path d="M5 12l8 3m6 0 8-3m-11 7v9"/>',
  crash:'<path d="m15 3 3 8 10-5-5 10 7 5-11-1-3 10-4-9-10 3 6-8-5-7 10 2Z"/>',
  domino:'<path d="m3 22 5-16 7 3-5 16Zm10 3 5-16 7 3-5 16Zm11 0 4-9 3 2-3 9M9 13h1m11 3h1"/>',
  gauge:'<path d="M3 24a13 13 0 1 1 26 0M7 19l4 1m-1-8 3 3m3-8v5m7-1-3 4m5 6h3M16 23l7-12"/><circle cx="16" cy="23" r="3"/>',
  wave:'<path d="M4 27c16-1 16-8 2-10 21-2 22-10 8-12M9 28c22-3 23-13 13-17M2 8l6 2-4 5"/>',
  flag:'<path d="M7 29V4m0 2c8-5 11 5 20 0v13c-9 5-12-5-20 0M3 29h8"/>',
  fortress:'<path d="M4 28V6h5v5h5V6h5v5h5V6h5v22ZM12 28V18h8v10M6 15h3m14 0h3"/>',
  hoof:'<path d="m10 4 5 1-1 10 4 5-3 8H4l1-8 6-4Zm11 0 6 1-2 10 5 5-2 8H18l-1-8 5-4M8 21l-1 6m16-6-1 6"/>',
  meat:'<path d="M8 25c-8-9 0-18 9-18 11 0 16 13 5 20-5 3-10 2-14-2Z"/><ellipse cx="16" cy="18" rx="5" ry="6"/><path d="m20 8 5-5 4 4-5 5"/>',
  food:'<path d="M4 18h24c0 14-24 14-24 0ZM3 17h26M9 13c-6-4 5-4 0-9m7 9c-6-4 5-4 0-9m7 9c-6-4 5-4 0-9"/>',
  heart:'<path d="M16 28C-4 17 3-1 16 9 29-1 36 17 16 28Z"/>',
  target:'<circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="3"/><path d="M16 1v8m0 14v8M1 16h8m14 0h8"/>',
  leap:'<path d="M4 27C4 1 27 1 27 20m-6-5 6 5 4-6M4 27h9m9 0h8"/>',
  claw:'<path d="M9 3 3 28 14 9M19 2l-8 27L24 9M29 3l-8 24 9-14"/>',
  moon:'<path d="M23 3A13 13 0 1 0 29 23C13 25 8 10 23 3Z"/>',
  howl:'<path d="m5 27 1-12 8-9 4-3 2 8 7 2-3 6-9 3-2 5ZM10 14h4m7-6 6-4m-1 14 5 2"/>',
  ghost:'<path d="M6 28V13C6 0 26 0 26 13v15l-5-4-5 4-5-4ZM11 13v3m10-3v3m-8 5h6"/>',
  eye:'<path d="M2 16c9-16 19-16 28 0-9 16-19 16-28 0Z"/><circle cx="16" cy="16" r="5"/>',
  pin:'<path d="M10 3h12l-2 9 6 7H6l6-7ZM16 19v11"/>',
  cigarette:'<path d="m3 23 24-11 3 6L6 29Zm5-2 3 6M24 9c-8-6 6-3 0-8"/>',
  ball:'<circle cx="16" cy="17" r="11"/><path d="M8 8c-4 12 11 19 17 12M12 6c-4 12 11 19 15 10"/>',
  bounce:'<path d="M3 4v24h26M7 12l9 11 9-14m-6 3 6-3 3 6"/>',
  notes:'<path d="M10 23V6l15-3v17M10 10l15-3"/><ellipse cx="6" cy="25" rx="5" ry="3"/><ellipse cx="21" cy="23" rx="5" ry="3"/>',
  boots:'<path d="M5 4h7v12l5 5v5H3V16Zm16 0h7v11l3 6v5H18v-6l4-5M3 22h13m3 0h11"/>',
  wind:'<path d="M2 12h20c12 0 9-13 3-8M3 18h18c12 0 10 12 4 9M4 24h8M6 6h10"/>',
  hand:'<path d="M9 29 3 17l3-3 6 7V6l3-2 2 2v10V3l3-1 2 3v11V6l3-1 2 3v11l3-6 3 1-2 13-5 3Z"/>',
  roller:'<path d="M3 3h22v9H3ZM25 7h4v11H16v12h-5V17h14"/>',
  easel:'<path d="M6 6h20v17H6ZM16 1v5M6 23l-3 8m23-8 3 8M16 23v7M5 25h23M10 18l5-7 7 7"/>',
  repair:'<path d="M6 3c-8 9 1 15 8 11l13 14 3-3-14-13C21 5 12-1 8 3l5 5-5 5-5-5"/>',
  drops:'<path d="M9 3C7 9 2 10 2 15a7 7 0 0 0 14 0c0-5-5-6-7-12ZM24 11c-1 5-6 6-6 11a6 6 0 0 0 12 0c0-5-5-6-6-11Z"/>',
  layers:'<path d="m2 11 14-8 14 8-14 8Zm0 7 14 8 14-8M2 24l14 7 14-7"/>',
  mask:'<path d="M3 7c8 4 18 4 26 0v10C29 32 3 32 3 17ZM7 14l6 2m6 0 6-2M11 22h10"/>',
  swap:'<path d="M3 9h25l-6-6m6 6-6 6M29 23H4l6-6m-6 6 6 6"/>',
  mirror:'<path d="M7 3h18v26H7ZM10 7h12v18H10Zm1 16L21 9m-7 15 7-9"/>',
  ring:'<path d="M3 9 16 3l13 6v15l-13 6L3 24Zm0 8 13 6 13-6M3 9l13 6 13-6M16 15v15M3 6v21m26-21v21"/>',
  elbow:'<path d="m5 4 7 1 4 10 10-3 3 7-17 6-8-17Zm10 12-3 9m11-12 3 6"/>',
  crowd:'<circle cx="16" cy="8" r="4"/><circle cx="5" cy="12" r="3"/><circle cx="27" cy="12" r="3"/><path d="M11 29V17l-4-8m14 20V17l4-8M3 29v-9l-2-3m28 12v-9l2-3M11 18h10"/>',
  crown:'<path d="m3 8 7 7 6-11 6 11 7-7-3 19H6ZM6 23h20"/>',
  skull:'<path d="M8 24C-4 6 7 2 16 2s20 4 8 22v6H8Z"/><circle cx="10" cy="15" r="3"/><circle cx="22" cy="15" r="3"/><path d="m16 18-2 4h4m-6 3v5m8-5v5"/>',
  chains:'<path d="m11 15-5 5c-7 7 3 14 8 7l5-6M13 11l5-6c6-7 16 1 9 8l-5 6M11 21l10-10"/>',
  star:'<path d="m16 2 4 9 10 1-8 7 3 11-9-6-9 6 3-11-8-7 10-1Z"/>',
});
const group = symbol => `<g transform="translate(-2 5) scale(.62)">${art[symbol]}</g><g transform="translate(15 5) scale(.62)">${art[symbol]}</g><g transform="translate(6 11) scale(.68)">${art[symbol]}</g>`;
art.convoy=group('car');art.herd=group('boar');art.pack=group('wolf');art.gallery=group('ghost');art.balls=group('ball');art.twister=group('storm');
export const BRANCH_ICONS = { karonux: ['car', 'door', 'oil'], jualos: ['shield', 'boar', 'food'], yanu: ['target', 'wolf', 'eye'], lorenzo: ['head', 'fire', 'ball'], jo: ['notes', 'storm', 'hand'], kikor: ['easel', 'palette', 'mirror'], gustavax: ['fist', 'elbow', 'skull'] };
export const branchIcon = (kind, branch = 0) => `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${art[BRANCH_ICONS[kind]?.[branch] || 'shield']}</svg>`;

// Each named talent has an intentional subject + action, never a tier-based fallback.
export const TALENT_ART = {
  'Pare-chocs aimanté':['car','magnet'], 'Marche arrière sauvage':['car','reverse'], 'Carambolage':['car','domino'], 'Demi-tour interdit':['steer','swap'], 'Convoi exceptionnel':['convoy','star'],
  'Coup de portière':['door','fist'], 'Dégage du passage':['shoe','wave'], 'Effet domino':['domino','crash'], 'Contrôle technique':['fist','gauge'], 'Démolition express':['door','crash'],
  'Vidange':['oil','drops'], 'Priorité à droite':['shoulder','steer'], 'Aquaplaning':['oil','shoe'], 'Étincelle':['oil','fire'], 'Rond-point de l’enfer':['steer','fire'],
  'Couenne épaisse':['shield','boar'], 'Dette de douleur':['heart','gauge'], 'Remboursement immédiat':['shoe','crash'], 'Derrière moi !':['shield','crowd'], 'Forteresse en marche':['fortress','boots'],
  'Labourage':['boar','steer'], 'Défenses croisées':['boar','reverse'], 'Piétinement':['hoof','crash'], 'Ouvreur de foule':['boar','crowd'], 'La harde':['herd','flag'],
  'Double ration':['fist','shoe'], 'À table !':['food','wave'], 'Ça ouvre l’appétit':['meat','heart'], 'Deuxième service':['food','fist'], 'Banquet de baffes':['food','crown'],
  'Flair':['wolf','target'], 'Bond de chasse':['wolf','leap'], 'Tendon tranché':['claw','shoe'], 'Aucune échappatoire':['target','swap'], 'Chasse sauvage':['wolf','chains'],
  'Griffes profondes':['claw','drops'], 'Hurlement':['howl','wave'], 'Odeur du sang':['wolf','drops'], 'Frénésie lunaire':['moon','claw'], 'La meute fantôme':['pack','moon'],
  'Contre-griffe':['claw','reverse'], 'Après-image':['ghost','dodge'], 'Passe derrière':['dodge','swap'], 'Écho de griffe':['ghost','claw'], 'Instinct absolu':['eye','moon'],
  'Front prioritaire':['head','crash'], 'Tu bouges pas':['shoe','pin'], 'Mauvaise réception':['head','domino'], 'Dernier avertissement':['head','gauge'], 'Tête de démolition':['head','crown'],
  'Braises collantes':['fist','fire'], 'Appel d’air':['fire','wind'], 'Mégot de trop':['cigarette','crash'], 'Feu de voisinage':['fire','crowd'], 'Fournaise':['fire','crown'],
  'Carreau':['ball','target'], 'Bande de billard':['ball','bounce'], 'Cochonnet':['ball','magnet'], 'Double rebond':['bounce','reverse'], 'Concours municipal':['balls','flag'],
  'Changement de rythme':['notes','gauge'], 'Pas croisés':['boots','notes'], 'Encore un tour':['shoe','reverse'], 'Rappel':['ghost','notes'], 'Danse de la Mouk':['boots','star'],
  'Courant d’air':['storm','magnet'], 'Œil du cyclone':['storm','eye'], 'Débris d’air':['storm','wind'], 'Sortie de tempête':['storm','wave'], 'Double tornade':['twister','star'],
  'Main baladeuse':['hand','wave'], 'Revers extensible':['hand','reverse'], 'Retour à l’envoyeur':['hand','ball'], 'Rebond du poing':['fist','bounce'], 'Grande lessive':['hand','storm'],
  'Deuxième pinceau':['easel','brush'], 'Cible du maître':['brush','target'], 'Travail d’équipe':['brush','crowd'], 'Retouche express':['easel','repair'], 'Chef-d’œuvre':['easel','crown'],
  'Peinture fraîche':['fist','drops'], 'Grand coup de rouleau':['roller','drops'], 'Trop de couches':['layers','crash'], 'Éclaboussures':['drops','wave'], 'La rue est une toile':['palette','crash'],
  'Faux Kikor':['ghost','brush'], 'Mauvaise cible':['ghost','target'], 'Changement de perspective':['mirror','swap'], 'Copie du geste':['mirror','fist'], 'Galerie des mirages':['gallery','palette'],
  'Entrée fracassante':['shoulder','crash'], 'Dans les cordes':['ring','bounce'], 'Marteau-pilon':['fist','pin'], 'Le public en redemande':['crowd','notes'], 'Champion du monde':['belt','crown'],
  'Descente du coude':['elbow','wave'], 'Réception musclée':['elbow','crash'], 'Rebond du champion':['elbow','bounce'], 'De coin en coin':['ring','leap'], 'Le ring est partout':['ring','star'],
  'Mauvais présage':['skull','eye'], 'Feu noir':['skull','fire'], 'Dette infernale':['skull','gauge'], 'Malédiction contagieuse':['skull','chains'], 'Sheitan incarné':['skull','crown'],
};
const colors={karonux:'#ffc36b',jualos:'#ffa5ba',yanu:'#8df5cc',lorenzo:'#ff997d',jo:'#d5b5ff',kikor:'#95caff',gustavax:'#f4dca0'};
export function talentIcon(kind, node) {
  const [subject,action]=TALENT_ART[node.name] || [];
  if(!art[subject]||!art[action])throw new Error('Missing talent illustration: '+node.name);
  const accent=['#ffc46b','#cfadff','#78eacb'][node.branchIndex];
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round" data-talent-art="${subject}-${action}"><path d="M4 2h31l11 11v31H4Z" fill="${colors[kind]}" fill-opacity=".08" stroke="${accent}" stroke-opacity=".35"/><g transform="translate(3 3) scale(1.1)" stroke="${colors[kind]}" stroke-width="1.8" fill="${colors[kind]}" fill-opacity=".13">${art[subject]}</g><rect x="27" y="27" width="20" height="20" rx="5" fill="#101722" stroke="${accent}" stroke-width="1.2"/><g transform="translate(28 28) scale(.56)" stroke="${accent}" stroke-width="2.3">${art[action]}</g>${node.ultimate?'<path d="m39 2 2 4 4 1-3 3v4l-3-2-3 2v-4l-3-3 4-1Z" fill="#ffe4a1"/>':''}</svg>`;
}
