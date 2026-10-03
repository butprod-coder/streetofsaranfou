// Arcade values, shared by solo and the authoritative cooperative simulation.
export const WEAPONS = {
  ladle: { name: 'Louche', atlas: 'ladle', cell: 0, uses: 10, power: 1.8, range: 165, band: 60, windup: .2, duration: .55, width: 72 },
  cart: { name: 'Caddie', atlas: 'improvised', cell: 0, uses: 4, power: 1.8, range: 650, band: 42, windup: .22, duration: .7, width: 105, projectile: 'cart' },
  extinguisher: { name: 'Extincteur', atlas: 'improvised', cell: 1, uses: 8, power: .45, range: 230, band: 65, windup: .1, duration: .65, width: 48, projectile: 'foam' },
  parasol: { name: 'Parasol', atlas: 'improvised', cell: 2, uses: 7, power: 1.25, range: 205, band: 100, windup: .24, duration: .65, width: 120 },
  football: { name: 'Ballon', atlas: 'improvised', cell: 3, uses: 6, power: 1.2, range: 800, band: 30, windup: .18, duration: .5, width: 30, projectile: 'football' },
  bazooka: { name: 'Bazooka', atlas: 'heavyWeapons', cell: 0, uses: 3, power: 4.5, range: 850, band: 35, windup: .25, duration: 1.15, width: 110, gun: true, projectile: 'rocket' },
  flamethrower: { name: 'Lance-flammes', atlas: 'heavyWeapons', cell: 1, uses: 12, power: .65, range: 285, band: 62, windup: .1, duration: .65, width: 90, gun: true, projectile: 'flame' },
  grenade: { name: 'Grenades', atlas: 'heavyWeapons', cell: 2, uses: 4, power: 3.8, range: 360, band: 50, windup: .2, duration: 1.05, width: 28, projectile: 'grenade' },
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
