/**
 * Travel figures (round 2, group D): fast circles, waiting couples coming
 * up the hall, ovals turning back, and long lines from close line-mates.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Dance } from '../../types.ts';
import { physicalCheck } from '../core/check.ts';
import type { FigureCall } from '../core/figure.ts';
import { compileFold, foldRound } from '../core/fold.ts';
import { BECKET, IMPROPER } from '../core/formation.ts';
import { METERS } from '../core/music.ts';
import { NO_PROGRESSION } from '../core/progression.ts';
import { body, withChanges, type Body, type DanceState } from '../core/state.ts';
import { FIGURES } from '../figures/index.ts';
import { call, FACE_UP, near } from './helpers.ts';

const DANCE: Dance = {
  id: 'travel-d',
  title: 'Travel D',
  author: 'test',
  formation: 'duple-improper',
  description: '',
  figures: [],
};

const run = (calls: readonly FigureCall[], s: DanceState) => foldRound(calls, s, FIGURES).end;

/** The physical check over the calls, once through, from `start`. */
function problems(calls: readonly FigureCall[], start: DanceState) {
  const beats = calls.reduce((n, c) => n + c.beats, 0);
  const dance = compileFold({
    dance: DANCE,
    calls,
    start,
    registry: FIGURES,
    progression: NO_PROGRESSION,
    music: { meter: METERS['2/4'], parts: [{ name: 'A1', bars: beats / 2 }], times: 1 },
  });
  return physicalCheck(dance, { rounds: 1 }).problems;
}

test('a fast circle (3 places in 4 beats) closes in tighter and stays at a walk', () => {
  const s0 = IMPROPER.start(2);
  const calls = [call('circle', 4, { direction: 'left', places: 3 })];
  assert.deepEqual(problems(calls, s0), []);
  // It ends where an ordinary 8-beat circle of 3 places does.
  const slow = [call('circle', 8, { direction: 'left', places: 3 })];
  assert.deepEqual(problems(slow, s0), []);
  const end = run(calls, s0);
  const usual = run(slow, s0);
  for (const id of [0, 1, 2, 3]) {
    near(body(end, id).position, body(usual, id).position, `dancer ${id}`);
    const moved = body(end, id).position;
    const from = body(s0, id).position;
    assert.ok(Math.hypot(moved.x - from.x, moved.z - from.z) > 1, `dancer ${id} moved`);
  }
});

test('coming up the hall, a waiting couple that never went down stays put', () => {
  // Three couples: the minor set has gone down the hall (1.8 m) and faces
  // up; the waiting couple below was crossing over and stayed home, close
  // behind the line.
  const s0 = IMPROPER.start(3);
  const bodies = new Map<number, Body>(s0.bodies);
  // The line of four, 1.8 m below the minor set's middle (-0.9), 0.9 m above the waiting couple.
  [-1.35, -0.45, 0.45, 1.35].forEach((x, i) =>
    bodies.set(i, { position: { x, z: 0.9 }, yaw: FACE_UP }),
  );
  const start = withChanges(s0, { bodies });
  const calls = [call('hall', 8, { direction: 'up', end: 'ring' })];
  assert.deepEqual(problems(calls, start), []);
  const end = run(calls, start);
  for (const id of [4, 5]) near(body(end, id).position, body(s0, id).position, `dancer ${id}`);
});

test('an oval turning back the other way turns at a walking rate', () => {
  const s0 = BECKET.start(2);
  const calls = [
    call('oval', 8, { direction: 'left', half: true, facing: 'travel' }),
    call('oval', 8, { direction: 'right', half: true, facing: 'travel' }),
  ];
  assert.deepEqual(problems(calls, s0), []);
});

test('long lines from line-mates already close keep them apart', () => {
  // Line-mates 1.1 m apart (after a roll away along the line).
  const s0 = IMPROPER.start(2);
  const bodies = new Map<number, Body>(s0.bodies);
  const middle = [0, 1, 2, 3].reduce((z, id) => z + body(s0, id).position.z, 0) / 4;
  for (const id of [0, 1, 2, 3]) {
    const b = body(s0, id);
    bodies.set(id, {
      position: { x: b.position.x, z: middle + (b.position.z < middle ? -0.55 : 0.55) },
      yaw: b.position.x > 0 ? -Math.PI / 2 : Math.PI / 2,
    });
  }
  const start = withChanges(s0, { bodies });
  assert.deepEqual(problems([call('long-lines', 4, { back: false })], start), []);
});

test('promenade three quarters round the minor set: couples end facing each other along the set', () => {
  const s0 = BECKET.start(2);
  const calls = [call('promenade-around', 8, { who: 'partner', amount: 0.75 })];
  assert.deepEqual(problems(calls, s0), []);
  const end = run(calls, s0);
  for (const [lark, robin] of [
    [0, 1],
    [2, 3],
  ]) {
    const a = body(end, lark);
    const b = body(end, robin);
    assert.ok(Math.abs(a.position.z - b.position.z) < 1e-6, 'side by side across the set');
    assert.ok(Math.abs(Math.abs(a.position.x - b.position.x) - 1.8) < 1e-6, 'a place apart');
    assert.ok(Math.abs(Math.sin(a.yaw)) < 1e-6, 'facing along the set');
  }
  // The couples face each other: one at the top facing down, one at the bottom facing up.
  const z0 = body(end, 0).position.z;
  const z2 = body(end, 2).position.z;
  assert.ok(Math.abs(Math.abs(z0 - z2) - 1.8) < 1e-6);
  assert.ok(Math.cos(body(end, 0).yaw) * Math.sign(z2 - z0) > 0.99, 'couple 1 faces couple 2');
});

test('slide along the set: two places, and single file facing the way they go', () => {
  const s0 = BECKET.start(3);
  const two = run([call('slide', 4, { direction: 'left', places: 2 })], s0);
  const one = run([call('slide', 2, { direction: 'left' })], s0);
  for (const id of [0, 1]) {
    const from = body(s0, id).position;
    const dz1 = body(one, id).position.z - from.z;
    near(body(two, id).position, { x: from.x, z: from.z + 2 * dz1 }, `dancer ${id}`);
  }
  const single = [call('slide', 4, { direction: 'left', facing: 'travel' })];
  assert.deepEqual(problems(single, s0), []);
  const mid = compileFold({
    dance: DANCE,
    calls: single,
    start: s0,
    registry: FIGURES,
    progression: NO_PROGRESSION,
    music: { meter: METERS['2/4'], parts: [{ name: 'A1', bars: 2 }], times: 1 },
  }).rawSample(2);
  // Halfway, dancer 0 faces along the set, the way it walks.
  const yaw = mid.poses[0].yaw;
  const dz = body(one, 0).position.z - body(s0, 0).position.z;
  assert.ok(Math.cos(yaw) * Math.sign(dz) > 0.99, 'faces the way it walks');
  const end = run(single, s0);
  near(body(end, 0).position, body(one, 0).position, 'same place as a slide');
});

test('down the hall and slide doors: the couples of each line trade places and face up', () => {
  const s0 = IMPROPER.start(2);
  const calls = [call('hall', 8, { direction: 'down', turn: 'doors' })];
  assert.deepEqual(problems(calls, s0), []);
  const plain = run([call('hall', 8, { direction: 'down', turn: 'alone' })], s0);
  const doors = run(calls, s0);
  // Each dancer ends where a dancer of the other pair in the line would after turning alone.
  const xs = (s: DanceState) => [0, 1, 2, 3].map((id) => body(s, id).position.x);
  for (const [i, x] of xs(doors).entries()) {
    const was = xs(plain)[i];
    assert.ok(Math.abs(Math.abs(x - was) - 1.8) < 1e-6, `dancer ${i} moved one couple over`);
    assert.ok(Math.abs(Math.cos(body(doors, i).yaw) + 1) < 1e-6, 'faces up');
  }
});

test('simultaneous: two parts on different dancers at once', () => {
  const s0 = IMPROPER.start(2);
  const calls = [
    call('simultaneous', 8, {
      parts: [
        { calls: [{ move: 'swing', beats: 8, params: { who: 'partner', among: ['1s'] } }] },
        { calls: [{ move: 'swing', beats: 8, params: { who: 'partner', among: ['2s'] } }] },
      ],
    }),
  ];
  const both = run(calls, s0);
  // Each part ends where it would on its own.
  const ones = run([call('swing', 8, { who: 'partner', among: ['1s'] })], s0);
  const twos = run([call('swing', 8, { who: 'partner', among: ['2s'] })], s0);
  for (const id of [0, 1]) near(body(both, id).position, body(ones, id).position);
  for (const id of [2, 3]) near(body(both, id).position, body(twos, id).position);
  assert.throws(
    () =>
      run(
        [
          call('simultaneous', 8, {
            parts: [
              { calls: [{ move: 'swing', beats: 8, params: { who: 'partner' } }] },
              { calls: [{ move: 'circle', beats: 8, params: { direction: 'left', places: 2 } }] },
            ],
          }),
        ],
        s0,
      ),
    /Two parts move dancer/,
  );
});
