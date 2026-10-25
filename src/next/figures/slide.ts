/**
 * Slide left (or right) along the set.
 *
 * Definition: in Becket lines, each couple, side by side and facing across,
 * slides sideways one place along its side line to its left (or right),
 * still facing across, to meet new neighbors. Like a slice without the step
 * in toward the other line; in Becket dances it is the progression, and the
 * dance's Progression rebinds neighbors where the couples end up.
 * Source: ContraDB row "slide left along set" (Becket, 2 beats). Every couple
 * slides, including couples waiting at the ends (src/next/figures/slice.ts).
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, progress, scale } from '../core/math.ts';
import { withChanges } from '../core/state.ts';
import { sideMoves, squareUp } from './slice.ts';

export interface SlideParams {
  direction: 'left' | 'right';
}

export const slide: Figure<SlideParams> = (state, params, beats) => {
  onlyKeys('slide', params, ['direction']);
  const direction = oneOf('slide', 'direction', params.direction, ['left', 'right'] as const);
  if (state.hands.length) throw new Error('A slide along the set needs free hands.');
  const moves = sideMoves(state, direction);
  const motion = (beat: number) => ({
    bodies: moves.map((m) => ({
      id: m.id,
      position: add(m.start.position, scale(m.lateral, progress(beat / beats))),
      yaw: squareUp(m.start.yaw, m.across, beat),
    })),
    contacts: [],
  });
  return {
    kind: 'becket-slice',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
