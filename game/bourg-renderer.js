import { isBourg, BAKERY, CUPS, SHELL_EXIT, shellPositions } from './bourg-events.js';
export function bourgHint(s) {
  const e = s.neighborhoodEncounter;
  if (e.status === 'choice') return 'F / RT / R2 près du choix · Deux accords en duo · Un refus suffit';
  if (e.status === 'skipped') return 'Rencontre évitée · La rue continue';
  if (e.status !== 'active') return e.kind === 'terrace' ? `${e.saved || 0}/3 tables sauvées · +${(e.saved || 0)*10} énergie par joueur vivant` : e.kind === 'shells' ? 'Partie terminée · Énergie gagnée conservée · On continue' : 'Combat terminé · On continue';
  if (e.kind === 'bakery') return `F : prendre / manger (+15 PV) · J : lancer et étourdir · ${e.stock} prêt(s), ${4-e.baked} à cuire`;
  if (e.kind === 'scooter') return 'ALARME ! Le propriétaire arrive · F / RT pour ramasser la batte';
  if (e.kind === 'terrace') return `Protège les tables et abrite-toi derrière · ${s.props.filter(p=>e.tables.includes(p.id)&&p.hp>0).length}/3 intactes`;
  return `Manche ${e.round}/3 · ${ {show:'Repère la bille !',mix:'Suis son gobelet pendant le mélange',guess:'Approche un gobelet puis F · Une réponse chacun',reveal:'La bille était ici !'}[e.shellPhase] }`;
}
function label(c,text,x,y,color='#ffe1ac') { c.fillStyle='#102331e8'; c.fillRect(x-100,y-14,200,23); c.fillStyle=color;c.fillText(text,x,y+2); }
function bread(c,x,y) { c.save();c.translate(x,y);c.rotate(-.35);c.fillStyle='#b77939';c.beginPath();c.ellipse(0,0,25,9,0,0,Math.PI*2);c.fill();c.strokeStyle='#ffe0a2';c.lineWidth=3;for(let i=-12;i<=12;i+=12){c.beginPath();c.moveTo(i-3,-5);c.lineTo(i+3,3);c.stroke();}c.restore(); }
export function drawBourgTable(r,p) {
  const c=r.ctx;c.save();
  if(p.hp>0){r.arcadeSprite('decor_cafeTable',p.x,p.y,0,105);c.fillStyle='#102331';c.fillRect(p.x-35,p.y-115,70,6);c.fillStyle=p.flash>0?'#ff977d':'#a4e9ba';c.fillRect(p.x-35,p.y-115,70*p.hp/p.maxHp,6);}
  else {c.strokeStyle='#916b4b';c.lineWidth=7;c.beginPath();c.moveTo(p.x-30,p.y-8);c.lineTo(p.x+28,p.y);c.moveTo(p.x-17,p.y+10);c.lineTo(p.x+16,p.y-14);c.stroke();}
  c.restore();
}
export function drawBourgWorld(r,s) {
  const e=s.neighborhoodEncounter;if(!isBourg(e))return;const c=r.ctx;c.save();c.textAlign='center';c.font='bold 12px monospace';
  if(e.kind==='bakery'){r.arcadeSprite('decor_village_3',BAKERY.x,BAKERY.y,0,120);}
  if(e.kind==='terrace'){r.arcadeSprite('decor_chalkboard',1080,470,0,100);label(c,'SAUVEZ MA TERRASSE !',1080,490);}
  if(e.kind==='scooter'){
    const x=790,y=495;r.ellipse(x,y,95,14,'#07131c88');c.fillStyle='#111d28';for(const dx of [-62,62]){c.beginPath();c.arc(x+dx,y-12,21,0,Math.PI*2);c.fill();c.strokeStyle='#a8bec8';c.lineWidth=4;c.stroke();}
    c.fillStyle='#c04a39';c.beginPath();c.moveTo(x-76,y-30);c.lineTo(x-35,y-75);c.lineTo(x+6,y-75);c.lineTo(x+10,y-33);c.lineTo(x+48,y-33);c.lineTo(x+42,y-100);c.lineTo(x+65,y-104);c.lineTo(x+80,y-25);c.closePath();c.fill();c.fillStyle='#18242e';c.fillRect(x-57,y-85,67,14);c.fillStyle='#bc9d76';c.fillRect(x-75,y-104,35,22);
    if(e.status==='active'){c.fillStyle=Math.sin(e.elapsed*12)>0?'#ff6256':'#ffdaa5';c.beginPath();c.arc(x+67,y-92,9,0,Math.PI*2);c.fill();}label(c,e.status==='choice'?'COFFRE FERMÉ · ALARME':'COFFRE OUVERT',x,y+30);
  }
  if(e.kind==='shells'){r.arcadeSprite('guylux',650,455,0,140);label(c,'GUYLUX · SANS MISE',650,465);}
  c.restore();
}
export function drawBourgControls(r,s) {
  const e=s.neighborhoodEncounter;if(!isBourg(e)||e.status==='choice')return;const c=r.ctx;c.save();c.textAlign='center';c.font='bold 12px monospace';
  if(e.kind==='bakery'&&e.status==='active'){
    for(let i=0;i<e.stock;i++)bread(c,BAKERY.x-36+i*24,BAKERY.y-50);
    label(c,e.stock?'F / RT · PRENDRE':e.baked<4?'FOUR EN COURS':'FOURNÉE ÉPUISÉE',BAKERY.x,BAKERY.y+22);
    for(const p of s.players)if(e.held[p.id]){bread(c,p.x+25,p.y-85-p.z);label(c,'F : MANGER · J : LANCER',p.x,p.y-145-p.z);}
    for(const b of e.loaves)bread(c,b.x,b.y-70);
  }
  if(e.kind==='shells'&&e.status==='active'){
    const positions=shellPositions(e),swap=Math.floor(e.roundTime/.9),part=e.roundTime/.9-swap;
    c.fillStyle='#382b36ee';c.fillRect(335,505,630,100);c.strokeStyle='#cfb787';c.strokeRect(335,505,630,100);
    for(let id=0;id<3;id++){
      const x=CUPS[0].x+positions[id]*210,pair=e.swaps[swap];
      const arc=e.shellPhase==='mix'&&pair?.includes(id)?Math.sin(part*Math.PI)*(id===pair[0]?-38:38):0;
      const raised=['show','reveal'].includes(e.shellPhase)&&id===e.ballCup,y=555+arc-(raised?45:0);
      if(raised){c.fillStyle='#8effa5';c.beginPath();c.arc(x,553,9,0,Math.PI*2);c.fill();}
      c.fillStyle='#d39550';c.strokeStyle='#ffdaa0';c.lineWidth=3;c.beginPath();c.moveTo(x-21,y-44);c.lineTo(x+21,y-44);c.lineTo(x+31,y);c.lineTo(x-31,y);c.closePath();c.fill();c.stroke();
    }
    if(e.shellPhase==='guess')for(const [i,p] of CUPS.entries()){label(c,`${i+1} · F / RT CHOISIR`,p.x,625);const chosen=s.players.filter(p=>e.guesses[p.id]===i).map(p=>`J${p.id}`).join(' + ');if(chosen)label(c,chosen,p.x,655,'#9de6c2');}
    label(c,'F / RT · ARRÊTER',SHELL_EXIT.x,SHELL_EXIT.y);
  }
  c.restore();
}
