import { CONFIG } from '../config/difficulty.js';

let musicSound = null;
let musicKey = null;

export function unlockAudio(scene) {
  if (scene?.sound?.context?.state === 'suspended') {
    scene.sound.context.resume();
  }
}

export function stopMusic() {
  if (musicSound) {
    musicSound.stop();
    musicSound.destroy();
    musicSound = null;
    musicKey = null;
  }
}

export function playMusic(scene, key) {
  if (!CONFIG.sound || !scene?.sound) return;
  unlockAudio(scene);
  if (musicKey === key && musicSound?.isPlaying) return;
  stopMusic();
  if (!scene.cache.audio.exists(key)) return;
  musicSound = scene.sound.add(key, { loop: true, volume: CONFIG.musicVol });
  musicSound.play();
  musicKey = key;
}

export function sfx(scene, key, opts = {}) {
  if (!CONFIG.sound || !scene?.sound) return;
  unlockAudio(scene);
  if (!scene.cache.audio.exists(key)) return;
  const vol = CONFIG.sfxVol * (opts.vol ?? 1);
  scene.sound.play(key, { volume: vol, removeOnComplete: true, ...opts });
}
