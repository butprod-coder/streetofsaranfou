export function drawJoTransformation(r,p,state){
  const a=p.specialState,c=r.ctx,key=['joPallet','joFire','joWeasel'][a.branch];
  c.save();if(p.joInvisible)c.globalAlpha=.17;
  r.arcadeSprite(key,p.x,p.y-p.z,(a.rank===6?8:0)+a.pose,a.branch===0?(a.rank===6?200:150):175,p.facing);
  if(a.branch===1&&a.rank>=4&&a.heat>15)r.arcadeSprite('joFX',p.x,p.y-145,5,20+a.heat*.7,p.facing);
  if(a.branch===2&&a.elapsed<(a.dashUntil||0))r.arcadeSprite('joFX',p.x-p.facing*60,p.y-30,10,35,p.facing);c.restore();
  c.fillStyle=['#ffe09c','#ffb277','#d9b0ff'][a.branch];c.font='bold 11px monospace';c.textAlign='center';
  c.fillText(`${['TRANSPALETTE','LE ROUX','LA FOUINE'][a.branch]} · N${a.rank} · ${Math.max(0,a.duration-a.elapsed).toFixed(1)} s`,p.x,p.y-225);
  if(a.branch===1&&a.rank>=4)c.fillText(`SURCHAUFFE ${Math.round(a.heat)} %`,p.x,p.y-240);
}
