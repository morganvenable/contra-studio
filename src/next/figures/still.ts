/**
 * Stand still (and claps, stomps, heel-and-toe): everyone keeps their place
 * and facing for the row's beats. Hands let go.
 * Source: ContraDB rows "stand still", "three claps, three stomps",
 * "clap, clap", "heel, toe, heel, toe".
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys } from '../core/figure.ts';
import { activeIds, body, withChanges } from '../core/state.ts';

export interface StillParams {
  /** What the row asks for while standing: just stand, or clap and stomp. */
  action?: 'stand' | 'clap';
}

export const still: Figure<StillParams> = (state, params) => {
  onlyKeys('stand still', params, ['action']);
  if (params.action !== undefined) oneOf('stand still', 'action', params.action, ['stand', 'clap'] as const);
  const ids = activeIds(state);
  const bodies = ids.map((id) => ({ id, ...body(state, id) }));
  return {
    kind: 'unknown',
    motion: () => ({ bodies, contacts: [] }),
    exit: withChanges(state, { hands: [] }),
  };
};
