import { access, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { FIGHTERS, CHAPTERS, ENEMIES, animation } from '../game/data.js';
import { EXTRA_ASSETS } from '../game/visuals.js';

const urls = new Set([...CHAPTERS.flatMap(c => c.backgrounds), ...EXTRA_ASSETS]);
for (const c of FIGHTERS) {
  urls.add(`/assets/${c.id}/${c.id}_p.png`);
  for (const action of ['idle', 'walk', 'punch', 'kick', 'special', 'jump', 'hurt', 'dead', 'dodge']) for (const f of animation(c.id, action)) urls.add(f.url);
}
for (const id of Object.keys(ENEMIES)) for (const action of ['idle', 'walk', 'punch', 'special', 'hurt', 'dead']) for (const f of animation(id, action, true)) urls.add(f.url);
for (const f of ['shared/levels/titlebg.jpg', 'shared/decor/crate0.png', 'shared/decor/obj_baril.png', 'shared/pickups/chicken.png']) urls.add('/assets/' + f);
const missing = [];
for (const url of urls) { try { await access(new URL('..' + url, import.meta.url)); } catch { missing.push(url); } }
if (missing.length) { console.error('Assets manquants :\n' + missing.join('\n')); process.exitCode = 1; }
else console.log(`${urls.size} images référencées : toutes présentes.`);
for (const folder of ['game', 'server']) for (const file of await readdir(new URL(`../${folder}/`, import.meta.url))) {
  if (!file.endsWith('.js')) continue;
  const result = spawnSync(process.execPath, ['--check', path.join(folder, file)], { encoding: 'utf8' });
  if (result.status) { console.error(result.stderr); process.exitCode = 1; }
}
if (!process.exitCode) console.log('Modules navigateur et serveur : syntaxe valide.');
