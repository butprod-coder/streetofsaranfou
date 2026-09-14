import { FLOOR, clamp, fighter } from './data.js';
import { hasTalent, TALENTS } from './rogue-talents.js';
import { HEAVY_ENEMIES } from './weapons.js';
const t = hasTalent;
const near = (a,b,r) => Math.hypot(a.x-b.x,(a.y-b.y)*1.5) < r;
const light = e => !e.boss && !e.vehicle && !HEAVY_ENEMIES.has(e.kind);
export const rogueCombat = {
  clearRogueTransient(p) {
    for (const key of Object.keys(p)) if (key.startsWith('rogue') && !['rogueRewards','rogueTimers'].includes(key)) delete p[key];
  },
  rogueOnKill(p, e) {
    if (!p || p.enemy || !p.progression) return;
    if(t(p,'Dévoreur de braises') && e.rogueBurn && this.rogueReady(p,'harvest',2)) p.energy=Math.min(100,p.energy+6);
    if(t(p,'Malédiction contagieuse') && e.curse && !e.curse.spread) {
      const next=this.state.enemies.find(a=>a!==e && a.hp>0 && near(a,e,180));
      if(next) next.curse={owner:p.id,until:this.state.time+4,spread:true};
    }
  },
  rogueReady(p, key, delay) {
    p.rogueTimers ||= {};
    if ((p.rogueTimers[key] || 0) > this.state.time) return false;
    p.rogueTimers[key] = this.state.time + delay; return true;
  },
  rogueBurst(p, x, y, radius, power, label, color = '#ffbd69') {
    this.rogueDepth = (this.rogueDepth || 0) + 1;
    try {
      for (const e of this.state.enemies) if (e.hp > 0 && e.invincible <= 0 && near(e,{x,y},radius)) this.damage(e, Math.round(p.power * power), p, true);
    } finally { this.rogueDepth--; }
    this.event('rogueFX', { x, y, radius, label, color, visual: 'burst' });
  },
  rogueZone(p, x, y, kind, duration, radius = 100, power = .3) {
    const zones = this.state.rogueZones ||= [];
    if (zones.filter(z=>z.owner===p.id).length >= 8) zones.splice(zones.findIndex(z=>z.owner===p.id),1);
    zones.push({ id:this.nextId++, owner:p.id, x:clamp(x,FLOOR.left,FLOOR.right), y:clamp(y,FLOOR.top,FLOOR.bottom), kind, ttl:duration, radius, power, next:0, vx:kind==='car'?p.facing*240:0 });
  },
  rogueSummon(p, kind, count, duration, power = .6) {
    const owned = this.state.allies.filter(a=>a.owner===p.id);
    for (let i=0;i<Math.min(count,6-owned.length);i++) this.state.allies.push({
      ...this.actor('creation',this.nextId++,false), owner:p.id, ally:true, rogueForm:kind, hp:1,maxHp:1,
      x:clamp(p.x+(i%2?-1:1)*(45+i*12),FLOOR.left,FLOOR.right),y:clamp(p.y+(i-1)*18,FLOOR.top,FLOOR.bottom),
      ttl:duration, emerging:.2, power:Math.round(p.power*power), facing:p.facing });
  },
  rogueDash(p, name, count=3, power=1.1) {
    p.rogueDash = { name, left:count, next:0, power, hits:[] };
  },
  rogueBeforeDamage(target, amount, source, heavy) {
    if (!target.enemy) {
      if (target.rogueShield > 0) { const absorbed=Math.min(amount,target.rogueShield); target.rogueShield-=absorbed; amount-=absorbed; }
      if (target.action==='sleep' && t(target,'Oreiller de secours') && !target.specialState?.pillowUsed) { if(target.specialState) target.specialState.pillowUsed=true; return 0; }
      if (t(target,'Dette de douleur') || t(target,'Dette infernale')) target.rogueDebt = Math.min(target.power*.6,(target.rogueDebt||0)+amount*.3);
      if (target.rogueFortress > 0) { target.rogueStored=Math.min(target.maxHp,(target.rogueStored||0)+amount*.5); amount*=.3; }
      for(const p of this.state.players) if(p!==target && p.hp>0 && t(p,'Derrière moi !') && near(p,target,150) && (target.x-p.x)*p.facing<0) amount*=.8;
      if (amount >= target.hp && t(target,'Encore cinq minutes') && target.sleepSaveChapter!==this.state.chapter) {
        target.sleepSaveChapter=this.state.chapter; target.rogueShield=target.maxHp*.25; target.invincible=2; target.hp=Math.max(1,target.maxHp*.2); target.rogueLastNap=1.5; target.attack=null;
        this.event('rogueFX',{x:target.x,y:target.y,radius:100,label:'ENCORE CINQ MINUTES',visual:'burst',color:'#a7dbff'}); return 0;
      }
    } else if (source && !source.enemy && !this.rogueDepth) {
      if ((source.rogueEmpowered||0)>this.state.time) { amount*=1.4; source.rogueEmpowered=0; }
      if (heavy && source.rogueDebt) { amount+=source.rogueDebt; source.rogueDebt=0; }
      if (source.rogueBlood) amount*=1.35;
      if (source.rogueAlpha===target.id) amount*=1.5;
      if (t(source,'Front prioritaire') && source.comboStep===3) amount*=1.3;
      if (t(source,'Changement de rythme') && source.lastRogueAttack!==source.attack?.type) amount*=1.2;
    }
    return Math.max(0, amount);
  },
  rogueOnHit(p, e, heavy) {
    if (!p || p.enemy || !p.progression || this.rogueDepth) return;
    p.lastRogueAttack=p.attack?.type;
    const mark = t(p,'Mauvais présage') && p.comboStep===3 || t(p,'Poigne infernale') && p.grapple;
    if(mark) e.curse={owner:p.id,until:this.state.time+5,spread:false};
    if(t(p,'Bleu froid') || t(p,'Tendon tranché') && (e.x-p.x)*e.facing>0 || t(p,'Tu bouges pas') && heavy) e.rogueSlow=1.3;
    if(t(p,'Rouge colère')) e.paintOwner=p.id;
    if(t(p,'Braises collantes') || t(p,'Feu noir') && e.curse || t(p,'Griffes profondes') && p.specialState) e.rogueBurn={owner:p.id,time:3,next:0,black:t(p,'Feu noir')};
    if(t(p,'Mégot de trop') && e.rogueBurn && this.rogueReady(p,'ignite:'+e.id,3)) this.rogueBurst(p,e.x,e.y,95,.6,'MÉGOT DE TROP');
    if(t(p,'Cochonnet') && !this.state.enemies.some(a=>a.id===p.rogueCochonnet&&a.hp>0)) p.rogueCochonnet=e.id;
    if(t(p,'Banquet de baffes') && p.rogueFeast>0 && this.rogueReady(p,'feast',.4)) { const heal=Math.min(4,p.rogueFeastBudget||0); p.hp=Math.min(p.maxHp,p.hp+heal); p.rogueFeastBudget-=heal; }
    if(t(p,'Palette explosive')) { e.paintStacks=(e.paintStacks||0)+1; if(e.paintStacks>=3 && this.rogueReady(p,'palette',3)){e.paintStacks=0;this.rogueBurst(p,e.x,e.y,160,1.2,'PALETTE EXPLOSIVE','#af83ff');} }
    if(t(p,'Dernier avertissement')) { p.rogueComboTypes ||= []; const type=p.grapple?'grab':p.attack?.type; if(type && !p.rogueComboTypes.includes(type))p.rogueComboTypes.push(type); if(p.rogueComboTypes.length>=3 && this.rogueReady(p,'correction',8)){p.rogueComboTypes=[];this.rogueBurst(p,e.x,e.y,75,2.5,'DERNIER AVERTISSEMENT');} }
  },
  rogueOnAttack(p) {
    if(p.enemy) return;
    if(t(p,'Bond de chasse') && p.attack?.type==='punch' && p.rogueBond>this.state.time) {p.rogueBond=0;p.vx=p.facing*550;p.z=15;p.vz=180;this.rogueBurst(p,p.x+p.facing*100,p.y,100,.6,'BOND DE CHASSE');}
    if (p.attack?.type==='kick') {
      if(t(p,'Appel d’air') && this.rogueReady(p,'air',1.5)) this.rogueZone(p,p.x+p.facing*130,p.y,'fire',1.5,90,.35);
      if(t(p,'Carreau') && this.rogueReady(p,'ball',2)) this.rogueBall(p,1,false);
      if(t(p,'Retour à l’envoyeur')) for(const h of this.state.hazards) if(h.enemy && ['bullet','tennis','pencil','knife','cigar'].includes(h.kind) && near(p,h,150)) { h.enemy=false;h.owner=p.id;h.bossOwner=false;h.vx=-h.vx;h.vy=-h.vy;h.facing=-h.facing;h.hits={}; }
      if(t(p,'Descente du coude') && p.z>0 && p.specialState) this.rogueBurst(p,p.x,p.y,155,1,'DESCENTE DU COUDE');
    }
    if(t(p,'Tête de démolition') && p.comboStep===3 && this.rogueReady(p,'head',6)) {p.vx=p.facing*650;this.rogueBurst(p,p.x+p.facing*120,p.y,170,1.6,'TÊTE DE DÉMOLITION');}
    if(t(p,'Rappel') && p.comboStep===3 && this.rogueReady(p,'echo',4)) p.rogueEcho={time:.25,x:p.x+p.facing*85,y:p.y};
  },
  rogueBall(p, count=1, fire=false) {
    const target=this.state.enemies.find(e=>e.id===p.rogueCochonnet && e.hp>0);
    for(let i=0;i<count;i++) {
      this.state.rogueBalls ||= [];
      if(this.state.rogueBalls.filter(b=>b.owner===p.id).length>=6)break;
      this.state.rogueBalls.push({id:this.nextId++,owner:p.id,x:p.x,y:p.y+(i-(count-1)/2)*40,vx:p.facing*(fire?230:410),vy:target?clamp((target.y-p.y)*2,-90,90):0,ttl:3,fire,bounces:t(p,'Bande de billard')?1:0,hits:[]});
    }
  },
  rogueOnDodge(p) {
    if(t(p,'Priorité à droite') || t(p,'Contre-griffe')) p.rogueEmpowered=this.state.time+1.2;
    if(t(p,'Vidange')) this.rogueZone(p,p.x,p.y,'oil',2,65,0);
    if(t(p,'Créneau serré') || t(p,'Après-image') || t(p,'Faux Kikor')) this.rogueZone(p,p.x,p.y,'decoy',1.2,90,0);
    if(t(p,'Passe derrière')) {const e=this.state.enemies.find(e=>e.hp>0&&light(e)&&near(p,e,100));if(e)p.x=clamp(e.x+e.facing*65,FLOOR.left,FLOOR.right);}
    if(t(p,'Bond de chasse')) p.rogueBond=this.state.time+1.2;
    if(t(p,'Instinct absolu') && p.rogueInstinct>0)p.dodgeCd=.15;
  },
  rogueOnGrab(p,e) {
    if(t(p,'Poigne infernale'))e.curse={owner:p.id,until:this.state.time+5,spread:false};
    if(t(p,'Double ration') && this.rogueReady(p,'double',3)) {const second=this.state.enemies.find(a=>a!==e&&a.hp>0&&light(a)&&near(a,p,100));if(second)this.rogueBurst(p,second.x,second.y,45,.7,'DOUBLE RATION');}
    if(t(p,'Service familial') && this.rogueReady(p,'familyThrow',9)) {
      const second=this.state.enemies.find(a=>a!==e&&a.hp>0&&light(a)&&!a.grabbedBy&&near(a,p,130));
      if(second)p.grapple.second=second.id;
    }
  },
  rogueOnThrow(p,e) {
    const x=e.thrown?.toX ?? e.x,y=e.y;
    const second=this.state.enemies.find(a=>a.id===p.grapple?.second&&a.hp>0&&!a.grabbedBy);
    if(second){second.thrown={...e.thrown,fromX:second.x,fromZ:30,y:second.y,heavy:false,hits:[]};second.attack=null;second.pattern=null;}
    if(t(p,'Carambolage')||t(p,'Souplesse arrière')||t(p,'Encore un tour'))this.rogueZone(p,x,y,'impact',1.2,150,.5);
    if(t(p,'Mauvaise réception') && this.state.props.some(a=>a.hp>0&&near(a,{x,y},120)))this.rogueZone(p,x,y,'impact',1.2,140,.8);
    if(t(p,'Jaune glissant'))this.rogueZone(p,x,y,'oil',3,100,0);
    if(t(p,'Sol profané'))this.rogueZone(p,x,y,'blackfire',3,100,.35);
    if(t(p,'Chaînes du dessous')&&e.curse)this.rogueZone(p,x,y,'chains',2,140,.2);
    if(t(p,'Poigne infernale')&&e.curse)for(const other of this.state.enemies)if(other!==e&&near(other,{x,y},140))other.curse={owner:p.id,until:this.state.time+4,spread:true};
    if(t(p,'La Porte des Enfers')&&e.curse&&this.rogueReady(p,'hellgate',18)){this.rogueZone(p,x,y,'hellgate',3,190,.8);this.event('rogueFX',{x,y,radius:190,label:'LA PORTE DES ENFERS',color:'#ca67ff',visual:'burst'});}
    if(t(p,'Sortie de route')&&this.rogueReady(p,'crash',9))this.rogueZone(p,x,y,'car',1.5,160,1.1);
    if(t(p,'Montée d’adrénaline')&&p.specialState && !t(p,'Sheitan incarné')){const add=Math.min(1,3-(p.specialState.rogueAdded||0));p.specialState.duration+=add;p.specialState.rogueAdded=(p.specialState.rogueAdded||0)+add;}
    if(t(p,'Tour de ring')&&this.rogueReady(p,'ring',8))this.rogueBurst(p,p.x,p.y,190,1.2,'TOUR DE RING');
  },
  rogueOnSpecial(p) {
    p.rogueBlood=false;
    if(t(p,'Hurlement')||t(p,'Entrée fracassante')||t(p,'Regard du Sheitan'))this.rogueBurst(p,p.x,p.y,155,.5,'ENTRÉE FRACASSANTE');
    if(t(p,'Regard du Sheitan'))for(const e of this.state.enemies)if(e.boss&&near(p,e,200))e.rogueSlow=2;
    if(t(p,'Mue brutale')){p.stun=0;p.rogueSlow=0;}
    const passive = ['Encore cinq minutes','Sortie de route','Service familial','Tête de démolition','Dernier avertissement','Rappel','Palette explosive','Personne n’est trop lourd','Tour de ring','La Porte des Enfers'];
    const ultimates=TALENTS[p.kind].filter(n=>n.ultimate&&p.progression.talents.includes(n.id)&&!passive.includes(n.name));
    for(const n of ultimates) {
      if(!this.rogueReady(p,n.id,18))continue;
      this.event('rogueFX',{x:p.x,y:p.y,radius:170,label:n.name.toUpperCase(),color:p.kind==='gustavax'?'#c36aff':fighter(p.kind).color,visual:'burst'});
      switch(n.name) {
        case 'Loup de pleine lune': case 'Sanglier colossal': case 'Champion du monde': case 'Sheitan incarné': p.rogueGiant=6;p.specialState.duration=6;break;
        case 'Convoi exceptionnel': this.rogueZone(p,p.x+p.facing*220,p.y-55,'car',2,170,1.2);this.rogueZone(p,p.x+p.facing*390,p.y+55,'car',2.8,170,1.2);break;
        case 'Golf blindée':p.rogueDrive=4;p.specialState.duration+=4;break;
        case 'Grasse matinée':p.rogueSleepCharge=true;break;
        case 'Rond-point de l’enfer':this.rogueZone(p,p.x+p.facing*220,p.y,'vortex',5,200,.7);break;
        case 'Forteresse vivante':p.rogueFortress=5;p.rogueStored=0;break;
        case 'Pas touche au pote': {const ally=this.state.players.find(a=>a!==p&&a.hp<=0);if(ally){p.x=ally.x;p.y=ally.y;this.revivePlayer(ally,.35);ally.rogueShield=ally.maxHp*.25;}else p.rogueShield=p.maxHp*.25;break;}
        case 'La harde':this.rogueSummon(p,'boar',3,5,.7);break;
        case 'Banquet de baffes':p.rogueFeast=8;p.rogueFeastBudget=p.maxHp*.15;break;
        case 'Chasse sauvage':this.rogueDash(p,n.name,4,1.25);break;
        case 'L’alpha choisit':{const e=this.state.enemies.filter(e=>e.hp>0).sort((a,b)=>a.hp-b.hp)[0];p.rogueAlpha=e?.id;break;}
        case 'La meute fantôme':this.rogueSummon(p,'wolf',2,6,.8);break;
        case 'Instinct absolu':p.rogueInstinct=5;break;
        case 'Éclair blanc':this.rogueDash(p,n.name,5,.8);break;
        case 'Fournaise':this.rogueZone(p,p.x+p.facing*180,p.y,'fire',6,220,.8);break;
        case 'Pluie de cendres':for(let i=0;i<5;i++)this.rogueZone(p,p.x+p.facing*(80+i*100),FLOOR.top+35+i*35,'fire',3+i*.3,85,.5);break;
        case 'Concours municipal':this.rogueBall(p,3);break;
        case 'Boule de braise':this.rogueBall(p,1,true);break;
        case 'Danse de la Mouk':this.rogueDash(p,n.name,5,1);break;
        case 'Ouragan':this.rogueZone(p,p.x,p.y,'vortex',4,230,.8);break;
        case 'Double tornade':this.rogueZone(p,p.x+p.facing*150,p.y,'vortex',6,150,.6);break;
        case 'Élastique humain':{const enemies=this.state.enemies.filter(e=>e.hp>0&&light(e)&&near(e,p,400)).slice(0,2);for(const e of enemies){e.x=p.x+p.facing*65;e.y=p.y;}this.rogueBurst(p,p.x+p.facing*65,p.y,110,2,n.name);break;}
        case 'Grande lessive':this.rogueBurst(p,p.x,p.y,360,2.2,n.name);break;
        case 'Chef-d’œuvre':p.rogueSummonPlan='masterpiece';break;
        case 'Vernissage':p.rogueSummonPlan='gallery';break;
        case 'La rue est une toile':this.rogueZone(p,p.x,p.y,'canvas',7,230,.3);break;
        case 'Porte peinte':p.roguePortals=[{x:p.x,y:p.y},{x:clamp(p.x+p.facing*550,FLOOR.left,FLOOR.right),y:p.y}];p.roguePortalTime=12;break;
        case 'Copie imparfaite':p.rogueSummonPlan='copy';break;
        case 'Le ring est partout':p.rogueRing=7;break;
      }
    }
  },
  updateRoguePlayer(p,input,dt) {
    if(p.hp<=0)return;
    if(p.rogueLastNap>0){p.rogueLastNap=Math.max(0,p.rogueLastNap-dt);p.action='sleep';p.vx=0;p.vy=0;}
    if(p.rogueShieldTime>0){p.rogueShieldTime-=dt;if(p.rogueShieldTime<=0)p.rogueShield=0;}
    if(t(p,'Cadre protecteur')){const easel=this.state.props.find(a=>a.kind==='easel'&&a.owner===p.id&&a.hp>0);if(easel)for(const h of this.state.hazards)if(h.enemy&&h.vx&&near(h,easel,70))h.ttl=0;}
    for(const owner of this.state.players)if(owner.roguePortalTime>0&&input.interact){const i=owner.roguePortals?.findIndex(a=>near(p,a,90));if(i>=0&&this.rogueReady(p,'portal',2)){p.x=owner.roguePortals[1-i].x;p.y=owner.roguePortals[1-i].y;}}
    if(p.rogueSlow>0)p.rogueSlow=Math.max(0,p.rogueSlow-dt);
    for(const key of ['rogueGiant','rogueInstinct','rogueFeast','rogueRing','roguePortalTime'])if(p[key]>0)p[key]=Math.max(0,p[key]-dt);
    if(p.rogueDrive>0) {
      p.rogueDrive-=dt;p.x=clamp(p.x+input.x*420*dt,FLOOR.left+100,FLOOR.right-100);p.y=clamp(p.y+input.y*220*dt,FLOOR.top,FLOOR.bottom);
      if(this.rogueReady(p,'drive',.4))this.rogueBurst(p,p.x,p.y,125,.5,'KLAXON');
    }
    if(p.rogueFortress>0){p.rogueFortress-=dt;p.vx=0;p.vy=0;if(p.rogueFortress<=0)this.rogueBurst(p,p.x,p.y,220,1+(p.rogueStored||0)/p.power,'FORTERESSE');}
    if(p.rogueGiant>0 && this.rogueReady(p,'giantPulse',.8)){
      this.rogueBurst(p,p.x,p.y,155,.6,'',t(p,'Sheitan incarné')?'#b258ff':'#ffc370');
      if(t(p,'Sheitan incarné'))this.rogueZone(p,p.x,p.y,'blackfire',2,80,.25);
    }
    if(p.rogueEcho){p.rogueEcho.time-=dt;if(p.rogueEcho.time<=0){this.rogueBurst(p,p.rogueEcho.x,p.rogueEcho.y,120,.7,'RAPPEL');p.rogueEcho=null;}}
    if(p.rogueDash && this.rogueReady(p,'dashStep',.27)){
      const dash=p.rogueDash, candidates=this.state.enemies.filter(e=>e.hp>0&&!dash.hits.includes(e.id));
      candidates.sort((a,b)=>(input.x?(a.x-p.x)*Math.sign(input.x):(a.hp))-(input.x?(b.x-p.x)*Math.sign(input.x):b.hp));
      const e=candidates[0];if(e){dash.hits.push(e.id);p.x=clamp(e.x-p.facing*55,FLOOR.left,FLOOR.right);p.y=e.y;this.rogueBurst(p,e.x,e.y,100,dash.power,dash.name);}
      if(!e||--dash.left<=0)p.rogueDash=null;
    }
    if(t(p,'Flair') && input.x && this.state.enemies.some(e=>e.hp>0&&e.hp<e.maxHp*.5&&(e.x-p.x)*input.x>0&&near(e,p,450)))p.x=clamp(p.x+input.x*p.speed*.2*dt,FLOOR.left,FLOOR.right);
    if(p.rogueRing>0 && (p.x<FLOOR.left+18||p.x>FLOOR.right-18)&&this.rogueReady(p,'ringBounce',1)){p.facing=p.x<FLOOR.left+18?1:-1;p.vx=p.facing*650;this.rogueBurst(p,p.x+p.facing*90,p.y,140,1,'CORDES DU RING');}
    if(t(p,'Retouche')&&input.kick&&input.special&&this.rogueReady(p,'retouch',8)){const ally=this.state.allies.find(a=>a.owner===p.id);if(ally){ally.ttl=0;p.rogueShield=p.maxHp*.2;}}
    const a=p.specialState;
    if(a){
      if(t(p,'Marche arrière sauvage')&&input.special&&a.elapsed>.45&&!p.rogueSpecialHeld&&p.kind==='karonux')a.elapsed=Math.max(a.elapsed,1.05);
      if(t(p,'Sommeil léger')&&p.action==='sleep'&&input.dodge){this.endSpecial(p);p.cooldown=0;p.action='idle';}
      if(t(p,'Pacte de sang')&&a.elapsed>.5&&input.special&&!p.rogueBlood&&p.hp>p.maxHp*.1){p.hp=Math.max(1,p.hp-p.maxHp*.08);p.rogueBlood=true;}
      if(t(p,'Labourage')&&p.kind==='jualos')p.y=clamp(p.y+input.y*100*dt,FLOOR.top,FLOOR.bottom);
      if(t(p,'Défenses croisées')&&p.kind==='jualos'&&(p.x<FLOOR.left+15||p.x>FLOOR.right-15)&&this.rogueReady(p,'boarBounce',.6))this.rogueBurst(p,p.x,p.y,150,.8,'DÉFENSES CROISÉES');
      if(t(p,'Piétinement')&&this.rogueReady(p,'stomp',.7))this.rogueBurst(p,p.x,p.y,90,.3,'');
      if(t(p,'Courant d’air')||t(p,'Œil du cyclone'))for(const e of this.state.enemies)if(e.hp>0&&near(e,p,200)){
        if(t(p,'Courant d’air')&&!e.boss)e.x+=Math.sign(p.x-e.x)*45*dt;
        if(t(p,'Œil du cyclone'))e.rogueSlow=.4;
      }
      if(p.kind==='kikor'&&a.hit&&!a.rogueSummoned){
        a.rogueSummoned=true;const count=p.rogueSummonPlan==='gallery'?5:t(p,'Deuxième pinceau')?1:0;
        if(count)this.rogueSummon(p,'paint',count,10,p.rogueSummonPlan==='gallery'?.5:.45);
        if(p.rogueSummonPlan==='masterpiece'){const ally=this.state.allies.find(a=>a.owner===p.id);if(ally){ally.rogueForm='masterpiece';ally.power*=2.5;ally.ttl=12;}}
        if(p.rogueSummonPlan==='copy'){const target=this.state.enemies.find(e=>e.hp>0&&light(e));this.rogueSummon(p,'copy',1,10,1.1);const copy=this.state.allies.find(a=>a.owner===p.id&&a.rogueForm==='copy');if(copy)copy.copyKind=target?.kind;}
        p.rogueSummonPlan=null;
      }
      if(t(p,'Cadre protecteur')){const easel=this.state.props.find(a=>a.kind==='easel'&&a.owner===p.id);if(easel)for(const h of this.state.hazards)if(h.enemy&&h.vx&&near(h,easel,70))h.ttl=0;}
    }
    if(p.rogueWasSleep && p.action!=='sleep' && (t(p,'Réveil difficile')||p.rogueSleepCharge)){this.rogueBurst(p,p.x,p.y,p.rogueSleepCharge?250:120,p.rogueSleepCharge?2.5:.7,'RÉVEIL DIFFICILE');p.rogueSleepCharge=false;}
    p.rogueWasSleep=p.action==='sleep';p.rogueSpecialHeld=!!input.special;
  },
  updateRogueWorld(dt) {
    const s=this.state;
    for(const e of s.enemies) {
      if(e.curse?.until<s.time)e.curse=null;
      if(e.rogueSlow>0){e.rogueSlow=Math.max(0,e.rogueSlow-dt);if(e.ai)e.ai.wait=Math.max(e.ai.wait,.3);}
      if(e.rogueBurn && e.hp>0){
        const burn=e.rogueBurn;burn.time-=dt;burn.next-=dt;
        const p=s.players.find(p=>p.id===burn.owner&&p.hp>0);
        if(p&&burn.next<=0){burn.next=.75;this.rogueDepth=(this.rogueDepth||0)+1;try{this.damage(e,Math.round(p.power*.18),p,false);}finally{this.rogueDepth--;}this.event('rogueFX',{x:e.x,y:e.y,radius:30,label:'',visual:'burst',color:burn.black?'#c66bff':'#ff8549'});}
        if(burn.time<=0)e.rogueBurn=null;
      }
    }
    s.rogueZones=(s.rogueZones||[]).filter(z=>{
      z.ttl-=dt;z.next-=dt;z.x+= (z.vx||0)*dt;const p=s.players.find(p=>p.id===z.owner&&p.hp>0);if(!p||z.ttl<=0||z.x<FLOOR.left-100||z.x>FLOOR.right+100)return false;
      for(const e of s.enemies)if(e.hp>0&&near(e,z,z.radius)){
        if(['oil','chains','hellgate','canvas'].includes(z.kind))e.rogueSlow=.3;
        if(['vortex','hellgate'].includes(z.kind)&&light(e)&&!e.grabbedBy&&!e.thrown){e.x+=Math.sign(z.x-e.x)*65*dt;e.y+=Math.sign(z.y-e.y)*25*dt;}
        if(z.kind==='decoy'&&!e.attack&&!e.pattern&&!e.boss){e.targetX=z.x;e.x=clamp(e.x+Math.sign(z.x-e.x)*40*dt,FLOOR.left,FLOOR.right);}
      }
      if(z.next<=0&&z.power>0){z.next=.8;this.rogueBurst(p,z.x,z.y,z.radius,z.power,'', ['blackfire','hellgate'].includes(z.kind)?'#be69ff':'#ffbe66');}
      return true;
    });
    s.rogueBalls=(s.rogueBalls||[]).filter(b=>{
      const p=s.players.find(p=>p.id===b.owner&&p.hp>0);if(!p)return false;
      b.ttl-=dt;b.x+=b.vx*dt;b.y=clamp(b.y+b.vy*dt,FLOOR.top,FLOOR.bottom);
      if(b.x<FLOOR.left||b.x>FLOOR.right){if(b.bounces-->0){b.vx=-b.vx;b.x=clamp(b.x,FLOOR.left,FLOOR.right);}else b.ttl=0;}
      for(const e of s.enemies)if(e.hp>0&&!b.hits.includes(e.id)&&near(e,b,65)){b.hits.push(e.id);this.rogueBurst(p,e.x,e.y,b.fire?150:55,b.fire?1.4:.85,'CARREAU');if(b.fire){this.rogueZone(p,b.x,b.y,'fire',3,130,.4);b.ttl=0;}}
      return b.ttl>0;
    });
    for(const p of s.players)if(p.hp>0&&t(p,'Portrait de famille')&&this.rogueReady(p,'support',2)){
      const allies=s.allies.filter(a=>a.owner===p.id);if(allies.length){if(p.supportRole==='heal')p.hp=Math.min(p.maxHp,p.hp+2);if(p.supportRole==='guard')p.rogueShield=Math.min(p.maxHp*.1,(p.rogueShield||0)+3);}
    }
  },
};
