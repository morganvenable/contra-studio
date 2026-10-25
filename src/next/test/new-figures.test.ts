/**
 * Figures added for the whole-library import: ocean waves, turn alone, star
 * promenade with butterfly whirl, half poussette, and figures on a diagonal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FigureCall } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { BECKET, IMPROPER } from '../core/formation.ts';
import { diagonalGroups } from '../core/diagonal.ts';
import { findWave } from '../core/lines.ts';
import { body, type DanceState } from '../core/state.ts';
import { parseRow } from '../core/parse.ts';
import { FIGURES } from '../figures/index.ts';
import { call, facing, FACE_DOWN, FACE_UP, near } from './helpers.ts';

const improper = (calls: readonly FigureCall[], couples = 2): DanceState =>
  foldRound(calls, IMPROPER.start(couples), FIGURES).end;

test('form an ocean wave & balance: robins left hands in the middle, neighbors by right', () => {
  const [wave] = parseRow({
    beats: 4,
    text: 'form an ocean wave & balance - ladles by left hands and neighbors by right hands',
  });
  assert.equal(wave.move, 'ocean-wave');
  const s = improper([wave]);
  const line = findWave(s, s.groups[0]);
  // Across the set, robins (1 and 3) in the middle, larks on the ends.
  assert.deepEqual(
    line.order.map((id) => id % 2),
    [0, 1, 1, 0],
  );
  for (const id of [1, 2, 3])
    assert.ok(Math.abs(body(s, id).position.z - body(s, 0).position.z) < 1e-6, 'one line');
  facing(body(s, 0).yaw, FACE_DOWN, 'the 1s keep facing down');
  facing(body(s, 2).yaw, FACE_UP, 'the 2s keep facing up');
  assert.equal(s.hands.length, 3, 'three holds in a wave of four');
});

test('turn alone faces everyone the other way, in place', () => {
  const start = IMPROPER.start(2);
  const s = improper([call('turn-alone', 2, {})]);
  for (const id of [0, 1, 2, 3]) {
    near(body(s, id).position, body(start, id).position);
    facing(body(s, id).yaw, body(start, id).yaw + Math.PI);
  }
});

test('star promenade left ½ then butterfly whirl: couples trade sides and face in', () => {
  const s = foldRound(
    [call('star-promenade', 4, { hand: 'left', amount: 0.5 }), call('butterfly-whirl', 4, {})],
    BECKET.start(2),
    FIGURES,
  ).end;
  // Couple 0 started west; it ends on the east line facing west, lark on the left.
  assert.ok(body(s, 0).position.x > 0.8 && body(s, 1).position.x > 0.8);
  facing(body(s, 0).yaw, -Math.PI / 2);
  facing(body(s, 1).yaw, -Math.PI / 2);
  assert.ok(body(s, 0).position.z > body(s, 1).position.z, 'lark on the left facing west');
});

test('half poussette: pairs trade places around the middle, facing as they were', () => {
  const [p] = parseRow({
    beats: 6,
    text: 'half poussette - gentlespoons pull partners back then left',
  });
  const start = IMPROPER.start(2);
  const s = improper([p]);
  // Couple 0 (top) ends at the bottom of the minor set and vice versa.
  const z = (st: DanceState, c: number) =>
    (body(st, c * 2).position.z + body(st, c * 2 + 1).position.z) / 2;
  assert.ok(Math.abs(z(s, 0) - z(start, 1)) < 1e-6);
  assert.ok(Math.abs(z(s, 1) - z(start, 0)) < 1e-6);
});

test('Becket diagonal groups pair each couple with the one across on its left', () => {
  const s = BECKET.start(4);
  const groups = diagonalGroups(s, 'left');
  assert.ok(groups.length >= 1);
  for (const g of groups) {
    const [a, , b] = g;
    assert.ok(Math.sign(body(s, a).position.x) !== Math.sign(body(s, b).position.x));
    assert.ok(Math.abs(body(s, a).position.z - body(s, b).position.z) > 1);
  }
  const [c] = parseRow({ beats: 8, text: 'left diagonal ladles chain' });
  assert.deepEqual(c.params, { who: 'robins', diagonal: 'left' });
});
