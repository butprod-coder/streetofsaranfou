// Seconds relative to the end of the wind-up. The simulation and renderer share these beats.
export const GUSTAVAX_BEATS={executiveCombo:[0,.32,.78],deskSweep:[0,.62],lastWord:[0,.5,1,1.5,2.35]};
export const GUSTAVAX_ACTIVE={executiveCombo:1.2,cigarRain:1.1,chairRush:.65,smokeCharge:.95,deskSweep:1.1,deskSlam:.75,lastWord:2.85};
export function gustavaxPose(a){
  const phase=a.bossPhase||1,atlas=['','gustavaxPatron','gustavaxSmoke','gustavaxLast'][phase];
  let frame=0;
  const p=a.pattern,t=p?Math.max(0,p.elapsed-p.windup):0;
  if(a.hp<=0)frame=15;
  else if(a.phaseChange){const t=a.phaseChange.elapsed;frame=phase===2?(t<.7?12:t<1.35?8:t<1.9?9:10):t<1?3:8;}
  else if(p){
    const prep=p.elapsed<p.windup;
    if(p.kind==='executiveCombo')frame=prep?3:t<.22?4:t<.32?3:t<.55?5:t<.78?6:7;
    if(p.kind==='cigarRain')frame=phase===1?(prep?8:9):(prep?(p.elapsed<p.windup*.5?9:10):11);
    if(p.kind==='chairRush')frame=prep?10:t<.45?10:11;
    if(p.kind==='smokeCharge')frame=prep?3:Math.floor(t*12)%3===2?6:4+Math.floor(t*12)%2;
    if(p.kind==='deskSweep')frame=prep?4:t<.25?5:t<.62?6:7;
    if(p.kind==='deskSlam')frame=prep?(p.elapsed<p.windup*.5?8:9):10;
    if(p.kind==='lastWord'){const beats=GUSTAVAX_BEATS.lastWord;const i=beats.findLastIndex(b=>t>=b);frame=prep?8:i===4?13:t-beats[Math.max(0,i)]<.24?10:9;}
  }else if(a.recovering>0)frame=0;
  else if(a.action==='hurt'&&a.actionTime<.2)frame=phase===1?12:phase===2?7:0;
  else if(a.action==='walk')frame=1+Math.floor(a.actionTime*8)%2;
  return {atlas,frame};
}
