import { W, H, FLOOR, CHAPTERS, fighter, ENEMIES, clamp } from './data.js';
import { VISUALS, PATTERN_LABELS, TRANSFORM_ROWS } from './visuals.js';
import { BALANCE } from './balance.js';
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2;
const scoreText = n => String(Math.floor(n)).padStart(6, '0').replace(/(\d{3})$/, ' $1');

export class Renderer {
  constructor(canvas, assets, audio) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.assets = assets; this.audio = audio;
    this.effects = []; this.seenEvent = 0; this.shake = 0; this.visual = new Map(); this.street = ''; this.hudTime = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scale = 1; this.resize(); addEventListener('resize', () => this.resize());
    this.vignette = this.ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .63);
    this.vignette.addColorStop(0, '#00000000'); this.vignette.addColorStop(1, '#0309159c');
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); this.scale = Math.min(1.5, Math.max(1, rect.width / W * Math.min(devicePixelRatio, 1.5)));
    this.canvas.width = Math.round(W * this.scale); this.canvas.height = Math.round(H * this.scale);
  }
  reset() { this.effects = []; this.seenEvent = 0; this.visual.clear(); this.street = ''; this.hudTime = 0; this.hudKey = ''; }
  consume(state) {
    for (const e of state.events) {
      if (e.id <= this.seenEvent) continue;
      this.seenEvent = e.id; this.audio.effect(e);
      if (e.type === 'hit') {
        this.shake = Math.max(this.shake, e.heavy ? 5 : 2.2);
        this.effects.push({ type: 'number', x: e.x, y: e.y - 20, text: String(e.amount), color: e.enemy ? '#ffe1a4' : '#ff8b8b', ttl: .7, life: .7 });
        for (let i = 0; i < (e.heavy ? 15 : 9); i++) {
          const angle = Math.random() * TAU, speed = 70 + Math.random() * 250;
          this.effects.push({ type: 'spark', x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, ttl: .2 + Math.random() * .18, life: .4, color: i % 3 ? '#ffcd6e' : '#fff8df' });
        }
      }
      if (e.type === 'special') { this.shake = 7; this.effects.push({ ...e, type: 'special', ttl: .7, life: .7 }); }
      if (e.type === 'break') for (let i = 0; i < 10; i++) this.effects.push({ type: 'spark', x: e.x, y: e.y, vx: (Math.random() - .5) * 260, vy: -Math.random() * 200, ttl: .6, life: .6, color: '#d2a36c' });
      if (e.type === 'pickup') this.effects.push({ type: 'number', x: e.x, y: e.y, text: e.kind === 'food' ? '+35 PV' : '+40 ÉNERGIE', color: '#98efc9', ttl: .9, life: .9 });
      if (e.type === 'revive') this.effects.push({ type: 'number', x: e.x, y: e.y - 130, text: 'DEBOUT, POTO !', color: '#98efc9', ttl: 1.3, life: 1.3 });
      if (e.type === 'rage') this.effects.push({ type: 'announcement', text: e.label.toUpperCase(), color: '#ff8279', ttl: 2, life: 2 });
      if (['wave', 'breather'].includes(e.type)) this.effects.push({ type: 'announcement', text: e.label, color: '#ffdb91', ttl: 1.8, life: 1.8 });
      if (['xp', 'heal', 'opening', 'levelup'].includes(e.type)) this.effects.push({ type: 'number', x: e.x, y: e.y, text: e.type === 'xp' ? `+${e.amount} XP` : e.type === 'heal' ? `+${e.amount} PV` : e.type === 'levelup' ? `LEVEL UP · NIV. ${e.level} · +${e.pointsGained} POINTS` : e.label, color: e.type === 'levelup' ? '#ffe084' : '#9feecb', ttl: e.type === 'levelup' ? 2.3 : 1.1, life: e.type === 'levelup' ? 2.3 : 1.1 });
    }
    if (this.effects.length > 200) this.effects.splice(0, this.effects.length - 200);
  }
  draw(state, dt, { online = false, slot = 0, input = {}, age = 0, ping = 0 } = {}) {
    const c = this.ctx;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0); c.fillStyle = '#090d16'; c.fillRect(0, 0, W, H);
    if (!state) return;
    const key = `${state.chapter}:${state.stage}`;
    if (key !== this.street) { this.street = key; this.visual.clear(); this.effects = []; }
    this.consume(state);
    c.save();
    if (!this.reducedMotion && this.shake > .1 && !state.paused) c.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake * .65);
    this.shake *= Math.exp(-dt * 16);
    const background = this.assets.get(CHAPTERS[state.chapter].backgrounds[state.stage]);
    if (background) {
      const scale = Math.max(W / background.width, H / background.height);
      c.drawImage(background, (W - background.width * scale) / 2, (H - background.height * scale) / 2, background.width * scale, background.height * scale);
    }
    const tint = c.createLinearGradient(0, 0, 0, H); tint.addColorStop(0, '#09142c05'); tint.addColorStop(.6, '#10274605'); tint.addColorStop(1, '#08101e5c');
    c.fillStyle = tint; c.fillRect(0, 0, W, H);
    this.atmosphere(state.time);
    this.livingScenery(state);
    for (const h of state.hazards || []) this.drawHazard(h, state.time);
    if (state.phase === 'clear') this.exit(state);
    const entities = [...state.props.filter(p => p.hp > 0).map(p => ({ ...p, prop: true })), ...state.pickups.map(p => ({ ...p, pickup: true })), ...state.enemies, ...state.players, ...(state.allies || [])].sort((a, b) => a.y - b.y || Number(a.enemy) - Number(b.enemy));
    for (const entity of entities) {
      if (entity.prop) this.prop(entity);
      else if (entity.pickup) this.pickup(entity, state.time);
      else {
        let targetX = entity.x, targetY = entity.y;
        if (online && entity.id === slot + 1 && !entity.specialState && !state.paused && ['fight', 'rest', 'clear'].includes(state.phase) && entity.hp > 0 && entity.stun <= 0) {
          const factor = entity.attack ? .32 : 1, norm = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
          targetX = clamp(targetX + (input.x || 0) / norm * entity.speed * factor * Math.min(.13, age + ping / 2000), FLOOR.left, FLOOR.right);
          targetY = clamp(targetY + (input.y || 0) / norm * entity.speed * .68 * factor * Math.min(.13, age + ping / 2000), FLOOR.top, FLOOR.bottom);
        }
        const previous = this.visual.get(entity.id) || { x: targetX, y: targetY };
        const rate = online && Math.abs(previous.x - targetX) < 200 ? (entity.id === slot + 1 ? 40 : 22) : 1000;
        previous.x += (targetX - previous.x) * (1 - Math.exp(-dt * rate)); previous.y += (targetY - previous.y) * (1 - Math.exp(-dt * rate));
        this.visual.set(entity.id, previous);
        this.actor({ ...entity, x: previous.x, y: previous.y }, state, slot, online ? Math.min(age, .1) : 0);
      }
    }
    this.drawEffects(state.paused ? 0 : dt);
    c.fillStyle = this.vignette; c.fillRect(0, 0, W, H);
    if (state.combo > 1 && state.comboTime > 0) {
      c.save(); c.translate(63, 217); c.rotate(-.06); c.fillStyle = '#ffbe5c'; c.shadowColor = '#060c16'; c.shadowBlur = 6;
      c.font = 'italic 52px Impact, sans-serif'; c.fillText(`${state.combo}`, 0, 0); c.font = '16px Impact, sans-serif'; c.fillText('HITS', 8, 22); c.restore();
    }
    if (state.phase === 'intro') this.intro(state);
    if (state.phase === 'transition') { c.fillStyle = `rgba(5,9,16,${clamp(1 - state.phaseTime / .65, 0, 1)})`; c.fillRect(0, 0, W, H); }
    c.restore();
    this.hudTime += dt;
    if (this.hudTime > .07) { this.hudTime = 0; this.hud(state, slot, online, ping); }
  }
  atmosphere(time) {
    if (this.reducedMotion) return;
    const c = this.ctx; c.save();
    for (let i = 0; i < 23; i++) {
      const x = (i * 137.31 + time * (3 + i % 4)) % W, y = 290 + ((i * 79.7 - time * 5) % 310 + 310) % 310;
      c.globalAlpha = .1 + Math.sin(time * 1.1 + i) * .07; c.fillStyle = '#ffcc87'; c.fillRect(x, y, i % 3 ? 1.4 : 2, 1.5);
    }
    c.restore();
  }
  ellipse(x, y, rx, ry, color) { const c = this.ctx; c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
  bitmap(key, x, y, height, time = 0, facing = 1, luminous = false) {
    const list = VISUALS[key], image = list && this.assets.get(list[Math.floor(time * 8) % list.length]);
    if (!image) return;
    const c = this.ctx, row = TRANSFORM_ROWS[key], ratio = image.width / 1254;
    const rect = row ? [Math.floor(time * 9) % 3 * 418 * ratio, row[0] * ratio, 418 * ratio, row[1] * ratio] : [0, 0, image.width, image.height];
    const width = height * rect[2] / rect[3];
    c.save(); c.translate(x, y); c.scale(facing, 1); c.imageSmoothingEnabled = false;
    if (luminous && !row) c.globalCompositeOperation = 'screen';
    c.drawImage(image, ...rect, -width / 2, -height, width, height); c.restore();
  }
  livingScenery(s) {
    const c = this.ctx, t = this.reducedMotion ? 0 : s.time;
    c.save();
    if ([0, 3, 4, 5].includes(s.chapter)) {
      for (let i = 0; i < 2; i++) {
        const x = 220 + i * 820 + s.stage * 12, g = c.createRadialGradient(x, 370, 5, x, 370, 220);
        g.addColorStop(0, s.chapter === 4 ? '#b198ff16' : '#ffd59b16'); g.addColorStop(1, '#ffcf8000');
        c.fillStyle = g; c.globalAlpha = .8 + Math.sin(t * 1.7 + i) * .13; c.fillRect(x - 230, 140, 460, 460);
      }
    }
    c.globalAlpha = .28; c.strokeStyle = s.chapter === 4 ? '#bda4ec' : '#9dc7d4'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x = (s.stage * 219 + i * 317) % W, y = 666 + i % 2 * 13;
      c.beginPath(); c.ellipse(x, y, 25 + i * 6 + Math.sin(t + i) * 3, 2, 0, 0, TAU); c.stroke();
    }
    if ([1, 2].includes(s.chapter)) {
      c.fillStyle = '#b6c99c'; c.globalAlpha = .4;
      for (let i = 0; i < 7; i++) { const x = (i * 193 + t * 25) % W, y = 380 + (i * 31 + t * 13) % 70; c.save(); c.translate(x, y); c.rotate(Math.sin(t + i)); c.fillRect(-3, -1, 7, 2); c.restore(); }
    }
    c.restore();
  }
  drawHazard(h, time) {
    const c = this.ctx, warning = h.delay > 0, color = h.enemy ? '#ff696b' : '#83e6ca';
    c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2; c.globalAlpha = warning ? .18 + Math.sin(time * 14) * .06 : h.enemy ? .28 : .13;
    if (h.shape === 'line') { c.fillRect(h.facing > 0 ? h.x : h.x - h.width, h.y - h.band, h.width, h.band * 2); c.globalAlpha = .8; c.strokeRect(h.facing > 0 ? h.x : h.x - h.width, h.y - h.band, h.width, h.band * 2); }
    else { this.ellipse(h.x, h.y, h.radius, h.radius / 1.45, color); c.globalAlpha = .7; c.beginPath(); c.ellipse(h.x, h.y, h.radius, h.radius / 1.45, 0, 0, TAU); c.stroke(); }
    c.globalAlpha = 1;
    if (warning) {
      c.font = 'bold 15px monospace'; c.textAlign = 'center'; c.fillStyle = color; c.fillText(h.kind === 'fire' ? '🔥' : '!', h.x, h.y - 8);
      if (h.kind === 'fire') { const arc = Math.max(0, 1 - h.delay / .85); c.save(); c.translate(h.x, h.y - 120 * Math.sin(arc * Math.PI) - 8); c.rotate(arc * 8); c.fillStyle = '#eee3cf'; c.fillRect(-8, -2, 16, 4); c.fillStyle = '#ff7a37'; c.fillRect(5, -2, 3, 4); c.restore(); }
    } else if (h.kind === 'fire') {
      for (let i = 0; i < 8; i++) {
        const x = h.x + Math.sin(i * 2.4) * h.radius * .75, y = h.y + Math.cos(i * 2.4) * h.radius * .35;
        const height = 21 + 19 * (.5 + Math.sin(time * 12 + i) * .5);
        c.fillStyle = i % 2 ? '#ffa647d9' : '#ff643bba'; c.beginPath(); c.moveTo(x - 9, y); c.quadraticCurveTo(x - 13, y - height * .6, x + Math.sin(time * 9 + i) * 8, y - height); c.quadraticCurveTo(x + 18, y - 8, x + 9, y); c.fill();
      }
    } else if (h.kind === 'ball') { const g = c.createRadialGradient(h.x - 5, h.y - 16, 2, h.x, h.y - 10, 15); g.addColorStop(0, '#e9edf3'); g.addColorStop(1, '#505e75'); this.ellipse(h.x, h.y - 10, 15, 15, g); }
    else if (['card', 'paint'].includes(h.kind)) this.bitmap(h.kind, h.x, h.y - 10, 35, time, h.facing);
    else if (h.kind === 'fist') {
      c.fillStyle = '#d99979'; c.fillRect(h.facing > 0 ? h.x : h.x - h.width, h.y - 69, h.width, 15); this.ellipse(h.x + h.facing * h.width, h.y - 62, 23, 18, '#e6b18b');
    } else if (h.kind === 'smoke') for (let i = 0; i < 6; i++) this.ellipse(h.x + Math.sin(i * 3 + time) * 48, h.y - 15 - (time * 25 + i * 18) % 80, 28, 20, '#b7cea247');
    else if (h.kind === 'wreck') this.bitmap('wreck', h.x, h.y, 175, h.age);
    else if (h.kind === 'bullet') { c.strokeStyle = h.enemy ? '#ffb277' : '#fff0a3'; c.lineWidth = 5; c.beginPath(); c.moveTo(h.x, h.y - 47); c.lineTo(h.x - (h.vx ? Math.sign(h.vx) * 28 : -h.facing * h.width), h.y - 47); c.stroke(); }
    c.restore();
  }
  actor(a, state, slot, age) {
    const c = this.ctx, dead = a.hp <= 0, t = a.actionTime + (state.paused ? 0 : age);
    const color = a.enemy ? '#ec6569' : a.id === 1 ? '#ffbf66' : '#91c6ff';
    if (a.boss && a.pattern) {
      const p = a.pattern;
      if (!p.hit && !p.healing) {
        if (p.charge) {
          c.save(); c.strokeStyle = '#ff68684d'; c.lineWidth = a.vehicle ? 135 : 105; c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(clamp(p.x + p.dx * p.speed * p.active, FLOOR.left, FLOOR.right), clamp(p.y + p.dy * p.speed * p.active, FLOOR.top, FLOOR.bottom)); c.stroke();
          c.strokeStyle = '#ff9999'; c.lineWidth = 2; c.setLineDash([8, 9]); c.stroke(); c.restore();
        } else {
          const fist = ['longFist', 'doubleFist', 'sweepFist'].includes(p.kind);
          this.drawHazard({ x: fist ? p.x : p.targetX, y: fist ? p.y : p.targetY, radius: 95, width: p.kind === 'sweepFist' ? 360 : 550, band: p.kind === 'sweepFist' ? 65 : 32, shape: fist ? 'line' : 'circle', facing: p.facing, enemy: true, delay: p.windup - p.elapsed, kind: 'warning' }, state.time);
        }
      }
      c.fillStyle = p.healing ? '#a3ecc6' : '#ffab95'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText((PATTERN_LABELS[p.kind] || '').toUpperCase(), clamp(a.x, 180, 1100), a.y - 203);
    }
    if (a.recovering > 0 && !dead) { c.fillStyle = '#b9f2ce'; c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillText('VULNÉRABLE', a.x, a.y - 185); }
    if (a.enemy && a.attack && !a.attack.hit) {
      const special = a.attack.type === 'special', charge = clamp(a.attack.elapsed / a.attack.windup, 0, 1);
      c.save(); c.globalAlpha = .18 + charge * .22;
      if (special) this.ellipse(a.x, a.y, 195, 115, '#ff4d54');
      else { c.fillStyle = '#ff4d54'; c.fillRect(a.facing > 0 ? a.x : a.x - a.reach, a.y - 34, a.reach, 68); }
      c.globalAlpha = .65; c.strokeStyle = '#ff8585'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(a.x, a.y, special ? 195 : 35, special ? 115 : 13, 0, 0, TAU); c.stroke();
      c.restore();
    }
    this.ellipse(a.x + 5, a.y + 3, dead ? 49 : a.boss ? 39 : 28, dead ? 11 : 9, '#02060aa6');
    if (!a.enemy && !dead) {
      c.strokeStyle = color; c.globalAlpha = .65; c.lineWidth = 1.6; c.beginPath(); c.ellipse(a.x, a.y + 2, 29, 9, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
    }
    let action = a.action;
    if (a.kind === 'creation') { this.bitmap('creation', a.x, a.y, 96, state.time); if (a.ally) { c.fillStyle = '#9ef5b6'; c.font = '11px monospace'; c.textAlign = 'center'; c.fillText(`ALLIÉ · ${Math.ceil(a.ttl)}s`, a.x, a.y + 20); } return; }
    if (!dead && a.vehicle) { this.bitmap('car', a.x, a.y, 174, state.time, a.facing); return; }
    if (!dead && a.pattern?.kind === 'bike') { this.bitmap('bike', a.x, a.y, 188, state.time, a.facing); return; }
    if (!dead && a.pattern?.kind === 'smoke') { this.bitmap('smokeHeal', a.x, a.y, 176, state.time, a.facing); return; }
    if (!dead && (a.pattern?.kind === 'paint' || a.specialState?.kind === 'kikor')) { this.bitmap('painter', a.x, a.y, 155, state.time, a.facing); return; }
    if (!dead && a.specialState && ['jualos', 'yanu', 'jo'].includes(a.kind)) {
      this.bitmap(({ jualos: 'pig', yanu: 'wolf', jo: 'tornado' })[a.kind], a.x, a.y, a.kind === 'jualos' ? 112 : 147, state.time, a.facing, true);
      if (a.kind === 'yanu') { c.strokeStyle = '#b8ffee'; c.lineWidth = 4; c.globalAlpha = .5; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(a.x, a.y - 55, 130 + i * 10, 42 + i * 7, -.3, state.time * 5, state.time * 5 + 1.7); c.stroke(); } c.globalAlpha = 1; }
      return;
    }
    if (action === 'sleep') { action = 'dead'; c.fillStyle = '#c8e2ff'; c.font = 'bold 20px monospace'; c.fillText('Z z z', a.x + 28, a.y - 70 - Math.sin(state.time * 2) * 8); }
    if (a.pattern?.kind === 'whisky') { this.bitmap('bottle', a.x + a.facing * 32, a.y - 95, 43); }
    let progress = action === 'idle' ? (state.time * 1.3) % 1 : action === 'walk' || action === 'dodge' ? (state.time * 2.1) % 1 : clamp(t / (a.attack?.duration || (dead ? .65 : .45)), 0, .999);
    if (a.z > 0 && !a.attack && !dead) { action = 'jump'; progress = clamp(1 - a.vz / 490, 0, .999); }
    const frame = this.assets.frame(a.kind, action, progress, a.enemy && !a.boss) || this.assets.frame(a.kind, 'idle', 0, a.enemy && !a.boss);
    if (!frame) return;
    const base = this.assets.frame(a.kind, 'idle', 0, a.enemy && !a.boss);
    const height = (a.boss ? 176 : 144) * (.94 + (a.y - FLOOR.top) / (FLOOR.bottom - FLOOR.top) * .12);
    const [sx, sy, sw, sh] = frame.rect;
    const scale = height / (base?.rect[3] || sh), dw = sw * scale, dh = sh * scale;
    c.save();
    if (dead && a.enemy) c.globalAlpha = clamp((1.2 - a.deadTime) / .4, 0, 1);
    else if (a.invincible > .2 && Math.floor(state.time * 14) % 2 === 0) c.globalAlpha = .63;
    c.translate(a.x, a.y - a.z); c.scale(a.facing, 1);
    c.imageSmoothingEnabled = false;
    if (a.action === 'dodge' && !dead) { c.globalAlpha = .25; c.drawImage(frame.image, sx, sy, sw, sh, -dw / 2 - a.facing * 28, -dh, dw, dh); c.globalAlpha = .82; }
    if (a.flash > 0) { c.filter = 'brightness(2.6) saturate(.3)'; }
    else if (a.boss && a.enraged) c.filter = 'sepia(.2) saturate(1.5)';
    c.drawImage(frame.image, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
    c.restore();
    if (a.attack && !a.enemy && a.attack.hit && a.attack.elapsed < a.attack.windup + .17) {
      c.save(); c.translate(a.x + a.facing * 26, a.y - height * .48 - a.z); c.scale(a.facing, 1);
      c.strokeStyle = a.attack.type === 'special' ? fighter(a.kind).color : '#fff0b0'; c.lineWidth = a.attack.heavy ? 7 : 4; c.globalAlpha = .7;
      c.beginPath(); c.ellipse(10, 0, a.attack.heavy ? 94 : 68, a.attack.heavy ? 62 : 40, -.2, -1.25, 1.1); c.stroke(); c.restore();
    }
    if (a.enemy && !a.boss && a.hp < a.maxHp && !dead) {
      c.fillStyle = '#090c14c9'; c.fillRect(a.x - 27, a.y - height - a.z - 17, 54, 4);
      c.fillStyle = '#ef8b81'; c.fillRect(a.x - 27, a.y - height - a.z - 17, 54 * a.hp / a.maxHp, 4);
    }
    if (a.enemy && a.attack && !a.attack.hit) {
      c.font = 'bold 25px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ff9e91'; c.shadowColor = '#210507'; c.shadowBlur = 6;
      c.fillText(a.attack.type === 'special' ? '!!' : '!', a.x, a.y - height - 27); c.shadowBlur = 0;
    }
    if (!a.enemy) {
      c.textAlign = 'center'; c.font = 'bold 11px monospace'; c.fillStyle = color;
      if (dead) {
        c.fillText(a.lives ? `À TERRE · ${Math.max(0, Math.ceil(14 - a.downTime))}s` : 'À TERRE', a.x, a.y - 48);
        if (state.players.length === 2) { c.fillStyle = '#f1eee7'; c.fillText('MAINTENIR E / LB', a.x, a.y - 31); }
        if (a.revive > 0) { c.fillStyle = '#183d36'; c.fillRect(a.x - 35, a.y - 22, 70, 4); c.fillStyle = '#9befca'; c.fillRect(a.x - 35, a.y - 22, 70 * a.revive / 1.7, 4); }
      } else { c.fillText(a.id === slot + 1 ? `J${a.id} · TOI` : `J${a.id}`, a.x, a.y + 24); }
    }
  }
  prop(p) {
    if (p.kind === 'easel') { this.bitmap('easel', p.x, p.y, 125, 0); const c = this.ctx; c.fillStyle = p.enemy ? '#ff9789' : '#95e8b8'; c.font = '11px monospace'; c.textAlign = 'center'; c.fillText(p.enemy ? `TABLEAU · ${p.hp} COUPS` : 'TOILE ALLIÉE', p.x, p.y + 15); return; }
    const c = this.ctx, img = this.assets.get(`/assets/shared/decor/${p.kind === 'crate' ? 'crate0' : 'obj_baril'}.png`);
    if (!img) return;
    const h = p.kind === 'crate' ? 61 : 75, w = img.width / img.height * h;
    this.ellipse(p.x + 3, p.y + 1, w / 2, 8, '#0007'); c.drawImage(img, p.x - w / 2, p.y - h, w, h);
    if (p.hp === 1) { c.fillStyle = '#ffc477'; c.fillRect(p.x - 16, p.y - h - 9, 16, 3); }
  }
  pickup(p, time) {
    const c = this.ctx, bob = Math.sin(time * 4 + p.id) * 3, food = p.kind === 'food';
    this.ellipse(p.x, p.y + 3, 25, 7, food ? '#98e7ad28' : '#ffba5830');
    c.save(); c.shadowBlur = 16; c.shadowColor = food ? '#8cf7b9' : '#ffba58';
    if (food) { const img = this.assets.get('/assets/shared/pickups/chicken.png'); if (img) c.drawImage(img, p.x - 18, p.y - 30 + bob, 36, 30); }
    else { c.fillStyle = '#ffc76f'; c.font = 'bold 35px sans-serif'; c.textAlign = 'center'; c.fillText('ϟ', p.x, p.y - 5 + bob); }
    c.restore();
  }
  exit(state) {
    const c = this.ctx, pulse = .55 + Math.sin(state.time * 4) * .2;
    c.save(); c.globalAlpha = pulse;
    const g = c.createLinearGradient(1140, 0, W, 0); g.addColorStop(0, '#ffba5800'); g.addColorStop(1, '#ffba5844'); c.fillStyle = g; c.fillRect(1140, 410, 140, 275);
    c.fillStyle = '#ffd180'; c.textAlign = 'center'; c.font = '48px Impact, sans-serif'; c.fillText('→', 1190, 465); c.font = '13px Impact, sans-serif'; c.fillText('ON AVANCE', 1190, 488); c.restore();
  }
  intro(state) {
    const c = this.ctx, chapter = CHAPTERS[state.chapter];
    c.save();
    const duration = state.stage === 0 ? 2.4 : 1.15;
    c.globalAlpha = Math.min(1, (duration - state.phaseTime) * 4, state.phaseTime * 3);
    c.fillStyle = '#070d17d9'; c.fillRect(0, 270, W, state.stage === 0 ? 165 : 112);
    c.fillStyle = chapter.color; c.fillRect(0, 270, 7, state.stage === 0 ? 165 : 112);
    c.textAlign = 'center'; c.fillStyle = chapter.color; c.font = '12px monospace';
    c.fillText(`CHAPITRE ${String(state.chapter + 1).padStart(2, '0')}  /  RUE ${state.stage + 1} SUR 6`, W / 2, 305);
    c.fillStyle = '#f4f1e8'; c.font = '54px Impact, sans-serif'; c.fillText(state.stage === 5 ? 'LE PATRON DU QUARTIER.' : chapter.name.toUpperCase(), W / 2, 362);
    if (state.stage === 0) { c.fillStyle = '#b1bdce'; c.font = 'italic 16px Segoe UI, sans-serif'; c.fillText(chapter.quote, W / 2, 399); }
    c.restore();
  }
  drawEffects(dt) {
    const c = this.ctx;
    for (const e of this.effects) {
      e.ttl -= dt;
      if (e.ttl <= 0) continue;
      c.save(); c.globalAlpha = clamp(e.ttl / (e.life * .5), 0, 1);
      if (e.type === 'number') { e.y -= 35 * dt; c.font = `bold ${e.text.length > 3 ? 13 : 24}px monospace`; c.textAlign = 'center'; c.fillStyle = e.color; c.strokeStyle = '#07101b'; c.lineWidth = 4; c.strokeText(e.text, e.x, e.y); c.fillText(e.text, e.x, e.y); }
      if (e.type === 'spark') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 400 * dt; c.fillStyle = e.color; c.translate(e.x, e.y); c.rotate(Math.atan2(e.vy, e.vx)); c.fillRect(0, 0, 7, 2.5); }
      if (e.type === 'special') {
        const progress = 1 - e.ttl / e.life;
        c.strokeStyle = '#ffd58e'; c.lineWidth = 9 * (1 - progress); c.globalCompositeOperation = 'lighter';
        c.beginPath(); c.ellipse(e.x, e.y - 30, 45 + progress * 230, 20 + progress * 75, 0, 0, TAU); c.stroke();
        c.globalCompositeOperation = 'source-over'; c.font = 'italic 23px Impact, sans-serif'; c.fillStyle = '#ffe7ba'; c.textAlign = 'center'; c.fillText(e.label.toUpperCase(), clamp(e.x, 180, W - 180), e.y - 190 - progress * 12);
      }
      if (e.type === 'announcement') { c.textAlign = 'center'; c.font = '32px Impact, sans-serif'; c.fillStyle = e.color; c.fillText(e.text, W / 2, 210); }
      c.restore();
    }
    this.effects = this.effects.filter(e => e.ttl > 0);
  }
  hud(s, slot, online, ping) {
    const key = s.players.map(p => p.kind).join(',');
    if (key !== this.hudKey) {
      this.hudKey = key;
      for (let i = 0; i < 2; i++) {
        const el = $(`#hud-p${i + 1}`), p = s.players[i];
        if (!p) { el.innerHTML = '<div class="player-bars"><div><b>SCORE</b></div><strong class="solo-score"></strong></div>'; continue; }
        const f = fighter(p.kind);
        el.innerHTML = `<img src="/assets/${f.id}/${f.id}_p.png" alt=""><div class="player-bars"><div><b>${f.name}</b><small>J${i + 1}${i === slot ? ' · TOI' : ''}</small></div><div class="health-bar"><i></i></div><div class="energy-bar"><i></i></div><div class="xp-bar"><i></i></div><div class="credits"></div><div class="xp-caption"></div></div>`;
      }
    }
    for (let i = 0; i < s.players.length; i++) {
      const p = s.players[i], el = $(`#hud-p${i + 1}`);
      el.querySelector('.health-bar i').style.transform = `scaleX(${p.hp / p.maxHp})`;
      el.querySelector('.energy-bar i').style.transform = `scaleX(${p.energy / 100})`;
      const cost = BALANCE.specials[p.kind].cost;
      el.querySelector('.credits').textContent = `${'◆'.repeat(p.lives)} · ${p.hp > 0 ? `${Math.ceil(p.hp)} PV` : 'À TERRE'} · ${p.specialCd > 0 ? `SP ${Math.ceil(p.specialCd)}s` : p.energy >= cost ? 'SPÉCIAL PRÊT' : `ÉNERGIE < ${cost}`}`;
      const r = p.progression; if (r) { el.querySelector('.xp-bar i').style.transform = `scaleX(${r.nextXp ? r.xp / r.nextXp : 1})`; el.querySelector('.xp-caption').textContent = `NIV. ${r.level} · ${r.nextXp ? `${r.xp}/${r.nextXp} XP` : 'MAX'}${r.points ? ` · ${r.points} PT · PAUSE` : ''}`; }
    }
    const soloScore = $('.solo-score'); if (soloScore) soloScore.textContent = scoreText(s.score);
    $('#mission-chapter').textContent = `CHAPITRE ${String(s.chapter + 1).padStart(2, '0')} / 06${online ? ' · ' + scoreText(s.score) : ''}`;
    $('#mission-title').textContent = CHAPTERS[s.chapter].name;
    $('#street-progress').innerHTML = CHAPTERS[s.chapter].backgrounds.map((_, i) => `<i class="${i <= s.stage ? 'done' : ''}"></i>`).join('');
    const count = s.enemies.filter(e => e.hp > 0).length;
    $('#objective').textContent = s.phase === 'clear' ? (s.players.length === 2 ? 'Rue dégagée · Tous les deux à droite →' : 'Rue dégagée · Avance à droite →') : s.phase === 'intro' ? 'La nuit ne fait que commencer.' : s.phase === 'rest' ? `On souffle · Renforts dans ${Math.ceil(s.phaseTime)}s` : `VAGUE ${s.wave + 1}/${s.waves.length} · ${count} ennemis${s.spawnQueue.length ? ` + ${s.spawnQueue.length} renforts` : ''} · RUE ${s.stage + 1}/6`;
    $('#ping').textContent = online ? `${Math.round(ping)} ms · EN LIGNE` : 'SOLO';
    const boss = s.enemies.find(e => e.boss && e.hp > 0);
    $('#boss-hud').classList.toggle('hidden', !boss);
    if (boss) { $('#boss-name').textContent = `${fighter(boss.kind).name} — ${boss.vehicle ? 'DÉTRUIS LA GOLF BLANCHE' : `PHASE ${boss.bossPhase}${boss.pattern ? ' · ' + (PATTERN_LABELS[boss.pattern.kind] || '') : boss.recovering > 0 ? ' · CONTRE-ATTAQUE !' : ''}`}`; $('#boss-health').style.transform = `scaleX(${boss.hp / boss.maxHp})`; }
  }
}
