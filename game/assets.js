import { FIGHTERS, CHAPTERS, ENEMIES, animation } from './data.js';
import { EXTRA_ASSETS } from './visuals.js';

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
    for (const url of ['/assets/shared/decor/crate0.png', '/assets/shared/decor/obj_baril.png', '/assets/shared/pickups/chicken.png']) urls.add(url);
    let completed = 0, cursor = 0;
    const list = [...urls];
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (cursor < list.length) { await this.load(list[cursor++]); onProgress(++completed / list.length); }
    }));
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
  frame(id, action, progress, enemy = false) {
    const key = `${id}/${action}/${enemy}`;
    let frames = this.frames.get(key);
    if (!frames) { frames = animation(id, action, enemy); this.frames.set(key, frames); }
    const descriptor = frames[Math.min(frames.length - 1, Math.max(0, Math.floor(progress * frames.length)))];
    const image = this.images.get(descriptor.url);
    return image ? { image, rect: descriptor.rect || [0, 0, image.width, image.height] } : null;
  }
}
