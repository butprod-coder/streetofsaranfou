import { FLOOR, clamp } from './data.js';
import { yanuSelection } from './yanu-talents.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const pose=(a,n,ttl=.25)=>{a.pose=n;a.poseUntil=a.elapsed+ttl;};
export const yanuTransformations={
  beginYanuTransformation(p){
    const {branch,rank}=yanuSelection(p);if(branch<0)return false;
    this.releaseGrab(p);p.energy-=100;p.attack=null;p.cooldown=p.specialCd=0;p.vx=p.vy=p.vz=p.z=0;
    p.specialState={kind:'yanu',transformation:true,branch,rank,ultimate:rank===6,duration:rank===6?9:rank>=4?7:5,elapsed:0,pose:0,poseUntil:0,nextAttack:0,nextLeap:0,nextPlant:0,nextTile:0,nextHeavy:0,nextBeat:0,beat:0,combo:0,lastHit:-10,frenzy:[],visited:[],held:{},taps:{...p.taps}};
    p.action='special';p.invincible=Math.max(p.invincible,.4);
    if(branch===2)this.plantYanu(p,p.x+p.facing*75,p.y);
    this.event('special',{actor:p.id,kind:'blast',label:['BÊTE SAUVAGE','SOIRÉE FLUO','JARDINIER CARNIVORE'][branch],x:p.x,y:p.y});return true;
  },
  endYanuTransformation(p){p.z=p.vz=0;},
  yanuFX(x,y,cell){this.event('spectacle',{x,y,atlas:'yanuFX',cell});},
  yanuTransformationKill(p){const a=p?.specialState;if(a?.transformation&&a.kind==='yanu'&&a.branch===0&&a.rank>=4){a.frenzy.push(a.elapsed+2.5);if(a.frenzy.length>5)a.frenzy.shift();}},
  yanuHit(p,e,power,heavy=true){
    if(e.hp<=0||e.invincible>0)return false;const hp=e.hp;this.damage(e,p.specialPower*power*(p.specialState?.rank===6?1.25:1),p,heavy);return e.hp<hp;
  },
  yanuStrike(p,radius,power,radial=false){
    const hits=[];for(const e of this.state.enemies)if(distance(p,e)<radius&&(radial||(e.x-p.x)*p.facing>=-25)&&this.yanuHit(p,e,power))hits.push(e);
    for(const prop of this.state.props)if(prop.hp>0&&distance(p,prop)<radius)this.hitProp(prop,2,p);return hits;
  },
  leapYanu(p,automatic=false){
    const a=p.specialState,range=a.rank===6?690:330;
    if(a.leap||a.elapsed<a.nextLeap)return false;
    const targets=this.state.enemies.filter(e=>e.hp>0&&!e.lorenzoCarry&&distance(p,e)<range&&(!automatic||!a.visited.includes(e.id))).sort((e,f)=>distance(p,e)-distance(p,f));
    let target=targets.find(e=>e.id!==a.lastTarget)||targets[0];if(!target)return false;
    if(!automatic)a.visited=[];a.visited.push(target.id);a.lastTarget=target.id;
    a.leap={age:0,duration:a.rank===6?.22:.34,fromX:p.x,fromY:p.y,x:target.x,y:target.y,target:target.id};a.nextLeap=a.elapsed+.9;pose(a,3,.4);return true;
  },
  plantYanu(p,x,y,reproduction=false,rank=p.specialState?.rank){
    const plants=this.state.yanuPlants||=[],owned=plants.filter(t=>t.owner===p.id&&t.until>this.state.time);
    const cap=rank===6?12:reproduction&&rank>=5?6:rank>=3?2:1;
    if(owned.length>=cap)return false;
    plants.push({id:this.nextId++,owner:p.id,x:clamp(x,FLOOR.left+15,FLOOR.right-15),y:clamp(y,FLOOR.top+10,FLOOR.bottom-10),rank,bites:0,giant:false,until:this.state.time+6,nextBite:this.state.time+.25,biteUntil:0,power:p.specialPower});return true;
  },
  yanuPulse(p,radius=170,power=.65){
    const hits=this.yanuStrike(p,radius,power,true);for(const e of hits)e.stun=Math.max(e.stun,e.boss?.1:.55);
    this.yanuFX(p.x,p.y-45,2);return hits;
  },
  updateYanuTransformation(p,input,dt){
    const a=p.specialState;a.elapsed+=dt;p.action='special';p.vx=p.vy=p.vz=0;
    if(p.hp<=0||a.elapsed>=a.duration){this.endSpecial(p);return;}
    const fresh={};for(const key of ['punch','kick','jump','dodge']){fresh[key]=!!input[key]&&!a.held[key]||(input.taps?.[key]||0)>(a.taps[key]||0);a.held[key]=!!input[key];a.taps[key]=input.taps?.[key]||0;}
    const norm=Math.max(1,Math.hypot(input.x||0,input.y||0)),x=(input.x||0)/norm,y=(input.y||0)/norm;
    if(x)p.facing=Math.sign(x);if(a.elapsed>=a.poseUntil)a.pose=x||y?Math.floor(a.elapsed*10)%2:0;
    a.frenzy=a.frenzy.filter(t=>t>a.elapsed);const rate=1+a.frenzy.length*.18;
    if(a.branch===0&&a.leap){
      const l=a.leap;l.age+=dt;const t=Math.min(1,l.age/l.duration);p.x=l.fromX+(l.x-l.fromX)*t;p.y=l.fromY+(l.y-l.fromY)*t;p.z=Math.sin(t*Math.PI)*(a.rank===6?110:85);p.invincible=Math.max(p.invincible,.05);pose(a,3,.05);
      if(t>=1){p.z=0;a.leap=null;const hits=this.yanuStrike(p,125,1.5,true);pose(a,6);this.yanuFX(p.x,p.y,0);
        if(a.rank>=2){a.claws=3;a.nextClaw=a.elapsed+.05;}
        const down=hits.some(e=>!e.boss&&!e.vehicle);if(down&&a.rank>=3)a.nextLeap=a.elapsed;
        if(a.rank>=5){a.nextLeap=a.elapsed+(a.rank===6?.06:.18);a.autoLeap=true;}
      }
      return;
    }
    const speed=a.branch===0?(a.rank===6?440:315):p.speed;
    p.x=clamp(p.x+x*speed*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+y*speed*.7*dt,FLOOR.top,FLOOR.bottom);p.z=0;
    if(fresh.dodge&&a.elapsed>=(a.nextDodge||0)){p.x=clamp(p.x+(x||p.facing)*70,FLOOR.left,FLOOR.right);p.y=clamp(p.y+y*55,FLOOR.top,FLOOR.bottom);p.invincible=Math.max(p.invincible,.2);a.nextDodge=a.elapsed+.8;}
    if(a.branch===0){
      if(a.claws&&a.elapsed>=a.nextClaw){this.yanuStrike(p,155,.65);pose(a,a.claws%2?4:5,.15);a.claws--;a.nextClaw=a.elapsed+.1/rate;}
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextAttack){if(a.rank>=2){a.claws=3;a.nextClaw=a.elapsed;}else{this.yanuStrike(p,140,1);pose(a,4);}a.nextAttack=a.elapsed+.45/rate;}
      if((fresh.kick||fresh.jump)&&!a.leap)this.leapYanu(p);
      else if(a.autoLeap&&a.elapsed>=a.nextLeap){a.autoLeap=false;this.leapYanu(p,true);}
    }else if(a.branch===1){
      if(a.elapsed-a.lastHit>1.4)a.combo=0;
      const period=a.rank>=5?Math.max(.25,.5-a.combo*.025):.5;a.beatPeriod=period;
      const punch=(fresh.punch||input.punch)&&a.elapsed>=a.nextAttack,kick=(fresh.kick||input.kick)&&a.elapsed>=a.nextHeavy;
      if(a.rank===6){if(punch||kick)a.queued=kick?'kick':'punch';}
      else if(punch||kick)this.yanuFluoAttack(p,kick);
      if(a.rank>=3&&(x||y)&&a.elapsed>=a.nextTile){a.nextTile=a.elapsed+.17;const tiles=this.state.yanuTiles||=[];tiles.push({id:this.nextId++,owner:p.id,x:p.x,y:p.y,until:this.state.time+1.8});if(tiles.length>72)tiles.shift();}
      if(a.elapsed>=a.nextBeat){a.beat++;a.nextBeat=a.elapsed+period;a.lastBeat=a.elapsed;
        if(a.rank===6){this.event('yanuBeat',{actor:p.id,beat:a.beat});if(a.queued){this.yanuFluoAttack(p,a.queued==='kick');a.queued=null;}}
        if(a.rank>=4)this.yanuPulse(p,a.rank===6?2000:175,a.rank===6?.28:.4);
        for(const tile of this.state.yanuTiles||[])if(tile.owner===p.id&&tile.until>this.state.time){tile.pulseUntil=this.state.time+.15;for(const e of this.state.enemies)if(distance(tile,e)<65)this.yanuHit(p,e,.35);}
      }
    }else{
      if((fresh.punch||input.punch)&&a.elapsed>=a.nextPlant){this.plantYanu(p,p.x+p.facing*85,p.y);pose(a,2);a.nextPlant=a.elapsed+.3;}
      if((fresh.kick||input.kick)&&a.elapsed>=a.nextHeavy){this.yanuStrike(p,220,1.1);pose(a,5);a.nextHeavy=a.elapsed+.45;}
      if(a.rank===6&&a.elapsed>=(a.nextGrowth||0)){a.nextGrowth=a.elapsed+.6;const i=a.growthCount||0;a.growthCount=i+1;const angle=i*2.4,radius=75+Math.min(400,i*35);this.plantYanu(p,p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius*.32,true);pose(a,6);}
    }
  },
  yanuFluoAttack(p,kick){
    const a=p.specialState,hits=this.yanuStrike(p,kick?165:135,kick?1.25:.85);
    for(const e of hits)e.stun=Math.max(e.stun,e.boss?.1:kick?.65:.35);
    if(hits.length){a.combo++;a.lastHit=a.elapsed;if(a.rank>=2&&a.combo%3===0)this.yanuPulse(p);}
    if(kick)a.nextHeavy=a.elapsed+.45;else a.nextAttack=a.elapsed+.27;pose(a,kick?5:3);this.yanuFX(p.x+p.facing*65,p.y-80,1);
  },
  updateYanuWorld(dt){
    const s=this.state;s.yanuTiles=(s.yanuTiles||[]).filter(t=>t.until>s.time&&s.players.some(p=>p.id===t.owner&&p.hp>0));
    s.yanuPlants=(s.yanuPlants||[]).filter(t=>t.until>s.time&&s.players.some(p=>p.id===t.owner&&p.hp>0));
    for(const plant of [...s.yanuPlants]){
      if(s.time<plant.nextBite)continue;
      const p=s.players.find(p=>p.id===plant.owner),radius=plant.giant?190:105;
      const targets=s.enemies.filter(e=>e.hp>0&&!e.lorenzoCarry&&distance(plant,e)<radius).sort((e,f)=>distance(plant,e)-distance(plant,f));
      const e=targets[0];if(!e)continue;plant.nextBite=s.time+(plant.giant?.5:.65);plant.biteUntil=s.time+.2;
      if(e.invincible>0)continue;
      const hp=e.hp;this.damage(e,plant.power*(plant.giant?1.5:.65),p,true);if(e.hp>=hp)continue;
      plant.bites++;if(plant.rank>=4&&plant.bites>=4)plant.giant=true;
      if(plant.rank>=2&&!e.boss&&!e.vehicle){e.yanuRoots={owner:p.id,until:s.time+(plant.giant?.65:.4)};e.vx=e.vy=0;this.yanuFX(e.x,e.y,12);}
      if(e.hp<=0&&plant.rank>=5)this.plantYanu(p,e.x+(plant.id%2?45:-45),e.y+25,true,plant.rank);
    }
  },
  updateYanuRoots(e,dt){
    if(e.hp<=0||e.boss||e.vehicle||!e.yanuRoots||e.yanuRoots.until<=this.state.time){e.yanuRoots=null;return false;}
    this.tickActor(e,dt);e.attack=null;e.pattern=null;e.vx=e.vy=e.vz=0;e.action='hurt';return true;
  },
};
