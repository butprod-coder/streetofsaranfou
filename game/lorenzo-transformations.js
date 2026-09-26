import { FLOOR, clamp } from './data.js';
import { HEAVY_ENEMIES } from './weapons.js';
import { lorenzoSelection } from './lorenzo-talents.js';
const near=(a,b,r)=>b.hp>0&&Math.hypot(a.x-b.x,(a.y-b.y)*1.5)<r;
const light=e=>!e.boss&&!e.vehicle&&!e.elite&&!HEAVY_ENEMIES.has(e.kind)&&!e.grabbedBy&&!e.thrown&&!e.joCargo;
const names=['CHIMÈRE','PIGEON','CRÂNE D’ACIER'];
const pose=(a,n,ttl=.25)=>{a.pose=n;a.poseUntil=a.elapsed+ttl;};
export const lorenzoTransformations={
  beginLorenzo(p){
    const {branch,rank}=lorenzoSelection(p);if(branch<0)return false;
    this.releaseGrab(p);p.energy-=100;p.attack=null;p.cooldown=p.specialCd=0;p.vx=p.vy=p.vz=0;p.z=branch===1?85:0;
    p.specialState={kind:'lorenzo',transformation:true,branch,rank,ultimate:rank===6,duration:rank===6?9:rank>=4?7:5,elapsed:0,pose:0,poseUntil:0,nextAttack:0,nextHeavy:0,nextDodge:0,nextJump:0,nextSwarm:0,charge:0,held:{},taps:{...p.taps},hits:{},carried:[]};
    p.action='special';p.invincible=Math.max(p.invincible,.4);
    if(branch===0){this.lorenzoCloud(p,p.x,p.y,rank>=4?170:100);if(rank===6)this.lorenzoCigarettes(p,36,true);}
    if(branch===1&&rank===6)this.lorenzoSwarm(p,null,6,9);
    this.event('special',{actor:p.id,kind:'blast',label:names[branch],x:p.x,y:p.y});return true;
  },
  lorenzoFX(x,y,cell){this.event('spectacle',{x,y,atlas:'lorenzoFX',cell});},
  lorenzoCloud(p,x,y,radius=85){
    const clouds=this.state.lorenzoClouds ||= [], a=p.specialState;
    clouds.push({id:this.nextId++,owner:p.id,x:clamp(x,FLOOR.left,FLOOR.right),y:clamp(y,FLOOR.top,FLOOR.bottom),radius,until:this.state.time+2.4,rank:a.rank,decoy:a.rank>=2,hp:2});
    if(clouds.length>24)clouds.shift();
  },
  lorenzoCigarettes(p,count,screen=false){
    const shots=this.state.lorenzoShots ||= [];
    for(let i=0;i<count;i++){
      const x=screen?FLOOR.left+55+(i%9)*(FLOOR.right-FLOOR.left-110)/8:p.x+p.facing*(105+Math.floor(i/3)*55);
      const y=screen?FLOOR.top+25+Math.floor(i/9)*(FLOOR.bottom-FLOOR.top-50)/3:p.y+(i%3-1)*60;
      shots.push({id:this.nextId++,owner:p.id,kind:'cigarette',fromX:p.x,fromY:p.y-85,x:clamp(x,FLOOR.left,FLOOR.right),y:clamp(y,FLOOR.top,FLOOR.bottom),age:0,flight:screen?.35+i*.035:.32,power:p.specialPower});
    }
    if(shots.length>90)shots.splice(0,shots.length-90);
  },
  lorenzoHit(p,e,power,heavy=true,push=0){
    if(e.hp<=0||e.invincible>0)return false;
    const before=e.hp,a=p.specialState;
    // Guard break opens normal combat guards; scripted invulnerable boss phases stay intact.
    if(a?.branch===2&&a.rank>=4){e.guardHits=5;e.guardLastHit=this.state.time;e.guarding=false;}
    this.damage(e,p.specialPower*power*(a?.rank===6?1.25:1),p,heavy);
    if(push&&e.hp>0&&!e.boss&&!e.vehicle){e.vx=(Math.sign(e.x-p.x)||p.facing)*push;e.stun=Math.max(e.stun,.45);}
    return e.hp<before;
  },
  lorenzoStrike(p,radius,power,radial=false,push=0){
    const hits=[];
    for(const e of this.state.enemies)if(near(p,e,radius)&&(radial||(e.x-p.x)*p.facing>=-25))if(this.lorenzoHit(p,e,power,true,push))hits.push(e);
    for(const prop of this.state.props)if(near(p,prop,radius))this.hitProp(prop,2,p);
    return hits;
  },
  lorenzoSwarm(p,target,count=3,ttl=1.6){
    const birds=this.state.lorenzoBirds ||= [];
    for(let i=0;i<count;i++)birds.push({id:this.nextId++,owner:p.id,target:target?.id||null,x:p.x+(i-count/2)*28,y:p.y,until:this.state.time+ttl,nextHit:this.state.time+.2+i*.08,orbit:i*2.1,permanent:ttl>3});
    if(birds.length>24)birds.splice(0,birds.length-24);
  },
  lorenzoDive(p,strong=false,skull=false){
    const a=p.specialState;
    const target=this.state.enemies.filter(e=>near(p,e,320)).sort((e,f)=>Math.hypot(e.x-p.x,e.y-p.y)-Math.hypot(f.x-p.x,f.y-p.y))[0];
    a.dive={age:0,duration:.34,fromX:p.x,fromY:p.y,toX:clamp(target?.x??p.x+p.facing*180,FLOOR.left,FLOOR.right),toY:target?.y??p.y,strong,skull};
    a.nextAttack=a.elapsed+.65;pose(a,5,.4);
  },
  releaseLorenzoCarry(p,impact=false){
    for(const e of this.state.enemies)if(e.lorenzoCarry?.owner===p.id){
      e.lorenzoCarry=null;e.z=0;e.vz=0;e.vx=p.facing*500;e.stun=Math.max(e.stun,.5);
      if(impact&&e.hp>0){this.lorenzoHit(p,e,2,true,550);for(const other of this.state.enemies)if(other!==e&&near(e,other,100))this.lorenzoHit(p,other,1,true,350);this.lorenzoFX(e.x,e.y,15);}
    }
    if(p.specialState)p.specialState.carried=[];
  },
  endLorenzo(p){
    this.releaseLorenzoCarry(p,false);p.z=p.vz=0;
    this.state.lorenzoBirds=(this.state.lorenzoBirds||[]).filter(b=>b.owner!==p.id);
  },
  updateLorenzoTransformation(p,input,dt){
    const a=p.specialState;a.elapsed+=dt;p.action='special';p.attack=null;p.vx=p.vy=p.vz=0;
    if(a.elapsed>=a.duration){this.endSpecial(p);p.action='idle';p.cooldown=0;return;}
    const fresh={};
    for(const key of ['punch','kick','jump','dodge']){fresh[key]=!!input[key]&&!a.held[key]||(input.taps?.[key]||0)>(a.taps[key]||0);a.held[key]=!!input[key];a.taps[key]=input.taps?.[key]||0;}
    const norm=Math.max(1,Math.hypot(input.x||0,input.y||0)),x=(input.x||0)/norm,y=(input.y||0)/norm;
    if(x)p.facing=Math.sign(x);
    a.moving=!!(x||y);if(a.elapsed>=a.poseUntil)a.pose=a.moving?Math.floor(a.elapsed*8)%2:0;
    if(a.dive){
      const d=a.dive;d.age+=dt;const t=Math.min(1,d.age/d.duration);
      p.x=d.fromX+(d.toX-d.fromX)*t;p.y=d.fromY+(d.toY-d.fromY)*t;p.z=(d.skull?110:85)*(1-t);pose(a,5,.05);
      if(t>=1){
        const hits=this.lorenzoStrike(p,d.strong?170:125,d.strong?2.5:1.4,true,d.strong?800:380);this.lorenzoFX(p.x,p.y,14);a.dive=null;
        if(d.skull){a.reboundUntil=a.elapsed+.45;a.nextJump=a.elapsed;p.z=85;pose(a,6,.4);}
        else {p.z=85;if(hits.length&&a.rank>=5){if(a.rank===6){for(const b of this.state.lorenzoBirds||[])if(b.owner===p.id){b.target=hits[0].id;b.nextHit=this.state.time;}}else this.lorenzoSwarm(p,hits[0]);}}
      }
      return;
    }
    const rolling=a.branch===2&&a.rank===6&&input.kick;
    const charging=a.branch===2&&(rolling||a.elapsed<(a.chargeUntil||0));
    const speed=a.branch===1?370:a.branch===2&&charging?rolling?650:560:p.speed;
    const dx=charging&&!rolling?a.chargeX:x,dy=charging&&!rolling?a.chargeY:y;
    const old={x:p.x,y:p.y};p.x=clamp(p.x+dx*speed*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+dy*speed*.68*dt,FLOOR.top,FLOOR.bottom);
    p.z=a.branch===1?85:a.reboundUntil>a.elapsed?Math.sin((a.reboundUntil-a.elapsed)/.45*Math.PI)*85:0;
    if(fresh.dodge&&a.elapsed>=a.nextDodge){a.nextDodge=a.elapsed+.8;p.invincible=Math.max(p.invincible,.22);p.x=clamp(p.x+(x||p.facing)*85,FLOOR.left,FLOOR.right);p.y=clamp(p.y+y*60,FLOOR.top,FLOOR.bottom);}
    if(a.branch===0){
      if(a.rank>=4){let cloud=(this.state.lorenzoClouds||[]).find(c=>c.owner===p.id&&c.follow);if(!cloud){this.lorenzoCloud(p,p.x,p.y,175);cloud=this.state.lorenzoClouds.at(-1);cloud.follow=true;}cloud.x=p.x;cloud.y=p.y;cloud.until=this.state.time+.15;}
      if(a.elapsed>=a.nextAttack&&(input.punch||fresh.punch||a.rank<5&&(input.kick||fresh.kick))){
        const heavy=!!input.kick;this.lorenzoStrike(p,heavy?150:125,heavy?1.4:.85);this.lorenzoCloud(p,p.x+p.facing*65,p.y);a.nextAttack=a.elapsed+(heavy?.45:.3);pose(a,heavy?4:3);
      }
      if(a.rank>=5&&(fresh.kick||input.kick)&&a.elapsed>=a.nextHeavy){this.lorenzoCigarettes(p,3);a.nextHeavy=a.elapsed+1.1;pose(a,5,.35);}
      if(a.rank===6&&a.elapsed<.7)pose(a,7,.1);
    }else if(a.branch===1){
      if(fresh.punch&&a.rank>=2&&a.elapsed>=a.nextAttack){
        (this.state.lorenzoShots ||= []).push({id:this.nextId++,owner:p.id,kind:'dropping',fromX:p.x,fromY:p.y-p.z,x:p.x,y:p.y,age:0,flight:.3,power:p.specialPower});a.nextAttack=a.elapsed+.4;
      }
      if(input.punch&&a.rank>=3){a.charge+=dt;if(a.charge>=.4&&!a.dive&&a.elapsed>=a.nextAttack){this.lorenzoDive(p,true);a.charge=0;}}
      else a.charge=0;
      if(fresh.kick&&a.elapsed>=a.nextAttack)this.lorenzoDive(p,false);
      if(fresh.jump&&a.rank>=4&&a.elapsed>=a.nextJump){
        const e=this.state.enemies.find(e=>light(e)&&near(p,e,110)&&!e.lorenzoCarry);
        if(e){e.attack=null;e.pattern=null;e.lorenzoCarry={owner:p.id,dropAt:this.state.time+.85,flight:true};a.nextJump=a.elapsed+1.5;pose(a,6,.85);}
      }
      if(this.state.enemies.some(e=>e.lorenzoCarry?.owner===p.id)){p.z=115;pose(a,6,.1);}
    }else{
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack&&!charging){this.lorenzoStrike(p,145,1.4,false,340);a.nextAttack=a.elapsed+.32;pose(a,3);this.lorenzoFX(p.x+p.facing*65,p.y-95,12);}
      if(fresh.kick&&a.rank>=2&&a.rank<6&&a.elapsed>=a.nextHeavy){a.chargeUntil=a.elapsed+.55;a.chargeX=x||y?x:p.facing;a.chargeY=y;a.nextHeavy=a.elapsed+.9;a.hits={};}
      if(fresh.jump&&a.rank>=3&&a.elapsed>=a.nextJump){a.nextJump=a.elapsed+.65;this.lorenzoDive(p,true,true);}
      if(charging){
        pose(a,rolling?7:4,.1);p.invincible=Math.max(p.invincible,.06);
        for(const e of this.state.enemies){
          const vx=p.x-old.x,vy=(p.y-old.y)*1.5,t=clamp(((e.x-old.x)*vx+(e.y-old.y)*1.5*vy)/(vx*vx+vy*vy||1),0,1);
          if(e.hp<=0||Math.hypot(e.x-old.x-vx*t,(e.y-old.y)*1.5-vy*t)>100||a.elapsed<(a.hits[e.id]||0)||e.lorenzoCarry)continue;
          a.hits[e.id]=a.elapsed+.7;if(this.lorenzoHit(p,e,rolling?2.2:1.6,true,500)&&a.rank>=5&&light(e)&&e.hp>0){e.lorenzoCarry={owner:p.id,flight:false,dropAt:this.state.time+.5};a.carried.push(e.id);}
        }
      }else if(a.carried.length)this.releaseLorenzoCarry(p,true);
      if(a.rank>=4)this.reflectLorenzoProjectiles(p);
    }
  },
  reflectLorenzoProjectiles(p){
    const reflectable=['bullet','tennis','magicCard','pencil','card','paint','bills'];
    for(const h of this.state.hazards)if(h.enemy&&h.delay<=0&&h.ttl>0&&reflectable.includes(h.kind)&&(h.vx||h.vy)&&Math.hypot(h.x-p.x,(h.y-p.y)*1.5)<110&&(h.x-p.x)*p.facing>=-20){
      h.enemy=false;h.bossOwner=false;h.both=false;h.owner=p.id;h.vx=-h.vx;h.vy=-h.vy;h.facing=p.facing;h.hits={};this.lorenzoFX(h.x,h.y-65,13);
    }
  },
  updateLorenzoEnemy(e,dt){
    if(e.hp<=0)return false;
    const carry=e.lorenzoCarry;
    if(carry){
      const p=this.state.players.find(p=>p.id===carry.owner&&p.hp>0&&p.specialState?.kind==='lorenzo');
      if(!p){e.lorenzoCarry=null;e.z=e.vz=0;return false;}
      e.attack=null;e.pattern=null;this.tickActor(e,dt);e.vx=e.vy=e.vz=0;e.x=clamp(p.x+p.facing*45,FLOOR.left,FLOOR.right);e.y=clamp(p.y+(carry.flight?0:(e.id%3-1)*23),FLOOR.top,FLOOR.bottom);e.z=carry.flight?Math.max(20,p.z-30):0;e.action='hurt';
      if(this.state.time>=carry.dropAt){this.releaseLorenzoCarry(p,true);}return true;
    }
    const confusion=e.lorenzoConfused;
    if(!confusion||confusion.until<=this.state.time){e.lorenzoConfused=null;return false;}
    e.attack=null;e.pattern=null;this.tickActor(e,dt);
    const cloud=(this.state.lorenzoClouds||[]).find(c=>c.id===confusion.cloud&&c.until>this.state.time&&c.hp>0);
    const victim=confusion.rank>=3&&e.id%2===0?this.state.enemies.find(other=>other!==e&&!other.lorenzoCarry&&near(e,other,260)):null;
    const target=victim||(cloud?.decoy?cloud:null);
    if(target){
      e.targetX=target.x;e.targetY=target.y;e.lorenzoTarget=victim?target.id:`illusion:${target.id}`;
      const dx=target.x-e.x,dy=target.y-e.y,norm=Math.max(1,Math.hypot(dx,dy));e.facing=Math.sign(dx)||e.facing;
      if(Math.hypot(dx,dy*1.5)>65){e.x=clamp(e.x+dx/norm*e.speed*.6*dt,FLOOR.left,FLOOR.right);e.y=clamp(e.y+dy/norm*e.speed*.45*dt,FLOOR.top,FLOOR.bottom);e.action='walk';}
      else if(this.state.time>=(confusion.nextAttack||0)){
        confusion.nextAttack=this.state.time+.8;e.action='punch';e.actionTime=0;
        if(victim){const owner=this.state.players.find(p=>p.id===confusion.owner);if(owner)this.damage(victim,Math.max(6,e.power*.8),owner,true);}
        else {cloud.hp--;this.lorenzoFX(cloud.x,cloud.y-55,0);}
      }
    }else{e.lorenzoTarget=null;e.x=clamp(e.x+Math.sin(this.state.time*5+e.id)*e.speed*.25*dt,FLOOR.left,FLOOR.right);e.facing=Math.sin(this.state.time*4+e.id)>0?1:-1;e.action='walk';}
    return true;
  },
  updateLorenzoWorld(dt){
    const s=this.state,now=s.time;
    s.lorenzoClouds=(s.lorenzoClouds||[]).filter(c=>c.until>now);
    for(const c of s.lorenzoClouds)for(const e of s.enemies)if(!e.boss&&!e.vehicle&&!e.lorenzoCarry&&near(c,e,c.radius)){
      const old=e.lorenzoConfused;e.lorenzoConfused={owner:c.owner,cloud:c.id,rank:c.rank,until:now+.65,nextAttack:old?.nextAttack||0};
    }
    s.lorenzoShots=(s.lorenzoShots||[]).filter(shot=>{
      shot.age+=dt;if(shot.age<shot.flight)return true;
      const p=s.players.find(p=>p.id===shot.owner&&p.hp>0);if(!p)return false;
      if(shot.kind==='cigarette'){
        this.hazard(p,{kind:'fire',x:shot.x,y:shot.y,delay:0,ttl:2.2,radius:shot.power?48:40,pulse:.65,damage:shot.power*.45,ignitionDamage:shot.power*.7,lorenzoCigarette:true});this.lorenzoFX(shot.x,shot.y,5);
      }else{for(const e of s.enemies)if(near(shot,e,70))this.lorenzoHit(p,e,1.1,false);this.lorenzoFX(shot.x,shot.y,10);}
      return false;
    });
    s.lorenzoBirds=(s.lorenzoBirds||[]).filter(b=>b.until>now&&s.players.some(p=>p.id===b.owner&&p.hp>0&&p.specialState?.kind==='lorenzo'));
    for(const b of s.lorenzoBirds){
      const p=s.players.find(p=>p.id===b.owner),target=s.enemies.find(e=>e.id===b.target&&e.hp>0)||s.enemies.find(e=>near(p,e,250));
      const anchor=target||p;b.x=anchor.x+Math.cos(now*7+b.orbit)*55;b.y=anchor.y+Math.sin(now*7+b.orbit)*22;
      if(target&&now>=b.nextHit){this.lorenzoHit(p,target,.22,false);b.nextHit=now+.65;}
    }
  },
};
