/**
 * Four face four and Sicilian circle figures (figures/sets/*, parse-sets.ts):
 * arch and dive, couples do-si-do, the ring of eight, a swing ending facing
 * out, and the rows that name them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { physicalCheck } from '../core/check.ts';
import type { FigureCall } from '../core/figure.ts';
import { compileFold, foldRound } from '../core/fold.ts';
import { BECKET, FORMATIONS } from '../core/formation.ts';
import * as layout from '../core/layout.ts';
import { lineSets } from '../core/layout.ts';
import { METERS } from '../core/music.ts';
import { parseRow } from '../core/parse.ts';
import { NO_PROGRESSION } from '../core/progression.ts';
import { body, withChanges, type DanceState } from '../core/state.ts';
import { verifyDance } from '../core/verify.ts';
import { compileNext, type StoredDance } from '../dance.ts';
import { FIGURES } from '../figures/index.ts';
import { call, facing, FACE_EAST, FACE_WEST, near } from './helpers.ts';

/** Fold the calls once from `start` and run the physical check over them. */
function once(start: DanceState, calls: readonly FigureCall[]) {
  const beats = calls.reduce((n, c) => n + c.beats, 0);
  const folded = compileFold({
    dance: { id: 't', title: 't', author: 't', formation: 'duple-improper', description: '', figures: [] },
    calls,
    start,
    registry: FIGURES,
    progression: NO_PROGRESSION,
    music: { meter: METERS['2/4'], parts: [{ name: 'A1', bars: beats / 2 }], times: 1 },
  });
  assert.deepEqual(physicalCheck(folded, { rounds: 1 }).problems, []);
  return folded.round(0).end;
}

/** One Becket minor set with couple 0 named the 1s and couple 1 the 2s. */
const becket = () =>
  withChanges(BECKET.start(2), {
    positions: new Map([
      ['1s', [0, 1]],
      ['2s', [2, 3]],
    ]),
  });

const one = (text: string, beats = 8) => {
  const calls = parseRow({ text, beats });
  assert.equal(calls.length, 1, text);
  return calls[0];
};

test('rows: arch and dive, couples do-si-do, elbows, rings of eight, swings facing out', () => {
  assert.deepEqual(one('ones arch twos dive', 4).params, { arch: '1s', backing: false });
  assert.deepEqual(one('twos arch ones dive (back up)', 4).params, { arch: '2s', backing: true });
  const split = parseRow({ text: 'twos arch ones dive (backing up), pass thru', beats: 4 });
  assert.deepEqual(
    split.map((c) => [c.move, c.beats]),
    [
      ['arch-dive', 2],
      ['pass-through', 2],
    ],
  );
  assert.equal(one('as couples do si do +').move, 'couples-do-si-do');
  assert.deepEqual(one('neighbor right elbow').params, { who: 'neighbor', hand: 'right', amount: 1 });
  assert.deepEqual(one('in a ring of 8, circle left 4 places').params, {
    direction: 'left',
    places: 4,
    ring: 8,
  });
  assert.equal(one('circle left 4 places [halfway]').params.ring, 8);
  assert.equal(one('circle left 3 places in groups of 4').params.ring, 4);
  assert.deepEqual(one('partners swing, end facing the next', 12).move, 'swing-out');
  assert.deepEqual(
    parseRow({ text: 'partners balance & swing and end facing new lines of 4', beats: 16 }).map(
      (c) => c.move,
    ),
    ['balance', 'swing-out'],
  );
  assert.equal(one('opposites do-si-do 1').params.who, 'opposite');
  assert.equal(one('circle left 4 places ++').move, 'circle');
  assert.equal(one('long lines forward & back (as couples forward and back)').move, 'forward-back');
});

test('arch and dive: the couples trade places facing on; backing up brings them home', () => {
  const start = becket();
  const across = once(start, [call('arch-dive', 4, { arch: '1s', backing: false })]);
  // Couple 0 (west, facing east) ends where couple 1 stood, still facing east.
  for (const [id, to] of [
    [0, 3],
    [1, 2],
    [2, 1],
    [3, 0],
  ]) {
    near(body(across, id).position, body(start, to).position, `dancer ${id}`);
    facing(body(across, id).yaw, body(start, id).yaw, `dancer ${id} keeps facing`);
  }
  const home = once(across, [call('arch-dive', 4, { arch: '2s', backing: true })]);
  for (const id of [0, 1, 2, 3]) near(body(home, id).position, body(start, id).position);
});

test('arch and dive: one couple of each two arches', () => {
  const s = withChanges(becket(), { positions: new Map([['1s', [0, 1, 2, 3]]]) });
  assert.throws(() => FIGURES['arch-dive'](s, { arch: '1s' }, 4), /Exactly one couple/);
});

test('couples do-si-do: the couples go round each other and home, facing the same way', () => {
  const start = becket();
  const end = once(start, [call('couples-do-si-do', 8, { amount: 1 })]);
  for (const id of [0, 1, 2, 3]) {
    near(body(end, id).position, body(start, id).position, `dancer ${id}`);
    facing(body(end, id).yaw, body(start, id).yaw);
  }
});

test('swing out: partners end on their own side facing away from the other couple', () => {
  const start = becket();
  const end = once(start, [call('swing-out', 8, { who: 'partner' })]);
  facing(body(end, 0).yaw, FACE_WEST, 'the west couple faces west');
  facing(body(end, 2).yaw, FACE_EAST, 'the east couple faces east');
  assert.ok(body(end, 0).position.x < -0.8 && body(end, 1).position.x < -0.8);
  // Lark on the left facing west is the lark at the larger z.
  assert.ok(body(end, 0).position.z > body(end, 1).position.z);
});

/** Four face four with the two facing lines as one group of eight (no layout frames). */
const eight = () => {
  const s = FORMATIONS['four-face-four'].start(6);
  return withChanges(s, { groups: lineSets(s).slice(0, 1), layout: undefined });
};

test('ring of eight: circling halfway puts each line where the other stood', () => {
  const start = eight();
  const ids = start.groups[0];
  const end = once(start, [call('lines-circle', 8, { direction: 'left', places: 4 })]);
  const places = ids.map((id) => body(start, id));
  for (const id of ids) {
    const b = body(end, id);
    const at = places.findIndex((p) => Math.hypot(p.position.x - b.position.x, p.position.z - b.position.z) < 1e-6);
    assert.ok(at >= 0, `dancer ${id} ends on a place`);
    facing(b.yaw, places[at].yaw, `dancer ${id} faces the way that place faced`);
    // Halfway: the other line's z.
    assert.ok(Math.abs(b.position.z - body(start, id).position.z) > 1, `dancer ${id} changes line`);
  }
});

test('ring of eight facing out turns the other way and stays facing out', () => {
  const s = eight();
  const out = new Map(s.bodies);
  for (const id of s.groups[0]) {
    const b = body(s, id);
    out.set(id, { position: b.position, yaw: b.yaw + Math.PI });
  }
  const start = withChanges(s, { bodies: out });
  const end = once(start, [call('lines-circle', 8, { direction: 'left', places: 2, ring: 8 })]);
  const inward = foldRound(
    [call('lines-circle', 8, { direction: 'left', places: 2, ring: 8 })],
    s,
    FIGURES,
  ).end;
  for (const id of s.groups[0]) {
    const b = body(end, id);
    const place = s.groups[0].find(
      (o) => Math.hypot(body(start, o).position.x - b.position.x, body(start, o).position.z - b.position.z) < 1e-6,
    );
    assert.ok(place !== undefined, `dancer ${id} ends on a place`);
    facing(b.yaw, body(start, place).yaw, `dancer ${id} faces out`);
  }
  // Each dancer walks to its own left either way: facing out, round the other way.
  const moved = s.groups[0].filter(
    (id) =>
      Math.hypot(
        body(end, id).position.x - body(inward, id).position.x,
        body(end, id).position.z - body(inward, id).position.z,
      ) > 0.5,
  );
  assert.ok(moved.length > 0, 'the rings go round opposite ways');
});

test('ring of eight: other places dance in rings of four', () => {
  const start = eight();
  const four = once(start, [call('lines-circle', 8, { direction: 'left', places: 3 })]);
  const plain = foldRound(
    [call('circle', 8, { direction: 'left', places: 3 })],
    FORMATIONS['four-face-four'].start(6),
    FIGURES,
  ).end;
  // Each column's minor set circles on its own, as the ordinary circle does.
  for (const id of start.groups[0]) {
    near(body(four, id).position, body(plain, id).position, `dancer ${id}`, 1e-6);
  }
});

// Whole dances need the four face four and Sicilian frames in layout.ts
// (couples facing along the hall seen as a Becket minor set, the ring of
// eight run in the groups of eight).
const merged = 'lineSetMove' in layout;

function stored(formation: string, progression: StoredDance['progression'], figures: FigureCall[]): StoredDance {
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
const strict = (s: StoredDance, couples: number) =>
  compileNext(s, couples, undefined, { lenient: false });

test('four face four: lines circle halfway with all eight and twirl to face a new line', { skip: !merged && 'needs the layout.ts frames' }, () => {
  // Coconut Cream Pie (Lynn Ackerson), as calls.
  const dance = stored('four-face-four', 'lines', [
    call('forward-back', 8, { back: true }),
    call('star', 8, { hand: 'right', places: 4, among: ['middle'] }),
    call('allemande', 8, { who: 'partner', hand: 'left', amount: 1.5 }),
    call('star', 8, { hand: 'right', places: 4, among: ['middle'] }),
    call('balance', 4, { formation: 'pair', who: 'partner', hand: 'both' }),
    call('swing', 12, { who: 'partner' }),
    call('lines-circle', 8, { direction: 'left', places: 4 }),
    call('balance', 4, { formation: 'ring' }),
    call('twirl', 4, { style: 'california', who: 'partner' }),
  ]);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
});

test('Sicilian circle: rolling arches, then on to the next couple', { skip: !merged && 'needs the layout.ts frames' }, () => {
  // The Mariposa (Fred Breunig), as calls.
  const dance = stored('sicilian', 'sicilian', [
    call('star', 8, { hand: 'right', places: 4 }),
    call('star', 8, { hand: 'left', places: 4 }),
    call('do-si-do', 8, { who: 'neighbor', amount: 1, shoulder: 'right' }),
    call('do-si-do', 8, { who: 'partner', amount: 1, shoulder: 'right' }),
    call('arch-dive', 4, { arch: '1s', backing: false }),
    call('arch-dive', 4, { arch: '2s', backing: true }),
    call('arch-dive', 4, { arch: '1s', backing: false }),
    call('arch-dive', 4, { arch: '2s', backing: true }),
    call('circle', 4, { direction: 'left', places: 2 }),
    call('swing-out', 12, { who: 'partner' }),
  ]);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
});
