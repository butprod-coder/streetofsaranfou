export const WEAPONS = {
  couteau: { tex: 'w_couteau', type: 'melee', dmg: 14, uses: 8, reach: 18 },
  batte: { tex: 'w_batte', type: 'melee', dmg: 16, uses: 10, reach: 40, swing: true },
  tube: { tex: 'w_tube', type: 'melee', dmg: 13, uses: 10, reach: 30 },
  cle: { tex: 'w_cle', type: 'melee', dmg: 15, uses: 8, reach: 22 },
  chaine: { tex: 'w_chaine', type: 'melee', dmg: 12, uses: 12, reach: 34 },
  barre: { tex: 'w_barre', type: 'melee', dmg: 18, uses: 8, reach: 46, swing: true },
  pistolet: { tex: 'w_pistolet', type: 'gun', dmg: 16, uses: 7, bullets: 1 },
  uzi: { tex: 'w_uzi', type: 'gun', dmg: 9, uses: 18, bullets: 3 },
  pompe: { tex: 'w_pompe', type: 'gun', dmg: 26, uses: 5, bullets: 1 },
  bouteille: { tex: 'w_bouteille', type: 'melee', dmg: 11, uses: 3, reach: 18 },
};

export const WEAPON_KEYS = Object.keys(WEAPONS);
export const POLICE_ITEM = 'item_police';
