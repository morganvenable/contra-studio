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
  smooth,
  distance,
  turn,
} from '../core/math.ts';
import { body, withChanges, type DanceState } from '../core/state.ts';

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

  const moves = sideMoves(state, direction).map((m) => ({
    ...m,
    inward: scale(forward(m.across), DEPTH),
  }));

  const half = beats / 2;
  const motion = (beat: number) => ({
    bodies: moves.map((m) => {
      const out = beat <= half ? progress(beat / half) : 1 - progress((beat - half) / half);
      const across = progress(beat / half);
      const position = add(m.start.position, add(scale(m.lateral, across), scale(m.inward, out)));
      return { id: m.id, position, yaw: squareUp(m.start.yaw, m.across, beat) };
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

/** Facing: from where the dancer faced to square across, over the first beat. */
export const squareUp = (from: number, across: number, beat: number) =>
  from + turn(across, from) * smooth(beat / FACE_BEATS);
const FACE_BEATS = 1;

/**
 * Every dancer (waiting couples too), each moving one place to its left or
 * right along its side line. Everyone must stand on a side line facing
 * across, or facing into a ring of four (they square up as they go); who
 * stands beside whom does not matter ("slice left with neighbors").
 */
export function sideMoves(state: DanceState, direction: 'left' | 'right') {
  return state.dancers.map((d) => {
    const b = body(state, d.id);
    // Facing across: toward the other side line. Dancers facing into a ring
    // (on the diagonal) square up to it as they go.
    const side = Math.sign(b.position.x);
    const across = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    if (
      side === 0 ||
      Math.abs(Math.abs(b.position.x) - SET.halfWidth) > 0.05 ||
      dot(forward(b.yaw), forward(across)) < 0.5
    ) {
      throw new Error(`Dancer ${d.id} (couple ${d.couple + 1}) must stand on a side line facing across.`);
    }
    const lateral = scale((direction === 'left' ? leftOf : rightOf)(across), SET.slot);
    return { id: d.id, start: b, lateral, across };
  });
}
