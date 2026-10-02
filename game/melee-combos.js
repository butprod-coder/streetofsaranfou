export const COMBO_RULES = { window: .7, buffer: .6, stepBonus: .05, maxStepBonus: .2, maxMultiplier: 1.95 };
export const MELEE_COMBOS = [
  { id: 'doubleKick', name: 'DOUBLE IMPACT', steps: ['P', 'P', 'P', 'P', 'K', 'K'], bonus: .3, effect: 'strike', description: 'Quatre poings suivis de deux coups de pied, avec une dernière frappe renforcée.' },
  { id: 'hammer', name: 'MARTÈLEMENT', steps: ['P', 'P', 'P', 'P', 'P', 'K', 'K', 'K'], bonus: .5, effect: 'strike', description: 'Cinq poings, puis trois coups de pied puissants.' },
  { id: 'counter', name: 'RÉPLIQUE SÈCHE', steps: ['K', 'K', 'K', 'P', 'P'], bonus: .45, effect: 'strike', description: 'Trois coups de pied suivis de deux frappes du poing.' },
  { id: 'pressure', name: 'PRESSION MAXIMALE', steps: ['K', 'K', 'K', 'K', 'P', 'P', 'P'], bonus: .6, effect: 'strike', description: 'Quatre coups de pied, puis une rafale de trois poings.' },
  { id: 'barrage', name: 'RAFALE CROISÉE', steps: ['P', 'P', 'P', 'K', 'K', 'K', 'P', 'P', 'P'], bonus: .7, effect: 'strike', description: 'Trois poings, trois pieds, puis trois poings pour conclure.' },
  { id: 'onslaught', name: 'AVALANCHE DE COUPS', steps: ['K', 'K', 'K', 'P', 'P', 'P', 'K', 'K', 'K'], bonus: .8, effect: 'strike', description: 'Trois pieds, trois poings, puis trois pieds avec une finition très puissante.' },
];
export const comboNotation = steps => steps.map(s => ({ P: 'Poing', K: 'Pied' })[s]).join(' → ');
const prefix = (steps, pattern) => steps.length <= pattern.length && steps.every((s, i) => s === pattern[i]);
const patterns = MELEE_COMBOS.map(c => c.steps);

export const meleeCombos = {
  resetMeleeCombo(p) { p.meleeChain = null; p.comboQueued = null; p.comboIntent = null; },
  captureComboInput(p, input) {
    if (p.meleeChain && this.state.time > p.meleeChain.until) p.meleeChain = null;
    p.comboHeld ||= {};
    const fresh = {};
    for (const action of ['punch', 'kick', 'jump']) { fresh[action] = !!input[action] && !p.comboHeld[action] || (input.taps?.[action] || 0) > (p.taps[action] || 0); p.comboHeld[action] = !!input[action]; }
    if (fresh.jump) this.resetMeleeCombo(p);
    if (p.stun > 0 || p.hp <= 0 || p.specialState || p.grapple || p.interaction || input.special || input.dodge) { this.resetMeleeCombo(p); return; }
    const action = fresh.jump ? 'jump' : fresh.kick ? 'kick' : fresh.punch ? 'punch' : null;
    if (action) p.comboQueued = { action, until: this.state.time + COMBO_RULES.buffer };
    if (p.comboQueued && p.comboQueued.until < this.state.time) p.comboQueued = null;
  },
  prepareComboAttack(p, attack) {
    const intent = p.comboIntent; p.comboIntent = null;
    if (!intent || p.specialState || p.weapon || !['punch', 'kick'].includes(attack.type)) { p.meleeChain = null; return; }
    const previous = p.meleeChain && this.state.time <= p.meleeChain.until ? p.meleeChain.steps : [];
    const plain = attack.type === 'punch' ? 'P' : 'K';
    let steps = [...previous, plain];
    if (!patterns.some(pattern => prefix(steps, pattern))) steps = [plain];
    const finisher = MELEE_COMBOS.find(c => c.steps.length === steps.length && prefix(steps, c.steps));
    const bonus = finisher?.bonus || 0;
    attack.chain = { steps, finisher: finisher?.id || null, effect: finisher?.effect || null, multiplier: Math.min(COMBO_RULES.maxMultiplier, 1 + bonus + Math.min(COMBO_RULES.maxStepBonus, (steps.length - 1) * COMBO_RULES.stepBonus)) };
    if (finisher) attack.heavy = true;
  },
  comboJump(p) { this.resetMeleeCombo(p); },
  confirmComboHit(p, attack, targets) {
    if (!attack.chain) return;
    if (!targets.length) { this.resetMeleeCombo(p); if (attack.chain.finisher) p.cooldown += .18; return; }
    const chain = attack.chain;
    p.meleeChain = { steps: chain.steps, until: this.state.time + Math.max(0, attack.duration - attack.elapsed) + COMBO_RULES.window, finisher: chain.finisher };
    const move = MELEE_COMBOS.find(c => c.id === chain.finisher);
    if (move) this.event('comboFinish', { actor: p.id, x: p.x, y: p.y - 145, facing: p.facing, label: move.name, effect: chain.effect, multiplier: chain.multiplier });
    // Keep targets in striking range: these chains never launch, lift or topple enemies.
    for (const target of targets) if (!target.boss && !target.miniBoss && !target.rogueArmor && target.hp > 0) target.vx = (Math.sign(target.x - p.x) || p.facing) * 70;
  },
};