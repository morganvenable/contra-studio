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
import { MINOR_SET_PROGRESSION } from '../core/progression.ts';
import { after, call, near, PASS, TO_WAVE } from './helpers.ts';
import { findWave } from '../core/lines.ts';

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
  // Ending in long waves: the hey's own end; the balance after it forms them.
  assert.equal(
    one('robins start a half hey - rights in center, lefts on ends to long ocean wave').move,
    'hey',
  );
  assert.throws(
    () => one('robins start a half hey - rights in center, lefts on ends larks turn to the wall'),
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
  // A trailing motion becomes its own call over the last two beats.
  assert.deepEqual(
    parseRow({ beats: 8, text: 'star right 3 places; robins turn back over right shoulder' }).map(
      (c) => [c.move, c.beats],
    ),
    [
      ['star', 6],
      ['turn-back', 2],
    ],
  );
  assert.throws(() => one('star right 3 places, robins form a tower'), /adds/);
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
  // The plain wording reads as rolling arches (figures/sets/arch-dive.ts);
  // wordings only this reading takes still come here (figures/two-readings.ts).
  const [plain] = parseRow({ beats: 4, text: 'twos arch ones dive' });
  assert.deepEqual(plain.params, { arch: '2s', backing: false });
  const [c] = parseRow({ beats: 4, text: 'twos arch, ones dive through' });
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

test('Becket progression with partners across the set, after a zig zag', () => {
  const s = becket(
    [call('circle', 8, { direction: 'left', places: 3 }), call('zig-zag', 6, { first: 'left' })],
    4,
  );
  const next = MINOR_SET_PROGRESSION.rebind(s);
  assert.equal(next.groups.length, 1, 'one new minor set in the middle, two couples waiting');
  for (const [a, b] of next.relations.get('neighbor')!) {
    assert.notEqual(next.dancers[a].role, next.dancers[b].role);
    assert.notEqual(next.dancers[a].couple, next.dancers[b].couple);
  }
  // The new minor set is two couples that did not just dance together.
  const g = next.groups[0];
  assert.ok(!s.groups.some((old) => g.every((id) => old.includes(id))));
});

test('ones contra corners: the 1s turn each other and two corners each, reaching the next minor set', () => {
  const s = improper([call('figure-eight', 8, { who: '1s', around: 'below' })], 6);
  const [c] = parseRow({ beats: 16, text: 'ones contra corners' });
  assert.deepEqual(c.params, { who: '1s' });
  const r = FIGURES['contra-corners'](s, c.params, 16);
  withinLimits(r, 16, 'contra corners');
  const ones = s.positions.get('1s')!;
  // Corners come back to their places; someone outside each 1s' minor set moves.
  const moved = s.dancers.filter((d) => {
    const a = body(s, d.id).position;
    return [4, 8, 12].some((t) => {
      const b = r.motion(t).bodies.find((x) => x.id === d.id)?.position;
      return b && Math.hypot(a.x - b.x, a.z - b.z) > 0.3;
    });
  });
  assert.ok(
    moved.some((d) => !ones.includes(d.id)),
    'corners turn too',
  );
  for (const d of s.dancers)
    if (!ones.includes(d.id)) near(r.exit.bodies.get(d.id)!.position, body(s, d.id).position);
});

test('mad ricochet: the dancers in front meet in the middle and bounce back; all end home', () => {
  const lines = improper([LINES]);
  const [c] = parseRow({
    beats: 8,
    text: 'mad robins, gentlespoons in front Mad Ricochet same gender ricochet out of center with both hands',
  });
  assert.equal(c.move, 'mad-ricochet');
  const r = FIGURES['mad-ricochet'](lines, c.params, 8);
  for (const id of [0, 1, 2, 3]) near(r.exit.bodies.get(id)!.position, body(lines, id).position);
  // The larks come within reach of each other in the middle.
  let closest = Infinity;
  for (let t = 0; t <= 8; t += 0.1) {
    const [a, b] = [0, 2].map((id) => r.motion(t).bodies.find((x) => x.id === id)!.position);
    closest = Math.min(closest, Math.hypot(a.x - b.x, a.z - b.z));
  }
  assert.ok(closest < 1, `larks meet (${closest.toFixed(2)} m)`);
  withinLimits(r, 8, 'mad ricochet');
});

test('neighbors balance and star thru: they trade places, both turning a quarter', () => {
  const start = IMPROPER.start(2);
  const calls = parseRow({ beats: 8, text: 'neighbors balance and star through' });
  assert.deepEqual(
    calls.map((c) => c.move),
    ['balance', 'star-thru'],
  );
  const r = FIGURES['star-thru'](start, { who: 'neighbor' }, 4);
  near(r.exit.bodies.get(0)!.position, body(start, 3).position, 'lark 1 in robin 2 place');
  // Lark 1 faced down; a quarter right faces across into the set.
  assert.ok(Math.abs(turn(r.exit.bodies.get(0)!.yaw, -Math.PI / 2)) < 1e-6);
  withinLimits(r, 4, 'star thru');
});

test('dolphin hey: the 1s weave as one with the 2s and everyone ends home', () => {
  const start = IMPROPER.start(2);
  const [c] = parseRow({
    beats: 16,
    text: 'dolphin hey - start with ones passing second robins by left shoulders',
  });
  assert.deepEqual(c.params, { pair: '1s', first: 'robins', shoulder: 'left' });
  const r = FIGURES['dolphin-hey'](start, c.params, 16);
  for (const id of [0, 1, 2, 3]) near(r.exit.bodies.get(id)!.position, body(start, id).position);
  withinLimits(r, 16, 'dolphin hey');
});

test('facing star: the robins back up around the star with their other hand in', () => {
  const ring = becket([]);
  const [c] = parseRow({
    beats: 8,
    text: 'facing star clockwise 3 places with robins putting their left hands in and backing up',
  });
  assert.deepEqual(c.params, { hand: 'right', places: 3, backing: 'robins' });
  const r = FIGURES.star(ring, c.params, 8);
  withinLimits(r, 8, 'facing star');
  // Mid-star the robins face against the way they walk.
  const before = r.motion(3.9).bodies.find((b) => b.id === 1)!;
  const after = r.motion(4.1).bodies.find((b) => b.id === 1)!;
  const walk = { x: after.position.x - before.position.x, z: after.position.z - before.position.z };
  const ahead = { x: Math.sin(after.yaw), z: Math.cos(after.yaw) };
  assert.ok(walk.x * ahead.x + walk.z * ahead.z < 0, 'the robin backs up');
});

test('petronella two places turns twice and ends facing in', () => {
  const start = BECKET.start(2);
  const r = FIGURES.petronella(start, { places: 2 }, 4);
  for (const id of [0, 1, 2, 3]) {
    const p = r.exit.bodies.get(id)!;
    assert.ok(
      Math.abs(turn(p.yaw, Math.atan2(-p.position.x, -p.position.z))) < 0.05,
      `${id} faces in`,
    );
  }
});

test('circular hey: four changes around the ring bring everyone home', () => {
  const start = BECKET.start(2);
  const [c] = parseRow({
    beats: 16,
    text: 'partners start a full circular hey - rights across, lefts along - and end next to next neighbors',
  });
  assert.deepEqual(c.params, { start: 'partner', shoulder: 'right', changes: 4 });
  const r = FIGURES['circular-hey'](start, c.params, 16);
  for (const id of [0, 1, 2, 3]) near(r.exit.bodies.get(id)!.position, body(start, id).position);
  withinLimits(r, 16, 'circular hey');
  const three = FIGURES['circular-hey'](
    start,
    { start: 'neighbor', shoulder: 'right', changes: 3 },
    6,
  );
  withinLimits(three, 6, 'three changes');
});

test('meanwhile: the centers slide while the ends turn, on different dancers', () => {
  const wave = after([PASS, TO_WAVE]);

  const calls = parseRow({
    beats: 8,
    text: "balance & centers Rory O'More left while ends turn over right shoulder",
  });
  assert.deepEqual(
    calls.map((c) => c.move),
    ['balance', 'meanwhile'],
  );
  const line = findWave(wave, wave.groups[0]);
  const [e1, c1, c2, e2] = line.order;
  const end = foldRound(calls, wave, FIGURES).end;
  // The ends stay in place, facing the other way; the centers trade places.
  for (const id of [e1, e2]) {
    near(body(end, id).position, body(wave, id).position, `end ${id} stays`, 1e-3);
    assert.ok(Math.abs(Math.abs(turn(body(end, id).yaw, body(wave, id).yaw)) - Math.PI) < 1e-2);
  }
  near(body(end, c1).position, body(wave, c2).position, 'centers trade', 1e-3);
  // Two figures moving the same dancer cannot happen at once.
  assert.throws(
    () =>
      FIGURES.meanwhile(
        wave,
        {
          first: { move: 'turn-back', params: {} },
          second: { move: 'turn-back', params: { who: 'larks' } },
        },
        4,
      ),
    /can't happen at once/,
  );
});

test('a star by eighths: 7/8 ends on a diamond', () => {
  const start = BECKET.start(2);
  const c = one('star l 7/8');
  assert.deepEqual(c.params, { hand: 'left', places: 3.5 });
  const r = FIGURES.star(start, c.params, 8);
  withinLimits(r, 8, 'star 7/8');
  // Half places: everyone ends on the set's center lines, a diamond.
  for (const id of [0, 1, 2, 3]) {
    const p = r.exit.bodies.get(id)!.position;
    assert.ok(Math.abs(p.x) < 1e-6 || Math.abs(p.z) < 1e-6, `${id} on a diamond point`);
  }
});

test('chevron: neighbors trade places, the named role along a V', () => {
  const lines = improper([LINES]);
  const [c] = parseRow({ beats: 6, text: "larks chevron into neighbors' place" });
  assert.deepEqual(c.params, { who: 'larks' });
  const r = FIGURES.chevron(lines, c.params, 6);
  for (const id of [0, 1, 2, 3]) {
    const other = lines.relations.get('neighbor')!.get(id)!;
    near(r.exit.bodies.get(id)!.position, body(lines, other).position);
  }
  withinLimits(r, 6, 'chevron');
});
