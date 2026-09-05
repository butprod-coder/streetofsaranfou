import * as THREE from 'three';
import { CHARACTERS, LOCATIONS, ENEMY_ARCHETYPES, character, asset, charFrame } from './data.js';
import { DuoNetwork } from './network.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random() * (b-a);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);

class Sounds {
  constructor(){ this.ctx=null; }
  wake(){ if(!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)(); this.ctx.resume?.(); }
  tone(freq=120,duration=.08,type='square',volume=.035,slide=0){
    this.wake(); const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);
    g.gain.setValueAtTime(volume,t); g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t+duration);
  }
  hit(heavy=false){ this.tone(heavy?78:112,heavy?.16:.08,'square',heavy?.06:.035,-45); }
  confirm(){ this.tone(380,.06,'square',.025,180); }
  special(){ this.tone(110,.35,'sawtooth',.05,520); }
  hurt(){ this.tone(82,.18,'sawtooth',.035,-40); }
}

class SaranFou3D {
  constructor(){
    this.viewport=$('#viewport');
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.1;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.viewport.appendChild(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,180);
    this.clock=new THREE.Clock();
    this.loader=new THREE.TextureLoader();
    this.textureCache=new Map();
    this.sounds=new Sounds();
    this.keys={}; this.touch={}; this.prevInput={}; this.remoteInput={};
    this.players=[]; this.enemies=[]; this.fx=[]; this.worldObjects=[];
    this.running=false; this.paused=false; this.authority=true; this.guestMode=false;
    this.mode='solo'; this.level=0; this.wave=0; this.score=0; this.entitySeq=1;
    this.pendingSelection={local:null,remote:null}; this.lastSnapshot=0;
    this.network=new DuoNetwork({
      open:role=>this.onNetworkOpen(role), data:data=>this.onNetworkData(data),
      close:()=>this.onNetworkClose(), error:e=>this.networkMessage(e.message,true),
    });
    this.bindUI(); this.renderCharacters(); this.buildWorld(0,true); this.animate();
  }

  bindUI(){
    addEventListener('resize',()=>this.resize());
    addEventListener('keydown',e=>{
      const map={KeyW:'up',KeyZ:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',KeyQ:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyJ:'punch',KeyK:'kick',KeyL:'special',Space:'jump'};
      if(map[e.code]){this.keys[map[e.code]]=true;e.preventDefault();this.sounds.wake();}
      if(e.code==='Escape'&&this.running)this.togglePause();
    });
    addEventListener('keyup',e=>{
      const map={KeyW:'up',KeyZ:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',KeyQ:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyJ:'punch',KeyK:'kick',KeyL:'special',Space:'jump'};
      if(map[e.code])this.keys[map[e.code]]=false;
    });
    $$('[data-action]').forEach(el=>el.addEventListener('click',()=>this.action(el.dataset.action)));
    $('#copy-code').addEventListener('click',async()=>{ try{await navigator.clipboard.writeText($('#room-code').textContent);this.toast('CODE COPIÉ !');}catch(_){this.toast('NOTE LE CODE : '+$('#room-code').textContent);} });
    $('#pause-button').addEventListener('click',()=>this.togglePause());
    $$('#touch-controls button').forEach(btn=>{
      const key=btn.dataset.key;
      const set=v=>{this.touch[key]=v;this.sounds.wake();};
      btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);set(true);});
      btn.addEventListener('pointerup',()=>set(false)); btn.addEventListener('pointercancel',()=>set(false));
    });
  }

  action(name){
    this.sounds.confirm();
    if(name==='solo'){this.mode='solo';this.pendingSelection={local:null,remote:null};this.show('select-screen');this.setSelectStatus('Joueur 1 — fais ton choix');}
    if(name==='online')this.show('online-screen');
    if(name==='how')this.show('how-screen');
    if(name==='back'){this.network.close();this.show('title-screen');this.resetOnlineUI();}
    if(name==='host')this.hostRoom();
    if(name==='join')this.joinRoom();
    if(name==='resume')this.togglePause(false);
    if(name==='quit')this.quit();
    if(name==='replay'){const chars=this.players.map(p=>p.charKey);this.startGame(chars.length?chars:[this.pendingSelection.local],this.mode);}
  }

  show(id){ $$('.screen').forEach(s=>s.classList.toggle('active',s.id===id)); }
  setSelectStatus(t){ $('#select-status').textContent=t; }
  toast(text,ms=1700){const t=$('#toast');t.textContent=text;t.classList.remove('hidden');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>t.classList.add('hidden'),ms);}

  renderCharacters(){
    $('#character-grid').innerHTML=CHARACTERS.map((c,i)=>`<button class="fighter-card" data-char="${c.key}" aria-label="Choisir ${c.name}">
      <span class="number">0${i+1}</span><img src="${asset(`assets/${c.folder}/${c.portrait}`)}" alt="${c.name}">
      <span class="card-copy"><b>${c.name}</b><em>${c.title} · ${c.special}</em><small>${c.bio}</small><span class="stats">${[1,2,3,4,5].map(n=>`<i class="${n<=c.power?'on':''}"></i>`).join('')}</span></span>
    </button>`).join('');
    $$('.fighter-card').forEach(card=>card.addEventListener('click',()=>this.chooseCharacter(card.dataset.char)));
  }

  chooseCharacter(key){
    this.sounds.confirm(); this.pendingSelection.local=key;
    $$('.fighter-card').forEach(c=>c.classList.toggle('selected',c.dataset.char===key));
    if(this.mode==='solo'){this.startGame([key],'solo');return;}
    this.network.send({type:'selected',key});
    if(this.network.role==='host'){
      this.setSelectStatus(this.pendingSelection.remote?'La bande est prête !':'En attente du choix du joueur 2…');
      this.tryStartOnline();
    }else{
      this.setSelectStatus('Choix envoyé — l’hôte prépare la rue…');
    }
  }

  roomCode(){ const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return [...Array(6)].map(()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join(''); }
  async hostRoom(){
    const code=this.roomCode(); this.mode='online'; this.pendingSelection={local:null,remote:null};
    this.showRoom(code,'Ouverture du salon…');
    try{await this.network.host(code);this.networkMessage('Salon ouvert — partage le code à ton pote.');}
    catch(e){this.networkMessage(e.message,true);}
  }
  async joinRoom(){
    const code=$('#room-input').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(code.length<4){this.networkMessage('Entre le code donné par ton pote.',true);return;}
    this.mode='online'; this.pendingSelection={local:null,remote:null}; this.showRoom(code,'Connexion au salon…');
    try{await this.network.join(code);}catch(e){this.networkMessage(e.message,true);}
  }
  showRoom(code,status){$('#online-start').classList.add('hidden');$('#room-wait').classList.remove('hidden');$('#room-code').textContent=code;this.networkMessage(status);}
  networkMessage(msg,error=false){const el=$('#network-status');el.textContent=msg;el.style.color=error?'#ff6d70':'';}
  resetOnlineUI(){ $('#online-start').classList.remove('hidden');$('#room-wait').classList.add('hidden');$('#room-input').value=''; }
  onNetworkOpen(role){
    this.networkMessage(role==='host'?'Ton pote est connecté !':'Connecté ! Prépare ton combattant.');
    setTimeout(()=>{this.show('select-screen');this.setSelectStatus(role==='host'?'Joueur 1 — choisis ton combattant':'Joueur 2 — choisis ton combattant');},500);
  }
  onNetworkClose(){ if(this.running){this.paused=true;this.toast('CONNEXION PERDUE — PARTIE EN PAUSE',5000);} }
  onNetworkData(data){
    if(!data||typeof data!=='object')return;
    if(data.type==='selected'){
      this.pendingSelection.remote=data.key;
      if(this.network.role==='host'){this.setSelectStatus(this.pendingSelection.local?'La bande est prête !':'Ton pote a choisi — à toi !');this.tryStartOnline();}
    }
    if(data.type==='start'&&this.network.role==='guest')this.startGame(data.characters,'online',true);
    if(data.type==='input'&&this.network.role==='host')this.remoteInput=data.input||{};
    if(data.type==='snapshot'&&this.network.role==='guest')this.applySnapshot(data.state);
    if(data.type==='pause'&&this.network.role==='guest'){this.paused=!!data.value;this.show(this.paused?'pause-screen':null);}
    if(data.type==='end'&&this.network.role==='guest')this.finish(data.win,data.score);
  }
  tryStartOnline(){
    if(!this.pendingSelection.local||!this.pendingSelection.remote)return;
    const chars=[this.pendingSelection.local,this.pendingSelection.remote];
    this.network.send({type:'start',characters:chars}); this.startGame(chars,'online');
  }

  texture(url){
    if(this.textureCache.has(url))return this.textureCache.get(url);
    const tex=this.loader.load(url); tex.colorSpace=THREE.SRGBColorSpace; tex.magFilter=THREE.NearestFilter; tex.minFilter=THREE.LinearMipmapLinearFilter;
    this.textureCache.set(url,tex); return tex;
  }
  canvasTexture(draw,w=512,h=128){
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }

  buildWorld(index=0,menu=false){
    this.scene=new THREE.Scene(); const loc=LOCATIONS[index]||LOCATIONS[0];
    this.scene.background=new THREE.Color(loc.sky); this.scene.fog=new THREE.FogExp2(loc.fog,menu?.018:.027);
    const hemi=new THREE.HemisphereLight(loc.neon,0x171018,1.65);this.scene.add(hemi);
    const moon=new THREE.DirectionalLight(0xbad8ff,2.2);moon.position.set(-8,12,9);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);this.scene.add(moon);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(105,14),new THREE.MeshStandardMaterial({color:0x171a22,roughness:.78,metalness:.12}));
    ground.rotation.x=-Math.PI/2;ground.position.set(34,0,0);ground.receiveShadow=true;this.scene.add(ground);
    for(const z of [-5.3,5.3]){
      const walk=new THREE.Mesh(new THREE.BoxGeometry(105,.28,2.6),new THREE.MeshStandardMaterial({color:0x30333a,roughness:.9}));
      walk.position.set(34,.04,z);walk.receiveShadow=true;this.scene.add(walk);
      for(let x=-15;x<88;x+=3){const seam=new THREE.Mesh(new THREE.BoxGeometry(.035,.012,2.55),new THREE.MeshBasicMaterial({color:0x16181d}));seam.position.set(x,.19,z);this.scene.add(seam);}
    }
    for(let x=-10;x<85;x+=5){const dash=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.09),new THREE.MeshBasicMaterial({color:0xd9b852}));dash.rotation.x=-Math.PI/2;dash.position.set(x,.012,0);this.scene.add(dash);}
    const bgMat=new THREE.MeshBasicMaterial({map:this.texture(asset(loc.bg)),transparent:true,opacity:.82,depthWrite:false});
    for(let x=2;x<80;x+=26){const bg=new THREE.Mesh(new THREE.PlaneGeometry(26,14),bgMat);bg.position.set(x,6.7,-7.1);this.scene.add(bg);}
    this.addBuildings(loc); this.addStreetDetails(loc);
    this.camera.position.set(menu?-7:-5,menu?5.5:6.2,menu?10:10.5);this.camera.lookAt(menu?new THREE.Vector3(3,1.5,0):new THREE.Vector3(5,1.2,0));
  }

  addBuildings(loc){
    const colors=[0x111725,0x171525,0x191b27];
    for(let i=0;i<13;i++){
      const w=rand(4,8),h=rand(6,13),x=-10+i*7+rand(-1,1);
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,4),new THREE.MeshStandardMaterial({color:colors[i%3],roughness:.88}));b.position.set(x,h/2,-9.2);this.scene.add(b);
      for(let wy=2;wy<h-1;wy+=2.1)for(let wx=-w/2+1;wx<w/2-.4;wx+=1.4){if(Math.random()<.36)continue;const win=new THREE.Mesh(new THREE.PlaneGeometry(.58,.82),new THREE.MeshBasicMaterial({color:Math.random()<.22?loc.neon:0xf4b44d}));win.position.set(x+wx,wy,-7.19);this.scene.add(win);}
    }
  }
  addStreetDetails(loc){
    for(let x=-5;x<78;x+=12){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.1,4.6,8),new THREE.MeshStandardMaterial({color:0x191c24,metalness:.8,roughness:.35}));pole.position.set(x,2.3,-4.5);this.scene.add(pole);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),new THREE.MeshBasicMaterial({color:0xffd77a}));lamp.position.set(x,4.52,-4.5);this.scene.add(lamp);
      if(x%24<1){const light=new THREE.PointLight(0xffa640,12,8,2);light.position.copy(lamp.position);this.scene.add(light);}
    }
    for(let x=2;x<78;x+=17){
      const bin=new THREE.Mesh(new THREE.CylinderGeometry(.35,.42,.9,10),new THREE.MeshStandardMaterial({color:0x273238,metalness:.5,roughness:.6}));bin.position.set(x,.55,-4.25);bin.castShadow=true;this.scene.add(bin);
      const crate=new THREE.Mesh(new THREE.BoxGeometry(.9,.9,.9),new THREE.MeshStandardMaterial({color:0x5a321d,roughness:.9}));crate.position.set(x+rand(1.5,3),.45,4.2);crate.rotation.y=rand(-.25,.25);crate.castShadow=true;this.scene.add(crate);
    }
    const signTex=this.canvasTexture((c,w,h)=>{c.fillStyle='#080b13';c.fillRect(0,0,w,h);c.strokeStyle=`#${loc.neon.toString(16).padStart(6,'0')}`;c.lineWidth=8;c.strokeRect(6,6,w-12,h-12);c.fillStyle='#fff3d7';c.font='900 44px Impact';c.textAlign='center';c.fillText(loc.name,w/2,79);});
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(7,1.75),new THREE.MeshBasicMaterial({map:signTex,transparent:true}));sign.position.set(14,5.2,-6.95);this.scene.add(sign);
  }

  startGame(chars,mode='solo',guest=false){
    if(!chars?.[0])return;
    this.mode=mode;this.authority=!guest;this.guestMode=guest;this.running=true;this.paused=false;this.score=0;this.level=0;this.wave=0;this.players=[];this.enemies=[];this.fx=[];
    this.show(null);$('#hud').classList.remove('hidden');$('#pause-button').classList.remove('hidden');
    $('#touch-controls').classList.toggle('hidden',!matchMedia('(pointer:coarse)').matches);
    $('#p2-hud').classList.toggle('hidden',chars.length<2);
    this.startLevel(0,chars);
  }

  startLevel(index,chars=this.players.map(p=>p.charKey)){
    this.level=index;this.wave=0;this.enemies=[];this.buildWorld(index);
    this.players=chars.map((key,i)=>this.createFighter({charKey:key,id:`p${i+1}`,team:'player',x:1-i*1.2,z:i?1:-1,slot:i}));
    this.updateHud();this.chapterIntro();
    if(this.authority)setTimeout(()=>{if(this.running&&this.level===index)this.spawnWave();},2300);
  }

  chapterIntro(){
    const loc=LOCATIONS[this.level],card=$('#chapter-card');
    card.innerHTML=`<small>CHAPITRE ${this.level+1} / ${LOCATIONS.length}</small><b>${loc.name}</b><span>${loc.memory}</span>`;
    card.classList.remove('hidden');card.style.animation='none';void card.offsetWidth;card.style.animation='chapter 3.3s both';setTimeout(()=>card.classList.add('hidden'),3400);
    $('#chapter-label').textContent=`CHAPITRE ${this.level+1}`;$('#location-label').textContent=loc.name;$('#objective-label').textContent='LA RUE SE RÉVEILLE…';
  }

  createFighter(opts){
    const cfg=character(opts.charKey),group=new THREE.Group();
    const mat=new THREE.SpriteMaterial({map:this.texture(charFrame(cfg,'idle',1)),transparent:true,alphaTest:.12,color:opts.tint||0xffffff});
    const sprite=new THREE.Sprite(mat);const scale=opts.scale||1;sprite.scale.set(1.55*scale,2.28*scale,1);sprite.position.y=1.12*scale;group.add(sprite);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.54*scale,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.42,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;group.add(shadow);
    group.position.set(opts.x||0,0,opts.z||0);this.scene.add(group);
    const f={id:opts.id||`e${this.entitySeq++}`,charKey:cfg.key,cfg,group,sprite,shadow,team:opts.team||'enemy',slot:opts.slot??-1,x:opts.x||0,z:opts.z||0,y:0,vx:0,vz:0,vy:0,facing:1,hp:opts.hp||cfg.hp,maxHp:opts.hp||cfg.hp,special:100,action:'idle',actionUntil:0,lastAttack:0,lastSpecial:0,invuln:0,dead:false,boss:!!opts.boss,ai:opts.ai||null,score:opts.score||100,combo:0,lastCombo:0,frame:1,nextFrame:0,prevInput:{},targetX:opts.x||0,targetZ:opts.z||0};
    return f;
  }

  setAction(f,action,duration=300){
    f.action=action;f.actionUntil=performance.now()+duration;f.frame=1;f.nextFrame=0;this.updateFighterTexture(f,true);
  }
  updateFighterTexture(f,force=false){
    const now=performance.now();if(!force&&now<f.nextFrame)return;
    const animated=['idle','walk','run','punch','kick','jump'];let action=animated.includes(f.action)?f.action:'idle';
    const counts={idle:4,walk:4,run:6,punch:4,kick:4,jump:4};f.frame=f.frame%(counts[action]||4)+1;f.nextFrame=now+(action==='run'?75:action==='punch'?65:action==='kick'?80:action==='idle'?220:120);
    const url=charFrame(f.cfg,action,f.frame);if(url)f.sprite.material.map=this.texture(url);
    f.sprite.material.color.setHex(f.ai?.tint||0xffffff);f.sprite.material.needsUpdate=true;
  }

  spawnWave(){
    if(!this.authority||!this.running)return;
    this.wave++;
    if(this.wave<=2){
      const count=Math.min(3+this.level,6);this.toast(`VAGUE ${this.wave} — ${count} ENNEMIS`);
      for(let i=0;i<count;i++)setTimeout(()=>this.spawnEnemy(i),i*220);
    }else{this.spawnBoss();}
    this.updateHud();
  }
  spawnEnemy(i){
    if(!this.running)return;const arch=ENEMY_ARCHETYPES[(this.level+i)%ENEMY_ARCHETYPES.length];
    const e=this.createFighter({charKey:arch.char||['kikor','jo','lorenzo'][i%3],team:'enemy',x:11+rand(0,4),z:rand(-3.4,3.4),hp:Math.round(arch.hp*(1+this.level*.13)),ai:arch,score:arch.score});
    e.sprite.material.color.setHex(arch.tint);this.enemies.push(e);
  }
  spawnBoss(){
    const key=LOCATIONS[this.level].boss,cfg=character(key),hp=280+this.level*75;
    const e=this.createFighter({charKey:key,team:'enemy',x:12,z:0,hp,scale:1.32,boss:true,ai:{speed:2.55+this.level*.1,damage:15+this.level*2,tint:0xffffff},score:1500+this.level*500});
    this.enemies.push(e);this.toast(`⚠ ${cfg.name.toUpperCase()} — ${cfg.title.toUpperCase()} ⚠`,2600);this.updateHud();
  }

  readInput(remote=false){
    if(remote)return this.remoteInput||{};
    const input={};for(const k of ['up','down','left','right','punch','kick','special','jump'])input[k]=!!(this.keys[k]||this.touch[k]);
    const gp=navigator.getGamepads?.()[0];if(gp){input.left||=gp.axes[0]<-.3;input.right||=gp.axes[0]>.3;input.up||=gp.axes[1]<-.3;input.down||=gp.axes[1]>.3;input.punch||=gp.buttons[0]?.pressed;input.kick||=gp.buttons[2]?.pressed;input.special||=gp.buttons[1]?.pressed;input.jump||=gp.buttons[3]?.pressed;}
    return input;
  }
  pressed(input,key,f){return !!input[key]&&!f.prevInput[key];}

  updatePlayer(f,input,dt){
    if(f.dead)return;const now=performance.now();
    if(now>f.actionUntil&&['punch','kick','special','hurt'].includes(f.action))f.action='idle';
    const locked=['punch','kick','special','hurt'].includes(f.action)&&now<f.actionUntil;
    if(!locked){
      let dx=(input.right?1:0)-(input.left?1:0),dz=(input.down?1:0)-(input.up?1:0);const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
      const moving=dx||dz;if(dx)f.facing=Math.sign(dx);
      const boost=f.cfg.specialType==='frenzy'&&now-f.lastSpecial<4200?1.35:1;
      f.x=clamp(f.x+dx*f.cfg.speed*boost*dt,-1,17);f.z=clamp(f.z+dz*f.cfg.speed*boost*dt,-3.65,3.65);
      if(moving&&f.y===0)f.action=Math.abs(dx)>.75?'run':'walk';else if(f.y===0)f.action='idle';
      if(this.pressed(input,'jump',f)&&f.y===0){f.vy=7.2;f.action='jump';this.sounds.tone(180,.08,'square',.018,90);}
      if(this.pressed(input,'punch',f))this.playerAttack(f,'punch');
      if(this.pressed(input,'kick',f))this.playerAttack(f,'kick');
      if(this.pressed(input,'special',f))this.useSpecial(f);
    }
    if(f.y>0||f.vy>0){f.vy-=18*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;}
    f.special=clamp(f.special+9*dt,0,100);f.prevInput={...input};this.syncTransform(f);this.updateFighterTexture(f);
  }

  playerAttack(f,type){
    const now=performance.now(),heavy=type==='kick';if(now-f.lastAttack<(heavy?430:210))return;f.lastAttack=now;
    this.setAction(f,type,heavy?360:230);this.sounds.tone(heavy?105:145,.06,'square',.022,-20);
    setTimeout(()=>{if(!this.running||f.dead)return;const airborne=f.y>.2;let hits=0;
      for(const e of this.enemies){if(e.dead)continue;const dx=e.x-f.x,dz=Math.abs(e.z-f.z);if(Math.abs(dx)<(heavy?2.25:1.75)&&dz<1.15&&(airborne||Math.sign(dx)===f.facing||Math.abs(dx)<.7)){this.damage(e,Math.round(f.cfg.damage*(heavy?1.3:1)*(airborne?1.35:1)),f.facing,heavy||airborne);hits++;}}
      if(hits){const t=performance.now();f.combo=t-f.lastCombo<850?f.combo+hits:hits;f.lastCombo=t;this.toast(`${f.combo} COUPS !`,650);}
    },heavy?150:85);
  }

  useSpecial(f){
    const now=performance.now();if(f.special<45||now-f.lastSpecial<850)return;f.special-=45;f.lastSpecial=now;this.setAction(f,'special',700);this.sounds.special();
    const type=f.cfg.specialType;
    if(type==='blast'){this.radial(f,3.5,f.cfg.damage*2.25);f.hp=clamp(f.hp+18,0,f.maxHp);this.makeRing(f,0xff6a19,4);}
    if(type==='charge'||type==='roll'){const dir=f.facing;f.x=clamp(f.x+dir*4.2,-1,17);this.radial(f,2.2,f.cfg.damage*2);this.makeRing(f,type==='roll'?0x72e69c:0xffb02e,2.8);}
    if(type==='frenzy'){this.radial(f,2.6,f.cfg.damage*1.35);this.makeRing(f,0x6ad9ff,3.2);this.toast('INSTINCT DU LOUP — VITESSE MAX',1200);}
    if(type==='fire'){this.projectile(f,0xff4b22,14,f.cfg.damage*2);}
    if(type==='spin'){this.radial(f,4.2,f.cfg.damage*1.8);this.makeRing(f,0xa078ff,5);}
    if(type==='gun'){for(let i=0;i<3;i++)setTimeout(()=>this.projectile(f,0xffd65c,18,f.cfg.damage*1.25),i*140);}
    this.updateHud();
  }
  radial(f,r,dmg){for(const e of this.enemies)if(!e.dead&&distance(f,e)<r)this.damage(e,Math.round(dmg),Math.sign(e.x-f.x)||f.facing,true);}
  projectile(f,color,speed,dmg){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.1,8,8),new THREE.MeshBasicMaterial({color}));mesh.position.set(f.x,f.y+1.25,f.z);this.scene.add(mesh);
    this.fx.push({mesh,x:f.x,z:f.z,dir:f.facing,speed,dmg,life:1.4,owner:f});this.sounds.tone(170,.08,'sawtooth',.045,-100);
  }
  makeRing(f,color,size){
    const mesh=new THREE.Mesh(new THREE.RingGeometry(.35,.48,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(f.x,.06,f.z);this.scene.add(mesh);this.fx.push({mesh,ring:true,life:.55,maxLife:.55,size});
  }

  damage(target,amount,dir,heavy=false){
    const now=performance.now();if(target.dead||now<target.invuln)return;target.hp-=amount;target.invuln=now+150;target.x+=dir*(heavy?.55:.25);this.setAction(target,'hurt',heavy?440:260);this.sounds.hit(heavy);
    target.sprite.material.color.setHex(0xffffff);setTimeout(()=>{if(!target.dead)target.sprite.material.color.setHex(target.ai?.tint||0xffffff);},80);
    if(target.hp<=0)this.kill(target);this.updateHud();
  }
  kill(f){
    f.dead=true;f.hp=0;f.group.rotation.z=-f.facing*1.35;f.group.position.y=.18;f.sprite.material.opacity=.7;
    if(f.team==='enemy'){this.score+=f.score;setTimeout(()=>{this.scene.remove(f.group);this.enemies=this.enemies.filter(e=>e!==f);this.afterEnemyRemoved();},850);}
    else if(this.players.every(p=>p.dead||p.hp<=0))setTimeout(()=>this.finish(false,this.score),700);
  }
  afterEnemyRemoved(){
    this.updateHud();if(this.enemies.length)return;
    if(this.wave<3)setTimeout(()=>this.spawnWave(),900);
    else if(this.level<LOCATIONS.length-1)setTimeout(()=>this.startLevel(this.level+1),1600);
    else setTimeout(()=>this.finish(true,this.score),1200);
  }

  updateEnemies(dt){
    const now=performance.now();
    for(const e of this.enemies){
      if(e.dead){this.syncTransform(e);continue;}if(now>e.actionUntil&&['hurt','punch','kick'].includes(e.action))e.action='idle';
      const live=this.players.filter(p=>!p.dead);if(!live.length)continue;const p=live.sort((a,b)=>distance(e,a)-distance(e,b))[0],dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);
      if(!['hurt','punch','kick'].includes(e.action)||now>e.actionUntil){
        if(d>1.35){const speed=e.ai?.speed||2.5;e.x+=dx/d*speed*dt;e.z+=dz/d*speed*dt;e.facing=Math.sign(dx)||e.facing;e.action=d>4?'run':'walk';}
        else if(now-e.lastAttack>(e.boss?620:950)+Math.random()*320){e.lastAttack=now;e.facing=Math.sign(dx)||e.facing;this.setAction(e,Math.random()<.3?'kick':'punch',360);setTimeout(()=>{if(!e.dead&&distance(e,p)<1.8)this.damage(p,e.ai?.damage||10,e.facing,e.boss);},150);}
        else e.action='idle';
      }
      e.x=clamp(e.x,-1,18);e.z=clamp(e.z,-3.7,3.7);this.syncTransform(e);this.updateFighterTexture(e);
    }
  }

  updateFx(dt){
    for(const f of this.fx){f.life-=dt;if(f.ring){const k=1-f.life/f.maxLife;f.mesh.scale.setScalar(1+k*f.size);f.mesh.material.opacity=Math.max(0,1-k);continue;}f.x+=f.dir*f.speed*dt;f.mesh.position.x=f.x;
      for(const e of this.enemies){if(!e.dead&&Math.abs(e.x-f.x)<.45&&Math.abs(e.z-f.z)<.7){this.damage(e,Math.round(f.dmg),f.dir,true);f.life=0;break;}}
    }
    for(const f of this.fx.filter(x=>x.life<=0))this.scene.remove(f.mesh);this.fx=this.fx.filter(x=>x.life>0);
  }
  syncTransform(f){
    f.group.position.set(f.x,f.y,f.z);
    // Un Sprite Three.js est toujours orienté vers la caméra. On inverse son échelle
    // horizontale pour changer de direction sans retourner le personnage tête-bêche.
    f.sprite.scale.x=Math.abs(f.sprite.scale.x)*(f.facing<0?-1:1);
    f.sprite.material.rotation=0;
    f.shadow.material.opacity=f.y>.1?.18:.42;
  }

  updateHud(){
    const p1=this.players[0],p2=this.players[1];if(p1){$('#p1-name').textContent=p1.cfg.name;$('#p1-face').src=asset(`assets/${p1.cfg.folder}/${p1.cfg.portrait}`);$('#p1-hp').style.transform=`scaleX(${clamp(p1.hp/p1.maxHp,0,1)})`;$('#p1-special').style.transform=`scaleX(${p1.special/100})`;}
    if(p2){$('#p2-name').textContent=p2.cfg.name;$('#p2-face').src=asset(`assets/${p2.cfg.folder}/${p2.cfg.portrait}`);$('#p2-hp').style.transform=`scaleX(${clamp(p2.hp/p2.maxHp,0,1)})`;$('#p2-special').style.transform=`scaleX(${p2.special/100})`;}
    $('#score-value').textContent=String(this.score).padStart(6,'0');const living=this.enemies.filter(e=>!e.dead);$('#objective-label').textContent=living.length?`${living.length} ENNEMI${living.length>1?'S':''}`:this.wave<3?'TIENS-TOI PRÊT':'RUE NETTOYÉE';
  }

  snapshot(){return {level:this.level,wave:this.wave,score:this.score,players:this.players.map(f=>this.pack(f)),enemies:this.enemies.map(f=>this.pack(f))};}
  pack(f){return{id:f.id,charKey:f.charKey,x:+f.x.toFixed(2),z:+f.z.toFixed(2),y:+f.y.toFixed(2),facing:f.facing,hp:f.hp,maxHp:f.maxHp,special:f.special,action:f.action,dead:f.dead,boss:f.boss,score:f.score,tint:f.ai?.tint||0xffffff};}
  applySnapshot(s){
    if(!s||!this.running)return;if(s.level!==this.level){this.level=s.level;this.buildWorld(s.level);this.players=[];this.enemies=[];this.chapterIntro();}
    this.score=s.score;this.wave=s.wave;
    this.players=this.syncEntities(this.players,s.players,'player');this.enemies=this.syncEntities(this.enemies,s.enemies,'enemy');this.updateHud();
  }
  syncEntities(current,list,team){
    const wanted=new Set(list.map(x=>x.id));for(const f of current)if(!wanted.has(f.id))this.scene.remove(f.group);
    return list.map(data=>{let f=current.find(x=>x.id===data.id);if(!f)f=this.createFighter({...data,team,scale:data.boss?1.32:1,ai:{tint:data.tint}});f.targetX=data.x;f.targetZ=data.z;f.y=data.y;f.facing=data.facing;f.hp=data.hp;f.maxHp=data.maxHp;f.special=data.special;f.dead=data.dead;if(f.action!==data.action)this.setAction(f,data.action,260);return f;});
  }
  updateGuest(dt){
    const input=this.readInput();const now=performance.now();if(now-this.lastInputSend>45){this.lastInputSend=now;this.network.send({type:'input',input});}
    for(const f of [...this.players,...this.enemies]){f.x+=(f.targetX-f.x)*Math.min(1,dt*14);f.z+=(f.targetZ-f.z)*Math.min(1,dt*14);this.syncTransform(f);this.updateFighterTexture(f);}
  }

  togglePause(force){
    if(!this.running)return;this.paused=typeof force==='boolean'?force:!this.paused;
    if(this.paused)this.show('pause-screen');else this.show(null);
    if(this.mode==='online'&&this.network.role==='host')this.network.send({type:'pause',value:this.paused});
  }
  finish(win,score=this.score){
    if(!this.running)return;this.running=false;this.paused=false;this.score=score;
    $('#hud').classList.add('hidden');$('#pause-button').classList.add('hidden');$('#touch-controls').classList.add('hidden');
    $('#end-kicker').textContent=win?'SARAN EST CALME':'LA RUE A EU LE DERNIER MOT';$('#end-title').textContent=win?'LA BANDE EST RÉUNIE':'ON REMET ÇA ?';
    $('#end-copy').textContent=win?'Du Chêne Maillard à Montjoie, chaque coin de rue a ramené un souvenir. Les années passent. La bande reste.':'Même les légendes prennent parfois un mur. Change de combattant, appelle un poto et retourne dans la rue.';
    $('#end-score').textContent=`SCORE ${String(score).padStart(6,'0')}`;this.show('end-screen');
    if(this.authority&&this.mode==='online')this.network.send({type:'end',win,score});
  }
  quit(){
    this.running=false;this.paused=false;this.network.close();this.players=[];this.enemies=[];this.fx=[];this.mode='solo';
    $('#hud').classList.add('hidden');$('#pause-button').classList.add('hidden');$('#touch-controls').classList.add('hidden');this.resetOnlineUI();this.buildWorld(0,true);this.show('title-screen');
  }

  updateCamera(dt){
    if(!this.players.length)return;const live=this.players.filter(p=>!p.dead);if(!live.length)return;const cx=live.reduce((s,p)=>s+p.x,0)/live.length,cz=live.reduce((s,p)=>s+p.z,0)/live.length;
    const targetPos=new THREE.Vector3(cx-6.8,6.2,10.8+cz*.12);this.camera.position.lerp(targetPos,Math.min(1,dt*3.5));const look=new THREE.Vector3(cx+2.1,1.25,cz*.38);this.camera.lookAt(look);
  }
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));}
  animate(){
    requestAnimationFrame(()=>this.animate());const dt=Math.min(this.clock.getDelta(),.034);
    if(this.running&&!this.paused){
      if(this.guestMode)this.updateGuest(dt);else{
        this.updatePlayer(this.players[0],this.readInput(),dt);if(this.players[1])this.updatePlayer(this.players[1],this.readInput(true),dt);this.updateEnemies(dt);this.updateFx(dt);
        const now=performance.now();if(this.mode==='online'&&now-this.lastSnapshot>70){this.lastSnapshot=now;this.network.send({type:'snapshot',state:this.snapshot()});}
      }
      this.updateCamera(dt);
    }else if(!this.running&&this.scene){this.camera.position.x=Math.sin(performance.now()*.00012)*1.2-7;this.camera.lookAt(3,1.5,0);}
    this.renderer.render(this.scene,this.camera);
  }
}

new SaranFou3D();
