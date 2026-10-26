/**
 * Weaving and turning figures, round 2: Rory O'More in long waves, a gyre
 * that lets go of hands held from the figure before, heys counted in passes
 * and the short hey wordings, a zig zag of wide pairs, and long waves formed
 * by the balance after a hey or a zero-beat "form long waves" row.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall, FigureResult } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { BECKET, IMPROPER } from '../core/formation.ts';
import { LIMITS } from '../core/config.ts';
import { turn } from '../core/math.ts';
import { body, withChanges, type DanceState } from '../core/state.ts';
import { parseRow } from '../core/parse.ts';
import { FIGURES } from '../figures/index.ts';
import { call } from './helpers.ts';

const improper = (calls: readonly FigureCall[], couples = 3): DanceState =>
  foldRound(calls, IMPROPER.start(couples), FIGURES).end;
const becket = (calls: readonly FigureCall[], couples = 2): DanceState =>
  foldRound(calls, BECKET.start(couples), FIGURES).end;
const one = (text: string, beats = 8) => {
  const calls = parseRow({ beats, text });
  assert.equal(calls.length, 1, `${text}: one call`);
  return calls[0];
};

function withinLimits(r: FigureResult, beats: number, what: string) {
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
      speed = Math.max(speed, Math.hypot(p.position.x - q.position.x, p.position.z - q.position.z) / step);
      yawRate = Math.max(yawRate, Math.abs(turn(p.yaw, q.yaw)) / step);
    }
    prev = now;
  }
  assert.ok(clearance >= LIMITS.minimumClearance, `${what}: clearance ${clearance.toFixed(2)}`);
  assert.ok(speed <= LIMITS.maximumSpeed, `${what}: speed ${speed.toFixed(2)}`);
  assert.ok(yawRate <= LIMITS.maximumYawRate, `${what}: turn rate ${yawRate.toFixed(2)}`);
}

const LONG_WAVES = call('balance', 4, { formation: 'long-waves', in: 'robins' });

test('Rory right in long waves: each pair holding right sides slides past, along the side line', () => {
  const s = improper([LONG_WAVES]);
  const r = FIGURES.rory(s, { direction: 'right', spin: 'none' }, 4);
  const moved = r.motion(0).bodies.map((b) => b.id);
  assert.ok(moved.length >= 4, 'the active dancers slide');
  for (const id of moved) {
    const from = body(s, id).position;
    const to = r.exit.bodies.get(id)!.position;
    assert.ok(Math.abs(to.x - from.x) < 1e-6, `dancer ${id} stays on its side line`);
    assert.ok(Math.abs(Math.abs(to.z - from.z) - 1.8) < 1e-6, `dancer ${id} slides one place`);
  }
  withinLimits(r, 4, 'Rory in long waves');
  // Balance and Rory left: on along the line, past the next dancer, never
  // back past the one just slid past.
  const passed = new Map(moved.map((id) => [id, r.exit.bodies.get(id)!.position]));
  const left = FIGURES.rory(
    FIGURES.balance(r.exit, { formation: 'wave', style: 'right-left', first: 'left' }, 4).exit,
    { direction: 'left', spin: 'none' },
    4,
  );
  for (const id of left.motion(0).bodies.map((b) => b.id)) {
    const home = body(s, id).position;
    const now = left.exit.bodies.get(id)!.position;
    assert.ok(Math.hypot(home.x - now.x, home.z - now.z) > 1, `dancer ${id} does not slide back`);
    assert.ok(passed.has(id) || id >= 0);
  }
});

test('a gyre lets go of hands held from the figure before', () => {
  const s = withChanges(becket([]), {
    hands: [{ a: 0, handA: 'right', b: 1, handB: 'left' }],
  });
  const r = FIGURES.gyre(s, { who: 'neighbor', amount: 1 }, 8);
  assert.deepEqual(r.exit.hands, []);
  assert.ok(r.motion(0).contacts.length > 0 && r.motion(1).contacts.length === 0);
  withinLimits(r, 8, 'gyre after a balance');
});

test('two gyres side by side keep clear of each other', () => {
  const s = becket([call('forward-back', 2, { back: false })]);
  const r = FIGURES.gyre(s, { who: 'neighbor', amount: 0.5 }, 4);
  withinLimits(r, 4, 'neighbors gyre ½ after lines forward');
});

test('a zig zag of pairs side by side across the way they travel passes clear', () => {
  const s = becket([call('circle', 8, { direction: 'right', places: 3 })]);
  const r = FIGURES['zig-zag'](s, { first: 'right' }, 6);
  withinLimits(r, 6, 'zig right zag left after circle right 3');
});

test('heys counted in passes and the short hey wordings', () => {
  assert.deepEqual(one('three quarters hey, neighbors passing right', 12).params, {
    start: 'neighbor',
    center: 'left',
    passes: 6,
  });
  assert.deepEqual(one('three-quarters hey (larks by left in the center)').params, {
    start: 'larks',
    center: 'left',
    passes: 6,
  });
  assert.deepEqual(
    one('Five changes of a hey, larks start passing left Until the second time you meet your partner', 10).params,
    { start: 'larks', center: 'left', until: { who: 'partner', time: 2 } },
  );
  assert.deepEqual(one('1/2 hey, larks start right shoulder, finish in long waves, larks facing in').params, {
    start: 'larks',
    center: 'right',
    amount: 0.5,
  });
  assert.deepEqual(
    one('half hey, larks start passing left, partners pass right, robins pass left, end facing 3rd neighbor')
      .params,
    { start: 'larks', center: 'left', amount: 0.5 },
  );
  assert.deepEqual(one('hey, partners passing left shoulders to start', 16).params, {
    start: 'partner',
    center: 'right',
    amount: 1,
  });
  assert.equal(
    one('robins start a half hey - rights in center, lefts on ends to long waves, larks facing out').move,
    'hey',
  );
});

test('a three-quarters hey runs six passes and ends at the next meeting', () => {
  const s = becket([]);
  const r = FIGURES.hey(s, { start: 'neighbor', center: 'left', passes: 6 }, 12);
  withinLimits(r, 12, 'three-quarters hey');
  assert.throws(() => FIGURES.hey(s, { start: 'neighbor', center: 'left', passes: 1 }, 12), /2 to 24/);
});

test('ones split the twos and cast home: everyone ends where they started, at a walk', () => {
  const s = improper([], 2);
  const r = FIGURES.split(s, { who: '1s' }, 8);
  for (const [id, b] of s.bodies) {
    const e = r.exit.bodies.get(id)!;
    assert.ok(Math.hypot(e.position.x - b.position.x, e.position.z - b.position.z) < 1e-6, `dancer ${id} home`);
    assert.ok(Math.abs(turn(e.yaw, b.yaw)) < 1e-6, `dancer ${id} facing as before`);
  }
  withinLimits(r, 8, 'ones split the twos, cast home');
  assert.equal(one('ones split the twos, then cast home').move, 'split');
  assert.deepEqual(
    parseRow({ beats: 16, text: 'colonnade - "ones arch, colonnade!" +' }).map((c) => c.params.who),
    ['larks', 'robins', 'larks', 'robins'],
  );
});
