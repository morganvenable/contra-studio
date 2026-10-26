/**
 * Couples out at the ends dance with ghosts (core/ghosts.ts): in Becket,
 * when the active couples turn to stand across the set (circle left three
 * places) the couple out at the end does the same, so it stands where its
 * new neighbors meet it; a couple that comes out at an end changes ends
 * round the middle of its ghost minor set.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldRound } from '../core/fold.ts';
import { BECKET } from '../core/formation.ts';
import { MINOR_SET_PROGRESSION } from '../core/progression.ts';
import { MINOR_SET_CROSSING } from '../core/progression-more.ts';
import { checkDance } from '../status.ts';
import { body } from '../core/state.ts';
import { verifyDance } from '../core/verify.ts';
import { compileNext, type StoredDance } from '../dance.ts';
import { FIGURES } from '../figures/index.ts';
import { call } from './helpers.ts';
import type { FigureCall } from '../core/figure.ts';

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
    music: {
      meter: '2/4',
      parts: [{ name: 'A1', bars: beats / 2 }],
      times: 'repeat',
    },
    source: { url: 'test', formation, sha256: '' },
    status: 'ok',
    problems: [],
    unparsed: [],
    choices: [],
    figures: figures.map((f) => ({ ...f, text: f.move })),
  };
}

const CIRCLE_PASS = [
  call('circle', 6, { direction: 'left', places: 3 }),
  { ...call('pass-through', 2, { shoulder: 'right' }), progression: true },
  call('swing', 8, { who: 'neighbor' }),
  call('allemande', 8, { who: 'larks', hand: 'left', amount: 1.5 }),
  call('star-promenade', 4, { hand: 'left', amount: 0.5 }),
  call('butterfly-whirl', 4, {}),
  call('chain', 8, { who: 'robins' }),
  call('allemande', 8, { who: 'robins', hand: 'right', amount: 1.5 }),
  call('balance', 4, { formation: 'pair', who: 'partner', hand: 'both' }),
  call('swing', 12, { who: 'partner' }),
];

const strict = (s: StoredDance, couples: number) =>
  compileNext(s, couples, undefined, { lenient: false });

test('the couple out at the top circles with ghosts and meets the couple passing through', () => {
  const start = BECKET.start(3);
  const round = foldRound(CIRCLE_PASS, start, FIGURES, MINOR_SET_PROGRESSION);
  // After the circle the waiting couple (couple 3) stands across the set,
  // one period above the east couple it repeats.
  const afterCircle = round.segments[1].entry;
  for (const [waiting, template] of [
    [4, 2],
    [5, 3],
  ]) {
    const w = body(afterCircle, waiting).position;
    const t = body(afterCircle, template).position;
    assert.ok(Math.abs(w.x - t.x) < 1e-6, 'same side as its template');
    assert.ok(Math.abs(w.z - (t.z - 3.6)) < 1e-6, 'one period up the set');
  }
  // After the pass through couple 1 meets couple 3, and couple 2 is out.
  assert.deepEqual(
    round.segments[2].entry.groups.map((g) => [...g].sort()),
    [[0, 1, 4, 5]],
  );
  assert.deepEqual(
    round.end.waiting.map((w) => w.couple),
    [1],
  );
});

test('a Becket dance whose couples stand across at the progression progresses at 3, 4 and 6 couples', () => {
  const verdict = verifyDance(stored('becket', 'minor-set', CIRCLE_PASS), strict);
  assert.equal(verdict.problem, undefined);
  assert.ok(verdict.ok);
});

test('a couple coming out mid-round changes ends round its ghost set, within the limits', () => {
  const s = stored('becket', 'minor-set', CIRCLE_PASS);
  const dance = strict(s, 4);
  const round = dance.round(0);
  // The couples out at both ends have finished changing ends by the end.
  assert.equal(round.end.waiting.length, 2);
  for (const w of round.end.waiting) assert.equal(w.ghostTurn, undefined);
  // Out couples finish on a side line, side by side.
  for (const w of round.end.waiting) {
    const l = body(round.end, w.couple * 2).position;
    const r = body(round.end, w.couple * 2 + 1).position;
    assert.ok(Math.abs(Math.abs(l.x) - 0.9) < 1e-6 && Math.abs(l.x - r.x) < 1e-6);
  }
});

test('a crossing progression keeps the couples out at the ends off the ghost set', () => {
  const start = BECKET.start(3);
  const round = foldRound(CIRCLE_PASS, start, FIGURES, MINOR_SET_CROSSING);
  // The waiting couple stays put through the circle instead of standing
  // across the set with ghosts.
  const before = start;
  const afterCircle = round.segments[1].entry;
  for (const id of [4, 5]) {
    const a = body(before, id).position;
    const b = body(afterCircle, id).position;
    assert.ok(Math.abs(a.z - b.z) < 1e-6, 'no ghost set above');
  }
  const s = stored('becket', 'minor-set-crossing', CIRCLE_PASS);
  assert.doesNotThrow(() => strict(s, 4));
});

test('the check stores a crossing progression only when it works out better', () => {
  // The circle-and-pass dance works out with ghosts: it keeps minor-set.
  const check = checkDance(stored('becket', 'minor-set', CIRCLE_PASS));
  assert.equal(check.status, 'ok');
  assert.equal(check.progression, undefined);
});

test('figures see which waiting couples ghosts keep in place', () => {
  const seen = (progression: typeof MINOR_SET_PROGRESSION) => {
    const waiting: boolean[] = [];
    const registry = {
      ...FIGURES,
      swing: ((state, params, beats) => {
        for (const w of state.waiting) waiting.push(!!w.ghosts);
        return FIGURES.swing(state, params, beats);
      }) as (typeof FIGURES)['swing'],
    };
    foldRound(CIRCLE_PASS, BECKET.start(3), registry, progression);
    return waiting;
  };
  const kept = seen(MINOR_SET_PROGRESSION);
  assert.ok(kept.length > 0 && kept.every(Boolean));
  const crossing = seen(MINOR_SET_CROSSING);
  assert.ok(crossing.length > 0 && !crossing.some(Boolean));
});
