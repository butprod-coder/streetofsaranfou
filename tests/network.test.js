import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createGameServer } from '../server/index.js';

function client(url) {
  const ws = new WebSocket(url), messages = [], waiters = [];
  ws.on('message', bytes => {
    const value = JSON.parse(bytes.toString()), index = waiters.findIndex(w => w.predicate(value));
    if (index >= 0) { const [w] = waiters.splice(index, 1); clearTimeout(w.timer); w.resolve(value); }
    else messages.push(value);
  });
  return {
    ws, opened: new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); }),
    send: message => ws.send(JSON.stringify(message)),
    next: (type, condition = () => true) => new Promise((resolve, reject) => {
      const predicate = m => m.type === type && condition(m), index = messages.findIndex(predicate);
      if (index >= 0) { resolve(messages.splice(index, 1)[0]); return; }
      const item = { predicate, resolve, timer: setTimeout(() => { const i = waiters.indexOf(item); if (i >= 0) waiters.splice(i, 1); reject(new Error(`Timeout waiting for ${type}`)); }, 4000) };
      waiters.push(item);
    }),
    clear: () => { messages.length = 0; },
  };
}

test('two clients complete lobby, load barrier, inputs, shared pause, reload and retry', async t => {
  const game = createGameServer(); await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve));
  t.after(() => game.close());
  const port = game.server.address().port, url = `ws://127.0.0.1:${port}/ws`;
  const host = client(url), guest = client(url); await Promise.all([host.opened, guest.opened]);
  host.send({ type: 'create', character: 'karonux', profile: { completed: [0, 1], talents: ['matelas'] }, difficulty: 'hard' }); const hostInfo = await host.next('joined');
  guest.send({ type: 'join', code: hostInfo.code, character: 'yanu' }); const guestInfo = await guest.next('joined');
  const lobby = await guest.next('lobby'); assert.equal(lobby.players.length, 2); assert.equal(lobby.players[1].character, 'yanu');
  const third = client(url); await third.opened; third.send({ type: 'join', code: hostInfo.code }); assert.match((await third.next('error')).message, /complet/);
  host.send({ type: 'ready', value: true }); guest.send({ type: 'ready', value: true });
  await Promise.all([host.next('prepare'), guest.next('prepare')]);
  host.send({ type: 'loaded' }); await host.next('waiting'); assert.equal(game.rooms.get(hostInfo.code).sim.state.tick, 0);
  guest.send({ type: 'loaded' }); const start = await host.next('start'); await guest.next('start'); assert.equal(start.state.players.length, 2);
  assert.equal(start.state.difficulty, 'hard'); assert.equal(start.state.players[0].progression.points, 0); assert.equal(start.state.players[1].progression.points, 0);
  const sim = game.rooms.get(hostInfo.code).sim;
  sim.awardChapterTalent();
  const initial = start.state.players[1].x;
  game.rooms.get(hostInfo.code).sim.state.phaseTime = 0;
  const interval = setInterval(() => guest.send({ type: 'input', slot: 0, input: { x: 1, seq: 1 } }), 30);
  t.after(() => clearInterval(interval));
  const moved = await host.next('state', m => m.state.players[1].x > initial + 50);
  clearInterval(interval); assert.equal(moved.state.players[0].x, start.state.players[0].x, 'Client cannot control another slot');
  guest.send({ type: 'input', input: null }); guest.send({ type: 'pause', value: true });
  const pause = await host.next('paused'); assert.equal(pause.value, true);
  host.send({ type: 'spend', slot: 1, stat: 'karonux_v2_0_0' });
  const upgraded = await host.next('state', m => m.state.players[0].progression.talents.includes('karonux_v2_0_0'));
  assert.equal(upgraded.state.players[1].progression.talents.length, 0, 'Slot spoof cannot spend another character’s points');
  guest.send({ type: 'spend', stat: 'karonux_v2_0_0' }); assert.match((await guest.next('error')).message, /points/);
  const tick = game.rooms.get(hostInfo.code).sim.state.tick; await new Promise(r => setTimeout(r, 80)); assert.equal(game.rooms.get(hostInfo.code).sim.state.tick, tick);
  host.send({ type: 'pause', value: false }); await host.next('paused', m => m.value === false);
  guest.ws.close(); await host.next('paused', m => m.reason === 'connection');
  const resumed = client(url); await resumed.opened; resumed.send({ type: 'join', code: hostInfo.code, token: guestInfo.token });
  assert.equal((await resumed.next('joined')).slot, 1); await resumed.next('prepare'); resumed.send({ type: 'loaded' });
  const resume = await resumed.next('start'); assert.equal(resume.state.paused, false); assert.ok(resume.state.tick >= tick);
  assert.equal(resume.state.players[0].progression.talents.includes('karonux_v2_0_0'), true, 'Reconnection retains investments');
  sim.state.chapter = 0; sim.state.stage = 5; sim.state.phase = 'transition'; sim.state.phaseTime = 0;
  const chapterLoad = await host.next('prepare'); assert.equal(chapterLoad.chapter, 1); assert.equal(sim.state.paused, true);
  host.send({ type: 'loaded' }); resumed.send({ type: 'loaded' }); await resumed.next('start'); await host.next('start');
  sim.state.phase = 'over'; host.send({ type: 'retry' });
  const retry = await host.next('lobby', m => m.phase === 'lobby' && m.chapter === 1);
  assert.equal(retry.players[0].ready, false); assert.equal(retry.players[1].ready, false);
  assert.equal(game.rooms.get(hostInfo.code).players[0].profile.talents.length, 0, 'A retry starts with a fresh talent tree');
});

test('HTTP serves only public resources and rejects traversal, hidden files and unsupported methods', async t => {
  const game = createGameServer(); await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve)); t.after(() => game.close());
  const base = `http://127.0.0.1:${game.server.address().port}`;
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/health')).status, 200);
  assert.equal((await fetch(base + '/server/index.js')).status, 404);
  assert.equal((await fetch(base + '/.git/config')).status, 403);
  assert.equal((await fetch(base + '/game/..%2fserver/index.js')).status, 403);
  assert.equal((await fetch(base + '/game/..%5cserver/index.js')).status, 403);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  const response = await fetch(base + '/game/data.js'); const etag = response.headers.get('etag');
  assert.equal((await fetch(base + '/game/data.js', { headers: { 'If-None-Match': etag } })).status, 304);
});

test('elite sofa and rage remain coherent for two network peers', async t => {
  const game = createGameServer(); await new Promise(r => game.server.listen(0, '127.0.0.1', r)); t.after(() => game.close());
  const url = `ws://127.0.0.1:${game.server.address().port}/ws`, host = client(url), guest = client(url);
  await Promise.all([host.opened, guest.opened]); host.send({ type: 'create', character: 'gustavax' });
  const info = await host.next('joined'); guest.send({ type: 'join', code: info.code, character: 'yanu' }); await guest.next('joined');
  host.send({ type: 'ready', value: true }); guest.send({ type: 'ready', value: true });
  await Promise.all([host.next('prepare'), guest.next('prepare')]); host.send({ type: 'loaded' }); guest.send({ type: 'loaded' });
  await Promise.all([host.next('start'), guest.next('start')]);
  const sim = game.rooms.get(info.code).sim;
  Object.assign(sim.state, { phase: 'fight', enemies: [], props: [], spawnQueue: [] });
  const elite = sim.spawnEnemy('canape', { x: 750, y: 550 }); elite.eliteState.landing = 0; elite.z = 0; sim.ejectSofa(elite);
  const p = sim.state.players[1], sofa = sim.state.props.find(p => p.kind === 'sofa'); p.x = sofa.x; p.y = sofa.y;
  guest.send({ type: 'input', input: { revive: true, seq: 1 } });
  const sitting = setInterval(() => guest.send({ type: 'input', input: { revive: true, seq: 1 } }), 30); t.after(() => clearInterval(sitting));
  const snapshots = await Promise.all([host.next('state', m => m.state.enemies.some(e => e.elite && e.enraged)), guest.next('state', m => m.state.enemies.some(e => e.elite && e.enraged))]);
  for (const m of snapshots) { assert.equal(m.state.players[1].sitting, sofa.id); assert.equal(m.state.enemies[0].eliteState.seated, false); }
  clearInterval(sitting);
  guest.send({ type: 'input', input: { x: -1, seq: 2 } });
  await host.next('state', m => m.state.players[1].sitting === null);
});

test('cross-origin websocket upgrades are rejected', async t => {
  const game = createGameServer(); await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve)); t.after(() => game.close());
  const ws = new WebSocket(`ws://127.0.0.1:${game.server.address().port}/ws`, { origin: 'https://untrusted.example' });
  await new Promise(resolve => ws.on('error', e => { assert.match(e.message, /403/); resolve(); }));
});
