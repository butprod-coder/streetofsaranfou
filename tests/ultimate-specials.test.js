import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { TALENTS } from '../game/rogue-talents.js';
import { ULTIMATE_SPECIALS } from '../game/ultimate-specials.js';
function arena(kind,branch,rank=6){
 const g=new Simulation([kind],0,12),p=g.state.players[0];g.state.phase='fight';g.state.bossCinema=null;g.state.props=[];g.state.enemies=[];g.state.spawnQueue=[];p.x=500;p.y=550;p.energy=100;p.progression.talents=TALENTS[kind].filter(n=>n.branchIndex===branch&&n.tier<rank).map(n=>n.id);
 const e=g.spawnEnemy('remy',{x:600,y:550,hp:10000,maxHp:10000,invincible:0,cooldown:99});g.activateSpecial(p);return{g,p,e};
}
for(const kind of Object.keys(ULTIMATE_SPECIALS))for(let branch=0;branch<3;branch++)test(`${kind} branch ${branch}: separate press, cooldown, no extra energy and clean expiry`,()=>{
 const {g,p,e}=arena(kind,branch),a=p.specialState;
 if(kind==='karonux'&&branch===1)g.karonuxFrost(p,e,3);
 g.updateSpecial(p,{special:true},.016);assert.equal(a.ultimateCount,undefined,'held activation must not trigger');
 g.updateSpecial(p,{},.016);g.updateSpecial(p,{special:true},.016);assert.equal(a.ultimateCount,1);assert.equal(p.energy,0);assert.ok(a.ultimateInput.next>2);
 for(let i=0;i<60;i++){g.state.time+=1/60;g.updateSpecial(p,{special:true},1/60);g.updateWorld(1/60);}
 assert.equal(a.ultimateCount,1,'holding must not repeat');assert.ok(e.hp<10000||g.state.allies.some(m=>m.id===e.id),'attack must damage or recruit');
 g.updateSpecial(p,{},.016);g.updateSpecial(p,{special:true},.016);assert.equal(a.ultimateCount,1,'cooldown blocks another press');
 for(let i=0;i<550&&p.specialState;i++){g.state.time+=1/60;g.updateSpecial(p,{},1/60);g.updateWorld(1/60);}assert.equal(p.specialState,null);assert.equal(p.z,0);
});
test('ice detonates only frozen targets, can be reused and keeps automatic finale',()=>{
 const {g,p,e}=arena('karonux',1);const far=g.spawnEnemy('remy',{x:1100,y:550,hp:10000,maxHp:10000,invincible:0});g.updateSpecial(p,{},.016);g.karonuxFrost(p,e,3);g.updateSpecial(p,{special:true},.016);assert.equal(e.karonuxFrost,null);assert.ok(e.hp<10000);assert.equal(far.hp,10000);
 for(let i=0;i<160;i++)g.updateSpecial(p,{},1/60);g.karonuxFrost(p,far,3);g.updateSpecial(p,{special:true},.016);assert.equal(p.specialState.ultimateCount,2);assert.equal(far.karonuxFrost,null);
 g.karonuxFrost(p,far,3);p.specialState.elapsed=8.6;g.updateSpecial(p,{},.016);assert.equal(far.karonuxFrost,null);
});
test('rank five cannot use a manual ultimate and tap counters support short network presses',()=>{
 const low=arena('karonux',1,5);low.g.updateSpecial(low.p,{},.016);low.g.updateSpecial(low.p,{special:true},.016);assert.equal(low.p.specialState.ultimateCount,undefined);
 const {g,p,e}=arena('karonux',1);g.karonuxFrost(p,e,3);g.updateSpecial(p,{taps:{special:1}},.016);assert.equal(p.specialState.ultimateCount,1);g.updateSpecial(p,{taps:{special:1}},.016);assert.equal(p.specialState.ultimateCount,1);
});

test('manual ultimates preserve allies and scripted boss immunity',()=>{
 for(const kind of Object.keys(ULTIMATE_SPECIALS))for(let branch=0;branch<3;branch++){
 const {g,p}=arena(kind,branch);const partner={...g.actor('jo',2,false),x:620,y:550,hp:500,maxHp:500};g.state.players.push(partner);
 const boss=g.spawnEnemy('remyGeek',{x:600,y:550,boss:true,miniBoss:true,remyShielded:true,hp:5000,maxHp:5000,invincible:0});
 if(kind==='karonux'&&branch===1)g.karonuxFrost(p,boss,3);
 g.updateSpecial(p,{},.016);g.updateSpecial(p,{special:true},.016);
 for(let i=0;i<90;i++){g.state.time+=1/60;g.updateSpecial(p,{},1/60);g.updateWorld(1/60);}
 assert.equal(partner.hp,500,kind+branch+' friendly fire');assert.equal(boss.hp,5000,kind+branch+' shield');
 }
});
