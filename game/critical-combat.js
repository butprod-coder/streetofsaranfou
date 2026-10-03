export const criticalCombat = {
  criticalOwner(source) {
    if (!source || source.enemy && !source.ally) return null;
    return this.state.players.find(p => p.id === (source.owner ?? source.id)) || null;
  },
  rollCritical(source, context) {
    const owner = this.criticalOwner(source);
    if (!owner) return false;
    if (context.critical === undefined) {
      // Separate deterministic stream: critical rolls never change enemy AI or loot.
      let seed = this.state.criticalSeed ?? ((this.state.streetSeed ?? this.seed) ^ 0x9e3779b9) >>> 0;
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      this.state.criticalSeed = seed >>> 0;
      context.critical = (seed >>> 0) / 4294967296 < (owner.bonuses?.criticalChance ?? .05);
    }
    return context.critical;
  },
  criticalStrike(source, context) {
    const owner = this.criticalOwner(source);
    if (!owner) return null;
    if (!context) {
      context = source.attack || owner.attack;
      if (!context) {
        if (owner.criticalStrikeState?.time !== this.state.time) owner.criticalStrikeState = { time: this.state.time };
        context = owner.criticalStrikeState;
      }
    }
    this.rollCritical(source, context);
    return context;
  },
  healPlayer(player, amount) {
    if (!player || player.hp <= 0) return 0;
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + Math.max(0, amount) * (player.bonuses?.healing ?? 1));
    return player.hp - before;
  },
};
