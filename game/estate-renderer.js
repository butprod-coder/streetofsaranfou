import { isEstate, estateTarget } from './estate-events.js';
export function estateHint(s) {
 const e=s.neighborhoodEncounter;
 if(!isEstate(e))return '';
 if(e.notice&&e.status==='choice')return e.notice;
 if(e.status==='choice')return 'Approche-toi puis F / RT / R2 · Deux accords en duo · Un refus suffit';
 if(e.status==='skipped')return 'On poursuit la promenade · Aucun coût';
 if(e.kind==='petanque')return e.status==='active'?'Au cercle : F dans la zone verte · 3 boules chacun · Sortie à droite pour arrêter':Object.values(e.hits).some(n=>n)?'Bien joué ! Énergie et score gagnés · On reprend la promenade':'Pas de réussite cette fois · On continue sans pénalité';
 if(e.kind==='picnic')return 'Repas partagé : +35 PV · Les pigeons apporteront un cadeau dans la zone suivante';
 if(e.kind==='sluice')return e.status==='active'?`F près des vannes · ${e.switches.length}/2 ouvertes · Les deux : +30 énergie et étourdissement`:e.status==='success'?'Vannes ouvertes · Bonus obtenu':'Combat terminé · Vannes non ouvertes, pas de bonus';
 return e.status==='active'?`F aux cages · ${e.released.length}/3 libérées · Les pigeons étourdissent les ennemis proches`:`${e.released.length}/3 pigeons libérés · Un petit soin par cage ouverte`;
}
export function drawEstateWorld(r,s) {
 const e=s.neighborhoodEncounter,c=r.ctx;
 if(s.estateVisit){r.arcadeSprite('estateProps',620,490,1,65);c.save();c.textAlign='center';c.fillStyle='#b8efd2';c.font='bold 16px monospace';c.fillText('LES PIGEONS N’ONT PAS OUBLIÉ LE REPAS !',640,310);c.restore();}
 if(!isEstate(e))return;
 c.save();c.textAlign='center';c.font='bold 12px monospace';
 if(e.kind==='sluice') {
  [{x:450,y:490},{x:930,y:600}].forEach((p,i)=>{r.arcadeSprite('estateProps',p.x,p.y,0,110);c.fillStyle=e.switches.includes(i)?'#a8f2cf':'#ffe2ae';c.fillText(e.switches.includes(i)?'VANNE OUVERTE':'F / RT · OUVRIR',p.x,p.y+24);});
  if(e.flushUntil>e.elapsed){c.fillStyle='#7cddf477';for(let i=0;i<7;i++){const x=(e.elapsed*600+i*190)%1280;c.fillRect(x,485+(i%3)*45,130,12);}}
 }
 if(e.kind==='poachers') {
  [{x:420,y:500},{x:710,y:610},{x:990,y:490}].forEach((p,i)=>{if(e.released.includes(i))return;r.arcadeSprite('estateProps',p.x,p.y,3,90);c.fillStyle='#ffe2ae';c.fillText('F / RT · LIBÉRER',p.x,p.y+22);});
  for(const d of e.ducks)r.arcadeSprite('estateProps',d.x+(3-(d.until-e.elapsed))*130,d.y,Math.floor(e.elapsed*8)%2+1,60);
 }
 if(e.kind==='picnic'){r.arcadeSprite('estateProps',700,505,4,125);r.arcadeSprite('estateProps',840,510,1,55);r.arcadeSprite('estateProps',925,480,1,48);}
 if(e.kind==='petanque') {
  r.arcadeSprite('estateProps',820,475,5,80);
  c.strokeStyle='#efd9a9';c.lineWidth=3;c.beginPath();c.ellipse(510,550,55,20,0,0,Math.PI*2);c.stroke();
  c.fillStyle='#ffe0a0';c.fillText('CERCLE DE LANCER',510,589);
  c.fillStyle='#eab46d';c.beginPath();c.arc(780,540,5,0,Math.PI*2);c.fill();
  if(e.lastThrow){c.fillStyle='#d4dfe8';c.beginPath();c.arc(e.lastThrow.x,e.lastThrow.y+12,9,0,Math.PI*2);c.fill();}
 }
 c.restore();
}
export function drawEstateControls(r,s) {
 const e=s.neighborhoodEncounter;
 if(e?.kind!=='petanque'||e.status!=='active')return;
 const c=r.ctx;c.save();c.textAlign='center';c.fillStyle='#0b1928ed';c.fillRect(355,350,570,71);
 c.fillStyle='#657483';c.fillRect(385,386,510,11);c.fillStyle='#77d9a4';c.fillRect(385+510*.34,386,510*.32,11);c.fillStyle='#fff5cf';c.fillRect(385+510*estateTarget(e.elapsed)-3,381,6,21);
 c.font='bold 13px monospace';c.fillText('F / RT / R2 QUAND LE CURSEUR EST DANS LE VERT',640,373);
 c.fillStyle='#172638e8';c.fillRect(920,591,240,50);c.fillStyle='#ffe2ae';c.fillText('F / RT · TERMINER MES LANCERS',1040,615);
 c.restore();
}
