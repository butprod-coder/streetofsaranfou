export const NIGHT_KINDS = ['lastBus', 'cart', 'blackout', 'vending'];
export const SCHOOL_KINDS = ['bell', 'exam', 'gym', 'photo'];
export const LATE_NAMES = { lastBus:'LE DERNIER BUS', cart:'LE CADDIE INFERNAL', blackout:'LA PANNE DE COURANT', vending:'LE DISTRIBUTEUR RÉCALCITRANT', bell:'LA SONNERIE A RETENTI', exam:'LE CONTRÔLE SURPRISE', gym:'LA RÉSERVE DU GYMNASE', photo:'LA PHOTO DE CLASSE' };
export const isLate = e => !!e && [...NIGHT_KINDS,...SCHOOL_KINDS].includes(e.kind);
export const BUS_DOOR = {x:860,y:540};
export const ELECTRIC = {x:1020,y:490};
export const VENDING = {x:630,y:530};
export const LATE_EXIT = {x:1090,y:620};
export const GYM_CHOICES = [{id:'ball',x:380,y:550,label:'BALLON',detail:'J : lancer · 3 rebonds ennemis'}, {id:'bat',x:640,y:550,label:'BATTE',detail:'8 coups · remplace ton arme'}, {id:'food',x:900,y:550,label:'TROUSSE DE SOINS',detail:'+35 PV immédiatement'}, {id:'skip',x:1090,y:625,label:'PASSER',detail:'Sans équipement'}];
export const PHOTO_FRAME = {x:480,y:475,width:360,height:140};
export const EXAM_TASKS = ['Esquive une attaque imminente', 'Projette un adversaire', 'Touche 2 ennemis avec une même spéciale'];
export const nearLate = (a,b,r=85) => Math.hypot(a.x-b.x,(a.y-b.y)*1.5)<r;
const active = s => s.players.filter(p=>p.hp>0&&p.connected!==false);
const energy = (s,n) => active(s).forEach(p=>p.energy=Math.min(100,p.energy+n));
const inPhoto = p => p.x>=PHOTO_FRAME.x&&p.x<=PHOTO_FRAME.x+PHOTO_FRAME.width&&p.y>=PHOTO_FRAME.y&&p.y<=PHOTO_FRAME.y+PHOTO_FRAME.height&&p.z<25;
export const vendingRisk = e => [0,.35,.7][e.attempts] ?? 1;
// Six running Jualos share one announced lane. These are scenery actors, never wave enemies.
export function bellRush(e) {
  const cycle=Math.floor(e.elapsed/7), t=e.elapsed%7, direction=cycle%2?-1:1, y=cycle%2?605:495;
  return {cycle,y,warning:t<1.4,running:t>=1.4&&t<4.7,direction,
    actors:Array.from({length:6},(_,i)=>({kind:'jualos',x:direction===1?-120+(t-1.4)*640-i*105:1400-(t-1.4)*640+i*105,y:y+(i%2?9:-9),facing:direction}))};
}
export function lateChoices(e) {
  const [label,detail]={lastBus:['ATTENDRE LE BUS','Combat · F pour monter à deux · Butin abandonné'],cart:['SAISIR LE CADDIE','F : pousser vers où tu regardes · 3 chocs'],blackout:['ENTRER DANS LE NOIR','+35 énergie si victoire sans rallumer'],vending:['DÉBLOQUER LA CANETTE','1er coup sans risque · Les suivants peuvent alerter'],bell:['TRAVERSER LA COUR','Une bande de Jualos traverse la zone annoncée'],exam:['RELEVER LE CONTRÔLE','3 consignes de 10 s · +15 énergie par réussite'],gym:['OUVRIR LA RÉSERVE','Un équipement gratuit au choix par joueur'],photo:['PRENDRE LA POSE','3 flashs · Dans le cadre : soin et ennemis étourdis']}[e.kind];
  return [{id:'accept',x:500,y:555,label,detail},{id:'skip',x:1040,y:615,label:'CONTINUER',detail:'Sans rencontre ni récompense'}];
}
export const lateEvents = {
  beginLate(kind) {
    const s=this.state;
    s.neighborhoodEncounter={kind,status:'choice',choices:{},elapsed:0,boarded:{},votes:{},equipment:{},attempts:0,alarm:false,powerOn:false,cart:{x:620,y:550,vx:0,hits:[],impacts:0},rushCycle:-1,rushHits:[],examDone:[],photos:0,photoHits:0,flashUntil:0,random:(s.streetSeed^0xa5a5a5a5)>>>0};
    s.phase='encounter';
  },
  startLateFight() {
    const s=this.state,e=s.neighborhoodEncounter;
    s.phase='fight';s.spawnQueue=e.kind==='vending'?['makouille','charlingals','remy']:['remy','charlingals','orelsan'];
    if(s.players.length>1)s.spawnQueue.push('papy_jala');
    s.spawnTimer=1;
    for(const p of s.players)p.invincible=Math.max(p.invincible,1.4);
  },
  startLate() {
    const e=this.state.neighborhoodEncounter;
    if(!isLate(e)||e.status!=='choice')return;
    e.status='active';
    if(!['gym','vending'].includes(e.kind))this.startLateFight();
  },
  interactLate(p) {
    const s=this.state,e=s.neighborhoodEncounter;
    if(!isLate(e)||e.status!=='active')return false;
    if(p.hp<=0||p.connected===false||p.z>0||p.attack||p.stun>0)return true;
    if(e.kind==='lastBus'&&e.elapsed>=6&&e.elapsed<14&&nearLate(p,BUS_DOOR)) {e.boarded[p.id]=true;this.checkBusDeparture();return true;}
    if(e.kind==='cart'&&e.cart.impacts<3&&Math.abs(e.cart.vx)<30&&nearLate(p,e.cart)) {e.cart.vx=p.facing*620;e.cart.hits=[];return true;}
    if(e.kind==='blackout'&&nearLate(p,ELECTRIC)){e.powerOn=true;return true;}
    if(e.kind==='gym') {
      if(e.equipment[p.id])return true;
      const choice=GYM_CHOICES.find(c=>nearLate(p,c));if(!choice)return true;
      e.equipment[p.id]=choice.id;
      if(choice.id==='ball')p.gymBalls=1;
      if(choice.id==='bat'){this.dropWeapon(p);p.weapon={kind:'bat',uses:8};}
      if(choice.id==='food')p.hp=Math.min(p.maxHp,p.hp+35);
      this.updateLate(0);return true;
    }
    if(e.kind==='vending'&&!e.alarm) {
      if(nearLate(p,LATE_EXIT)){this.finishNeighborhood(e.attempts?'success':'skipped');return true;}
      if(nearLate(p,VENDING)){e.votes[p.id]=true;this.checkVendingVote();}
      return true;
    }
    return false;
  },
  checkBusDeparture() {
    const s=this.state,e=s.neighborhoodEncounter;
    if(e?.kind!=='lastBus'||e.status!=='active'||e.elapsed<6||e.elapsed>=14)return;
    for(const p of s.players)if(p.hp<=0||p.z>0||p.stun>0||p.attack||!nearLate(p,BUS_DOOR,110))delete e.boarded[p.id];
    const passengers=s.players.filter(p=>p.connected!==false);
    if(!passengers.length||!passengers.every(p=>p.hp>0&&e.boarded[p.id]))return;
    // No kill or wave XP for taking the shortcut. Next wave resumes normally.
    for(const p of s.players){this.releaseGrab(p);this.endSpecial(p);p.attack=null;}
    s.enemies=[];s.spawnQueue=[];s.hazards=[];s.allies=[];s.pickups=[];s.gymProjectiles=[];
    s.phase='encounter';e.tookBus=true;this.finishNeighborhood('success');
  },
  checkVendingVote() {
    const s=this.state,e=s.neighborhoodEncounter;
    if(e?.kind!=='vending'||e.status!=='active'||e.alarm||e.attempts>=3||!active(s).length||!active(s).every(p=>e.votes[p.id]))return;
    const risk=vendingRisk(e);e.random=(Math.imul(e.random,1664525)+1013904223)>>>0;
    e.attempts++;e.votes={};
    if(e.random/4294967296<risk){e.alarm=true;this.startLateFight();return;}
    energy(s,20);
    if(e.attempts===3)this.finishNeighborhood('success');
  },
  schoolAction(action) {
    const s=this.state,e=s.neighborhoodEncounter;
    if(e?.kind!=='exam'||e.status!=='active')return;
    const index=Math.floor(e.elapsed/10);
    if(index>=3||e.examDone.includes(index)||['dodge','throw','special'][index]!==action)return;
    e.examDone.push(index);energy(s,15);
  },
  schoolSpecialHit(p,target) {
    const e=this.state.neighborhoodEncounter;
    if(e?.kind!=='exam'||e.status!=='active'||e.elapsed<20||e.elapsed>=30)return;
    p.examTargets ||= [];
    if(!p.examTargets.includes(target.id))p.examTargets.push(target.id);
    if(p.examTargets.length>=2)this.schoolAction('special');
  },
  throwSchoolBall(p) {
    const s=this.state;
    if(!p.gymBalls||p.hp<=0||p.z>0||p.specialState||s.phase!=='fight')return false;
    p.gymBalls=0;p.cooldown=.4;p.action='punch';p.actionTime=0;
    (s.gymProjectiles ||= []).push({x:p.x,y:p.y,owner:p.id,vx:p.facing*550,vy:0,remaining:4,hits:[]});
    return true;
  },
  updateGymBalls(dt) {
    const s=this.state;
    for(const b of s.gymProjectiles||[]) {
      const owner=s.players.find(p=>p.id===b.owner);
      b.remaining-=dt;
      if(!owner||owner.hp<=0){b.remaining=0;continue;}
      const target=s.enemies.filter(a=>a.hp>0&&!b.hits.includes(a.id)).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];
      if(target&&Math.hypot(target.x-b.x,target.y-b.y)<450){const dx=target.x-b.x,dy=target.y-b.y,len=Math.hypot(dx,dy)||1;b.vx=dx/len*550;b.vy=dy/len*550;}
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(target&&target.invincible<=0&&nearLate(b,target,48)){b.hits.push(target.id);this.damage(target,22,owner,true);if(target.hp>0)target.stun=Math.max(target.stun,1.2);if(b.hits.length>=3)b.remaining=0;}
    }
    s.gymProjectiles=(s.gymProjectiles||[]).filter(b=>b.remaining>0&&b.x>-60&&b.x<1340&&b.y>400&&b.y<700);
  },
  updateLate(dt) {
    const s=this.state,e=s.neighborhoodEncounter;
    this.updateGymBalls(dt);
    if(!isLate(e)||e.status!=='active'||!active(s).length)return;
    e.elapsed+=dt;
    if(e.kind==='lastBus')this.checkBusDeparture();
    if(e.kind==='vending')this.checkVendingVote();
    if(e.kind==='gym'&&active(s).every(p=>e.equipment[p.id]))this.finishNeighborhood(Object.values(e.equipment).some(v=>v!=='skip')?'success':'skipped');
    if(e.kind==='cart'&&e.cart.impacts<3){const c=e.cart;c.x+=c.vx*dt;c.vx*=Math.exp(-1.3*dt);
      if(Math.abs(c.vx)>90)for(const foe of s.enemies)if(c.impacts<3&&foe.hp>0&&foe.invincible<=0&&!c.hits.includes(foe.id)&&nearLate(c,foe,65)){c.hits.push(foe.id);c.impacts++;this.damage(foe,22,{id:-500,x:c.x-Math.sign(c.vx)*30,y:c.y,facing:Math.sign(c.vx),power:22},true);if(foe.hp>0)foe.stun=Math.max(foe.stun,1.5);}
      if(c.x<90||c.x>1190){c.x=Math.max(90,Math.min(1190,c.x));if(Math.abs(c.vx)>90)c.impacts=Math.min(3,c.impacts+1);c.vx=0;}
      if(c.impacts>=3)c.vx=0;
    }
    if(e.kind==='bell') {
      const rush=bellRush(e);
      if(e.rushCycle!==rush.cycle){e.rushCycle=rush.cycle;e.rushHits=[];this.event('schoolBell');}
      if(rush.running)for(const a of [...s.players,...s.enemies]) {
        if(a.hp<=0||a.invincible>0||a.z>25||a.action==='dodge'||e.rushHits.includes(a.id))continue;
        if(rush.actors.some(j=>nearLate(j,a,55))){e.rushHits.push(a.id);this.releaseGrab(a);this.damage(a,a.enemy?20:8,{id:-600,kind:'jualos',enemy:!a.enemy,x:a.x-rush.direction*35,y:rush.y,facing:rush.direction,power:20},true);a.vx=rush.direction*300;if(a.hp>0)a.stun=Math.max(a.stun,.9);}
      }
    }
    if(e.kind==='photo'&&e.photos<3&&e.elapsed>=(e.photos+1)*6){e.photos++;e.flashUntil=e.elapsed+.2;this.event('schoolPhoto');
      for(const p of active(s))if(inPhoto(p)){p.hp=Math.min(p.maxHp,p.hp+15);e.photoHits++;}
      for(const foe of s.enemies)if(foe.hp>0&&inPhoto(foe)){foe.stun=Math.max(foe.stun,2.5);foe.attack=null;foe.pattern=null;}
    }
  },
  finishLateWave() {
    const s=this.state,e=s.neighborhoodEncounter;
    if(!isLate(e)||e.status!=='active')return;
    if(e.kind==='blackout'&&!e.powerOn)energy(s,35);
    const success=e.kind==='blackout'?!e.powerOn:e.kind==='lastBus'?false:e.kind==='exam'?e.examDone.length===3:e.kind==='photo'?e.photoHits>0:true;
    this.finishNeighborhood(success?'success':'missed');
  },
};
