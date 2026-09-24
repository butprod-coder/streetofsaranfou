// One generated atlas, with hand-tuned cells preserving each complete silhouette.
// Decorations are render-only: no HP, loot, collision or network entity IDs.
const definitions = [
  ['bench', 92, [0, 0, .35, .205]],
  ['oakPlanter', 140, [.35, 0, .67, .205]],
  ['bicycle', 105, [.67, 0, 1, .205]],
  ['stoneUrn', 98, [0, .205, .35, .365]],
  ['estateFence', 106, [.35, .205, .67, .365]],
  ['reeds', 103, [.67, .205, 1, .365]],
  ['trainingGoal', 108, [0, .365, .35, .499]],
  ['hurdle', 70, [.35, .365, .67, .499]],
  ['ballCart', 90, [.67, .365, 1, .499]],
  ['cafeTable', 100, [0, .499, .35, .657]],
  ['chalkboard', 98, [.35, .499, .67, .657]],
  ['flowerStand', 103, [.67, .499, 1, .65]],
  ['shoppingCarts', 104, [0, .657, .37, .817]],
  ['bikeRack', 57, [.37, .657, .67, .817]],
  ['posterLightbox', 145, [.67, .65, 1, .817]],
  ['picnicTable', 92, [0, .817, .37, 1]],
  ['schoolLockers', 137, [.37, .817, .67, 1]],
  ['scooterBag', 100, [.67, .817, 1, 1]],
];

export const SCENERY_SPRITES = Object.fromEntries(definitions.map(([name, height, cell]) => [
  `decor_${name}`, { file: 'neighborhood-props', folder: 'shared/scenery', cols: 1, rows: 1, height, cells: [cell] },
]));

export const CHAPTER_DECOR = Array.from({ length: 6 }, (_, chapter) =>
  definitions.slice(chapter * 3, chapter * 3 + 3).map(([name]) => `decor_${name}`));

export const THEME_NAMES = ['residential', 'estate', 'stadium', 'village', 'night', 'school'];
const labels = [
  ['Banc', 'Chêne en bac', 'Vélo à panier', 'Lampadaire', 'Borne incendie', 'Boîte aux lettres', 'Haie en bac', 'Clôture en bois', 'Pots de jardin', 'Arrêt de bus', 'Dévidoir', 'Niche'],
  ['Vasque fleurie', 'Grille du domaine', 'Roseaux', 'Banc en pierre', 'Cadran solaire', 'Lion sculpté', 'Barque', 'Lanterne', 'Bain à oiseaux', 'Topiaire', 'Panneau du parc', 'Fontaine'],
  ['But d’entraînement', 'Haie d’athlétisme', 'Chariot de ballons', 'Banc de touche', 'Cônes', 'Tapis roulé', 'Starting-blocks', 'Tableau de score', 'Sac de sport', 'Drapeau de corner', 'Rack de ballons', 'Podium'],
  ['Terrasse', 'Ardoise', 'Étal de fleurs', 'Présentoir du boulanger', 'Parasol fermé', 'Étal de légumes', 'Boîte postale', 'Bornes à chaîne', 'Présentoir de journaux', 'Chaise de café', 'Olivier', 'Pompe à eau'],
  ['Caddies', 'Arceaux à vélos', 'Affiche lumineuse', 'Horodateur', 'Borne de parking', 'Parasol', 'Trottinette électrique', 'Barrière de chantier', 'Cône lumineux', 'Jardinière', 'Distributeur', 'Chevalet publicitaire'],
  ['Table de pique-nique', 'Casiers', 'Trottinette et sac', 'Bureau scolaire', 'Vélo', 'Panier à ballons', 'Panneau d’affichage', 'Tapis de gym', 'Chariot à livres', 'Plante grimpante', 'Banc et cartable', 'Tableau blanc'],
];
const heights = [
  [86, 135, 103, 205, 67, 94, 90, 91, 62, 177, 62, 78],
  [97, 108, 94, 86, 99, 136, 75, 190, 99, 136, 125, 121],
  [108, 64, 86, 82, 48, 60, 32, 123, 46, 139, 95, 65],
  [100, 95, 96, 93, 170, 90, 110, 72, 111, 81, 146, 113],
  [97, 52, 150, 129, 69, 172, 94, 92, 79, 108, 149, 97],
  [89, 141, 89, 88, 98, 87, 157, 56, 93, 142, 89, 133],
];
export const THEME_DECOR = THEME_NAMES.map((theme, chapter) => labels[chapter].map((label, cell) => {
  const key = `decor_${theme}_${cell}`;
  SCENERY_SPRITES[key] = { file: theme, folder: 'shared/scenery', cols: 1, rows: 1, height: heights[chapter][cell],
    cells: [[cell % 4 / 4, Math.floor(cell / 4) / 3, (cell % 4 + 1) / 4, (Math.floor(cell / 4) + 1) / 3]] };
  return { key, label, height: heights[chapter][cell] };
}));
export const DECOR_CATALOG = [...THEME_DECOR.flat(), ...definitions.map(([name, height]) => ({ key: `decor_${name}`, label: `Original · ${name}`, height }))];

// Streets have no ambient props; only gameplay crates and explosive barrels remain.
export function streetDecor() {
  return [];
}
