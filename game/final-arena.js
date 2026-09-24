import { CHAPTERS } from './data.js';
import { gustavaxCombat } from './boss-gustavax.js';
import { shuffledRoute } from './campaign-route.js';

// The arena never changes location: stage is the rematch round, then the final duel.
export function finalWaves(order, round, players = 1) {
  if (round === 6) return [{boss:true,bossKind:'gustavax',kinds:[],rest:0,label:'LE DERNIER MOT'}];
  const rosters=[['remy','orelsan'],['kikor_e','guylux'],['charlingals','papy_jala'],['makouille','triso']];
  const waves=Array.from({length:round===2||round===4?3:2},(_,i)=>({
    kinds:Array.from({length:3+(players>1?2:0)},(_,j)=>rosters[(round+i)%4][j%2]),
    rest:3,label:`GARDE RAPPROCHÉE · REVANCHE ${round+1}/6`,
  }));
  waves.push({boss:true,bossKind:CHAPTERS[order[round]].boss,kinds:[],rest:4,label:`REVANCHE · ${CHAPTERS[order[round]].boss.toUpperCase()}`});
  return waves;
}

export const finalArena = {
  ...gustavaxCombat,
  prepareFinalArena(){
    const s=this.state;
    s.finale ||= {order:shuffledRoute(this.seed^0x7f4a7c15).order};
    s.waves=finalWaves(s.finale.order,s.stage,s.players.length);
    s.props=[];s.pickups=[];s.neighborhoodEncounter=null;s.surpriseDone=true;s.chapterStory=false;
    s.finale.smoke=0;s.finale.debris=s.stage===6?[{x:410,y:500},{x:875,y:590}]:[];
    s.phaseTime=s.stage===6?5:s.stage===0?4:2.5;
  },
  finishFinalRound(){
    const s=this.state;if(s.phase==='won'||s.phase==='intro')return;
    s.hazards=[];s.allies=[];
    if(s.stage===6){s.phase='won';s.finale.defeated=true;s.score+=5000;this.event('win');return;}
    s.score+=500;
    for(const p of s.players){if(p.hp<=0)this.revivePlayer(p,.5);p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.3);if(s.stage===5)p.lives=Math.max(2,p.lives);}
    s.stage++;this.enterStreet();
    if(s.stage===6)this.event('rage',{label:'ASSEZ JOUÉ. GUSTAVAX SE LÈVE.'});
    else this.event('taunt',{x:640,y:235,label:['« Ce n’était que le début. »','« Vous abîmez mon tapis. »','« La bande, au travail ! »'][s.stage%3]});
  },
  updateFinalArena(dt){
    const f=this.state.finale;if(f)f.smoke=Math.max(0,(f.smoke||0)-dt);
  },
};
