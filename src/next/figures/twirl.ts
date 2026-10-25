/**
 * Twirls that trade places under an arch: box the gnat, swat the flea,
 * California twirl.
 *
 * Definitions:
 * - Box the gnat: two dancers facing each other with right hands joined
 *   trade places, the robin turning left under the raised hands while the
 *   lark turns right around her; both end facing back the way they came.
 * - Swat the flea: the same with left hands, the robin turning right.
 * - California twirl: two dancers side by side (lark on the left) with
 *   inside hands joined trade places, the robin turning left under the arch
 *   while the lark walks around her to the right; both end facing the other
 *   way.
 * In all three the pair's places turn half around their middle, clockwise
 * from above for right-hand arches, and each dancer turns half around.
 * Source: Caller's Box glossary, "Box the gnat", "Swat the flea",
 * "California twirl"; ContraDB rows "neighbors right hand balance & box the
 * gnat", "partners California twirl". The dancer going under is the robin
 * (or, for two dancers of one role, the one on the right).
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import {
  add,
  dot,
  ease,
  heading,
  length,
  mix,
  progress,
  rightOf,
  rotate,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { body, minorSets, pairsIn, roleOf, withChanges } from '../core/state.ts';

export interface TwirlParams {
  style: 'box-the-gnat' | 'swat-the-flea' | 'california';
  who: PairName;
}

/** Half the pair's gap while trading places under the arch. */
const ARCH_HALF = 0.55;
const EDGE = 0.25;

export const twirl: Figure<TwirlParams> = (state, params, beats) => {
  onlyKeys('twirl', params, ['style', 'who']);
  const style = oneOf('twirl', 'style', params.style, [
    'box-the-gnat',
    'swat-the-flea',
    'california',
  ] as const);
  const who = oneOf('twirl', 'who', params.who, PAIR_NAMES);
  // Right-hand arches trade places clockwise from above (positive in rotate()).
  const sweep = style === 'swat-the-flea' ? -Math.PI : Math.PI;
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const plans = pairs.map(([a, b]) => {
    const pa = body(state, a);
    const pb = body(state, b);
    const center = mix(pa.position, pb.position, 0.5);
    const half = length(sub(pa.position, pb.position)) / 2;
    if (half < 0.25 || half > 1.4)
      throw new Error(`Dancers ${a} and ${b} are too far apart to twirl.`);
    let under =
      roleOf(state, a) === roleOf(state, b) ? undefined : roleOf(state, a) === 'robin' ? a : b;
    if (style === 'california') {
      // Side by side: the one on the right goes under.
      const facing = mix(rightOf(pa.yaw), rightOf(pb.yaw), 0.5);
      const right = dot(sub(pb.position, pa.position), facing) > 0 ? b : a;
      if (under === undefined) under = right;
    } else {
      under ??= b;
    }
    const over = under === a ? b : a;
    // The arch hand: right for box the gnat and the lark's right in a California twirl.
    const archHand = style === 'swat-the-flea' ? 'left' : 'right';
    const underHand = style === 'california' ? 'left' : archHand;
    const ids = [a, b].map((id) => {
      const s = body(state, id);
      const rel = sub(s.position, center);
      // Under the arch turns left with a clockwise trade, right otherwise.
      const spin = (id === under ? 1 : -1) * Math.sign(sweep) * Math.PI;
      const face =
        style === 'california' ? s.yaw : heading(s.position, id === a ? pb.position : pa.position);
      return { id, s, rel, spin, face };
    });
    const contact: FigureContact = {
      a: over,
      handA: archHand,
      b: under,
      handB: underHand,
      kind: 'arch',
      underId: under,
      strength: 1,
    };
    return { center, half, ids, contact };
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const q = progress(t);
    const close = Math.min(smooth(t / EDGE), smooth((1 - t) / EDGE));
    const bodies = plans.flatMap((p) =>
      p.ids.map((d) => {
        const r = p.half + (Math.min(p.half, ARCH_HALF) - p.half) * close;
        const position = add(p.center, rotate(scale(d.rel, r / p.half), sweep * q));
        const into = d.s.yaw + turn(d.face, d.s.yaw) * smooth(beat / 0.75);
        return { id: d.id, position, yaw: into + d.spin * ease(t) };
      }),
    );
    const map = bodyMap(bodies);
    const strength = smooth(t / 0.1) * smooth((1 - t) / 0.1);
    const contacts = plans.map((p) => withinReach({ ...p.contact, strength }, map));
    return { bodies, contacts };
  };
  return {
    kind: style === 'california' ? 'california-twirl' : 'box-the-gnat',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
