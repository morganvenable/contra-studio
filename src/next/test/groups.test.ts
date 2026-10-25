/**
 * Sets not made of couples (core/formation-groups.ts, figures/groups/*):
 * a ring of five, a line of five, rings of trios, the 9-person mixer and
 * the Tempest. Each dance is read from its ContraDB rows, compiled, and
 * must pass the corpus check (physical check, the formation's model and
 * meeting rule).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileFold, foldRound } from '../core/fold.ts';
import { FORMATIONS } from '../core/formation.ts';
import {
  CIRCLE_OF_THREES,
  FIVE_RING,
  GROUPS_FORMATIONS,
  GROUPS_PROGRESSIONS,
  LINE_OF_FIVE,
  NINE_PERSON_MIXER,
  TEMPEST_SET,
} from '../core/formation-groups.ts';
import { parseRow } from '../core/parse.ts';
import type { Progression } from '../core/progression.ts';
import { body } from '../core/state.ts';
import { verifyDance } from '../core/verify.ts';
import { musicOf, type StoredDance } from '../dance.ts';
import { FIGURES } from '../figures/index.ts';

// Until the shared registries list these formations, add them for this test.
for (const [key, f] of Object.entries(GROUPS_FORMATIONS))
  if (!(key in FORMATIONS)) (FORMATIONS as Record<string, (typeof FORMATIONS)[string]>)[key] = f;

type Row = readonly [beats: number, text: string];

function dance(formation: string, progression: string, rows: readonly Row[]): StoredDance {
  const figures = rows.flatMap(([beats, text]) => parseRow({ text, beats }));
  const f = FORMATIONS[formation];
  const moves = f.moves ?? {};
  const calls = figures.map((c) => (moves[c.move] ? { ...c, move: moves[c.move] } : c));
  const beats = calls.reduce((n, c) => n + c.beats, 0);
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
    figures: calls,
  };
}

const compile = (stored: StoredDance, couples: number) => {
  const formation = FORMATIONS[stored.formation!];
  const n = formation.fit?.(couples) ?? Math.min(formation.couples.max, Math.max(formation.couples.min, couples));
  return compileFold({
    dance: { id: 't', title: 't', author: '', formation: 'duple-improper', description: '', figures: [] },
    calls: stored.figures,
    start: formation.start(n),
    registry: FIGURES,
    progression: GROUPS_PROGRESSIONS[stored.progression!] as unknown as Progression,
    music: musicOf(stored),
  });
};

const ok = (d: StoredDance) => assert.deepEqual(verifyDance(d, compile), { ok: true });

const LUGNUTS: Row[] = [
  [8, 'circle left 5 places'],
  [8, 'star left 5 places'],
  [8, 'balance & petronella'],
  [8, 'balance & petronella'],
  [16, '1 dancer strip the willow (left allemande someone, right allemande someone else, continue til all allemanded)'],
  [14, 'birdie in the cage (other dancers circle left around the 1))'],
  [2, 'slide back into place ⁋'],
];

test('ring of five: Tighten Your Lugnuts (2387) passes; the next willow-stripper is on the left', () => {
  const d = dance('five-ring', 'lead-left', LUGNUTS);
  ok(d);
  const round = foldRound(d.figures, FIVE_RING.start(5), FIGURES, GROUPS_PROGRESSIONS['lead-left'] as unknown as Progression);
  assert.notEqual(round.end.positions.get('first')![0], 0);
});

test('solo strip the willow: the dancers turned end on their places', () => {
  const s = FIVE_RING.start(5);
  const r = FIGURES['solo-strip'](s, { who: 'first', hand: 'left' }, 16);
  for (const id of [1, 2, 3, 4]) {
    const a = body(s, id).position;
    const b = body(r.exit, id).position;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-6);
  }
});

const QUINTILINEAR: Row[] = [
  [8, 'no.1 & no.2 allemande left 1½'],
  [8, 'no.1 & no.3 allemande right 1½'],
  [16, 'double dolphin hey - start with no.1 passing 4&5 by left (2&3) 1 (4&5)'],
  [8, 'no.1 & no.4 allemande left 1½'],
  [8, 'no.1 & no.5 allemande right 1½'],
  [16, 'Thread the Needle, and straighten the line ⁋'],
];

test('line of five: Quintilinear (3521) passes; no.1 ends at the far end', () => {
  const d = dance('line-of-five', 'line-renumber', QUINTILINEAR);
  ok(d);
  const prog = GROUPS_PROGRESSIONS['line-renumber'] as unknown as Progression;
  const end = foldRound(d.figures, LINE_OF_FIVE.start(5), FIGURES, prog).end;
  assert.ok(Math.abs(body(end, 0).position.x + 2.4) < 1e-6);
});

test('circle of threes: Catch Somebody (2555) passes; the basket changes the center', () => {
  ok(
    dance('circle-of-threes', 'trio-ring', [
      [16, 'partners promenade around the ring'],
      [16, 'center dancer: turn right by the right, turn left by the left, turn right by the right, then you turn back'],
      [16, 'Current ends arch; current center people single file promenade clockwise around the major set under arches, until caller says "CATCH SOMEONE!" ⁋'],
      [16, 'partners long swing (basket), and end with a different person in the center'],
    ]),
  );
  const s = CIRCLE_OF_THREES.start(4);
  const end = FIGURES['basket-swing'](s, { shift: 1 }, 16).exit;
  // The inside end of the first line (dancer 0) now stands where the center stood.
  const a = body(end, 0).position;
  const b = body(s, 1).position;
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-6);
});

test('three-person mixer: The Mean Dance (2517) passes', () => {
  ok(
    dance('three-person-mixer', 'trio-ring', [
      [32, 'lines of three promenade anywhere in the room'],
      [16, 'three people basket swing'],
      [16, 'first two people to make eye contact swing, remaining person promenade single to another couple to form a new line of three ⁋'],
    ]),
  );
});

test('9-person mixer: both Millenium Bugs (3294, 3295) pass; a new lonesome dancer each time', () => {
  const variant = dance('nine-person-mixer', 'lonesome', [
    [8, 'long lines forward & back (forward up eight, eight fall back)'],
    [8, 'lonesome person promenade to the bottom of the set, turn single'],
    [16, 'circle left 9 places (hands nine)'],
    [16, 'circle right 9 places (hands nine)'],
    [16, 'four couples swing at random, new lonesome person to the top of the set ⁋'],
  ]);
  ok(variant);
  ok(
    dance('nine-person-mixer', 'lonesome', [
      [16, 'up a double and back twice, while the lonesome person promenades to the bottom of the set'],
      [16, 'lonesome person cross hands, join with both lines, pull them through while backing up'],
      [8, 'circle left 4 places (hands nine)'],
      [8, 'circle right 4 places (hands nine)'],
      [16, 'four couples swing at random, new lonesome person to the top of the set ⁋'],
    ]),
  );
  const prog = GROUPS_PROGRESSIONS.lonesome as unknown as Progression;
  const r0 = foldRound(variant.figures, NINE_PERSON_MIXER.start(4), FIGURES, prog);
  assert.notEqual(r0.end.positions.get('lonesome')![0], 8);
});

test('Tempest: Tempus Fugit (342) passes at 8 and 12 couples', () => {
  const d = dance('tempest', 'tempest', [
    [8, 'down the hall and turn as a couple (two #1 cpls in line of four)'],
    [8, 'up the hall and turn as a couple (#1s turn to face nearest #2s)'],
    [4, 'circle left 2 places (two circles either side of set) +'],
    [2, 'twos arch ones dive ⁋'],
    [2, 'pass through across the set (two #1 couples in center of set)'],
    [8, 'neighbors do si do once (the #2 couple across the set)'],
    [16, 'neighbors balance & swing'],
    [4, 'circle left 2 places (two circles)'],
    [12, 'partners swing (#1s end facing down; #2s face in)'],
  ]);
  ok(d);
  // After one time through the 2s stand where the 1s' line began.
  const s = TEMPEST_SET.start(8);
  const end = foldRound(d.figures, s, FIGURES, GROUPS_PROGRESSIONS.tempest as unknown as Progression).end;
  const twosZ = (body(end, 4).position.z + body(end, 5).position.z) / 2;
  assert.ok(Math.abs(twosZ - body(s, 0).position.z) < 1e-6);
});
