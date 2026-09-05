import { VERSION } from './data.js';

export class Network {
  constructor(onMessage, onStatus) { this.onMessage = onMessage; this.onStatus = onStatus; this.socket = null; this.code = ''; this.token = ''; this.slot = 0; this.ping = 0; this.closed = true; this.generation = 0; this.retryTimer = null; this.heartbeat = null; this.attempt = 0; this.lastMessage = 0; }
  async connect() {
    const generation = ++this.generation;
    clearTimeout(this.retryTimer); clearInterval(this.heartbeat);
    this.closed = false;
    return new Promise((resolve, reject) => {
      const url = new URL('/ws', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(url); this.socket = socket;
      const timer = setTimeout(() => { socket.close(); reject(new Error('Le serveur ne répond pas. Réessaie dans un instant.')); }, 10000);
      socket.addEventListener('open', () => {
        if (generation !== this.generation) { socket.close(); return; }
        clearTimeout(timer); this.lastMessage = performance.now(); this.attempt = 0;
        this.heartbeat = setInterval(() => {
          if (performance.now() - this.lastMessage > 6500) { socket.close(); return; }
          this.send({ type: 'ping', at: performance.now() });
        }, 2000);
        resolve();
      });
      socket.addEventListener('message', event => {
        if (generation !== this.generation) return;
        this.lastMessage = performance.now();
        let message; try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'pong') { this.ping = Math.max(0, performance.now() - message.at); return; }
        if (message.type === 'joined') {
          if (message.version !== VERSION) { this.onStatus('error', 'Le jeu a été mis à jour. Recharge la page.'); this.close(); return; }
          this.code = message.code; this.token = message.token; this.slot = message.slot;
          try { sessionStorage.setItem('saranfou-room', JSON.stringify({ code: this.code, token: this.token })); } catch {}
        }
        this.onMessage(message);
      });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Connexion impossible. Vérifie ta connexion et que le serveur du jeu est démarré.')); });
      socket.addEventListener('close', () => {
        clearTimeout(timer);
        if (generation !== this.generation) return;
        clearInterval(this.heartbeat);
        if (!this.closed && this.code && this.token) { this.onStatus('reconnecting'); this.reconnect(); }
        else if (!this.closed) this.onStatus('error', 'Connexion fermée. Tu peux réessayer.');
        reject(new Error('Connexion interrompue.'));
      });
    });
  }
  reconnect() {
    if (this.closed) return;
    this.retryTimer = setTimeout(async () => {
      if (this.closed) return;
      try { await this.connect(); this.send({ type: 'join', code: this.code, token: this.token }); }
      catch { if (!this.closed && !this.retryTimer) this.reconnect(); }
    }, Math.min(4000, 700 * 2 ** this.attempt++));
  }
  send(message) { if (this.socket?.readyState === WebSocket.OPEN && this.socket.bufferedAmount < 32000) this.socket.send(JSON.stringify(message)); }
  close(leave = false) {
    if (leave) this.send({ type: 'leave' });
    this.closed = true; this.generation++; clearTimeout(this.retryTimer); clearInterval(this.heartbeat); this.socket?.close(); this.socket = null;
    this.code = ''; this.token = ''; this.attempt = 0;
    try { sessionStorage.removeItem('saranfou-room'); } catch {}
  }
}
