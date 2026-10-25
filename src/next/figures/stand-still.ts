/**
 * Stand still.
 *
 * Definition: nobody moves for the row's beats ("stand still", the rest of a
 * phrase a dance leaves empty). Hands held stay held.
 * Source: ContraDB rows "stand still" (for example dances 1931 and 2281,
 * which leave whole phrases empty).
 */
import type { Figure } from '../core/figure.ts';
import { onlyKeys } from '../core/figure.ts';
import { joined } from '../core/contacts.ts';

export const standStill: Figure<Record<string, never>> = (state, params) => {
  onlyKeys('stand still', params, []);
  return {
    kind: 'unknown',
    motion: () => ({ bodies: [], contacts: state.hands.map((h) => joined(h, 1)) }),
    exit: state,
  };
};
