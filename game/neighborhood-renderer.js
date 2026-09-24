import { isLate } from './late-events.js';
import { drawLateWorld, drawLateControls, lateHint } from './late-renderer.js';
import { isBourg } from './bourg-events.js';
import { drawBourgWorld, drawBourgControls, bourgHint } from './bourg-renderer.js';
import { isStadium } from './stadium-events.js';
import { drawStadiumWorld, drawStadiumControls, stadiumHint } from './stadium-renderer.js';
import { isEstate } from './estate-events.js';
import { CHAPTERS } from './data.js';
import { drawEstateWorld, drawEstateControls, estateHint } from './estate-renderer.js';
import { NEIGHBORHOOD_NAMES, neighborhoodChoices } from './neighborhood-events.js';

function neighbor(r, x, y, merchant = false) {
  const c = r.ctx;
  r.ellipse(x, y + 2, 29, 9, '#79e5b845');
  r.arcadeSprite(merchant ? 'guylux' : 'papy_jala', x, y, 0, 130);
  c.fillStyle = '#a7f5ca'; c.font = 'bold 11px monospace'; c.textAlign = 'center';
  c.fillText(merchant ? 'VENDEUR · AMICAL' : 'VOISIN · À PROTÉGER', x, y + 20);
}
export function drawNeighborhoodWorld(r, s) {
  const e = s.neighborhoodEncounter, c = r.ctx;
  drawEstateWorld(r, s);
  drawStadiumWorld(r, s);
  drawBourgWorld(r, s);
  drawLateWorld(r, s);
  if (isLate(e)) return;
  if (isBourg(e)) return;
  if (isStadium(e)) return;
  if (isEstate(e)) return;
  if (s.neighborVisit) {
    c.save(); neighbor(r, 650, 475); c.textAlign = 'center'; c.font = 'bold 14px monospace'; c.fillStyle = '#a2efcf'; c.fillText('HÉ ! PAR ICI, LES BRAS CASSÉS !', 650, 310); c.font = '12px monospace'; c.fillText('Diversion : 4 secondes · Un repas au sol',650,330); c.restore();
  }
  if (!e || ['intro', 'transition'].includes(s.phase)) return;
  c.save(); c.textAlign = 'center';
  if (e.kind === 'merchant') {
    r.prop({kind:'car', x:760,y:464,hp:1,maxHp:1}); neighbor(r, 575, 488, true);
  }
  if (e.kind === 'rescue' && e.courage > 0 && e.status !== 'skipped') {
    neighbor(r, 720, 525);
    c.fillStyle = '#0c1a25'; c.fillRect(670, 389, 100, 7); c.fillStyle = '#8de1b6'; c.fillRect(670, 389, e.courage, 7);
    c.font = 'bold 12px monospace'; c.fillText(e.status === 'choice' ? 'BESOIN D’UN COUP DE MAIN !' : e.status === 'success' ? 'JE VOUS REVAUDRAI ÇA !' : 'COURAGE DU VOISIN', 720, 380);
  }
  if (e.kind === 'parking') {
    c.strokeStyle = '#f1e4b04d'; c.lineWidth = 4;
    for (let x = 310; x <= 1100; x += 210) { c.beginPath(); c.moveTo(x, 470); c.lineTo(x - 40, 650); c.stroke(); }
    r.prop({kind:'car',x:380,y:465,hp:1,maxHp:1}); r.prop({kind:'car',x:1020,y:465,hp:1,maxHp:1});
    c.fillStyle = '#172433'; c.fillRect(850,350,245,42); c.fillStyle='#ffe2a0'; c.font='bold 16px monospace'; c.fillText('P · PARKING PRIVÉ',972,377);
    const guard = s.enemies.find(a => a.parkingGuard && a.hp > 0);
    if (guard) { c.fillStyle='#ffb393'; c.font='bold 12px monospace'; c.fillText('GARDIEN DU PARKING',guard.x,guard.y-160); c.fillStyle='#35282b'; c.fillRect(guard.x-48,guard.y-149,96,5); c.fillStyle='#ffb393'; c.fillRect(guard.x-48,guard.y-149,96*guard.hp/guard.maxHp,5); }
  }
  for (const prop of s.props.filter(p => p.cargo && p.hp > 0)) {
    c.strokeStyle = '#94e6c1'; c.lineWidth = 2; c.beginPath(); c.ellipse(prop.x,prop.y,48,16,0,0,Math.PI*2); c.stroke();
    c.font = 'bold 12px monospace'; c.fillStyle = '#b5f5d9'; c.fillText({food:'REPAS',energy:'BOISSON',bat:'BATTE'}[prop.cargoLoot], prop.x, prop.y-86);
    if (prop.steal > 0) { c.fillStyle='#301f22'; c.fillRect(prop.x-36,prop.y-76,72,6); c.fillStyle='#ff8f77'; c.fillRect(prop.x-36,prop.y-76,72*prop.steal/4,6); c.fillText('VOL EN COURS !',prop.x,prop.y+30); }
  }

  c.restore();
}
export function drawNeighborhoodChoices(r, s) {
  const e = s.neighborhoodEncounter, c = r.ctx;
  drawEstateControls(r, s);
  drawStadiumControls(r, s);
  drawBourgControls(r, s);
  drawLateControls(r, s);
  if (!e || e.status !== 'choice') return;
  c.save(); c.textAlign = 'center';
  for (const choice of neighborhoodChoices(e)) {
    const nearby = s.players.some(p => p.hp > 0 && Math.hypot(p.x-choice.x,(p.y-choice.y)*1.5)<82 && !e.choices[p.id]);
    const width = e.kind === 'merchant' ? 195 : choice.id === 'accept' ? 450 : 275;
    c.fillStyle = nearby ? '#21483de8' : '#0c1726dc'; c.fillRect(choice.x-width/2,choice.y-28,width,64);
    c.strokeStyle = nearby ? '#c4ffe1' : '#85bcaa'; c.lineWidth = nearby ? 3 : 1; c.strokeRect(choice.x-width/2,choice.y-28,width,64);
    c.fillStyle = '#fff0c3'; c.font = 'bold 13px monospace'; c.fillText(choice.label,choice.x,choice.y-7);
    c.fillStyle='#d2e0e5'; c.font='11px monospace'; c.fillText(choice.detail,choice.x,choice.y+11);
    c.fillStyle=nearby?'#a6ffd4':'#98acba'; c.fillText(nearby?'F / RT / R2 · CHOISIR':'APPROCHE-TOI',choice.x,choice.y+28);
  }
  c.restore();
}
export function neighborhoodHint(s) {
  const e=s.neighborhoodEncounter;
  if (!e) return '';
  if (isLate(e)) return lateHint(s);
  if (isBourg(e)) return bourgHint(s);
  if (isStadium(e)) return stadiumHint(s);
  if (isEstate(e)) return estateHint(s);
  if (e.status === 'choice') return e.kind === 'merchant' ? 'Un cadeau gratuit par joueur · Approche-toi puis F / RT / R2 · Passer à droite' : 'Approche-toi puis F / RT / R2 · En duo : deux accords pour aider / entrer, un refus suffit';
  if (e.status === 'active') return e.kind === 'delivery' ? `Brise les caisses avant leur vol · Récupérées ${e.recovered}/3 · Volées ${e.stolen}/3` : e.kind === 'rescue' ? e.courage > 0 ? 'Protège le voisin : approche les agresseurs pour les attirer, puis élimine-les' : 'Le voisin a fui · Termine le combat pour continuer' : 'Bats le gardien · Fusil à pompe garanti pour chaque joueur';
  return e.status === 'skipped' ? 'Rencontre évitée · La rue continue' : e.kind === 'rescue' && e.status === 'success' ? 'Voisin sauvé · Il vous aidera dans la rue suivante' : e.kind === 'delivery' ? `${e.recovered}/3 caisses récupérées · Ramasse le contenu avant les renforts` : e.kind === 'parking' ? 'F / RT / R2 : ramasser le fusil à pompe' : 'Choix terminés · La rue continue';
}
export function drawNeighborhoodPanel(r,s) {
  const e=s.neighborhoodEncounter;
  if (!e || !['encounter','fight','rest'].includes(s.phase)) return;
  const c=r.ctx;c.save();c.fillStyle='#0b1825ee';c.fillRect(280,248,720,96);c.fillStyle='#9bdfbd';c.fillRect(280,248,4,96);
  c.textAlign='left';c.font='22px Impact, sans-serif';c.fillStyle='#ffdf9b';c.fillText(NEIGHBORHOOD_NAMES[e.kind],300,276);
  c.font='12px monospace';c.fillStyle='#e1e8df';c.fillText(neighborhoodHint(s),300,300,680);
  c.fillStyle='#91b7c5';c.font='12px monospace';
  c.fillText(e.status==='choice'?s.players.map(p=>`J${p.id} : ${e.choices[p.id] ? e.choices[p.id]==='accept'?'PRÊT':'CHOISI' : 'À TOI DE CHOISIR'}`).join('     '):e.kind==='rescue'&&e.status==='active'?`Courage : ${Math.ceil(e.courage)} / 100 · L’échec ne bloque pas la rue`:isEstate(e) && e.kind === 'petanque' && e.status === 'active' ? s.players.map(p => `J${p.id} : ${e.shots[p.id] || 0}/3 lancers · ${e.hits[p.id] || 0} réussis`).join('     ') : e.kind === 'shells' && e.status === 'active' ? s.players.map(p => `J${p.id} : ${e.withdrawn[p.id] ? 'ARRÊT' : `${e.wins[p.id] || 0}/3 réussites`}${e.shellPhase === 'guess' && e.guesses[p.id] != null ? ' · CHOISI' : ''}`).join('     ') : e.kind === 'gym' && e.status === 'active' ? s.players.map(p => `J${p.id} : ${{ball:'BALLON',bat:'BATTE',food:'SOIN',skip:'PASSÉ'}[e.equipment[p.id]] || 'À TOI DE CHOISIR'}`).join('     ') : e.kind === 'vending' && e.status === 'active' && !e.alarm ? `${e.attempts}/3 coups · ` + s.players.map(p => `J${p.id} : ${e.votes[p.id] ? 'PRÊT' : 'F POUR CONFIRMER'}`).join('     ') : CHAPTERS[s.chapter].name.toUpperCase() + ' · RENCONTRE DE QUARTIER',300,328);
  c.restore();
}
