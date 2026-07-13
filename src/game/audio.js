import { sfx as playSfx, playMusic, stopMusic } from '../audio/globalAudio.js';

/** GameScene mixin — sons de combat. */
export const audioMixin = {
  sfx(key, opts) {
    const id = key.startsWith('sfx_') || key.startsWith('music_') ? key : `sfx_${key}`;
    playSfx(this, id, opts);
  },

  startFightMusic() {
    playMusic(this, this.lv?.music || 'music_fight');
  },

  startBossMusic() {
    playMusic(this, 'music_boss');
  },

  stopFightMusic() {
    stopMusic();
  },

  /** Retire les instances sfx terminées (SoundManager global Phaser — survit aux vagues). */
  _purgeSceneSounds() {
    const mgr = this.sound;
    if (!mgr?.sounds?.length) return 0;
    let n = 0;
    for (const s of [...mgr.sounds]) {
      if (!s || s.isPlaying) continue;
      try {
        s.destroy();
        n++;
      } catch (_) {}
    }
    return n;
  },
};
