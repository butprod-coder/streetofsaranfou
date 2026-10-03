import { FLOOR, clamp } from './data.js';
import { tune } from './talent-upgrades.js';

export const ULTIMATE_COOLDOWN = 2.5;
export const ULTIMATE_SPECIALS = {
  karonux: [
    ['DÉRAPAGE ROYAL', 'Spécial : dérapage à 360°, choc massif et projection des ennemis proches.'],
    ['DÉGEL EXPLOSIF', 'Spécial : fait exploser toutes les cibles congelées, avec contagion glaciale.'],
    ['ORDONNANCE DE CHOC', 'Spécial : écrasement au plâtre et onde de choc qui renverse les ennemis proches.'],
  ],
  lorenzo: [
    ['MÉGOTPOCALYPSE', 'Spécial : pluie de cigarettes brûlantes sur toute l’arène.'],
    ['RAID DES PIGEONS', 'Spécial : piqué renforcé et assaut de la nuée sur plusieurs cibles.'],
    ['STRIKE TITANE', 'Spécial : charge en boule qui projette les ennemis sur son passage.'],
  ],
  jualos: [
    ['OPA ÉCLAIR', 'Spécial : recrute les ennemis ordinaires proches et déclenche un assaut des alliés.'],
    ['PORC EXPRESS', 'Spécial : charge écrasante à travers les groupes.'],
    ['ACCORD APOCALYPTIQUE', 'Spécial : accord massif, ondes renforcées dans les deux directions et étourdissement proche.'],
  ],
  yanu: [
    ['CHASSE ÉCLAIR', 'Spécial : bond et griffures puissantes sur plusieurs ennemis proches.'],
    ['FLASH FINAL', 'Spécial : impulsion de lumière massive qui blesse et étourdit.'],
    ['ÉRUPTION CARNIVORE', 'Spécial : croissance géante des plantes et racines qui immobilisent les ennemis proches.'],
  ],
  jo: [
    ['LIVRAISON PRIORITAIRE', 'Spécial : projette toute la cargaison et percute violemment les ennemis devant lui.'],
    ['SURCHAUFFE CRITIQUE', 'Spécial : surchauffe maximale, explosion et flammes autour de Jo.'],
    ['EMBUSCADE GÉNÉRALE', 'Spécial : attaques dans le dos en chaîne sur plusieurs ennemis.'],
  ],
  kikor: [
    ['FRESQUE FURIEUSE', 'Spécial : éclaboussure massive et assaut de trois créations vivantes.'],
    ['VAGUE VERTE', 'Spécial : renforts et attaque collective de l’armée verte.'],
    ['SPRINT FINAL', 'Spécial : sprint à vélo qui traverse et projette les groupes.'],
  ],
  gustavax: [
    ['CATACLYSME INFERNAL', 'Spécial : téléportation explosive, flammes et renforts démoniaques.'],
    ['PLAN DE LICENCIEMENT', 'Spécial : rassemble le comité et ordonne une attaque collective massive.'],
    ['PLAQUAGE VENTRAL', 'Spécial : saut et écrasement ventral sur toute l’arène. En l’air, déclenche directement la chute.'],
  ],
};

const distance = (a,b) => Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const targetable = e => e.hp>0 && !e.joCargo && !e.lorenzoCarry && !e.gustavaxGrip;
// A rank-six ultimate should clearly out-hit a regular talent attack (usually
// 1–2.5x specialPower), while multi-target/team effects stay bounded per foe.
const ULTIMATE_HIT = 4.5;
const ULTIMATE_TEAM_HIT = 2.5;

export const ultimateSpecials = {
  updateUltimateSpecial(p,input,dt) {
    const a=p.specialState;
    // Activation never doubles as an ultimate: release, then press again.
    const control=a.ultimateInput ||= {held:true,tap:p.taps?.special||0,next:0};
    const tap=input.taps?.special||0,fresh=!!input.special&&!control.held||tap>control.tap;
    control.held=!!input.special;control.tap=tap;
    if(a.rank!==6||p.hp<=0||a.elapsed+dt>=a.duration-.45||a.finished)return;
    if(!fresh||a.elapsed<control.next||a.grip||a.air||a.dive||a.leap||a.ultimateRush)return;
    if(!this.performUltimateSpecial(p))return;
    control.next=a.elapsed+ULTIMATE_COOLDOWN;
    a.ultimateCount=(a.ultimateCount||0)+1;
    this.event('opening',{x:p.x,y:p.y-190,label:ULTIMATE_SPECIALS[p.kind][a.branch][0]});
  },
  ultimateStrike(p,origin,radius,power,stun=.7) {
    radius=tune(p,5,'ultimateRange',radius);power=tune(p,5,'ultimatePower',power);
    for(const e of this.state.enemies)if(targetable(e)&&e.invincible<=0&&distance(origin,e)<=radius){
      const hp=e.hp;this.damage(e,p.specialPower*power,p,true,false,p.specialState?.ultimateRush||null);
      if(e.hp<hp&&e.hp>0){e.stun=Math.max(e.stun,e.boss?Math.min(.2,stun):stun);if(!e.boss&&!e.vehicle)e.vx=(Math.sign(e.x-origin.x)||p.facing)*420;}
    }
    for(const prop of this.state.props)if(prop.hp>0&&distance(origin,prop)<radius)this.hitProp(prop,3,p);
  },
  beginUltimateRush(p,pose) {
    const a=p.specialState;
    a.ultimateRush={age:0,fromX:p.x,toX:clamp(p.x+p.facing*620,FLOOR.left,FLOOR.right),y:p.y,hits:[]};
    a.pose=pose;a.poseUntil=a.elapsed+.5;p.invincible=Math.max(p.invincible,.4);
  },
  updateUltimateRush(p,dt) {
    const a=p.specialState,r=a.ultimateRush;if(!r)return false;
    a.elapsed+=dt;r.age+=dt;
    const previous=p.x;p.x=r.fromX+(r.toX-r.fromX)*Math.min(1,r.age/.4);p.y=r.y;p.z=p.vz=p.vx=p.vy=0;p.action='special';
    for(const e of this.state.enemies)if(targetable(e)&&e.invincible<=0&&!r.hits.includes(e.id)&&e.x>=Math.min(previous,p.x)-65&&e.x<=Math.max(previous,p.x)+65&&Math.abs(e.y-p.y)<75){
      r.hits.push(e.id);this.ultimateStrike(p,e,1,ULTIMATE_HIT,1);
      this.event('spectacle',{atlas:p.kind+'FX',cell:p.kind==='lorenzo'?15:p.kind==='jualos'?14:14,x:e.x,y:e.y});
    }
    if(r.age>=.4||a.elapsed>=a.duration){a.ultimateRush=null;if(a.elapsed>=a.duration)this.endSpecial(p);}
    return true;
  },
  performUltimateSpecial(p) {
    const a=p.specialState,s=this.state,branch=a.branch;
    const foes=()=>s.enemies.filter(targetable).sort((e,f)=>distance(p,e)-distance(p,f));
    const fx=(cell,x=p.x,y=p.y)=>this.event('spectacle',{atlas:p.kind+'FX',cell,x,y});
    const strike=(radius=320,power=ULTIMATE_HIT,stun=.8)=>this.ultimateStrike(p,p,radius,power,stun);
    a.pose=7;a.poseUntil=a.elapsed+.4;
    switch(p.kind){
      case 'karonux':
        if(branch===1){const frozen=foes().filter(e=>e.karonuxFrost?.frozenUntil>s.time);if(!frozen.length)return false;for(const e of frozen){e.karonuxFrost.amount=Math.max(3,e.karonuxFrost.amount);this.ultimateStrike(p,e,1,ULTIMATE_TEAM_HIT);}this.karonuxShatter(p,frozen,true);}
        else{strike(branch===0?340:360,ULTIMATE_HIT,1);fx(14);a.pose=branch===0?5:7;}
        break;
      case 'lorenzo':
        if(branch===0){this.lorenzoCigarettes(p,36,true);this.lorenzoCloud(p,p.x,p.y,150);strike(320,ULTIMATE_HIT);a.pose=7;fx(6);}
        else if(branch===1){for(const e of foes().filter(e=>distance(p,e)<tune(p,5,'ultimateRange',650)).slice(0,4)){this.lorenzoSwarm(p,e,3,2);this.ultimateStrike(p,e,1,ULTIMATE_TEAM_HIT);}this.lorenzoDive(p,true);fx(12);}
        else this.beginUltimateRush(p,7);
        break;
      case 'jualos':
        if(branch===0){for(const e of [...foes()])if(distance(p,e)<tune(p,5,'ultimateRange',360))this.recruitJualos(p,e,true);for(const ally of s.allies.filter(m=>m.recruit&&m.owner===p.id&&m.hp>0)){ally.cooldown=0;this.ultimateStrike(p,ally,230,ULTIMATE_TEAM_HIT);}strike(250,ULTIMATE_TEAM_HIT);fx(11);}
        else if(branch===1)this.beginUltimateRush(p,6);
        else{this.jualosChord(p);for(const w of s.jualosWaves.filter(w=>w.owner===p.id&&w.age===0)){w.power=p.specialPower*ULTIMATE_HIT;w.radius=155;}strike(240,ULTIMATE_TEAM_HIT,1.3);fx(7);a.pose=7;}
        break;
      case 'yanu':
        if(branch===0){for(const e of foes().filter(e=>distance(p,e)<tune(p,5,'ultimateRange',650)).slice(0,5)){this.ultimateStrike(p,e,1,ULTIMATE_HIT,1);fx(0,e.x,e.y-50);}this.leapYanu(p);}
        else if(branch===1){strike(600,ULTIMATE_HIT,1.6);fx(2);}
        else{for(let i=0;i<4;i++)this.plantYanu(p,p.x+(i%2?130:-130),p.y+(i<2?-45:45));for(const t of s.yanuPlants.filter(t=>t.owner===p.id)){t.giant=true;t.nextBite=s.time;}strike(380,ULTIMATE_HIT);for(const e of foes())if(distance(p,e)<380&&!e.boss)e.yanuRoots={until:s.time+1.5,owner:p.id};fx(13);}
        break;
      case 'jo':
        if(branch===0){this.unloadJo(p,true);strike(360,ULTIMATE_HIT);fx(2);a.pose=6;}
        else if(branch===1){a.heat=100;strike(380,ULTIMATE_HIT);for(let i=-1;i<=1;i++)this.joFirePatch(p,p.x+i*110,p.y);fx(7);}
        else{const targets=foes().filter(e=>distance(p,e)<tune(p,5,'ultimateRange',650)).slice(0,5);for(const e of targets){this.joBackstab(p,e);this.ultimateStrike(p,e,1,ULTIMATE_HIT);}fx(11);a.pose=5;}
        break;
      case 'kikor':
        if(branch===0){strike(380,ULTIMATE_HIT);for(let i=-1;i<=1;i++){this.kikorPaint(p,p.x+i*125,p.y);this.drawKikorCreature(p,true);}fx(1);}
        else if(branch===1){for(let i=0;i<4;i++)this.spawnKikorMinion(p);for(const m of s.allies.filter(m=>m.kikorSummon&&m.owner===p.id&&m.hp>0)){m.cooldown=0;m.striking=.35;this.ultimateStrike(p,m,230,ULTIMATE_TEAM_HIT);}fx(6);}
        else this.beginUltimateRush(p,4);
        break;
      case 'gustavax':
        if(branch===0){const target=foes()[0];fx(4);if(target){p.x=clamp(target.x-p.facing*55,FLOOR.left,FLOOR.right);p.y=target.y;}strike(380,ULTIMATE_HIT);this.gustavaxFire(p,p.x,p.y);for(let i=0;i<3;i++)this.spawnGustavaxMinion(p,'imp');fx(6);a.pose=6;}
        else if(branch===1){this.fillGustavaxTeam(p);this.commandGustavax(p,'area');for(const m of s.allies.filter(m=>m.gustavaxMinion&&m.owner===p.id&&m.hp>0)){this.ultimateStrike(p,m,250,ULTIMATE_TEAM_HIT);}fx(10);}
        else{if(a.bellyJump){if(a.bellyJump.slam)return false;Object.assign(a.bellyJump,{slam:true,fallZ:Math.max(35,p.z),fallAge:0});}else a.bellyJump={age:0,slam:false,ultimateAuto:true};}
        break;
      default:return false;
    }
    return true;
  },
};
