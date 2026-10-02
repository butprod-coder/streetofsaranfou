export const CHAIN_PROPS = {
  fuelDrum: { name: 'BIDON EXPLOSIF', cell: 0, hp: 3, height: 80 },
  electricBox: { name: 'BORNE ÉLECTRIQUE', cell: 1, hp: 3, height: 108 },
  hydrant: { name: 'BOUCHE D’INCENDIE', cell: 2, hp: 2, height: 72 },
};

export const chainScenery = {
  activateChainProp(prop, source) {
    const b = CHAIN_PROPS[prop.kind]; if (!b) return false;
    const owner = source || { id: prop.id, x: prop.x, y: prop.y, facing: 1, power: 18, enemy: false };
    const base = { x: prop.x, y: prop.y, enemy: false, both: true, bossOwner: false, bypassShield: true, delay: .65, pulse: 4, propDamage: 3 };
    if (prop.kind === 'fuelDrum') this.hazard(owner, { ...base, kind: 'chainBlast', radius: 190, ttl: .16, damage: 38 });
    else if (prop.kind === 'electricBox') this.hazard(owner, { ...base, kind: 'chainElectric', radius: 175, ttl: .65, damage: 12, electric: true, stunDuration: 1.35 });
    else this.hazard(owner, { ...base, kind: 'chainWater', shape: 'line', facing: source?.facing || 1, width: 340, band: 38, ttl: 1.8, damage: 3, pulse: .7, knockback: 530 });
    this.event('opening', { x: prop.x, y: prop.y - 125, label: { fuelDrum: 'BIDON · RECULE !', electricBox: 'ÉLECTRICITÉ !', hydrant: 'JET D’EAU !' }[prop.kind] });
    return true;
  },
};
