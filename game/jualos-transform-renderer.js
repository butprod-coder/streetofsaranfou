export function drawJualosTransformation(r,p,state){
  const a=p.specialState,c=r.ctx,key=['jualosCommercial','jualosPig','jualosGuitar'][a.branch];
  const height=a.branch===1?(a.rank===6?205:130):175,cell=(a.rank===6?8:0)+a.pose;
  if(a.branch===1&&a.pose===5){c.save();c.translate(p.x,p.y-65);c.rotate(state.time*10*p.facing);r.arcadeSprite(key,0,65,cell,height,p.facing);c.restore();}
  else r.arcadeSprite(key,p.x,p.y-p.z,cell,height,p.facing);
  c.fillStyle=['#ffe0a1','#ffa5ba','#dab5ff'][a.branch];c.font='bold 11px monospace';c.textAlign='center';
  c.fillText(`${['COMMERCIAL','GROS PORC','GUITARISTE'][a.branch]} · N${a.rank} · ${Math.max(0,a.duration-a.elapsed).toFixed(1)} s`,p.x,p.y-p.z-height-20);
}
export function drawJualosWorld(r,state){
  for(const p of state.players){const a=p.specialState;if(a?.kind!=='jualos'||!a.transformation||a.branch!==2||a.rank<4)continue;
    r.arcadeSprite('jualosFX',p.x-p.facing*95,p.y+12,a.rank===6?1:0,a.rank===6?150:95);
    if(a.rank===6){r.arcadeSprite('jualosFX',p.x-200,p.y+20,2,140);r.arcadeSprite('jualosFX',p.x+200,p.y+20,3,140,-1);}
  }
  for(const w of state.jualosWaves||[])r.arcadeSprite('jualosFX',w.x,w.y+20,w.rank===6?7:w.rank>=4?6:w.rank>=2?5:4,w.radius*2,w.direction);
  for(const a of state.allies||[])if(a.recruit&&a.hp>0){r.arcadeSprite('jualosFX',a.x,a.y-145,10,25);r.ctx.fillStyle='#081b15';r.ctx.fillRect(a.x-25,a.y-144,50,4);r.ctx.fillStyle='#72ffa1';r.ctx.fillRect(a.x-25,a.y-144,50*a.hp/a.maxHp,4);}
}
