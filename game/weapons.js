// Arcade values, shared by solo and the authoritative cooperative simulation.
export const WEAPONS = {
  knife: { name: 'Couteau', cell: 0, uses: 10, power: 1.65, range: 140, band: 48, windup: .10, duration: .31, width: 42 },
  bat: { name: 'Batte', cell: 1, uses: 8, power: 2.2, range: 182, band: 68, windup: .22, duration: .56, width: 74 },
  pistol: { name: 'Pistolet', cell: 2, uses: 8, power: 1.9, range: 710, band: 29, windup: .13, duration: .4, width: 42, gun: true },
  shotgun: { name: 'Fusil à pompe', cell: 3, uses: 5, power: 2.8, range: 430, band: 72, windup: .22, duration: .85, width: 85, gun: true },
  smg: { name: 'Pistolet-mitrailleur', cell: 4, uses: 18, power: .95, range: 620, band: 32, windup: .065, duration: .18, width: 62, gun: true },
};
export const WEAPON_IDS = Object.keys(WEAPONS);
export const HEAVY_ENEMIES = new Set(['makouille', 'elephant', 'transpalette', 'poids', 'tracteur', 'canape', 'bolorouet']);
export const GRAPPLE = { range: 52, band: 28, holdTime: 2.5, throwAt: .23, throwDuration: .62, flight: .72, distance: 420, damage: 1.7, cooldown: .9, crushDamage: 25 };
export const HERO_ACTION_SPRITES = Object.fromEntries(['karonux', 'jualos', 'yanu', 'lorenzo', 'jo', 'kikor', 'gustavax'].map(id => [
  `actions_${id}`, { file: `${id}-actions`, folder: 'heroes/actions', cols: 4, rows: 3, height: 144,
    isolate: true, cells: { 9: [.25, 2 / 3, .545, 1] } },
]));
