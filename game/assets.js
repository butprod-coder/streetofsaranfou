import { FIGHTERS, CHAPTERS, ENEMIES, animation } from './data.js';
import { EXTRA_ASSETS, ARCADE_SPRITES, arcadeUrl } from './visuals.js';

export class Assets {
  constructor() { this.images = new Map(); this.pending = new Map(); this.frames = new Map(); }
  load(url) {
    if (this.images.has(url)) return Promise.resolve(this.images.get(url));
    if (this.pending.has(url)) return this.pending.get(url);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => { img.src = ''; reject(new Error(`Chargement trop long : ${url}`)); }, 20000);
      img.onload = () => {
        clearTimeout(timer);
        let bitmap = img;
        if (url.includes('/levels/') && img.width > 1440) {
          bitmap = document.createElement('canvas'); bitmap.width = 1440; bitmap.height = Math.round(img.height * 1440 / img.width);
          bitmap.getContext('2d').drawImage(img, 0, 0, bitmap.width, bitmap.height);
        }
        this.images.set(url, bitmap); resolve(bitmap);
      };
      img.onerror = () => { clearTimeout(timer); reject(new Error(`Image indisponible : ${url}`)); };
      img.src = url;
    }).finally(() => this.pending.delete(url));
    this.pending.set(url, promise); return promise;
  }
  async prepare(chapter, onProgress = () => {}) {
    const urls = new Set([...CHAPTERS[chapter].backgrounds, ...EXTRA_ASSETS]);
    for (const c of FIGHTERS) for (const action of ['idle', 'walk', 'punch', 'kick', 'special', 'jump', 'hurt', 'dead', 'dodge']) for (const frame of animation(c.id, action)) urls.add(frame.url);
    for (const id of Object.keys(ENEMIES)) for (const action of ['idle', 'walk', 'punch', 'special', 'hurt', 'dead']) for (const frame of animation(id, action, true)) urls.add(frame.url);
    let completed = 0, cursor = 0;
    const list = [...urls];
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (cursor < list.length) { await this.load(list[cursor++]); onProgress(++completed / list.length); }
    }));
    for (const key of Object.keys(ARCADE_SPRITES)) this.arcadeFrame(key);
  }
  async preloadChapter(chapter) {
    if (!CHAPTERS[chapter]) return;
    await Promise.all(CHAPTERS[chapter].backgrounds.map(url => this.load(url)));
  }
  trimBackgrounds(chapter) {
    const keep = new Set([...CHAPTERS[chapter].backgrounds, ...(CHAPTERS[chapter + 1]?.backgrounds || [])]);
    for (const url of this.images.keys()) if (url.includes('/levels/') && !keep.has(url)) this.images.delete(url);
  }
  get(url) { return this.images.get(url); }
  arcadeFrame(key, frame = 0) {
    const config = ARCADE_SPRITES[key], image = config && this.get(arcadeUrl(key));
    if (!image) return null;
    const cacheKey = `arcade/${key}`;
    let rects = this.frames.get(cacheKey);
    if (!rects) {
      // Read alpha once to find each cell's anchor. Originals keep their generated alpha untouched.
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      rects = Array.from({ length: config.cols * config.rows }, (_, i) => {
        const col = i % config.cols;
        const row = Math.floor(i / config.cols);
        const columns = config.rowColumns?.[row] || config.columnCuts;
        const region = config.cells?.[i];
        const left = Math.floor((region?.[0] ?? columns?.[col] ?? col / config.cols) * image.width), right = Math.floor((region?.[2] ?? columns?.[col + 1] ?? (col + 1) / config.cols) * image.width);
        // A generated sheet may need a slightly shifted gutter to keep whole feet in their row.
        const top = Math.floor((region?.[1] ?? config.rowCuts?.[row] ?? row / config.rows) * image.height), bottom = Math.floor((region?.[3] ?? config.rowCuts?.[row + 1] ?? (row + 1) / config.rows) * image.height);
        let x0 = right, y0 = bottom, x1 = left, y1 = top;
        for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (pixels[(y * image.width + x) * 4 + 3] > 32) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        return x1 >= x0 ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : [left, top, right - left, bottom - top];
      });
      this.frames.set(cacheKey, rects);
    }
    return { image, rect: rects[Math.min(rects.length - 1, frame)], base: rects[0], height: config.height };
  }
  frame(id, action, progress, enemy = false) {
    const key = `${id}/${action}/${enemy}`;
    let frames = this.frames.get(key);
    if (!frames) { frames = animation(id, action, enemy); this.frames.set(key, frames); }
    const descriptor = frames[Math.min(frames.length - 1, Math.max(0, Math.floor(progress * frames.length)))];
    if (descriptor.atlas) return this.arcadeFrame(descriptor.atlas, descriptor.cell);
    const image = this.images.get(descriptor.url);
    return image ? { image, rect: descriptor.rect || [0, 0, image.width, image.height], referenceHeight: descriptor.referenceHeight } : null;
  }
}
