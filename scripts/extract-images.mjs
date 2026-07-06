import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'index.html');
const assetsDir = path.join(root, 'assets');

const html = fs.readFileSync(htmlPath, 'utf8');
const imgStart = html.indexOf('const IMG={');
const imgEnd = html.indexOf('\n};', imgStart);
if (imgStart === -1 || imgEnd === -1) throw new Error('IMG block not found');

const imgBlock = html.slice(imgStart, imgEnd);
const re = /(\w+):'data:image\/(jpeg|png);base64,([^']+)'/g;

fs.mkdirSync(assetsDir, { recursive: true });

const manifest = {};
let count = 0;
let m;
while ((m = re.exec(imgBlock)) !== null) {
  const key = m[1];
  const ext = m[2] === 'jpeg' ? 'jpg' : 'png';
  const buf = Buffer.from(m[3], 'base64');
  const filename = `${key}.${ext}`;
  fs.writeFileSync(path.join(assetsDir, filename), buf);
  manifest[key] = ext;
  count++;
}

fs.writeFileSync(
  path.join(root, 'assets-manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log(`Extracted ${count} images to assets/`);
