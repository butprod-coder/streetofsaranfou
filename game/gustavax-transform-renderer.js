import { FLOOR } from './data.js';
export function drawGustavaxTransformation(r,p){
  const a=p.specialState,height=a.branch===0?(a.rank===6?245:a.rank>=4?210:175):a.branch===2?190:175;
  r.arcadeSprite(['gustavaxDemon','gustavaxBossForm','gustavaxWrestler'][a.branch],p.x,p.y-p.z,(a.rank===6?8:0)+Math.min(7,a.pose),height,p.facing);
  const c=r.ctx;c.fillStyle=['#ef93ff','#ffe49b','#9dcfff'][a.branch];c.font='bold 11px monospace';c.textAlign='center';c.fillText(`${['SHEITAN','LE PATRON','CATCHEUR'][a.branch]} · N${a.rank} · ${Math.max(0,a.duration-a.elapsed).toFixed(1)} s`,p.x,p.y-p.z-height-18);
}
export function drawGustavaxMinion(r,m){
  if(m.hp<=0)return;const base=m.role==='imp'?(m.id%2?0:4):m.role==='manager'?12:8;
  r.arcadeSprite('gustavaxMinions',m.x,m.y,base+(m.emerging>0&&m.role==='imp'?3:m.striking>0?2:m.action==='walk'?1:0),m.role==='imp'?80:m.role==='manager'?150:125,m.facing);
}
export function drawGustavaxWorld(r,state){
  for(const e of state.enemies)if(e.hp>0&&e.gustavaxPossessedUntil>state.time)r.arcadeSprite('gustavaxFX',e.x,e.y-140,7,35);
  if(!state.players.some(p=>p.hp>0&&p.specialState?.transformation&&p.kind==='gustavax'&&p.specialState.branch===2&&p.specialState.rank===6))return;
  const c=r.ctx;c.save();c.globalAlpha=.65;
  for(let x=FLOOR.left+90;x<FLOOR.right;x+=180){r.arcadeSprite('gustavaxFX',x,FLOOR.top-8,15,60);r.arcadeSprite('gustavaxFX',x,FLOOR.bottom+35,15,60);}
  for(const x of [FLOOR.left,FLOOR.right]){c.save();c.translate(x,(FLOOR.top+FLOOR.bottom)/2);c.rotate(Math.PI/2);r.arcadeSprite('gustavaxFX',0,0,15,85);c.restore();}c.restore();
}
