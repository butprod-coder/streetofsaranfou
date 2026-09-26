import { FLOOR, clamp } from './data.js';
import { HEAVY_ENEMIES } from './weapons.js';
import { jualosSelection } from './jualos-talents.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const ordinary=e=>e.hp>0&&!e.boss&&!e.vehicle&&!e.elite&&!e.grabbedBy&&!e.thrown&&!e.lorenzoCarry&&!e.joCargo;
const pose=(a,n,ttl=.28)=>{a.pose=n;a.poseUntil=a.elapsed+ttl;};
export const jualosTransformations={
  beginJualos(p){
    const {branch,rank}=jualosSelection(p);if(branch<0)return false;
    this.releaseGrab(p);p.energy-=100;p.attack=null;p.cooldown=p.specialCd=0;p.vx=p.vy=p.vz=p.z=0;
    p.specialState={kind:'jualos',transformation:true,branch,rank,ultimate:rank===6,duration:rank===6?9:rank>=4?7:5,elapsed:0,pose:0,poseUntil:0,nextAttack:0,nextHeavy:0,nextJump:0,charge:0,held:{},taps:{...p.taps},hits:{}};
    p.action='special';p.invincible=Math.max(p.invincible,.4);
    if(branch===0&&rank===6){for(const e of [...this.state.enemies])if(ordinary(e)&&distance(p,e)<440)this.recruitJualos(p,e,true);pose(p.specialState,7,.7);}
    this.event('special',{actor:p.id,kind:'blast',label:['COMMERCIAL','GROS PORC','GUITARISTE'][branch],x:p.x,y:p.y});return true;
  },
  jualosFX(x,y,cell){this.event('spectacle',{x,y,atlas:'jualosFX',cell});},
  recruitJualos(p,e,takeover=false){
    const a=p.specialState,s=this.state;
    if(!a||!ordinary(e)||!takeover&&HEAVY_ENEMIES.has(e.kind))return false;
    if(!takeover&&s.allies.filter(r=>r.recruit&&r.owner===p.id&&r.hp>0).length>=(a.rank>=3?2:1))return false;
    this.releaseGrab(e);e.attack=null;e.pattern=null;e.lorenzoConfused=null;
    s.enemies=s.enemies.filter(other=>other!==e);
    Object.assign(e,{enemy:false,ally:true,recruit:true,owner:p.id,permanent:a.rank>=5,contractUntil:s.time+(a.duration-a.elapsed)+(a.rank>=4?4:0),ttl:1,cooldown:.15,stun:0,invincible:0,action:'idle',aggressive:a.rank>=2,vx:0,vy:0,vz:0,z:0});
    s.allies.push(e);this.jualosFX(e.x,e.y-120,10);return true;
  },
  endJualos(p){
    p.z=p.vz=0;
    for(const r of this.state.allies)if(r.recruit&&r.owner===p.id&&!r.permanent)r.contractUntil=Math.min(r.contractUntil,this.state.time+(p.specialState.rank>=4?4:0));
  },
  jualosStrike(p,radius,power,push=0,radial=false){
    const hits=[];
    for(const e of this.state.enemies)if(e.hp>0&&e.invincible<=0&&distance(p,e)<radius&&(radial||(e.x-p.x)*p.facing>=-25)){
      this.damage(e,p.specialPower*power*(p.specialState.rank===6?1.35:1),p,true);hits.push(e);
      if(push&&!e.boss&&!e.vehicle){e.vx=(Math.sign(e.x-p.x)||p.facing)*push;e.stun=Math.max(e.stun,.45);}
    }
    for(const prop of this.state.props)if(prop.hp>0&&distance(p,prop)<radius)this.hitProp(prop,2,p);
    return hits;
  },
  jualosChord(p){
    const a=p.specialState;
    for(const direction of a.rank>=5?[-1,1]:[p.facing]){
      (this.state.jualosWaves||=[]).push({id:this.nextId++,owner:p.id,x:p.x,y:p.y,direction,age:0,ttl:1.7,radius:a.rank===6?125:a.rank>=4?85:50,power:p.specialPower*(a.rank===6?2:a.rank>=4?1.4:1),pierce:a.rank>=2,hits:{},rank:a.rank});
    }
    pose(a,a.rank>=5?6:3);a.nextAttack=a.elapsed+.42;
  },
  updateJualosTransformation(p,input,dt){
    const a=p.specialState;a.elapsed+=dt;p.action='special';p.vx=p.vy=p.vz=0;
    if(p.hp<=0||a.elapsed>=a.duration){this.endSpecial(p);return;}
    const fresh={};for(const key of ['punch','kick','jump','dodge']){fresh[key]=!!input[key]&&!a.held[key]||(input.taps?.[key]||0)>(a.taps[key]||0);a.held[key]=!!input[key];a.taps[key]=input.taps?.[key]||0;}
    const norm=Math.max(1,Math.hypot(input.x||0,input.y||0)),x=(input.x||0)/norm,y=(input.y||0)/norm;
    if(x)p.facing=Math.sign(x);if(a.elapsed>=a.poseUntil)a.pose=x||y?Math.floor(a.elapsed*8)%2:0;
    if(a.branch===1&&a.rank===6&&a.elapsed>=a.duration-.8&&!a.finale){a.finale=true;a.chargeUntil=a.duration;a.chargeX=p.facing;a.chargeY=0;a.hits={};p.x=p.facing>0?FLOOR.left:FLOOR.right;this.jualosFX(p.x,p.y,15);}
    const rolling=a.branch===1&&a.rank>=3&&input.dodge&&!a.finale;
    const charging=a.branch===1&&(rolling||a.elapsed<(a.chargeUntil||0));
    const speed=charging?(a.finale?(FLOOR.right-FLOOR.left)/.72:rolling?540:a.rank>=4?720:470):p.speed;
    const dx=charging&&!rolling?a.chargeX:x,dy=charging&&!rolling?a.chargeY:y,old={x:p.x,y:p.y};
    p.x=clamp(p.x+(dx||(rolling&&!y?p.facing:0))*speed*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+dy*speed*.7*dt,FLOOR.top,FLOOR.bottom);
    if(a.branch===0){
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack){
        const e=this.state.enemies.filter(e=>ordinary(e)&&!HEAVY_ENEMIES.has(e.kind)&&distance(p,e)<300&&(e.x-p.x)*p.facing>=-20).sort((e,f)=>distance(p,e)-distance(p,f))[0];
        if(e)this.recruitJualos(p,e);pose(a,2);a.nextAttack=a.elapsed+.5;
      }
      if((fresh.kick||input.kick)&&a.elapsed>=a.nextHeavy){this.jualosStrike(p,135,1.2,220);pose(a,5);a.nextHeavy=a.elapsed+.5;}
    }else if(a.branch===1){
      if(a.slam){a.slam.age+=dt;p.z=Math.sin(Math.min(1,a.slam.age/.65)*Math.PI)*140;pose(a,6,.1);if(a.slam.age>=.65){a.slam=null;p.z=0;this.jualosStrike(p,a.rank===6?290:200,2.6,650,true);this.jualosFX(p.x,p.y,a.rank===6?15:14);pose(a,7,.35);}return;}
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack&&!charging){this.jualosStrike(p,150,a.rank>=2?1.7:1,a.rank>=2?600:180);pose(a,3);this.jualosFX(p.x+p.facing*80,p.y-30,a.rank>=2?13:12);a.nextAttack=a.elapsed+.38;}
      if(fresh.kick&&a.elapsed>=a.nextHeavy&&!a.finale){a.chargeUntil=a.elapsed+.55;a.chargeX=x||y?x:p.facing;a.chargeY=y;a.hits={};a.nextHeavy=a.elapsed+.9;}
      if(fresh.jump&&a.rank>=5&&a.elapsed>=a.nextJump&&!a.finale){a.slam={age:0};a.nextJump=a.elapsed+1.3;}
      if(charging){pose(a,rolling?5:4,.1);p.invincible=Math.max(p.invincible,.06);
        for(const e of this.state.enemies){const vx=p.x-old.x,vy=(p.y-old.y)*1.5,t=clamp(((e.x-old.x)*vx+(e.y-old.y)*1.5*vy)/(vx*vx+vy*vy||1),0,1);
          if(e.hp<=0||e.invincible>0||a.elapsed<(a.hits[e.id]||0)||Math.hypot(e.x-old.x-vx*t,(e.y-old.y)*1.5-vy*t)>100)continue;
          a.hits[e.id]=a.elapsed+.55;this.damage(e,p.specialPower*(a.finale?4:a.rank===6?2.5:1.6),p,true);if(!e.boss&&!e.vehicle){e.vx=p.facing*700;e.stun=Math.max(e.stun,.5);}
          if(!rolling&&a.rank<4){a.chargeUntil=0;break;}
        }
      }
    }else{
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack)this.jualosChord(p);
      a.charge=input.kick?a.charge+dt:0;
      if(a.rank>=3&&a.charge>=.45&&a.elapsed>=a.nextHeavy){a.feedbackUntil=a.elapsed+1.2;a.nextHeavy=a.elapsed+1.8;a.charge=0;pose(a,5,1.2);}
      if(a.elapsed<(a.feedbackUntil||0)&&a.elapsed>=(a.nextFeedback||0)){this.jualosStrike(p,210,.35,0,true).forEach(e=>{e.stun=Math.max(e.stun,1);});a.nextFeedback=a.elapsed+.25;this.jualosFX(p.x,p.y-70,7);}
      if(a.rank===6&&a.elapsed>=a.duration-1&&!a.finale){a.finale=true;pose(a,7,1);this.hazard(p,{kind:'special',radius:2000,delay:0,ttl:.95,pulse:2,damage:p.specialPower*4,stunDuration:1});this.jualosFX(p.x,p.y,7);}
    }
  },
  updateJualosWorld(dt){
    const s=this.state;
    for(const r of s.allies)if(r.recruit){
      const owner=s.players.find(p=>p.id===r.owner&&p.hp>0);
      if(!owner||r.hp<=0){r.ttl=0;continue;}
      if(!r.permanent&&s.time>=r.contractUntil){r.ttl=0;const e={...r,enemy:true,ally:false,recruit:false,owner:null,action:'idle',cooldown:.5};delete e.ttl;s.enemies.push(e);continue;}
      r.ttl=1;r.cooldown-=dt;r.actionTime+=dt;r.flash=Math.max(0,r.flash-dt);
      const e=s.enemies.filter(e=>e.hp>0).sort((e,f)=>distance(r,e)-distance(r,f))[0],target=e||owner,d=distance(r,target);r.facing=Math.sign(target.x-r.x)||r.facing;
      if(d>(e?65:100)){r.x=clamp(r.x+(target.x-r.x)/Math.max(1,d)*(r.aggressive?300:210)*dt,FLOOR.left,FLOOR.right);r.y=clamp(r.y+(target.y-r.y)/Math.max(1,d)*180*dt,FLOOR.top,FLOOR.bottom);r.action='walk';}
      else if(e&&r.cooldown<=0){r.cooldown=r.aggressive?.42:.8;r.action='punch';r.actionTime=0;if(e.invincible<=0)this.damage(e,Math.max(8,r.power)*(r.aggressive?1.25:1),owner,false);}
      else if(r.actionTime>.25)r.action='idle';
    }
    s.jualosWaves=(s.jualosWaves||[]).filter(w=>{
      w.age+=dt;w.ttl-=dt;const old=w.x;w.x+=w.direction*620*dt;const p=s.players.find(p=>p.id===w.owner&&p.hp>0);if(!p||w.ttl<=0)return false;
      const targets=s.enemies.filter(e=>e.hp>0&&e.invincible<=0&&!w.hits[e.id]&&Math.abs(e.y-w.y)*1.5<w.radius&&e.x>=Math.min(old,w.x)-w.radius&&e.x<=Math.max(old,w.x)+w.radius).sort((a,b)=>Math.abs(a.x-old)-Math.abs(b.x-old));
      for(const e of targets){w.hits[e.id]=true;this.damage(e,w.power,p,true);if(!w.pierce)return false;}
      return true;
    });
  },
  updateJualosRecruitTarget(e,dt){
    if(!ordinary(e)||e.lorenzoConfused||e.stun>0)return false;
    const recruit=this.state.allies.filter(r=>(r.recruit||r.gustavaxMinion)&&r.hp>0&&r.ttl>0&&distance(e,r)<250).sort((a,b)=>distance(e,a)-distance(e,b))[0];
    if(!recruit)return false;
    const player=this.state.players.filter(p=>p.hp>0).sort((a,b)=>distance(e,a)-distance(e,b))[0];if(player&&distance(e,player)<distance(e,recruit)*.8)return false;
    this.tickActor(e,dt);e.attack=null;e.pattern=null;e.facing=Math.sign(recruit.x-e.x)||e.facing;
    const d=distance(e,recruit);if(d>65){e.x+=(recruit.x-e.x)/d*e.speed*dt;e.y+=(recruit.y-e.y)/d*e.speed*.7*dt;e.action='walk';}
    else if(e.cooldown<=0){e.cooldown=.9;e.action='punch';e.actionTime=0;recruit.hp=Math.max(0,recruit.hp-e.power);recruit.flash=.15;this.event('impact',{x:recruit.x,y:recruit.y-65});}
    return true;
  },
};
