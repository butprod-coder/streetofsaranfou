export function drawLorenzoTransformation(r,p,state){
  const a=p.specialState,c=r.ctx,key=['lorenzoChimera','lorenzoPigeon','lorenzoSkull'][a.branch];
  let cell=(a.rank===6?8:0)+a.pose,height=170;
  if(a.branch===1){
    const flap=Math.floor(state.time*10)%2;
    cell=a.rank>=4?(a.rank===6?12:8)+(a.dive?2:a.pose===6?3:flap):a.dive?5:a.pose===6?6:Math.floor(state.time*10)%3;
    height=a.rank===6?180:a.rank>=4?130:90;
  }
  if(a.branch===2&&a.rank===6&&a.pose===7){c.save();c.translate(p.x,p.y-65);c.rotate(state.time*12*p.facing);r.arcadeSprite(key,0,65,15,170,p.facing);c.restore();}
  else r.arcadeSprite(key,p.x,p.y-p.z,cell,height,p.facing);
  c.fillStyle=['#d3a5ff','#d7eaff','#ffe4a2'][a.branch];c.font='bold 11px monospace';c.textAlign='center';
  c.fillText(`${['CHIMÈRE','PIGEON','CRÂNE CHAUVE'][a.branch]} · N${a.rank} · ${Math.max(0,a.duration-a.elapsed).toFixed(1)} s`,p.x,p.y-p.z-height-20);
}
export function drawLorenzoWorld(r,state){
  const c=r.ctx;
  for(const cloud of state.lorenzoClouds||[]){
    c.save();c.globalAlpha=.45;r.arcadeSprite('lorenzoFX',cloud.x,cloud.y+15,Math.floor(state.time*5+cloud.id)%4,cloud.radius);c.restore();
    if(cloud.decoy&&cloud.hp>0){c.save();c.globalAlpha=.42;r.arcadeSprite('lorenzoChimera',cloud.x,cloud.y,Math.floor(state.time*5)%2,150);c.restore();}
  }
  for(const shot of state.lorenzoShots||[]){
    const t=Math.min(1,shot.age/shot.flight),x=shot.fromX+(shot.x-shot.fromX)*t,y=shot.fromY+(shot.y-shot.fromY)*t-(shot.kind==='cigarette'?Math.sin(t*Math.PI)*80:0);
    r.arcadeSprite('lorenzoFX',x,y,shot.kind==='cigarette'?4:8+Math.floor(t*2),shot.kind==='cigarette'?24:22);
  }
  for(const h of state.hazards||[])if(h.lorenzoCigarette)r.arcadeSprite('lorenzoFX',h.x,h.y,6,25);
  for(const bird of state.lorenzoBirds||[])r.arcadeSprite('lorenzoPigeon',bird.x,bird.y-75,Math.floor(state.time*12+bird.id)%3,35,Math.cos(state.time*7+bird.orbit)>0?1:-1);
}
