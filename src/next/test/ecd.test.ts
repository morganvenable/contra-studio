/**
 * ECD-style whole-set figures (figures/ecd/): casts, travel along the
 * middle, whole-set circles, stars with no places, two-hand turns, contra
 * corners and cast-and-arch. Each runs in a triplet or a longways set,
 * passes the corpus check (physical limits and the places progression) and
 * leaves dancers where the definition says.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { FORMATIONS } from '../core/formation.ts';
import { parseRow } from '../core/parse.ts';
import { body, type DanceState } from '../core/state.ts';
import { verifyDance } from '../core/verify.ts';
import { compileNext, type StoredDance } from '../dance.ts';
import { FIGURES } from '../figures/index.ts';
import { call } from './helpers.ts';

function stored(formation: string, figures: FigureCall[], progression = 'places'): StoredDance {
  const beats = figures.reduce((n, c) => n + c.beats, 0);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id: 'test',
    title: 'test',
    author: 'test',
    formation,
    progression: progression as StoredDance['progression'],
    music: { meter: '2/4', parts: [{ name: 'A1', bars: beats / 2 }], times: 'repeat' },
    source: { url: 'test', formation, sha256: '' },
    status: 'ok',
    problems: [],
    unparsed: [],
    choices: [],
    figures: figures.map((f) => ({ ...f, text: f.move })),
  };
}

const strict = (s: StoredDance, couples: number) =>
  compileNext(s, couples, undefined, { lenient: false });

const ok = (formation: string, figures: FigureCall[], progression = 'places') =>
  assert.deepEqual(verifyDance(stored(formation, figures, progression), strict), { ok: true });

const run = (calls: FigureCall[], formation = 'triplet', couples = 3): DanceState =>
  foldRound(calls, FORMATIONS[formation].start(couples), FIGURES).end;

const at = (s: DanceState, id: number) => body(s, id).position;
const near = (a: number, b: number, what: string) =>
  assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} vs ${b}`);

const parse = (text: string, beats = 8) => parseRow({ text, beats });

test('ECD rows parse to the whole-set figures', () => {
  const cases: [string, string, Record<string, unknown>][] = [
    ['1s cast, 2s move up', 'cast', { who: '1s', places: 1 }],
    ['ones cast to second position, twos move up', 'cast', { who: '1s', to: 2 }],
    ['1s cast to bottom, others move up', 'cast', { who: '1s', to: 'bottom' }],
    ['Top couple cast off to bottom, all move up', 'cast', { who: 'top', to: 'bottom' }],
    ['couple 1 cast down one place, couple 2 move up', 'cast', { who: '1s', places: 1 }],
    [
      "ones go down the outside into the twos' place, twos move up",
      'cast',
      { who: '1s', places: 1 },
    ],
    [
      'ones up the center and cast alone to the bottom',
      'cast',
      { who: '1s', to: 'bottom', via: 'center' },
    ],
    [
      'top couple sashay down & up & down, everyone else move up',
      'center-travel',
      { who: 'top', style: 'sashay', legs: ['bottom', 'top', 'bottom'] },
    ],
    ['Top couple sashay down and back', 'center-travel', { who: 'top', style: 'sashay', legs: ['down', 'top'] }],
    [
      'top couple promenade to the bottom of the set, everyone else move up',
      'center-travel',
      { who: 'top', style: 'lead', legs: ['bottom'] },
    ],
    ['whole set circle left', 'set-circle', { direction: 'left' }],
    ['Oval right', 'set-circle', { direction: 'right' }],
    ['partners two hand turn', 'two-hand-turn', { who: 'partner', amount: 1 }],
    ['twos contra corners (actives)', 'contra-corners', { who: '2s' }],
    [
      'peel the banana #1s cast to bottom and form arch while others follow but duck thru arch',
      'peel',
      { who: '1s', part: 'all' },
    ],
    ['ones down the outsides, followed by twos threes fours,', 'peel', { who: '1s', part: 'cast' }],
    [
      'twos up the center under the arch, followed by threes fours',
      'peel',
      { who: 'bottom', part: 'through' },
    ],
  ];
  for (const [text, move, params] of cases) {
    const [c] = parse(text);
    assert.equal(c.move, move, text);
    assert.deepEqual(c.params, params, text);
  }
  assert.deepEqual(parse('ones form an arch', 0), []);
});

test('cast: the 1s cast one place and the 2s move up; twice takes them to the bottom', () => {
  const once = run([call('cast', 8, { who: '1s' })]);
  near(at(once, 0).z, 0, '1s lark in second place');
  near(at(once, 2).z, -1.8, '2s lark moved up');
  near(at(once, 0).x, -0.9, 'own line');
  ok('triplet', [call('cast', 8, { who: '1s' }), call('cast', 8, { who: '1s' })]);
  ok('longways-set', [call('cast', 16, { who: 'top', to: 'bottom' })]);
  // Up the center between the 2s, round the top and down the outside to the bottom.
  ok('triplet', [
    call('cast', 8, { who: '1s' }),
    call('cast', 12, { who: '1s', to: 'bottom', via: 'center' }),
  ]);
});

test('sashay down & up & down takes the top couple to the bottom', () => {
  ok('triplet', [
    call('center-travel', 16, { who: 'top', style: 'sashay', legs: ['bottom', 'top', 'bottom'] }),
  ]);
});

test('promenade to the bottom, others move up; down and back returns', () => {
  ok('longways-set', [
    call('center-travel', 16, { who: 'top', style: 'lead', legs: ['down', 'top'] }),
    call('center-travel', 16, { who: 'top', style: 'lead', legs: ['bottom'] }),
  ]);
});

test('whole set circle left and right, two-hand turn and star come home', () => {
  const s = run(
    [
      call('set-circle', 8, { direction: 'left' }),
      call('set-circle', 8, { direction: 'right' }),
      call('two-hand-turn', 8, { who: 'partner' }),
    ],
    'longways-set',
    4,
  );
  const start = FORMATIONS['longways-set'].start(4);
  for (const d of s.dancers) {
    near(at(s, d.id).x, at(start, d.id).x, `dancer ${d.id} x`);
    near(at(s, d.id).z, at(start, d.id).z, `dancer ${d.id} z`);
  }
  ok('longways-set', [
    call('set-circle', 16, { direction: 'left' }),
    call('set-circle', 16, { direction: 'right' }),
    call('cast', 16, { who: '1s', to: 'bottom' }),
  ]);
  ok('triplet', [
    call('star-around', 8, { hand: 'right' }),
    call('two-hand-turn', 8, { who: 'partner' }),
    call('star-around', 8, { hand: 'left' }),
    call('cast', 8, { who: '1s', to: 2 }),
    call('cast', 8, { who: '1s', to: 3 }),
  ]);
});

test('contra corners: actives turn both corners and come home', () => {
  const s = run([call('contra-corners', 16, { who: '2s' })]);
  const start = FORMATIONS.triplet.start(3);
  for (const d of s.dancers) {
    near(at(s, d.id).x, at(start, d.id).x, `dancer ${d.id} x`);
    near(at(s, d.id).z, at(start, d.id).z, `dancer ${d.id} z`);
  }
  ok('triplet', [
    call('cast', 8, { who: '1s' }),
    call('contra-corners', 16, { who: '1s' }),
    call('cast', 8, { who: '1s' }),
  ]);
});

test('peel: the 1s cast to the bottom and arch, the others come up through', () => {
  const s = run([call('peel', 16, { who: '1s' })]);
  near(at(s, 0).z, 1.8, '1s at the bottom');
  near(at(s, 2).z, -1.8, '2s at the top');
  near(at(s, 4).z, 0, '3s in the middle');
  ok('triplet', [call('peel', 16, { who: '1s' })]);
  ok('longways-set', [
    call('peel', 16, { who: '1s', part: 'cast' }),
    call('peel', 16, { who: 'bottom', part: 'through' }),
  ]);
});

test('strip the willow: the top couple strips down the set and ends at the bottom', () => {
  const s = run([call('strip-the-willow', 32, { who: '1s' })]);
  near(at(s, 0).z, 1.8, '1s at the bottom');
  near(at(s, 0).x, -0.9, '1s lark on their own side');
  near(at(s, 2).z, -1.8, '2s moved up');
  ok('triplet', [call('strip-the-willow', 32, { who: 'top' })]);
  const [c] = parse('top couple strip the willow', 32);
  assert.equal(c.move, 'strip-the-willow');
});

test('whole-circle: six circle round a true ring and end on places', () => {
  const s = run([call('whole-circle', 8, { direction: 'left', places: 4 })]);
  const start = FORMATIONS.triplet.start(3);
  const spots = [...start.bodies.values()].map((b) => b.position);
  for (const d of s.dancers)
    assert.ok(
      spots.some((p) => Math.hypot(p.x - at(s, d.id).x, p.z - at(s, d.id).z) < 1e-6),
      `dancer ${d.id} ends on a place`,
    );
  ok('triplet', [
    call('whole-circle', 8, { direction: 'left', amount: 1 }),
    call('whole-circle', 8, { direction: 'right', amount: 1 }),
    call('whole-circle', 8, { direction: 'left', places: 4 }),
    call('whole-circle', 8, { direction: 'right', places: 4 }),
    call('cast', 8, { who: '1s' }),
    call('cast', 8, { who: '1s' }),
  ]);
});

test('three face three: trio basket, center turns, swings in place, do-si-do as throuples', () => {
  ok(
    'three-face-three',
    [
      call('trio-turn', 8, { side: 'right', hand: 'right', amount: 1 }),
      call('trio-turn', 8, { side: 'left', hand: 'left', amount: 1 }),
      call('place-swing', 16, { who: 'neighbor' }),
      call('do-si-do', 16, { who: 'neighbor', amount: 1.5, shoulder: 'right' }),
      call('trio-basket', 16, {}),
    ],
    'trios',
  );
  assert.equal(parse('partners long swing (three-person basket)', 16)[0].move, 'trio-basket');
  assert.equal(parse('centers on the right, right elbow turn (right hand partner)')[0].move, 'trio-turn');
  assert.equal(parse('same roles long swing (your opposite)', 16)[0].move, 'place-swing');
});

test('together: ones & twos turn neighbors while the threes turn partners', () => {
  const [c] = parse('ones & twos allemande left neighbor once, threes allemande left partner once');
  assert.equal(c.move, 'together');
  const s = run([c]);
  const start = FORMATIONS.triplet.start(3);
  for (const d of s.dancers) near(at(s, d.id).z, at(start, d.id).z, `dancer ${d.id} home`);
  ok('triplet', [c, call('cast', 8, { who: '1s' }), call('cast', 8, { who: '1s' })]);
});

test('hey for three: parallel heys on both lines come home; half heys trade the ends', () => {
  const [c] = parse(
    'parallel heys for three - robins 2 pass robins 1, larks 2 pass larks 3 by right shoulders to start',
    16,
  );
  assert.equal(c.move, 'hey-for-three');
  ok('triplet', [c, call('cast', 8, { who: '1s' }), call('cast', 8, { who: '1s' })]);
  const half = run([
    call('hey-for-three', 8, { lines: [{ who: 'robins', active: '2s', first: '1s' }], shoulder: 'left', amount: 0.5 }),
  ]);
  near(at(half, 1).z, 1.8, 'top robin now at the bottom');
  near(at(half, 5).z, -1.8, 'bottom robin now at the top');
});

test('dip and dive for six: six changes bring every couple home', () => {
  const start = FORMATIONS.triplet.start(3);
  const column: DanceState = {
    ...start,
    bodies: new Map(
      [...start.bodies].map(([id, b]) => {
        const down = id < 2;
        const lark = id % 2 === 0;
        return [id, { position: { x: (lark === down ? 1 : -1) * 0.26, z: b.position.z }, yaw: down ? 0 : Math.PI }];
      }),
    ),
  };
  const s = foldRound([call('dip-and-dive', 16, { changes: 6, arch: 'middle' })], column, FIGURES).end;
  // Every couple back in its place (the 3s, turned at the bottom, now face down).
  for (const d of s.dancers) near(at(s, d.id).z, at(column, d.id).z, `dancer ${d.id} z`);
  for (const id of [0, 1, 2, 3]) near(at(s, id).x, at(column, id).x, `dancer ${id} x`);
  assert.equal(parse('dip and dive, 6 changes - inside couple arch, turn as a couple on the ends', 16)[0].move, 'dip-and-dive');
});

test('cross, set to corners, turn single', () => {
  ok('triplet', [
    call('cross', 4, { who: '1s' }),
    call('cross', 4, { who: '1s' }),
    call('cast', 8, { who: '1s' }),
    call('set-to-corner', 4, { who: '1s', corner: 'first' }),
    call('set-to-corner', 4, { who: '1s', corner: 'second' }),
    call('cast', 8, { who: '1s' }),
  ]);
  const s = run([call('turn-single', 4, { toward: 'partner' })]);
  near(Math.cos(body(s, 0).yaw), -1, 'top lark faces up, away from the middle');
  near(Math.cos(body(s, 4).yaw), 1, 'bottom lark faces down');
  assert.equal(parse('ones set to first corners', 4)[0].move, 'set-to-corner');
  assert.equal(parse('cloverleaf turn single (face to face with partners) to face next neighbors')[0].move, 'turn-single');
});
