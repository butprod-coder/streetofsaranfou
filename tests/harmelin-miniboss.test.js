import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { ENEMIES, animation } from '../game/data.js';
import { ENCOUNTER_ROSTER, wavePlan } from '../game/encounters.js';

test('Montjoie introduces Mme Harmelin after stage three with classes, paper and pen attacks', () => {
  const waves=wavePlan(5,2);
  assert.equal(waves.length,4);
  assert.equal(waves[3].bossKind,'harmelin');
  assert.equal(waves[3].miniBoss,true);
  for(const kind of ['harmelin','harmelinStudent1','harmelinStudent2','harmelinStudent3','harmelinStudent4']) assert.equal(ENCOUNTER_ROSTER.includes(kind),false);

  const game=new Simulation(['jo'],5,83);
  game.state.stage=2;game.enterStreet();game.state.wave=game.state.waves.length-2;game.spawnWave();
  const teacher=game.state.enemies.find(enemy=>enemy.kind==='harmelin');
  assert.ok(teacher?.miniBoss);
  game.state.bossCinema=null;
  for(const [index,kind] of ['harmelinClass','harmelinPaper','harmelinPens'].entries()){
    teacher.attackCount=index;teacher.cooldown=0;game.startMiniBossPattern(teacher,game.state.players[0]);
    assert.equal(teacher.pattern.kind,kind);
    game.updateMiniBoss(teacher,teacher.pattern.windup+.02);
    if(kind==='harmelinClass'){
      const classLine=game.state.enemies.filter(enemy=>enemy.harmelinRush);
      assert.deepEqual(classLine.map(enemy=>enemy.kind).sort(),['harmelinStudent1','harmelinStudent2','harmelinStudent3','harmelinStudent4']);
      assert.ok(classLine.every(enemy=>enemy.owner===teacher.id&&enemy.rushLife>0));
      const player=game.state.players[0],student=classLine[0],health=player.hp;
      student.x=player.x-30;student.y=player.y;student.chargeFacing=1;student.speed=500;student.rushHit=false;player.invincible=0;
      game.updateHarmelinStudent(student,.02);
      assert.ok(student.rushHit&&player.hp<health,'the class charge shoulder-checks the player');
    }
    if(kind==='harmelinPaper') assert.ok(game.state.hazards.some(h=>h.kind==='harmelinPaper'&&h.enemy));
    if(kind==='harmelinPens') assert.equal(game.state.hazards.filter(h=>h.kind==='harmelinPen'&&h.enemy).length,3);
    teacher.pattern=null;
  }

  assert.equal(animation('harmelin','special',true)[0].url,'/assets/boss/college_montjoie/harmelin.png');
  for(let i=1;i<=4;i++) assert.equal(animation(`harmelinStudent${i}`,'walk',true)[0].url,'/assets/boss/college_montjoie/students.png');
  assert.ok(ENEMIES.harmelin.storyBossOnly&&ENEMIES.harmelinStudent1.summonOnly);
});

test('Harmelin phase two calls one principal and six stronger students',()=>{
 const g=new Simulation(['jo'],5,83);g.state.stage=2;g.enterStreet();g.state.wave=g.state.waves.length-2;g.spawnWave();g.state.bossCinema=null;
 const b=g.state.enemies.find(e=>e.kind==='harmelin');b.hp=b.maxHp*.4;g.updateMiniBoss(b,.02);
 const students=g.state.enemies.filter(e=>e.harmelinRush);assert.equal(students.length,6);assert.ok(students.every(e=>e.enraged&&e.speed>ENEMIES[e.kind].speed&&e.power>ENEMIES[e.kind].power));assert.equal(g.state.enemies.filter(e=>e.kind==='harmelinProviseur').length,1);
 g.summonHarmelinProviseur(b);assert.equal(g.state.enemies.filter(e=>e.kind==='harmelinProviseur').length,1);assert.equal(ENCOUNTER_ROSTER.includes('harmelinProviseur'),false);
 const principal=g.state.enemies.find(e=>e.kind==='harmelinProviseur'),p=g.state.players[0];principal.x=p.x+60;principal.y=p.y;principal.cooldown=0;principal.invincible=0;g.updateEnemyAction(principal,.02);assert.ok(principal.attack);
});
