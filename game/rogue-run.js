import { addExperience, applyProfile, spendAttribute } from './progression.js';
export const rogueRun = {
  awardXP(amount, key) {
    this.state.xpAwards ||= [];
    if (this.state.xpAwards.includes(key)) return;
    this.state.xpAwards.push(key);
    for (const p of this.state.players) {
      const level = p.progression.level, next = addExperience(p.progression, amount);
      applyProfile(p, next);
      if (next.level > level) this.event('talent', { actor: p.id, label: 'NIVEAU ' + next.level + ' · CARACTÉRISTIQUES ET TALENTS · PAUSE' });
    }
  },
  spendAttribute(slot, key) {
    const p = this.state.players[slot];
    if (!p || !this.state.paused && !['rest', 'clear', 'intro'].includes(this.state.phase)) return false;
    const profile = spendAttribute(p.progression, key); if (!profile) return false;
    applyProfile(p, profile); return true;
  },
};
