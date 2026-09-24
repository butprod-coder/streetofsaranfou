import { NIGHT_KINDS, SCHOOL_KINDS, LATE_NAMES, isLate, lateChoices } from './late-events.js';
import { BOURG_KINDS, BOURG_NAMES, isBourg, bourgChoices } from './bourg-events.js';
import { STADIUM_KINDS, STADIUM_NAMES, isStadium, stadiumChoices } from './stadium-events.js';
import { ESTATE_KINDS, ESTATE_NAMES, isEstate, estateChoices } from './estate-events.js';
import { WEAPONS } from './weapons.js';

export const NEIGHBORHOOD_KINDS = ['delivery', 'merchant', 'rescue', 'parking'];
export const NEIGHBORHOOD_NAMES = { ...ESTATE_NAMES, ...STADIUM_NAMES, ...BOURG_NAMES, ...LATE_NAMES, delivery: 'LA LIVRAISON RENVERSÉE', merchant: 'LE VENDEUR DU COFFRE', rescue: 'LE VOISIN ENCERCLÉ', parking: 'LE PARKING DES IMMEUBLES' };
// Separate seeded draw: adding encounters does not reshuffle campaign enemies.
export function neighborhoodPlan(seed, chapter = 0) {
  let n = (seed ^ (chapter === 5 ? 0x27d4eb2f : chapter === 4 ? 0x165667b1 : chapter === 3 ? 0xc2b2ae35 : chapter === 2 ? 0x85ebca6b : chapter === 1 ? 0x9e3779b9 : 0)) >>> 0;
  if (chapter >= 3) { n = Math.imul(n ^ (n >>> 16), 0x7feb352d) >>> 0; n = Math.imul(n ^ (n >>> 15), 0x846ca68b) >>> 0; n ^= n >>> 16; }
  const kinds = [...(chapter === 5 ? SCHOOL_KINDS : chapter === 4 ? NIGHT_KINDS : chapter === 3 ? BOURG_KINDS : chapter === 2 ? STADIUM_KINDS : chapter === 1 ? ESTATE_KINDS : NEIGHBORHOOD_KINDS)];
  for (let i = kinds.length - 1; i > 0; i--) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(n / 4294967296 * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return { plan: [1, 3].map((stage, i) => ({ stage, kind: kinds[i] })), outcomes: [], helpStage: null };
}
export function cleanNeighborhood(raw, seed = 0, chapter = 0) {
  const fallback = neighborhoodPlan(seed, chapter);
  const allowed = chapter === 5 ? SCHOOL_KINDS : chapter === 4 ? NIGHT_KINDS : chapter === 3 ? BOURG_KINDS : chapter === 2 ? STADIUM_KINDS : chapter === 1 ? ESTATE_KINDS : NEIGHBORHOOD_KINDS;
  if (!raw || !Array.isArray(raw.plan) || raw.plan.length !== 2 || !raw.plan.every((p, i) => p?.stage === [1, 3][i] && allowed.includes(p.kind)) || raw.plan[0].kind === raw.plan[1].kind) return fallback;
  return { plan: raw.plan.map(({ stage, kind }) => ({ stage, kind })),
    outcomes: (Array.isArray(raw.outcomes) ? raw.outcomes : []).filter((v, i, a) => [1, 3].includes(v?.stage) && ['success', 'missed', 'skipped'].includes(v.status) && a.findIndex(o => o?.stage === v.stage) === i).map(({ stage, status }) => ({ stage, status })),
    ...(chapter === 2 ? { boostStage: [2,4].includes(raw.boostStage) ? raw.boostStage : null } : {}),
    helpStage: [2, 4].includes(raw.helpStage) ? raw.helpStage : null };
}
export function neighborhoodChoices(encounter) {
  if (!encounter || encounter.status !== 'choice') return [];
  if (isLate(encounter)) return lateChoices(encounter);
  if (isBourg(encounter)) return bourgChoices(encounter);
  if (isStadium(encounter)) return stadiumChoices(encounter);
  if (isEstate(encounter)) return estateChoices(encounter);
  if (encounter.kind === 'merchant') return [
    { id: 'food', x: 410, y: 555, label: 'CASSE-CROÛTE', detail: '+35 PV' },
    { id: 'energy', x: 650, y: 555, label: 'BOISSON', detail: '+50 énergie' },
    { id: 'bat', x: 890, y: 555, label: 'BATTE', detail: '8 coups · remplace ton arme' },
    { id: 'skip', x: 1100, y: 625, label: 'PASSER', detail: 'Sans cadeau' },
  ];
  return [
    { id: 'accept', x: 535, y: 555, label: encounter.kind === 'rescue' ? 'AIDER LE VOISIN' : 'ENTRER AU PARKING', detail: encounter.kind === 'rescue' ? '3 adversaires · aide dans la rue suivante' : 'Un gardien costaud · fusil à pompe garanti' },
    { id: 'skip', x: 1030, y: 615, label: 'CONTINUER', detail: 'Sans combat ni récompense' },
  ];
}
const near = (a, b, radius = 82) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.5) < radius;
export const neighborhoodEvents = {
  prepareNeighborhood() {
    const s = this.state;
    s.neighborhoodEncounter = null; s.neighborVisit = null; s.estateVisit = null;
    this.prepareStadium();
    if (s.practice || s.chapter===6) return;
    const planned = (s.chapter === 5 ? s.school : s.chapter === 4 ? s.night : s.chapter === 3 ? s.bourg : s.chapter === 2 ? s.stadium : s.chapter === 1 ? s.estate : s.neighborhood).plan.find(p => p.stage === s.stage);
    if (planned) {
      s.waves[1] = { ...s.waves[1], kinds: [], neighborhood: planned.kind, label: NEIGHBORHOOD_NAMES[planned.kind] };
      // Replaces both the middle wave and the old timed bonus on these streets.
      s.surpriseDone = true;
    }
  },
  beginNeighborhood(kind) {
    const s = this.state;
    s.spawnQueue = []; s.hazards = s.hazards.filter(h => !h.enemy);
    s.neighborhoodEncounter = { kind, status: kind === 'delivery' ? 'active' : 'choice', choices: {}, recovered: 0, stolen: 0, courage: 100 };
    for (const p of s.players) { if (p.hp <= 0) this.revivePlayer(p, .4); this.releaseGrab(p); this.endSpecial(p); p.attack = null; p.vx = 0; p.vy = 0; }
    if (NIGHT_KINDS.includes(kind) || SCHOOL_KINDS.includes(kind)) { this.beginLate(kind); return; }
    if (BOURG_KINDS.includes(kind)) { this.beginBourg(kind); return; }
    if (STADIUM_KINDS.includes(kind)) { this.beginStadium(kind); return; }
    if (ESTATE_KINDS.includes(kind)) { this.beginEstate(kind); return; }
    if (kind === 'delivery') {
      for (let i = 0; i < 3; i++) s.props.push(this.makeProp('crate', 435 + i * 240, [500, 605, 500][i], { cargo: true, cargoLoot: ['food', 'energy', 'bat'][i], steal: 0 }));
      s.spawnQueue = s.players.length > 1 ? ['remy', 'orelsan', 'charlingals', 'remy'] : ['remy', 'orelsan', 'charlingals']; s.spawnTimer = .6; s.phase = 'fight';
    } else s.phase = 'encounter';
    this.event('surprise', { neighborhood: true, label: NEIGHBORHOOD_NAMES[kind] });
  },
  interactNeighborhood(p) {
    const s = this.state, e = s.neighborhoodEncounter;
    if (isLate(e) && e.status === 'active') return this.interactLate(p);
    if (isBourg(e) && e.status === 'active') return this.interactBourg(p);
    if (isStadium(e) && e.status === 'active') return this.interactStadium(p);
    if (isEstate(e) && e.status === 'active') return this.interactEstate(p);
    if (s.phase !== 'encounter' || e?.status !== 'choice') return false;
    // Consumes F/RT here even away from a choice, so it cannot drop a weapon.
    if (p.z > 0 || p.attack || p.stun > 0 || p.hp <= 0 || e.kind === 'merchant' && e.choices[p.id]) return true;
    const choice = neighborhoodChoices(e).find(c => near(p, c));
    if (!choice) return true;
    if (e.kind !== 'merchant' && choice.id === 'accept') {
      // In coop both active players must gather at the risk marker and confirm.
      e.choices[p.id] = 'accept';
      if (s.players.some(other => other.hp > 0 && other.connected !== false && e.choices[other.id] !== 'accept')) return true;
      this.startNeighborhoodFight();
    } else if (e.kind === 'merchant') {
      e.choices[p.id] = choice.id;
      if (choice.id === 'food') p.hp = Math.min(p.maxHp, p.hp + 35);
      if (choice.id === 'energy') p.energy = Math.min(100, p.energy + 50);
      if (choice.id === 'bat') { this.dropWeapon(p); p.weapon = { kind: 'bat', uses: WEAPONS.bat.uses }; }
      this.event('surprise', { neighborhood: true, label: `J${p.id} · ${choice.id === 'skip' ? 'UNE AUTRE FOIS !' : choice.label}` });
      this.updateNeighborhood(0);
    } else this.finishNeighborhood('skipped');
    return true;
  },
  startNeighborhoodFight() {
    const s = this.state, e = s.neighborhoodEncounter;
    if (isLate(e)) { this.startLate(); return; }
    if (isBourg(e)) { this.startBourg(); return; }
    if (isStadium(e)) { this.startStadium(); return; }
    if (isEstate(e)) { this.startEstate(); return; }
    if (e?.status !== 'choice' || !['rescue', 'parking'].includes(e.kind)) return;
    e.status = 'active'; s.phase = 'fight';
    for (const p of s.players) p.invincible = Math.max(p.invincible, 1.2);
    if (e.kind === 'rescue') {
      ['remy', 'orelsan', 'charlingals'].forEach((kind, i) => this.spawnEnemy(kind, { x: 830 + i * 90, y: 480 + i * 65, cooldown: 2, neighborhoodGuard: true }));
      if (s.players.length > 1) s.spawnQueue = ['remy'];
    } else {
      const hp = Math.round(210 * (s.players.length > 1 ? 1.5 : 1));
      this.spawnEnemy('charlingals', { x: 1000, y: 540, hp, maxHp: hp, power: 17, cooldown: 2, parkingGuard: true });
    }
    this.event('surprise', { neighborhood: true, label: e.kind === 'rescue' ? 'ÉLOIGNE LES AGRESSEURS DU VOISIN !' : 'LE GARDIEN DU PARKING · GARDE TA DISTANCE !' });
  },
  finishNeighborhood(status) {
    const s = this.state, e = s.neighborhoodEncounter;
    if (!e || ['success', 'missed', 'skipped'].includes(e.status)) return;
    e.status = status;
    const ledger = isLate(e) ? (NIGHT_KINDS.includes(e.kind) ? s.night : s.school) : isBourg(e) ? s.bourg : isStadium(e) ? s.stadium : isEstate(e) ? s.estate : s.neighborhood;
    if (!ledger.outcomes.some(o => o.stage === s.stage)) ledger.outcomes.push({ stage: s.stage, status });
    if (status === 'success' && e.kind === 'rescue') s.neighborhood.helpStage = s.stage + 1;
    if (status === 'success' && e.kind === 'parking') s.players.forEach((p, i) => s.pickups.push({ id: this.nextId++, kind: 'weapon', weapon: 'shotgun', uses: WEAPONS.shotgun.uses, x: 760 + i * 140, y: 560 }));
    const message = isLate(e) || isBourg(e) || isStadium(e) || isEstate(e) ? NEIGHBORHOOD_NAMES[e.kind] + ' · ' + status : status === 'skipped' ? 'ON CONTINUE PAR LA RUE.' : e.kind === 'rescue' ? status === 'success' ? 'MERCI ! JE VOUS RETROUVE DANS LA RUE SUIVANTE !' : 'LE VOISIN A FUI · ON CONTINUE.' : e.kind === 'parking' ? 'PARKING DÉGAGÉ · F / RT POUR PRENDRE LE FUSIL' : e.kind === 'merchant' ? 'LE COFFRE FERME · BONNE SOIRÉE !' : `${e.recovered}/3 CAISSES RÉCUPÉRÉES · ${e.stolen} VOLÉES`;
    this.event('surprise', { neighborhood: true, label: message });
    // Choice-only encounters grant no wave XP; combat encounters use normal wave XP.
    if (s.phase === 'encounter') { s.phase = 'rest'; s.phaseTime = 4; }
  },
  finishNeighborhoodWave() {
    const e = this.state.neighborhoodEncounter;
    if (e?.status !== 'active') return;
    if (isLate(e)) { this.finishLateWave(); return; }
    if (isBourg(e)) { this.finishBourgWave(); return; }
    if (isStadium(e)) { this.finishStadiumWave(); return; }
    if (isEstate(e)) { this.finishEstateWave(); return; }
    if (e.kind === 'delivery') {
      // Uncontested crates are secured when the gang is defeated, no cleanup grind.
      for (const prop of this.state.props.filter(p => p.cargo && p.hp > 0)) this.hitProp(prop, prop.hp, this.state.players.find(p => p.hp > 0));
    }
    this.finishNeighborhood(e.kind === 'rescue' && e.courage <= 0 || e.kind === 'delivery' && !e.recovered ? 'missed' : 'success');
  },
  recoverNeighborhoodCargo(prop) {
    if (!prop.cargo) return;
    prop.cargo = false;
    const e = this.state.neighborhoodEncounter;
    if (e?.kind !== 'delivery') return;
    e.recovered++;
    this.state.pickups.push({ id: this.nextId++, x: prop.x, y: prop.y, kind: prop.cargoLoot === 'bat' ? 'weapon' : prop.cargoLoot,
      ...(prop.cargoLoot === 'bat' ? { weapon: 'bat', uses: WEAPONS.bat.uses } : {}) });
  },
  updateNeighborhoodEnemy(e, dt) {
    const s = this.state, event = s.neighborhoodEncounter;
    if (event?.status !== 'active' || !['rescue', 'delivery'].includes(event.kind) || e.hp <= 0 || e.stun > 0 || e.attack || e.grabbedBy || e.thrown || e.z > 0) return false;
    if (s.players.some(p => p.hp > 0 && near(p, e, 200))) return false;
    const target = event.kind === 'rescue' && event.courage > 0 ? { x: 720, y: 525 } : event.kind === 'delivery' ? s.props.filter(p => p.cargo && p.hp > 0).sort((a,b) => Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0] : null;
    if (!target) return false;
    this.tickActor(e, dt);
    const dx = target.x - e.x, dy = target.y - e.y, length = Math.max(1, Math.hypot(dx,dy));
    e.facing = Math.sign(dx) || e.facing;
    if (!near(e, target, 65)) { e.x += dx / length * e.speed * .65 * dt; e.y += dy / length * e.speed * .5 * dt; e.action = 'walk'; e.moving = true; }
    return true;
  },
  updateNeighborhood(dt) {
    const s = this.state, e = s.neighborhoodEncounter;
    this.updateEstate(dt);
    this.updateStadium(dt);
    this.updateBourg(dt);
    this.updateLate(dt);
    if (s.neighborVisit) { s.neighborVisit.remaining -= dt; if (s.neighborVisit.remaining <= 0) s.neighborVisit = null; }
    if (!e) return;
    if (e.status === 'choice') {
      const active = s.players.filter(p => p.hp > 0 && p.connected !== false);
      if (active.length && active.every(p => e.choices[p.id])) {
        if (e.kind === 'merchant') this.finishNeighborhood(Object.values(e.choices).some(c => c !== 'skip') ? 'success' : 'skipped');
        else this.startNeighborhoodFight();
      }
      return;
    }
    if (e.status !== 'active' || !s.players.some(p => p.hp > 0)) return;
    const threatening = (target) => s.enemies.filter(a => a.hp > 0 && a.stun <= 0 && !a.grabbedBy && !a.thrown && near(a, target, 75) && !s.players.some(p => p.hp > 0 && near(p, a, 150)));
    if (e.kind === 'rescue' && e.courage > 0) {
      const count = threatening({x:720,y:525}).length;
      e.courage = Math.max(0, e.courage - Math.min(2,count) * 8 * dt);
      if (!e.courage) this.event('surprise', {neighborhood: true, label:'LE VOISIN PREND LA FUITE · TERMINE LE COMBAT'});
    }
    if (e.kind === 'delivery') for (const prop of s.props.filter(p => p.cargo && p.hp > 0)) {
      prop.steal = threatening(prop).length ? prop.steal + dt : Math.max(0, prop.steal - dt * 2);
      if (prop.steal >= 4) { prop.hp = 0; prop.cargo = false; prop.rubble = 0; e.stolen++; this.event('surprise', { neighborhood: true, label: 'UNE CAISSE VOLÉE !' }); }
    }
  },
  neighborAssist() {
    const s = this.state;
    this.estateAssist();
    if (s.chapter !== 0 || s.wave !== 0 || s.neighborhood.helpStage !== s.stage) return;
    s.neighborhood.helpStage = null;
    s.neighborVisit = { remaining: 7 };
    for (const e of s.enemies) { e.stun = 4; e.attack = null; e.cooldown = 4; }
    s.spawnTimer = Math.max(s.spawnTimer, 4);
    s.pickups.push({ id: this.nextId++, kind: 'food', x: 600, y: 535 });
    this.event('surprise', { neighborhood: true, label: 'LE VOISIN FAIT DIVERSION ! · 4 SECONDES DE RÉPIT + UN REPAS' });
  },
};
