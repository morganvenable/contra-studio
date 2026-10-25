/**
 * Birdie out (slide back into place).
 *
 * Definition: the dancer in the middle of a ring with one place empty
 * slides back out to that place, ending facing in.
 * Source: ContraDB 2387 (Tighten Your Lugnuts), "slide back into place"
 * after "birdie in the cage"; Caller's Box glossary, "Birdie in the cage".
 * Reading: the birdie backs out to the empty place facing in (a slide), the
 * ring standing still.
 */
import type { Figure } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { heading, mix, progress, smooth, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { everyone, named, ringWithGap } from './common.ts';

export interface BirdieOutParams {
  /** Position label naming the dancer in the middle. */
  who: string;
}

export const birdieOut: Figure<BirdieOutParams> = (state, params, beats) => {
  onlyKeys('birdie out', params, ['who']);
  const birds = named(state, params.who, 'birdie out');
  if (birds.length !== 1) throw new Error('One dancer slides back out.');
  const bird = birds[0];
  const ring = ringWithGap(
    state,
    everyone(state).filter((id) => id !== bird),
  );
  const s = body(state, bird);
  const face = heading(ring.empty, ring.center);
  const motion = (beat: number) => {
    const u = beat / beats;
    return {
      bodies: [
        {
          id: bird,
          position: mix(s.position, ring.empty, progress(u)),
          yaw: s.yaw + turn(face, s.yaw) * smooth(u),
        },
      ],
      contacts: [],
    };
  };
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
