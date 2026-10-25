/**
 * Circles, chains, passes and shifts added for the whole-library import:
 * left-hand chains (the mirror of a chain), single-file circles, mad robins
 * by halves, rolls inside a ring, and the looser reading of rows that carry
 * notes or name two figures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Dance } from '../../types.ts';
import { physicalCheck } from '../core/check.ts';
import type { FigureCall } from '../core/figure.ts';
import { compileFold, foldRound } from '../core/fold.ts';
import { BECKET, IMPROPER } from '../core/formation.ts';
import { METERS } from '../core/music.ts';
import { parseRow } from '../core/parse.ts';
import { NO_PROGRESSION } from '../core/progression.ts';
import { body, type DanceState } from '../core/state.ts';
import { FIGURES } from '../figures/index.ts';
import { call, facing, FACE_EAST, FACE_WEST, near } from './helpers.ts';

const DANCE: Dance = {
  id: 'group-c',
  title: 'Group C',
  author: 'test',
  formation: 'duple-improper',
  description: '',
  figures: [],
};

const run = (calls: readonly FigureCall[], s: DanceState) => foldRound(calls, s, FIGURES).end;
const pos = (s: DanceState, id: number) => body(s, id).position;

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

const row = (text: string, beats = 8) =>
  parseRow({ text, beats }).map(({ move, beats: b, params }) => ({ move, beats: b, params }));

test('robins left-hand chain: the mirror image of a chain, robins on the larks left', () => {
  const s0 = IMPROPER.start(2);
  const right = run([call('chain', 8, { who: 'robins' })], s0);
  const left = run([call('chain', 8, { who: 'robins', hand: 'left' })], s0);
  // Robin 1 (id 1, west) crosses east to lark 1 (id 0) in both.
  for (const s of [right, left]) {
    assert.ok(pos(s, 1).x > 0.8, 'robin 1 crossed to the east side');
    assert.ok(pos(s, 3).x < -0.8, 'robin 2 crossed to the west side');
  }
  // Facing west on the east side, a dancer's right is toward +z... the left
  // chain puts the robin on the other side of her courtesy turner.
  near(pos(left, 1), { x: pos(right, 1).x, z: pos(right, 0).z }, 'robin where the lark was');
  near(pos(left, 0), { x: pos(right, 0).x, z: pos(right, 1).z }, 'lark where the robin was');
  facing(body(left, 1).yaw, FACE_WEST);
  facing(body(left, 3).yaw, FACE_EAST);
  assert.deepEqual(problems([call('chain', 8, { who: 'robins', hand: 'left' })], s0), []);
  // The pull by is by left hands.
  const r = FIGURES.chain(s0, { who: 'robins', hand: 'left' }, 8);
  const pull = r.motion(2).contacts.find((c) => c.a % 2 === 1 && c.b % 2 === 1);
  assert.equal(pull?.handA, 'left');
});

test('single-file circle: same ring path, no hands, ends facing in', () => {
  const s0 = BECKET.start(2);
  const ring = run([call('circle', 4, { direction: 'left', places: 2 })], s0);
  const single = run([call('circle', 4, { direction: 'left', places: 2, singleFile: true })], s0);
  for (const id of [0, 1, 2, 3]) {
    near(pos(single, id), pos(ring, id));
    facing(body(single, id).yaw, body(ring, id).yaw);
  }
  const r = FIGURES.circle(s0, { direction: 'left', places: 2, singleFile: true }, 4);
  assert.equal(r.motion(2).contacts.length, 0);
  assert.deepEqual(problems([call('circle', 8, { direction: 'left', places: 3, singleFile: true })], s0), []);
});

test('mad robin ½ trades the two on each side line; twice comes home', () => {
  const s0 = BECKET.start(2);
  const half = run([call('mad-robin', 4, { front: 'larks', amount: 0.5 })], s0);
  // Becket: lark 0 and robin 1 are partners side by side on the west line.
  near(pos(half, 0), pos(s0, 1), 'lark in the robin place');
  near(pos(half, 1), pos(s0, 0), 'robin in the lark place');
  const twice = run([call('mad-robin', 12, { front: 'larks', amount: 2 })], s0);
  for (const id of [0, 1, 2, 3]) near(pos(twice, id), pos(s0, id));
  assert.throws(() => run([call('mad-robin', 8, { front: 'larks', amount: 2 })], s0), /12 beats/);
  assert.deepEqual(problems([call('mad-robin', 4, { front: 'larks', amount: 0.5 })], s0), []);
});

test('roll inside a ring: across the set from the ends of the ring, along it from a side line', () => {
  // Improper: after circle left 2 places each lark stands across from his partner.
  const s0 = IMPROPER.start(2);
  const ringed = run([call('circle', 4, { direction: 'left', places: 2 })], s0);
  const across = run([call('roll', 4, { who: 'larks', whom: 'neighbor' })], ringed);
  // Neighbors in improper stand on one side line: an along-the-set roll, the
  // lark and robin trading places.
  near(pos(across, 0), pos(ringed, 3), 'lark 1 where robin 2 stood');
  near(pos(across, 3), pos(ringed, 0), 'robin 2 where lark 1 stood');
  assert.throws(
    () => run([call('roll', 4, { who: 'larks', whom: 'neighbor', axis: 'across' })], ringed),
    /stands along/,
  );
  // Partners stand across the set from each other: the roll goes across.
  const partners = run([call('roll', 4, { who: 'larks', whom: 'partner' })], ringed);
  near(pos(partners, 0), pos(ringed, 1), 'lark 1 where robin 1 stood');
  near(pos(partners, 1), pos(ringed, 0), 'robin 1 where lark 1 stood');
  assert.deepEqual(
    problems(
      [
        call('circle', 4, { direction: 'left', places: 2 }),
        call('roll', 4, { who: 'larks', whom: 'partner', axis: 'across' }),
      ],
      s0,
    ),
    [],
  );
});

test('rows that carry notes read as the figure they name', () => {
  assert.deepEqual(row('circle left 4 places (Dance starts with same couple)'), [
    { move: 'circle', beats: 8, params: { direction: 'left', places: 4 } },
  ]);
  assert.deepEqual(row('right left through (straight across) ⁋'), [
    { move: 'right-left-through', beats: 8, params: {} },
  ]);
  assert.deepEqual(row('ladles chain to shadow *'), [
    { move: 'chain', beats: 8, params: { who: 'robins' } },
  ]);
  assert.deepEqual(row('mad robin ½ around, gentlespoons in front', 4), [
    { move: 'mad-robin', beats: 4, params: { front: 'larks', amount: 0.5 } },
  ]);
  assert.deepEqual(row('ladles left-hand chain to partner'), [
    { move: 'chain', beats: 8, params: { who: 'robins', hand: 'left', to: 'partner' } },
  ]);
  assert.throws(() => row('circle left 3 places and collapse to a wave'), /No figure pattern/);
});

test('rows that name two figures split, the first taking its natural share', () => {
  assert.deepEqual(row('circle left 2 places and gentlespoons roll neighbor across set half sashay'), [
    { move: 'circle', beats: 4, params: { direction: 'left', places: 2 } },
    { move: 'roll', beats: 4, params: { who: 'larks', whom: 'neighbor', axis: 'across' } },
  ]);
  assert.deepEqual(row('circle right 4 places, turn alone'), [
    { move: 'circle', beats: 6, params: { direction: 'right', places: 4 } },
    { move: 'turn-alone', beats: 2, params: {} },
  ]);
  assert.deepEqual(
    row('circle left 3 places, partners swing', 16).map((c) => [c.move, c.beats]),
    [
      ['circle', 8],
      ['swing', 8],
    ],
  );
  // A lead-in never splits off: "take" belongs to the next row's swing.
  assert.deepEqual(row('gentlespoons give & take partners gentlespoons take partners'), [
    { move: 'give-and-take', beats: 8, params: { who: 'larks', whom: 'partner' } },
  ]);
});

test('square through three and four: pulls alternate, balances start each pair', () => {
  const three = row(
    'square through three - neighbors pull by right, then partners pull by left, then neighbors pull by right',
    6,
  );
  assert.deepEqual(
    three.map((c) => [c.move, c.beats, c.params.who, c.params.shoulder]),
    [
      ['pass-by', 2, 'neighbor', 'right'],
      ['pass-by', 2, 'partner', 'left'],
      ['pass-by', 2, 'neighbor', 'right'],
    ],
  );
  const four = row(
    'square through four - partners balance & pull by right, then neighbors pull by left, then repeat and go on',
    16,
  );
  assert.deepEqual(
    four.map((c) => [c.move, c.beats]),
    [
      ['balance', 4],
      ['pass-by', 2],
      ['pass-by', 2],
      ['balance', 4],
      ['pass-by', 2],
      ['pass-by', 2],
    ],
  );
});
