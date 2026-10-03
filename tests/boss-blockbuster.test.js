import test from 'node:test';
import assert from 'node:assert/strict';
import {createBossPractice} from '../game/boss-practice.js';
import {STEP} from '../game/data.js';
test('Jualos escapes sustained spam with a telegraphed counter and a finite punish window',()=>{
 const sim=createBossPractice({chapter:5,phase:1,invulnerable:false}),e=sim.state.enemies[0],p=sim.state.players[0];sim.state.bossCinema=null;e.x=p.x+100;e.y=p.y;e.recovering=0;e.guardBreakReadyAt=99;
 for(let i=0;i<4;i++){sim.state.time+=.15;sim.damage(e,10,p,false);}
 assert.ok(e.cinematicCounter);const hp=p.hp;p.invincible=0;p.z=0;
 sim.updateBossBlockbuster(e,.5);sim.updateWorld(STEP);assert.equal(p.hp,hp);
 sim.updateBossBlockbuster(e,.31);sim.updateWorld(STEP);assert.ok(p.hp<hp);
 sim.updateBossBlockbuster(e,.5);assert.equal(e.cinematicCounter,null);assert.ok(e.recovering>0);
 for(let i=0;i<10;i++)sim.damage(e,1,p,false);assert.equal(e.cinematicCounter,null);
});
test('counter snapshots are deterministic and dodgeable',()=>{
 const sim=createBossPractice({chapter:5,phase:2}),e=sim.state.enemies[0],p=sim.state.players[0];sim.state.bossCinema=null;e.pattern=null;e.recovering=0;e.guardBreakReadyAt=99;e.x=p.x+80;e.y=p.y;
 for(let i=0;i<4;i++){sim.state.time+=.1;sim.damage(e,1,p,false);}
 const clone=createBossPractice({chapter:5,phase:2});clone.state=structuredClone(sim.state);clone.seed=sim.seed;clone.nextId=sim.nextId;
 for(const s of [sim,clone]){s.state.players[0].z=65;s.state.players[0].invincible=0;s.updateBossBlockbuster(s.state.enemies[0],.81);s.updateWorld(STEP);}
 assert.deepEqual(clone.state,sim.state);assert.equal(p.hp,p.maxHp);
});
test('Djé Caro and Yinyin windups no longer emit help messages',()=>{
 const sim=createBossPractice({chapter:5});sim.state.bossCinema=null;sim.state.enemies=[];sim.state.phase='fight';const p=sim.state.players[0];
 for(const kind of ['dje','caro','yinyin']){const e=sim.spawnEnemy(kind,{x:p.x+75,y:p.y,cooldown:0,invincible:0});sim.state.enemies=[e];sim.state.events=[];sim.updateNewEnemy(e,STEP);assert.ok(e.newPattern);assert.equal(sim.state.events.some(e=>e.type==='opening'),false);}
});
