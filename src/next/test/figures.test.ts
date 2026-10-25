import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BECKET } from '../core/formation.ts';
import { MINOR_SET_PROGRESSION } from '../core/progression.ts';

const becketStart = (couples: number) => BECKET.start(couples);
import { body, type DanceState } from '../core/state.ts';
import { allemande } from '../figures/allemande.ts';
import { balance } from '../figures/balance.ts';
import { circle } from '../figures/circle.ts';
import { passThrough } from '../figures/pass-through.ts';
import { rory } from '../figures/rory.ts';
import { slice } from '../figures/slice.ts';
import { swing } from '../figures/swing.ts';
import { forward, dot, sub } from '../core/math.ts';
import {
  after,
  BALANCE,
  call,
  FACE_DOWN,
  FACE_WEST,
  FACE_UP,
  FACE_EAST,
  facing,
  near,
  PASS,
  RORY_RIGHT,
  TO_WAVE,
} from './helpers.ts';

const LARKS_HALF = call('allemande', 2, { who: 'larks', hand: 'left', amount: 0.5 });
const NEIGHBOR_SWING = call('swing', 14, { who: 'neighbor' });
const pos = (s: DanceState, id: number) => body(s, id).position;
const yaw = (s: DanceState, id: number) => body(s, id).yaw;
const holds = (s: DanceState) =>
  s.hands
    .map(
      (h) =>
        `${Math.min(h.a, h.b)}-${Math.max(h.a, h.b)}:${h.a < h.b ? h.handA : h.handB}/${h.a < h.b ? h.handB : h.handA}`,
    )
    .sort();

test('slice left moves every couple one place to its left, facing new neighbors', () => {
  const start = becketStart(4);
  const moved = slice(start, { direction: 'left', back: 'straight' }, 8).exit;
  assert.equal(moved.epoch, 0, 'the figure itself rebinds no one');
  const exit = MINOR_SET_PROGRESSION.rebind(moved);
  near(pos(exit, 0), { x: -0.9, z: -0.9 }, 'east lark');
  near(pos(exit, 6), { x: 0.9, z: 0.9 }, 'west lark');
  facing(yaw(exit, 0), FACE_EAST);
  assert.equal(exit.epoch, 1);
  assert.equal(exit.relations.get('neighbor')!.get(0), 7);
  assert.deepEqual(exit.groups, [[0, 1, 6, 7]]);
  assert.deepEqual(exit.waiting.map((w) => w.couple).sort(), [1, 2]);
});

test('slice dips toward the other line halfway, then backs straight up', () => {
  const { motion } = slice(becketStart(2), { direction: 'left' }, 8);
  const mid = motion(4).bodies.find((b) => b.id === 0)!;
  near(mid.position, { x: -(0.9 - 0.52), z: -2.7 }, 'diagonal end');
});

test('slice rejects held hands and unknown parameters', () => {
  const waved = after([PASS, TO_WAVE]);
  assert.throws(() => slice(waved, { direction: 'left' }, 8), /free hands/);
  assert.throws(() => slice(becketStart(2), { direction: 'up' } as never, 8), /direction/);
  assert.throws(
    () => slice(becketStart(2), { direction: 'left', speed: 2 } as never, 8),
    /does not take speed/,
  );
});

test('pass through ends in the opposite place, facing the same way', () => {
  const { exit } = passThrough(becketStart(2), { shoulder: 'right' }, 4);
  near(pos(exit, 0), { x: 0.9, z: -0.9 });
  near(pos(exit, 3), { x: -0.9, z: -0.9 });
  facing(yaw(exit, 0), FACE_EAST);
  facing(yaw(exit, 3), FACE_WEST);
});

test('pass through needs someone to pass', () => {
  const passed = after([PASS]);
  assert.throws(() => passThrough(passed, {}, 4), /must face exactly one dancer/);
});

test('partners allemande right 3/4 ends in a short wave with larks in the middle', () => {
  const s = after([PASS]);
  const { exit } = allemande(
    s,
    { who: 'partner', hand: 'right', amount: 0.75, wave: { middle: 'lark' } },
    4,
  );
  near(pos(exit, 1), { x: 1.35, z: 0 }, 'robin 1');
  near(pos(exit, 0), { x: 0.45, z: 0 }, 'lark 0');
  near(pos(exit, 2), { x: -0.45, z: 0 }, 'lark 2');
  near(pos(exit, 3), { x: -1.35, z: 0 }, 'robin 3');
  facing(yaw(exit, 0), FACE_UP);
  facing(yaw(exit, 1), FACE_DOWN);
  facing(yaw(exit, 2), FACE_DOWN);
  facing(yaw(exit, 3), FACE_UP);
  assert.deepEqual(holds(exit), ['0-1:right/right', '0-2:left/left', '2-3:right/right']);
});

test('allemande says so when it cannot form the wave it was asked for', () => {
  const s = after([PASS]);
  assert.throws(
    () =>
      allemande(s, { who: 'partner', hand: 'right', amount: 0.75, wave: { middle: 'robin' } }, 4),
    /robins in the middle/,
  );
  assert.throws(() => allemande(s, { who: 'partner', hand: 'right', amount: 0 }, 4), /amount/);
});

test('larks allemande left 1/2 swaps the larks and turns them around', () => {
  const { exit } = allemande(
    after([PASS, TO_WAVE]),
    { who: 'larks', hand: 'left', amount: 0.5 },
    2,
  );
  near(pos(exit, 0), { x: -0.45, z: 0 });
  near(pos(exit, 2), { x: 0.45, z: 0 });
  facing(yaw(exit, 0), FACE_DOWN);
  facing(yaw(exit, 2), FACE_UP);
  assert.deepEqual(holds(exit), [], 'a half turn lets go at the end');
});

test('allemande lets go of a wave to turn, but not of a lone hold', () => {
  const waved = after([PASS, TO_WAVE]);
  const { exit } = allemande(waved, { who: 'neighbor', hand: 'right', amount: 0.5 }, 2);
  assert.deepEqual(holds(exit), [], 'the wave is let go and the half turn lets go too');
  // Partners alone holding right hands (no line): the hand is busy.
  const lone = { ...waved, hands: waved.hands.filter((h) => h.handA === 'right') };
  assert.ok(lone.hands.length > 0 && lone.hands.length < waved.hands.length);
  assert.throws(
    () => allemande(lone, { who: 'neighbor', hand: 'right', amount: 0.5 }, 2),
    /hand is not free/,
  );
});

test('wave balance returns to place and keeps hands', () => {
  const s = after([PASS, TO_WAVE]);
  const { exit, motion } = balance(
    s,
    { formation: 'wave', style: 'right-left', first: 'right' },
    4,
  );
  for (const id of [0, 1, 2, 3]) near(pos(exit, id), pos(s, id));
  // Beat 1: lark 0 (facing up) has stepped to its right (-x).
  near(motion(1).bodies.find((b) => b.id === 0)!.position, { x: 0.55, z: 0 });
  assert.deepEqual(holds(exit), holds(s));
});

test('balance needs a held wave', () => {
  assert.throws(() => balance(becketStart(2), { formation: 'wave' }, 4), /line|wave/);
  assert.throws(() => balance(after([PASS, TO_WAVE]), { formation: 'wave' }, 10), /four beats/);
});

test('an 8-beat wave balance balances twice; a 2-beat one balances quickly', () => {
  const s = after([PASS, TO_WAVE]);
  const twice = balance(s, { formation: 'wave', style: 'right-left', first: 'right' }, 8);
  const once = balance(s, { formation: 'wave', style: 'right-left', first: 'right' }, 4);
  for (const id of [0, 1, 2, 3]) {
    near(pos(twice.exit, id), pos(s, id));
    const mid = twice.motion(5).bodies.find((b) => b.id === id)!.position;
    near(mid, once.motion(1).bodies.find((b) => b.id === id)!.position);
  }
  const quick = balance(s, { formation: 'wave', style: 'right-left', first: 'right' }, 2);
  near(
    quick.motion(1).bodies.find((b) => b.id === 0)!.position,
    once.motion(2).bodies.find((b) => b.id === 0)!.position,
  );
});

test('Rory right: each dancer passes the one held by the right hand, spinning clockwise once', () => {
  const s = after([PASS, TO_WAVE, BALANCE]);
  const { exit } = rory(s, { direction: 'right', spin: 'full' }, 4);
  near(pos(exit, 0), { x: 1.35, z: 0 });
  near(pos(exit, 1), { x: 0.45, z: 0 });
  near(pos(exit, 2), { x: -1.35, z: 0 });
  near(pos(exit, 3), { x: -0.45, z: 0 });
  assert.ok(Math.abs(yaw(exit, 0) - (yaw(s, 0) - 2 * Math.PI)) < 1e-9, 'one full clockwise turn');
  assert.deepEqual(holds(exit), ['0-1:left/left', '1-3:right/right', '2-3:left/left']);
});

test('Rory left from robins in the middle undoes Rory right, spinning counterclockwise', () => {
  const s = after([PASS, TO_WAVE, BALANCE, RORY_RIGHT]);
  const { exit } = rory(s, { direction: 'left' }, 4);
  near(pos(exit, 0), { x: 0.45, z: 0 });
  near(pos(exit, 1), { x: 1.35, z: 0 });
  assert.ok(Math.abs(yaw(exit, 0) - (yaw(s, 0) + 2 * Math.PI)) < 1e-9);
});

test('Rory needs the travel-side hand held', () => {
  const s = after([PASS, TO_WAVE]);
  assert.throws(() => rory(s, { direction: 'left' }, 4), /must hold the left hand/);
});

test('Rory passes face to face: each bows back so the pair meets front to front', () => {
  const s = after([PASS, TO_WAVE, BALANCE]);
  for (const spin of ['full', 'none'] as const) {
    const { motion } = rory(s, { direction: 'right', spin }, 4);
    const mid = new Map(motion(2).bodies.map((b) => [b.id, b]));
    const lark = mid.get(0)!;
    const robin = mid.get(1)!;
    // Halfway, the lark (facing up the hall at the start) has bowed back and
    // the robin passes in front of the lark, and vice versa.
    assert.ok(
      dot(forward(yaw(s, 0)), sub(robin.position, lark.position)) > 0.8,
      `${spin}: robin in front of lark`,
    );
    assert.ok(
      dot(forward(yaw(s, 1)), sub(lark.position, robin.position)) > 0.8,
      `${spin}: lark in front of robin`,
    );
    // Without a spin they also face each other; with one they are mid-twirl.
    if (spin === 'none') {
      assert.ok(
        dot(forward(lark.yaw), sub(robin.position, lark.position)) > 0,
        'lark faces the robin as they pass',
      );
      assert.ok(
        dot(forward(robin.yaw), sub(lark.position, robin.position)) > 0,
        'robin faces the lark as they pass',
      );
    }
  }
});

test('neighbor swing ends facing across on the near side, lark on the left', () => {
  const s = after([
    PASS,
    TO_WAVE,
    BALANCE,
    RORY_RIGHT,
    BALANCE,
    call('rory', 4, { direction: 'left' }),
    LARKS_HALF,
  ]);
  const { exit } = swing(s, { who: 'neighbor' }, 14);
  near(pos(exit, 0), { x: -0.9, z: -0.9 });
  near(pos(exit, 3), { x: -0.9, z: 0.9 });
  near(pos(exit, 2), { x: 0.9, z: 0.9 });
  near(pos(exit, 1), { x: 0.9, z: -0.9 });
  facing(yaw(exit, 0), FACE_EAST);
  facing(yaw(exit, 2), FACE_WEST);
  assert.deepEqual(exit.hands, []);
});

test('swing holds the closed frame in the middle of the figure', () => {
  const s = after([PASS, TO_WAVE, LARKS_HALF]);
  const { motion } = swing(s, { who: 'neighbor' }, 14);
  const frame = motion(7);
  assert.equal(frame.contacts.filter((c) => c.kind === 'swing-frame').length, 6);
  const a = frame.bodies.find((b) => b.id === 0)!.position;
  const b = frame.bodies.find((b) => b.id === 3)!.position;
  assert.ok(Math.abs(Math.hypot(a.x - b.x, a.z - b.z) - 0.62) < 1e-6);
});

test('swing in the middle of the set has no side to open to', () => {
  const s = after([PASS, TO_WAVE]);
  assert.throws(() => swing(s, { who: 'neighbor' }, 8), /nearer one side/);
});

test('circle left 3 places moves each dancer three quarters around, facing in', () => {
  const s = after([PASS, TO_WAVE, LARKS_HALF, NEIGHBOR_SWING]);
  const { exit, motion } = circle(s, { direction: 'left', places: 3 }, 8);
  near(pos(exit, 0), { x: -0.9, z: 0.9 });
  near(pos(exit, 1), { x: -0.9, z: -0.9 });
  near(pos(exit, 2), { x: 0.9, z: -0.9 });
  near(pos(exit, 3), { x: 0.9, z: 0.9 });
  facing(yaw(exit, 0), (3 * Math.PI) / 4, 'lark 0 faces the center');
  assert.equal(motion(4).contacts.length, 4);
  assert.deepEqual(exit.hands, []);
});

test('circle needs free hands and a ring of four', () => {
  assert.throws(
    () => circle(after([PASS, TO_WAVE]), { direction: 'left', places: 3 }, 8),
    /free hands/,
  );
  assert.throws(() => circle(becketStart(2), { direction: 'left', places: 0 }, 8), /places/);
});

test('partner swing after the circle returns the couple to its side', () => {
  const s = after([
    PASS,
    TO_WAVE,
    LARKS_HALF,
    NEIGHBOR_SWING,
    call('circle', 8, { direction: 'left', places: 3 }),
  ]);
  const { exit } = swing(s, { who: 'partner' }, 8);
  near(pos(exit, 0), { x: -0.9, z: -0.9 });
  near(pos(exit, 1), { x: -0.9, z: 0.9 });
  facing(yaw(exit, 1), FACE_EAST);
});
