/**
 * Grand right and left until you meet your partner ("grand right and
 * left", "right & left grand halfway around", "weave the ring" in a square).
 *
 * Definition: partners face, take right hands and pull by, left to the
 * next, and so on round the ring, larks counterclockwise and robins
 * clockwise, until partners meet again halfway round (in a square, on the
 * far side after four hands); they turn to face in beside each other, the
 * robin on the lark's right.
 * Source: Caller's Box glossary, "Grand right and left"; Colin Hume's square
 * instructions ("meet your partner on the opposite side"); Tony Parkes,
 * "Contra Dance Calling" (square breaks); ContraDB 2384, 2385, 2386, 2628.
 * Reading: a plain "grand right and left" in a square ends when partners
 * meet, halfway round (a promenade or a second grand right and left takes
 * them home). The walk is the ring's grand right and left
 * (figures/ring/grand-right-left.ts) with as many changes as couples.
 */
import type { FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys } from '../../core/figure.ts';
import type { DanceState } from '../../core/state.ts';
import { grandRightLeft } from '../ring/grand-right-left.ts';

export interface GrandMeetParams {
  /** Hand of the first pull by (right for a grand right and left). */
  hand?: 'right' | 'left';
}

export function grandMeet(state: DanceState, params: GrandMeetParams, beats: number): FigureResult {
  onlyKeys('grand right and left', params, ['hand']);
  const hand = oneOf('grand right and left', 'hand', params.hand ?? 'right', ['right', 'left'] as const);
  const couples = state.dancers.length / 2;
  return grandRightLeft(state, { changes: couples, hand, end: 'in' }, beats);
}
