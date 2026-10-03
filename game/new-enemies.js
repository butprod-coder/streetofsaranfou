import { NEW_ENEMIES } from './new-enemies-data.js';
import { clamp, FLOOR } from './data.js';
import { difficulty } from './balance.js';

export const newEnemies = {
  updateNewEnemy(e, dt) {
    if (!NEW_ENEMIES[e.kind]) return false;
    const s = this.state;
    if (e.hp <= 0 || e.stun > 0 || e.attack || e.z > 0 || e.grabbedBy || !['fight', 'surprise'].includes(s.phase)) {
      if (e.hp <= 0 || e.stun > 0 || e.grabbedBy) e.newPattern = null;
      return true;
    }
    const target = s.players.filter(p => p.hp > 0 && !p.joInvisible).sort((a,b) => Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
    if (!target) return true;
    if (e.newPattern) {
      const p = e.newPattern; p.elapsed += dt; e.moving = false;
      e.action = ['pipe', 'pan'].includes(p.kind) ? 'punch' : 'special';
      if (p.elapsed < p.windup) return true;
      if (!p.fired) {
        p.fired = true;
        const line = (kind, width, band, power = 1) => this.hazard(e, { kind, shape: 'line', x: e.x, y: p.targetY, facing: p.facing, width, band, delay: 0, ttl: .14, pulse: 5, damage: e.power * power });
        if (p.kind === 'cash') this.hazard(e, { kind: 'yinyinCash', x: e.x + p.facing * 35, y: p.targetY, radius: 24, vx: p.facing * 320, delay: 0, ttl: 1.5, pulse: 5, damage: e.power * .35, corrupt: true });
        else if (p.kind === 'eat') {
          const heal = Math.min(e.maxHp - e.hp, Math.round(e.maxHp * .15)); e.hp += heal;
        } else if (p.kind === 'stretch') line('djeStretch', 370, 25, 1.2);
        else if (p.kind === 'wheel') {
          p.ramX = e.x;
          p.hazard = this.hazard(e, { kind: 'wheelRush', shape: 'line', x:e.x, y:p.targetY, facing:p.facing, width:65, band:32, vx:p.facing*520, delay:0, ttl:.65, pulse:5, damage:e.power*1.3, knockback:350 }).id;
        } else line(p.kind === 'pipe' ? 'pipeStrike' : 'panStrike', p.width, p.band);
      }
      if (p.kind === 'wheel' && p.elapsed < p.windup + .65) {
        e.x = clamp(p.ramX + p.facing * Math.min(.65,p.elapsed-p.windup)*520, FLOOR.left,FLOOR.right); e.y=p.targetY;
      }
      if (p.elapsed >= p.windup + (p.kind === 'wheel' ? .75 : .4)) {
        e.newPattern = null; e.cooldown = p.kind === 'eat' ? 3.5 : 1.7 * difficulty(s.difficulty).recovery; e.recovering = .5;
      }
      return true;
    }
    if (e.recovering > 0) return true;
    const dx = target.x-e.x, dy=target.y-e.y;
    e.facing = Math.sign(dx)||e.facing;
    const occupied = s.enemies.filter(a=>a.hp>0&&(a.newPattern||a.pattern||a.attack&&!a.attack.hit)).length;
    if (e.cooldown <= 0 && occupied < (s.players.length>1?3:2)) {
      let kind, width=125, band=38, windup=.7, label;
      if (e.kind === 'caro' && e.hp < e.maxHp*.75 && s.time >= (e.eatReadyAt||0)) {
        kind='eat'; windup=1.5; label='ELLE MANGE · INTERROMPS-LA !'; e.eatReadyAt=s.time+8;
      } else if (e.kind==='yinyin' && Math.abs(dx)<480 && Math.abs(dy)<35) {
        kind=(e.newAttackCount||0)%2 || Math.abs(dx)>135?'cash':'pipe'; width=135;
        label=kind==='cash'?'BILLETS · SAUTE OU CHANGE DE LIGNE !':'COUP DE TUYAU !';
      } else if (e.kind==='caro' && Math.abs(dx)<125 && Math.abs(dy)<38) { kind='pan'; label='COUP DE POÊLE !'; }
      else if (e.kind==='dje' && Math.abs(dx)<370 && Math.abs(dy)<25) { kind='stretch'; width=370; band=25; windup=.95; label='MEMBRE ÉLASTIQUE · CHANGE DE LIGNE !'; }
      else if (e.kind==='karmoilefion' && Math.abs(dx)<390 && Math.abs(dy)<32) { kind='wheel'; width=390; band=32; windup=1.05; label='CHARGE EN FAUTEUIL · CHANGE DE LIGNE !'; }
      if (kind) {
        e.newAttackCount=(e.newAttackCount||0)+1;
        e.newPattern={kind,elapsed:0,windup:windup*difficulty(s.difficulty).telegraph,facing:e.facing,targetY:e.y,width,band,fired:false};
        e.actionTime=0; e.action=['pipe','pan'].includes(kind)?'punch':'special';
        if(!['dje','caro','yinyin'].includes(e.kind))this.event('opening',{x:e.x,y:e.y-180,label}); return true;
      }
    }
    const distance = e.kind==='dje'?230:e.kind==='karmoilefion'?260:e.kind==='yinyin'?100:80;
    const desired=clamp(target.x-e.facing*distance,FLOOR.left,FLOOR.right), length=Math.max(1,Math.hypot(desired-e.x,dy*1.4));
    e.moving=Math.abs(desired-e.x)>12||Math.abs(dy)>10; e.action=e.moving?'walk':'idle';
    if(e.moving){e.x=clamp(e.x+(desired-e.x)/length*e.speed*dt,FLOOR.left,FLOOR.right);e.y=clamp(e.y+dy/length*e.speed*.8*dt,FLOOR.top,FLOOR.bottom);}
    return true;
  },
};
