import { FLOOR } from './data.js';
export function drawYanuTransformation(r,p,state){
  const a=p.specialState,c=r.ctx,key=['yanuBeast','yanuFluo','yanuPlant'][a.branch];
  r.arcadeSprite(key,p.x,p.y-p.z,(a.rank===6?8:0)+a.pose,a.rank===6&&a.branch===0?190:175,p.facing);
  c.fillStyle=['#ffc082','#fb9bff','#9cffb0'][a.branch];c.font='bold 11px monospace';c.textAlign='center';
  c.fillText(`${['BÊTE SAUVAGE','SOIRÉE FLUO','PLANTES CARNIVORES'][a.branch]} · N${a.rank} · ${Math.max(0,a.duration-a.elapsed).toFixed(1)} s`,p.x,p.y-p.z-195);
}
export function drawYanuWorld(r,state){
  const c=r.ctx;
  for(const p of state.players){const a=p.specialState;if(a?.kind!=='yanu'||!a.transformation||a.branch!==1||a.rank<4)continue;
    const full=a.rank===6,beat=r.reducedMotion?0:Math.max(0,1-(a.elapsed-(a.lastBeat||0))/.3);
    if(full){c.fillStyle='#09051b88';c.fillRect(0,0,1280,720);c.save();c.globalAlpha=.32;c.lineWidth=3;
      for(let i=0;i<6;i++){c.strokeStyle=i%2?'#fe54cf':'#3fecff';c.beginPath();c.moveTo(i%2?1240:40,60);c.lineTo(100+i*200+(r.reducedMotion?0:Math.sin(a.elapsed*.8+i)*65),670);c.stroke();}c.restore();}
    c.save();c.globalAlpha=.4+beat*.15;
    for(let row=0;row<(full?4:2);row++)for(let col=0;col<(full?15:3);col++){
      const x=full?FLOOR.left+35+col*80:p.x+(col-1)*70,y=full?FLOOR.top+20+row*55:p.y+(row-.5)*45;
      r.arcadeSprite('yanuFX',x,y,3,30);
    }c.restore();
  }
  for(const t of state.yanuTiles||[]){c.save();c.globalAlpha=t.pulseUntil>state.time?.8:.4;r.arcadeSprite('yanuFX',t.x,t.y,3,30);c.restore();}
  for(const plant of state.yanuPlants||[]){
    const biting=plant.biteUntil>state.time,base=plant.giant?8:4,cell=base+(biting?2:Math.floor(state.time*2+plant.id)%2);
    r.arcadeSprite('yanuFX',plant.x,plant.y,cell,plant.giant?140:75);
    if(plant.rank===6){r.arcadeSprite('yanuFX',plant.x-35,plant.y+5,13,70);r.arcadeSprite('yanuFX',plant.x,plant.y+10,12,35);}
  }
  for(const e of state.enemies)if(e.hp>0&&e.yanuRoots?.until>state.time)r.arcadeSprite('yanuFX',e.x,e.y+8,12,45);
}
