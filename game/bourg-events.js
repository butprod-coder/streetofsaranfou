export const BOURG_KINDS = ['bakery', 'scooter', 'terrace', 'shells'];
export const BOURG_NAMES = { bakery: 'LA DERNIÈRE FOURNÉE', scooter: 'LE SCOOTER MAL GARÉ', terrace: 'LA TERRASSE EN VRAC', shells: 'LE BONNETEAU DE GUYLUX' };
export const isBourg = e => !!e && BOURG_KINDS.includes(e.kind);
export const BAKERY = { x: 610, y: 495 };
export const CUPS = [{ x: 440, y: 555 }, { x: 650, y: 555 }, { x: 860, y: 555 }];
export const SHELL_EXIT = { x: 1090, y: 625 };
const near = (a, b, radius = 80) => Math.hypot(a.x-b.x, (a.y-b.y)*1.5) < radius;
const activePlayers = s => s.players.filter(p => p.hp > 0 && p.connected !== false);

export function bourgChoices(e) {
  const [label, detail] = {
    bakery: ['AIDER LE BOULANGER', '4 pains partagés : manger (+15 PV) ou lancer'],
    scooter: ['FORCER LE COFFRE', 'Batte garantie · Alarme : propriétaire et sa bande !'],
    terrace: ['DÉFENDRE LA TERRASSE', '3 tables : +10 énergie par table sauvée'],
    shells: ['SUIVRE LA BILLE', '3 manches gratuites · +15 énergie par bonne réponse'],
  }[e.kind];
  return [{ id: 'accept', x: 500, y: 555, label, detail }, { id: 'skip', x: 1040, y: 615, label: 'CONTINUER', detail: 'Sans risque ni récompense' }];
}
// The same cup identities and swaps drive both the animation and the answer.
export function shellPositions(e) {
  const positions = [0, 1, 2];
  if (e.shellPhase === 'show') return positions;
  const elapsed = e.shellPhase === 'mix' ? e.roundTime : e.swaps.length * .9;
  for (let i = 0; i < e.swaps.length; i++) {
    const [a,b] = e.swaps[i], t = Math.max(0, Math.min(1, (elapsed-i*.9)/.9));
    if (!t) break;
    const from = positions[a], to = positions[b], eased = t*t*(3-2*t);
    positions[a] = from+(to-from)*eased; positions[b] = to+(from-to)*eased;
    if (t < 1) break;
  }
  return positions;
}
export const bourgEvents = {
  beginBourg(kind) {
    this.state.neighborhoodEncounter = { kind, status: 'choice', choices: {}, elapsed: 0, held: {}, baked: 0, taken: 0, stock: 0, loaves: [], tables: [], round: 0, roundTime: 0, shellPhase: 'show', guesses: {}, wins: {}, withdrawn: {}, swaps: [], ballCup: 0 };
    this.state.phase = 'encounter';
  },
  startBourg() {
    const s = this.state, e = s.neighborhoodEncounter;
    if (!isBourg(e) || e.status !== 'choice') return;
    e.status = 'active';
    if (e.kind === 'shells') { this.nextBourgRound(); return; }
    s.phase = 'fight';
    s.spawnQueue = e.kind === 'scooter' ? ['makouille','remy','remy'] : ['charlingals','papy_jala','remy'];
    if (s.players.length > 1) s.spawnQueue.push('guylux');
    s.spawnTimer = 1.2;
    for (const p of s.players) p.invincible = Math.max(p.invincible, 1.5);
    if (e.kind === 'bakery') { e.stock = 1; e.baked = 1; }
    if (e.kind === 'scooter') for (const [i,p] of s.players.entries()) s.pickups.push({ id: this.nextId++, kind: 'weapon', weapon: 'bat', uses: 8, x: 720+i*100, y: 550 });
    if (e.kind === 'terrace') for (const [x,y] of [[440,490],[690,605],[950,500]]) {
      const table = this.makeProp('crate', x, y, { hp: 6, maxHp: 6, bourgTable: true });
      s.props.push(table); e.tables.push(table.id);
    }
  },
  interactBourg(p) {
    const s = this.state, e = s.neighborhoodEncounter;
    if (!isBourg(e) || e.status !== 'active') return false;
    if (p.hp <= 0 || p.connected === false || p.z > 0 || p.attack || p.stun > 0) return true;
    if (e.kind === 'bakery') {
      if (e.held[p.id]) { e.held[p.id] = false; p.hp = Math.min(p.maxHp, p.hp+15); return true; }
      if (near(p, BAKERY)) { if (e.stock > 0) { e.stock--; e.taken++; e.held[p.id] = true; } return true; }
    }
    if (e.kind === 'shells') {
      if (near(p, SHELL_EXIT)) { e.withdrawn[p.id] = true; this.updateBourg(0); return true; }
      if (e.shellPhase !== 'guess' || e.withdrawn[p.id] || e.guesses[p.id] != null) return true;
      const index = CUPS.findIndex(c => near(p,c));
      if (index >= 0) { e.guesses[p.id] = index; this.updateBourg(0); }
      return true;
    }
    return false;
  },
  throwBourgBread(p) {
    const s = this.state, e = s.neighborhoodEncounter;
    if (e?.kind !== 'bakery' || e.status !== 'active' || !e.held[p.id] || p.hp <= 0 || p.z > 0 || p.specialState) return false;
    e.held[p.id] = false;
    const target = s.enemies.filter(a => a.hp > 0 && Math.abs(a.y-p.y) < 70).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    const facing = target ? Math.sign(target.x-p.x) || p.facing : p.facing;
    e.loaves.push({ x: p.x, y: p.y, vx: facing*620, owner: p.id, remaining: 1.6 });
    p.facing = facing; p.action = 'punch'; p.actionTime = 0; p.cooldown = .35;
    return true;
  },
  bourgCover(target, source, heavy) {
    const s = this.state, e = s.neighborhoodEncounter;
    if (e?.kind !== 'terrace' || e.status !== 'active' || !source || source === target) return false;
    const dx = target.x-source.x, dy = target.y-source.y, length2 = dx*dx+dy*dy;
    if (length2 < 400) return false;
    const table = s.props.find(t => {
      if (!t.bourgTable || t.hp <= 0) return false;
      const u = ((t.x-source.x)*dx+(t.y-source.y)*dy)/length2;
      return u > .08 && u < .92 && Math.hypot(source.x+dx*u-t.x, (source.y+dy*u-t.y)*1.5) < 40;
    });
    if (!table) return false;
    this.hitProp(table, heavy ? 2 : 1, source);
    return true;
  },
  nextBourgRound() {
    const s = this.state, e = s.neighborhoodEncounter;
    e.round++; e.shellPhase = 'show'; e.roundTime = 0; e.guesses = {};
    let seed = (s.streetSeed ^ Math.imul(e.round, 0x9e3779b9)) >>> 0;
    const draw = n => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return Math.floor(seed/4294967296*n); };
    e.ballCup = draw(3); e.swaps = Array.from({length:4},()=>{const a=draw(3);return [a,(a+1+draw(2))%3];});
  },
  updateBourg(dt) {
    const s = this.state, e = s.neighborhoodEncounter;
    if (!isBourg(e) || e.status !== 'active' || !activePlayers(s).length) return;
    e.elapsed += dt;
    if (e.kind === 'bakery') {
      const baked = Math.min(4, 1+Math.floor(e.elapsed/4));
      e.stock += baked-e.baked; e.baked = baked;
      for (const loaf of e.loaves) {
        loaf.x += loaf.vx*dt; loaf.remaining -= dt;
        const foe = s.enemies.find(a => a.hp > 0 && a.invincible <= 0 && near(a,loaf,50));
        if (foe) { foe.stun = Math.max(foe.stun,2.5); foe.attack = null; foe.pattern = null; loaf.remaining = 0; }
      }
      e.loaves = e.loaves.filter(b => b.remaining > 0 && b.x > 40 && b.x < 1240);
      for (const p of s.players) if (e.held[p.id] && (p.hp <= 0 || p.connected === false)) { e.held[p.id] = false; e.stock++; }
    }
    if (e.kind !== 'shells') return;
    const players = activePlayers(s).filter(p => !e.withdrawn[p.id]);
    if (!players.length) { this.finishNeighborhood(Object.values(e.wins).some(Boolean)?'success':'missed'); return; }
    e.roundTime += dt;
    if (e.shellPhase === 'show' && e.roundTime >= 1.5) { e.shellPhase='mix'; e.roundTime=0; }
    else if (e.shellPhase === 'mix' && e.roundTime >= 3.6) { e.shellPhase='guess'; e.roundTime=0; }
    else if (e.shellPhase === 'guess' && (players.every(p=>e.guesses[p.id]!=null) || e.roundTime >= 20)) {
      const answer = shellPositions(e)[e.ballCup];
      for (const p of players) if (e.guesses[p.id] === answer) { p.energy = Math.min(100,p.energy+15); e.wins[p.id]=(e.wins[p.id]||0)+1; }
      e.shellPhase='reveal'; e.roundTime=0;
    } else if (e.shellPhase === 'reveal' && e.roundTime >= 1.8) {
      if (e.round < 3) this.nextBourgRound();
      else this.finishNeighborhood(Object.values(e.wins).some(Boolean)?'success':'missed');
    }
  },
  finishBourgWave() {
    const s = this.state, e = s.neighborhoodEncounter;
    if (!isBourg(e) || e.status !== 'active' || e.kind === 'shells') return;
    if (e.kind === 'terrace') {
      e.saved = s.props.filter(p => e.tables.includes(p.id) && p.hp > 0).length;
      for (const p of activePlayers(s)) p.energy = Math.min(100,p.energy+e.saved*10);
      this.finishNeighborhood(e.saved?'success':'missed');
    } else this.finishNeighborhood('success');
    e.held = {}; e.loaves = [];
  },
};
