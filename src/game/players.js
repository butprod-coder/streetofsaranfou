import { W } from '../config/gameConfig.js';
import { CHARACTERS } from '../config/characters.js';
import { DIFF } from '../config/difficulty.js';

/** GameScene mixin — 1 ou 2 joueurs coop. */
export const playersMixin = {
  playerCount() {
    return this.coop ? 2 : 1;
  },

  playerAt(slot) {
    return slot === 0 ? this.player : this.player2;
  },

  cfgAt(slot) {
    return slot === 0 ? this.cfg : this.cfg2;
  },

  charKeyAt(slot) {
    return slot === 0 ? this.charKey : this.charKey2;
  },

  livesAt(slot) {
    return slot === 0 ? this.lives : this.lives2;
  },

  setLivesAt(slot, v) {
    if (slot === 0) this.lives = v;
    else this.lives2 = v;
  },

  allPlayers() {
    const out = [];
    if (this.player) out.push(this.player);
    if (this.coop && this.player2) out.push(this.player2);
    return out;
  },

  activePlayers() {
    return this.allPlayers().filter((p) => p.active && p.hp > 0);
  },

  nearestPlayerTo(x, y) {
    const act = this.activePlayers();
    if (!act.length) return this.player;
    let best = act[0];
    let bd = Infinity;
    for (const p of act) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  },

  anyPlayerAlive() {
    for (let i = 0; i < this.playerCount(); i++) {
      if (this.livesAt(i) >= 0) return true;
    }
    return false;
  },

  isPlayerEliminated(slot) {
    return this.livesAt(slot) < 0;
  },

  spawnPlayer(slot) {
    const cfg = this.cfgAt(slot);
    const x = slot === 0 ? W * 0.22 : W * 0.38;
    const p = this.makeFighter(x, this.spawnY(), cfg.sheet, {
      hpMax: Math.round(cfg.hp * DIFF().hpMul),
      speed: cfg.speed,
      scale: this.charKeyAt(slot) === 'gustavax' ? 0.95 : 0.82,
      isPlayer: true,
    });
    p.playerSlot = slot;
    p.charKey = this.charKeyAt(slot);
    p.facing = 1;
    if (slot === 0) this.player = p;
    else this.player2 = p;
    return p;
  },
};
