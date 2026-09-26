import { FLOOR, clamp } from './data.js';
import { gustavaxSelection } from './gustavax-talents.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const live=e=>e.hp>0&&!e.joCargo&&!e.lorenzoCarry&&!e.gustavaxGrip;
const grabbable=e=>live(e)&&!e.boss&&!e.elite&&!e.vehicle&&!e.grabbedBy&&!e.thrown;
const pose=(a,n,t=.3)=>{a.pose=n;a.poseUntil=a.elapsed+t;};
export const gustavaxTransformations={
  beginGustavaxTransformation(p){
    const {branch,rank}=gustavaxSelection(p);if(branch<0)return false;
    this.releaseGrab(p);p.energy-=100;p.attack=null;p.cooldown=p.specialCd=0;p.vx=p.vy=p.vz=p.z=0;
    p.specialState={kind:'gustavax',transformation:true,branch,rank,ultimate:rank===6,duration:rank===6?9:rank>=4?7:5,elapsed:0,pose:0,poseUntil:0,nextAttack:0,nextHeavy:0,nextDodge:0,nextJump:0,nextSummon:1.5,held:{},taps:{...p.taps},speed:0};
    p.action='special';p.invincible=Math.max(p.invincible,.4);
    if(branch===1)this.fillGustavaxTeam(p);if(branch===0&&rank===6)for(let i=0;i<3;i++)this.spawnGustavaxMinion(p,'imp');
    this.event('special',{actor:p.id,kind:'blast',label:['SHEITAN','LE PATRON','CATCHEUR'][branch],x:p.x,y:p.y});return true;
  },
  gustavaxFX(x,y,cell){this.event('spectacle',{x,y,atlas:'gustavaxFX',cell});},
  endGustavaxTransformation(p){
    const a=p.specialState;if(a.grip)this.finishGustavaxGrip(p,false);
    for(const m of this.state.allies)if(m.gustavaxMinion&&m.owner===p.id&&!m.permanent)m.until=Math.min(m.until,this.state.time+(m.role!=='imp'&&a.rank>=4?4:0));
    p.z=p.vz=0;
  },
  gustavaxPlayerStrike(p,x,y,radius,power,radial=true,knock=false){
    for(const e of this.state.enemies)if(live(e)&&e.invincible<=0&&dist({x,y},e)<radius&&(radial||(e.x-p.x)*p.facing>=-25)){
      this.damage(e,p.specialPower*power,p,true);if(knock&&!e.boss&&!e.vehicle){e.stun=Math.max(e.stun,.9);e.gustavaxDownUntil=this.state.time+1.5;e.vx=(Math.sign(e.x-x)||p.facing)*350;}
    }
    for(const prop of this.state.props)if(prop.hp>0&&dist({x,y},prop)<radius)this.hitProp(prop,2,p);
  },
  gustavaxFire(p,x,y){
    const a=p.specialState;this.hazard(p,{kind:'fire',x,y,radius:a.rank===6?115:85,delay:0,ttl:2.4,pulse:.6,damage:p.specialPower*.45,gustavaxFire:true,possession:a.rank>=5,atlas:'gustavaxFX',cell:2});
    const owned=this.state.hazards.filter(h=>h.gustavaxFire&&h.owner===p.id);if(owned.length>18)owned[0].ttl=0;
  },
  spawnGustavaxMinion(p,role='staff',saved=null){
    const a=p.specialState,s=this.state,owned=s.allies.filter(m=>m.gustavaxMinion&&m.owner===p.id&&m.hp>0);
    const cap=role==='imp'?3:a?.rank===6?6:a?.rank>=5?3:a?.rank>=2?2:1;
    if(!saved&&owned.filter(m=>(m.role==='imp')===(role==='imp')).length>=cap)return false;
    const id=this.nextId++,permanent=saved?true:role!=='imp'&&a.rank===6,hp=role==='manager'?130:role==='imp'?32:70;
    const m={...this.actor('creation',id,false),owner:p.id,ally:true,gustavaxMinion:true,role,permanent,x:clamp(p.x+(id%2?65:-65),FLOOR.left,FLOOR.right),y:clamp(p.y+(id%3-1)*35,FLOOR.top,FLOOR.bottom),hp:hp*(saved?.health??1),maxHp:hp,power:p.specialPower*(role==='manager'?1.2:role==='imp'?.5:.65),ttl:1,until:permanent?0:s.time+(role==='imp'&&a.rank<6?2:a.duration-a.elapsed+(role==='imp'?0:a.rank>=4?4:0)),cooldown:.25,emerging:.3,mode:'attack',target:null};
    s.allies.push(m);return m;
  },
  fillGustavaxTeam(p){
    const a=p.specialState,team=()=>this.state.allies.filter(m=>m.gustavaxMinion&&m.role!=='imp'&&m.owner===p.id&&m.hp>0),cap=a.rank===6?6:a.rank>=5?3:a.rank>=2?2:1;
    if(a.rank>=5&&!team().some(m=>m.role==='manager'))this.spawnGustavaxMinion(p,'manager');
    while(team().length<cap)if(!this.spawnGustavaxMinion(p))break;
  },
  commandGustavax(p,mode){
    const target=this.state.enemies.filter(live).sort((e,f)=>dist(p,e)-dist(p,f))[0];
    for(const m of this.state.allies)if(m.gustavaxMinion&&m.owner===p.id&&m.role!=='imp'&&m.hp>0){m.mode=mode;m.target=target?.id??null;if(mode!=='rally'){m.assaultUntil=this.state.time+1.2;m.cooldown=0;}if(mode==='area')m.area=true;}
    pose(p.specialState,mode==='rally'?4:mode==='area'?6:3);this.gustavaxFX(p.x,p.y-90,mode==='rally'?9:8);
  },
  startGustavaxGrip(p){
    const a=p.specialState,e=this.state.enemies.filter(e=>grabbable(e)&&dist(p,e)<145).sort((e,f)=>dist(p,e)-dist(p,f))[0];
    if(!e){this.gustavaxPlayerStrike(p,p.x,p.y,140,1.1,false);pose(a,2);return false;}
    e.gustavaxGrip={owner:p.id};e.attack=null;e.pattern=null;e.vx=e.vy=e.vz=0;a.grip={id:e.id,age:0,slam:false};pose(a,3,.65);return true;
  },
  finishGustavaxGrip(p,impact=true){
    const a=p.specialState,g=a.grip;if(!g)return;const e=this.state.enemies.find(e=>e.id===g.id);a.grip=null;if(!e)return;
    e.gustavaxGrip=null;e.z=e.vz=0;
    if(!impact||p.hp<=0){return;}
    e.x=clamp(p.x+(g.slam?1:-1)*p.facing*100,FLOOR.left,FLOOR.right);e.y=p.y;
    this.damage(e,p.specialPower*(a.rank===6?3.5:2.4),p,true);e.stun=Math.max(e.stun,1.1);e.gustavaxDownUntil=this.state.time+2;
    const final=a.rank===6&&a.elapsed>=a.duration-1.2&&!a.finalSlam;
    if(g.slam||a.rank>=4||final)this.gustavaxPlayerStrike(p,e.x,e.y,final?1600:a.rank===6?260:180,final?3.5:1.2,true,true);
    if(final)a.finalSlam=true;this.gustavaxFX(e.x,e.y,final?14:a.rank>=4?13:12);pose(a,g.slam?5:4,.35);
  },
  updateGustavaxTransformation(p,input,dt){
    const a=p.specialState;a.elapsed+=dt;p.action='special';p.vx=p.vy=p.vz=0;
    if(p.hp<=0||a.elapsed>=a.duration){if(p.hp>0&&a.grip)this.finishGustavaxGrip(p);this.endSpecial(p);return;}
    const fresh={};for(const key of ['punch','kick','jump','dodge']){fresh[key]=!!input[key]&&!a.held[key]||(input.taps?.[key]||0)>(a.taps[key]||0);a.held[key]=!!input[key];a.taps[key]=input.taps?.[key]||0;}
    const norm=Math.max(1,Math.hypot(input.x||0,input.y||0)),x=(input.x||0)/norm,y=(input.y||0)/norm;if(x)p.facing=Math.sign(x);
    if(a.elapsed>=a.poseUntil)a.pose=x||y?1+Math.floor(a.elapsed*8)%2:0;
    if(a.grip){a.grip.age+=dt;if(input.kick&&a.rank>=2&&a.grip.age>.22)a.grip.slam=true;const e=this.state.enemies.find(e=>e.id===a.grip.id);if(e){e.x=p.x+p.facing*30;e.y=p.y;e.z=110;}if(a.grip.age>=.6)this.finishGustavaxGrip(p);return;}
    if(a.air){const t=Math.min(1,(a.air.age+=dt)/.6);p.x=a.air.x+(a.air.toX-a.air.x)*t;p.y=a.air.y+(a.air.toY-a.air.y)*t;p.z=Math.sin(t*Math.PI)*150;pose(a,6,.05);if(t===1){this.gustavaxPlayerStrike(p,p.x,p.y,210,2.6,true,true);this.gustavaxFX(p.x,p.y,13);a.air=null;p.z=0;}return;}
    let speed=p.speed;if(a.branch===0&&a.rank>=4)speed*=1.1;
    if(a.branch===2&&a.rank===6){a.speed=x||y?Math.min(650,a.speed+450*dt):0;speed+=a.speed;if(a.elapsed<(a.bounceUntil||0)){p.x=clamp(p.x+a.bounceX*750*dt,FLOOR.left,FLOOR.right);pose(a,1,.1);this.gustavaxPlayerStrike(p,p.x,p.y,100,.25,false,true);} }
    const bouncing=a.branch===2&&a.rank===6&&a.elapsed<(a.bounceUntil||0);
    const nx=p.x+(bouncing?0:x)*speed*dt,ny=p.y+(bouncing?0:y)*speed*.7*dt;
    if(a.branch===2&&a.rank===6&&(nx<FLOOR.left||nx>FLOOR.right)&&a.elapsed>=(a.bounceUntil||0)){a.bounceX=nx<FLOOR.left?1:-1;a.bounceUntil=a.elapsed+.3;p.facing=a.bounceX;this.gustavaxFX(p.x,p.y,12);}
    p.x=clamp(nx,FLOOR.left,FLOOR.right);p.y=clamp(ny,FLOOR.top,FLOOR.bottom);
    if(a.branch===0){
      if(input.punch&&a.elapsed>=a.nextAttack){this.gustavaxPlayerStrike(p,p.x,p.y,a.rank>=4?180:145,1,false);a.nextAttack=a.elapsed+.28;pose(a,3);this.gustavaxFX(p.x+p.facing*70,p.y-70,a.rank===6?1:0);}
      if(input.kick&&a.elapsed>=a.nextHeavy){this.gustavaxPlayerStrike(p,p.x,p.y,170,1.5,false);if(a.rank>=2)this.gustavaxFire(p,p.x+p.facing*90,p.y);a.nextHeavy=a.elapsed+.65;pose(a,4);}
      if(fresh.dodge&&a.elapsed>=a.nextDodge){a.nextDodge=a.elapsed+.7;p.invincible=Math.max(p.invincible,.25);if(a.rank>=3){this.gustavaxFX(p.x,p.y,4);p.x=clamp(p.x+(x||(!y?p.facing:0))*260,FLOOR.left,FLOOR.right);p.y=clamp(p.y+y*180,FLOOR.top,FLOOR.bottom);this.gustavaxFX(p.x,p.y,5);pose(a,6);if(a.rank===6){this.gustavaxPlayerStrike(p,p.x,p.y,220,2,true,true);this.gustavaxFX(p.x,p.y,6);}}else p.x=clamp(p.x+p.facing*80,FLOOR.left,FLOOR.right);}
      if(a.rank>=4&&a.elapsed>=a.nextSummon){this.spawnGustavaxMinion(p,'imp');a.nextSummon=a.elapsed+(a.rank===6?.6:1.5);}
    }else if(a.branch===1){
      if(input.punch&&a.elapsed>=a.nextAttack){this.fillGustavaxTeam(p);this.commandGustavax(p,'attack');a.nextAttack=a.elapsed+.6;}
      if(fresh.kick&&a.rank>=3&&a.elapsed>=a.nextHeavy){this.commandGustavax(p,'rally');a.nextHeavy=a.elapsed+.4;}
      if(fresh.jump&&a.rank===6&&a.elapsed>=a.nextJump){this.commandGustavax(p,'area');a.nextJump=a.elapsed+1.2;}
    }else{
      if(input.punch&&a.elapsed>=a.nextAttack){this.gustavaxPlayerStrike(p,p.x,p.y,135,1,false);a.nextAttack=a.elapsed+.35;pose(a,2);}
      if(fresh.kick&&a.elapsed>=a.nextHeavy){this.startGustavaxGrip(p);a.nextHeavy=a.elapsed+.85;}
      if(fresh.dodge&&a.rank>=3&&a.elapsed>=a.nextDodge){this.gustavaxPlayerStrike(p,p.x,p.y,220,1.2,true,true);this.gustavaxFX(p.x,p.y,13);pose(a,7);a.nextDodge=a.elapsed+1;}
      if(fresh.jump&&a.rank>=5&&a.elapsed>=a.nextJump){const e=this.state.enemies.filter(e=>grabbable(e)&&dist(p,e)<500&&(e.gustavaxDownUntil>this.state.time||e.stun>0)).sort((e,f)=>dist(p,e)-dist(p,f))[0];if(e){a.air={age:0,x:p.x,y:p.y,toX:e.x,toY:e.y};a.nextJump=a.elapsed+1.2;}}
      if(a.rank===6&&a.elapsed>=a.duration-.8&&!a.finalAttempt){a.finalAttempt=true;this.startGustavaxGrip(p);}
    }
  },
  updateGustavaxEnemy(e,dt){
    if(e.gustavaxGrip){const p=this.state.players.find(p=>p.id===e.gustavaxGrip.owner&&p.hp>0);if(!p?.specialState?.grip){e.gustavaxGrip=null;e.z=0;return false;}e.attack=null;e.vx=e.vy=0;return true;}
    if(e.gustavaxPossessedUntil>this.state.time&&e.hp>0){this.tickActor(e,dt);e.attack=null;e.pattern=null;const foe=this.state.enemies.filter(t=>t!==e&&live(t)).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(foe){const d=dist(e,foe);e.facing=Math.sign(foe.x-e.x)||e.facing;if(d>65){e.x+=(foe.x-e.x)/d*e.speed*dt;e.y+=(foe.y-e.y)/d*e.speed*.7*dt;e.action='walk';}else if(e.cooldown<=0){e.cooldown=.8;e.action='punch';this.damage(foe,e.power,this.state.players.find(p=>p.id===e.gustavaxPossessor),false);}}return true;}return false;
  },
  updateGustavaxWorld(dt){
    const s=this.state;
    for(const h of s.hazards)if(h.gustavaxFire&&h.possession&&h.ttl>0)for(const e of s.enemies)if(grabbable(e)&&e.id%2===0&&dist(h,e)<h.radius){e.gustavaxPossessedUntil=s.time+1.6;e.gustavaxPossessor=h.owner;e.attack=null;}
    for(const m of s.allies)if(m.gustavaxMinion){
      const p=s.players.find(p=>p.id===m.owner);if(m.hp<=0||!p||!m.permanent&&(p.hp<=0||s.time>=m.until)){m.ttl=0;continue;}m.ttl=1;m.cooldown-=dt;m.flash=Math.max(0,m.flash-dt);m.actionTime+=dt;m.emerging=Math.max(0,m.emerging-dt);m.striking=Math.max(0,(m.striking||0)-dt);if(m.emerging>0)continue;
      const team=s.allies.filter(t=>t.gustavaxMinion&&t.owner===p.id&&t.hp>0),manager=team.find(t=>t.role==='manager');
      const target=s.enemies.find(e=>live(e)&&e.id===m.target)||s.enemies.filter(live).sort((e,f)=>dist(m,e)-dist(m,f))[0];
      if(m.role==='manager'&&target&&s.time>=(m.nextCommand||0)){for(const t of team)if(t.role==='staff'&&t.mode!=='rally')t.target=target.id;m.nextCommand=s.time+1;this.gustavaxFX(m.x,m.y-80,11);}
      const rally=m.mode==='rally',goal=rally||!target?{x:clamp(p.x+(m.id%2?70:-70),FLOOR.left,FLOOR.right),y:clamp(p.y+(m.id%3-1)*40,FLOOR.top,FLOOR.bottom)}:target,d=dist(m,goal);m.facing=Math.sign(goal.x-m.x)||m.facing;
      if(d>(rally||!target?20:70)){const speed=m.assaultUntil>s.time?600:manager?330:270;m.x=clamp(m.x+(goal.x-m.x)/Math.max(d,1)*speed*dt,FLOOR.left,FLOOR.right);m.y=clamp(m.y+(goal.y-m.y)/Math.max(d,1)*speed*.7*dt,FLOOR.top,FLOOR.bottom);m.action='walk';}
      else if(target&&!rally&&m.cooldown<=0){m.cooldown=manager?.45:.65;m.striking=.25;m.action='punch';m.actionTime=0;
        if(m.area){for(const e of s.enemies)if(live(e)&&dist(m,e)<170)this.damage(e,m.power*1.7,p,true);m.area=false;this.gustavaxFX(m.x,m.y,10);}else this.damage(target,m.power*(m.assaultUntil>s.time?1.4:1),p,false);
      }else if(m.striking<=0)m.action='idle';
    }
  },
};
