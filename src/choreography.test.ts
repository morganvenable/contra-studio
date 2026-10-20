import test from 'node:test';
import assert from 'node:assert/strict';
import {compileBecketDance, compileChoreography} from './choreography.ts';
import type {Dance} from './types.ts';

// Figure composition from Butter (Gene Hubert, Caller’s Box #10320).
// The deliberately unrelated title and ID prevent accidental name dispatch.
const fixture: Dance = {
  id: 'composition-regression', title: 'Composition regression', author: 'Gene Hubert',
  formation: 'becket', circulation: 'cw', description: 'Source-backed test sequence.',
  figures: [
    {id: '1', kind: 'becket-shift', beats: 2, label: 'Shift left', direction: 'left'},
    {id: '2', kind: 'circle', beats: 6, label: 'Circle left three quarters', who: 'all', direction: 'left', amount: .75},
    {id: '3', kind: 'swing', beats: 8, label: 'Neighbor swing', who: 'neighbor'},
    {id: '4', kind: 'long-lines', beats: 8, label: 'Long lines', who: 'all'},
    {id: '5', kind: 'robins-chain', beats: 8, label: 'Chain to partner', who: 'partner'},
    {id: '6', kind: 'hey', beats: 16, label: 'Hey', notation: '(16) Hey (WR;NL;MR;PL;WR;NL;MR)', entry: 'side-couples', exit: 'same-slots-partner-balance'},
    {id: '7', kind: 'balance', beats: 4, label: 'Partner balance', who: 'partner'},
    {id: '8', kind: 'swing', beats: 12, label: 'Partner swing', who: 'partner'}
  ]
};
const angleGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a-b), Math.cos(a-b)));

test('Becket runtime retains identity and exact boundaries through a complete finite circulation', () => {
  for (const count of [2,3,4,6,8,12]) {
    const dance = compileBecketDance(fixture, count);
    assert.equal(dance.repeatable, true);
    for (let round = 0; round <= 2*count; round++) {
      for (const boundary of [0, ...dance.starts.slice(1), 64]) {
        const beat = round*64 + boundary;
        const a = dance.sample(Math.max(0, beat-1e-6)), b = dance.sample(beat+1e-6);
        assert.equal(b.poses.length, count*2);
        for (let id = 0; id < count*2; id++) {
          assert.equal(b.poses[id].id, id);
          assert.ok(Math.hypot(a.poses[id].position.x-b.poses[id].position.x, a.poses[id].position.z-b.poses[id].position.z)<1e-4);
          assert.ok(angleGap(a.poses[id].yaw,b.poses[id].yaw)<1e-4);
        }
      }
      assert.equal(dance.topology(round*64+1.99).epoch, round);
      assert.equal(dance.topology(round*64+2).epoch, round+1);
    }
    assert.deepEqual(dance.sample(12).poses, dance.sample(2*count*64+12).poses);
    assert.deepEqual(dance.sample(1e12).poses, dance.sample(1e12%(2*count*64)).poses);
    assert.throws(() => dance.sample(Infinity), /finite/);
  }
});

test('explicit Becket schema rejects unconsumed semantics and incomplete sequences', () => {
  assert.throws(() => compileChoreography({...fixture, circulation: undefined}), /clockwise/);
  assert.throws(() => compileChoreography({...fixture, circulation: 'ccw'}), /clockwise/);
  const replace = (index: number, change: object) => ({...fixture, figures: fixture.figures.map((f,i) => i===index ? {...f,...change} : f)}) as Dance;
  assert.throws(() => compileChoreography(replace(0,{direction:'right'})), /left/);
  const compressed={...fixture,figures:fixture.figures.map((f,i)=>({...f,beats:i===0?.001:i===1?7.999:f.beats}))};
  assert.throws(() => compileChoreography(compressed), /too fast/);
  assert.throws(() => compileChoreography(replace(4,{direction:'left'})), /right-hand/);
  assert.throws(() => compileChoreography(replace(5,{notation:undefined})), /explicit/);
  assert.throws(() => compileChoreography(replace(5,{amount:.5})), /modifiers/);
  assert.throws(() => compileChoreography(replace(1,{direction:undefined})), /explicit/);
  assert.throws(() => compileChoreography({...fixture, figures:fixture.figures.slice(0,-1)}), /64-beat/);
});
