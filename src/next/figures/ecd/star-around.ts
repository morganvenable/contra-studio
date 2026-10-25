/**
 * Star with no places named ("star right", "star left"): the whole group's
 * star, once round, however many dance it.
 *
 * Definition: the dancers of the group put the named hand in the middle and
 * walk forward round the center (a right-hand star goes clockwise seen from
 * above) the named amount of the way round (once by default), stepping in
 * from their places to star size and back out to their places. A basket
 * star (wrist grip) unless hands across is named. With six dancers (a
 * triplet) the star is wider than a star of four, and dancers from the
 * corners of the set take longer to step in.
 * Source: Caller's Box glossary, "Star"; ContraDB rows "star right", "star
 * left" in triplets (Impromptu Triplet #1, Palette Cleanser).
 * Reading: a star with no amount and no one named is the whole group,
 * once round.
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, withinReach } from '../../core/contacts.ts';
import { add, heading, length, progress, rotate, scale, smooth, sub, TAU, turn } from '../../core/math.ts';
import { findRing } from '../../core/ring.ts';
import { body, minorSets, withChanges } from '../../core/state.ts';
import { STAR_RADIUS } from '../star.ts';

export interface StarAroundParams {
  hand: 'right' | 'left';
  amount?: number;
  grip?: 'hands-across' | 'wrist';
}

/** Spacing round the star between neighbors, at least. */
const STAR_GAP = 0.9;

export const starAround: Figure<StarAroundParams> = (state, params, beats) => {
  onlyKeys('star-around', params, ['hand', 'amount', 'grip']);
  const hand = oneOf('star-around', 'hand', params.hand, ['right', 'left'] as const);
  const grip = oneOf('star-around', 'grip', params.grip ?? 'wrist', ['hands-across', 'wrist'] as const);
  const amount = params.amount ?? 1;
  if (!(amount > 0 && amount <= 2)) throw new Error('star-around amount must be 0-2 times round.');
  const sign = hand === 'right' ? 1 : -1;
  const stars = minorSets(state).map((g) => {
    const ring = findRing(state, g, 'star');
    const n = ring.order.length;
    if (grip === 'hands-across' && n % 2) throw new Error('Hands across needs an even number.');
    const radius = Math.max(STAR_RADIUS, (STAR_GAP * n) / TAU);
    const far = Math.max(...ring.order.map((id) => length(sub(body(state, id).position, ring.center))));
    // Step in at no more than about 0.6 m a beat.
    const edge = Math.min(0.3, Math.max(0.15, (far - radius) / 0.6 / beats));
    const ahead = (i: number) => ring.order[(i + sign + n) % n];
    const contacts: FigureContact[] =
      grip === 'wrist'
        ? ring.order.map((id, i) => ({
            a: id,
            handA: hand,
            b: ahead(i),
            handB: hand,
            kind: 'joined' as const,
            target: 'wrist' as const,
            strength: 1,
          }))
        : ring.order.slice(0, n / 2).map((id, i) => ({
            a: id,
            handA: hand,
            b: ring.order[i + n / 2],
            handB: hand,
            kind: 'joined' as const,
            strength: 1,
          }));
    return { ...ring, radius, edge, sweep: sign * amount * TAU, contacts };
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = stars.flatMap((s) => {
      const inward = Math.min(smooth(t / s.edge), smooth((1 - t) / s.edge));
      return s.order.map((id) => {
        const b = body(state, id);
        const rel = sub(b.position, s.center);
        const r0 = length(rel);
        const r = r0 + (s.radius - r0) * inward;
        // Turn mostly once stepped in, so the corners don't sweep wide.
        const angle = s.sweep * progress((t - s.edge / 2) / (1 - s.edge));
        const position = add(s.center, rotate(scale(rel, r / r0), angle));
        const walk = rotate(rel, (sign * Math.PI) / 2);
        const tangent = heading(b.position, add(b.position, walk));
        const face = Math.min(smooth(beat / 1.5), smooth((beats - beat) / 1.5));
        const yaw = b.yaw + turn(tangent, b.yaw) * face - angle;
        return { id, position, yaw };
      });
    });
    const map = bodyMap(bodies);
    const contacts = stars.flatMap((s) => {
      const inward = Math.min(smooth(t / s.edge), smooth((1 - t) / s.edge));
      const strength = smooth((inward - 0.6) / 0.3);
      return s.contacts.map((c) => withinReach({ ...c, strength }, map));
    });
    return { bodies, contacts };
  };
  return { kind: 'star', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
