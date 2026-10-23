/** Figures used by the improper Ready dances, on one improper minor set. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { IMPROPER } from '../core/formation.ts';
import { DUPLE_MINOR_PROGRESSION } from '../core/progression.ts';
import { heading } from '../core/math.ts';
import { body, type DanceState } from '../core/state.ts';
import { FIGURES } from '../figures/index.ts';
import { call, facing, FACE_DOWN, FACE_WEST, FACE_UP, FACE_EAST, near } from './helpers.ts';

/** Couple 0 (1s) at the top facing down, couple 1 (2s) below facing up. */
const start = (couples = 2) => IMPROPER.start(couples);
const run = (calls: FigureCall[], s: DanceState = start()) => foldRound(calls, s, FIGURES).end;
const pos = (s: DanceState, id: number) => body(s, id).position;
const yaw = (s: DanceState, id: number) => body(s, id).yaw;
/** Neighbors swing: lines facing across, neighbors side by side, partners across. */
const LINES = call('swing', 8, { who: 'neighbor' });

test('improper start: 1s crossed over at the top facing their neighbors', () => {
  const s = start();
  near(pos(s, 0), { x: 0.9, z: -0.9 }, 'lark 1');
  near(pos(s, 1), { x: -0.9, z: -0.9 }, 'robin 1');
  near(pos(s, 2), { x: -0.9, z: 0.9 }, 'lark 2');
  facing(yaw(s, 0), FACE_DOWN);
  facing(yaw(s, 2), FACE_UP);
  assert.equal(s.relations.get('neighbor')!.get(0), 3);
  assert.deepEqual(s.positions.get('1s'), [0, 1]);
});

test('the duple-minor progression pairs each 1s couple with the 2s one place below', () => {
  const passed = run([call('pass-through', 2, { shoulder: 'right' })], start(4));
  const next = DUPLE_MINOR_PROGRESSION.rebind(passed);
  assert.deepEqual(next.groups, [[0, 1, 6, 7]]);
  assert.deepEqual(next.waiting.map((w) => w.couple).sort(), [1, 2]);
  // Couples waiting out change number: 2s at the top become 1s.
  assert.ok(next.positions.get('1s')!.includes(2));
  assert.throws(() => DUPLE_MINOR_PROGRESSION.rebind(start(4)), /not passed each other/);
});

test('neighbors swing ends in lines across: neighbors side by side, partners across', () => {
  const s = run([LINES]);
  near(pos(s, 0), { x: 0.9, z: 0.9 }, 'lark 1');
  near(pos(s, 3), { x: 0.9, z: -0.9 }, 'robin 2');
  near(pos(s, 1), { x: -0.9, z: 0.9 }, 'robin 1 across from lark 1');
  facing(yaw(s, 0), FACE_WEST);
});

test('meltdown swing: a right-shoulder round, facing, then the swing', () => {
  const s0 = start();
  const r = FIGURES.swing(s0, { who: 'neighbor', meltdown: true }, 16);
  const plain = FIGURES.swing(s0, { who: 'neighbor' }, 16);
  const at = (beat: number, id: number) => r.motion(beat).bodies.find((b) => b.id === id)!;
  // Once gathered (beats 2-3.2) neighbors face each other at arm's length, no hands.
  for (const beat of [2, 2.5, 3.2]) {
    const a = at(beat, 0);
    const b = at(beat, 3);
    const gap = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
    assert.ok(gap > 0.8 && gap < 1, `beat ${beat}: ${gap.toFixed(2)} m apart`);
    facing(a.yaw, heading(a.position, b.position), `beat ${beat}: lark faces the neighbor`);
    assert.equal(r.motion(beat).contacts.length, 0);
  }
  // Right shoulders toward the middle: the orbit runs clockwise (increasing polar angle).
  const mid = (beat: number) => {
    const a = at(beat, 0).position;
    const b = at(beat, 3).position;
    return Math.atan2(a.z - b.z, a.x - b.x);
  };
  assert.ok(Math.sin(mid(3.2) - mid(2)) > 0.3, 'clockwise from above');
  // Then the swing frame, and the same exit as an ordinary swing.
  assert.ok(r.motion(8).contacts.some((c) => c.kind === 'swing-frame' && c.strength > 0.9));
  for (const id of [0, 1, 2, 3]) near(pos(r.exit, id), pos(plain.exit, id));
});

test("robins chain: robins cross and end on the far lark's right, facing in", () => {
  const lines = run([LINES]);
  const s = run([call('chain', 8, { who: 'robins', to: 'partner' })], lines);
  near(pos(s, 1), pos(lines, 3), "robin 1 takes the other robin's place");
  near(pos(s, 3), pos(lines, 1));
  near(pos(s, 0), pos(lines, 0), 'larks keep their places');
  facing(yaw(s, 1), FACE_WEST);
  assert.throws(
    () => run([call('chain', 8, { who: 'robins', to: 'neighbor' })], lines),
    /not their neighbor/,
  );
});

test('right and left through: everyone crosses and faces back in', () => {
  const lines = run([LINES]);
  const s = run([call('right-left-through', 8, {})], lines);
  near(pos(s, 0), { x: -0.9, z: -0.9 }, 'lark 1 crosses and stays on the left');
  near(pos(s, 3), { x: -0.9, z: 0.9 });
  facing(yaw(s, 0), FACE_EAST);
  facing(yaw(s, 3), FACE_EAST);
});

test('star right 4 places goes once around clockwise, back to places', () => {
  const lines = run([LINES]);
  const result = FIGURES.star(lines, { hand: 'right', places: 4 }, 8);
  near(result.exit.bodies.get(0)!.position, pos(lines, 0));
  // Clockwise from above is increasing polar angle (see core/math.ts): a
  // quarter of the way, lark 1 has moved from (+x, +z) toward (-x, +z).
  const quarter = result.motion(2).bodies.find((b) => b.id === 0)!;
  assert.ok(quarter.position.x < pos(lines, 0).x - 0.3, JSON.stringify(quarter));
  assert.ok(result.motion(4).contacts.some((c) => c.strength > 0.5 && c.handA === 'right'));
  // No grip named: a basket star, each holding the wrist of the dancer ahead.
  const held = result.motion(4).contacts.filter((c) => c.strength > 0.5);
  assert.equal(held.length, 4);
  assert.ok(held.every((c) => c.target === 'wrist'));
  const across = FIGURES.star(lines, { hand: 'right', places: 4, grip: 'hands-across' }, 8);
  assert.equal(across.motion(4).contacts.filter((c) => c.strength > 0.5).length, 2);
});

test('do-si-do passes right shoulders, keeps facing, and 1½ trades places', () => {
  const once = FIGURES['do-si-do'](start(), { who: 'neighbor', amount: 1 }, 8);
  near(once.exit.bodies.get(0)!.position, pos(start(), 0));
  // Lark 1 faces down (+z), so his left is +x; passing right shoulders he steps left.
  const mid = once.motion(2).bodies.find((b) => b.id === 0)!;
  assert.ok(mid.position.x > 0.9 + 0.2, `veers to his left: ${mid.position.x}`);
  const half = run([call('do-si-do', 8, { who: 'neighbor', amount: 1.5 })]);
  near(pos(half, 0), pos(start(), 3), "lark 1 ends in robin 2's place");
  facing(yaw(half, 0), FACE_DOWN, 'still facing down, back to his neighbor');
});

test('balance the ring and petronella: one place to the right, facing in', () => {
  const lines = run([LINES]);
  const s = run([call('balance', 4, { formation: 'ring' }), call('petronella', 4, {})], lines);
  // Lark 1 at (0.9, 0.9) moves one place counterclockwise (decreasing polar angle).
  near(pos(s, 0), { x: 0.9, z: -0.9 });
  facing(yaw(s, 0), heading(pos(s, 0), { x: 0, z: 0 }), 'faces the center');
});

test('box the gnat trades places, the robin turning left under the arch', () => {
  const r = FIGURES.twirl(start(), { style: 'box-the-gnat', who: 'neighbor' }, 4);
  near(r.exit.bodies.get(0)!.position, pos(start(), 3));
  facing(r.exit.bodies.get(0)!.yaw, FACE_UP, 'lark 1 now faces up');
  // The robin turns left (yaw increases) and the lark right.
  const early = r.motion(2).bodies;
  assert.ok(early.find((b) => b.id === 3)!.yaw > yaw(start(), 3));
  assert.ok(early.find((b) => b.id === 0)!.yaw < yaw(start(), 0));
});

test('partners promenade across: the pair crosses and wheels to face back in', () => {
  const partners = run([LINES, call('chain', 8, { who: 'robins', to: 'partner' })]);
  const s = run([call('promenade', 8, { who: 'partner' })], partners);
  for (const id of [0, 1, 2, 3])
    assert.ok(Math.sign(pos(s, id).x) === -Math.sign(pos(partners, id).x), `dancer ${id} crossed`);
  facing(yaw(s, 0), pos(s, 0).x > 0 ? FACE_WEST : FACE_EAST);
});

test('down the hall, turn as a couple, up the hall and bend into a ring', () => {
  const lines = run([LINES]);
  const down = run([call('hall', 8, { direction: 'down', turn: 'couple' })], lines);
  for (const id of [0, 1, 2, 3]) {
    near({ x: pos(down, id).x, z: pos(down, id).z }, { x: pos(down, id).x, z: 1.8 }, 'line');
    facing(yaw(down, id), FACE_UP);
  }
  const ring = run([call('hall', 8, { direction: 'up', end: 'ring' })], down);
  const corners = [0, 1, 2, 3].map((id) => pos(ring, id));
  for (const c of corners) near({ x: Math.abs(c.x), z: Math.abs(c.z) }, { x: 0.9, z: 0.9 });
});

test('hey from lines across: robins pass right in the middle, everyone crosses, full hey returns', () => {
  const lines = run([LINES]);
  const half = FIGURES.hey(lines, { start: 'robins', amount: 0.5, center: 'right' }, 8);
  const full = FIGURES.hey(lines, { start: 'robins', amount: 1, center: 'right' }, 16);
  for (const id of [0, 1, 2, 3]) {
    const before = pos(lines, id);
    assert.ok(
      Math.sign(half.exit.bodies.get(id)!.position.x) === -Math.sign(before.x),
      `${id} crosses`,
    );
    near(full.exit.bodies.get(id)!.position, before, `${id} returns`);
  }
  // Clearance and speed stay within the ordinary limits all the way through.
  let closest = Infinity;
  for (let beat = 0; beat <= 8; beat += 0.05) {
    const b = half.motion(beat).bodies;
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++)
        closest = Math.min(
          closest,
          Math.hypot(b[i].position.x - b[j].position.x, b[i].position.z - b[j].position.z),
        );
  }
  assert.ok(closest >= 0.5, `closest ${closest.toFixed(2)} m`);
  // The robins pass each other first, by the right shoulder, in the middle.
  const robins = [1, 3].map((id) => half.motion(2.5).bodies.find((b) => b.id === id)!);
  const gap = Math.hypot(
    robins[0].position.x - robins[1].position.x,
    robins[0].position.z - robins[1].position.z,
  );
  assert.ok(gap < 0.7, `robins meet in the middle (${gap.toFixed(2)} m)`);
  const [a, b] = robins;
  const toB = { x: b.position.x - a.position.x, z: b.position.z - a.position.z };
  const right = { x: -Math.cos(a.yaw), z: Math.sin(a.yaw) };
  assert.ok(toB.x * right.x + toB.z * right.z > 0, 'the other robin is on the right');
});

test('mad robin: the front role goes in toward the middle first, facing across, and returns', () => {
  const lines = run([LINES]);
  const r = FIGURES['mad-robin'](lines, { front: 'robins' }, 8);
  for (const id of [0, 1, 2, 3]) near(r.exit.bodies.get(id)!.position, pos(lines, id));
  const robin = r.motion(2).bodies.find((b) => b.id === 1)!;
  const lark = r.motion(2).bodies.find((b) => b.id === 0)!;
  assert.ok(Math.abs(robin.position.x) < Math.abs(pos(lines, 1).x) - 0.2, 'robin in front');
  assert.ok(Math.abs(lark.position.x) > Math.abs(pos(lines, 0).x) + 0.2, 'lark behind');
  facing(robin.yaw, yaw(lines, 1), 'robin still faces across');
  // A written direction must agree with the front role: exactly one does here.
  const agrees = (['clockwise', 'counterclockwise'] as const).filter((direction) => {
    try {
      FIGURES['mad-robin'](lines, { front: 'robins', direction }, 8);
      return true;
    } catch {
      return false;
    }
  });
  assert.equal(agrees.length, 1);
});

test('gyre: neighbors go around by the right shoulder facing each other', () => {
  const s0 = start();
  const once = FIGURES.gyre(s0, { who: 'neighbor', amount: 1 }, 8);
  const half = FIGURES.gyre(s0, { who: 'neighbor', amount: 1.5 }, 8);
  near(once.exit.bodies.get(0)!.position, pos(s0, 0));
  near(half.exit.bodies.get(0)!.position, pos(s0, 3), "1½ ends in the neighbor's place");
  const a = once.motion(3).bodies.find((b) => b.id === 0)!;
  const b = once.motion(3).bodies.find((b) => b.id === 3)!;
  facing(a.yaw, heading(a.position, b.position), 'eye contact');
});

test('give and take: larks cross, take partners by both hands and back up home', () => {
  const lines = run([LINES]);
  const r = FIGURES['give-and-take'](lines, { who: 'larks', whom: 'partner' }, 8);
  near(r.exit.bodies.get(0)!.position, pos(lines, 0), 'lark 1 is back home');
  const robin = r.exit.bodies.get(1)!.position;
  assert.ok(Math.sign(robin.x) === Math.sign(pos(lines, 0).x), "robin 1 is on the lark's side");
  assert.equal(r.motion(6).contacts.filter((c) => c.strength > 0.9).length, 4);
});
