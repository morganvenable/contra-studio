/**
 * Slide round the ring: "slide left along set, slide, slide" in a circle
 * mixer (Patty Cake Polka), everyone sliding sideways round the ring.
 *
 * Definition: everyone named keeps facing the way they face (relative to
 * the center) and steps sideways round the ring, to the left or right as
 * the ring faces in (the whole ring slides together), a number of places
 * (one place is one dancer's spacing), ending on places of the ring. With
 * no distance named, one place for every four beats.
 * Source: Caller's Box glossary, "Slide" / "Sashay"; ContraDB dance 1741
 * (Patty Cake Polka, "slide left along set, slide, slide").
 * Reading: in a ring, "along the set" is round the ring; partners keep
 * facing in and slide side by side (rather than facing each other).
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { add, progress, rotate, sub, TAU } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { namedIds, ringOf } from './geometry.ts';

export interface RingSlideParams {
  direction: 'left' | 'right';
  places?: number;
  who?: 'larks' | 'robins' | 'all';
}

export const ringSlide: Figure<RingSlideParams> = (state, params, beats) => {
  onlyKeys('ring slide', params, ['direction', 'places', 'who']);
  const direction = oneOf('ring slide', 'direction', params.direction, ['left', 'right'] as const);
  const places = params.places ?? Math.max(1, Math.round(beats / 4));
  if (!(Number.isInteger(places) && places >= 1)) throw new Error('A ring slide moves whole places.');
  const ring = ringOf(state);
  const ids = namedIds(state, params.who);
  const plans = ids.map((id) => {
    const s = body(state, id);
    // Left as the ring faces in: rotate(+) is clockwise from above, the way
    // a dancer facing in steps to the left. The whole ring slides together.
    const rel = sub(s.position, ring.center);
    const sense = direction === 'left' ? 1 : -1;
    return { id, s, rel, sweep: (sense * places * TAU) / ring.places.length };
  });
  const motion = (beat: number) => {
    const t = beat / beats;
    return {
      bodies: plans.map((p) => {
        const a = p.sweep * progress(t);
        return { id: p.id, position: add(ring.center, rotate(p.rel, a)), yaw: p.s.yaw - a };
      }),
      contacts: [],
    };
  };
  return {
    kind: 'unknown',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
