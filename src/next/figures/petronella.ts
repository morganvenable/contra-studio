/**
 * Petronella turn.
 *
 * Definition: from a ring of four facing in, each dancer moves one place to
 * the right around the ring (counterclockwise seen from above) while turning
 * once to the right, three quarters of a turn, so they end facing in again
 * at the next place. Usually right after a ring balance ("balance &
 * petronella"); the clap is styling and is not drawn.
 * Source: Caller's Box glossary, "Petronella"; ContraDB rows "balance &
 * petronella", "balance & petronella and turn to face new neighbors" (the
 * turn to face is a reminder for the next figure, which turns them).
 * "Petronella left" mirrors it: one place to the left, turning left.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import {
  add,
  ease,
  heading,
  length,
  progress,
  rotate,
  scale,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { findRing } from '../core/ring.ts';
import { body, minorSets, withChanges } from '../core/state.ts';

export interface PetronellaParams {
  /** Which way everyone moves and turns; right when not given. */
  direction?: 'right' | 'left';
  /**
   * Places moved: 1 when not given; 2 for a "petronella-nella" (a turn per
   * place), 1½ to a diamond (two turns, ending facing in).
   */
  places?: number;
}

/** Dancers swing a little wide of the ring as they spin past each other. */
const BULGE = 0.15;

export const petronella: Figure<PetronellaParams> = (state, params, beats) => {
  onlyKeys('petronella', params, ['direction', 'places']);
  const places = params.places ?? 1;
  if (![1, 1.5, 2].includes(places)) throw new Error('A petronella moves 1, 1½ or 2 places.');
  const way = oneOf('petronella', 'direction', params.direction ?? 'right', [
    'right',
    'left',
  ] as const);
  const sign = way === 'right' ? -1 : 1;
  const rings = minorSets(state).map((g) => {
    const ring = findRing(state, g, 'petronella');
    // One place to the right: counterclockwise, decreasing angle in rotate().
    return { ...ring, sweep: (sign * places * TAU) / ring.order.length };
  });
  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = rings.flatMap((r) =>
      r.order.map((id) => {
        const s = body(state, id);
        const rel = sub(s.position, r.center);
        const angle = r.sweep * q;
        const wide = (length(rel) + BULGE * Math.sin(Math.PI * q)) / length(rel);
        const position = add(r.center, rotate(scale(rel, wide), angle));
        // Face in at the start, then turn right: facing in at the next place
        // is a quarter turn left of facing in here, so the right turn is 3/4.
        const inward = heading(s.position, r.center);
        const start = s.yaw + turn(inward, s.yaw) * ease(Math.min(1, beat / 0.5));
        const spin = (sign * Math.round(places) * TAU - r.sweep) * ease(beat / beats);
        return { id, position, yaw: start + spin };
      }),
    );
    return { bodies, contacts: [] };
  };
  return {
    kind: 'petronella',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
