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
        // This generated atlas uses a chroma key; keep the source PNG untouched.
        if (['/assets/shared/scenery/estate-events.png', '/assets/shared/scenery/night-bus.png'].includes(url)) {
          bitmap = document.createElement('canvas'); bitmap.width = img.width; bitmap.height = img.height;
          const context = bitmap.getContext('2d'); context.drawImage(img, 0, 0);
          const pixels = context.getImageData(0, 0, img.width, img.height);
          for (let i = 0; i < pixels.data.length; i += 4) {
            const [r, g, b] = pixels.data.subarray(i, i + 3);
            if (r > 100 && b > 100 && r > g * 1.7 && b > g * 1.7) pixels.data[i + 3] = 0;
          }
          context.putImageData(pixels, 0, 0);
        }
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
    const urls = new Set([...CHAPTERS[chapter].backgrounds, ...FIGHTERS.map(f=>`/assets/${f.id}/${f.id}_p.png`), ...EXTRA_ASSETS]);
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
  trimBackgrounds(chapter, next = chapter + 1) {
    const keep = new Set([...CHAPTERS[chapter].backgrounds, ...(CHAPTERS[next]?.backgrounds || [])]);
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
        if (config.isolate || config.cleanComponents) {
          // Ignore disconnected atlas neighbours and alpha flecks when anchoring action poses.
          const w = right - left, h = bottom - top, seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
          let largest = 0, component;
          const solid = n => pixels[((top + Math.floor(n / w)) * image.width + left + n % w) * 4 + 3] > 32;
          for (let n = 0; n < seen.length; n++) {
            if (seen[n] || !solid(n)) continue;
            let head = 0, tail = 1, lx = w, ly = h, rx = 0, by = 0;
            queue[0] = n; seen[n] = 1;
            while (head < tail) {
              const p = queue[head++], x = p % w, y = Math.floor(p / w);
              lx = Math.min(lx, x); ly = Math.min(ly, y); rx = Math.max(rx, x); by = Math.max(by, y);
              for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy, next = ny * w + nx;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[next] || !solid(next)) continue;
                seen[next] = 1; queue[tail++] = next;
              }
            }
            if (tail > largest) { largest = tail; x0 = left + lx; y0 = top + ly; x1 = left + rx; y1 = top + by; if(config.cleanComponents)component=queue.slice(0,tail); }
          }
          const rect=[x0,y0,Math.max(1,x1-x0+1),Math.max(1,y1-y0+1)];
          if(component){
            // A tall weapon can share a row gutter with a neighbour's disconnected foot.
            // Keep only this actor's connected silhouette in its cached render frame.
            const isolated=document.createElement('canvas');isolated.width=rect[2];isolated.height=rect[3];
            const context=isolated.getContext('2d'),data=context.createImageData(rect[2],rect[3]);
            for(const n of component){const x=left+n%w,y=top+Math.floor(n/w),from=(y*image.width+x)*4,to=((y-y0)*rect[2]+x-x0)*4;data.data.set(pixels.subarray(from,from+4),to);}
            context.putImageData(data,0,0);rect.image=isolated;
          }
          return rect;
        }
        for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (pixels[(y * image.width + x) * 4 + 3] > 32) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        return x1 >= x0 ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : [left, top, right - left, bottom - top];
      });
      this.frames.set(cacheKey, rects);
    }
    const rect=rects[Math.min(rects.length-1,frame)];
    return { image:rect.image||image, rect:rect.image?[0,0,rect[2],rect[3]]:rect, base:rects[0], height:config.height };
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
