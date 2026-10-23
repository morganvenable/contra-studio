/**
 * Star (right- or left-hand star).
 *
 * Definition: the dancers of a group put the named hand in the middle and
 * walk forward around the center (a right-hand star goes clockwise seen from
 * above), a number of places (with four dancers, 4 places is once around).
 * Grips: the usual contra star is a "basket star" (wrist grip): each dancer
 * holds the wrist of the dancer ahead. "Hands across" joins hands with the
 * dancer opposite, when the source names it. Dancers step in from their places to
 * star size and back out to their new places at the end, still facing the
 * way they walk.
 * Source: Caller's Box glossary, "Star"; ContraDB rows "star right 4 places",
 * "star left - hands across - 4 places", "star right - wrist grip - 4
 * places". Star radius from the star primitive in src/engine.ts.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  heading,
  length,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { findRing } from '../core/ring.ts';
import { body, minorSets, withChanges } from '../core/state.ts';

/** The grip when the source names none: the basket star (wrist grip). */
export const DEFAULT_STAR_GRIP: 'hands-across' | 'wrist' = 'wrist';

export interface StarParams {
  hand: 'right' | 'left';
  places: number;
  grip?: 'hands-across' | 'wrist';
}

/** Distance from each dancer to the center while starring. */
export const STAR_RADIUS = 0.75;
/** Share of the figure spent stepping in, and again stepping out. */
const EDGE = 0.15;
const FACE_BEATS = 1.5;

export const star: Figure<StarParams> = (state, params, beats) => {
  onlyKeys('star', params, ['hand', 'places', 'grip']);
  const hand = oneOf('star', 'hand', params.hand, ['right', 'left'] as const);
  const grip = oneOf('star', 'grip', params.grip ?? DEFAULT_STAR_GRIP, [
    'hands-across',
    'wrist',
  ] as const);
  if (!(Number.isInteger(params.places) && params.places >= 1 && params.places <= 8))
    throw new Error('A star goes a whole number of places, 1 to 8.');
  // Right hands in the middle: walking clockwise, increasing polar angle.
  const sign = hand === 'right' ? 1 : -1;

  const stars = minorSets(state).map((g) => {
    const ring = findRing(state, g, 'star');
    const n = ring.order.length;
    const sweep = (sign * params.places * TAU) / n;
    const ahead = (i: number) => ring.order[(i + sign + n) % n];
    const contacts: FigureContact[] =
      grip === 'wrist'
        ? ring.order.map((id, i) => ({
            a: id,
            handA: hand,
            b: ahead(i),
            handB: hand,
            kind: 'joined',
            target: 'wrist',
            strength: 1,
          }))
        : ring.order
            .slice(0, n / 2)
            .map((id, i) => ({
              a: id,
              handA: hand,
              b: ring.order[i + n / 2],
              handB: hand,
              kind: 'joined',
              strength: 1,
            }));
    if (grip === 'hands-across' && n % 2) throw new Error('Hands across needs an even number.');
    return { ...ring, sweep, contacts };
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const inward = Math.min(smooth(t / EDGE), smooth((1 - t) / EDGE));
    const bodies = stars.flatMap((s) =>
      s.order.map((id) => {
        const b = body(state, id);
        const rel = sub(b.position, s.center);
        const r0 = length(rel);
        const r = r0 + (STAR_RADIUS - r0) * inward;
        const angle = s.sweep * progress(t);
        const position = add(s.center, rotate(scale(rel, r / r0), angle));
        const walk = rotate(rel, (sign * Math.PI) / 2);
        const tangent = heading(b.position, add(b.position, walk));
        const yaw = b.yaw + turn(tangent, b.yaw) * smooth(beat / FACE_BEATS) - angle;
        return { id, position, yaw };
      }),
    );
    const map = bodyMap(bodies);
    const strength = smooth((inward - 0.6) / 0.3);
    const contacts = stars.flatMap((s) =>
      s.contacts.map((c) => withinReach({ ...c, strength }, map)),
    );
    return { bodies, contacts };
  };
  return { kind: 'star', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
