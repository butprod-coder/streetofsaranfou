import { FLOOR, clamp } from './data.js';
import { HEAVY_ENEMIES, WEAPONS } from './weapons.js';
import { joSelection } from './jo-talents.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const loadable=e=>e.hp>0&&!e.boss&&!e.vehicle&&!e.elite&&!HEAVY_ENEMIES.has(e.kind)&&!e.grabbedBy&&!e.thrown&&!e.lorenzoCarry&&!e.joCargo;
const pose=(a,n,ttl=.25)=>{a.pose=n;a.poseUntil=a.elapsed+ttl;};
const swept=(from,to,e,radius)=>{const x=to.x-from.x,y=(to.y-from.y)*1.5,t=clamp(((e.x-from.x)*x+(e.y-from.y)*1.5*y)/(x*x+y*y||1),0,1);return Math.hypot(e.x-from.x-x*t,(e.y-from.y)*1.5-y*t)<radius;};
export const joTransformations={
  beginJoTransformation(p){
    const {branch,rank}=joSelection(p);if(branch<0)return false;
    this.releaseGrab(p);p.energy-=100;p.attack=null;p.cooldown=p.specialCd=0;p.vx=p.vy=p.vz=p.z=0;
    p.specialState={kind:'jo',transformation:true,branch,rank,ultimate:rank===6,duration:rank===6?9:rank>=4?7:5,elapsed:0,pose:0,poseUntil:0,nextAttack:0,nextHeavy:0,nextDodge:0,nextTrail:0,speed:0,heat:rank===6?50:0,combo:0,charge:0,held:{},taps:{...p.taps},hits:{},cargo:[],chain:[]};
    p.action='special';p.invincible=Math.max(p.invincible,.4);this.event('special',{actor:p.id,kind:'blast',label:['TRANSPALETTE','ROUX INCANDESCENT','FOUINE'][branch],x:p.x,y:p.y});return true;
  },
  joFX(x,y,cell){this.event('spectacle',{x,y,atlas:'joFX',cell});},
  endJoTransformation(p){this.unloadJo(p,false);p.joInvisible=false;p.z=p.vz=0;},
  unloadJo(p,launch=true){
    const a=p.specialState;
    for(const e of this.state.enemies)if(e.joCargo?.owner===p.id){
      e.joCargo=null;e.z=0;e.vx=e.vy=0;e.stun=.5;
      if(launch&&p.hp>0){e.thrown={owner:p.id,heavy:false,elapsed:0,fromX:e.x,toX:a.rank===6?(p.facing>0?FLOOR.right:FLOOR.left):clamp(e.x+p.facing*(a.rank>=4?500:250),FLOOR.left,FLOOR.right),y:e.y,fromZ:60,hits:[]};this.joFX(e.x,e.y,2);}
    }
    if(a){a.cargo=[];pose(a,launch?6:5,.35);}
  },
  updateJoCargo(e,dt){
    if(!e.joCargo)return false;
    const p=this.state.players.find(p=>p.id===e.joCargo.owner&&p.hp>0&&p.specialState?.transformation&&p.specialState.kind==='jo'&&p.specialState.branch===0);
    if(!p||e.hp<=0){e.joCargo=null;e.z=e.vz=0;return false;}
    this.tickActor(e,dt);e.attack=null;e.pattern=null;e.vx=e.vy=e.vz=0;e.x=clamp(p.x+p.facing*80,FLOOR.left,FLOOR.right);e.y=p.y;e.z=45+e.joCargo.slot*26;e.action='hurt';return true;
  },
  joHit(p,e,power,heavy=true){if(e.hp<=0||e.invincible>0||e.joCargo)return false;const hp=e.hp;this.damage(e,p.specialPower*power*(p.specialState.rank===6?1.25:1),p,heavy);return e.hp<hp;},
  joStrike(p,radius,power,radial=false){const hits=[];for(const e of this.state.enemies)if(distance(p,e)<radius&&(radial||(e.x-p.x)*p.facing>=-25)&&this.joHit(p,e,power))hits.push(e);for(const prop of this.state.props)if(prop.hp>0&&distance(p,prop)<radius)this.hitProp(prop,2,p);return hits;},
  joFirePatch(p,x,y){
    const a=p.specialState,owned=this.state.hazards.filter(h=>h.joFire&&h.owner===p.id&&h.ttl>0);if(owned.length>=20)owned[0].ttl=0;
    this.hazard(p,{kind:'fire',joFire:true,x,y,radius:35+a.heat*.45,damage:p.specialPower*.4,delay:0,ttl:1.5,pulse:.65});
  },
  joExplosion(p){const a=p.specialState;this.joStrike(p,150+a.heat*.9,1.7,true);this.joFX(p.x,p.y-70,7);pose(a,7,.35);},
  joFireAttack(p,heavy=false){
    const a=p.specialState,hits=this.joStrike(p,heavy?165:135,heavy?1.3:.85);
    a.heat=Math.min(100,a.heat+(a.rank>=4?18:0));this.joFirePatch(p,p.x+p.facing*70,p.y);pose(a,heavy?5:3);
    if(hits.length){a.combo++;if(a.rank>=5&&a.heat>=99&&a.combo%3===0)this.joExplosion(p);}
    if(a.rank===6&&a.heat>=99&&heavy)this.joExplosion(p);
    a.nextAttack=a.elapsed+.28;a.nextHeavy=heavy?a.elapsed+.55:a.nextHeavy;
  },
  joBackstab(p,e){
    if(!e||e.hp<=0)return false;
    p.x=clamp(e.x-e.facing*65,FLOOR.left,FLOOR.right);p.y=e.y;p.facing=e.facing;p.joInvisible=false;p.specialState.dashUntil=p.specialState.elapsed;
    const hit=this.joHit(p,e,1.8,true);pose(p.specialState,5);this.joFX(e.x,e.y-75,11);
    if(hit&&p.specialState.rank>=3&&!e.joStolen){
      const weapon=e.weapon?.kind||(e.kind==='charlingals'?'knife':null);
      if(weapon&&Object.hasOwn(WEAPONS,weapon)){this.state.pickups.push({id:this.nextId++,kind:'weapon',weapon,uses:e.weapon?.uses||WEAPONS[weapon].uses,x:e.x,y:e.y});e.weapon=null;e.joStolen=true;e.joDisarmed=true;e.attack=null;e.pattern=null;this.joFX(e.x,e.y-110,12);}
    }
    return hit;
  },
  updateJoTransformation(p,input,dt){
    const a=p.specialState;a.elapsed+=dt;p.action='special';p.vx=p.vy=p.vz=p.z=0;
    if(p.hp<=0||a.elapsed>=a.duration){this.endSpecial(p);return;}
    const fresh={};for(const key of ['punch','kick','jump','dodge']){fresh[key]=!!input[key]&&!a.held[key]||(input.taps?.[key]||0)>(a.taps[key]||0);a.held[key]=!!input[key];a.taps[key]=input.taps?.[key]||0;}
    const norm=Math.max(1,Math.hypot(input.x||0,input.y||0)),x=(input.x||0)/norm,y=(input.y||0)/norm;
    if(x)p.facing=Math.sign(x);if(a.elapsed>=a.poseUntil)a.pose=x||y?Math.floor(a.elapsed*10)%2:0;
    const old={x:p.x,y:p.y};
    if(a.branch===0){
      if(fresh.punch&&a.rank>=4&&a.elapsed>=a.nextHeavy){a.boostUntil=a.elapsed+.65;a.nextHeavy=a.elapsed+1;this.joFX(p.x,p.y,0);}
      if(fresh.kick){a.speed=0;a.boostUntil=0;a.brakeUntil=a.elapsed+.25;this.unloadJo(p,true);}
      const boost=a.elapsed<(a.boostUntil||0),brake=a.elapsed<(a.brakeUntil||0),moving=!!(x||y||boost);
      a.speed=brake?0:Math.min(boost?(a.rank===6?1000:820):440,a.speed+(moving?1100:-1600)*dt);a.speed=Math.max(0,a.speed);
      p.x=clamp(p.x+(x||(boost&&!y?p.facing:0))*a.speed*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+y*a.speed*.7*dt,FLOOR.top,FLOOR.bottom);
      if(a.elapsed>=a.poseUntil)a.pose=boost?4:a.rank>=2?(moving?3:2):(moving?1:0);
      if(a.speed>50)for(const e of this.state.enemies){
        if(e.hp<=0||e.joCargo||a.elapsed<(a.hits[e.id]||0)||!swept(old,p,e,a.rank>=2?110:65))continue;
        a.hits[e.id]=a.elapsed+.8;if(!this.joHit(p,e,boost?1.8:1))continue;
        a.cargo=a.cargo.filter(id=>this.state.enemies.some(e=>e.id===id&&e.joCargo?.owner===p.id));
        const cap=a.rank===6?6:a.rank>=5?3:1;
        if(a.rank>=3&&loadable(e)&&a.cargo.length<cap){e.joCargo={owner:p.id,slot:a.cargo.length};a.cargo.push(e.id);e.attack=null;e.pattern=null;e.vx=e.vy=0;}
        else if(!e.boss&&!e.vehicle){e.vx=p.facing*450;e.stun=Math.max(e.stun,.45);}
      }
      return;
    }
    const dash=a.elapsed<(a.dashUntil||0),speed=dash?(a.branch===2?1050:670):p.speed;
    p.x=clamp(p.x+(dash?a.dashX:x)*speed*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+(dash?a.dashY:y)*speed*.7*dt,FLOOR.top,FLOOR.bottom);
    if(fresh.dodge&&a.elapsed>=a.nextDodge){a.dashUntil=a.elapsed+.22;a.dashX=x||y?x:p.facing;a.dashY=y;a.nextDodge=a.elapsed+.55;a.afterDash=a.elapsed+.6;a.crossed=null;
      if(a.branch===2&&a.rank===6){a.chain=this.state.enemies.filter(e=>e.hp>0&&!e.joCargo&&distance(p,e)<550).sort((e,f)=>distance(p,e)-distance(p,f)).slice(0,6).map(e=>e.id);a.nextChain=a.dashUntil;}
    }
    p.joInvisible=a.branch===2&&a.rank>=4&&(dash||a.chain.length>0);
    if(dash){p.invincible=Math.max(p.invincible,.06);pose(a,6,.05);
      if(a.branch===2)for(const e of this.state.enemies)if(e.hp>0&&swept(old,p,e,70))a.crossed=e.id;
      if(a.branch===1&&a.rank>=3&&a.elapsed>=a.nextTrail){a.nextTrail=a.elapsed+.08;this.joFirePatch(p,p.x,p.y);}
    }
    if(a.branch===1){
      a.heat=a.rank===6&&a.elapsed>=a.duration-3?100:Math.max(0,a.heat-dt*4);
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack)this.joFireAttack(p,false);
      if(a.rank>=2){a.charge=input.kick?a.charge+dt:0;if(input.kick&&a.charge<.45)pose(a,6,.05);
        if(a.charge>=.45&&a.elapsed>=a.nextHeavy){a.heat=Math.min(100,a.heat+(a.rank>=4?25:0));this.joExplosion(p);a.nextHeavy=a.elapsed+.9;a.charge=0;}
        if(fresh.kick&&a.elapsed>=a.nextHeavy)this.joFireAttack(p,true);
      }else if((fresh.kick||input.kick)&&a.elapsed>=a.nextHeavy)this.joFireAttack(p,true);
    }else{
      if(a.chain.length&&a.elapsed>=a.nextChain){const id=a.chain.shift(),e=this.state.enemies.find(e=>e.id===id&&e.hp>0);if(e)this.joBackstab(p,e);a.nextChain=a.elapsed+.16;p.invincible=Math.max(p.invincible,.2);}
      if((fresh.punch||fresh.kick||input.punch||input.kick)&&a.elapsed>=a.nextAttack){
        let target=a.rank>=2&&a.crossed?this.state.enemies.find(e=>e.id===a.crossed&&e.hp>0):null;
        if(a.rank>=5&&a.elapsed<a.afterDash)target=this.state.enemies.filter(e=>e.hp>0&&!e.joCargo&&distance(p,e)<340).sort((e,f)=>distance(p,e)-distance(p,f))[0]||target;
        if(target){this.joBackstab(p,target);a.crossed=null;a.afterDash=0;}else{this.joStrike(p,145,input.kick?1.2:.85);pose(a,input.kick?5:3);}
        a.nextAttack=a.elapsed+.3;
      }
    }
  },
};
