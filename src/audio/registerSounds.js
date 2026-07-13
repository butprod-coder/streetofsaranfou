import {
  makePunchBuffer,
  makeHitBuffer,
  makeHurtBuffer,
  makeShootBuffer,
  makeJumpBuffer,
  makePickupBuffer,
  makeExplosionBuffer,
  makeSpecialBuffer,
  makeSelectBuffer,
  makeConfirmBuffer,
  makeBossBuffer,
  makeVictoryBuffer,
  makeGameOverBuffer,
  makeKoBuffer,
  makeTitleMusicBuffer,
  makeFightMusicBuffer,
  makeFightMusic2Buffer,
  makeFightMusic3Buffer,
  makeFightMusic4Buffer,
  makeBossMusicBuffer,
} from './proceduralSounds.js';

const SFX = [
  ['sfx_punch', makePunchBuffer],
  ['sfx_hit', makeHitBuffer],
  ['sfx_hurt', makeHurtBuffer],
  ['sfx_shoot', makeShootBuffer],
  ['sfx_jump', makeJumpBuffer],
  ['sfx_pickup', makePickupBuffer],
  ['sfx_explosion', makeExplosionBuffer],
  ['sfx_special', makeSpecialBuffer],
  ['sfx_select', makeSelectBuffer],
  ['sfx_confirm', makeConfirmBuffer],
  ['sfx_boss', makeBossBuffer],
  ['sfx_victory', makeVictoryBuffer],
  ['sfx_gameover', makeGameOverBuffer],
  ['sfx_ko', makeKoBuffer],
];

const MUSIC = [
  ['music_title', makeTitleMusicBuffer],
  ['music_fight', makeFightMusicBuffer],
  ['music_fight2', makeFightMusic2Buffer],
  ['music_fight3', makeFightMusic3Buffer],
  ['music_fight4', makeFightMusic4Buffer],
  ['music_boss', makeBossMusicBuffer],
];

/** Enregistre tous les sons dans le cache Phaser (BootScene.create). */
export function registerProceduralSounds(scene) {
  if (scene.registry.get('soundsRegistered')) return false;
  const ctx = scene.sound?.context;
  if (!ctx) return false;

  const add = (key, buffer) => {
    if (!scene.cache.audio.exists(key)) scene.cache.audio.add(key, buffer);
  };

  SFX.forEach(([key, fn]) => add(key, fn(ctx)));
  MUSIC.forEach(([key, fn]) => add(key, fn(ctx)));

  scene.registry.set('soundsRegistered', true);
  return true;
}
