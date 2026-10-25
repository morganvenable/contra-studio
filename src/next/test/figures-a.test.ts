/**
 * Shadows and the figures built with them: orbit allemandes, long waves in
 * the center, two-hand turns, couples do-si-do, stand still, and the hall,
 * long-lines and turn-alone variants. Each test checks the exit state, the
 * beats, and that nobody collides, rushes or spins too fast on the way.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall, FigureResult } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { BECKET, IMPROPER } from '../core/formation.ts';
import { LIMITS } from '../core/config.ts';
import { distance, turn } from '../core/math.ts';
import { parseRow } from '../core/parse.ts';
import { body, type DanceState } from '../core/state.ts';
import { FIGURES } from '../figures/index.ts';
import { call, facing, FACE_DOWN, FACE_EAST, FACE_WEST, near } from './helpers.ts';

const fold = (start: DanceState, calls: readonly FigureCall[]) =>
  foldRound(calls, start, FIGURES).end;

/** Run one call and check clearance, speed and turn rate over its frames. */
function run(start: DanceState, c: FigureCall): DanceState {
  const result: FigureResult = FIGURES[c.move](start, c.params, c.beats);
  const step = 0.05;
  let last = new Map(start.bodies);
  for (let beat = step; beat <= c.beats + 1e-9; beat += step) {
    const now = new Map(start.bodies);
    for (const b of result.motion(beat).bodies) now.set(b.id, b);
    const ids = [...now.keys()];
    for (let i = 0; i < ids.length; i++) {
      const a = now.get(ids[i])!;
      const was = last.get(ids[i])!;
      assert.ok(
        distance(a.position, was.position) / step <= LIMITS.maximumSpeed + 1e-6,
        `${c.move}: dancer ${ids[i]} too fast at beat ${beat.toFixed(2)}`,
      );
      assert.ok(
        Math.abs(turn(a.yaw, was.yaw)) / step <= LIMITS.maximumYawRate + 1e-6,
        `${c.move}: dancer ${ids[i]} turns too fast at beat ${beat.toFixed(2)}`,
      );
      for (let j = i + 1; j < ids.length; j++) {
        const d = distance(a.position, now.get(ids[j])!.position);
        assert.ok(
          d >= LIMITS.minimumClearance - 1e-6,
          `${c.move}: dancers ${ids[i]} and ${ids[j]} ${d.toFixed(2)} m apart at beat ${beat.toFixed(2)}`,
        );
      }
    }
    last = now;
  }
  return result.exit;
}

const row = (text: string, beats: number) => parseRow({ text, beats });

test('shadows allemande: the 2s of one minor set turn the 1s below them', () => {
  const start = IMPROPER.start(4);
  const [c] = row('shadows allemande left once', 8);
  assert.deepEqual(c.params, { who: 'shadow', hand: 'left', amount: 1 });
  const end = run(start, c);
  for (const id of [0, 1, 2, 3, 4, 5, 6, 7])
    near(body(end, id).position, body(start, id).position, `dancer ${id} back home`);
  // Minor sets and relationships come back after the figure.
  assert.deepEqual(end.groups, start.groups);
  assert.equal(end.relations.has('shadow'), false);
});

test('orbit: larks allemande left once while the robins orbit clockwise ½', () => {
  const start = IMPROPER.start(2);
  const [c] = row('gentlespoons allemande left once around while the ladles orbit clockwise ½ around', 8);
  assert.equal(c.move, 'orbit');
  const end = run(start, c);
  near(body(end, 0).position, body(start, 0).position, 'lark 1 home');
  near(body(end, 2).position, body(start, 2).position, 'lark 2 home');
  near(body(end, 1).position, body(start, 3).position, 'robin 1 in robin 2s place');
  near(body(end, 3).position, body(start, 1).position, 'robin 2 in robin 1s place');
  facing(body(end, 1).yaw, body(start, 3).yaw, 'robin 1 faces as robin 2 did');
});

test('long wave in the center: robins dance in, then trade with the larks', () => {
  const start = IMPROPER.start(4);
  const [inward] = row('ladles dance in to a long wave in the center - balance the wave', 8);
  const s1 = run(start, inward);
  for (const id of [1, 3, 5, 7]) assert.ok(Math.abs(body(s1, id).position.x) < 1e-6);
  facing(body(s1, 1).yaw, FACE_EAST, 'robin 1 came in from the west');
  facing(body(s1, 3).yaw, FACE_WEST, 'robin 2 came in from the east');
  assert.ok(
    s1.hands.some((h) => [h.a, h.b].sort().join() === '1,3' && h.handA === 'right'),
    'the robins of a minor set hold right hands',
  );
  for (const id of [0, 2, 4, 6]) near(body(s1, id).position, body(start, id).position);
  const [swap] = row(
    'ladles dance out while gentlespoons dance in to a long wave in the center - balance the wave',
    8,
  );
  const s2 = run(s1, swap);
  for (const id of [0, 2, 4, 6]) assert.ok(Math.abs(body(s2, id).position.x) < 1e-6);
  for (const id of [1, 3, 5, 7]) assert.ok(Math.abs(Math.abs(body(s2, id).position.x) - 0.9) < 1e-6);
  assert.ok(
    s2.hands.some((h) => [h.a, h.b].sort().join() === '0,2' && h.handA === 'left'),
    'the larks hold left hands, ready to allemande left',
  );
  run(s2, row('gentlespoons allemande left ¾', 4)[0]);
});

test('two-hand turn once: partners turn and step back home', () => {
  const start = BECKET.start(2);
  const [c] = row('partners two-hand turn', 8);
  assert.deepEqual(c.params, { who: 'partner', amount: 1 });
  const result = FIGURES[c.move](start, c.params, c.beats);
  assert.equal(result.motion(4).contacts.filter((h) => h.strength > 0.9).length, 4);
  const end = run(start, c);
  for (const id of [0, 1, 2, 3]) near(body(end, id).position, body(start, id).position);
});

test('couples do-si-do: home after once, in the other couple’s place after 1½', () => {
  const start = BECKET.start(2);
  const [c] = row('neighbors do si do once as couples', 8);
  assert.equal(c.move, 'couples-do-si-do');
  const once = run(start, c);
  for (const id of [0, 1, 2, 3]) {
    near(body(once, id).position, body(start, id).position);
    facing(body(once, id).yaw, body(start, id).yaw);
  }
  const half = run(start, { ...c, beats: 12, params: { amount: 1.5 } });
  // Couple 0 (west) ends where couple 1 stood, still facing east.
  assert.ok(body(half, 0).position.x > 0.8 && body(half, 1).position.x > 0.8);
  facing(body(half, 0).yaw, FACE_EAST);
});

test('stand still keeps everyone and every hand where it is', () => {
  const start = fold(IMPROPER.start(2), [row('ladles dance in to a long wave in the center', 4)[0]]);
  const end = run(start, row('stand still', 8)[0]);
  assert.deepEqual([...end.bodies], [...start.bodies]);
  assert.deepEqual(end.hands, start.hands);
});

test('down the hall with no ending, then up the hall backward', () => {
  const start = BECKET.start(2);
  const down = run(start, row('down the hall', 6)[0]);
  for (const id of [0, 1, 2, 3]) facing(body(down, id).yaw, FACE_DOWN);
  const up = run(down, row('up the hall backward', 6)[0]);
  for (const id of [0, 1, 2, 3]) facing(body(up, id).yaw, FACE_DOWN, 'still facing down');
  const zs = (s: DanceState) => [0, 1, 2, 3].map((id) => body(s, id).position.z);
  assert.ok(Math.max(...zs(up)) < Math.max(...zs(down)) - 1, 'walked back up');
});

test('long lines back after long lines forward', () => {
  const start = BECKET.start(2);
  const forward = run(start, { move: 'long-lines', beats: 4, params: { back: false } });
  const back = run(forward, row('long lines back', 4)[0]);
  for (const id of [0, 1, 2, 3])
    assert.ok(Math.abs(Math.abs(body(back, id).position.x) - 0.9) < 1e-6, `${id} back on the side`);
});

test('robins turn alone over their right shoulder; larks stay', () => {
  const start = IMPROPER.start(2);
  const [c] = row('ladles turn alone over their right shoulder', 2);
  const end = run(start, c);
  for (const id of [1, 3]) facing(body(end, id).yaw, body(start, id).yaw + Math.PI);
  for (const id of [0, 2]) facing(body(end, id).yaw, body(start, id).yaw);
});

test('trailing notes come off; notes naming a figure stay', () => {
  const parsed = (text: string, beats = 8) => row(text, beats).map((c) => c.move);
  assert.deepEqual(parsed('ladles allemande right 1½ to partner'), ['allemande']);
  assert.deepEqual(parsed('neighbors do si do once back to neighbor'), ['do-si-do']);
  assert.deepEqual(parsed('partners swing face down hall 4 in line'), ['swing']);
  assert.deepEqual(parsed('partners California twirl to face new couple', 4), ['twirl']);
  assert.deepEqual(parsed('turn alone (towards your partner)', 2), ['turn-alone']);
  assert.deepEqual(parsed('circle right 4 places and turn alone'), ['circle', 'turn-alone']);
  assert.throws(() => row('neighbors allemande right ½ gentlespoons pass left in center', 4));
});
