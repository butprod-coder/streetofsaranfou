export class DuoNetwork {
  constructor(handlers={}) {
    this.handlers = handlers;
    this.peer = null;
    this.conn = null;
    this.role = null;
    this.lastSent = 0;
  }

  get supported() { return typeof window.Peer === 'function'; }

  async host(code) {
    if (!this.supported) throw new Error('Le service de connexion est indisponible.');
    this.close();
    this.role = 'host';
    this.peer = new window.Peer(`saranfou-${code.toLowerCase()}`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Le salon met trop de temps à répondre.')), 12000);
      this.peer.on('open', () => { clearTimeout(timer); resolve(code); });
      this.peer.on('connection', conn => {
        if (this.conn?.open) { conn.close(); return; }
        this.attach(conn);
      });
      this.peer.on('error', err => { clearTimeout(timer); reject(this.friendly(err)); });
    });
  }

  async join(code) {
    if (!this.supported) throw new Error('Le service de connexion est indisponible.');
    this.close();
    this.role = 'guest';
    this.peer = new window.Peer();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Salon introuvable. Vérifie le code.')), 12000);
      this.peer.on('open', () => {
        const conn = this.peer.connect(`saranfou-${code.toLowerCase()}`, { reliable:true, serialization:'json' });
        this.attach(conn, () => { clearTimeout(timer); resolve(code); });
      });
      this.peer.on('error', err => { clearTimeout(timer); reject(this.friendly(err)); });
    });
  }

  attach(conn, onOpen) {
    this.conn = conn;
    conn.on('open', () => {
      onOpen?.();
      this.handlers.open?.(this.role);
      this.send({ type:'hello', role:this.role });
    });
    conn.on('data', data => this.handlers.data?.(data));
    conn.on('close', () => this.handlers.close?.());
    conn.on('error', err => this.handlers.error?.(this.friendly(err)));
  }

  send(data) { if (this.conn?.open) this.conn.send(data); }
  close() {
    try { this.conn?.close(); } catch (_) {}
    try { this.peer?.destroy(); } catch (_) {}
    this.conn = null; this.peer = null; this.role = null;
  }
  friendly(err) {
    if (err?.type === 'unavailable-id') return new Error('Ce code de salon est déjà utilisé.');
    if (err?.type === 'peer-unavailable') return new Error('Salon introuvable. Vérifie le code.');
    return new Error(err?.message || 'Connexion impossible.');
  }
}

