import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../game/simulation.js';
import { checkpoint, restoreCheckpoint } from '../game/run-save.js';

test('only two of six streets per district have props, with one to three objects even in coop', () => {
  const schedules=new Set();
  for(const team of [['jo'],['jo','yanu']])for(let chapter=0;chapter<6;chapter++) {
    const g=new Simulation(team,chapter,991),occupied=[];
    for(let stage=0;stage<6;stage++) {
      g.state.stage=stage;g.enterStreet();
      if(g.state.props.length){occupied.push(stage);assert.ok(g.state.props.length<=3);}
    }
    assert.equal(occupied.length,2);assert.ok(!occupied.includes(5));schedules.add(occupied.join(','));
  }
  assert.ok(schedules.size>1);
});

test('random street props vary in count, type and placement without overlapping or crowding the start', () => {
  const layouts = new Set(), counts = new Set(), kinds = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const g = new Simulation(['karonux'], 0, seed); g.state.stage=1; g.enterStreet(); const props=g.state.props;
    assert.ok(props.length >= 1 && props.length <= 3); counts.add(props.length); layouts.add(JSON.stringify(props));
    assert.equal(new Set(props.map(p => p.id)).size, props.length);
    for (const [i, p] of props.entries()) {
      kinds.add(p.kind); assert.ok(p.x >= 430 && p.x <= 1100 && p.y >= 470 && p.y <= 620);
      for (const other of props.slice(i + 1)) assert.ok(Math.abs(p.x - other.x) >= 100 || Math.abs(p.y - other.y) >= 65);
    }
  }
  assert.equal(layouts.size, 100); assert.equal(counts.size, 3); assert.deepEqual(kinds, new Set(['crate', 'barrel', 'bin', 'fuelDrum', 'electricBox', 'hydrant']));
});
test('random props are deterministic per seed, survive checkpoint restoration and vary between streets', () => {
  const a = new Simulation(['jo'], 0, 321), b = new Simulation(['jo'], 0, 321); assert.deepEqual(a.state.props, b.state.props);
  const before = JSON.stringify(a.state.props); a.state.stage = 1; a.enterStreet(); assert.notEqual(JSON.stringify(a.state.props), before);
  const copy = restoreCheckpoint(JSON.parse(JSON.stringify(checkpoint(a.snapshot())))); assert.deepEqual(copy.state.props.map(p => [p.id,p.kind,p.x,p.y,p.hp,p.drop]), a.state.props.map(p => [p.id,p.kind,p.x,p.y,p.hp,p.drop]));
  for (const g of [a, copy]) { g.state.stage++; g.enterStreet(); } assert.deepEqual(copy.state.props, a.state.props);
});
