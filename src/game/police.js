import Phaser from 'phaser';
import { W, H, FLOOR_TOP, COL } from '../config/gameConfig.js';
import { CONFIG } from '../config/difficulty.js';
import { dbgLog } from '../debug/crashOverlay.js';

/** GameScene mixin: police.js */
export const policeMixin = {
  callPolice(){
    if(CONFIG.policeCharges<=0||this.phase==='win'||this.phase==='over'||this._policeActive||this._specialActive)return;
    if(this.phase==='advance'){this.floatText(W/2,FLOOR_TOP-30,'PATIENTEZ...',COL.grey);return;}
    CONFIG.policeCharges--;this.updateHUD();this._policeActive=true;
    dbgLog('police appelee, charges restantes='+CONFIG.policeCharges);
    this.policeScene();},

  policeScene(){
    const scene=this;
    // --- OVERLAY : prend tout l'ecran ---
    const ov=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setScrollFactor(0).setDepth(19000);
    // Fade in rapide vers noir
    this.tweens.add({targets:ov,fillAlpha:0.92,duration:250,onComplete:()=>{
      if(!scene.sys||!scene.sys.isActive())return;
      scene.drawPoliceScene(ov);
    }});},

  drawPoliceScene(ov){
    const scene=this;
    const Z=19100; // tout au-dessus de l'overlay
    // --- Fond de rue sombre ---
    const bg=this.add.rectangle(W/2,H/2,W,H,0x080c14,1).setScrollFactor(0).setDepth(Z-1);
    // --- Titre ---
    const title=this.add.text(W/2,38,'-- RENFORTS --',
      {fontFamily:'monospace',fontSize:'22px',fontStyle:'bold',color:'#4488ff',stroke:'#000',strokeThickness:5})
      .setOrigin(0.5).setScrollFactor(0).setDepth(Z+10);
    // --- Sol de l'ecran police ---
    const ground=this.add.rectangle(W/2,H-30,W,60,0x1a1a2e,1).setScrollFactor(0).setDepth(Z);
    const gline=this.add.rectangle(W/2,H-60,W,3,0x334466,1).setScrollFactor(0).setDepth(Z+1);

    // --- 4 flics au bas de l'ecran, qui tirent vers le haut en diagonale ---
    const copY=H-22;
    const cops=[];
    const copData=[
      {x:W*0.15,tex:'cop_shoot1',flipX:false},
      {x:W*0.38,tex:'cop_rifle', flipX:false},
      {x:W*0.62,tex:'cop_rifle2',flipX:true},
      {x:W*0.85,tex:'cop_shoot2',flipX:true},
    ];
    copData.forEach((d,i)=>{
      const c=this.add.image(d.x, copY, d.tex)
        .setOrigin(0.5,1).setScale(1.1).setScrollFactor(0).setDepth(Z+5).setFlipX(d.flipX);
      cops.push(c);
    });

    // --- Gyrophares (sirene visuelle) ---
    const siren1=this.add.rectangle(W*0.15-20,H-95,14,10,0xff2222,1).setScrollFactor(0).setDepth(Z+6);
    const siren2=this.add.rectangle(W*0.15+20,H-95,14,10,0x2222ff,1).setScrollFactor(0).setDepth(Z+6);
    let sirenTick=0;
    const sirenTimer=this.time.addEvent({delay:200,repeat:12,callback:()=>{
      sirenTick++;
      siren1.setFillStyle(sirenTick%2?0xff2222:0x440000);
      siren2.setFillStyle(sirenTick%2?0x440000:0x2244ff);
    }});

    // --- SEQUENCE DE TIRS (3 salves) ---
    const allPoliceObjs=[ov,bg,ground,gline,title,siren1,siren2,...cops];
    const doSalvo=(salvoIdx)=>{
      if(!scene.sys||!scene.sys.isActive())return;
      if(salvoIdx>=3){
        // fin des tirs -> effet et retour
        scene.time.delayedCall(400,()=>scene.endPoliceScene(allPoliceObjs,sirenTimer));
        return;}
      // Flash de tirs + roquettes
      cops.forEach((cop,ci)=>{
        scene.time.delayedCall(ci*90,()=>{
          if(!cop.scene)return;
          cop.setTexture(ci%2===0?'cop_shoot2':'cop_rifle2');
          // roquette/flamme qui monte en diagonale vers le haut
          scene.launchPoliceShell(cop.x+(cop.flipX?-40:40), copY-50, cop.flipX?-1:1, Z);
          scene.time.delayedCall(120,()=>{if(cop.scene)cop.setTexture(copData[ci].tex);});
        });
      });
      // Secousse
      if(CONFIG.shake)scene.cameras.main.shake(120,0.009);
      scene.time.delayedCall(700,()=>doSalvo(salvoIdx+1));
    };
    // Debut des tirs apres 600ms (les flics ont eu le temps d'arriver)
    this.time.delayedCall(600,()=>doSalvo(0));},

  launchPoliceShell(x,y,dir,Z){
    if(!this.sys||!this.sys.isActive())return;
    // Projectile (ligne orange qui monte)
    const sh=this.add.rectangle(x,y,6,18,0xff8800,1).setScrollFactor(0).setDepth(Z+8).setAngle(dir>0?-25:25);
    // Trajectoire : monte en diagonal vers le haut-centre
    const tx=W/2+(dir>0?Phaser.Math.Between(-120,60):Phaser.Math.Between(-60,120));
    const ty=Phaser.Math.Between(80,200);
    this.tweens.add({targets:sh,x:tx,y:ty,duration:380,ease:'Quad.easeOut',
      onComplete:()=>{
        if(!sh.scene)return;
        sh.destroy();
        // EXPLOSION au point d'impact
        this.policeExplosion(tx,ty,Z);}});},

  policeExplosion(x,y,Z){
    if(!this.sys||!this.sys.isActive())return;
    // Cercle d'explosion
    const exp=this.add.circle(x,y,8,0xff6600,1).setScrollFactor(0).setDepth(Z+9);
    const exp2=this.add.circle(x,y,4,0xffdd44,1).setScrollFactor(0).setDepth(Z+10);
    // Onde de choc
    this.tweens.add({targets:exp,radius:55,alpha:0,duration:500,onComplete:()=>{try{exp.destroy();}catch(e){}}});
    this.tweens.add({targets:exp2,radius:30,alpha:0,duration:350,onComplete:()=>{try{exp2.destroy();}catch(e){}}});
    // Flammes (3 particules)
    for(let i=0;i<4;i++){
      const fx=this.add.rectangle(x+Phaser.Math.Between(-30,30),y+Phaser.Math.Between(-20,20),
        Phaser.Math.Between(8,20),Phaser.Math.Between(8,20),0xff4400,0.9).setScrollFactor(0).setDepth(Z+9);
      this.tweens.add({targets:fx,y:fx.y-Phaser.Math.Between(30,70),alpha:0,duration:Phaser.Math.Between(300,600),
        onComplete:()=>{try{fx.destroy();}catch(e){}}});
    }
    // Screen flash blanc
    const fl=this.add.rectangle(W/2,H/2,W,H,0xffffff,0.18).setScrollFactor(0).setDepth(Z+11);
    this.tweens.add({targets:fl,alpha:0,duration:180,onComplete:()=>{try{fl.destroy();}catch(e){}}});},

  endPoliceScene(objs,timer){
    if(!this.sys||!this.sys.isActive())return;
    if(timer)timer.remove();
    // APPLIQUER les degats : tuer tous les ennemis actifs (pas le boss si phase boss)
    const killAll=this.phase!=='boss';
    this.enemies.getChildren&&this.enemies.getChildren().forEach(e=>{
      if(!e||!e.scene||!e.active||e.hp<=0||e.state2==='ko')return;
      if(!killAll&&e.bossDef)return; // en phase boss : le boss perd 70% de sa vie max
      if(!killAll&&e.bossDef){this.hurt(e,Math.round(e.hpMax*0.7),0);return;}
      this.hurt(e,99999,0);
    });
    if(this.phase==='boss'&&this.enemies.getChildren){
      this.enemies.getChildren().forEach(e=>{
        if(e&&e.scene&&e.active&&e.bossDef&&e.hp>0)
          this.hurt(e,Math.round(e.hpMax*0.7),0);
      });
    }
    // Fade out de l'overlay -> retour au jeu
    const fadeOv=this.add.rectangle(W/2,H/2,W,H,0x000000,0.85).setScrollFactor(0).setDepth(18999);
    this.tweens.add({targets:fadeOv,alpha:0,duration:500,delay:200,
      onComplete:()=>{try{fadeOv.destroy();}catch(e){}this._policeActive=false;}});
    // Detruire tous les objets de la scene police
    objs.forEach(o=>{try{if(o&&o.scene)o.destroy();}catch(e){}});}
};

