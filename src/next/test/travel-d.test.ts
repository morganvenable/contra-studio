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
