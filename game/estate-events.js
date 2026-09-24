export const ESTATE_KINDS = ['sluice', 'petanque', 'picnic', 'poachers'];
export const ESTATE_NAMES = { sluice: 'LES VANNES DE L’ÉTANG', petanque: 'TU TIRES OU TU POINTES ?', picnic: 'LE PIQUE-NIQUE DES PIGEONS', poachers: 'LES BRACONNIERS DU PARC' };
export const isEstate = e => !!e && ESTATE_KINDS.includes(e.kind);
export const estateTarget = time => (Math.sin(time * 2.3) + 1) / 2;
const near = (p, t) => Math.hypot(p.x-t.x, (p.y-t.y)*1.5) < 85;
export function estateChoices(e) {
  if (!isEstate(e) || e.status !== 'choice') return [];
  const copy = {
    sluice: ['OUVRIR LES VANNES', 'Combat · 2 vannes : diversion et +30 énergie'],
    petanque: ['JOUER TROIS BOULES', 'F au bon moment · +15 énergie par réussite'],
    picnic: ['PARTAGER LE REPAS', 'Par joueur : −25 énergie, +35 PV · cadeau plus loin'],
    poachers: ['LIBÉRER LES PIGEONS', 'Combat · F aux cages : les pigeons vous aident'],
  }[e.kind];
  return [{id:'accept',x:500,y:555,label:copy[0],detail:copy[1]}, {id:'skip',x:1040,y:615,label:'CONTINUER',detail:'Sans coût ni récompense'}];
}
export const estateEvents = {
  beginEstate(kind) {
    const s=this.state;
    s.neighborhoodEncounter={kind,status:'choice',choices:{},switches:[],released:[],shots:{},hits:{},elapsed:0,ducks:[],notice:''};
    s.phase='encounter';
  },
  startEstate() {
    const s=this.state,e=s.neighborhoodEncounter;
    if (!isEstate(e) || e.status!=='choice') return;
    const active=s.players.filter(p=>p.hp>0&&p.connected!==false);
    if(e.kind==='picnic') {
      if(active.some(p=>p.energy<25)) {e.choices={};e.notice='Il faut 25 énergie par joueur. Vous pouvez passer.';return;}
      for(const p of active){p.energy-=25;p.hp=Math.min(p.maxHp,p.hp+35);}
      s.estate.helpStage=s.stage+1;this.finishNeighborhood('success');return;
    }
    e.status='active';e.elapsed=0;
    if(e.kind==='petanque') return;
    s.phase='fight';s.spawnQueue=s.players.length>1?['orelsan','charlingals','remy','orelsan']:['orelsan','charlingals','remy'];s.spawnTimer=1;
    for(const p of s.players)p.invincible=Math.max(p.invincible,1.5);
  },
  interactEstate(p) {
    const s=this.state,e=s.neighborhoodEncounter;
    if(!isEstate(e)||e.status!=='active')return false;
    if(p.hp<=0||p.z>0||p.attack||p.stun>0)return true;
    if(e.kind==='petanque') {
      if(near(p,{x:1040,y:615})){e.shots[p.id]=3;this.updateEstate(0);return true;}
      if(!near(p,{x:510,y:550})||(e.shots[p.id]||0)>=3||e.elapsed<(e.nextThrows?.[p.id]||0))return true;
      const hit=Math.abs(estateTarget(e.elapsed)-.5)<=.16;
      e.shots[p.id]=(e.shots[p.id]||0)+1;e.hits[p.id]=(e.hits[p.id]||0)+Number(hit);(e.nextThrows ||= {})[p.id]=e.elapsed+.55;
      e.lastThrow={x:780+(estateTarget(e.elapsed)-.5)*220,y:540,until:e.elapsed+1,hit};
      e.notice=`J${p.id} · ${hit?'BIEN POINTÉ ! +15 ÉNERGIE':'À CÔTÉ !'} · ${e.shots[p.id]}/3 lancers`;
      if(hit){p.energy=Math.min(100,p.energy+15);s.score+=100;}
      this.updateEstate(0);return true;
    }
    const targets=e.kind==='sluice'?[{x:450,y:490},{x:930,y:600}]:[{x:420,y:500},{x:710,y:610},{x:990,y:490}];
    const i=targets.findIndex(t=>near(p,t));
    if(i<0)return false;
    const list=e.kind==='sluice'?e.switches:e.released;
    if(list.includes(i))return true;
    list.push(i);
    if(e.kind==='sluice'&&list.length===2) {
      e.flushUntil=e.elapsed+3;
      for(const enemy of s.enemies){if(enemy.hp>0){enemy.stun=Math.max(enemy.stun,3);enemy.attack=null;enemy.pattern=null;}}
      s.spawnTimer=Math.max(s.spawnTimer,3);
      for(const player of s.players)if(player.hp>0)player.energy=Math.min(100,player.energy+30);
      e.notice='CHASSE D’EAU ! · ENNEMIS ÉTOURDIS · +30 ÉNERGIE';
    }
    if(e.kind==='poachers') {
      e.ducks.push({x:targets[i].x,y:targets[i].y,until:e.elapsed+3});
      for(const enemy of s.enemies)if(enemy.hp>0&&Math.hypot(enemy.x-targets[i].x,enemy.y-targets[i].y)<350){enemy.stun=Math.max(enemy.stun,2.5);enemy.attack=null;enemy.pattern=null;}
      e.notice=`${list.length}/3 PIGEONS LIBÉRÉS · ILS SÈMENT LA PAGAILLE !`;
    }
    return true;
  },
  updateEstate(dt) {
    const s=this.state,e=s.neighborhoodEncounter;
    if(s.estateVisit){s.estateVisit.remaining-=dt;if(s.estateVisit.remaining<=0)s.estateVisit=null;}
    if(!isEstate(e)||e.status!=='active')return;
    e.elapsed+=dt;e.ducks=e.ducks.filter(d=>d.until>e.elapsed);
    if(e.kind==='petanque') {
      const active=s.players.filter(p=>p.hp>0&&p.connected!==false);
      if(active.length&&active.every(p=>(e.shots[p.id]||0)>=3))this.finishNeighborhood(Object.values(e.hits).some(n=>n>0)?'success':'missed');
    }
  },
  finishEstateWave() {
    const s=this.state,e=s.neighborhoodEncounter;
    const success=e.kind==='sluice'?e.switches.length===2:e.released.length===3;
    if(e.kind==='poachers')for(let i=0;i<e.released.length;i++)s.pickups.push({id:this.nextId++,kind:'food',amount:15,x:500+i*170,y:550});
    this.finishNeighborhood(success?'success':'missed');
  },
  estateAssist() {
    const s=this.state;
    if(s.chapter!==1||s.wave!==0||s.estate.helpStage!==s.stage)return;
    s.estate.helpStage=null;s.estateVisit={remaining:7};
    s.players.forEach((p,i)=>s.pickups.push({id:this.nextId++,kind:'food',amount:25,x:550+i*130,y:550}));
  },
};
