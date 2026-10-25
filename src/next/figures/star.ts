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
import { body, minorSets, roleOf, withChanges } from '../core/state.ts';

/** The grip when the source names none: the basket star (wrist grip). */
export const DEFAULT_STAR_GRIP: 'hands-across' | 'wrist' = 'wrist';

export interface StarParams {
  hand: 'right' | 'left';
  places: number;
  grip?: 'hands-across' | 'wrist';
  /**
   * A facing star ("facing star clockwise 3 places with robins putting their
   * left hands in and backing up"): these dancers face the other way and
   * back up around the star, their other hand in the middle.
   */
  backing?: 'larks' | 'robins';
}

/** Distance from each dancer to the center while starring. */
export const STAR_RADIUS = 0.75;
/** Dancers side by side round a star stay at least this far apart (a big ring's star is wider). */
const STAR_SPACING = 0.6;
const radiusFor = (n: number) => Math.max(STAR_RADIUS, STAR_SPACING / (2 * Math.sin(Math.PI / n)));
/**
 * Share of the figure spent stepping in, and again stepping out: at least
 * 0.15, and at least STEP_BEATS so a short star does not lunge in (a 4-beat
 * star of two places steps in over 1.2 beats) and long enough to step in
 * at an easy pace from a big ring, at most 0.4.
 */
const EDGE_SHARE = 0.15;
const STEP_BEATS = 1.2;
/** Average pace stepping in, m per beat. */
const STEP_PACE = 0.55;
const EDGE_MAX = 0.4;
const FACE_BEATS = 1.5;

export const star: Figure<StarParams> = (state, params, beats) => {
  onlyKeys('star', params, ['hand', 'places', 'grip', 'backing']);
  const backing =
    params.backing === undefined
      ? undefined
      : oneOf('star', 'backing', params.backing, ['larks', 'robins'] as const);
  const backs = (id: number) =>
    backing !== undefined && roleOf(state, id) === (backing === 'larks' ? 'lark' : 'robin');
  const other = (h: 'right' | 'left') => (h === 'right' ? 'left' : 'right');
  const hand = oneOf('star', 'hand', params.hand, ['right', 'left'] as const);
  const grip = oneOf('star', 'grip', params.grip ?? DEFAULT_STAR_GRIP, [
    'hands-across',
    'wrist',
  ] as const);
  // Half places end on a diamond ("star left 7/8": 3½ places).
  if (!(Number.isInteger(params.places * 2) && params.places >= 0.5 && params.places <= 8))
    throw new Error('A star goes a whole or half number of places, ½ to 8.');
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
            handA: backs(id) ? other(hand) : hand,
            b: ahead(i),
            handB: backs(ahead(i)) ? other(hand) : hand,
            kind: 'joined',
            target: 'wrist',
            strength: 1,
          }))
        : ring.order.slice(0, n / 2).map((id, i) => ({
            a: id,
            handA: backs(id) ? other(hand) : hand,
            b: ring.order[i + n / 2],
            handB: backs(ring.order[i + n / 2]) ? other(hand) : hand,
            kind: 'joined',
            strength: 1,
          }));
    if (grip === 'hands-across' && n % 2) throw new Error('Hands across needs an even number.');
    return { ...ring, sweep, contacts };
  });

  // A star of a big ring steps in farther: give the step its own time.
  const farthest = Math.max(
    0,
    ...stars.flatMap((s) =>
      s.order.map(
        (id) => length(sub(body(state, id).position, s.center)) - radiusFor(s.order.length),
      ),
    ),
  );
  const EDGE = Math.min(
    EDGE_MAX,
    Math.max(EDGE_SHARE, STEP_BEATS / beats, farthest / (STEP_PACE * beats)),
  );
  const motion = (beat: number) => {
    const t = beat / beats;
    const inward = Math.min(smooth(t / EDGE), smooth((1 - t) / EDGE));
    const bodies = stars.flatMap((s) =>
      s.order.map((id) => {
        const b = body(state, id);
        const rel = sub(b.position, s.center);
        const r0 = length(rel);
        const r = r0 + (radiusFor(s.order.length) - r0) * inward;
        const angle = s.sweep * progress(t);
        const position = add(s.center, rotate(scale(rel, r / r0), angle));
        // Dancers backing up face against the way they walk.
        const walk = rotate(rel, ((backs(id) ? -sign : sign) * Math.PI) / 2);
        const tangent = heading(b.position, add(b.position, walk));
        // A dancer turning far to face the way round takes longer to turn.
        const facing = turn(tangent, b.yaw);
        const faceBeats = Math.min(beats / 2, Math.max(FACE_BEATS, 0.7 * Math.abs(facing)));
        const yaw = b.yaw + facing * smooth(beat / faceBeats) - angle;
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
