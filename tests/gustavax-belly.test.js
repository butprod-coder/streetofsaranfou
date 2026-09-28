import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../game/simulation.js';
test('ultimate wrestler jumps freely and Circle slams the whole arena once',()=>{
 const g=new Simulation(['gustavax'],0,1),p=g.state.players[0];g.state.phase='fight';g.state.bossCinema=null;p.energy=100;p.progression.talents=Array.from({length:6},(_,i)=>`gustavax_v3_2_${i}`);g.beginGustavaxTransformation(p);
 const a=g.spawnEnemy('harmelinProviseur',{x:p.x+500,y:p.y,invincible:0}),hp=a.hp;
 g.updateSpecial(p,{jump:true},.016);g.updateSpecial(p,{},.2);assert.ok(p.z>0);assert.equal(a.hp,hp);
 g.updateSpecial(p,{special:true},.016);assert.ok(p.specialState.bellyJump.slam);g.updateSpecial(p,{},.21);assert.equal(p.z,0);assert.ok(a.hp<hp);assert.equal(p.specialState.bellyJump,null);
 const after=a.hp;g.updateSpecial(p,{special:true},.016);assert.equal(a.hp,after);
});
