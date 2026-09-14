import { CHAPTERS, W, H, clamp } from './data.js';
import { DECOR_CATALOG, THEME_DECOR, SCENERY_SPRITES, streetDecor } from './scenery.js';
import { arcadeUrl } from './visuals.js';
import { readLayouts, saveLayouts, validateLayouts, validateDecor, layoutFor, MAX_DECOR } from './level-layouts.js';

const $ = s => document.querySelector(s);
export class LevelEditor {
  constructor(game) {
    this.game = game; this.chapter = 0; this.stage = 0; this.selected = -1; this.paletteKey = null;
    this.data = readLayouts(); this.history = []; this.future = []; this.generation = 0;
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/styles/editor.css'; document.head.append(css);
    const screen = document.createElement('section'); screen.id = 'level-editor'; screen.className = 'screen level-editor'; screen.inert = true;
    screen.innerHTML = `<header class="editor-heading"><div><p class="eyebrow">L’ATELIER DU QUARTIER</p><h2>ÉDITION DES RUES</h2></div><button data-action="close-editor" class="text-button">← Retour au menu</button></header>
      <div class="editor-toolbar"><label>Quartier<select id="editor-chapter">${CHAPTERS.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}</select></label><label>Rue<select id="editor-stage">${Array.from({ length: 6 }, (_, i) => `<option value="${i}">Rue ${i + 1}${i === 5 ? ' · Boss' : ''}</option>`).join('')}</select></label><button id="editor-save">Enregistrer</button><button id="editor-test">Jouer cette rue</button><button id="editor-export">Exporter</button><button id="editor-import">Importer</button><input type="file" id="editor-file" accept=".json,application/json" hidden><span id="editor-status" role="status"></span></div>
      <div class="editor-workspace"><aside class="editor-library"><label>Bibliothèque<select id="editor-library"><option value="theme">Les 12 décors du quartier</option><option value="all">Tous les décors</option></select></label><div id="editor-palette" class="editor-palette"></div></aside>
      <div class="editor-stage-area"><canvas id="editor-canvas" width="1280" height="720" tabindex="0" aria-label="Niveau éditable. Choisis un objet puis clique pour le placer."></canvas><p>Clique sur un décor de la bibliothèque, puis dans la rue. Glisse pour déplacer. Échap : sélection libre.</p><p>Flèches : déplacer · Suppr : retirer · Ctrl+Z : annuler · Ctrl+Y : rétablir. Les placements sont sauvegardés sur cet appareil ; en coop, ceux de l’hôte sont partagés.</p></div>
      <aside class="editor-inspector"><h3 id="editor-selection">Aucun objet sélectionné</h3><label>Position X<input id="editor-x" type="number" min="0" max="1280"></label><label>Position Y<input id="editor-y" type="number" min="0" max="720"></label><label>Hauteur<input id="editor-size" type="range" min="20" max="320" value="100"></label><button id="editor-flip">Retourner ↔</button><button id="editor-duplicate">Dupliquer</button><button id="editor-delete">Supprimer</button><hr><button id="editor-undo">Annuler</button><button id="editor-redo">Rétablir</button><button id="editor-clear">Vider la rue</button><button id="editor-defaults">Décor par défaut</button><p id="editor-count"></p></aside></div>`;
    $('#app').append(screen);
    for (const selector of ['.home-buttons', '.departure']) {
      const button = document.createElement('button'); button.className = 'text-button'; button.dataset.action = 'editor'; button.textContent = 'Éditeur de niveaux ↗'; $(selector).append(button);
    }
    this.canvas = $('#editor-canvas'); this.ctx = this.canvas.getContext('2d');
    const safe = fn => async () => { try { await fn(); } catch (e) { this.status(e.message); } };
    $('#editor-chapter').onchange = safe(async () => { this.remember(); this.chapter = Number($('#editor-chapter').value); await this.loadStreet(); });
    $('#editor-stage').onchange = safe(async () => { this.remember(); this.stage = Number($('#editor-stage').value); await this.loadStreet(); });
    $('#editor-library').onchange = () => this.renderPalette();
    $('#editor-save').onclick = safe(() => this.save());
    $('#editor-test').onclick = safe(async () => { this.save(); await game.startSolo(this.chapter, this.stage); });
    $('#editor-clear').onclick = () => this.change(() => { this.items = []; this.selected = -1; });
    $('#editor-defaults').onclick = () => this.change(() => { this.items = validateDecor(streetDecor(this.chapter, this.stage)); this.selected = -1; });
    $('#editor-undo').onclick = () => this.undo(); $('#editor-redo').onclick = () => this.undo(true);
    $('#editor-delete').onclick = () => this.remove();
    $('#editor-duplicate').onclick = () => { const d = this.items[this.selected]; if (d && this.items.length < MAX_DECOR) this.change(() => { this.items.push({ ...d, x: clamp(d.x + 35, 0, W), y: clamp(d.y + 12, 0, H) }); this.selected = this.items.length - 1; }); };
    $('#editor-flip').onclick = () => this.edit(d => { d.facing = -(d.facing || 1); });
    for (const [id, field, max] of [['x', 'x', W], ['y', 'y', H], ['size', 'height', 320]]) {
      $(`#editor-${id}`).onchange = () => this.edit(d => { d[field] = Math.round(clamp(Number($(`#editor-${id}`).value) || 0, field === 'height' ? 20 : 0, max)); });
    }
    $('#editor-export').onclick = safe(() => {
      this.remember(); const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'saranfou-niveaux.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.status('Placements exportés.');
    });
    $('#editor-import').onclick = () => $('#editor-file').click();
    $('#editor-file').onchange = safe(async () => {
      const file = $('#editor-file').files[0]; if (!file) return;
      if (file.size > 600000) throw new Error('Fichier trop volumineux.');
      const imported = validateLayouts(JSON.parse(await file.text()));
      this.remember(); this.data = { version: 1, streets: { ...this.data.streets, ...imported.streets } };
      this.dirty = true; await this.loadStreet(); $('#editor-file').value = ''; this.status('Import chargé. Enregistre pour l’appliquer au jeu.');
    });
    this.canvas.onpointerdown = e => this.pointerDown(e);
    this.canvas.onpointermove = e => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const point = this.point(e), d = this.items[this.selected];
      d.x = Math.round(clamp(point.x - this.drag.dx, 0, W)); d.y = Math.round(clamp(point.y - this.drag.dy, 0, H)); this.dirty = true; this.draw(); this.inspect();
    };
    this.canvas.onpointerup = this.canvas.onpointercancel = this.canvas.onlostpointercapture = () => { this.drag = null; };
    screen.addEventListener('keydown', e => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === 'escape') { e.preventDefault(); this.paletteKey = null; this.renderPalette(); return; }
      if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); this.undo(e.shiftKey); }
      else if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); this.undo(true); }
      else if (key === 'delete' || key === 'backspace') { e.preventDefault(); this.remove(); }
      else if (e.key.startsWith('Arrow')) { e.preventDefault(); e.stopPropagation(); const n = e.shiftKey ? 10 : 1; this.edit(d => { d.x = clamp(d.x + (key === 'arrowright' ? n : key === 'arrowleft' ? -n : 0), 0, W); d.y = clamp(d.y + (key === 'arrowdown' ? n : key === 'arrowup' ? -n : 0), 0, H); }); }
    });
  }
  async open() { this.game.show('level-editor'); this.data = readLayouts(); this.dirty = false; await this.loadStreet(); }
  status(text) { $('#editor-status').textContent = text; }
  remember() { if (this.items) this.data.streets[`${this.chapter}:${this.stage}`] = validateDecor(this.items); }
  save() { this.remember(); this.data = saveLayouts(this.data); this.dirty = false; this.game.renderer.reset(); this.status('Enregistré sur cet appareil.'); }
  async loadStreet() {
    const generation = ++this.generation;
    this.ready = false; this.items = layoutFor(this.chapter, this.stage, this.data); this.selected = -1; this.paletteKey = null; this.history = []; this.future = [];
    $('#editor-chapter').value = this.chapter; $('#editor-stage').value = this.stage;
    this.status('Chargement des décors…');
    const urls = new Set([CHAPTERS[this.chapter].backgrounds[this.stage], ...DECOR_CATALOG.map(d => arcadeUrl(d.key))]);
    await Promise.all([...urls].map(url => this.game.assets.load(url)));
    if (generation !== this.generation) return;
    this.ready = true; this.renderPalette(); this.inspect(); this.draw(); this.status(this.dirty ? 'Modifications à enregistrer.' : 'Choisis un objet et place-le dans la rue.');
  }
  renderPalette() {
    const list = $('#editor-library').value === 'all' ? DECOR_CATALOG : THEME_DECOR[this.chapter];
    const palette = $('#editor-palette'); palette.replaceChildren();
    for (const item of list) {
      const button = document.createElement('button'); button.className = 'editor-tile'; button.setAttribute('aria-label', item.label); button.setAttribute('aria-pressed', String(this.paletteKey === item.key));
      const preview = document.createElement('canvas'); preview.width = 112; preview.height = 84;
      const asset = this.game.assets.arcadeFrame(item.key);
      if (asset) { const [sx, sy, sw, sh] = asset.rect, s = Math.min(100 / sw, 72 / sh); preview.getContext('2d').drawImage(asset.image, sx, sy, sw, sh, (112 - sw * s) / 2, (84 - sh * s) / 2, sw * s, sh * s); }
      const label = document.createElement('span'); label.textContent = item.label; button.append(preview, label);
      button.onclick = () => { this.paletteKey = item.key; this.selected = -1; this.renderPalette(); this.inspect(); this.draw(); this.status(`${item.label} : clique dans la rue pour le placer.`); }; palette.append(button);
    }
  }
  checkpoint() { this.history.push(JSON.stringify(this.items)); if (this.history.length > 60) this.history.shift(); this.future = []; }
  change(fn) { if (!this.ready) return; this.checkpoint(); fn(); this.dirty = true; this.draw(); this.inspect(); this.status('Modifications à enregistrer.'); }
  edit(fn) { if (this.items[this.selected]) this.change(() => fn(this.items[this.selected])); }
  remove() { if (this.items[this.selected]) this.change(() => { this.items.splice(this.selected, 1); this.selected = -1; }); }
  undo(redo = false) { const from = redo ? this.future : this.history, to = redo ? this.history : this.future; if (!from.length) return; to.push(JSON.stringify(this.items)); this.items = JSON.parse(from.pop()); this.selected = -1; this.dirty = true; this.draw(); this.inspect(); }
  point(e) { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
  bounds(d) { const a = this.game.assets.arcadeFrame(d.key); const width = a ? d.height * a.rect[2] / a.rect[3] : d.height; return { x: d.x - width / 2, y: d.y - d.height, w: width, h: d.height }; }
  pointerDown(e) {
    if (!this.ready || e.button !== 0) return; e.preventDefault(); this.canvas.focus(); const p = this.point(e);
    if (this.paletteKey) {
      if (this.items.length >= MAX_DECOR) { this.status(`Maximum ${MAX_DECOR} objets. Supprime un décor avant d’en ajouter.`); return; }
      this.change(() => { this.items.push({ scenery: true, key: this.paletteKey, x: Math.round(p.x), y: Math.round(p.y), height: SCENERY_SPRITES[this.paletteKey].height, facing: 1 }); this.selected = this.items.length - 1; });
      this.paletteKey = null; this.renderPalette();
    } else {
      const hits = this.items.map((d, i) => ({ d, i })).sort((a, b) => b.d.y - a.d.y || b.i - a.i);
      this.selected = hits.find(({ d }) => { const b = this.bounds(d); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; })?.i ?? -1;
      if (this.selected >= 0) this.checkpoint();
    }
    const d = this.items[this.selected]; if (d) { this.drag = { id: e.pointerId, dx: p.x - d.x, dy: p.y - d.y }; this.canvas.setPointerCapture(e.pointerId); }
    this.draw(); this.inspect();
  }
  inspect() {
    const d = this.items[this.selected]; $('#editor-selection').textContent = d ? DECOR_CATALOG.find(o => o.key === d.key)?.label : 'Aucun objet sélectionné';
    for (const id of ['x', 'y', 'size', 'flip', 'duplicate', 'delete']) $(`#editor-${id}`).disabled = !d;
    if (d) { $('#editor-x').value = d.x; $('#editor-y').value = d.y; $('#editor-size').value = d.height; }
    $('#editor-count').textContent = `${this.items.length} / ${MAX_DECOR} objets dans cette rue`;
    $('#editor-undo').disabled = !this.history.length; $('#editor-redo').disabled = !this.future.length;
  }
  draw() {
    const c = this.ctx, bg = this.game.assets.get(CHAPTERS[this.chapter].backgrounds[this.stage]);
    c.clearRect(0, 0, W, H); if (bg) { const s = Math.max(W / bg.width, H / bg.height); c.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2, bg.width * s, bg.height * s); }
    for (const d of [...this.items].sort((a, b) => a.y - b.y)) {
      const a = this.game.assets.arcadeFrame(d.key); if (!a) continue; const b = this.bounds(d);
      c.save(); c.translate(d.x, d.y); c.scale(d.facing || 1, 1); c.drawImage(a.image, ...a.rect, -b.w / 2, -d.height, b.w, d.height); c.restore();
    }
    const d = this.items[this.selected]; if (d) { const b = this.bounds(d); c.strokeStyle = '#ffca66'; c.lineWidth = 3; c.setLineDash([7, 5]); c.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6); c.setLineDash([]); c.fillStyle = '#ffca66'; c.fillRect(d.x - 4, d.y - 4, 8, 8); }
  }
}
