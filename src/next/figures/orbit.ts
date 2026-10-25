/**
 * Orbit: some dancers turn in the middle while the others walk around them.
 *
 * Definition: "larks allemande left once while the robins orbit clockwise
 * ½": the named pairs dance their figure in the middle of the minor set (an
 * allemande, a do-si-do or a see-saw), and everyone else in the minor set
 * walks forward around the outside, about the minor set's center, the named
 * way (clockwise or counterclockwise seen from above) and amount (½: to the
 * place of the other dancer of their role). Orbiters keep their own distance
 * from the center, face the way they walk while walking, and end facing as
 * they started relative to the set's center (½ around: the way the dancer
 * whose place they take was facing).
 * Source: Caller's Box glossary, "Orbit"; ContraDB rows "gentlespoons
 * allemande left once around while the ladles orbit clockwise ½ around",
 * "ladles do-si-do, while gentlespoons orbit clockwise 1/2 way around".
 */
import type { Figure, FigureFrame } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import {
  add,
  forward,
  leftOf,
  rightOf,
  scale,
  heading,
  length,
  progress,
  rotate,
  smooth,
  sub,
  TAU,
  turn,
  yawAfterRotation,
} from '../core/math.ts';
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import { body, groupCenter, minorSets, pairsIn, withChanges } from '../core/state.ts';
import { allemande } from './allemande.ts';
import { doSiDo } from './do-si-do.ts';

export interface OrbitParams {
  /** What the pairs in the middle dance. */
  center: 'allemande' | 'do-si-do';
  /** Who dances in the middle. */
  who: PairName;
  /** Allemande hand. */
  hand?: 'right' | 'left';
  /** Turns of the middle figure. */
  amount: number;
  /** Do-si-do: shoulder passed first (left for a see-saw). */
  shoulder?: 'right' | 'left';
  /** Which way the others walk around, seen from above. */
  direction?: 'clockwise' | 'counterclockwise';
  /** How far around they walk: 0.5 is half way. */
  around?: number;
  /**
   * What the others do instead of orbiting: shift one place to their left
   * or right, or walk one place straight ahead, keeping their facing.
   */
  others?: 'shift-left' | 'shift-right' | 'forward';
}

/** Share of the figure spent turning to walk forward, and back at the end. */
const FACE = 0.2;
/** Orbiters stay at least this far from the center. */
const MIN_RADIUS = 1;

export const orbit: Figure<OrbitParams> = (state, params, beats) => {
  onlyKeys('orbit', params, [
    'center',
    'who',
    'hand',
    'amount',
    'shoulder',
    'direction',
    'around',
    'others',
  ]);
  const others =
    params.others === undefined
      ? undefined
      : oneOf('orbit', 'others', params.others, ['shift-left', 'shift-right', 'forward'] as const);
  const center = oneOf('orbit', 'center', params.center, ['allemande', 'do-si-do'] as const);
  const who = oneOf('orbit', 'who', params.who, PAIR_NAMES);
  const direction = others
    ? 'clockwise'
    : oneOf('orbit', 'direction', params.direction, ['clockwise', 'counterclockwise'] as const);
  const around = others ? 1 : (params.around ?? 0);
  if (!(around > 0 && around <= 2)) throw new Error('An orbit goes between 0 and 2 times around.');
  const inner =
    center === 'allemande'
      ? allemande(state, { who, hand: params.hand ?? 'right', amount: params.amount }, beats)
      : doSiDo(state, { who, amount: params.amount, shoulder: params.shoulder ?? 'right' }, beats);
  // Clockwise from above is a positive rotation (core/math.ts).
  const sweep = (direction === 'clockwise' ? 1 : -1) * around * TAU;
  const orbiters = minorSets(state).flatMap((g) => {
    const inMiddle = new Set(pairsIn(state, g, who).flat());
    const middle = groupCenter(state, g);
    return g
      .filter((id) => !inMiddle.has(id))
      .map((id) => {
        const s = body(state, id);
        const rel = sub(s.position, middle);
        if (!others && length(rel) < MIN_RADIUS)
          throw new Error(`Dancer ${id} stands too near the middle to orbit around it.`);
        return { id, s, rel, middle };
      });
  });
  if (!orbiters.length && minorSets(state).length) throw new Error('Nobody is left to orbit.');

  const motion = (beat: number): FigureFrame => {
    const t = beat / beats;
    const a = sweep * progress(t);
    const facing = smooth(t / FACE) * smooth((1 - t) / FACE);
    const walked = orbiters.map((o) => {
      if (others) {
        const way =
          others === 'forward'
            ? forward(o.s.yaw)
            : others === 'shift-left'
              ? leftOf(o.s.yaw)
              : rightOf(o.s.yaw);
        return {
          id: o.id,
          position: add(o.s.position, scale(way, SET.slot * progress(t))),
          yaw: o.s.yaw,
        };
      }
      const position = add(o.middle, rotate(o.rel, a));
      const rigid = yawAfterRotation(o.s.yaw, a);
      // Walking forward along the circle: the heading a little further on.
      const ahead = add(o.middle, rotate(o.rel, a + Math.sign(sweep) * 0.05));
      const walk = heading(position, ahead);
      return { id: o.id, position, yaw: rigid + turn(walk, rigid) * facing };
    });
    const frame = inner.motion(beat);
    return { bodies: [...frame.bodies, ...walked], contacts: frame.contacts };
  };
  return {
    kind: inner.kind,
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: inner.exit.hands }),
  };
};
