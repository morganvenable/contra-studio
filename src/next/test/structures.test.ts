/**
 * Proof that the core is not tied to contra duple minor: other formations,
 * progressions and music structures are data the same fold runs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Dance } from '../../types.ts';
import { physicalCheck } from '../core/check.ts';
import { SET } from '../core/config.ts';
import type { Figure, FigureCall } from '../core/figure.ts';
import { settle } from '../core/figure.ts';
import { compileFold } from '../core/fold.ts';
import { THREE_COUPLE_SET, WHOLE_SET_LONGWAYS } from '../core/formation.ts';
import { METERS, type MusicStructure } from '../core/music.ts';
import { NO_PROGRESSION, WHOLE_SET_PROGRESSION } from '../core/progression.ts';
import { body } from '../core/state.ts';
import { progress, smooth } from '../core/math.ts';
import { FIGURES } from '../figures/index.ts';
import { call, near } from './helpers.ts';

const DANCE: Dance = {
  id: 'proof', title: 'Proof', author: 'test', formation: 'duple-improper', description: '', figures: [],
};

test('a three-couple set, AABB waltz in 3/4, no progression, once through', () => {
  const music: MusicStructure = {
    meter: METERS['3/4'],
    parts: ['A1', 'A2', 'B1', 'B2'].map((name) => ({ name, bars: 8 })),
    times: 1,
  };
  const calls: FigureCall[] = [
    call('circle', 24, { direction: 'left', amount: 1 }),
    call('circle', 24, { direction: 'right', amount: 1 }),
    call('circle', 24, { direction: 'left', amount: 0.5 }),
    call('circle', 24, { direction: 'right', amount: 0.5 }),
  ];
  const start = THREE_COUPLE_SET.start(3);
  const dance = compileFold({
    dance: DANCE, calls, start, registry: FIGURES, progression: NO_PROGRESSION, music,
  });
  assert.equal(dance.totalBeats, 96, '32 bars of three beats');
  assert.equal(dance.repeatable, false, 'done once through');
  assert.deepEqual(physicalCheck(dance, { rounds: 1 }).problems, []);
  const halfway = dance.sample(72);
  near(halfway.poses[0].position, { x: -SET.halfWidth, z: -SET.slot }, 'half way round, 1st lark is opposite');
  const end = dance.sample(500);
  for (const id of start.dancers.map((d) => d.id)) near(end.poses[id].position, body(start, id).position);
  assert.deepEqual(dance.round(0).end.groups, start.groups, 'same set, same people');
});

/** Test-only figure: the 1st couple casts down outside to the bottom; the rest move up. */
const castToBottom: Figure<Record<string, never>> = (state, _params, beats) => {
  const top = state.positions.get('1st couple');
  if (!top) throw new Error('No 1st couple to cast.');
  const couples = state.dancers.length / 2;
  const motion = (beat: number) => ({
    bodies: state.dancers.map((d) => {
      const b = body(state, d.id);
      const t = beat / beats;
      const travel = progress((t - 0.2) / 0.6);
      if (!top.includes(d.id)) {
        return { id: d.id, position: { x: b.position.x, z: b.position.z + SET.slot * travel }, yaw: b.yaw };
      }
      // Step out of the line first, travel down outside it, then step back in.
      const out = Math.sign(b.position.x) * 0.7 * Math.min(smooth(t / 0.2), smooth((1 - t) / 0.2));
      const down = (couples - 1) * SET.slot * travel;
      return { id: d.id, position: { x: b.position.x + out, z: b.position.z - down }, yaw: b.yaw };
    }),
    contacts: [],
  });
  return { kind: 'promenade', motion, exit: settle(state, motion, beats) };
};

test('whole-set longways in 6/8 with an odd B part: the top couple casts to the bottom each time', () => {
  const music: MusicStructure = {
    meter: METERS['6/8'],
    parts: [{ name: 'A', bars: 8 }, { name: 'B', bars: 12 }],
    times: 3,
  };
  const calls: FigureCall[] = [
    call('cast-to-bottom', 16, {}),
    call('circle', 12, { direction: 'left', amount: 0.5 }),
    call('circle', 12, { direction: 'right', amount: 0.5 }),
  ];
  const start = WHOLE_SET_LONGWAYS.start(3);
  assert.deepEqual(start.positions.get('1st couple'), [0, 1]);
  const dance = compileFold({
    dance: DANCE,
    calls,
    start,
    registry: { ...FIGURES, 'cast-to-bottom': castToBottom },
    progression: WHOLE_SET_PROGRESSION,
    music,
  });
  assert.equal(dance.totalBeats, 40, '8 + 12 bars of two beats');
  assert.equal(dance.repeatable, true);
  assert.deepEqual(physicalCheck(dance, { rounds: 3 }).problems, []);
  assert.deepEqual(dance.round(0).end.positions.get('1st couple'), [2, 3], 'couple 2 is now at the top');
  assert.deepEqual(dance.round(0).end.positions.get('3rd couple'), [0, 1]);
  const home = dance.sample(3 * 40);
  for (const id of start.dancers.map((d) => d.id)) near(home.poses[id].position, body(start, id).position);
});
