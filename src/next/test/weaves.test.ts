/**
 * Weaving and passing figures: ricochet heys, heys started by the 1s,
 * pull bys between whoever faces, roll aways from a ring, petronella to the
 * left, Rory O'More for named dancers, and the row wordings that reach them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall, FigureResult } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { BECKET, IMPROPER } from '../core/formation.ts';
import { LIMITS } from '../core/config.ts';
import { turn } from '../core/math.ts';
import { body, type DanceState } from '../core/state.ts';
import { parseRow } from '../core/parse.ts';
import { diagonalGroups } from '../core/diagonal.ts';
import { FIGURES } from '../figures/index.ts';
import { call, near } from './helpers.ts';

const improper = (calls: readonly FigureCall[], couples = 2): DanceState =>
  foldRound(calls, IMPROPER.start(couples), FIGURES).end;
const becket = (calls: readonly FigureCall[], couples = 2): DanceState =>
  foldRound(calls, BECKET.start(couples), FIGURES).end;
const one = (text: string, beats = 8) => {
  const calls = parseRow({ beats, text });
  assert.equal(calls.length, 1, `${text}: one call`);
  return calls[0];
};
/** Lines across after a neighbor swing: neighbors side by side, partners across. */
const LINES = call('swing', 8, { who: 'neighbor' });

/** Clearance, speed and turn rate of one figure, sampled finely. */
function limits(r: FigureResult, beats: number) {
  let clearance = Infinity;
  let speed = 0;
  let yawRate = 0;
  const step = 0.02;
  let prev = r.motion(0).bodies;
  for (let t = step; t <= beats + 1e-9; t += step) {
    const now = r.motion(t).bodies;
    for (let i = 0; i < now.length; i++) {
      for (let j = i + 1; j < now.length; j++) {
        const a = now[i].position;
        const b = now[j].position;
        clearance = Math.min(clearance, Math.hypot(a.x - b.x, a.z - b.z));
      }
      const q = prev.find((p) => p.id === now[i].id)!;
      const p = now[i];
      speed = Math.max(
        speed,
        Math.hypot(p.position.x - q.position.x, p.position.z - q.position.z) / step,
      );
      yawRate = Math.max(yawRate, Math.abs(turn(p.yaw, q.yaw)) / step);
    }
    prev = now;
  }
  return { clearance, speed, yawRate };
}

function withinLimits(r: FigureResult, beats: number, what: string) {
  const l = limits(r, beats);
  assert.ok(l.clearance >= LIMITS.minimumClearance, `${what}: clearance ${l.clearance.toFixed(2)}`);
  assert.ok(l.speed <= LIMITS.maximumSpeed, `${what}: speed ${l.speed.toFixed(2)}`);
  assert.ok(l.yawRate <= LIMITS.maximumYawRate, `${what}: turn rate ${l.yawRate.toFixed(2)}`);
}

test('ricochet half hey: the larks cross, the robins bounce back to their own side', () => {
  const lines = improper([LINES]);
  for (const center of ['left', 'right'] as const) {
    for (const start of ['larks', 'robins'] as const) {
      const other = start === 'larks' ? 'robins' : 'larks';
      const r = FIGURES.hey(lines, { start, amount: 0.5, center, ricochet: [{ who: other }] }, 8);
      for (const id of [0, 1, 2, 3]) {
        const before = Math.sign(body(lines, id).position.x);
        const after = Math.sign(r.exit.bodies.get(id)!.position.x);
        const crosses = (id % 2 === 0) === (start === 'larks');
        assert.equal(after, crosses ? -before : before, `${start} start, ${center}: dancer ${id}`);
      }
      withinLimits(r, 8, `${start} start, ${center} in center, ${other} ricochet`);
    }
  }
});

test('the ricochet dancers meet in the middle but never pass', () => {
  const lines = improper([LINES]);
  const r = FIGURES.hey(
    lines,
    {
      start: 'larks',
      amount: 0.5,
      center: 'left',
      ricochet: [{ who: 'robins' }],
    },
    8,
  );
  // Robins 1 and 3 stay on their own sides of the middle the whole time.
  for (let t = 0; t <= 8; t += 0.1) {
    const [a, b] = [1, 3].map((id) => r.motion(t).bodies.find((x) => x.id === id)!.position);
    assert.ok(Math.sign(a.x) !== Math.sign(b.x) || Math.abs(a.x - b.x) > 0.3, `beat ${t}`);
  }
});

test('full hey, robins ricochet the second time: everyone ends where a half hey would', () => {
  const lines = improper([LINES]);
  const r = FIGURES.hey(
    lines,
    {
      start: 'robins',
      amount: 1,
      center: 'right',
      ricochet: [{ who: 'robins', time: 2 }],
    },
    16,
  );
  for (const id of [0, 1, 2, 3]) {
    const before = Math.sign(body(lines, id).position.x);
    const after = Math.sign(r.exit.bodies.get(id)!.position.x);
    // Robins cross once (the first meeting), larks twice.
    assert.equal(after, id % 2 === 1 ? -before : before, `dancer ${id}`);
  }
  withinLimits(r, 16, 'full ricochet hey');
  assert.throws(
    () =>
      FIGURES.hey(
        lines,
        {
          start: 'robins',
          amount: 0.5,
          center: 'right',
          ricochet: [{ who: 'robins', time: 2 }],
        },
        8,
      ),
    /do not meet in the middle 2 times/,
  );
});

test('a hey the 1s start: the 1s pass in the middle first', () => {
  const lines = improper([LINES]);
  const r = FIGURES.hey(lines, { start: '1s', amount: 0.5, center: 'right' }, 8);
  const [a, b] = [0, 1].map((id) => r.motion(2.5).bodies.find((x) => x.id === id)!.position);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.7, 'the 1s meet in the middle');
  withinLimits(r, 8, '1s start');
});

test('hey rows with ricochets, diagonals and notes parse to one hey', () => {
  assert.deepEqual(
    one('gentlespoons start a half hey - lefts in center, rights on ends - ladles ricochet').params,
    {
      start: 'larks',
      amount: 0.5,
      center: 'left',
      ricochet: [{ who: 'robins' }],
    },
  );
  assert.deepEqual(
    one(
      'robins start a full hey - rights in center, lefts on ends - larks ricochet first time, robins ricochet second time',
      16,
    ).params.ricochet,
    [
      { who: 'larks', time: 1 },
      { who: 'robins', time: 2 },
    ],
  );
  assert.equal(
    one('robins start a left diagonal half hey - rights in center, lefts on ends').params.diagonal,
    'left',
  );
  assert.equal(
    one('robins start a half hey - rights in center, lefts on ends and go to new neighbors').move,
    'hey',
  );
  assert.throws(
    () => one('robins start a half hey - rights in center, lefts on ends to long ocean wave'),
    /adds/,
  );
});

test('star rows with grips in other places and notes', () => {
  assert.deepEqual(one('star right 4 places hands across').params, {
    hand: 'right',
    places: 4,
    grip: 'hands-across',
  });
  assert.deepEqual(one('star left 4 places with shadows').params, {
    hand: 'left',
    places: 4,
  });
  assert.deepEqual(one('star left - hands across - 4 places - larks drop out').params, {
    hand: 'left',
    places: 4,
    grip: 'hands-across',
  });
  assert.equal(one('star left 3/4 (wrist grip) with these previous neighbors').params.places, 3);
  assert.throws(() => one('star right 3 places; robins turn back over right shoulder'), /adds/);
});

test('petronella rows: notes, alone, and to the left', () => {
  assert.deepEqual(
    parseRow({ beats: 8, text: 'balance & petronella (no clap)' }).map((c) => c.move),
    ['balance', 'petronella'],
  );
  assert.deepEqual(one('petronella', 4).params, {});
  const [, left] = parseRow({ beats: 8, text: 'balance & petronella left' });
  assert.deepEqual(left.params, { direction: 'left' });
  assert.equal(
    parseRow({
      beats: 8,
      text: 'balance & petronella and a little more to face new neighbors',
    }).length,
    2,
  );
});

test('petronella left: everyone moves one place clockwise and faces in again', () => {
  const start = BECKET.start(2);
  const right = becket([call('petronella', 4, {})]);
  const left = becket([call('petronella', 4, { direction: 'left' })]);
  // Right and left end in opposite neighboring places.
  for (const id of [0, 1, 2, 3]) {
    const r = right.bodies.get(id)!.position;
    const l = left.bodies.get(id)!.position;
    const s = start.bodies.get(id)!.position;
    assert.ok(Math.hypot(r.x - l.x, r.z - l.z) > 1, `${id} goes the other way`);
    assert.ok(Math.hypot(l.x - s.x, l.z - s.z) > 1, `${id} moves`);
    const inward = Math.atan2(-l.x, -l.z);
    assert.ok(Math.abs(turn(left.bodies.get(id)!.yaw, inward)) < 0.05, `${id} faces in`);
  }
  withinLimits(FIGURES.petronella(start, { direction: 'left' }, 4), 4, 'petronella left');
});

test('roll away from a ring: partners trade places across, facing the middle', () => {
  const ring = improper([call('balance', 4, { formation: 'ring' })]);
  const r = FIGURES['roll-away'](ring, { who: 'larks', whom: 'partner' }, 4);
  // The 1s stand across the top of the ring; they trade places.
  near(r.exit.bodies.get(0)!.position, body(ring, 1).position, 'lark 1');
  near(r.exit.bodies.get(1)!.position, body(ring, 0).position, 'robin 1');
  for (const id of [0, 1]) {
    const p = r.exit.bodies.get(id)!;
    assert.ok(Math.abs(turn(p.yaw, Math.atan2(-p.position.x, -p.position.z))) < 1e-6, 'faces in');
  }
  withinLimits(r, 4, 'roll away from a ring');
  assert.equal(
    one('larks roll away partners with a half sashay across the set', 4).params.axis,
    'across',
  );
  assert.throws(
    () => FIGURES['roll-away'](ring, { who: 'larks', whom: 'partner', axis: 'along' }, 4),
    /along the set/,
  );
});

test('pull by with no one named: whoever faces each other', () => {
  const s = becket([]);
  const c = one('pull by right', 4);
  assert.deepEqual(c.params, { who: 'facing', shoulder: 'right', hands: true });
  const r = FIGURES['pass-by'](s, c.params, 4);
  // In Becket each dancer faces a neighbor across the set.
  for (const id of [0, 1, 2, 3]) {
    const other = s.relations.get('neighbor')!.get(id)!;
    near(
      r.exit.bodies.get(id)!.position,
      body(s, other).position,
      `${id} takes the neighbor's place`,
    );
  }
  assert.equal(one('shadows pull by left', 4).params.who, 'facing');
  assert.equal(one('ones pass by right shoulders', 4).params.who, '1s');
  assert.equal(one('pull by right across the set w/partner', 4).params.who, 'partner');
});

test("named Rory O'More: only the named dancers' pairs slide", () => {
  const calls = parseRow({
    beats: 8,
    text: "balance & centers Rory O'More right",
  });
  assert.deepEqual(calls[1].params, {
    direction: 'right',
    spin: 'full',
    who: 'centers',
  });
  assert.equal(one("rory o'more right past shadows", 4).move, 'rory');
});

test('a hey until partners meet the second time stops with partners face to face', () => {
  const lines = becket([call('swing', 8, { who: 'neighbor' })]);
  const [c] = parseRow({
    beats: 10,
    text: 'robins start a hey - lefts in center, rights on ends - until partners meet the second time (RL, PR, LL, NR, RL)',
  });
  assert.deepEqual(c.params, {
    start: 'robins',
    center: 'left',
    until: { who: 'partner', time: 2 },
  });
  const r = FIGURES.hey(lines, c.params, 10);
  for (const [a, b] of [
    [0, 1],
    [2, 3],
  ]) {
    const pa = r.exit.bodies.get(a)!;
    const pb = r.exit.bodies.get(b)!;
    const d = Math.hypot(pa.position.x - pb.position.x, pa.position.z - pb.position.z);
    assert.ok(d < 1.1, `partners ${a} and ${b} meet (${d.toFixed(2)} m)`);
  }
  withinLimits(r, 10, 'hey until partners meet');
  // Slowing to a stop: the last step is far shorter than a walking one.
  const end = r.motion(10).bodies;
  const before = r.motion(9.9).bodies;
  for (const p of end) {
    const q = before.find((x) => x.id === p.id)!;
    assert.ok(Math.hypot(p.position.x - q.position.x, p.position.z - q.position.z) < 0.02);
  }
});

test('revolving door: the door turns once and drops the others off across', () => {
  const lines = improper([LINES]);
  const [c] = parseRow({
    beats: 8,
    text: 'revolving door - ladles take right hands and drop off neighbors on other side',
  });
  assert.deepEqual(c.params, {
    who: 'robins',
    hand: 'right',
    whom: 'neighbor',
  });
  const r = FIGURES['revolving-door'](lines, c.params, 8);
  for (const id of [0, 1, 2, 3]) {
    const before = body(lines, id).position;
    const after = r.exit.bodies.get(id)!.position;
    if (id % 2 === 1) near(after, before, `robin ${id} back home`);
    else near(after, { x: -before.x, z: -before.z }, `lark ${id} dropped off across`);
  }
  withinLimits(r, 8, 'revolving door');
  // Partners now stand side by side, ready to swing on the side.
  const s = improper([LINES, c, call('swing', 8, { who: 'partner' })]);
  assert.ok(Math.sign(body(s, 0).position.x) === Math.sign(body(s, 1).position.x));
});

test('cross trails: partners cross the set, then neighbors pass along it', () => {
  const calls = parseRow({
    beats: 4,
    text: 'cross trails - partners across the set right shoulders, neighbors along the set left shoulders',
  });
  assert.deepEqual(
    calls.map((c) => [c.move, c.beats, c.params.who, c.params.shoulder]),
    [
      ['pass-by', 2, 'partner', 'right'],
      ['pass-by', 2, 'neighbor', 'left'],
    ],
  );
});

test('twos arch, ones dive: couples trade places and face on', () => {
  // Couples one above the other in a ring: the 1s at the top, partners across.
  const ring = improper([call('balance', 4, { formation: 'ring' })]);
  const [c] = parseRow({ beats: 4, text: 'twos arch ones dive' });
  assert.deepEqual(c.params, { arch: '2s', dive: '1s' });
  const r = FIGURES['arch-dive'](ring, c.params, 4);
  for (const id of [0, 1, 2, 3]) {
    const before = body(ring, id).position;
    const after = r.exit.bodies.get(id)!.position;
    assert.ok(Math.abs(after.z + before.z) < 1e-6, `${id} trades along the set`);
  }
  // The 1s end below, facing down (on to the next couple).
  assert.ok(r.exit.bodies.get(0)!.position.z > 0);
  assert.ok(Math.abs(turn(r.exit.bodies.get(0)!.yaw, 0)) < 1e-6);
  withinLimits(r, 4, 'arch and dive');
});

test('ones half figure 8 below: the 1s trade sides around the 2s, who stand still', () => {
  const start = IMPROPER.start(2);
  const [c] = parseRow({ beats: 8, text: 'ones half figure 8 below' });
  assert.deepEqual(c.params, { who: '1s', around: 'below' });
  const r = FIGURES['figure-eight'](start, c.params, 8);
  near(r.exit.bodies.get(0)!.position, body(start, 1).position, 'lark 1 in robin 1 place');
  near(r.exit.bodies.get(1)!.position, body(start, 0).position, 'robin 1 in lark 1 place');
  for (const id of [2, 3]) near(r.exit.bodies.get(id)!.position, body(start, id).position);
  withinLimits(r, 8, 'half figure eight');
  assert.throws(
    () => FIGURES['figure-eight'](start, { who: '1s', around: 'above' }, 8),
    /not above/,
  );
});

test('zig left zag right: the pairs trade places, stepping left as they pass', () => {
  const ring = becket([call('circle', 8, { direction: 'left', places: 3 })]);
  const [c] = parseRow({ beats: 6, text: 'zig left zag right, trailing two catching hands' });
  assert.deepEqual(c.params, { first: 'left' });
  const r = FIGURES['zig-zag'](ring, c.params, 6);
  for (const id of [0, 1, 2, 3]) {
    const before = body(ring, id).position;
    assert.ok(Math.abs(r.exit.bodies.get(id)!.position.z + before.z) < 1e-6, `${id} trades`);
  }
  withinLimits(r, 6, 'zig zag');
});

test('a hey on a diagonal runs along the diagonal', () => {
  const s = becket([], 4);
  const r = FIGURES.hey(
    s,
    { start: 'robins', amount: 0.5, center: 'right', diagonal: 'left' } as never,
    8,
  );
  // Everyone crosses the diagonal line between the two couples.
  const g = diagonalGroups(s, 'left')[0];
  const mid = {
    x: g.reduce((n, id) => n + body(s, id).position.x, 0) / 4,
    z: g.reduce((n, id) => n + body(s, id).position.z, 0) / 4,
  };
  for (const id of g) {
    const a = body(s, id).position;
    const b = r.exit.bodies.get(id)!.position;
    assert.ok((a.x - mid.x) * (b.x - mid.x) + (a.z - mid.z) * (b.z - mid.z) < 0, `${id} crosses`);
  }
  assert.ok(limits(r, 8).clearance >= LIMITS.minimumClearance);
});

test('star promenade rows with picking up partners, and balance the star', () => {
  assert.deepEqual(one('star promenade left ½ larks pick up partner', 4).params, {
    hand: 'left',
    amount: 0.5,
  });
  assert.equal(
    one('larks allemande left 1½ to pick up partner for a star promenade').move,
    'allemande',
  );
  assert.deepEqual(one('balance the star', 4).params, { formation: 'ring' });
});

test('larks gate neighbors to face down: the larks pivot, the neighbors walk around', () => {
  const lines = improper([LINES]);
  const [c] = parseRow({ beats: 8, text: 'larks gate neighbors to face down the set' });
  assert.deepEqual(c.params, { who: 'larks', whom: 'neighbor', face: 'down' });
  const r = FIGURES.gate(lines, c.params, 8);
  for (const id of [0, 2]) near(r.exit.bodies.get(id)!.position, body(lines, id).position);
  for (const id of [0, 1, 2, 3])
    assert.ok(Math.abs(turn(r.exit.bodies.get(id)!.yaw, 0)) < 1e-6, `${id} faces down`);
  withinLimits(r, 8, 'gate');
});
