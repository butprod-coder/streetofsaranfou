import { FLOOR, clamp, fighter } from './data.js';
import { hasTalent as t, TALENTS } from './rogue-talents.js';
import { HEAVY_ENEMIES } from './weapons.js';
const near = (a,b,r) => Math.hypot(a.x-b.x,(a.y-b.y)*1.5) < r;
const light = e => !e.boss && !e.vehicle && !HEAVY_ENEMIES.has(e.kind);
const alive = e => e.hp > 0;
const active = (p,key,time) => (p[key] || 0) > time;
export const TALENT_RULES = { comboWindow: 1.6, preciseWindow: .18, ultimateDuration: 6, ultimateCooldown: 0, maxZones: 8, maxAllies: 3, maxBalls: 6, paintDelay: .6, maxExtension: 3 };

/** All talent decisions belong to the shared authoritative simulation. State is JSON-only. */
export const rogueCombat = {
  clearRogueTransient(p) {
    for (const key of Object.keys(p)) if (key.startsWith('rogue') && !['rogueTimers','rogueRewards'].includes(key)) delete p[key];
  },
  rogueReady(p,key,delay) {
    p.rogueTimers ||= {};
    if ((p.rogueTimers[key] || 0) > this.state.time) return false;
    p.rogueTimers[key] = this.state.time + delay; return true;
  },
  rogueFX(p,label,radius=100,visual='burst') {
    this.event('rogueFX',{owner:p.id,x:p.x,y:p.y,facing:p.facing,radius,label,visual,color:fighter(p.kind).color});
  },
  rogueDamage(p,e,power,heavy=true) {
    if (!alive(e) || e.invincible > 0) return false;
    this.rogueDepth=(this.rogueDepth||0)+1;
    try { this.damage(e,Math.round(p.power*power),p,heavy); } finally { this.rogueDepth--; }
    return true;
  },
  rogueBurst(p,x,y,radius,power,label='',color=fighter(p.kind).color) {
    const hits=[];
    for (const e of this.state.enemies) if (alive(e)&&near(e,{x,y},radius)&&this.rogueDamage(p,e,power)) hits.push(e);
    this.event('rogueFX',{owner:p.id,x,y,radius,label,color,visual:'burst'}); return hits;
  },
  rogueZone(p,x,y,kind,duration,radius=100,power=0,extra={}) {
    const zones=this.state.rogueZones ||= [];
    if (zones.filter(z=>z.owner===p.id).length>=TALENT_RULES.maxZones) zones.splice(zones.findIndex(z=>z.owner===p.id),1);
    const z={id:this.nextId++,owner:p.id,x:clamp(x,FLOOR.left,FLOOR.right),y:clamp(y,FLOOR.top,FLOOR.bottom),kind,ttl:duration,radius,power,next:0,...extra};
    zones.push(z);return z;
  },
  rogueSummon(p,kind,count,duration,power=.6) {
    const created=[];
    for(let i=0;i<Math.min(count,TALENT_RULES.maxAllies-this.state.allies.filter(a=>a.owner===p.id).length);i++) {
      created.push({...this.actor('creation',this.nextId++,false),owner:p.id,ally:true,rogueForm:kind,hp:20,maxHp:20,
        x:clamp(p.x+(i%2?-1:1)*65,FLOOR.left,FLOOR.right),y:clamp(p.y+(i%2?-45:45),FLOOR.top,FLOOR.bottom),
        ttl:duration,rogueExtended:0,power:Math.round(p.power*power),facing:p.facing,emerging:.15});
    }
    this.state.allies.push(...created);return created;
  },
  roguePush(p,e,speed=550,collision=false) {
    if(!alive(e)||!light(e)) return;
    e.vx=p.facing*speed; e.stun=Math.max(e.stun,.35);
    if(collision)e.rogueCollision={owner:p.id,ttl:.6,hits:[],dx:p.facing,power:.65};
  },
  rogueBurn(p,e,black=false,bleed=false) {
    e.rogueBurns ||= {};
    e.rogueBurns[p.id]={owner:p.id,time:3,next:.6,black,bleed};
  },
  roguePaint(p,e,explode=true) {
    if(!alive(e))return;
    e.roguePaint ||= {};
    const paint=e.roguePaint[p.id] ||= {stacks:0,until:0,next:0};
    paint.stacks=Math.min(3,paint.stacks+1);paint.until=this.state.time+5;e.rogueSlow=.8;
    if(explode&&paint.stacks>=3&&t(p,'Trop de couches')&&paint.next<=this.state.time&&!paint.detonateAt)paint.detonateAt=this.state.time+.18;
  },
  rogueDetonatePaint(p,e,paint) {
    paint.stacks=0;paint.detonateAt=0;paint.next=this.state.time+TALENT_RULES.paintDelay;
    this.rogueBurst(p,e.x,e.y,120,1.2,'TROP DE COUCHES','#b4ffbd');
    if(t(p,'Éclaboussures')) for(const other of this.state.enemies) if(other!==e&&near(e,other,130)) this.roguePaint(p,other,false);
  },
  roguePrey(p) {
    let target=this.state.enemies.find(e=>e.id===p.roguePrey&&alive(e));
    if(!target){target=this.state.enemies.filter(e=>alive(e)&&e.hp<e.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id)[0];p.roguePrey=target?.id;}
    return target;
  },
  rogueCoordinated(p,target) {
    if(!target)return;
    for(const a of this.state.allies.filter(a=>a.owner===p.id&&a.cooldown<=0)) {
      a.x=clamp(target.x-p.facing*55,FLOOR.left,FLOOR.right);a.y=clamp(target.y+(a.id%2?25:-25),FLOOR.top,FLOOR.bottom);
      a.action='punch';a.striking=.3;a.cooldown=.8;
      if(a.rogueForm==='masterpiece')this.rogueBurst(p,target.x,target.y,170,1.5,'CHEF-D’ŒUVRE');
      else this.rogueDamage(p,target,.55);
      if(t(p,'Retouche express')) {a.hp=a.maxHp;const add=Math.min(.5,3-(a.rogueExtended||0));a.ttl+=add;a.rogueExtended=(a.rogueExtended||0)+add;}
    }
    this.rogueFX(p,'ATTAQUE COORDONNÉE',140);
  },
  rogueOnKill(p,e) {
    if(!p||p.enemy)return;
    if(p.ally)p=this.state.players.find(a=>a.id===p.owner);
    if(!p?.progression)return;
    if(t(p,'Malédiction contagieuse')) {
      if(e.rogueCurses?.[p.id])for(const other of this.state.enemies.filter(a=>a!==e&&alive(a)&&near(e,a,150)).slice(0,3)) {other.rogueCurses ||= {};other.rogueCurses[p.id]=this.state.time+5;}
      if(e.rogueBurns?.[p.id]&&this.rogueReady(p,'harvest',2)){p.rogueEmpowered=this.state.time+3;this.rogueFX(p,'DETTE INFERNALE PRÊTE',100);}
    }
    if(t(p,'Feu de voisinage')&&e.rogueBurns?.[p.id])for(const other of this.state.enemies.filter(a=>a!==e&&alive(a)&&near(e,a,140)).slice(0,3))this.rogueBurn(p,other);
    if(t(p,'Ça ouvre l’appétit')&&p.attack?.rogueDouble&&this.rogueReady(p,'ration',5))this.state.pickups.push({id:this.nextId++,kind:'food',amount:8,x:e.x,y:e.y});
    if(t(p,'Frénésie lunaire')&&p.specialState?.kind==='yanu'){const a=p.specialState,add=Math.min(.5,3-(a.rogueAdded||0));a.duration+=add;a.rogueAdded=(a.rogueAdded||0)+add;}
    if(t(p,'Aucune échappatoire')&&e.id===p.roguePrey){p.roguePrey=null;this.roguePrey(p);p.rogueBond=this.state.time+2;}
  },
  rogueBeforeDamage(target,amount,source,heavy) {
    if(!target.enemy) {
      const now=this.state.time;
      target.rogueArmor=false;
      if(t(target,'Couenne épaisse')&&heavy&&(target.rogueLastHurt==null||now-target.rogueLastHurt>=4))target.rogueArmor=true;
      target.rogueLastHurt=now;
      if(active(target,'rogueFortress',now)){amount*=.3;target.rogueArmor=true;}
      for(const z of this.state.rogueZones||[])if(z.kind==='guard'&&z.ttl>0&&near(target,z,z.radius)){amount*=.6;break;}
      if(t(target,'Dette de douleur')||t(target,'Dette infernale'))target.rogueDebt=Math.min(target.power*2,(target.rogueDebt||0)+amount*.5);
    } else if(source?.progression&&!this.rogueDepth) {
      if(source.attack?.roguePower)amount*=source.attack.roguePower;
      if(t(source,'Dette infernale')&&heavy&&target.rogueCurses?.[source.id]>this.state.time){amount+=source.rogueDebt||0;source.rogueDebt=0;}
    }
    return Math.max(0,amount);
  },
  rogueOnHit(p,e,heavy) {
    if(!p?.progression||p.enemy||this.rogueDepth)return;
    const a=p.attack, now=this.state.time;
    // Pulses and projectiles can apply form effects, but cannot masquerade as a combo.
    if(p.specialState?.kind==='yanu'&&t(p,'Griffes profondes'))this.rogueBurn(p,e,false,true);
    if(!a)return;
    if(a.rogueHead){p.rogueHeadWindow=now+1.6;this.roguePush(p,e,580,t(p,'Mauvaise réception'));}
    if(a.roguePin&&!e.boss)e.rogueRoot=.6;
    if(a.rogueBoot)this.roguePush(p,e,740,t(p,'Effet domino'));
    if(a.rogueShoulder)this.roguePush(p,e,500,t(p,'Effet domino'));
    if(a.rogueSlam&&!e.boss){e.stun=.65;e.z=0;this.rogueFX(p,'MARTEAU-PILON',90);}
    if(t(p,'Tendon tranché')&&e.id===p.roguePrey&&(p.x-e.x)*e.facing<0){e.rogueSlow=2;if(!e.boss){e.attack=null;e.pattern=null;}}
    if(t(p,'Braises collantes')&&a.type==='punch'&&p.comboStep===3)this.rogueBurn(p,e);
    if(t(p,'Appel d’air')&&a.type==='kick'&&e.rogueBurns?.[p.id]&&this.rogueReady(p,'air',.5)){this.rogueZone(p,e.x+p.facing*95,e.y,'fire',2,100,.35);this.rogueGrowFire(p);}
    if(t(p,'Mégot de trop')&&e.rogueBurns?.[p.id]){e.rogueEmbers ||= {};e.rogueEmbers[p.id]=(e.rogueEmbers[p.id]||0)+1;if(e.rogueEmbers[p.id]>=3&&this.rogueReady(p,'embers:'+e.id,1)){e.rogueEmbers[p.id]=0;this.rogueBurst(p,e.x,e.y,110,1,'MÉGOT DE TROP');this.rogueGrowFire(p);}}
    if(t(p,'Mauvais présage')&&a.type==='punch'&&p.comboStep===3){e.rogueCurses ||= {};e.rogueCurses[p.id]=now+5;}
    if(t(p,'Feu noir')&&e.rogueCurses?.[p.id]>now)this.rogueBurn(p,e,true);
    if(active(p,'rogueSheitan',now)){e.rogueCurses ||= {};e.rogueCurses[p.id]=now+5;this.rogueBurn(p,e,true);if(this.rogueReady(p,'curseImpact',.65))this.rogueBurst(p,e.x,e.y,120,.65,'SHEITAN','#c56bff');}
    if(t(p,'Peinture fraîche')&&a.type==='punch')this.roguePaint(p,e);
    if(t(p,'Grand coup de rouleau')&&a.type==='kick'&&e.roguePaint?.[p.id]?.stacks&&this.rogueReady(p,'roller',.4))for(const other of this.state.enemies)if(other!==e&&(other.x-e.x)*p.facing>=0&&near(other,e,180))this.roguePaint(p,other);
    if(t(p,'Cible du maître'))p.rogueTarget=e.id;
    if(a.type==='punch'&&p.comboStep===3&&t(p,'Travail d’équipe')&&this.rogueReady(p,'team',1))this.rogueCoordinated(p,e);
    if(active(p,'rogueFeast',now)&&this.rogueReady(p,'feast',.35)){const heal=Math.min(4,p.rogueFeastBudget||0);p.hp=Math.min(p.maxHp,p.hp+heal);p.rogueFeastBudget-=heal;}
    if(t(p,'Aquaplaning')&&(this.state.rogueZones||[]).some(z=>z.owner===p.id&&z.kind==='oil'&&near(z,e,z.radius)))this.roguePush(p,e,620,true);
    if(t(p,'Rebond du poing')&&a.type==='punch'&&p.comboStep===3&&this.rogueReady(p,'fistBounce',.5)){const second=this.state.enemies.find(o=>o!==e&&alive(o)&&near(o,e,180));if(second){this.rogueDamage(p,second,.8);this.rogueFX(p,'REBOND DU POING',190,'arms');}}
    if(a.rogueDive&&!a.rogueLanded){a.rogueLanded=true;if(t(p,'Réception musclée'))this.rogueBurst(p,p.x,p.y,active(p,'rogueRing',now)?210:110,active(p,'rogueRing',now)?1.3:.45,'RÉCEPTION');
      p.rogueAirHits ||= {};const count=p.rogueAirHits[e.id]||0;
      if(t(p,'Rebond du champion')&&((active(p,'rogueRing',now)&&(!e.boss||count<2))||!p.rogueSecondJump)){p.rogueAirHits[e.id]=count+1;p.rogueRejump=now+.6;p.rogueSecondJump=true;}}
    if((this.state.rogueZones||[]).some(z=>z.owner===p.id&&z.kind==='canvas'&&near(z,e,z.radius))&&this.rogueReady(p,'canvasBlast',.6))this.rogueBurst(p,e.x,e.y,135,1.1,'LA RUE EST UNE TOILE','#8af9c3');
  },
  rogueGrowFire(p) { for(const z of this.state.rogueZones||[])if(z.owner===p.id&&z.furnace)z.radius=Math.min(300,z.radius+20); },
  rogueOnAttack(p) {
    const a=p.attack;if(p.enemy||!a||a.rogueHandled)return;a.rogueHandled=true;
    const now=this.state.time, punch=a.type==='punch', kick=a.type==='kick', final=punch&&p.comboStep===3;
    if(!punch&&!kick)return;
    if((t(p,'Double ration')||t(p,'Changement de rythme'))&&p.rogueLastType&&p.rogueLastType!==a.type&&now-(p.rogueLastAttack||0)<1.6){
      if(t(p,'Double ration'))p.rogueDouble=true;
      if(t(p,'Changement de rythme'))p.rogueRhythm=Math.min(3,(p.rogueRhythm||0)+1);
    }
    if(now-(p.rogueLastAttack||0)>1.6){p.rogueHeadSeq=0;p.rogueWrestleSequence=0;p.rogueDomino=0;}
    p.rogueLastType=a.type;p.rogueLastAttack=now;
    if(p.rogueDouble||active(p,'rogueFeast',now)){a.rogueDouble=true;a.roguePower=1.5;a.rogueBand=t(p,'À table !')?115:70;p.rogueDouble=false;this.rogueFX(p,'DOUBLE FRAPPE',a.rogueBand);}
    if(punch&&active(p,'rogueRevers',now)||punch&&active(p,'rogueDemolition',now)){a.rogueRange=180;a.rogueBand=105;p.rogueRevers=0;p.rogueBoot=now+1.6;this.rogueFX(p,'COUP DE PORTIÈRE',180,'arms');}
    if(kick&&active(p,'rogueBoot',now)&&t(p,'Dégage du passage')){a.rogueBoot=true;p.rogueBoot=0;}
    if(kick&&active(p,'rogueShoulder',now)){a.rogueShoulder=true;p.vx=p.facing*620;p.rogueShoulderMoving=now+.4;p.rogueShoulder=0;p.rogueWrestleSequence=1;this.rogueFX(p,'COUP D’ÉPAULE',120);}
    if(punch&&active(p,'rogueEmpowered',now)){a.roguePower=(a.roguePower||1)*1.8;p.rogueEmpowered=0;this.rogueFX(p,'FRAPPE PRÊTE',150);}
    if(kick&&t(p,'Étincelle'))for(const z of this.state.rogueZones||[])if(z.owner===p.id&&z.kind==='oil'&&near(z,p,z.radius+120)){z.kind='fire';z.power=.45;z.ttl=Math.min(z.ttl,2);}
    if(active(p,'rogueDemolition',now)&&kick)this.rogueBurst(p,p.x,p.y,190,.8,'CHOC AU SOL');
    if(kick&&t(p,'Dette de douleur')&&p.rogueDebt>0){const wave=t(p,'Remboursement immédiat'),power=p.rogueDebt/p.power;p.rogueDebt=0;
      this.rogueBurst(p,p.x+p.facing*(wave?120:65),p.y,wave?145:65,power,'RIPOSTE');
      if(t(p,'Derrière moi !'))this.rogueZone(p,p.x-p.facing*90,p.y,'guard',2,125,0);}
    if(punch&&active(p,'rogueBond',now)&&t(p,'Bond de chasse')){const e=this.roguePrey(p);if(e){const d=clamp(e.x-p.x,-240,240);p.x=clamp(p.x+d-p.facing*45,FLOOR.left,FLOOR.right);p.y=clamp(e.y,FLOOR.top,FLOOR.bottom);a.roguePower=1.35;this.rogueFX(p,'BOND DE CHASSE',120);if(p.specialState?.ultimate==='La meute fantôme')this.rogueCoordinated(p,e);}p.rogueBond=0;}
    if(active(p,'rogueCounter',now)){a.roguePower=1.8;p.rogueCounter=0;this.rogueFX(p,'CONTRE-GRIFFE',120);
      if(t(p,'Écho de griffe'))for(const z of this.state.rogueZones||[])if(z.owner===p.id&&z.kind==='decoy'){this.rogueBurst(p,z.x+p.facing*80,z.y,120,.8,'ÉCHO DE GRIFFE');z.ttl=0;}}
    if(final&&t(p,'Front prioritaire')){a.rogueHead=true;a.roguePower=active(p,'rogueHeadReady',now)?2.2:1.25;p.rogueHeadReady=0;this.rogueFX(p,'COUP DE TÊTE',110);}
    if(kick&&active(p,'rogueHeadWindow',now)&&t(p,'Tu bouges pas')){a.roguePin=true;p.rogueHeadWindow=0;}
    if(t(p,'Dernier avertissement')){const type=a.air?'air':a.type;const seq=p.rogueHeadSeq||0;p.rogueHeadSeq=type===['punch','kick','air'][seq]?seq+1:type==='punch'?1:0;if(p.rogueHeadSeq===3){p.rogueHeadReady=now+4;p.rogueHeadSeq=0;this.rogueFX(p,'TÊTE DE DÉMOLITION PRÊTE',130);}}
    if(final&&t(p,'Carreau'))p.rogueBallReady=now+2;
    if(kick&&active(p,'rogueBallReady',now)){this.rogueBall(p);p.rogueBallReady=0;}
    if(kick&&t(p,'Revers extensible')){a.rogueRange=225;a.rogueBand=105;this.rogueFX(p,'',220,'arms');}
    if(punch&&t(p,'Main baladeuse')){a.rogueRange=180;this.rogueFX(p,'',180,'arms');}
    if(kick&&t(p,'Retour à l’envoyeur'))for(const h of this.state.hazards)if(h.enemy&&['bullet','tennis','pencil','knife','cigar'].includes(h.kind)&&near(p,h,225)&&(h.x-p.x)*p.facing>=-25){h.enemy=false;h.both=false;h.owner=p.id;h.bossOwner=false;h.vx=-h.vx;h.vy=-h.vy;h.facing=-h.facing;h.hits={};}
    if(kick&&t(p,'Encore un tour')&&p.rogueRhythm>=3){p.rogueRhythm=0;a.rogueRadial=true;a.rogueRange=200;a.rogueBand=140;p.rogueEncore=now+1.6;this.rogueFX(p,'BALAYAGE',200);}
    else if(active(p,'rogueEncore',now)&&t(p,'Rappel')){p.rogueEcho={at:now+.2,x:p.x+p.facing*70,y:p.y};p.rogueEncore=0;}
    if(active(p,'rogueQuick',now)){p.cooldown=Math.min(p.cooldown,.16);p.rogueQuick=0;}
    if(kick&&a.air&&t(p,'Descente du coude')&&(!p.rogueSecondJump||t(p,'De coin en coin')||active(p,'rogueRing',now))){a.rogueDive=true;a.rogueRange=110;a.rogueBand=90;p.vz=-650;this.rogueFX(p,'DESCENTE DU COUDE',110);}
    if(final&&t(p,'Marteau-pilon')&&this.state.enemies.some(e=>alive(e)&&e.stun>0&&near(p,e,145)))a.rogueSlam=true;
    if(t(p,'Le public en redemande')){if(p.rogueWrestleSequence===1&&punch)p.rogueWrestleSequence=2;else if(p.rogueWrestleSequence===2&&kick){p.rogueEmpowered=now+3;p.rogueWrestleSequence=0;this.rogueFX(p,'OVATION',150);}}
    if(active(p,'rogueChampion',now)&&kick)this.rogueBurst(p,p.x,p.y,210,.85,'CHAMPION');
    for(const z of this.state.rogueZones||[])if(z.owner===p.id&&z.kind==='decoy'&&!z.copied&&(z.gallery||z.swapped&&t(p,'Copie du geste'))){z.copied=true;this.rogueBurst(p,z.x+p.facing*65,z.y,kick?145:108,.7,'COPIE DU GESTE');if(!z.gallery)z.ttl=0;}
  },
  rogueBall(p,count=1) {
    const balls=this.state.rogueBalls ||= [];
    let target=this.state.enemies.find(e=>e.id===p.rogueCochonnet&&alive(e));
    if(count===3&&!target){target=this.state.enemies.filter(alive).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];p.rogueCochonnet=target?.id;}
    for(let i=0;i<count&&balls.filter(b=>b.owner===p.id).length<6;i++)balls.push({id:this.nextId++,owner:p.id,x:p.x,y:p.y,vx:p.facing*410,vy:(i-(count-1)/2)*140,ttl:4,big:count===3,bounces:t(p,'Double rebond')?2:t(p,'Bande de billard')?1:0,hits:[]});
  },
  rogueOnDodge(p) {
    const now=this.state.time;
    p.rogueBond=now+1.6;
    if(t(p,'Coup de portière'))p.rogueRevers=now+1.6;
    if(t(p,'Priorité à droite')||t(p,'Entrée fracassante'))p.rogueShoulder=now+1.6;
    if(t(p,'Pas croisés')){p.rogueLastAttack=now;p.rogueQuick=now+1.6;}
    if(t(p,'Vidange'))this.rogueZone(p,p.x,p.y,'oil',3,active(p,'rogueDrift',now)?130:65,0);
    if(active(p,'rogueDrift',now))this.rogueBurst(p,p.x+p.facing*100,p.y,150,.9,'DÉRAPAGE');
    if(t(p,'Faux Kikor')){for(const z of this.state.rogueZones||[])if(z.owner===p.id&&z.kind==='decoy'&&!z.gallery)z.ttl=0;this.rogueZone(p,p.x,p.y,'decoy',2,75,0,{swapUntil:now+.6});}
    const precise=this.state.enemies.some(e=>alive(e)&&near(p,e,Math.max(150,e.reach||0))&&((e.attack&&!e.attack.hit&&e.attack.windup-e.attack.elapsed<=.18)||(e.pattern&&!e.pattern.hit&&e.pattern.windup-e.pattern.elapsed<=.18))) || this.state.hazards.some(h=>h.enemy&&near(p,h,(h.radius||40)+35)&&h.delay<=.18&&h.ttl>0);
    if(precise)this.schoolAction('dodge');
    if(precise&&t(p,'Contre-griffe')){
      p.rogueCounter=now+1.6;p.rogueInstinctGauge=Math.min(3,(p.rogueInstinctGauge||0)+1);this.rogueFX(p,'ESQUIVE PRÉCISE',90);
      if(t(p,'Après-image'))this.rogueZone(p,p.x,p.y,'decoy',1.5,75,0);
      if(t(p,'Passe derrière')){const e=this.state.enemies.find(e=>alive(e)&&near(p,e,130));if(e){p.x=clamp(e.x-e.facing*60,FLOOR.left,FLOOR.right);p.facing=e.facing;}}
    }
    if(active(p,'rogueInstinct',now)){p.dodgeCd=.36;p.invincible=Math.min(p.invincible,.16);p.rogueCounter=now+1;this.rogueZone(p,p.x,p.y,'decoy',.8,65,0);}
  },
  rogueTrySwap(p) {
    if(!t(p,'Changement de perspective'))return false;
    const z=(this.state.rogueZones||[]).find(z=>z.owner===p.id&&z.kind==='decoy'&&z.ttl>0&&!z.swapped&&!z.gallery&&z.swapUntil>=this.state.time);
    if(!z)return false;
    [p.x,z.x]=[z.x,p.x];[p.y,z.y]=[z.y,p.y];z.swapped=true;p.dodgeBuffer=0;p.vx=0;p.vy=0;this.rogueFX(p,'CHANGEMENT DE PERSPECTIVE',80);return true;
  },
  // Grabs remain available, but no new talent requires them.
  rogueOnGrab() {}, rogueOnThrow() {},
  rogueOnSpecial(p) {
    const a=p.specialState,now=this.state.time;
    if(p.kind==='yanu'){a.free=true;p.cooldown=.2;if(t(p,'Hurlement'))for(const e of this.state.enemies)if(alive(e)&&near(p,e,190)){this.roguePush(p,e,400);if(!e.boss){e.attack=null;e.pattern=null;}this.rogueFX(p,'HURLEMENT',190);}}
    const n=TALENTS[p.kind].find(n=>n.ultimate&&p.progression.talents.includes(n.id));
    if(!n||n.name==='Instinct absolu'&&p.rogueInstinctGauge<3||n.name==='Danse de la Mouk'&&p.rogueRhythm<3)return;
    // Undefined meters are empty, never an implicit activation.
    if(n.name==='Instinct absolu'&&!(p.rogueInstinctGauge>=3)||n.name==='Danse de la Mouk'&&!(p.rogueRhythm>=3))return;
    p.specialCd=Math.max(p.specialCd,TALENT_RULES.ultimateCooldown);a.ultimate=n.name;
    this.event('ultimate',{actor:p.id,branch:n.branchIndex,kind:p.kind,label:n.name});
    this.rogueFX(p,n.name.toUpperCase(),210);
    const free=(duration=6)=>{a.free=true;a.override=true;a.duration=duration;p.cooldown=.2;};
    switch(n.name){
      case 'Convoi exceptionnel': a.convoi=true;break;
      case 'Démolition express': a.after='rogueDemolition';break;
      case 'Rond-point de l’enfer':a.after='rogueDrift';break;
      case 'Forteresse en marche':free();p.rogueFortress=now+6;p.rogueDebt=p.power*2;break;
      case 'La harde':a.duration=5;this.state.allies=this.state.allies.filter(x=>x.owner!==p.id);this.rogueSummon(p,'boar',2,5,.7);break;
      case 'Banquet de baffes':free();p.rogueFeast=now+6;p.rogueFeastBudget=p.maxHp*.2;p.rogueDouble=true;break;
      case 'Chasse sauvage':free(1.5);p.rogueDash={name:n.name,left:4,hits:{},next:now};break;
      case 'La meute fantôme':a.duration=6;this.state.allies=this.state.allies.filter(x=>x.owner!==p.id);this.rogueSummon(p,'wolf',2,6,.7);this.rogueCoordinated(p,this.roguePrey(p)||this.state.enemies.find(alive));break;
      case 'Instinct absolu':free(5);p.rogueInstinct=now+5;p.rogueInstinctGauge=0;p.rogueCounter=now+1;break;
      case 'Tête de démolition':free(.65);p.vx=p.facing*750;this.rogueBurst(p,p.x+p.facing*110,p.y,180,active(p,'rogueHeadReady',now)?3.5:2.5,n.name).forEach(e=>this.roguePush(p,e,650,true));p.rogueHeadReady=0;break;
      case 'Fournaise':free(.4);this.rogueZone(p,p.x+p.facing*110,p.y,'fire',6,200,.8,{furnace:true});break;
      case 'Concours municipal':free(.4);this.rogueBall(p,3);break;
      case 'Danse de la Mouk':free(1.8);p.rogueRhythm=0;p.rogueDash={name:n.name,left:5,hits:{},next:now};break;
      case 'Double tornade':a.free=true;a.duration=6;p.cooldown=.2;this.state.rogueZones=(this.state.rogueZones||[]).filter(z=>z.owner!==p.id||z.kind!=='vortex');this.rogueZone(p,p.x,p.y,'vortex',6,170,.6);break;
      case 'Grande lessive':free();p.rogueLaundry=now+6;break;
      case 'Chef-d’œuvre':free(.4);this.state.allies=this.state.allies.filter(x=>x.owner!==p.id);this.rogueSummon(p,'masterpiece',1,6,1.2);break;
      case 'La rue est une toile':free(.4);this.rogueZone(p,p.x,p.y,'canvas',6,240,0);for(const e of this.state.enemies)if(near(p,e,240))this.roguePaint(p,e,false);break;
      case 'Galerie des mirages':free(.4);for(const z of this.state.rogueZones||[])if(z.owner===p.id&&z.kind==='decoy')z.ttl=0;for(let i=0;i<3;i++)this.rogueZone(p,p.x+(i-1)*125,p.y+(i===1?-60:35),'decoy',6,75,0,{gallery:true});break;
      case 'Champion du monde':p.rogueGiant=now+6;p.rogueChampion=now+6;this.rogueBurst(p,p.x,p.y,200,1.2,n.name);break;
      case 'Le ring est partout':p.rogueRing=now+6;p.z=1;p.vz=490;p.rogueAirHits={};break;
      case 'Sheitan incarné':p.rogueGiant=now+6;p.rogueSheitan=now+6;for(const e of this.state.enemies)if(near(p,e,200)){e.rogueCurses ||= {};e.rogueCurses[p.id]=now+5;this.rogueBurn(p,e,true);}this.rogueBurst(p,p.x,p.y,200,1.4,n.name,'#c56bff');break;
    }
  },
  updateRoguePlayer(p,input,dt) {
    if(!alive(p))return;
    const now=this.state.time,a=p.specialState;
    if(p.rogueSlow>0)p.rogueSlow=Math.max(0,p.rogueSlow-dt);
    if(p.rogueEcho&&p.rogueEcho.at<=now){this.rogueBurst(p,p.rogueEcho.x,p.rogueEcho.y,140,.8,'RAPPEL');p.rogueEcho=null;}
    if(p.rogueSecondJump&&p.z>0&&t(p,'De coin en coin')){p.x=clamp(p.x+input.x*170*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+input.y*130*dt,FLOOR.top,FLOOR.bottom);}
    if(t(p,'Changement de rythme')&&now-(p.rogueLastAttack||0)>3)p.rogueRhythm=0;
    if(t(p,'Flair')){const e=this.roguePrey(p);if(e&&((e.x-p.x)*input.x>0||(e.y-p.y)*input.y>0)){p.x=clamp(p.x+input.x*p.speed*.25*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+input.y*p.speed*.15*dt,FLOOR.top,FLOOR.bottom);}}
    if(t(p,'Odeur du sang')&&a?.kind==='yanu'&&(input.x||input.y)){const e=this.state.enemies.find(e=>alive(e)&&e.rogueBurns?.[p.id]&&near(p,e,300)&&(e.x-p.x)*input.x>=0);if(e){p.x=clamp(p.x+input.x*p.speed*.35*dt,FLOOR.left,FLOOR.right);p.y=clamp(p.y+input.y*p.speed*.2*dt,FLOOR.top,FLOOR.bottom);}}
    if(active(p,'rogueRejump',now)){p.rogueRejump=0;p.z=Math.max(1,p.z);p.vz=490;p.attack=null;p.cooldown=0;this.rogueFX(p,'REBOND',85);}
    if(p.z===0&&!active(p,'rogueRejump',now)){p.rogueSecondJump=false;p.rogueAirHits={};}
    if(active(p,'rogueShoulderMoving',now)&&t(p,'Dans les cordes')&&(p.x<=FLOOR.left+12||p.x>=FLOOR.right-12)&&this.rogueReady(p,'ropes',.6)){p.facing=p.x<FLOOR.left+12?1:-1;p.vx=p.facing*700;this.rogueBurst(p,p.x+p.facing*80,p.y,140,.9,'DANS LES CORDES');}
    if(active(p,'rogueFortress',now)&&this.rogueReady(p,'fortressCharge',.7))p.rogueDebt=Math.min(p.power*2,(p.rogueDebt||0)+p.power*.5);
    if(active(p,'rogueLaundry',now)&&this.rogueReady(p,'laundry',.5)){if(input.x)p.facing=Math.sign(input.x);this.rogueBurst(p,p.x+p.facing*150,p.y,220,1,'GRANDE LESSIVE');this.rogueFX(p,'',320,'arms');}
    if(active(p,'rogueSheitan',now)&&this.rogueReady(p,'blackSteps',.55))this.rogueZone(p,p.x,p.y,'blackfire',2,80,.35);
    if(p.rogueDash&&p.rogueDash.next<=now){const d=p.rogueDash;d.next=now+.3;const targets=this.state.enemies.filter(alive).sort((x,y)=>(d.hits[x.id]||0)-(d.hits[y.id]||0)||Math.abs(x.x-p.x)-Math.abs(y.x-p.x));const e=targets.find(e=>(d.hits[e.id]||0)<(e.boss?3:2));if(e){d.hits[e.id]=(d.hits[e.id]||0)+1;if(p.kind==='yanu')p.roguePrey=e.id;p.facing=Math.sign(e.x-p.x)||p.facing;p.x=clamp(e.x-p.facing*65,FLOOR.left,FLOOR.right);p.y=e.y;this.rogueBurst(p,e.x,e.y,110,e.boss?1.25:1.1,d.name);}if(!e||--d.left<=0)p.rogueDash=null;}
    if(a){
      if(p.kind==='jualos'&&!a.override){if(t(p,'Labourage')&&input.x)a.dx=Math.sign(input.x);if(t(p,'Piétinement')&&this.rogueReady(p,'tracks',.35))this.rogueZone(p,p.x,p.y,'impact',1.5,65,.25);if(t(p,'Ouvreur de foule'))for(const e of this.state.enemies)if(alive(e)&&light(e)&&near(e,p,130)&&this.rogueReady(p,'carry:'+e.id,1)){e.x=clamp(p.x+a.dx*100,FLOOR.left,FLOOR.right);this.roguePush(p,e,650,true);}}
      if(p.kind==='jo'&&!a.override){for(const e of this.state.enemies)if(alive(e)&&near(e,p,200)){if(t(p,'Courant d’air')&&light(e)){e.x+=Math.sign(p.x-e.x)*80*dt;e.y+=Math.sign(p.y-e.y)*40*dt;}if(t(p,'Œil du cyclone')&&near(e,p,90))e.rogueSlow=.4;}
        if(t(p,'Débris d’air')&&this.rogueReady(p,'wind',.6))this.hazard(p,{kind:'wind',x:p.x,y:p.y,radius:25,delay:0,ttl:1.3,vx:p.facing*420,damage:p.power*.6});
        if(t(p,'Sortie de tempête')&&p.rogueSpecialHeld&&!input.special&&a.elapsed>.3){if(input.x)p.facing=Math.sign(input.x);for(const e of this.state.enemies)if(near(p,e,210))this.roguePush(p,e,750);this.endSpecial(p);p.cooldown=.15;}
      }
      if(p.kind==='kikor'&&a.hit&&!a.rogueSummoned&&!a.override){a.rogueSummoned=true;if(t(p,'Deuxième pinceau'))this.rogueSummon(p,'paint',1,10,.6);}
    }
    p.rogueSpecialHeld=!!input.special;
  },
  updateRogueWorld(dt) {
    const s=this.state;
    for(const e of s.enemies){
      if(e.rogueSlow>0)e.rogueSlow=Math.max(0,e.rogueSlow-dt);
      if(e.rogueRoot>0){e.rogueRoot=Math.max(0,e.rogueRoot-dt);e.stun=Math.max(e.stun,e.rogueRoot);}
      for(const [owner,paint] of Object.entries(e.roguePaint||{})){
        if(paint.until<s.time)paint.stacks=0;
        if(paint.detonateAt&&paint.detonateAt<=s.time){const p=s.players.find(p=>p.id===Number(owner));if(p)this.rogueDetonatePaint(p,e,paint);}
      }
      for(const burn of Object.values(e.rogueBurns||{})){burn.time-=dt;burn.next-=dt;const p=s.players.find(p=>p.id===burn.owner);if(p&&alive(e)&&burn.time>0&&burn.next<=0){burn.next=.75;this.rogueDamage(p,e,.18,false);}if(burn.time<=0)delete e.rogueBurns[burn.owner];}
      const collision=e.rogueCollision;
      if(collision){collision.ttl-=dt;const p=s.players.find(p=>p.id===collision.owner);if(p)for(const other of s.enemies)if(other!==e&&alive(other)&&!collision.hits.includes(other.id)&&near(e,other,70)){collision.hits.push(other.id);this.rogueDamage(p,other,collision.power);if(!other.boss)other.stun=.5;if(t(p,'Contrôle technique')){p.rogueDomino=(p.rogueDomino||0)+1;if(p.rogueDomino>=2){p.rogueDomino=0;p.rogueEmpowered=s.time+3;this.rogueFX(p,'CONTRÔLE TECHNIQUE PRÊT',130);}}}if(collision.ttl<=0)e.rogueCollision=null;}
    }
    s.rogueZones=(s.rogueZones||[]).filter(z=>{
      z.ttl-=dt;z.next-=dt;const p=s.players.find(p=>p.id===z.owner);if(!p||!alive(p)||z.ttl<=0)return false;
      for(const e of s.enemies)if(alive(e)&&near(e,z,z.radius)){
        if(['oil','canvas'].includes(z.kind))e.rogueSlow=.3;
        if(z.kind==='vortex'&&light(e)){e.x+=Math.sign(z.x-e.x)*80*dt;e.y+=Math.sign(z.y-e.y)*35*dt;}
        if(z.kind==='decoy'&&!e.boss){if(!e.attack&&!e.pattern){e.x+=Math.sign(z.x-e.x)*65*dt;e.y+=Math.sign(z.y-e.y)*40*dt;e.facing=Math.sign(z.x-e.x)||e.facing;}
          const attack=e.attack||e.pattern;if(attack&&!attack.hit&&attack.windup-attack.elapsed<.12){attack.hit=true;z.ttl=0;if(t(p,'Mauvaise cible')){e.stun=.5;this.rogueBurst(p,z.x,z.y,100,.5,'MAUVAISE CIBLE');}break;}}
      }
      if(z.next<=0&&z.power>0){z.next=.8;const hits=this.rogueBurst(p,z.x,z.y,z.radius,z.power,'',['blackfire'].includes(z.kind)?'#bc69ff':'#ffbe66');if(z.furnace)for(const e of hits)this.rogueBurn(p,e);}
      return z.ttl>0;
    });
    s.rogueBalls=(s.rogueBalls||[]).filter(b=>{
      const p=s.players.find(p=>p.id===b.owner);if(!p)return false;
      b.ttl-=dt;const target=s.enemies.find(e=>e.id===p.rogueCochonnet&&alive(e));
      if(target&&t(p,'Cochonnet'))b.vy+=clamp((target.y-b.y)*3-b.vy,-400*dt,400*dt);
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(b.x<FLOOR.left||b.x>FLOOR.right||b.y<FLOOR.top||b.y>FLOOR.bottom){if(b.bounces-->0){if(b.x<FLOOR.left||b.x>FLOOR.right)b.vx=-b.vx;if(b.y<FLOOR.top||b.y>FLOOR.bottom)b.vy=-b.vy;b.x=clamp(b.x,FLOOR.left,FLOOR.right);b.y=clamp(b.y,FLOOR.top,FLOOR.bottom);}else b.ttl=0;}
      for(const e of s.enemies)if(alive(e)&&!b.hits.includes(e.id)&&near(e,b,b.big?85:55)){b.hits.push(e.id);this.rogueDamage(p,e,b.big?1.6:.85);if(t(p,'Cochonnet')&&!target)p.rogueCochonnet=e.id;this.rogueFX(p,'CARREAU',70);}
      return b.ttl>0;
    });
  },
};
