import { FLOOR, clamp } from './data.js';
import { difficulty } from './balance.js';
import { GUSTAVAX_BEATS, GUSTAVAX_ACTIVE } from './gustavax-animation.js';

export const gustavaxCombat={
  gustavaxOpening(e,kind='normal'){
    const s=this.state;
    e.pattern=null;e.action='idle';e.actionTime=0;e.guardHits=0;e.recoveryKind=kind;
    e.recovering=0;e.cooldown=(kind==='crash'?.45:.18)*difficulty(s.difficulty).recovery;
  },
  updateGustavax(e,dt){
    const s=this.state,mode=difficulty(s.difficulty);
    if(e.phaseChange){e.phaseChange.elapsed+=dt;e.action='special';e.vx=e.vy=0;if(e.phaseChange.elapsed>=2.4){e.phaseChange=null;e.cooldown=.4;}return;}
    const phase=Math.max(e.bossPhase||1,e.hp<=e.maxHp*.3?3:e.hp<=e.maxHp*.65?2:1);
    if(phase!==e.bossPhase){
      e.bossPhase=phase;e.pattern=null;e.attack=null;e.cooldown=2.4;e.invincible=2.5;e.recovering=0;e.phaseChange={elapsed:0};e.enraged=true;e.attackCount=0;
      s.hazards=s.hazards.filter(h=>h.owner!==e.id);s.finale.smoke=phase===2?9:0;s.finale.smokeSuppressedUntil=0;
      this.event('rage',{actor:e.id,label:phase===2?'PHASE II · ÉCRAN DE FUMÉE':'PHASE III · LE DERNIER MOT'});return;
    }
    const p=e.pattern;
    if(p){
      p.elapsed+=dt;e.action='special';
      if(!p.hit&&p.elapsed>=p.windup){p.hit=true;this.executeGustavax(e,p);}
      const beats=GUSTAVAX_BEATS[p.kind];
      if(beats&&p.hit)while((p.beat||0)<beats.length&&p.elapsed>=p.windup+beats[p.beat||0]){this.gustavaxStrike(e,p,p.beat||0);p.beat=(p.beat||0)+1;}
      if(p.hit&&p.charge&&p.elapsed<p.windup+p.active){
        const x=e.x+p.dx*640*dt,y=e.y+p.dy*640*dt;
        e.x=clamp(x,100,1180);e.y=clamp(y,FLOOR.top+12,FLOOR.bottom-12);
        for(const a of s.players)if(a.hp>0&&a.invincible<=0&&a.z<=28&&!p.hits.includes(a.id)&&Math.hypot(a.x-e.x,(a.y-e.y)*1.6)<78){p.hits.push(a.id);this.damage(a,e.power*1.25,e,true);}
        const debris=s.finale.debris.find(d=>!d.broken&&Math.hypot(d.x-e.x,(d.y-e.y)*1.5)<85);
        if(debris||e.x!==x||e.y!==y){
          if(debris){debris.broken=true;s.finale.smoke=0;s.finale.smokeSuppressedUntil=s.time+6;this.event('break',{x:debris.x,y:debris.y,broken:true});}
          this.event('gustavaxCrash',{x:e.x,y:e.y});this.gustavaxOpening(e,'crash');return;
        }
      }
      if(p.elapsed>=p.windup+p.active)this.gustavaxOpening(e,p.kind==='lastWord'?'lastWord':'normal');
      return;
    }
    if(e.cooldown>0||e.stun>0)return;
    const target=s.players.filter(a=>a.hp>0).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];if(!target)return;
    const choices=phase===1?['executiveCombo','cigarRain','chairRush']:phase===2?['smokeCharge','cigarRain','smokeCharge']:['deskSweep','deskSlam','lastWord'];
    const kind=choices[e.attackCount%choices.length],dx=target.x-e.x,dy=target.y-e.y,d=Math.max(1,Math.hypot(dx,dy));e.facing=Math.sign(dx)||e.facing;
    const melee=['executiveCombo','deskSweep','deskSlam'].includes(kind);
    if(melee&&(Math.abs(dx)>140||Math.abs(dy)>35)||kind==='chairRush'&&Math.abs(dy)>30){e.x+=melee?dx/d*230*dt:0;e.y+=dy/d*165*dt;e.action='walk';return;}
    e.attackCount++;e.recoveryKind=null;
    const windup=(kind==='lastWord'?.85:kind==='deskSlam'?.8:.65)*mode.telegraph;
    e.pattern={kind,elapsed:0,windup,active:GUSTAVAX_ACTIVE[kind],hit:false,beat:0,charge:kind==='smokeCharge',dx:dx/d,dy:dy/d,hits:[],x:e.x,y:e.y,targetX:target.x,targetY:target.y,facing:e.facing};
    if(kind==='lastWord')e.pattern.marks=Array.from({length:5},(_,i)=>({x:clamp(target.x+(i-2)*140,110,1170),y:target.y}));
    if(kind==='cigarRain'){
      const safeLane=e.attackCount%5;
      e.pattern.safeLane=phase===2?safeLane:null;
      e.pattern.marks=phase===1?[{x:target.x,y:target.y}]:[160,400,640,880,1120].filter((_,i)=>i!==safeLane).map((x,i)=>({x,y:i%2?590:490}));
    }
    if(kind==='smokeCharge'){
      if(s.time>=(s.finale.smokeSuppressedUntil||0))s.finale.smoke=6;
      this.event('gustavaxCharge',{actor:e.id,x:e.x,y:e.y});
    }
    e.vx=e.vy=0;e.actionTime=0;
  },
  gustavaxStrike(e,p,i){
    if(p.kind==='lastWord'){
      const mark=p.marks[i],last=i===4;
      this.hazard(e,{kind:'impact',x:mark.x,y:mark.y,radius:last?125:75,delay:0,ttl:.16,pulse:10,damage:e.power*(last?1.65:.85)});
      this.event(last?'gustavaxCrash':'swing',{x:mark.x,y:mark.y});
    }else{
      const sweep=p.kind==='deskSweep',last=sweep?i===1:i===2;
      this.hazard(e,{kind:'impact',shape:'line',width:sweep?225:last?175:135,band:sweep?48:40,delay:0,ttl:.12,pulse:10,damage:e.power*(last?1.3:.65)});
      this.event('swing',{actor:e.id,heavy:last});
    }
  },
  executeGustavax(e,p){
    if(p.kind==='cigarRain'){
      for(const [i,mark] of p.marks.entries())this.hazard(e,{kind:'fire',finalCigar:true,x:mark.x,y:mark.y,radius:e.bossPhase===2?62:65,delay:.55+i*.22,ttl:3.1,damage:e.power*.65,pulse:1});
    }else if(p.kind==='chairRush'){
      this.hazard(e,{kind:'finalChair',x:e.x+e.facing*70,y:e.y,radius:48,vx:e.facing*550,delay:0,ttl:2.8,damage:e.power*1.2,pulse:10});
      this.event('skid',{x:e.x,y:e.y,facing:e.facing});
    }else if(p.kind==='deskSlam'){
      this.hazard(e,{kind:'shock',shape:'ring',x:e.x+e.facing*70,y:e.y,radius:5,maxRadius:1050,growth:440,thickness:18,delay:0,ttl:3,pulse:10,damage:e.power*1.35});
      this.event('gustavaxCrash',{x:e.x,y:e.y});
    }else if(p.kind==='smokeCharge')this.event('skid',{x:e.x,y:e.y,facing:e.facing});
  },
  updateGustavaxChair(h){
    if(h.x>FLOOR.left+48&&h.x<FLOOR.right-48)return;
    h.ttl=0;const boss=this.state.enemies.find(e=>e.id===h.owner&&e.hp>0&&e.bossPhase===1);
    if(boss){this.event('gustavaxCrash',{x:h.x,y:h.y});this.gustavaxOpening(boss,'angry');}
  },
};
