import Phaser from 'phaser';
import { W, FLOOR_TOP, H, NUM } from '../config/gameConfig.js';

export function makeCity(scene, key, level) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const top = Phaser.Display.Color.IntegerToColor(level.skyTop);
  for (let y = 0; y < FLOOR_TOP; y++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      top,
      Phaser.Display.Color.IntegerToColor(level.skyBot),
      FLOOR_TOP,
      y
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, y, W, 1);
  }
  const rnd = new Phaser.Math.RandomDataGenerator([key]);
  let x = 0;
  while (x < W) {
    const bw = rnd.between(60, 120);
    const bh = rnd.between(110, 230);
    g.fillStyle(0x000000, 0.30);
    g.fillRect(x, FLOOR_TOP - bh, bw, bh);
    for (let fy = FLOOR_TOP - bh + 12; fy < FLOOR_TOP - 12; fy += 20)
      for (let fx = x + 8; fx < x + bw - 8; fx += 18)
        if (rnd.frac() > 0.45) {
          g.fillStyle(level.neon, 0.5);
          g.fillRect(fx, fy, 7, 9);
        }
    x += bw + rnd.between(2, 14);
  }
  g.fillStyle(level.ground, 1);
  g.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
  g.fillStyle(0x000000, 0.18);
  for (let gx = 0; gx < W; gx += 48) g.fillRect(gx, FLOOR_TOP, 2, H - FLOOR_TOP);
  g.fillStyle(0xffffff, 0.05);
  g.fillRect(0, FLOOR_TOP, W, 3);
  g.generateTexture(key, W, H);
  g.destroy();
}

export function makeSpark(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 5);
  g.fillStyle(NUM('gold'), 1);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.fillRect(16 + Math.cos(a) * 9 - 2, 16 + Math.sin(a) * 9 - 2, 4, 4);
  }
  g.generateTexture('spark', 32, 32);
  g.destroy();
}

export function makeBullet(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffaa22, 1);
  g.fillEllipse(12, 6, 22, 9);
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(12, 6, 11, 5);
  g.generateTexture('bullet', 24, 12);
  g.destroy();
}

export function makePoliceItem(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x1a3a99, 1);
  g.fillRoundedRect(2, 2, 36, 36, 6);
  g.lineStyle(2, 0xffd700, 1);
  g.strokeRoundedRect(2, 2, 36, 36, 6);
  g.fillStyle(0xffd700, 1);
  g.fillRect(17, 6, 6, 28);
  g.fillRect(6, 14, 28, 10);
  g.fillRect(9, 8, 4, 4);
  g.fillRect(27, 8, 4, 4);
  g.fillRect(9, 28, 4, 4);
  g.fillRect(27, 28, 4, 4);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(20, 20, 4);
  g.fillStyle(0xffffff, 1);
  g.fillRect(14, 32, 12, 3);
  g.generateTexture('item_police', 40, 40);
  g.destroy();
}

/** Textures procédurales pour attaques d'ennemis. */
export function makeEnemyFx(scene) {
  let g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xccff44, 1);
  g.fillCircle(8, 8, 7);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(6, 6, 2);
  g.generateTexture('sp_tennis', 16, 16);
  g.destroy();

  g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xff8844, 0.55);
  g.fillCircle(20, 20, 18);
  g.fillStyle(0xffcc66, 0.35);
  g.fillCircle(14, 16, 10);
  g.fillStyle(0xffaa44, 0.25);
  g.fillCircle(26, 22, 8);
  g.generateTexture('sp_pepper', 40, 40);
  g.destroy();

  g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x66cc44, 0.75);
  g.fillEllipse(28, 14, 52, 22);
  g.fillStyle(0x88ff66, 0.45);
  g.fillEllipse(24, 12, 36, 14);
  g.generateTexture('sp_slime', 56, 28);
  g.destroy();

  g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xddd0c0, 1);
  g.fillRoundedRect(0, 2, 22, 30, 3);
  g.lineStyle(2, 0x8866cc, 1);
  g.strokeRoundedRect(0, 2, 22, 30, 3);
  g.fillStyle(0x6644aa, 1);
  g.fillRect(4, 8, 14, 10);
  g.generateTexture('sp_card', 22, 34);
  g.destroy();
}

export function makeProps(scene) {
  let g;
  g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x7a5a32, 1);
  g.fillRect(0, 0, 8, 4);
  g.generateTexture('debris', 8, 4);
  g.destroy();
  g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xf2ead2, 1);
  g.fillRect(2, 5, 18, 5);
  g.fillStyle(0xc9742a, 1);
  g.fillRect(20, 5, 5, 5);
  g.fillStyle(0xff5a1e, 1);
  g.fillCircle(2, 7, 2);
  g.fillStyle(0xffd24a, 1);
  g.fillCircle(2, 7, 1);
  g.generateTexture('cigare', 28, 14);
  g.destroy();
  for (let fr = 0; fr < 2; fr++) {
    g = scene.make.graphics({ x: 0, y: 0, add: false });
    const o = fr * 3;
    g.fillStyle(0xff8a1e, 0.9);
    g.fillEllipse(24, 40, 40, 12);
    g.fillStyle(0xff5a1e, 1);
    g.fillTriangle(8, 42, 16, 18 + o, 24, 42);
    g.fillTriangle(20, 42, 26, 12 - o, 34, 42);
    g.fillTriangle(30, 42, 38, 20 + o, 44, 42);
    g.fillStyle(0xffd24a, 1);
    g.fillTriangle(14, 42, 18, 26 + o, 22, 42);
    g.fillTriangle(26, 42, 30, 22 - o, 36, 42);
    g.fillStyle(0xfff2b0, 0.9);
    g.fillTriangle(22, 42, 25, 30 + o, 28, 42);
    g.generateTexture('feu' + fr, 48, 46);
    g.destroy();
  }
}

/** Pré-scale les fonds plein écran (1774×887) → W×H au boot (remplace la texture, pas de doublon mémoire). */
export function bakeFullStageTextures(scene, keys) {
  for (const key of keys) {
    if (!scene.textures.exists(key)) continue;
    const legacy = `${key}_lg`;
    if (scene.textures.exists(legacy)) scene.textures.remove(legacy);

    const img = scene.make.image({ key, x: 0, y: 0, add: false });
    if (img.width === W && img.height === H) {
      img.destroy();
      continue;
    }
    const scaleX = W / img.width;
    const scaleY = H / img.height;
    const rt = scene.add.renderTexture(0, 0, W, H).setVisible(false);
    img.setOrigin(0.5, 0);
    img.setPosition(W / 2, 0);
    img.setScale(scaleX, scaleY);
    rt.draw(img);
    img.destroy();
    scene.textures.remove(key);
    rt.saveTexture(key);
    rt.destroy();
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
