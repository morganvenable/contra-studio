/**
 * Promenade around the minor set ("partners promenade ¾", "promenade and a
 * little more to face up and down", "neighbors promenade 3/4 to face
 * partner up & down").
 *
 * Definition: each pair (partners or neighbors) of a minor set, side by
 * side facing in, wheels into promenade hold and walks around the minor
 * set's center as a couple (counterclockwise unless named), the one on the
 * left on the inside, then wheels back to face in. Three quarters round,
 * the pairs that stood on the side lines end at the top and bottom of the
 * minor set, side by side across the set, facing each other along it.
 * Source: Caller's Box glossary, "Promenade"; ContraDB rows "partners
 * promenade and a little more (3/4) to face up and down set", "neighbors
 * promenade 3/4 to face partner up & down", "partners promenade ¾ to next",
 * "promenade 3 places CW around group of 4".
 * Reading: "a little more" after a promenade across is a quarter more, three
 * quarters round the minor set in all; each pair keeps its own spacing at
 * both ends and closes to promenade hold (0.6 m) on the way.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  dot,
  heading,
  leftOf,
  length,
  mean,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, groupCenter, minorSets, pairsIn, withChanges } from '../core/state.ts';

export interface PromenadeAroundParams {
  who: 'partner' | 'neighbor';
  /** Times around the minor set: 0.75 (three places), 0.5, 0.25 ... */
  amount: number;
  /** Seen from above; counterclockwise (the usual promenade) unless named. */
  direction?: 'ccw' | 'cw';
}

/** Half the gap between the two in promenade hold. */
const HOLD_HALF = 0.3;
/** Share of the figure spent wheeling into the walk, and out of it. */
const WHEEL = 0.32;
/** Share of the figure by which the couple has gone all the way round. */
const ARRIVE = 0.88;
/** Beats over which a pair not quite in place settles onto its path. */
const SETTLE_BEATS = 1;

export const promenadeAround: Figure<PromenadeAroundParams> = (state, params, beats) => {
  onlyKeys('promenade around', params, ['who', 'amount', 'direction']);
  const who = oneOf('promenade around', 'who', params.who, ['partner', 'neighbor'] as const);
  const way = oneOf('promenade around', 'direction', params.direction ?? 'ccw', [
    'ccw',
    'cw',
  ] as const);
  if (!(params.amount > 0 && params.amount <= 1 && Number.isInteger(params.amount * 4)))
    throw new Error('A promenade around the minor set goes a whole number of quarters, up to once.');
  if (state.hands.length) throw new Error('A promenade around starts with free hands.');
  // rotate() turns clockwise (seen from above) for a positive angle.
  const sweep = (way === 'cw' ? 1 : -1) * params.amount * TAU;
  const plans = minorSets(state).flatMap((g) => {
    if (g.length !== 4) throw new Error('A promenade around is for a minor set of four.');
    const center = groupCenter(state, g);
    return pairsIn(state, g, who).map(([a, b]) => {
      const pa = body(state, a).position;
      const pb = body(state, b).position;
      const middle = mean([pa, pb]);
      const radial = sub(middle, center);
      if (length(radial) < 0.4 || length(sub(pa, pb)) > 2.6)
        throw new Error(`To promenade around, ${who}s must stand side by side on one side.`);
      // The one on the left, facing in, walks on the inside.
      const yawIn = heading(middle, center);
      const [left, right] = dot(sub(pa, middle), leftOf(yawIn)) > 0 ? [a, b] : [b, a];
      return { left, right, radial, half: length(sub(pa, pb)) / 2, center };
    });
  });
  const plain = (p: (typeof plans)[number], beat: number) => {
    const t = beat / beats;
    // The couple stops going round a little early, while it wheels to face in.
    const angle = sweep * progress(Math.min(1, t / ARRIVE), 0.2);
    const middle = add(p.center, rotate(p.radial, angle));
    const yawIn = heading(middle, p.center);
    const ahead = add(p.center, rotate(p.radial, angle + Math.sign(sweep) * 0.01));
    const travel = turn(heading(middle, ahead), yawIn);
    const w = Math.min(smooth(t / WHEEL), smooth((1 - t) / WHEEL));
    const yaw = yawIn + travel * w;
    const half = p.half + (HOLD_HALF - p.half) * w;
    const side = scale(leftOf(yaw), half);
    return {
      left: { position: add(middle, side), yaw },
      right: { position: sub(middle, side), yaw },
      hold: w,
    };
  };
  // Where each dancer really stands at the start, against the plain path.
  const off = new Map<number, { dp: Vec2; dyaw: number }>();
  for (const p of plans) {
    const s = plain(p, 0);
    for (const [id, at] of [
      [p.left, s.left],
      [p.right, s.right],
    ] as const) {
      const b = body(state, id);
      off.set(id, { dp: sub(b.position, at.position), dyaw: turn(b.yaw, at.yaw) });
    }
  }
  const motion = (beat: number) => {
    const fade = 1 - smooth(beat / SETTLE_BEATS);
    const bodies = plans.flatMap((p) => {
      const s = plain(p, beat);
      return [
        [p.left, s.left],
        [p.right, s.right],
      ].map(([id, at]) => {
        const o = off.get(id as number)!;
        const b = at as { position: Vec2; yaw: number };
        return {
          id: id as number,
          position: add(b.position, scale(o.dp, fade)),
          yaw: b.yaw + o.dyaw * fade,
        };
      });
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = plans.flatMap((p) => {
      const strength = smooth((plain(p, beat).hold - 0.4) / 0.3);
      return (['left', 'right'] as const).map((hand) =>
        withinReach(
          { a: p.left, handA: hand, b: p.right, handB: hand, kind: 'joined', strength },
          map,
        ),
      );
    });
    return { bodies, contacts };
  };
  return {
    kind: 'promenade',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
