/**
 * Ring figures (figures/ring/) and their row patterns (core/parse-ring.ts):
 * each figure ends on places of the ring where its definition says, and
 * small circle mixers built from them pass the corpus check.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { FORMATIONS } from '../core/formation.ts';
import { besideOf } from '../core/formation-ring.ts';
import { distance, heading, turn } from '../core/math.ts';
import { parseRow } from '../core/parse.ts';
import { verifyDance } from '../core/verify.ts';
import { body, type DanceState } from '../core/state.ts';
import { compileNext, type StoredDance } from '../dance.ts';
import { FIGURES } from '../figures/index.ts';
import { call } from './helpers.ts';

const start = (couples = 4) => FORMATIONS['circle-mixer'].start(couples);
const run = (calls: FigureCall[], from = start()) => foldRound(calls, from, FIGURES).end;

function stored(formation: string, figures: FigureCall[]): StoredDance {
  const beats = figures.reduce((n, c) => n + c.beats, 0);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id: 'test',
    title: 'test',
    author: 'test',
    formation,
    progression: 'mixer',
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

/** Everyone on a place of the starting ring, facing in. */
function onPlacesFacingIn(state: DanceState, homes: DanceState) {
  const places = [...homes.bodies.values()].map((b) => b.position);
  for (const d of state.dancers) {
    const b = body(state, d.id);
    assert.ok(
      places.some((p) => distance(p, b.position) < 1e-6),
      `dancer ${d.id} is not on a place`,
    );
    assert.ok(Math.abs(turn(b.yaw, heading(b.position, { x: 0, z: 0 }))) < 1e-6, `dancer ${d.id} faces in`);
  }
}

const partnerOnRight = (state: DanceState, lark: number) => besideOf(state, lark, 'right', 'robin');

test('ring shift: robins move one couple to their left, beside a new lark', () => {
  const s0 = start();
  const end = run([call('ring-shift', 8, { who: 'robins', direction: 'left' })], s0);
  onPlacesFacingIn(end, s0);
  // Robin 0 started on lark 0's right; now she is on the right of lark 3 (the one to the left).
  assert.equal(partnerOnRight(end, 6), 1);
  for (const d of end.dancers.filter((d) => d.role === 'lark'))
    assert.deepEqual(body(end, d.id), body(s0, d.id), 'larks stand');
});

test('ring shift through the center: larks go in, turn and come out to the corner', () => {
  const s0 = start();
  const end = run(
    [call('ring-shift', 8, { who: 'larks', direction: 'left', path: 'center' })],
    s0,
  );
  // Lark 0 ends on a place of the ring, facing his old corner (robin 3),
  // who stands on his right as the ring faces in.
  assert.equal(s0.relations.get('neighbor')!.get(0), 7);
  const places = [...s0.bodies.values()].map((b) => b.position);
  for (const d of end.dancers)
    assert.ok(places.some((p) => distance(p, body(end, d.id).position) < 1e-6));
  const lark = body(end, 0);
  assert.ok(Math.abs(turn(lark.yaw, heading(lark.position, body(end, 7).position))) < 0.5);
  const inward = heading(lark.position, { x: 0, z: 0 });
  assert.equal(besideOf(end, 0, 'right', 'robin', inward), 7);
});

test('ring slide: the ring slides a place left and back', () => {
  const s0 = start();
  const mid = run([call('ring-slide', 4, { direction: 'left' })], s0);
  onPlacesFacingIn(mid, s0);
  assert.ok(distance(body(mid, 0).position, body(s0, 0).position) > 1.7);
  const back = run([call('ring-slide', 4, { direction: 'right' })], mid);
  for (const d of s0.dancers)
    assert.ok(distance(body(back, d.id).position, body(s0, d.id).position) < 1e-9);
});

test('larks to the center, turn alone, go back: on their places facing out', () => {
  const s0 = start();
  const end = run(
    [
      call('forward-back', 2, { back: false, among: ['larks'] }),
      call('turn-alone', 4, { among: ['larks'] }),
      call('ring-return', 2, { who: 'larks' }),
    ],
    s0,
  );
  for (const d of s0.dancers) {
    assert.ok(distance(body(end, d.id).position, body(s0, d.id).position) < 1e-6);
    const out = d.role === 'lark' ? Math.PI : 0;
    assert.ok(Math.abs(turn(body(end, d.id).yaw, body(s0, d.id).yaw + out)) < 1e-6);
  }
});

test('grand right and left, count to seven: meet the seventh beside you, facing in', () => {
  const s0 = start(5);
  const end = run([call('grand-right-left', 16, { changes: 6, hand: 'right', end: 'in' })], s0);
  onPlacesFacingIn(end, s0);
  // Lark k meets robin k + 6 (mod 5) = k + 1.
  for (let k = 0; k < 5; k++) assert.equal(partnerOnRight(end, k * 2), ((k + 1) % 5) * 2 + 1);
});

test('single changes of a grand right and left, then swing the one you meet', () => {
  const s0 = start(5);
  const pulls = [1, 2, 3, 4, 5, 6].map((i) =>
    call('grand-right-left', 2, { changes: 1, hand: i % 2 ? 'right' : 'left', end: 'face' }),
  );
  const end = run([...pulls, call('meet', 12, { figure: 'swing' })], s0);
  // A swing in the ring ends on the pair's two places, facing in across their chord.
  const places = [...s0.bodies.values()].map((b) => b.position);
  for (const d of end.dancers)
    assert.ok(places.some((p) => distance(p, body(end, d.id).position) < 1e-6));
  for (let k = 0; k < 5; k++) assert.equal(partnerOnRight(end, k * 2), ((k + 1) % 5) * 2 + 1);
});

test('sashay in & out: partners end on their places facing each other', () => {
  const s0 = start();
  const end = run([call('sashay', 8, { who: 'partner' })], s0);
  for (const d of s0.dancers) {
    assert.ok(distance(body(end, d.id).position, body(s0, d.id).position) < 1e-6);
    const p = s0.relations.get('partner')!.get(d.id)!;
    assert.ok(Math.abs(turn(body(end, d.id).yaw, heading(body(s0, d.id).position, body(s0, p).position))) < 1e-6);
  }
});

test('row patterns: ring wordings parse to ring figures', () => {
  const parse = (text: string, beats = 8) => parseRow({ beats, text }).map((c) => [c.move, c.params]);
  assert.deepEqual(parse('gentlespoons to the middle & back'), [
    ['forward-back', { back: true, among: ['larks'] }],
  ]);
  assert.deepEqual(parse('partners promenade along the set on the right', 16), [
    ['ring-promenade', { who: 'partner' }],
  ]);
  assert.deepEqual(parse('partners promenade clockwise', 16), [
    ['ring-promenade', { who: 'partner', direction: 'cw' }],
  ]);
  assert.deepEqual(parse('ladles turn alone one place to a new partner', 4), [
    ['ring-shift', { who: 'robins', direction: 'left' }],
  ]);
  assert.deepEqual(parse('grand right and left, count to seven', 16), [
    ['grand-right-left', { changes: 6, hand: 'right', end: 'in' }],
  ]);
  assert.deepEqual(parse('partners swing right elbow'), [
    ['allemande', { who: 'partner', hand: 'right', amount: 1 }],
  ]);
  const swung = parseRow({ beats: 16, text: 'neighbors balance & swing (this neighbor is your new partner)' });
  assert.deepEqual(
    swung.map((c) => [c.move, c.progression ?? false]),
    [
      ['balance', false],
      ['swing', true],
    ],
  );
});

test('circle mixer: Circassian Circle (dance 916) as calls passes the corpus check', () => {
  const dance = stored('circle-mixer', [
    call('forward-back', 8, { back: true }),
    call('forward-back', 8, { back: true }),
    call('forward-back', 8, { back: true, among: ['robins'] }),
    { ...call('ring-shift', 8, { who: 'larks', direction: 'left', path: 'center' }), progression: true },
    call('balance', 4, { formation: 'pair', who: 'partner', hand: 'both' }),
    call('swing', 12, { who: 'partner' }),
    call('ring-promenade', 16, { who: 'partner' }),
  ]);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
});

test('circle mixer: Lucky Seven (dance 3288) as calls compiles and progresses', () => {
  const dance = stored('circle', [
    call('forward-back', 8, { back: true }),
    call('do-si-do', 8, { who: 'partner', amount: 1, shoulder: 'right' }),
    { ...call('grand-right-left', 16, { changes: 6, hand: 'right', end: 'in' }), progression: true },
    call('swing', 16, { who: 'partner' }),
    call('ring-promenade', 16, { who: 'partner' }),
  ]);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
});

test('ring roll away: larks roll partners across to their places, facing in', () => {
  const s0 = start();
  const end = run([call('ring-roll-away', 4, { who: 'larks', whom: 'partner' })], s0);
  onPlacesFacingIn(end, s0);
  // Each robin now stands on her lark's left.
  assert.ok(distance(body(end, 1).position, body(s0, 0).position) < 1e-6);
  assert.ok(distance(body(end, 0).position, body(s0, 1).position) < 1e-6);
});

test('row patterns: footnote markers and glosses are notes', () => {
  const parse = (text: string, beats = 16) => parseRow({ beats, text }).map((c) => c.move);
  assert.deepEqual(parse('partners promenade along the set on the right (ccw) [3]'), ['ring-promenade']);
  assert.deepEqual(parse('neighbors see saw once (Corners) [1]', 8), ['do-si-do']);
  assert.deepEqual(parse('partners balance & swing (#5, new partners)'), ['balance', 'swing']);
  assert.deepEqual(parse('larks roll away 2nd neighbors', 4), ['roll-away']);
});
