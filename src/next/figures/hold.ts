/**
 * Hold: everyone stays where they are for the row's beats.
 *
 * Not a dance figure. It stands in for a row the engine cannot draw yet (a
 * row no pattern parses, or a figure that cannot start from where the
 * dancers are), so the rest of the dance keeps its place on the timeline and
 * the row still shows its source text as the label.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys } from '../core/figure.ts';
import { withChanges } from '../core/state.ts';

export interface HoldParams {
  /** Why the row is held: it did not parse, or its figure could not start. */
  reason?: 'unparsed' | 'unsupported' | 'cannot-start';
}

export const hold: Figure<HoldParams> = (state, params) => {
  onlyKeys('hold', params, ['reason']);
  if (params.reason !== undefined)
    oneOf('hold', 'reason', params.reason, ['unparsed', 'unsupported', 'cannot-start'] as const);
  return {
    kind: 'unknown',
    motion: () => ({ bodies: [], contacts: [] }),
    exit: withChanges(state, { hands: [] }),
  };
};
