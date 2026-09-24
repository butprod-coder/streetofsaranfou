import { Simulation } from './simulation.js';
import { createBossPractice } from './boss-practice.js';
import { CHAPTERS, FIGHTERS, fighter, clamp } from './data.js';
import { BALANCE } from './balance.js';
import { applyProfile, xpForLevel, TALENT_MILESTONES } from './progression.js';

export const SECRET_CODE='GUSTAVAX45';
export function secretCodeMatcher(){
  let buffer='',last=0;
  return (key,now)=>{if(now-last>5000)buffer='';last=now;buffer=(buffer+key.toUpperCase()).slice(-SECRET_CODE.length);if(buffer===SECRET_CODE){buffer='';return true;}return false;};
}
export function createSecretSession(options={}){
  const chapter=clamp(Math.trunc(Number(options.chapter))||0,0,6),character=fighter(options.character).id;
  const mode=options.mode==='boss'?'boss':'level',stage=clamp(Math.trunc(Number(options.stage))||0,0,chapter===6?6:5);
  const settings={chapter,character,mode,stage,phase:Number(options.phase)||0,difficulty:['easy','normal','hard'].includes(options.difficulty)?options.difficulty:'normal',invulnerable:options.invulnerable===true,freeSpecial:options.freeSpecial===true,cinema:options.cinema!==false,boost:options.boost===true};
  const sim=mode==='boss'?createBossPractice(settings):new Simulation([character],chapter,Date.now(),{difficulty:settings.difficulty});
  sim.state.sandbox=settings;
  if(mode==='level'){sim.state.stage=stage;sim.enterStreet();}
  if(settings.boost)applyProfile(sim.state.players[0],{kind:character,xp:xpForLevel(20),milestones:TALENT_MILESTONES},false);
  return sim;
}

export function installSecretMenu(game){
  const link=document.createElement('link');link.rel='stylesheet';link.href='/styles/secret.css';document.head.append(link);
  document.querySelector('#app').insertAdjacentHTML('beforeend',`<section id="secret-code" class="screen modal-screen"><form id="secret-code-form" class="modal secret-panel"><p class="eyebrow">PORTE DÉROBÉE</p><h2>ACCÈS <em>RÉSERVÉ.</em></h2><label>Code<input id="secret-password" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20"></label><p id="secret-code-error" role="status"></p><button class="button primary" type="submit">Déverrouiller →</button><button class="text-button" type="button" data-action="home">Retour</button></form></section><section id="secret-menu" class="screen modal-screen"><div class="modal secret-panel"><p class="eyebrow">LE BUREAU DU PATRON · MENU SECRET</p><h2>LES CLÉS DE <em>SARAN.</em></h2><p class="muted">Accès libre en solo. Ces essais ne modifient ni la sauvegarde de ta tournée ni tes records.</p><div class="secret-grid"><label>Destination<select id="secret-mode"><option value="level">Jouer un niveau</option><option value="boss">Combat de boss</option></select></label><label>Combattant<select id="secret-fighter">${FIGHTERS.map(f=>`<option value="${f.id}">${f.name}</option>`).join('')}</select></label><label>Niveau / adversaire<select id="secret-chapter">${CHAPTERS.map((c,i)=>`<option value="${i}" ${i===6?'selected':''}>${i+1} · ${c.name} — ${fighter(c.boss).name}</option>`).join('')}</select></label><label id="secret-start-label">Point de départ<select id="secret-stage"></select></label><label id="secret-phase-label" hidden>Phase du boss<select id="secret-phase"></select></label><label>Difficulté<select id="secret-difficulty"><option value="easy">Balade</option><option value="normal" selected>Arcade</option><option value="hard">Sans quartier</option></select></label></div><div class="secret-options"><label><input id="secret-invulnerable" type="checkbox"> Invulnérabilité</label><label><input id="secret-special" type="checkbox"> Spécial illimité</label><label><input id="secret-boost" type="checkbox"> Niveau 20 + 8 points de talents à répartir</label><label><input id="secret-cinema" type="checkbox" checked> Voir l’entrée du boss</label></div><button class="button primary" data-action="secret-play">Ouvrir les portes →</button><button class="button secondary" data-action="secret-final">Niveau 7 · Revanches puis Gustavax →</button><div class="secret-footer"><button class="text-button" data-action="home">Retour à l’accueil</button><button class="text-button" data-action="secret-lock">Refermer le passage</button></div></div></section>`);
  const home=document.createElement('button');home.className='text-button';home.dataset.action='secret-menu';home.textContent='Le passage secret ↗';home.hidden=true;document.querySelector('.home-buttons').append(home);
  for(const id of ['pause','result'])document.querySelector(`#${id} .modal`).insertAdjacentHTML('beforeend','<button class="text-button secret-return" hidden data-action="secret-menu">Retour au menu secret</button>');
  const $=id=>document.getElementById(id);
  const sync=()=>{
    const chapter=Number($('secret-chapter').value),boss=$('secret-mode').value==='boss',kind=CHAPTERS[chapter].boss;
    $('secret-start-label').hidden=boss;$('secret-phase-label').hidden=!boss;
    $('secret-stage').innerHTML=chapter===6?'<option value="0">Les six revanches puis Gustavax</option><option value="6">Gustavax directement · trois phases</option>':Array.from({length:6},(_,i)=>`<option value="${i}">Rue ${i+1}${i===5?' · Boss':''}</option>`).join('');
    $('secret-phase').innerHTML='<option value="0">Combat complet</option><option value="1">Phase 1</option>'+BALANCE.bosses[kind].phases.map((_,i)=>`<option value="${i+2}">Phase ${i+2}</option>`).join('')+(kind==='lorenzo'?'<option value="3">Phase 3 · Canapé détruit</option>':'');
  };
  $('secret-mode').addEventListener('change',sync);$('secret-chapter').addEventListener('change',sync);sync();
  const unlock=()=>{game.secretUnlocked=true;home.hidden=false;game.audio.confirm();game.show('secret-menu');};
  const match=secretCodeMatcher();
  document.addEventListener('keydown',event=>{if(game.screen!=='home'||event.ctrlKey||event.metaKey||event.altKey||event.repeat||event.key.length!==1||event.target.closest?.('input,textarea,[contenteditable=true]'))return;if(match(event.key,performance.now()))unlock();});
  let taps=0,last=0;
  document.querySelector('.brand').addEventListener('click',event=>{if(game.screen!=='home')return;const now=performance.now();taps=now-last<900?taps+1:1;last=now;if(taps===5){event.preventDefault();event.stopImmediatePropagation();taps=0;game.show('secret-code');$('secret-password').value='';$('secret-password').focus();}});
  $('secret-code-form').addEventListener('submit',event=>{event.preventDefault();if($('secret-password').value.trim().toUpperCase()===SECRET_CODE){$('secret-code-error').textContent='';unlock();}else $('secret-code-error').textContent='Ce code n’ouvre pas la porte.';});
  game.secretOptions=()=>({mode:$('secret-mode').value,chapter:Number($('secret-chapter').value),stage:Number($('secret-stage').value),phase:Number($('secret-phase').value),character:$('secret-fighter').value,difficulty:$('secret-difficulty').value,invulnerable:$('secret-invulnerable').checked,freeSpecial:$('secret-special').checked,boost:$('secret-boost').checked,cinema:$('secret-cinema').checked});
  game.secretLock=()=>{game.secretUnlocked=false;home.hidden=true;game.quit();};
}
