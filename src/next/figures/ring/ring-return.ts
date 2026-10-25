/**
 * Go back to place in the ring: "larks go back", "larks return to
 * partners", after walking into the middle (and maybe turning alone).
 *
 * Definition: the dancers named walk straight back out to their place on
 * the ring (the ring place nearest them), keeping the way they face: a
 * dancer facing out walks forward, one facing in backs up. Everyone else
 * stands.
 * Source: ContraDB rows in circle mixers (La String Bean, dances 241, 2260,
 * 2261, 2293: "larks to the center, larks turn alone, larks go back").
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { mix, progress } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { namedIds, placeAt, placeIndex, ringOf } from './geometry.ts';

export interface RingReturnParams {
  who?: 'larks' | 'robins' | 'all';
}

export const ringReturn: Figure<RingReturnParams> = (state, params, beats) => {
  onlyKeys('back to place', params, ['who']);
  if (params.who !== undefined)
    oneOf('back to place', 'who', params.who, ['larks', 'robins', 'all'] as const);
  const ring = ringOf(state);
  const plans = namedIds(state, params.who).map((id) => {
    const s = body(state, id);
    return { id, s, to: placeAt(ring, placeIndex(ring, s.position)) };
  });
  const taken = new Set(plans.map((p) => `${p.to.x.toFixed(3)},${p.to.z.toFixed(3)}`));
  if (taken.size !== plans.length) throw new Error('Two dancers would go back to one place.');
  const motion = (beat: number) => {
    const t = progress(beat / beats);
    return {
      bodies: plans.map((p) => ({ id: p.id, position: mix(p.s.position, p.to, t), yaw: p.s.yaw })),
      contacts: [],
    };
  };
  return {
    kind: 'long-lines',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
