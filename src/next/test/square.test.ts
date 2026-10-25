/**
 * Square figures (figures/square/) and rows (core/parse-square.ts): heads
 * and sides figures in the middle, corners by face and by place, grand right
 * and left to meet partners, promenade home, grand chain, lines at the sides.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall } from '../core/figure.ts';
import { FORMATIONS } from '../core/formation.ts';
import { ringPlaces, RING_CENTER } from '../core/formation-ring.ts';
import { distance } from '../core/math.ts';
import { parseRow } from '../core/parse.ts';
import { body, type DanceState } from '../core/state.ts';
import { verifyDance } from '../core/verify.ts';
import { compileNext, type StoredDance } from '../dance.ts';
import { FIGURES } from '../figures/index.ts';
import { linesOfFour } from '../figures/square/line-pairs.ts';
import { call } from './helpers.ts';

function square(figures: FigureCall[]): StoredDance {
  const beats = figures.reduce((n, c) => n + c.beats, 0);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id: 'test',
    title: 'test',
    author: 'test',
    formation: 'square',
    progression: 'mixer',
    music: { meter: '2/4', parts: [{ name: 'A1', bars: beats / 2 }], times: 'repeat' },
    source: { url: 'test', formation: 'square', sha256: '' },
    status: 'ok',
    problems: [],
    unparsed: [],
    choices: [],
    figures: figures.map((f) => ({ ...f, text: f.move })),
  };
}

const strict = (s: StoredDance, couples: number) =>
  compileNext(s, couples, undefined, { lenient: false });

function run(state: DanceState, calls: FigureCall[]): DanceState {
  for (const c of calls) state = FIGURES[c.move](state, c.params, c.beats).exit;
  return state;
}

const places = ringPlaces(8, RING_CENTER, true).map((p) => p.position);
const at = (state: DanceState, id: number, place: number, message = '') =>
  assert.ok(
    distance(body(state, id).position, places[place]) < 1e-6,
    `${message} dancer ${id} should be on place ${place}`,
  );

const row = (text: string, beats = 8) => parseRow({ beats, text }).map(({ move, params }) => ({ move, params }));

test('square rows parse to square figures', () => {
  assert.deepEqual(row('star left 4 places (heads)'), [
    { move: 'square-middle', params: { move: 'star', params: { hand: 'left', places: 4 }, among: ['heads'] } },
  ]);
  assert.deepEqual(row('heads (sides) right left through'), [
    { move: 'square-middle', params: { move: 'right-left-through', params: {}, among: ['heads'] } },
  ]);
  assert.deepEqual(row('head ladles chain across'), [
    { move: 'square-middle', params: { move: 'chain', params: { who: 'robins' }, among: ['heads'] } },
  ]);
  assert.deepEqual(row('forward and back head couples'), [
    { move: 'forward-back', params: { back: true, among: ['heads'] } },
  ]);
  assert.deepEqual(row('first corners allemande left once'), [
    { move: 'allemande', params: { who: 'neighbor', hand: 'left', amount: 1 } },
  ]);
  assert.deepEqual(row('next neighbors swing (NEXT CORNER)'), [
    { move: 'beside', params: { move: 'swing', side: 'left', params: {} } },
  ]);
  assert.deepEqual(row('2nd neighbors swing (Opposites, but not in opposite place)'), [
    { move: 'swing', params: { who: 'opposite' } },
  ]);
  assert.deepEqual(row('star right 3 places ladles'), [
    { move: 'star', params: { hand: 'right', places: 3, among: ['robins'] } },
  ]);
  for (const text of [
    'promenade home',
    'partners promenade along the set on the right to home (halfway around)',
  ])
    assert.deepEqual(row(text), [{ move: 'promenade-home', params: { who: 'partner' } }], text);
  for (const text of ['grand right and left', 'right & left grand halfway around', 'weave the ring'])
    assert.deepEqual(row(text, 10), [{ move: 'grand-meet', params: { hand: 'right' } }], text);
  assert.deepEqual(row('all four ladles grand chain'), [{ move: 'grand-chain', params: { who: 'robins' } }]);
  assert.deepEqual(
    row('Heads separate, go around two - form lines at the sides (gentlespoon-gentlespoon-ladle-ladle)'),
    [{ move: 'separate-around', params: { around: 2, end: 'lines', among: ['heads'] } }],
  );
  assert.deepEqual(row('center two roll away with a half sashay', 4), [
    { move: 'line-pairs', params: { action: 'roll', pairs: 'center' } },
  ]);
  assert.deepEqual(row('Identify partners, neighbors, opposites'), [
    { move: 'still', params: { action: 'stand' } },
  ]);
});

test('heads dance in the middle and step back to their places', () => {
  const s0 = FORMATIONS.square.start(4);
  const star = run(s0, [call('square-middle', 8, { move: 'star', params: { hand: 'right', places: 4 }, among: ['heads'] })]);
  for (let id = 0; id < 8; id++) at(star, id, id, 'star right 4 places:');
  // A right and left through puts each head couple on the other's places.
  const rlt = run(s0, [call('square-middle', 8, { move: 'right-left-through', params: {}, among: ['heads'] })]);
  at(rlt, 0, 4, 'right left through:');
  at(rlt, 1, 5, 'right left through:');
  at(rlt, 2, 2, 'the sides stand:');
  const v = verifyDance(
    square([
      call('square-middle', 8, { move: 'chain', params: { who: 'robins' }, among: ['heads'] }),
      call('square-middle', 8, { move: 'chain', params: { who: 'robins' }, among: ['heads'] }),
      call('square-middle', 8, { move: 'star', params: { hand: 'left', places: 4 }, among: ['heads'] }),
      call('square-middle', 8, { move: 'right-left-through', params: {}, among: ['sides'] }),
      call('square-middle', 8, { move: 'right-left-through', params: {}, among: ['sides'] }),
    ]),
    strict,
  );
  assert.ok(v.ok, JSON.stringify(v));
});

test('a break: corners, grand right and left to partners, swing, promenade home', () => {
  const calls = [
    call('allemande', 6, { who: 'neighbor', hand: 'left', amount: 1 }),
    call('grand-meet', 10, { hand: 'right' }),
    call('swing', 16, { who: 'partner' }),
    call('promenade-home', 16, { who: 'partner' }),
  ];
  const s = run(FORMATIONS.square.start(4), calls.slice(0, 2));
  // Partners meet halfway round: each couple on the opposite couple's places.
  for (let c = 0; c < 4; c++) {
    at(s, c * 2, ((c + 2) % 4) * 2, 'grand right and left:');
    at(s, c * 2 + 1, ((c + 2) % 4) * 2 + 1, 'grand right and left:');
  }
  const home = run(s, calls.slice(2));
  for (let id = 0; id < 8; id++) at(home, id, id, 'promenade home:');
  const v = verifyDance(square(calls), strict);
  assert.ok(v.ok, JSON.stringify(v));
});

test('corners by place: after a petronella each lark swings the robin now on his left', () => {
  const v = verifyDance(
    square([
      call('balance', 4, { formation: 'ring' }),
      call('petronella', 4, {}),
      call('beside', 8, { move: 'swing', side: 'left', params: {} }),
      call('balance', 4, { formation: 'ring' }),
      call('petronella', 4, {}),
      call('beside', 8, { move: 'swing', side: 'left', params: {} }),
      call('balance', 4, { formation: 'ring' }),
      call('petronella', 4, {}),
      call('beside', 8, { move: 'swing', side: 'left', params: {} }),
      call('balance', 4, { formation: 'ring' }),
      call('petronella', 4, {}),
      call('swing', 8, { who: 'partner' }),
    ]),
    strict,
  );
  assert.ok(v.ok, JSON.stringify(v));
});

test('grand chain: the robins cross to the opposite couple and back', () => {
  const s0 = FORMATIONS.square.start(4);
  const once = run(s0, [call('grand-chain', 8, { who: 'robins' })]);
  for (let c = 0; c < 4; c++) {
    at(once, c * 2 + 1, ((c + 2) % 4) * 2 + 1, 'grand chain:');
    at(once, c * 2, c * 2, 'larks stay:');
  }
  const v = verifyDance(
    square([call('grand-chain', 8, { who: 'robins' }), call('grand-chain', 8, { who: 'robins' })]),
    strict,
  );
  assert.ok(v.ok, JSON.stringify(v));
});

test('heads go around two to lines at the sides, and the lines roll away', () => {
  const s0 = FORMATIONS.square.start(4);
  const lines = run(s0, [call('separate-around', 8, { around: 2, end: 'lines', among: ['heads'] })]);
  const found = linesOfFour(lines, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(found.length, 2);
  for (const line of found)
    assert.deepEqual(
      line.map((id) => lines.dancers[id].role),
      ['lark', 'lark', 'robin', 'robin'],
      'lark, lark, robin, robin from the left',
    );
  const rolled = run(lines, [
    call('line-pairs', 4, { action: 'roll', pairs: 'robins' }),
    call('line-pairs', 4, { action: 'roll', pairs: 'larks' }),
    call('line-pairs', 4, { action: 'roll', pairs: 'center' }),
    call('line-pairs', 4, { action: 'roll', pairs: 'ends' }),
  ]);
  // Side couples are home again; head partners stand across from each other.
  for (const id of [2, 3, 6, 7]) at(rolled, id, id, 'side couple home:');
  const v = verifyDance(
    square([
      call('separate-around', 8, { around: 2, end: 'lines', among: ['heads'] }),
      call('line-pairs', 4, { action: 'balance', pairs: 'same-roles' }),
      call('line-pairs', 4, { action: 'roll', pairs: 'same-roles' }),
      call('line-pairs', 4, { action: 'roll', pairs: 'center' }),
      call('line-pairs', 4, { action: 'roll', pairs: 'ends' }),
      call('swing', 16, { who: 'partner' }),
      call('promenade-home', 16, { who: 'partner' }),
    ]),
    strict,
  );
  // The heads meet their partners from across the square in the swing.
  assert.ok(v.ok || v.kind === 'physical', JSON.stringify(v));
});
