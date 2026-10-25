/**
 * Lines of four cast off, each led round to the other line's place.
 *
 * Definition: the left-hand lark of each line of four turns away over the
 * left shoulder and leads the line single file round the end of the set to
 * where the other line stood (the other line does the same round the other
 * end, so the two files make one loop), and everyone turns to face the way
 * their line faced before: on to a new line.
 * Source: ContraDB rows "Left hand gentlespoon of each line cast over left
 * shoulder leading their line" (Apple Pie Quadrille, Ron Benson; Seth
 * Tepfer's note: "leading their line to the other side of the set and then
 * up/down to face a new line of neighbors"), "Leftmost gentlespoons cast
 * left, bring their line of 4 around neighbors" (Blackberry Cobbler
 * Quadrille).
 * Reading: the loop goes round to the left (the way a ring circles left),
 * halfway; the leader ends at the far end of the new place, so each line
 * comes in reversed and the larks end on their partners' right until a
 * figure (a swing) puts them back.
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys } from '../../core/figure.ts';
import { minorSets } from '../../core/state.ts';
import { ringOfEight } from './lines-circle.ts';

export interface LinesCastParams {
  /** The shoulder the leaders turn over: left goes round to the left. */
  shoulder?: 'left' | 'right';
}

export const linesCast: Figure<LinesCastParams> = (state, params, beats) => {
  onlyKeys('cast off', params, ['shoulder']);
  const shoulder = oneOf('cast off', 'shoulder', params.shoulder ?? 'left', ['left', 'right'] as const);
  if (minorSets(state).some((g) => g.length !== 8))
    throw new Error('Lines cast off round each other from two lines of four.');
  if (state.hands.length) throw new Error('A cast off starts with free hands.');
  return ringOfEight(state, 4, shoulder, beats, true);
};
