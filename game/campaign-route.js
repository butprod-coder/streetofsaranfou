// The six playable districts shuffle; a future terminal boss must be appended, never shuffled.
export function shuffledRoute(seed) {
  const order=[0,1,2,3,4,5]; let n=seed>>>0;
  n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);n=(n^(n>>>15))>>>0;
  for(let i=5;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=Math.floor(n/4294967296*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return {order,completed:[]};
}
export function cleanRoute(raw,chapter,phase) {
  if(!raw){if(phase==='badges')throw new Error('Progression des quartiers manquante.');return null;} // Preserve legacy checkpoints and explicit single-chapter test/practice starts.
  if(!Array.isArray(raw.order)||raw.order.length!==6||new Set(raw.order).size!==6||raw.order.some(n=>!Number.isInteger(n)||n<0||n>5))throw new Error('Ordre des quartiers invalide.');
  if(!Array.isArray(raw.completed)||raw.completed.length>6||raw.completed.some((n,i)=>n!==raw.order[i]))throw new Error('Progression des quartiers invalide.');
  const index=raw.order.indexOf(chapter),expected=chapter===6?6:phase==='badges'||phase==='won'?index+1:index;
  if(raw.completed.length!==expected)throw new Error('Quartier et progression incompatibles.');
  return {order:[...raw.order],completed:[...raw.completed]};
}
export const routeDepth = s => s.chapter===6 ? 6 : s.route ? Math.max(0,s.route.order.indexOf(s.chapter)) : s.chapter;
export const nextDistrict = s => s.route ? (s.route.order[s.route.completed.length] ?? 6) : s.chapter+1;
export const campaignRoute = {
  routeDepth(){return routeDepth(this.state);},
  openRouteBoard(){
    const s=this.state;if(!s.route||s.practice)return false;
    if(!s.route.completed.includes(s.chapter))s.route.completed.push(s.chapter);
    s.routeReady={};s.phase='badges';s.phaseTime=.65;s.hazards=[];s.allies=[];s.gymProjectiles=[];
    for(const p of s.players){this.releaseGrab(p);this.endSpecial(p);p.attack=null;p.routeHeld=true;}
    this.event('districtComplete',{chapter:s.chapter});return true;
  },
  confirmRoute(slot){
    const s=this.state,p=s.players[slot];if(s.phase!=='badges'||s.paused||!p||p.connected===false)return false;
    s.routeReady[p.id]=true;
    const players=s.players.filter(p=>p.connected!==false);
    if(!players.length||!players.every(p=>s.routeReady[p.id]))return true;
    s.chapter=nextDistrict(s);s.stage=0;s.routeReady={};
    for(const player of s.players){player.hp=Math.min(player.maxHp,Math.max(1,player.hp)+player.maxHp*.4);player.lives=Math.min(5,player.lives+1);}
    this.enterStreet();return true;
  },
};
