/** Small helpers shared by the next-engine tests. */
import assert from 'node:assert/strict';
import type { Vec2 } from '../../types.ts';
import type { FigureCall } from '../core/figure.ts';
import { foldRound } from '../core/fold.ts';
import { BECKET } from '../core/formation.ts';
import { turn } from '../core/math.ts';
import type { DanceState } from '../core/state.ts';
import { FIGURES } from '../figures/index.ts';

export const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

/** One Becket minor set (couple 0 east, couple 1 west) after the given calls. */
export function after(calls: readonly FigureCall[], couples = 2): DanceState {
  return calls.length ? foldRound(calls, BECKET.start(couples), FIGURES).end : BECKET.start(couples);
}

export const PASS = call('pass-through', 4, { shoulder: 'right' });
export const TO_WAVE = call('allemande', 4, { who: 'partner', hand: 'right', amount: 0.75, wave: { middle: 'lark' } });
export const BALANCE = call('balance', 4, { formation: 'wave', style: 'right-left', first: 'right' });
export const RORY_RIGHT = call('rory', 4, { direction: 'right', spin: 'full' });

export function near(actual: Vec2, expected: Vec2, message = '', tolerance = 1e-6) {
  const d = Math.hypot(actual.x - expected.x, actual.z - expected.z);
  assert.ok(d < tolerance, `${message} expected (${expected.x}, ${expected.z}), got (${actual.x.toFixed(3)}, ${actual.z.toFixed(3)})`);
}

export function facing(actual: number, expected: number, message = '') {
  assert.ok(Math.abs(turn(actual, expected)) < 1e-6, `${message} expected yaw ${expected}, got ${actual}`);
}

/** Yaws by the direction faced: x is across the set, z along it. */
export const FACE_WEST = -Math.PI / 2;
export const FACE_EAST = Math.PI / 2;
export const FACE_UP = 0;
export const FACE_DOWN = Math.PI;
