export function drawKikorTransformation(r,p,state){
  const a=p.specialState,key=['kikorPainter','kikorSummoner','kikorBike'][a.branch],c=r.ctx;
  r.arcadeSprite(key,p.x,p.y-p.z,(a.rank===6?8:0)+a.pose,a.branch===2?155:175,p.facing);
  c.fillStyle=['#ffbaf5','#9cff9d','#ffcea0'][a.branch];c.font='bold 11px monospace';c.textAlign='center';
  c.fillText(`${['PEINTRE','INVOCATEUR','CYCLISTE'][a.branch]} · N${a.rank} · ${Math.max(0,a.duration-a.elapsed).toFixed(1)} s`,p.x,p.y-p.z-195);
  if(a.branch===1&&a.rank>=3)c.fillText(['BAGARREUR','LANCEUR','PROTECTEUR'][a.role],p.x,p.y-p.z-210);
}
export function drawKikorMinion(r,m,state){
  const base=m.clone?12:m.role*4,cell=base+(m.emerging>0?3:m.striking>0?2:m.action==='walk'?1:0);
  r.arcadeSprite('kikorMinions',m.x,m.y,cell,m.clone?48:72,m.facing);
  if(m.role===2&&m.hp>0){r.ctx.save();r.ctx.globalAlpha=.25;r.arcadeSprite('kikorFX',m.x,m.y,7,85);r.ctx.restore();}
}
export function drawKikorWorld(r,state){
  const c=r.ctx;
  for(const z of state.kikorPaintZones||[]){c.save();c.globalAlpha=.55;r.arcadeSprite('kikorFX',z.x,z.y,z.radius>80?1:0,z.radius*.5);c.restore();}
  for(const pot of state.kikorPots||[]){const t=Math.min(1,pot.age/.35);r.arcadeSprite('kikorFX',pot.fromX+(pot.x-pot.fromX)*t,pot.fromY+(pot.y-pot.fromY)*t-Math.sin(t*Math.PI)*75,4,35);}
  for(const d of state.kikorDrawings||[]){
    c.save();c.globalAlpha=.7;r.arcadeSprite('kikorFX',d.wallX,d.wallY,8+d.variant*2,95);c.restore();
    if(d.age>=.35)r.arcadeSprite('kikorFX',d.x,d.y-(d.variant===1?65:0),9+d.variant*2,110,1);
  }
}
