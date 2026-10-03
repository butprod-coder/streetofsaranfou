import {clamp,FLOOR} from './data.js';
const styles={karonux:1,yanu:0,lorenzo:1,jo:1,kikor:2,jualos:0,gustavax:2};
export const bossBlockbuster={
  bossPressureHit(e){
    if(!e.boss||e.hp<=0||e.vehicle||this.state.bossCinema||this.jualosChanging(e)||this.joChanneling(e)||e.sofa&&!e.sofaBroken||e.pattern?.healing||e.pattern?.kind==='sleep'||e.recovering>0||e.cinematicCounter||this.state.time<(e.counterReadyAt||0))return;
    e.pressureHits=this.state.time-(e.pressureHitAt??-10)<1.2?(e.pressureHits||0)+1:1;e.pressureHitAt=this.state.time;
    if(e.pressureHits<4)return;
    const target=this.state.players.filter(p=>p.hp>0).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];if(!target)return;
    e.pressureHits=0;e.counterReadyAt=this.state.time+6;
    e.cinematicCounter={age:0,windup:.8,targetX:target.x,targetY:target.y,fromX:e.x,fromY:e.y,facing:Math.sign(target.x-e.x)||e.facing,style:styles[e.kind]??0};
    this.releaseYanuFreeze(e.id);e.karonuxFrost=null;e.yanuRoots=null;e.attack=null;e.pattern=null;e.stun=0;e.vx=e.vy=0;
    this.event('bossAction',{actor:e.id,x:e.x,y:e.y,style:styles[e.kind]??0,kind:'counter'});
  },
  updateBossBlockbuster(e,dt){
    const a=e.cinematicCounter;if(!a)return false;
    if(e.hp<=0||this.jualosChanging(e)||this.joChanneling(e)||e.sofa&&!e.sofaBroken){e.cinematicCounter=null;e.z=0;return false;}
    a.age+=dt;e.stun=0;e.vx=e.vy=0;e.action='special';e.facing=a.facing;
    if(a.style===1&&a.age>a.windup*.6&&!a.hit){const t=clamp((a.age-a.windup*.6)/(a.windup*.4),0,1);e.x=clamp(a.fromX+(a.targetX-a.facing*80-a.fromX)*t,FLOOR.left+55,FLOOR.right-55);e.y=clamp(a.fromY+(a.targetY-a.fromY)*t,FLOOR.top+10,FLOOR.bottom-10);}
    if(a.style===0&&!a.hit)e.z=Math.sin(Math.min(1,a.age/a.windup)*Math.PI)*95;
    if(a.age>=a.windup&&!a.hit){
      a.hit=true;
      e.z=0;
      if(a.style===1){e.x=clamp(a.targetX-a.facing*80,FLOOR.left+55,FLOOR.right-55);e.y=clamp(a.targetY,FLOOR.top+10,FLOOR.bottom-10);}
      this.hazard(e,{kind:'cinematicBoss',x:e.x,y:e.y,radius:a.style===2?200:175,delay:0,ttl:.16,damage:e.power*1.25,pulse:10});
      this.event('bossAction',{actor:e.id,x:e.x,y:e.y,style:a.style,kind:'impact'});
    }
    if(a.age>=a.windup+.45){e.cinematicCounter=null;e.recovering=e.cooldown=1.15;e.action='idle';e.signatureReady=true;}
    return true;
  },
  bossActionBeat(e,before){
    if(!e.boss||e.hp<=0||e.cinematicCounter)return;
    const a=e.pattern;
    if(a&&a!==before)this.event('bossAction',{actor:e.id,x:e.x,y:e.y,style:styles[e.kind]??0,kind:'prepare'});
    if(a?.hit&&!a.cinematicFired){a.cinematicFired=true;this.event('bossAction',{actor:e.id,x:e.x,y:e.y,style:styles[e.kind]??0,kind:'impact'});}
  },
};
