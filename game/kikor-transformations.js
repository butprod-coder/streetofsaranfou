import { FLOOR, clamp } from './data.js';
import { kikorSelection } from './kikor-talents.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const pose=(a,n,ttl=.25)=>{a.pose=n;a.poseUntil=a.elapsed+ttl;};
const targetable=e=>e.hp>0&&!e.joCargo&&!e.lorenzoCarry;
export const kikorTransformations={
  beginKikorTransformation(p){
    const {branch,rank}=kikorSelection(p);if(branch<0)return false;
    this.releaseGrab(p);p.energy-=100;p.attack=null;p.cooldown=p.specialCd=0;p.vx=p.vy=p.vz=p.z=0;
    p.specialState={kind:'kikor',transformation:true,branch,rank,ultimate:rank===6,duration:rank===6?9:rank>=4?7:5,elapsed:0,pose:0,poseUntil:0,nextAttack:0,nextHeavy:0,nextJump:0,nextDraw:0,nextAuto:2,charge:0,role:0,drawing:0,speed:330,held:{},taps:{...p.taps},hits:{}};
    p.action='special';p.invincible=Math.max(p.invincible,.4);if(branch===1)this.spawnKikorMinion(p);
    this.event('special',{actor:p.id,kind:'blast',label:['PEINTRE','INVOCATEUR','CYCLISTE'][branch],x:p.x,y:p.y});return true;
  },
  endKikorTransformation(p){
    p.z=p.vz=0;this.state.allies=this.state.allies.filter(a=>!a.kikorSummon||a.owner!==p.id);this.state.kikorDrawings=(this.state.kikorDrawings||[]).filter(d=>d.owner!==p.id||!d.army);
  },
  kikorFX(x,y,cell){this.event('spectacle',{x,y,atlas:'kikorFX',cell});},
  kikorHit(p,e,power){if(!targetable(e)||e.invincible>0)return false;const hp=e.hp;this.damage(e,p.specialPower*power,p,true);return e.hp<hp;},
  kikorStrike(p,radius,power,radial=false){const hits=[];for(const e of this.state.enemies)if(distance(p,e)<radius&&(radial||(e.x-p.x)*p.facing>=-25)&&this.kikorHit(p,e,power))hits.push(e);for(const prop of this.state.props)if(prop.hp>0&&distance(p,prop)<radius)this.hitProp(prop,2,p);return hits;},
  kikorPaint(p,x,y){
    const a=p.specialState,zones=this.state.kikorPaintZones||=[];
    zones.push({id:this.nextId++,owner:p.id,x:clamp(x,FLOOR.left,FLOOR.right),y:clamp(y,FLOOR.top,FLOOR.bottom),radius:a.rank>=4?125:75,until:this.state.time+(a.rank>=4?4.5:2.2)});
    if(zones.length>36)zones.shift();
  },
  kikorPaintPot(p){const a=p.specialState;(this.state.kikorPots||=[]).push({id:this.nextId++,owner:p.id,x:clamp(p.x+p.facing*190,FLOOR.left,FLOOR.right),y:p.y,fromX:p.x,fromY:p.y-80,age:0,rank:a.rank,power:p.specialPower});pose(a,5);},
  drawKikorCreature(p,army=false){
    const a=p.specialState,drawings=this.state.kikorDrawings||=[],owned=drawings.filter(d=>d.owner===p.id&&d.until>this.state.time);if(owned.length>=(army?8:4))return false;
    const variant=a.rank>=5?a.drawing++%3:0,x=clamp(p.x+p.facing*100+(a.drawing%3-1)*80,FLOOR.left+30,FLOOR.right-30);
    drawings.push({id:this.nextId++,owner:p.id,x,y:440,wallX:x,wallY:400-(a.drawing%2)*55,age:0,variant,army,until:this.state.time+(army?a.duration-a.elapsed:2.2),nextAttack:0,attacked:false,power:p.specialPower});pose(a,6,.45);return true;
  },
  spawnKikorMinion(p,clone=false,origin=null){
    const a=p.specialState;if(!a?.transformation||a.branch!==1)return false;
    const allies=this.state.allies,cap=a.rank===6?12:clone&&a.rank>=5?8:a.rank>=4?5:a.rank>=2?2:1;
    if(allies.filter(m=>m.kikorSummon&&m.owner===p.id&&m.hp>0).length>=cap)return false;
    const id=this.nextId++,entry=a.rank===6?id%3:0;
    const x=origin?.x??(entry===2?(id%2?FLOOR.left:FLOOR.right):p.x+(id%2?50:-50)),y=origin?.y??(entry===1?FLOOR.top:p.y);
    allies.push({...this.actor('creation',id,false),x:clamp(x,FLOOR.left,FLOOR.right),y:clamp(y,FLOOR.top,FLOOR.bottom),owner:p.id,ally:true,kikorSummon:true,role:a.rank>=3?a.role:0,clone,hp:40,maxHp:40,power:p.specialPower*(clone?.55:.75),ttl:1,cooldown:.25,entry,emerging:.35,until:this.state.time+a.duration-a.elapsed});pose(a,3);return true;
  },
  kikorParticipationKill(p,e){
    for(const m of this.state.allies.filter(m=>m.kikorSummon&&m.hp>0&&e.kikorParticipants?.[m.id]>=this.state.time-3)){
      const owner=this.state.players.find(p=>p.id===m.owner&&p.hp>0),a=owner?.specialState;
      if(a?.transformation&&a.kind==='kikor'&&a.branch===1&&a.rank>=5){this.spawnKikorMinion(owner,true,{x:m.x+30,y:m.y+15});break;}
    }
  },
  kikorProtect(p,amount){
    if(p.enemy||p.ally)return amount;
    const m=this.state.allies.find(m=>m.kikorSummon&&m.role===2&&m.hp>0&&m.owner===p.id&&distance(m,p)<150);
    if(!m)return amount;const absorbed=Math.min(m.hp,amount*.35);m.hp-=absorbed;m.action='special';m.striking=.25;this.kikorFX(p.x,p.y-65,7);return amount-absorbed;
  },
  updateKikorTransformation(p,input,dt){
    const a=p.specialState;a.elapsed+=dt;p.action='special';p.vx=p.vy=p.vz=0;
    if(p.hp<=0||a.elapsed>=a.duration){this.endSpecial(p);return;}
    const fresh={};for(const key of ['punch','kick','jump','dodge']){fresh[key]=!!input[key]&&!a.held[key]||(input.taps?.[key]||0)>(a.taps[key]||0);a.held[key]=!!input[key];a.taps[key]=input.taps?.[key]||0;}
    const norm=Math.max(1,Math.hypot(input.x||0,input.y||0)),x=(input.x||0)/norm,y=(input.y||0)/norm;if(x)p.facing=Math.sign(x);
    if(a.elapsed>=a.poseUntil)a.pose=x||y?Math.floor(a.elapsed*9)%2:0;
    if(a.branch===2){
      const moving=!!(x||y),trick=a.elapsed<(a.trickUntil||0);
      if(moving){a.moveX=x;a.moveY=y;a.speed=a.rank>=4?Math.min(a.rank===6?980:650,a.speed+175*dt):330;}
      else if(!(a.rank>=5&&trick))a.speed=330;
      const dx=moving?x:a.rank>=5&&trick?a.moveX||p.facing:0,dy=moving?y:a.rank>=5&&trick?a.moveY||0:0,old={x:p.x,y:p.y};
      p.x=clamp(p.x+dx*a.speed*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+dy*a.speed*.65*dt,FLOOR.top,FLOOR.bottom);
      const delay=a.rank===6?.23:.55;
      if((fresh.punch||input.punch)&&a.rank>=2&&a.elapsed>=a.nextAttack){this.kikorStrike(p,175,1.5);a.nextAttack=a.elapsed+delay;a.trickUntil=a.elapsed+.35;pose(a,3,.35);if(a.rank<5)a.speed=330;}
      if(fresh.jump&&a.rank>=3&&a.elapsed>=a.nextJump&&!a.hop){a.hop={age:0};a.nextJump=a.elapsed+(a.rank===6?.55:1);a.trickUntil=a.elapsed+.6;if(a.rank<5)a.speed=330;}
      if((fresh.kick||fresh.dodge)&&a.elapsed>=a.nextHeavy){this.kikorStrike(p,160,1.2,true);a.nextHeavy=a.elapsed+delay;a.trickUntil=a.elapsed+.35;pose(a,6,.35);this.kikorFX(p.x,p.y,15);if(a.rank<5)a.speed=330;}
      if(a.hop){a.hop.age+=dt;p.z=Math.sin(Math.min(1,a.hop.age/.55)*Math.PI)*100;pose(a,4,.05);if(a.hop.age>=.55){a.hop=null;p.z=0;this.kikorStrike(p,a.rank===6?235:180,2.1,true);pose(a,5);this.kikorFX(p.x,p.y,15);}}
      if((dx||dy)&&p.z<30)for(const e of this.state.enemies){const vx=p.x-old.x,vy=(p.y-old.y)*1.5,t=clamp(((e.x-old.x)*vx+(e.y-old.y)*1.5*vy)/(vx*vx+vy*vy||1),0,1);
        if(a.elapsed<(a.hits[e.id]||0)||Math.hypot(e.x-old.x-vx*t,(e.y-old.y)*1.5-vy*t)>90)continue;
        if(this.kikorHit(p,e,a.rank===6?1.8:1.1)){a.hits[e.id]=a.elapsed+.7;if(!e.boss&&!e.vehicle){e.vx=p.facing*500;e.stun=Math.max(e.stun,.4);}}
      }
      return;
    }
    p.x=clamp(p.x+x*p.speed*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+y*p.speed*.7*dt,FLOOR.top,FLOOR.bottom);p.z=0;
    if(fresh.dodge&&a.elapsed>=(a.nextDodge||0)){a.nextDodge=a.elapsed+.8;p.invincible=Math.max(p.invincible,.2);p.x=clamp(p.x+(x||p.facing)*75,FLOOR.left,FLOOR.right);}
    if(a.branch===0){
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack){this.kikorStrike(p,175,1);this.kikorPaint(p,p.x+p.facing*90,p.y);this.kikorFX(p.x+p.facing*75,p.y-65,2);pose(a,3);a.nextAttack=a.elapsed+.3;}
      if(fresh.kick&&a.rank>=2&&a.elapsed>=a.nextHeavy){this.kikorPaintPot(p);a.nextHeavy=a.elapsed+.6;}
      a.charge=input.kick?a.charge+dt:0;if(a.rank>=3&&a.charge>=.5&&a.elapsed>=a.nextDraw){this.drawKikorCreature(p);a.nextDraw=a.elapsed+1;a.charge=0;}
      if(a.rank===6&&a.elapsed>=a.nextAuto){a.nextAuto=a.elapsed+.65;this.drawKikorCreature(p,true);pose(a,7);}
    }else{
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack){this.spawnKikorMinion(p);a.nextAttack=a.elapsed+.5;}
      if(fresh.kick&&a.elapsed>=a.nextHeavy){a.nextHeavy=a.elapsed+.35;if(a.rank>=3){a.role=(a.role+1)%3;for(const m of this.state.allies)if(m.kikorSummon&&m.owner===p.id)m.role=a.role;pose(a,4);this.event('opening',{x:p.x,y:p.y-160,label:['BAGARREURS','LANCEURS','PROTECTEURS'][a.role]});}else{this.kikorStrike(p,135,1);pose(a,4);}}
      if(a.rank>=4&&a.elapsed>=a.nextAuto){a.nextAuto=a.elapsed+(a.rank===6?.5:2);this.spawnKikorMinion(p);}
    }
  },
  updateKikorWorld(dt){
    const s=this.state;
    s.kikorPaintZones=(s.kikorPaintZones||[]).filter(z=>z.until>s.time);
    for(const z of s.kikorPaintZones)for(const e of s.enemies)if(targetable(e)&&distance(z,e)<z.radius)e.kikorPaintUntil=s.time+.2;
    s.kikorPots=(s.kikorPots||[]).filter(shot=>{
      shot.age+=dt;if(shot.age<.35)return true;const p=s.players.find(p=>p.id===shot.owner&&p.hp>0);if(!p)return false;
      for(const e of s.enemies)if(targetable(e)&&e.invincible<=0&&distance(shot,e)<(shot.rank>=4?170:125))this.damage(e,shot.power*1.6,p,true);
      (s.kikorPaintZones||=[]).push({id:this.nextId++,owner:p.id,x:shot.x,y:shot.y,radius:shot.rank>=4?125:75,until:s.time+(shot.rank>=4?4.5:2.2)});this.kikorFX(shot.x,shot.y,3);return false;
    });
    s.kikorDrawings=(s.kikorDrawings||[]).filter(d=>d.until>s.time&&s.players.some(p=>p.id===d.owner&&p.hp>0));
    for(const d of s.kikorDrawings){d.age+=dt;const p=s.players.find(p=>p.id===d.owner),e=s.enemies.filter(targetable).sort((e,f)=>distance(d,e)-distance(d,f))[0];if(!e||d.age<.35)continue;
      const range=d.variant===1?420:85,dist=distance(d,e);if(dist>range){d.x=clamp(d.x+(e.x-d.x)/dist*430*dt,FLOOR.left,FLOOR.right);d.y=clamp(d.y+(e.y-d.y)/dist*300*dt,FLOOR.top,FLOOR.bottom);}
      else if(s.time>=d.nextAttack&&!d.attacked){d.nextAttack=s.time+.7;d.strikeUntil=s.time+.25;
        if(d.variant===2){for(const foe of s.enemies)if(targetable(foe)&&foe.invincible<=0&&distance(d,foe)<160)this.damage(foe,d.power*1.2,p,true);}
        else if(e.invincible<=0){this.damage(e,d.power*(d.variant===0?1.6:1),p,true);if(d.variant===1)this.kikorFX(e.x,e.y-65,6);}
        if(!d.army){d.attacked=true;d.until=s.time+.25;}
      }
    }
    for(const m of s.allies)if(m.kikorSummon){
      const p=s.players.find(p=>p.id===m.owner&&p.hp>0),a=p?.specialState;if(!p||!a?.transformation||a.kind!=='kikor'||a.branch!==1||m.hp<=0||m.until<=s.time){m.ttl=0;continue;}
      m.ttl=1;m.cooldown-=dt;m.emerging=Math.max(0,m.emerging-dt);m.striking=Math.max(0,(m.striking||0)-dt);m.actionTime+=dt;if(m.emerging>0)continue;
      const e=s.enemies.filter(targetable).sort((e,f)=>distance(m,e)-distance(m,f))[0],target=m.role===2?p:e||p,dist=distance(m,target),range=m.role===1?360:m.role===2?65:70;
      m.facing=Math.sign(target.x-m.x)||m.facing;
      if(dist>range){m.x=clamp(m.x+(target.x-m.x)/Math.max(1,dist)*265*dt,FLOOR.left,FLOOR.right);m.y=clamp(m.y+(target.y-m.y)/Math.max(1,dist)*190*dt,FLOOR.top,FLOOR.bottom);m.action='walk';}
      else if(e&&distance(m,e)<(m.role===1?420:105)&&m.cooldown<=0){m.cooldown=m.role===1?.85:.55;m.action='punch';m.striking=.25;m.actionTime=0;if(e.invincible<=0){e.kikorParticipants||={};e.kikorParticipants[m.id]=s.time;this.damage(e,m.power,p,false);if(m.role===1)this.kikorFX(e.x,e.y-65,6);}}
      else if(m.striking<=0)m.action=m.role===2?'special':'idle';
    }
  },
};
