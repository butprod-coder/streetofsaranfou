import { FLOOR, clamp } from './data.js';
const d=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const alive=a=>a?.hp>0;
export const miniBossCombat={
  miniBossFX(x,y,cell){this.event('spectacle',{x,y,atlas:'miniBossFX',cell});},
  mazzukaFX(x,y,cell){this.event('spectacle',{x,y,atlas:'miniBossMazzukaFX',cell});},
  maireFX(x,y,cell){this.event('spectacle',{x,y,atlas:'miniBossMaireFX',cell});},
  remyFX(x,y,cell){this.event('spectacle',{x,y,atlas:'miniBossRemyFX',cell});},
  harmelinFX(x,y,cell){this.event('spectacle',{x,y,atlas:'miniBossHarmelinFX',cell});},
  summonHarmelinProviseur(boss){
    if(boss.proviseurCalled)return;
    boss.proviseurCalled=true;
    this.spawnEnemy('harmelinProviseur',{owner:boss.id,x:clamp(boss.x-180,FLOOR.left,FLOOR.right),y:boss.y,facing:-1,invincible:.6});
    this.summonHarmelinClass(boss);
    this.event('opening',{x:boss.x,y:boss.y-205,label:'LE PROVISEUR DÉBARQUE · LES ÉLÈVES SE DÉCHAÎNENT !'});
  },
  summonHarmelinClass(boss){
    const kinds=['harmelinStudent1','harmelinStudent2','harmelinStudent3','harmelinStudent4'];
    const targets=this.state.players.filter(alive);
    const furious=boss.bossPhase>1,count=furious?6:4;
    for(let i=0;i<count;i++){
      const target=targets[i%Math.max(1,targets.length)]||{x:640,y:545},fromLeft=i%2===0,x=fromLeft?FLOOR.left+8:FLOOR.right-8;
      const student=this.spawnEnemy(kinds[i%kinds.length],{owner:boss.id,harmelinRush:true,enraged:furious,rushLife:furious?3.8:3.1,chargeFacing:fromLeft?1:-1,x,y:clamp(target.y+(i-(count-1)/2)*24,FLOOR.top,FLOOR.bottom),facing:fromLeft?1:-1});
      student.speed*=furious?1.4:1.08;student.power*=furious?1.35:1;this.harmelinFX(x,target.y-36,8+i%4);
    }
    this.event('opening',{x:boss.x,y:boss.y-205,label:'CHANGEMENT DE CLASSE · ÇA VA BOUSCULER !'});
  },
  updateHarmelinStudent(e,dt){
    this.tickActor(e,dt);if(e.hp<=0)return;
    if(e.stun>0){e.action='hurt';e.moving=false;return;}
    e.rushLife-=dt;if(e.rushLife<=0||e.x<FLOOR.left-40||e.x>FLOOR.right+40){e.hp=0;e.deadTime=0;return;}
    const target=this.state.players.filter(alive).sort((a,b)=>d(e,a)-d(e,b))[0];
    if(target&&Math.abs(e.y-target.y)>5)e.y+=Math.sign(target.y-e.y)*Math.min(Math.abs(target.y-e.y),190*dt);
    e.x+=e.chargeFacing*e.speed*dt;e.facing=e.chargeFacing;e.action='walk';e.moving=true;
    if(!e.rushHit&&target&&Math.abs(e.x-target.x)<52&&Math.abs(e.y-target.y)<42&&target.z<28&&target.invincible<=0){
      this.damage(target,e.power,e,true);target.vx=e.chargeFacing*265;target.stun=Math.max(target.stun,.28);e.rushHit=true;this.harmelinFX(target.x,target.y-28,10);
    }
  },
  spawnRemyParty(boss,late=false){
    if(boss.remyPartySpawned)return;
    boss.remyPartySpawned=true;
    const party=[['remyOrc',-245,-45,8],['remyPaladin',-95,45,9],['remyElf',95,-30,10],['remyTauren',250,35,11]];
    for(const [kind,dx,dy,cell] of party){const x=clamp(boss.x+dx,FLOOR.left,FLOOR.right),y=clamp(boss.y+dy,FLOOR.top,FLOOR.bottom),ally=this.spawnEnemy(kind,{owner:boss.id,remySummon:true,x,y,facing:-1,summonOrdinal:cell-8});ally.invincible=.65;this.remyFX(x,y-80,cell);}
    this.event('opening',{x:boss.x,y:boss.y-210,label:late?'MODE RAID HÉROÏQUE · TUE LES 4 INVOCATIONS !':'DÉTRUIS LES 4 INVOCATIONS POUR ATTEINDRE RÉMY !'});
  },
  spawnRemyOnyxia(boss){
    if(boss.remyOnyxiaSpawned)return;
    boss.remyOnyxiaSpawned=true;boss.remyShielded=true;boss.pattern=null;
    this.spawnEnemy('remyOnyxia',{owner:boss.id,remySummon:true,x:clamp(boss.x-240,FLOOR.left+150,FLOOR.right-150),y:boss.y,facing:-1,invincible:.7});
    this.remyFX(boss.x-240,boss.y-80,1);
    this.event('opening',{x:boss.x,y:boss.y-210,label:'ONYXIA ARRIVE ! DÉFAIS-LA POUR BRISER LE BOUCLIER !'});
  },
  updateRemyShield(boss){
    if(!boss.remyPartySpawned)return;
    if(!boss.remyShielded)return;
    if(this.state.enemies.some(e=>e.remySummon&&e.owner===boss.id&&e.hp>0))return;
    boss.remyShielded=false;boss.recovering=1.2;boss.cooldown=1.2;this.remyFX(boss.x,boss.y-85,2);
    this.event('opening',{x:boss.x,y:boss.y-205,label:'LE GROUPE EST WIPE · ATTAQUE LE GEEK !'});
  },
  updateRemySummon(e,dt){
    this.tickActor(e,dt);
    if(e.hp<=0||e.attack||e.stun>0||!['fight','surprise'].includes(this.state.phase))return;
    const targets=this.state.players.filter(alive).sort((a,b)=>d(e,a)-d(e,b)),target=targets[0];if(!target)return;
    const dx=target.x-e.x,dy=target.y-e.y,range=e.kind==='remyElf'?440:e.reach+38;e.facing=Math.sign(dx)||e.facing;e.targetX=target.x;e.targetY=target.y;
    if(d(e,target)<=range&&e.cooldown<=0){e.attackCount++;this.startAttack(e,e.kind==='remyElf'||e.attackCount%3===0?'special':'punch');return;}
    const length=Math.max(1,Math.hypot(dx,dy*1.5));e.x=clamp(e.x+dx/length*e.speed*dt,FLOOR.left,FLOOR.right);e.y=clamp(e.y+dy/length*e.speed*.85*dt,FLOOR.top,FLOOR.bottom);e.action='walk';e.moving=true;
  },
  updateMairePolice(e,dt){if(e.hp>0){e.summonTTL-=dt;if(e.summonTTL<=0){e.hp=0;e.deadTime=0;}}},
  startMiniBossPattern(e,target){
    const late=e.bossPhase>1,n=e.attackCount++,mode=e.kind==='harmelin'?(n%3===0?'harmelinClass':n%3===1?'harmelinPaper':'harmelinPens'):e.kind==='remyGeek'?(e.remyPartySpawned?(n%3===1?'keyboardBurst':'screenPulse'):'summonParty'):e.kind==='maire'?(n%4===0?'callPolice':n%4===2?'whistle':'maireKick'):e.kind==='damps'?(n%5===1?'smoke':n%5===2?'cough':'cigarette'):e.kind==='cainri'?(n%5===2?'bottle':n%5===4?'whisky':'charge'):e.kind==='jalatrix'?(n%4===0?'cast':n%4===1?'sweep':n%4===2?'slam':'cast'):(n%4===0||n%4===1?'kick':n%4===2?'chair':'eraser');
    const dx=target.x-e.x,dy=target.y-e.y,len=Math.max(1,Math.hypot(dx,dy));
    e.pattern={kind:mode,elapsed:0,windup:(mode==='charge'?.9:mode==='cough'?.78:mode==='smoke'?1.05:mode==='slam'?.95:mode==='cast'?.8:mode==='kick'||mode==='maireKick'?.58:mode==='callPolice'?.95:mode==='whistle'?.78:mode==='summonParty'?1.08:mode==='screenPulse'?1:mode==='harmelinClass'?.82:mode==='harmelinPaper'?.6:mode==='harmelinPens'?.72:.65)*(late?.78:1),active:mode==='charge'?1.2:mode==='smoke'?2.6:mode==='sweep'?.34:mode==='kick'||mode==='maireKick'?.28:.25,hit:false,dx:dx/len,dy:dy/len,facing:e.facing,target:target.id,late};
    e.action='special';e.actionTime=0;
  },
  updateMiniBoss(e,dt){
    const s=this.state;
    if(e.hp<=0){e.pattern=null;this.tickActor(e,dt);return;}
    this.tickActor(e,dt);
    if(e.gustavaxPossessedUntil>s.time)return;
    const target=s.players.filter(alive).sort((a,b)=>d(e,a)-d(e,b))[0];if(!target)return;
    if(e.kind==='remyGeek'){if(e.bossPhase>1&&!e.remyOnyxiaSpawned)this.spawnRemyOnyxia(e);this.updateRemyShield(e);}
    if(e.bossPhase===1&&e.hp<=e.maxHp*.42){e.bossPhase=2;e.enraged=true;if(e.kind==='remyGeek')this.spawnRemyOnyxia(e);if(e.kind==='harmelin')this.summonHarmelinProviseur(e);this.event('rage',{actor:e.id,label:`${e.kind.toUpperCase()} S'EMBALLE !`});}
    if(e.stun>0){e.action='hurt';return;}
    if(e.pattern){const p=e.pattern;p.elapsed+=dt;e.action='special';
      if(p.kind==='charge'&&p.elapsed>=p.windup&&p.elapsed<p.windup+p.active){
        const zig=Math.sin((p.elapsed-p.windup)*(e.enraged?15:10))*(e.kind==='cainri'?(e.enraged?120:85):24),speed=e.kind==='cainri'?(e.enraged?600:465):330;
        const ox=e.x,oy=e.y;e.x=clamp(e.x+(p.dx*speed*dt+p.dy*zig*dt),FLOOR.left,FLOOR.right);e.y=clamp(e.y+(p.dy*speed*.7*dt-p.dx*zig*dt),FLOOR.top,FLOOR.bottom);e.moving=true;
        if((e.x===FLOOR.left||e.x===FLOOR.right)&&ox!==e.x||Math.hypot(e.x-ox,e.y-oy)<1){p.elapsed=p.windup+p.active;this.miniBossFX(e.x,e.y,13);}
        const nearPlayers=s.players.filter(alive).some(player=>d(e,player)<58);
        if(nearPlayers&&s.time>=(e.contactHit||0)){for(const player of s.players)if(alive(player)&&player.invincible<=0&&player.z<28&&d(e,player)<58)this.damage(player,e.power*1.15,e,true);e.contactHit=s.time+.65;}
      }
      if(p.elapsed>=p.windup&&!p.hit){p.hit=true;const targetNow=s.players.find(t=>t.id===p.target)||target;e.facing=Math.sign(targetNow.x-e.x)||e.facing;
        if(p.kind==='cigarette'){const angle=Math.atan2(targetNow.y-e.y,targetNow.x-(e.x+e.facing*40)),h=this.hazard(e,{kind:'dampsCigarette',x:e.x+e.facing*45,y:e.y,radius:22,vx:Math.cos(angle)*430,vy:Math.sin(angle)*430,delay:0,ttl:1.8,damage:e.power*.8,pulse:10});h.enemy=true;this.miniBossFX(e.x+e.facing*50,e.y-90,0);}
        else if(p.kind==='smoke'){const h=this.hazard(e,{kind:'dampsSmoke',x:e.x+e.facing*(p.late?145:115),y:e.y,radius:p.late?152:120,delay:0,ttl:2.6,damage:0,pulse:.2});h.enemy=true;this.miniBossFX(h.x,h.y,3);}
        else if(p.kind==='cough'){const h=this.hazard(e,{kind:'dampsCough',x:e.x+e.facing*40,y:e.y,facing:e.facing,shape:'line',width:p.late?420:325,band:82,delay:0,ttl:.2,damage:e.power*1.1,pulse:10});h.enemy=true;this.miniBossFX(h.x,h.y,4);}
        else if(p.kind==='bottle'){const angle=Math.atan2(targetNow.y-e.y,targetNow.x-(e.x+e.facing*40)),h=this.hazard(e,{kind:'cainriBottle',x:e.x+e.facing*38,y:e.y,radius:27,vx:Math.cos(angle)*350,vy:Math.sin(angle)*350,delay:0,ttl:1.6,damage:e.power,pulse:10});h.enemy=true;this.miniBossFX(e.x+e.facing*50,e.y-80,8);}
        else if(p.kind==='whisky'){const h=this.hazard(e,{kind:'whisky',x:e.x+e.facing*40,y:e.y,facing:e.facing,shape:'line',width:p.late?370:290,band:27,delay:0,ttl:2.4,damage:e.power*.25,pulse:.65});h.enemy=true;this.miniBossFX(h.x,h.y,11);}
        else if(p.kind==='cast'){const h=this.hazard(e,{kind:'jalatrixHook',x:e.x+e.facing*35,y:e.y,radius:24,vx:e.facing*(p.late?520:420),vy:clamp((targetNow.y-e.y)*1.6,-150,150),delay:0,ttl:1.4,damage:e.power*.8,pulse:10,hooked:false});h.enemy=true;this.miniBossFX(e.x+e.facing*55,e.y-70,2);}
        else if(p.kind==='sweep'){const h=this.hazard(e,{kind:'jalatrixSweep',x:e.x+e.facing*30,y:e.y+4,facing:e.facing,shape:'line',width:p.late?290:220,band:48,delay:0,ttl:.28,damage:e.power*1.2,pulse:10});h.enemy=true;this.miniBossFX(h.x+e.facing*70,h.y-70,3);}
        else if(p.kind==='slam'){const h=this.hazard(e,{kind:'jalatrixSlam',x:e.x+e.facing*110,y:e.y+4,shape:'circle',radius:p.late?145:112,delay:0,ttl:.24,damage:e.power*1.25,pulse:10});h.enemy=true;this.miniBossFX(h.x,h.y-25,6);}
        else if(p.kind==='kick'){const h=this.hazard(e,{kind:'mazzukaKick',x:e.x+e.facing*32,y:e.y,facing:e.facing,shape:'line',width:p.late?230:175,band:58,delay:0,ttl:.24,damage:e.power*(p.late?1.55:1.35),pulse:10});h.enemy=true;this.mazzukaFX(e.x+e.facing*80,e.y-65,2);}
        else if(p.kind==='maireKick'){const h=this.hazard(e,{kind:'maireKick',x:e.x+e.facing*30,y:e.y,facing:e.facing,shape:'line',width:p.late?285:225,band:58,delay:0,ttl:.24,damage:e.power*(p.late?1.55:1.35),pulse:10,stunDuration:.35});h.enemy=true;this.maireFX(e.x+e.facing*85,e.y-68,10);}
        else if(p.kind==='whistle'){const h=this.hazard(e,{kind:'maireWhistle',x:e.x+e.facing*35,y:e.y,facing:e.facing,shape:'line',width:p.late?500:390,band:p.late?150:112,delay:0,ttl:.18,damage:e.power*.55,pulse:10,stunDuration:.65});h.enemy=true;this.maireFX(e.x+e.facing*75,e.y-125,p.late?8:1);}
        else if(p.kind==='callPolice'){
          const officers=s.enemies.filter(other=>other.kind==='mairePolice'&&other.hp>0&&other.owner===e.id),maximum=p.late?3:2,needed=Math.max(0,maximum-officers.length);
          this.maireFX(e.x,e.y-120,p.late?12:4);this.event('opening',{x:e.x,y:e.y-205,label:'RENFORTS ! POLICE MUNICIPALE !'});
          for(let i=0;i<needed;i++){const side=i%2?FLOOR.right:FLOOR.left,officer=this.spawnEnemy('mairePolice',{owner:e.id,summonTTL:p.late?8:6.5,x:side,y:clamp(e.y+(i%2?65:-65),FLOOR.top,FLOOR.bottom),facing:side<e.x?1:-1});officer.speed*=1.2;this.maireFX(side,e.y-40,3);}
        }
        else if(p.kind==='summonParty')this.spawnRemyParty(e,p.late);
        else if(p.kind==='harmelinClass')this.summonHarmelinClass(e);
        else if(p.kind==='harmelinPaper'||p.kind==='harmelinPens'){
          const count=p.kind==='harmelinPens'?3:1,base=Math.atan2(targetNow.y-(e.y-65),targetNow.x-e.x);
          for(let i=0;i<count;i++){
            const angle=base+(i-(count-1)/2)*(p.kind==='harmelinPens'?.21:0),speed=p.kind==='harmelinPens'?560:400;
            const hazard=this.hazard(e,{kind:p.kind==='harmelinPens'?'harmelinPen':'harmelinPaper',x:e.x+e.facing*28,y:e.y-75,radius:p.kind==='harmelinPens'?15:25,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,delay:0,ttl:1.8,damage:e.power*(p.kind==='harmelinPens'?.58:.9),pulse:10});hazard.enemy=true;
          }
          this.harmelinFX(e.x+e.facing*60,e.y-80,p.kind==='harmelinPens'?5:0);
        }
        else if(p.kind==='keyboardBurst'){
          for(let i=-1;i<=1;i++){const angle=Math.atan2(targetNow.y-e.y,targetNow.x-e.x)+i*.19;this.hazard(e,{kind:'remyPixelBolt',x:e.x+e.facing*55,y:e.y,radius:24,vx:Math.cos(angle)*(p.late?450:370),vy:Math.sin(angle)*(p.late?450:370),delay:Math.abs(i)*.1,ttl:2,damage:e.power*(p.late?1.15:.9),pulse:10});}
          this.remyFX(e.x+e.facing*70,e.y-105,13);
        }
        else if(p.kind==='screenPulse'){const h=this.hazard(e,{kind:'remyScreenPulse',x:e.x,y:e.y,radius:p.late?280:215,delay:.08,ttl:.24,damage:e.power*(p.late?1.25:.95),stunDuration:p.late?.85:0,electric:p.late,pulse:10});h.enemy=true;this.remyFX(e.x,e.y-65,p.late?15:14);}
        else if(p.kind==='eraser'||p.kind==='chair'){
          const angle=Math.atan2(targetNow.y-e.y,targetNow.x-(e.x+e.facing*35)),heavy=p.kind==='chair',speed=heavy?(p.late?430:340):(p.late?530:440);
          const h=this.hazard(e,{kind:heavy?'mazzukaChair':'mazzukaEraser',x:e.x+e.facing*36,y:e.y,radius:heavy?35:19,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,delay:0,ttl:1.55,damage:e.power*(heavy?1.45:.75),pulse:10});h.enemy=true;
          this.mazzukaFX(e.x+e.facing*50,e.y-58,heavy?7:0);
        }
      }
      if(p.elapsed>=p.windup+p.active){e.pattern=null;e.cooldown=p.kind==='charge'?1.35:.9;e.recovering=e.cooldown;e.action='idle';e.moving=false;}
      return;
    }
    e.facing=Math.sign(target.x-e.x)||e.facing;
    if(e.cooldown>0){e.action='idle';return;}
    const range=e.kind==='damps'?205:e.kind==='jalatrix'?245:e.kind==='mazzuka'?195:e.kind==='maire'?215:e.kind==='remyGeek'||e.kind==='harmelin'?1000:170;
    if(d(e,target)>range){const dx=target.x-e.x,dy=target.y-e.y,len=Math.max(1,Math.hypot(dx,dy*1.5));e.x=clamp(e.x+dx/len*e.speed*dt,FLOOR.left,FLOOR.right);e.y=clamp(e.y+dy/len*e.speed*.8*dt,FLOOR.top,FLOOR.bottom);e.action='walk';e.moving=true;}
    else this.startMiniBossPattern(e,target);
  },
  updateMiniBossWorld(dt){
    const s=this.state;
    for(const h of s.hazards.filter(h=>h.kind==='dampsSmoke'&&h.ttl>0))for(const p of s.players)if(alive(p)&&d(h,p)<h.radius){p.dampsSmokeUntil=s.time+.24;}
    for(const h of s.hazards.filter(h=>h.kind==='jalatrixHook'&&h.ttl>0&&!h.pulled))for(const p of s.players)if(alive(p)&&h.hits[p.id]>0){const boss=s.enemies.find(e=>e.id===h.owner);if(boss){p.vx=Math.sign(boss.x-p.x)*420;p.vy=Math.sign(boss.y-p.y)*230;p.stun=Math.max(p.stun,.25);h.pulled=true;this.event('opening',{x:p.x,y:p.y-110,label:'MORDU À L’HAMEÇON !'});}break;}
    for(const flame of s.hazards.filter(h=>['fire','dampsCigarette'].includes(h.kind)&&h.owner!=null))for(const h of s.hazards)if(h.kind==='whisky'&&h.ttl>0&&d(flame,h)<65){h.kind='whiskyFire';h.damage=17;h.pulse=.3;h.ttl=Math.max(h.ttl,1.4);this.miniBossFX(h.x,h.y,14);}
  },
};
