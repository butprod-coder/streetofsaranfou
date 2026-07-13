import Phaser from 'phaser';
import { W, H } from './config/gameConfig.js';
import { initDebugPanel } from './debug/crashOverlay.js';
import { initGamepadBridge } from './input/gamepad.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { OptionsScene } from './scenes/OptionsScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { PlayModeScene } from './scenes/PlayModeScene.js';
import { TestLevelScene } from './scenes/TestLevelScene.js';
import { TestBossScene } from './scenes/TestBossScene.js';
import { CoopInputScene } from './scenes/CoopInputScene.js';
import { LevelEditorScene } from './scenes/LevelEditorScene.js';
import { GameScene } from './scenes/GameScene.js';
import { initGfx, getGfx, applyGfxToGame } from './config/graphics.js';

initDebugPanel();

initGfx(new URLSearchParams(location.search).get('gfx') || undefined);
const gfx = getGfx();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0a0712',
  pixelArt: true,
  roundPixels: true,
  render: {
    powerPreference: 'high-performance',
    antialias: false,
    desynchronized: true,
    batchSize: 4096,
  },
  fps: {
    target: 60,
    smoothStep: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    resolution: gfx.resolution,
  },
  input: { gamepad: true },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [
    BootScene,
    TitleScene,
    OptionsScene,
    CreditsScene,
    PlayModeScene,
    TestLevelScene,
    TestBossScene,
    CoopInputScene,
    SelectScene,
    LevelEditorScene,
    GameScene,
  ],
});

initGamepadBridge(game);
window.__SOSF_GAME__ = game;
window.__SOSF_GFX__ = gfx;
applyGfxToGame(game);
