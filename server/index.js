import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { WebSocketServer, WebSocket } from 'ws';
import { Simulation } from '../game/simulation.js';
import { FIGHTERS, CHAPTERS, VERSION, STEP, blankInput, neutralInput, sanitizeInput } from '../game/data.js';
import { normalizeProfile } from '../game/progression.js';
import { DIFFICULTIES } from '../game/balance.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
const validCharacter = value => FIGHTERS.some(c => c.id === value);
const validCode = value => typeof value === 'string' && /^[A-Z2-9]{6}$/.test(value);
const send = (socket, message) => { if (socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 250_000) socket.send(JSON.stringify(message)); };

export function createGameServer({ root = ROOT, maxRooms = 100, reconnectMs = 45_000 } = {}) {
  const rooms = new Map(), ipCounts = new Map();
  const server = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss:; media-src 'self' blob:; font-src 'self'; base-uri 'self'; frame-ancestors 'self'");
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/health') {
        response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ ok: true, game: 'saranfou', version: VERSION, rooms: rooms.size })); return;
      }
      const requested = decodeURIComponent(url.pathname);
      if (requested.includes('\\') || requested.split('/').some(segment => segment === '..' || segment.startsWith('.'))) { response.writeHead(403); response.end(); return; }
      // Only public game resources are served; never the checkout or server sources.
      if (requested !== '/' && requested !== '/index.html' && !/^\/(game|styles|assets)\//.test(requested)) { response.writeHead(404); response.end('Introuvable'); return; }
      const absolute = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
      const base = await realpath(root);
      const resolved = await realpath(absolute);
      const relative = path.relative(base, resolved);
      if (!resolved.startsWith(base + path.sep) || /(^|[\\/])\./.test(relative) || (relative !== 'index.html' && !/^(game|styles|assets)[\\/]/.test(relative))) { response.writeHead(403); response.end(); return; }
      const info = await stat(resolved);
      if (!info.isFile()) { response.writeHead(404); response.end(); return; }
      const etag = `W/"${info.size}-${Math.trunc(info.mtimeMs)}"`;
      response.setHeader('ETag', etag);
      response.setHeader('Cache-Control', requested.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache');
      if (request.headers['if-none-match'] === etag) { response.writeHead(304); response.end(); return; }
      response.writeHead(200, { 'Content-Type': MIME[path.extname(resolved)] || 'application/octet-stream', 'Content-Length': info.size });
      if (request.method === 'HEAD') response.end();
      else { const stream = createReadStream(resolved); stream.on('error', () => response.destroy()); stream.pipe(response); }
    } catch { response.writeHead(404); response.end('Introuvable'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  server.on('upgrade', (request, socket, head) => {
    const ip = request.socket.remoteAddress;
    let originOk = true;
    try { if (request.headers.origin) originOk = new URL(request.headers.origin).host === request.headers.host; } catch { originOk = false; }
    if (request.url !== '/ws' || !originOk || (ipCounts.get(ip) || 0) >= 12 || wss.clients.size >= 250) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(request, socket, head, ws => { ws.ip = ip; wss.emit('connection', ws); });
  });
  const error = (ws, message) => send(ws, { type: 'error', message });
  function lobby(room) {
    broadcast(room, { type: 'lobby', code: room.code, chapter: room.chapter, difficulty: room.difficulty, phase: room.sim ? 'game' : 'lobby',
      players: room.players.map((p, slot) => p ? { slot, character: p.character, ready: p.ready, loaded: p.loaded, connected: !!p.ws } : null) });
  }
  function broadcast(room, message) { for (const p of room.players) if (p) send(p.ws, message); }
  function setMember(ws, room, slot, player) {
    ws.room = room; ws.slot = slot; room.players[slot] = player; player.ws = ws; player.disconnectedAt = 0;
    send(ws, { type: 'joined', code: room.code, slot, token: player.token, version: VERSION });
    lobby(room);
  }
  function detach(ws, explicit = false) {
    const room = ws.room, slot = ws.slot;
    ws.room = null;
    if (!room || room.players[slot]?.ws !== ws) return;
    const p = room.players[slot]; p.ws = null; p.input = blankInput(); p.disconnectedAt = Date.now();
    if (explicit) p.token = '';
    if (room.sim) {
      room.sim.state.players[slot].connected = false;
      room.sim.pause(true, explicit ? 'left' : 'connection');
      broadcast(room, { type: 'paused', reason: explicit ? 'left' : 'connection', slot, reconnectMs });
    } else {
      if (explicit || slot === 1) room.players[slot] = null;
      for (const member of room.players) if (member) member.ready = false;
      if (slot === 0 && explicit) { broadcast(room, { type: 'closed', message: 'L’hôte a fermé le salon.' }); rooms.delete(room.code); }
    }
    if (room.players.every(member => !member?.ws) && explicit) rooms.delete(room.code);
    else lobby(room);
  }
  wss.on('connection', ws => {
    ipCounts.set(ws.ip, (ipCounts.get(ws.ip) || 0) + 1);
    ws.alive = true; ws.windowAt = Date.now(); ws.messages = 0; ws.actions = 0; ws.createdAt = Date.now();
    ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    ws.on('message', bytes => {
      if (Date.now() - ws.windowAt > 1000) { ws.windowAt = Date.now(); ws.messages = 0; ws.actions = 0; }
      if (++ws.messages > 100) { ws.close(1008, 'Rate limit'); return; }
      let msg;
      try { msg = JSON.parse(bytes.toString()); } catch { error(ws, 'Message invalide.'); return; }
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
      if (msg.type === 'ping') {
        send(ws, { type: 'pong', at: msg.at });
        const state = ws.room?.sim?.state;
        if (state && ['won', 'over'].includes(state.phase)) send(ws, { type: 'state', state });
        return;
      }
      if (msg.type !== 'input' && ++ws.actions > 15) return;
      if (msg.type === 'create') {
        if (ws.room) { error(ws, 'Tu es déjà dans un salon.'); return; }
        if (rooms.size >= maxRooms) { error(ws, 'Les rues sont pleines. Réessaie dans un instant.'); return; }
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        do { code = [...randomBytes(6)].map(n => alphabet[n % alphabet.length]).join(''); } while (rooms.has(code));
        const player = { character: validCharacter(msg.character) ? msg.character : 'karonux', token: randomBytes(24).toString('hex'), ready: false, loaded: false, input: blankInput(), lastInput: 0 };
        player.profile = normalizeProfile({}, player.character);
        const room = { code, chapter: 0, players: [player, null], sim: null, createdAt: Date.now(), lastActive: Date.now(), accumulator: 0, snapshotCounter: 0 };
        room.difficulty = Object.hasOwn(DIFFICULTIES, msg.difficulty) ? msg.difficulty : 'normal';
        rooms.set(code, room); setMember(ws, room, 0, player); return;
      }
      if (msg.type === 'join') {
        if (ws.room) { error(ws, 'Tu es déjà dans un salon.'); return; }
        if (!validCode(msg.code)) { error(ws, 'Le code doit contenir 6 lettres ou chiffres.'); return; }
        const room = rooms.get(msg.code);
        if (!room) { error(ws, 'Ce salon n’existe plus. Vérifie le code ou crée le tien.'); return; }
        const resumeSlot = typeof msg.token === 'string' && msg.token.length > 20 ? room.players.findIndex(p => p?.token === msg.token) : -1;
        if (resumeSlot >= 0) {
          const p = room.players[resumeSlot];
          if (p.ws && p.ws !== ws) { error(ws, 'Ce joueur est déjà connecté.'); return; }
          setMember(ws, room, resumeSlot, p);
          if (room.sim) {
            p.loaded = false; room.sim.state.players[resumeSlot].connected = true;
            send(ws, { type: 'prepare', characters: room.players.map(x => x.character), chapter: room.sim.state.chapter, resume: true });
          }
          return;
        }
        if (room.sim || room.players[1]) { error(ws, 'Ce salon est complet ou la partie a déjà commencé.'); return; }
        const p = { character: validCharacter(msg.character) ? msg.character : 'yanu', token: randomBytes(24).toString('hex'), ready: false, loaded: false, input: blankInput(), lastInput: 0 };
        p.profile = normalizeProfile({}, p.character);
        setMember(ws, room, 1, p); return;
      }
      const room = ws.room, player = room?.players[ws.slot];
      if (!room || player?.ws !== ws) return;
      room.lastActive = Date.now();
      if (msg.type === 'leave') { detach(ws, true); return; }
      if (msg.type === 'select' && !room.sim) {
        if (validCharacter(msg.character)) { player.character = msg.character; player.profile = normalizeProfile({}, player.character); player.ready = false; }
        if (ws.slot === 0 && Object.hasOwn(DIFFICULTIES, msg.difficulty)) { room.difficulty = msg.difficulty; for (const p of room.players) if (p) p.ready = false; }
        if (ws.slot === 0 && Number.isInteger(msg.chapter) && msg.chapter >= 0 && msg.chapter < CHAPTERS.length) {
          room.chapter = msg.chapter; for (const p of room.players) if (p) p.ready = false;
        }
        lobby(room); return;
      }
      if (msg.type === 'ready' && !room.sim) {
        player.ready = !!msg.value; lobby(room);
        if (room.players.every(p => p?.ws && p.ready)) {
          room.sim = new Simulation(room.players.map(p => p.character), room.chapter, Date.now(), { difficulty: room.difficulty, profiles: room.players.map(p => p.profile) });
          room.sim.pause(true, 'loading');
          for (const p of room.players) p.loaded = false;
          broadcast(room, { type: 'prepare', characters: room.players.map(p => p.character), chapter: room.chapter });
        }
        return;
      }
      if (msg.type === 'loaded' && room.sim) {
        player.loaded = true;
        if (room.players.every(p => p?.ws && p.loaded)) {
          for (let i = 0; i < room.players.length; i++) { room.players[i].input = blankInput(); room.sim.state.players[i].taps = {}; }
          room.sim.pause(false); room.accumulator = 0;
          broadcast(room, { type: 'start', state: room.sim.snapshot() });
        } else send(ws, { type: 'waiting', message: 'Ton pote prépare encore ses baskets…' });
        return;
      }
      if (msg.type === 'input' && room.sim) { player.input = sanitizeInput(msg.input); player.lastInput = Date.now(); return; }
      if (msg.type === 'spend' && room.sim) {
        if (room.sim.spendStat(ws.slot, msg.stat)) { player.profile = room.sim.state.players[ws.slot].progression; broadcast(room, { type: 'state', state: room.sim.snapshot() }); }
        else error(ws, 'Amélioration impossible : mets en pause et vérifie tes points disponibles.');
        return;
      }
      if (msg.type === 'pause' && room.sim && !['won', 'over'].includes(room.sim.state.phase)) {
        if (!room.players.every(p => p?.ws && p.loaded)) return;
        room.sim.pause(msg.value === true, 'manual');
        for (const p of room.players) p.input = neutralInput(p.input);
        broadcast(room, { type: 'paused', value: room.sim.state.paused, reason: 'manual', slot: ws.slot }); return;
      }
      if (msg.type === 'retry' && room.sim && ['won', 'over'].includes(room.sim.state.phase)) {
        if (ws.slot !== 0) { error(ws, 'L’hôte peut relancer la partie.'); return; }
        room.chapter = room.sim.state.phase === 'won' ? 0 : room.sim.state.chapter;
        for (const member of room.players) if (member) member.profile = normalizeProfile({}, member.character);
        room.sim = null;
        for (const p of room.players) if (p) { p.ready = false; p.loaded = false; p.input = blankInput(); }
        lobby(room);
      }
    });
    ws.on('close', () => { ipCounts.set(ws.ip, Math.max(0, (ipCounts.get(ws.ip) || 1) - 1)); if (!ipCounts.get(ws.ip)) ipCounts.delete(ws.ip); detach(ws); });
  });
  let last = performance.now();
  const ticker = setInterval(() => {
    const now = performance.now(), elapsed = Math.min(.1, (now - last) / 1000); last = now;
    for (const room of rooms.values()) {
      if (!room.sim || room.sim.state.paused || ['won', 'over'].includes(room.sim.state.phase)) continue;
      room.accumulator += elapsed;
      while (room.accumulator >= STEP) {
        const previousChapter = room.sim.state.chapter;
        room.sim.step(room.players.map(p => p && Date.now() - p.lastInput < 350 ? p.input : neutralInput(p?.input)));
        room.accumulator -= STEP;
        if (room.sim.state.chapter !== previousChapter) {
          room.sim.pause(true, 'loading');
          for (const p of room.players) p.loaded = false;
          broadcast(room, { type: 'prepare', characters: room.players.map(p => p.character), chapter: room.sim.state.chapter, resume: true });
          break;
        }
        if (++room.snapshotCounter % 3 === 0) broadcast(room, { type: 'state', state: room.sim.snapshot() });
        if (['won', 'over'].includes(room.sim.state.phase)) { broadcast(room, { type: 'state', state: room.sim.snapshot() }); break; }
      }
    }
  }, 1000 / 60);
  const housekeeping = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } }
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.lastActive > 60 * 60_000 || room.players.every(p => !p?.ws && (!p || now - p.disconnectedAt > reconnectMs))) {
        broadcast(room, { type: 'closed', message: 'Le salon a été fermé après une longue absence.' }); rooms.delete(code); continue;
      }
      for (const p of room.players) if (p && !p.ws && now - p.disconnectedAt > reconnectMs && !p.expired) {
        p.expired = true; p.token = '';
        broadcast(room, { type: 'paused', reason: 'expired', reconnectMs: 0 });
      }
    }
  }, 10_000);
  ticker.unref(); housekeeping.unref();
  async function close() {
    clearInterval(ticker); clearInterval(housekeeping);
    for (const ws of wss.clients) ws.terminate();
    await new Promise(resolve => wss.close(resolve));
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
  return { server, rooms, wss, close };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const game = createGameServer();
  const port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0';
  game.server.listen(port, host, () => console.log(`Streets of SaranFou — http://localhost:${port}\nSolo + salons coopératifs disponibles. Ctrl+C pour arrêter.`));
  game.server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Le port ${port} est déjà utilisé. Change PORT ou ferme l’autre serveur.` : error.message); process.exitCode = 1; game.close(); });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await game.close(); process.exit(0); });
}
