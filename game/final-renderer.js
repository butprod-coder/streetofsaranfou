import { gustavaxPose, GUSTAVAX_BEATS } from './gustavax-animation.js';
import { CHAPTERS } from './data.js';

export function drawFinalArena(r,s){
  if(s.chapter!==6)return;
  const c=r.ctx,f=s.finale;
  c.save();
  if(s.stage<6){
    r.arcadeSprite('bossGustavax',640,427,0,208,1);
    c.font='bold 12px monospace';c.textAlign='center';c.fillStyle='#f1ce8a';c.fillText('GUSTAVAX VOUS REGARDE.',640,204);
  }else if(s.phase==='intro'){
    const breaking=s.phaseTime<3.4;
    r.arcadeSprite('bossGustavax',640,458,breaking?1:0,breaking?265:208,1);
    c.fillStyle='#050b14d9';c.fillRect(230,608,820,48);c.fillStyle='#f6d591';c.font='bold 20px monospace';c.textAlign='center';
    c.fillText(breaking?'LE BUREAU CRAQUE. LE PATRON ARRIVE.':'POINT DE REPRISE · FACE À GUSTAVAX',640,639);
  }else{
    r.arcadeSprite('bossGustavax',640,399,2,128,1);
    for(const d of f?.debris||[]){c.save();c.globalAlpha=d.broken?.5:1;r.arcadeSprite('bossGustavax',d.x,d.y,d.x<640?6:7,d.broken?32:55,d.x<640?1:-1);c.restore();}
  }
  // Six wall medallions record only the rematches completed in this room.
  for(let i=0;i<6;i++){
    const x=i<3?175+i*76:950+(i-3)*76,y=282,done=i<s.stage,kind=CHAPTERS[f?.order[i]??i].boss,img=r.assets.get(`/assets/${kind}/${kind}_p.png`);
    c.save();c.beginPath();c.arc(x,y,23,0,Math.PI*2);c.clip();c.fillStyle='#111c2d';c.fillRect(x-24,y-24,48,48);
    if(img){c.globalAlpha=done?.45:1;c.drawImage(img,x-23,y-23,46,46);}c.restore();
    c.strokeStyle=done?'#efc46c':'#77889b';c.lineWidth=2;c.beginPath();c.arc(x,y,24,0,Math.PI*2);c.stroke();
    if(done){c.beginPath();c.moveTo(x-14,y-20);c.lineTo(x+4,y-4);c.lineTo(x-5,y+5);c.lineTo(x+13,y+19);c.stroke();}
  }
  c.restore();
}


export function drawGustavax(r,a,s){
  const c=r.ctx,p=a.pattern,pose=gustavaxPose(a);
  c.save();if(a.flash>0)c.filter='brightness(1.7)';
  if(a.bossPhase===2&&s.finale?.smoke>0){c.shadowColor='#d0deed99';c.shadowBlur=7;}
  r.arcadeSprite(pose.atlas,a.x,a.y-(a.z||0),pose.frame,215,a.facing);c.restore();
  if(!p)return;
  c.save();c.strokeStyle='#ffb56b';c.fillStyle='#ff8c4525';c.lineWidth=2;
  if(p.kind==='lastWord'){
    for(const [i,mark] of (p.marks||[]).entries())if(p.elapsed<p.windup+GUSTAVAX_BEATS.lastWord[i]){
      const radius=i===4?125:75;c.beginPath();c.ellipse(mark.x,mark.y,radius,radius/1.45,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#fff0ce';c.textAlign='center';c.font='bold 13px monospace';c.fillText(i===4?'!':String(i+1),mark.x,mark.y+4);c.fillStyle='#ff8c4525';
    }
  }else if(!p.hit){
    if(p.charge||p.kind==='chairRush'){
      const x=p.kind==='chairRush'?(a.facing>0?1177:103):p.x+p.dx*610,y=p.kind==='chairRush'?p.y:p.y+p.dy*610;
      c.setLineDash([10,7]);c.lineWidth=4;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(x,y);c.stroke();c.setLineDash([]);
    }else if(p.kind==='cigarRain'){
      for(const mark of p.marks||[]){c.beginPath();c.ellipse(mark.x,mark.y,65,45,0,0,Math.PI*2);c.fill();c.stroke();}
      if(p.safeLane!=null){const x=[160,400,640,880,1120][p.safeLane];c.fillStyle='#84efbb18';c.fillRect(x-75,448,150,198);c.fillStyle='#b6edcd';c.font='bold 11px monospace';c.textAlign='center';c.fillText('PASSAGE LIBRE',x,635);}
    }else if(p.kind==='deskSlam'){
      c.beginPath();c.ellipse(a.x+a.facing*70,a.y,100,68,0,0,Math.PI*2);c.stroke();
    }else{
      const width=p.kind==='deskSweep'?225:175,band=p.kind==='deskSweep'?48:40;
      c.fillRect(a.facing>0?a.x:a.x-width,a.y-band,width,band*2);c.strokeRect(a.facing>0?a.x:a.x-width,a.y-band,width,band*2);
    }
  }
  c.restore();
}

export function drawFinalSmoke(r,s){
  if(s.chapter!==6||!(s.finale?.smoke>0))return;
  const c=r.ctx;c.save();
  const fade=Math.min(1,s.finale.smoke);
  for(let i=0;i<3;i++){
    const x=245+i*390+Math.sin(s.time*.7+i)*18,y=488+Math.sin(s.time+i)*14;
    const g=c.createRadialGradient(x,y,12,x,y,150);g.addColorStop(0,`rgba(127,143,159,${.38*fade})`);g.addColorStop(1,'#687a8a00');c.fillStyle=g;c.fillRect(x-150,y-150,300,300);
  }
  const boss=s.enemies.find(e=>e.kind==='gustavax'&&e.boss&&e.hp>0);
  if(boss){const pulse=boss.pattern?.kind==='smokeCharge'&&!boss.pattern.hit?1:0;c.shadowColor='#ff7136';c.shadowBlur=pulse?20:6;r.ellipse(boss.x+boss.facing*42,boss.y-(pulse?137:165),pulse?8+Math.sin(s.time*20)*2:4,4,'#ff6a32');}
  c.restore();
}
