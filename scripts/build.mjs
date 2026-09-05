import { mkdir, copyFile, cp, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FIGHTERS, CHAPTERS, ENEMIES, animation } from '../game/data.js';
import { EXTRA_ASSETS } from '../game/visuals.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = spawnSync(process.execPath, ['scripts/check.mjs'], { cwd: root, stdio: 'inherit' });
if (check.status) process.exit(check.status);
const out = path.join(root, 'dist');
await mkdir(out, { recursive: true });
for (const name of ['game', 'server', 'styles']) await cp(path.join(root, name), path.join(out, name), { recursive: true, filter: source => !source.endsWith('game3d.css') && !source.endsWith('main.css') });
for (const name of ['index.html', 'package.json', 'pnpm-lock.yaml', 'README.md', 'GAMEPLAY.md', 'Dockerfile', '.dockerignore', 'render.yaml']) {
  await access(path.join(root, name)); await copyFile(path.join(root, name), path.join(out, name));
}
const urls = new Set([...CHAPTERS.flatMap(c => c.backgrounds), ...EXTRA_ASSETS]);
for (const c of FIGHTERS) {
  urls.add(`/assets/${c.id}/${c.id}_p.png`);
  for (const action of ['idle', 'walk', 'punch', 'kick', 'special', 'jump', 'hurt', 'dead', 'dodge']) for (const f of animation(c.id, action)) urls.add(f.url);
}
for (const id of Object.keys(ENEMIES)) for (const action of ['idle', 'walk', 'punch', 'special', 'hurt', 'dead']) for (const f of animation(id, action, true)) urls.add(f.url);
for (const file of ['shared/levels/titlebg.jpg', 'shared/decor/crate0.png', 'shared/decor/obj_baril.png', 'shared/pickups/chicken.png']) urls.add(`/assets/${file}`);
for (const url of urls) {
  const dest = path.join(out, url.slice(1)); await mkdir(path.dirname(dest), { recursive: true }); await copyFile(path.join(root, url.slice(1)), dest);
}
await writeFile(path.join(out, 'BUILD.json'), JSON.stringify({ game: 'saranfou', version: 3, images: urls.size, builtAt: new Date().toISOString() }, null, 2));
console.log(`Distribution prête dans dist/ : ${urls.size} images, client et serveur. Installer les dépendances de production puis lancer node server/index.js.`);
