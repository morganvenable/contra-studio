/**
 * Slice left (or right) and straight back.
 *
 * Definition: in Becket lines, each couple, as a unit, moves forward
 * diagonally to its left to meet the next couple, then backs straight up into
 * the new place. Net effect: every couple moves one place to its left, facing
 * new neighbors. (In Becket dances this is the progression; the dance's
 * Progression rebinds neighbors where the couples end up, not this figure.)
 * Source: ContraDB row "slice left and straight back" (dance 2321); timing and
 * depth from the reviewed old-engine step src/becket-slice-step.ts (half the
 * counts on the diagonal, half straight back, 0.52 m in toward the center).
 *
 * Every couple slices, including couples waiting at the ends, which is how a
 * waiting couple re-enters.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import {
  add,
  dot,
  forward,
  leftOf,
  progress,
  rightOf,
  scale,
  sub,
  distance,
  turn,
} from '../core/math.ts';
import { body, partnerOf, withChanges } from '../core/state.ts';

export interface SliceParams {
  direction: 'left' | 'right';
  back?: 'straight';
}

/** How far each couple steps in toward the other line. */
const DEPTH = 0.52;

export const slice: Figure<SliceParams> = (state, params, beats) => {
  onlyKeys('slice', params, ['direction', 'back']);
  const direction = oneOf('slice', 'direction', params.direction, ['left', 'right'] as const);
  if (params.back !== undefined) oneOf('slice', 'back', params.back, ['straight'] as const);
  if (state.hands.length) throw new Error('Slice needs free hands.');

  const moves = state.dancers.map((d) => {
    const b = body(state, d.id);
    const other = body(state, partnerOf(state, d.id));
    const offset = sub(other.position, b.position);
    const sideways = Math.abs(dot(offset, leftOf(b.yaw)));
    const aligned = Math.abs(dot(offset, forward(b.yaw))) < 0.05;
    if (
      !aligned ||
      Math.abs(sideways - SET.slot) > 0.05 ||
      Math.abs(turn(b.yaw, other.yaw)) > 1e-6
    ) {
      throw new Error(`Couple ${d.couple + 1} must stand side by side in a line facing across.`);
    }
    const lateral = scale((direction === 'left' ? leftOf : rightOf)(b.yaw), SET.slot);
    return { id: d.id, start: b, lateral, inward: scale(forward(b.yaw), DEPTH) };
  });

  const half = beats / 2;
  const motion = (beat: number) => ({
    bodies: moves.map((m) => {
      const out = beat <= half ? progress(beat / half) : 1 - progress((beat - half) / half);
      const across = progress(beat / half);
      const position = add(m.start.position, add(scale(m.lateral, across), scale(m.inward, out)));
      return { id: m.id, position, yaw: m.start.yaw };
    }),
    contacts: [],
  });

  const moved = settle(state, motion, beats);
  for (const m of moves) {
    const end = moved.bodies.get(m.id)!.position;
    if (distance(end, add(m.start.position, m.lateral)) > 1e-6)
      throw new Error('Slice missed its place.');
  }
  return { kind: 'becket-slice', motion, exit: withChanges(moved, { hands: [] }) };
};
