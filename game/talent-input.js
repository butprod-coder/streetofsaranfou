// Short, deterministic anticipation window. Stores only input, never damage.
export function bufferTalentInput(p,input,dt){
  const a=p.specialState,buffer=a.inputBuffer||={},previous=a.inputPrevious||={};
  const result={...input,taps:{...input.taps}};
  for(const key of ['punch','kick','jump','dodge']){
    const tap=input.taps?.[key]||0,fresh=!!input[key]&&!previous[key]?.held||tap>(previous[key]?.tap||0);
    previous[key]={held:!!input[key],tap};
    const cooldown=key==='punch'?'nextAttack':key==='kick'&&p.kind==='karonux'&&a.branch===0?'nextDodge':key==='kick'?'nextHeavy':key==='jump'?'nextJump':'nextDodge';
    const until=a[cooldown]||0;
    if(fresh&&tap>(a.taps?.[key]||0)&&!input[key]&&until<=a.elapsed+dt){result[key]=true;if(a.held)a.held[key]=false;}
    if(buffer[key])buffer[key]-=dt;
    if(fresh&&until>a.elapsed&&until-a.elapsed<=.16)buffer[key]=.16;
    if(buffer[key]>0&&a.elapsed+dt>=until&&!a.grip&&!a.air&&!a.dive&&!a.leap&&!a.hop&&!a.ultimateRush){
      result[key]=true;if(a.held)a.held[key]=false;delete buffer[key];
    }else if(buffer[key]<=0)delete buffer[key];
  }
  return result;
}
