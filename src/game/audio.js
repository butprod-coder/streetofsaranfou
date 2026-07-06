import { sfx as playSfx, playMusic, stopMusic } from '../audio/globalAudio.js';

/** GameScene mixin — sons de combat. */
export const audioMixin = {
  sfx(key, opts) {
    const id = key.startsWith('sfx_') || key.startsWith('music_') ? key : `sfx_${key}`;
    playSfx(this, id, opts);
  },

  startFightMusic() {
    playMusic(this, 'music_fight');
  },

  stopFightMusic() {
    stopMusic();
  },
};
