/**
 * Where a dance progresses when the source marks no row: a Becket dance
 * whose rows name the new neighbors progresses where the dancers meet them
 * (import.ts namedProgression). A marked row that comes before the couples
 * have passed rebinds at the end of a later figure (fold.ts).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importDance } from '../import.ts';
import { checkDance } from '../status.ts';
import { call, loadSnapshot } from './helpers.ts';
import { compileNext, type StoredDance } from '../dance.ts';
import type { FigureCall } from '../core/figure.ts';
import { verifyDance } from '../core/verify.ts';
import { FORMATIONS } from '../core/formation.ts';

function stored(
  formation: string,
  progression: StoredDance['progression'],
  figures: FigureCall[],
): StoredDance {
  const beats = figures.reduce((n, c) => n + c.beats, 0);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id: 'test',
    title: 'test',
    author: 'test',
    formation,
    progression,
    music: { meter: '2/4', parts: [{ name: 'A1', bars: beats / 2 }], times: 'repeat' },
    source: { url: 'test', formation, sha256: '' },
    status: 'ok',
    problems: [],
    unparsed: [],
    choices: [],
    figures: figures.map((f) => ({ ...f, text: f.move })),
  };
}

const marked = (id: string) => {
  const snapshot = loadSnapshot(id);
  if (!snapshot) return undefined;
  const stored = importDance(id, snapshot, '');
  return { stored, rows: stored.figures.filter((c) => c.progression).map((c) => c.text) };
};

test('"pass through" before "next neighbors swing" is the progression (Becket)', (t) => {
  const got = marked('1039');
  if (!got) return t.skip('snapshot not available');
  assert.deepEqual(got.rows, ['pass through']);
  assert.equal(checkDance(got.stored).status, 'ok');
});

test('a row taking the dancers "to new neighbors" ends with the progression', (t) => {
  const got = marked('1350');
  if (!got) return t.skip('snapshot not available');
  assert.equal(got.rows.length, 1);
  assert.equal(checkDance(got.stored).status, 'ok');
});

test('improper dances keep their round-end progression', (t) => {
  const got = marked('1136');
  if (!got) return t.skip('snapshot not available');
  assert.deepEqual(got.rows, []);
});

test('a mark on the figure before the couples pass rebinds once they have passed', () => {
  const calls = [
    call('do-si-do', 8, { who: 'neighbor', amount: 1, shoulder: 'right' }),
    call('swing', 8, { who: 'neighbor' }),
    call('promenade', 8, { who: 'neighbor' }),
    call('long-lines', 8, { back: true }),
    call('allemande', 8, { who: 'larks', hand: 'left', amount: 1.5 }),
    call('swing', 8, { who: 'partner' }),
    call('circle', 8, { direction: 'left', places: 3 }),
    { ...call('balance', 4, { formation: 'ring' }), progression: true },
    call('pass-through', 4, { shoulder: 'right' }),
  ];
  const s = stored('improper', 'duple-minor', calls);
  // The ring balance comes before the 1s pass the 2s: no rebind there, but
  // after the pass through, and the dance progresses.
  const round = compileNext(s, 4, undefined, { lenient: false }).round(0);
  assert.equal(round.segments[8].entry.epoch, 0);
  assert.equal(round.end.epoch, 1);
  assert.ok(verifyDance(s, (d, n) => compileNext(d, n, undefined, { lenient: false })).ok);
});

test('"circle left 3 places, pass through" is the Becket progression when none is marked', (t) => {
  const got = marked('1534');
  if (!got) return t.skip('snapshot not available');
  assert.equal(got.rows.length, 1);
  assert.match(got.rows[0] ?? '', /pass through/);
});

test('a circle mixer is checked for everyone partnering everyone in a ring of 5 couples', () => {
  const spec = FORMATIONS['circle-mixer'].check!;
  assert.deepEqual(spec.meetingCounts, [5]);
  assert.deepEqual(spec.counts, [4, 5, 6]);
});

test('beats that add up with rounding error still fill the music', (t) => {
  const got = marked('3079');
  if (!got) return t.skip('snapshot not available');
  const total = got.stored.figures.reduce((n, c) => n + c.beats, 0);
  assert.ok(Math.abs(total - 64) < 1e-6);
  compileNext(got.stored, 4, undefined, { lenient: true });
});

test('a Becket dance labeled counterclockwise that slides left goes clockwise', (t) => {
  const got = marked('1328');
  if (!got) return t.skip('snapshot not available');
  assert.equal(got.stored.formation, 'becket-ccw');
  const check = checkDance(got.stored);
  assert.equal(check.status, 'ok');
  assert.equal(check.formation, 'becket');
});
