export const STADIUM_KINDS = ['football','relay','coach','sprinklers'];
export const STADIUM_NAMES = {football:'LE BALLON DE LA DISCORDE',relay:'LE RELAIS DES BRAS CASSÉS',coach:'LE COACH A CRAQUÉ',sprinklers:'L’ARROSAGE AUTOMATIQUE'};
export const isStadium = e => !!e && STADIUM_KINDS.includes(e.kind);
export const RELAY_POINTS = [{x:900,y:490},{x:470,y:620},{x:1030,y:540}];
export const VALVES = [{x:350,y:490},{x:930,y:620}];
const near = (a,b,r=80)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5)<r;
export function sprinklerState(e) {
 const cycle=Math.floor(e.elapsed/5),time=e.elapsed%5,lane=cycle%2;
 return {lane,y:lane?590:490,x:180+Math.max(0,time-1.2)*300,warning:time<1.2&&!e.valves.includes(lane),active:time>=1.2&&time<4.2&&!e.valves.includes(lane)};
}
export function stadiumChoices(e) {
 const copy={football:['ENTRER SUR LE TERRAIN','Un but : soin + renforts · 3 buts maximum'],relay:['PRENDRE LE RELAIS','3 balises en combat : +15 % vitesse dans la rue suivante'],coach:['RELEVER LE DÉFI',`${e.rule==='feet'?'Pieds seulement':'Sans spéciale'} : batte +30 énergie si respecté`],sprinklers:['JOUER SOUS L’EAU','Gagner sans fermer de vanne : +40 énergie']}[e.kind];
 return [{id:'accept',x:500,y:555,label:copy[0],detail:copy[1]},{id:'skip',x:1040,y:615,label:'CONTINUER',detail:'Sans combat ni récompense'}];
}
export const stadiumEvents = {
 prepareStadium(){const s=this.state;if(!s.stadium)return;if(s.chapter!==2||s.stadium.boostStage!==s.stage)s.stadium.boostStage=null;if(s.chapter===2&&s.stadium.helpStage===s.stage){s.stadium.boostStage=s.stage;s.stadium.helpStage=null;}},
 stadiumSpeedMultiplier(){const s=this.state;return s.chapter===2&&s.stadium?.boostStage===s.stage?1.15:1;},
 beginStadium(kind){const s=this.state;s.neighborhoodEncounter={kind,status:'choice',choices:{},elapsed:0,rule:((s.streetSeed^s.stage)>>>0)%2?'feet':'noSpecial',failed:false,goals:0,ball:{x:620,y:550,vx:0,vy:0,owner:null,hits:[]},baton:{x:580,y:550},carrier:null,checkpoint:0,pickupAfter:0,valves:[]};s.phase='encounter';},
 startStadium(){const s=this.state,e=s.neighborhoodEncounter;if(!isStadium(e)||e.status!=='choice')return;e.status='active';s.phase='fight';s.spawnQueue=s.players.length>1?['remy','orelsan','charlingals','remy','orelsan']:['remy','orelsan','charlingals'];s.spawnTimer=.8;for(const p of s.players)p.invincible=Math.max(p.invincible,1.5);},
 stadiumAction(type){const e=this.state.neighborhoodEncounter;if(e?.kind==='coach'&&e.status==='active'&&(e.rule==='feet'?type!=='kick':type==='special'))e.failed=true;},
 dropStadiumBaton(p){const e=this.state.neighborhoodEncounter;if(e?.kind==='relay'&&e.status==='active'&&e.carrier===p.id){e.carrier=null;e.baton={x:p.x,y:p.y};e.pickupAfter=e.elapsed+.75;}},
 interactStadium(p){const s=this.state,e=s.neighborhoodEncounter;if(!isStadium(e)||e.status!=='active')return false;if(p.hp<=0||p.z>0||p.attack||p.stun>0)return true;
  if(e.kind==='relay'&&e.checkpoint<3){if(e.carrier===p.id){const mate=s.players.find(q=>q.id!==p.id&&q.hp>0&&q.connected!==false&&near(p,q,110));if(mate)e.carrier=mate.id;else this.dropStadiumBaton(p);return true;}if(!e.carrier&&e.elapsed>=e.pickupAfter&&near(p,e.baton)){e.carrier=p.id;return true;}}
  if(e.kind==='sprinklers'){const i=VALVES.findIndex(v=>near(p,v));if(i>=0){if(!e.valves.includes(i))e.valves.push(i);return true;}}
  return false;
 },
 hitStadiumBall(p,type){const e=this.state.neighborhoodEncounter;if(e?.kind!=='football'||e.status!=='active'||e.goals>=3||p.z>30||!['kick','punch','weapon'].includes(type)||!near(p,e.ball,115))return;const b=e.ball;b.vx=(Math.sign(b.x-p.x)||p.facing)*(type==='kick'?900:500);b.vy=Math.max(-180,Math.min(180,(b.y-p.y)*4));b.owner=p.id;b.hits=[];},
 updateStadium(dt){const s=this.state,e=s.neighborhoodEncounter;if(!isStadium(e)||e.status!=='active'||!s.players.some(p=>p.hp>0&&p.connected!==false))return;e.elapsed+=dt;
  if(e.kind==='football'&&e.goals<3){const b=e.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.exp(-dt);b.vy*=Math.exp(-dt);
   if(b.y<460||b.y>634){b.y=Math.max(460,Math.min(634,b.y));b.vy*=-.8;}
   const owner=s.players.find(p=>p.id===b.owner);
   if(owner&&Math.abs(b.vx)>120)for(const foe of s.enemies)if(foe.hp>0&&!foe.invincible&&!b.hits.includes(foe.id)&&near(b,foe,48)){b.hits.push(foe.id);this.damage(foe,24,owner,true);}
   if(b.x>1160&&b.y>=495&&b.y<=590&&b.vx>0&&owner){e.goals++;s.pickups.push({id:this.nextId++,kind:'food',amount:20,x:710,y:550});s.spawnQueue.push('remy','orelsan');Object.assign(b,{x:620,y:550,vx:0,vy:0,owner:null,hits:[]});}
   else if(b.x<70||b.x>1200){b.x=Math.max(70,Math.min(1200,b.x));b.vx*=-.8;}
  }
  if(e.kind==='relay'&&e.checkpoint<3){const p=s.players.find(p=>p.id===e.carrier);if(p){e.baton={x:p.x,y:p.y};if(p.hp<=0||p.connected===false)this.dropStadiumBaton(p);else if(p.z===0&&near(p,RELAY_POINTS[e.checkpoint],58)){e.checkpoint++;if(e.checkpoint===3)e.carrier=null;}}}
  if(e.kind==='sprinklers'){const water=sprinklerState(e);if(water.active)for(const a of [...s.players,...s.enemies])if(a.hp>0&&a.z<24&&a.action!=='dodge'&&Math.abs(a.y-water.y)<38&&Math.abs(a.x-water.x)<85){a.x=Math.min(1225,a.x+240*dt);a.y=Math.max(448,Math.min(646,a.y+(water.lane?-1:1)*90*dt));}}
 },
 finishStadiumWave(){const s=this.state,e=s.neighborhoodEncounter;if(!isStadium(e)||e.status!=='active')return;const success=e.kind==='football'?e.goals>0:e.kind==='relay'?e.checkpoint===3:e.kind==='coach'?!e.failed:e.valves.length===0;
  if(success&&e.kind==='relay')s.stadium.helpStage=s.stage+1;
  if(success&&['coach','sprinklers'].includes(e.kind))for(const p of s.players)if(p.hp>0){p.energy=Math.min(100,p.energy+(e.kind==='coach'?30:40));if(e.kind==='coach')s.pickups.push({id:this.nextId++,kind:'weapon',weapon:'bat',uses:8,x:p.x+55,y:p.y});}
  this.finishNeighborhood(success?'success':'missed');
 }
};
