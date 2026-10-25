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
import type { Figure, FigureResult } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, leftOf, progress, rightOf, scale } from '../core/math.ts';
import { SET } from '../core/config.ts';
import { activeIds, body, roleOf, withChanges, type DanceState } from '../core/state.ts';
import { sideMoves, squareUp } from './slice.ts';

export interface SlideParams {
  direction: 'left' | 'right';
  /**
   * Only these slide ("ladles slide right to partner"), one place to their
   * own left or right, letting go of any hands; everyone else stands.
   */
  who?: 'larks' | 'robins';
}

export const slide: Figure<SlideParams> = (state, params, beats) => {
  onlyKeys('slide', params, ['direction', 'who']);
  const direction = oneOf('slide', 'direction', params.direction, ['left', 'right'] as const);
  if (params.who !== undefined) return roleSlide(state, params.who, direction, beats);
  if (state.hands.length) throw new Error('A slide along the set needs free hands.');
  const moves = sideMoves(state, direction);
  const motion = (beat: number) => ({
    bodies: moves.map((m) => ({
      id: m.id,
      position: add(m.start.position, scale(m.lateral, progress(beat / beats))),
      yaw: squareUp(m.start.yaw, m.across, beat, beats),
    })),
    contacts: [],
  });
  return {
    kind: 'becket-slice',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

/** One role slides a place sideways, keeping its facing. */
function roleSlide(
  state: DanceState,
  who: 'larks' | 'robins',
  direction: 'left' | 'right',
  beats: number,
): FigureResult {
  const role = oneOf('slide', 'who', who, ['larks', 'robins'] as const) === 'larks' ? 'lark' : 'robin';
  const moves = activeIds(state)
    .filter((id) => roleOf(state, id) === role)
    .map((id) => {
      const b = body(state, id);
      return { id, start: b, lateral: scale((direction === 'left' ? leftOf : rightOf)(b.yaw), SET.slot) };
    });
  if (!moves.length) throw new Error(`No ${who} to slide.`);
  const motion = (beat: number) => ({
    bodies: moves.map((m) => ({
      id: m.id,
      position: add(m.start.position, scale(m.lateral, progress(beat / beats))),
      yaw: m.start.yaw,
    })),
    contacts: [],
  });
  return { kind: 'becket-slice', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
}
