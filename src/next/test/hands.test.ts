/**
 * Hands, lines, chains and partner figures (round 2): row wordings read by
 * core/parse-hands.ts, the row joins in import-hands.ts, and the allemande
 * that lets go of a wave.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRow } from '../core/parse.ts';
import { joinHandRows } from '../import-hands.ts';
import type { StoredCall } from '../dance.ts';

const read = (text: string, beats = 8) =>
  parseRow({ beats, text }).map((c) => [c.move, c.beats, c.params] as const);

test('notes about facing a diagonal leave the figure as it is', () => {
  for (const text of [
    'partners swing end swing facing on the left diagonal',
    'partners swing end swing facing right diagonal',
    'partners swing and face on the left diagonal for the progression',
  ])
    assert.deepEqual(read(text), [['swing', 8, { who: 'partner' }]], text);
  assert.deepEqual(read('partners balance & swing end swing facing the left diagonal', 16), [
    ['balance', 4, { formation: 'pair', who: 'partner', hand: 'both' }],
    ['swing', 12, { who: 'partner' }],
  ]);
  // A figure that is on the diagonal stays there.
  assert.deepEqual(read('larks allemande right 1½ on a left diagonal'), [
    ['allemande', 8, { who: 'larks', hand: 'right', amount: 1.5, diagonal: 'left' }],
  ]);
});

test('chain, right and left through and pass notes read as the plain figure', () => {
  assert.deepEqual(read('robins chain across set (this is shadow)'), [
    ['chain', 8, { who: 'robins' }],
  ]);
  assert.deepEqual(read('right left through, end in a ring'), [['right-left-through', 8, {}]]);
  assert.deepEqual(read('right and left through on 1/2 right diagonal (see below)'), [
    ['right-left-through', 8, { diagonal: 'right' }],
  ]);
  assert.deepEqual(read('pass through past partners to face shadows', 2), [
    ['pass-through', 2, { shoulder: 'right' }],
  ]);
  assert.deepEqual(read('robins pass by right shoulders and take RH as they pass', 4), [
    ['pass-by', 4, { who: 'robins', shoulder: 'right', hands: true }],
  ]);
});

test('balances: pair spellings, wave and ring spellings', () => {
  assert.deepEqual(read('neighbors balance inside hands', 4), [
    ['balance', 4, { formation: 'pair', who: 'neighbor', hand: 'none' }],
  ]);
  assert.deepEqual(read('partners balance together & apart', 4), [
    ['balance', 4, { formation: 'pair', who: 'partner', hand: 'none' }],
  ]);
  assert.deepEqual(read('partners balance right hands along', 4), [
    ['balance', 4, { formation: 'pair', who: 'partner', hand: 'right' }],
  ]);
  assert.equal(read('balance ocean wave o 4', 4)[0][2].formation, 'wave');
  assert.equal(read('balance the ring balance in and out', 4)[0][2].formation, 'ring');
  assert.equal(read('same roles balance robins balance', 4)[0][2].formation, 'current');
});

test('allemande by a fraction, open chain and half do-si-do', () => {
  assert.deepEqual(read('neighbors allemande right 3/8', 4), [
    ['allemande', 4, { who: 'neighbor', hand: 'right', amount: 0.375 }],
  ]);
  assert.deepEqual(read('robins chain (open chain: robins pull by R, N allemande L 3/4)'), [
    ['pass-by', 3, { who: 'robins', shoulder: 'right', hands: true }],
    ['allemande', 5, { who: 'neighbor', hand: 'left', amount: 0.75 }],
  ]);
  assert.deepEqual(read('larks do si do ½ to trade places', 4), [
    ['pass-by', 4, { who: 'larks', shoulder: 'right', hands: false }],
  ]);
  assert.deepEqual(read('partners do si do ¾, as couples'), [
    ['couples-do-si-do', 8, { amount: 0.75 }],
  ]);
});

const calls = (move: string, beats: number, params: Record<string, unknown> = {}): StoredCall[] => [
  { move, beats, params, text: move },
];

test('zero-beat rows: meanwhile pairs, notes in parentheses, borrowed pass beats', () => {
  const rows = [
    { beats: 8, text: 'circle left 3 places' },
    { beats: 0, text: 'pass through' },
    { beats: 0, text: 'larks allemande left 1½' },
    { beats: 8, text: 'MEANWHILE robins allemande right 1½' },
    { beats: 0, text: '(neighbors pull by left)' },
  ];
  const parsed: (StoredCall[] | Error)[] = [
    calls('circle', 8, { direction: 'left', places: 3 }),
    calls('pass-through', 0, { shoulder: 'right' }),
    calls('allemande', 0, { who: 'larks', hand: 'left', amount: 1.5 }),
    new Error('no match'),
    calls('pass-by', 0, { who: 'neighbor', shoulder: 'left', hands: true }),
  ];
  joinHandRows(rows, parsed);
  const moves = parsed.map((p) => (Array.isArray(p) ? p.map((c) => [c.move, c.beats]) : 'error'));
  assert.deepEqual(moves, [
    [['circle', 6]],
    [['pass-through', 2]],
    [['together', 8]],
    [],
    [],
  ]);
});

test('a take with no swing after it is a give and take', () => {
  const rows = [
    { beats: 4, text: 'robins take partners' },
    { beats: 12, text: 'neighbors swing' },
  ];
  const parsed: (StoredCall[] | Error)[] = [
    calls('take', 4, { who: 'robins', whom: 'partner' }),
    calls('swing', 12, { who: 'neighbor' }),
  ];
  joinHandRows(rows, parsed);
  assert.equal((parsed[0] as StoredCall[])[0].move, 'give-and-take');
});

test('partners standing across a group boundary regroup to dance together', async () => {
  const { regroupAcross } = await import('../core/cross-group.ts');
  const { FORMATIONS } = await import('../core/formation.ts');
  const s = FORMATIONS.improper.start(4);
  // Same groups: nothing changes.
  assert.equal(regroupAcross(s, 'partner'), s);
  // Swap two dancers' groups so a partner pair straddles groups.
  const [g0, g1] = s.groups;
  const moved = {
    ...s,
    groups: [[g0[0], g1[1], g0[2], g0[3]], [g1[0], g0[1], g1[2], g1[3]], ...s.groups.slice(2)],
  };
  const regrouped = regroupAcross(moved, 'partner');
  assert.notEqual(regrouped, moved);
  assert.ok(regrouped.groups.every((g) => g.length === 2));
});
