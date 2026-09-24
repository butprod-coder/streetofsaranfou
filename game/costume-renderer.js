import { COSTUME_ENEMIES } from './costume-enemies.js';

// Twelve-cell imagegen atlases share the street-enemy pose layout.
export function costumeCell(a, time) {
  if (a.hp <= 0) return 6;
  if (a.stun > 0) return 5;
  if (a.pattern) {
    if (a.kind === 'lorenzo_pigeons') return a.pattern.hit ? 4 : 7 + Math.floor(time * 10) % 2;
    if (a.kind === 'jualos_karaoke') return 7 + Math.floor(time * 8) % 2;
    return a.pattern.hit ? 8 : 3;
  }
  if (a.action === 'walk') return 1 + Math.floor(time * 8) % 2;
  return 0;
}
export function drawCostumeEnemy(a, state) {
  const b = COSTUME_ENEMIES[a.kind], c = this.ctx;
  const lift = a.kind === 'lorenzo_pigeons' && a.pattern && a.hp > 0 ? 20 + Math.sin(state.time * 10) * 5 : 0;
  this.arcadeSprite('street_' + a.kind, a.x, a.y - a.z - lift, costumeCell(a, state.time), a.kind === 'lorenzo_pigeons' ? 62 : b.height, a.facing);
  if (a.hp > 0) { c.save(); c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillStyle = b.color; c.fillText(b.name, a.x, a.y + 20); c.restore(); }
}

export function drawCostumeHazard(h,time) {
  const c=this.ctx;c.save();
  const fx = (kind, cell, x, y, width) => this.classicFX('street_' + kind, cell, x, y, width, h.facing);
  if (h.kind === 'bowlingPins' || h.kind === 'bowlingBall') {
    fx('titou_bowling', h.kind === 'bowlingPins' ? 10 : 9, h.x, h.y - 20, h.kind === 'bowlingPins' ? 68 : 44); c.restore(); return;
  }
  // Only display the attack sprites, never the collision areas or warning zones.
  if(h.delay>0){c.restore();return;}
  if(h.shape==='line'){
    if(h.kind==='hell' && h.delay<=0) for(let x=h.x+40;x<h.x+h.width;x+=90) fx('gustavax_diable', 9 + Math.floor(time * 8) % 2, x, h.y-22, 95);
    if(h.kind==='neon' && h.delay<=0) for(let x=h.x+70;x<h.x+h.width;x+=140) fx('yann_fluo',9,x,h.y,155);
    if(h.kind==='flippers') fx('karonux_plongeur',9,h.x+h.facing*90,h.y-20,100);
  }else{
    if(h.kind==='karaoke') fx('jualos_karaoke',9,h.x,h.y-35,110);
    if(h.kind==='sticky') fx('jo_rose',10,h.x,h.y-30,95);
    if(h.kind==='pigeonDive') fx('lorenzo_pigeons',10,h.x,h.y-25,90);
    if(h.kind==='stoppie') fx('kikor_velo',9,h.x,h.y-5,85);
  }
  c.restore();
}
