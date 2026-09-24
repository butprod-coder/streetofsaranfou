import { isLate, BUS_DOOR, ELECTRIC, VENDING, LATE_EXIT, GYM_CHOICES, PHOTO_FRAME, EXAM_TASKS, bellRush, vendingRisk } from './late-events.js';
export function lateHint(s) {
  const e=s.neighborhoodEncounter;
  if(e.status==='choice')return 'F / RT / R2 pour choisir · Deux accords en duo · Un refus suffit';
  if(e.status==='skipped')return 'Rencontre évitée · On continue';
  if(e.status!=='active')return e.tookBus?'Bus attrapé · Butin abandonné · Pas d’XP de vague':e.kind==='gym'?'Équipement choisi · Ballon : J pour lancer lors du prochain combat':e.kind==='exam'?`${e.examDone.length}/3 consignes réussies · Bonus conservés`:e.kind==='blackout'?(e.powerOn?'Combat terminé · Courant rétabli, sans bonus':'Victoire dans le noir · +35 énergie'):e.kind==='photo'?`${e.photoHits} poses réussies · Soins déjà reçus`:'Rencontre terminée · On continue';
  return {
    lastBus:e.elapsed<6?`Bus dans ${Math.ceil(6-e.elapsed)} s · F à la porte pour monter` : e.elapsed<14?`PORTES OUVERTES · ${Math.ceil(14-e.elapsed)} s · Tous à la porte, puis F`:'Bus parti · Termine le combat normalement',
    cart:`F près du caddie : pousser dans ta direction · ${e.cart.impacts}/3 chocs`,
    blackout:e.powerOn?'Éclairage rétabli · Termine le combat':'Pénombre : +35 énergie à la victoire · F au coffret pour rallumer',
    vending:e.alarm?'ALARME ! La sécurité arrive · Termine le combat':`F au distributeur : +20 énergie · Risque ${Math.round(vendingRisk(e)*100)} % · Droite : arrêter`,
    bell:'SONNERIE ! Une bande de Jualos traverse · Évite la bande jaune ou attire les ennemis',
    exam:e.elapsed<30?`${EXAM_TASKS[Math.floor(e.elapsed/10)]} · ${Math.ceil(10-e.elapsed%10)} s · ${e.examDone.length}/3 réussies`:'Contrôle terminé · Termine le combat',
    gym:'F devant ton équipement · Un choix par joueur · Le ballon remplace ton prochain coup de poing',
    photo:e.photos<3?`Prochain flash dans ${Math.ceil((e.photos+1)*6-e.elapsed)} s · Cadre : +15 PV et ennemis étourdis`:'Trois photos prises · Termine le combat',
  }[e.kind];
}
function label(c,text,x,y,width=240) { c.fillStyle='#102331eb';c.fillRect(x-width/2,y-15,width,24);c.fillStyle='#ffdfa1';c.font='bold 12px monospace';c.textAlign='center';c.fillText(text,x,y+2,width-10); }
function ball(c,x,y,r=16){c.fillStyle='#ed9548';c.strokeStyle='#563420';c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r,y);c.moveTo(x,y-r);c.lineTo(x,y+r);c.stroke();}
export function drawLateWorld(r,s) {
  const e=s.neighborhoodEncounter;if(!isLate(e))return;const c=r.ctx;c.save();
  if(e.kind==='blackout')r.arcadeSprite('nightElectric',ELECTRIC.x,ELECTRIC.y,Number(e.powerOn),120);
  if(e.kind==='lastBus'){
    const x=e.status==='choice'?880:e.elapsed<6?1650-(e.elapsed/6)*770:e.elapsed<14?880:880+(e.elapsed-14)*380;
    if(x<1900)r.arcadeSprite('nightBus',x,480,e.elapsed>=6&&e.elapsed<14?1:0,190,1);
  }
  if(e.kind==='vending')r.arcadeSprite('nightVending',VENDING.x,VENDING.y,e.alarm?1:0,175);
  if(e.kind==='bell'&&e.status==='active'){
    const rush=bellRush(e);if(rush.warning||rush.running){c.fillStyle=rush.warning?'#ffd35d45':'#ffa46125';c.fillRect(50,rush.y-35,1180,70);c.strokeStyle='#ffdf79';c.setLineDash([14,9]);c.lineWidth=3;c.strokeRect(50,rush.y-35,1180,70);c.setLineDash([]);label(c,`JUALOS ${rush.direction>0?'→ → →':'← ← ←'}`,640,rush.y-45);}
  }
  if(e.kind==='photo'){
    const f=PHOTO_FRAME;c.strokeStyle=e.flashUntil>e.elapsed?'#fff3ad':'#a8e6e3';c.lineWidth=e.flashUntil>e.elapsed?8:3;c.strokeRect(f.x,f.y,f.width,f.height);if(e.flashUntil>e.elapsed){c.fillStyle='#fff2ac44';c.fillRect(f.x,f.y,f.width,f.height);}
    c.strokeStyle='#b7c7cf';c.lineWidth=5;c.beginPath();c.moveTo(1060,490);c.lineTo(1025,565);c.moveTo(1060,490);c.lineTo(1095,565);c.moveTo(1060,490);c.lineTo(1060,565);c.stroke();c.fillStyle='#293f50';c.fillRect(1025,450,70,43);c.fillStyle='#9cceea';c.beginPath();c.arc(1060,472,14,0,Math.PI*2);c.fill();label(c,'PHOTO DE CLASSE',1060,593);
  }
  if(e.kind==='gym')r.arcadeSprite('decor_school_5',640,475,0,100);
  c.restore();
}
export function drawLateControls(r,s) {
  const e=s.neighborhoodEncounter,c=r.ctx;c.save();
  for(const b of s.gymProjectiles||[])ball(c,b.x,b.y-65);
  for(const p of s.players)if(p.gymBalls){ball(c,p.x+30,p.y-90-p.z,10);label(c,s.phase==='fight'?'J / X · LANCER LE BALLON':'BALLON PRÊT POUR LE COMBAT',p.x,p.y-155-p.z,220);}
  if(!isLate(e)){c.restore();return;}
  if(e.kind==='cart'){r.arcadeSprite('nightCart',e.cart.x,e.cart.y,e.cart.impacts>=3?1:0,100,e.cart.vx<0?-1:1);if(e.status==='active')label(c,e.cart.impacts>=3?'CADDIE CASSÉ':'F / RT · POUSSER',e.cart.x,e.cart.y+27);}
  if(e.kind==='bell'&&e.status==='active'){const rush=bellRush(e);if(rush.running)for(const j of rush.actors)if(j.x>-100&&j.x<1380)r.arcadeSprite('hero_jualos',j.x,j.y,2+Math.floor(e.elapsed*9)%2,140,j.facing);}
  if(e.status==='active'){
    if(e.kind==='lastBus'&&e.elapsed>=6&&e.elapsed<14)label(c,`F · MONTER ${Object.values(e.boarded).filter(Boolean).length}/${s.players.filter(p=>p.connected!==false).length}`,BUS_DOOR.x,BUS_DOOR.y+27);
    if(e.kind==='blackout')label(c,e.powerOn?'COURANT RÉTABLI':'F / RT · RALLUMER',ELECTRIC.x,ELECTRIC.y+27);
    if(e.kind==='vending'&&!e.alarm){label(c,`F · RISQUE ${Math.round(vendingRisk(e)*100)} %`,VENDING.x,VENDING.y+30);label(c,'F / RT · ARRÊTER',LATE_EXIT.x,LATE_EXIT.y,220);}
    if(e.kind==='gym')for(const choice of GYM_CHOICES){const width=choice.id==='skip'?175:235;label(c,choice.label,choice.x,choice.y,width);c.font='11px monospace';c.fillStyle='#d6eaf0';c.fillText(choice.detail,choice.x,choice.y+25,width);c.fillStyle='#a2e7c0';c.fillText('F / RT / R2 · CHOISIR',choice.x,choice.y+44,width);if(choice.id==='ball')ball(c,choice.x,choice.y-43);if(choice.id==='food'){c.fillStyle='#eff5ef';c.fillRect(choice.x-22,choice.y-67,44,27);c.fillStyle='#e65d56';c.fillRect(choice.x-4,choice.y-63,8,19);c.fillRect(choice.x-10,choice.y-57,20,7);}}
  }
  c.restore();
}
// Dim only the background: actors, telegraphs and controls stay readable.
export function drawNightDarkness(r,s){const e=s.neighborhoodEncounter;if(e?.kind==='blackout'&&e.status==='active'&&!e.powerOn){r.ctx.fillStyle='#030818a0';r.ctx.fillRect(0,350,1280,370);}}
