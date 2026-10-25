/**
 * Stand still (and claps, stomps, heel-and-toe): everyone keeps their place
 * and facing for the row's beats. Standing still, hands held stay held;
 * clapping, hands let go.
 * Source: ContraDB rows "stand still", "three claps, three stomps",
 * "clap, clap", "heel, toe, heel, toe".
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys } from '../core/figure.ts';
import { joined } from '../core/contacts.ts';
import { activeIds, body, withChanges } from '../core/state.ts';

export interface StillParams {
  /** What the row asks for while standing: just stand, or clap and stomp. */
  action?: 'stand' | 'clap';
}

export const still: Figure<StillParams> = (state, params) => {
  onlyKeys('stand still', params, ['action']);
  const action =
    params.action === undefined
      ? 'stand'
      : oneOf('stand still', 'action', params.action, ['stand', 'clap'] as const);
  const ids = activeIds(state);
  const bodies = ids.map((id) => ({ id, ...body(state, id) }));
  const held = action === 'stand' ? state.hands : [];
  return {
    kind: 'unknown',
    motion: () => ({ bodies, contacts: held.map((h) => joined(h, 1)) }),
    exit: withChanges(state, { hands: held }),
  };
};
