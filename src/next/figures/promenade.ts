/**
 * Promenade across.
 *
 * Definition: two dancers side by side (partners or neighbors) take
 * promenade (skater's) hold, walk across the set together, passing the other
 * pair by left shoulders, and wheel to the left as a couple to face back in
 * on the other side, the one on the left backing up as in a courtesy turn.
 * Source: Caller's Box glossary, "Promenade"; ContraDB rows "partners
 * promenade", "neighbors promenade across"; left-shoulder pass and left
 * wheel as in the old kernel src/promenade.ts (contralab.org definitions).
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  courtesyAt,
  courtesyContacts,
  courtesyPair,
  courtesyStart,
  walk,
  WHEEL_HALF,
} from '../core/courtesy.ts';
import {
  add,
  dot,
  forward,
  heading,
  leftOf,
  length,
  mix,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { body, groupCenter, minorSets, pairsIn, withChanges } from '../core/state.ts';

export interface PromenadeParams {
  who: 'partner' | 'neighbor';
}

/** Share of the figure spent crossing; the wheel takes the rest. */
const BASE_CROSS = 0.65;
/** A quick promenade (under 8 beats) spends more of it crossing. */
const QUICK_CROSS = 0.68;
/** Each pair crosses this far to its right of the middle, so pairs pass left shoulders. */
const LANE = 0.65;
/** Share of the crossing spent closing up into promenade hold. */
const GATHER = 0.55;
/** The lane runs straight this far each side of the middle, where the pairs pass. */
const LANE_RUN = 0.45;

export const promenade: Figure<PromenadeParams> = (state, params, beats) => {
  onlyKeys('promenade', params, ['who']);
  const who = oneOf('promenade', 'who', params.who, ['partner', 'neighbor'] as const);
  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    const side = (id: number) => Math.sign(body(state, id).position.x - middle.x);
    const pairs = pairsIn(state, g, who);
    if (pairs.some(([a, b]) => side(a) !== side(b) || side(a) === 0))
      throw new Error(`To promenade across, ${who}s must stand side by side on one side.`);
    return pairs.map(([a, b]) => {
      const from = side(a);
      const far = g.filter((id) => side(id) === -from);
      const inward = from > 0 ? -Math.PI / 2 : Math.PI / 2;
      // The one on the left (facing across) keeps the left, and turns.
      const leftFirst =
        dot(sub(body(state, b).position, body(state, a).position), leftOf(inward)) < 0;
      const [left, right] = leftFirst ? [a, b] : [b, a];
      const pair = {
        ...courtesyPair(
          left,
          right,
          [body(state, far[0]).position, body(state, far[1]).position],
          -inward,
        ),
        // A quick promenade leaves more of its short wheel for opening out.
        ...(beats < 8 ? { wheelShare: 0.6 } : {}),
      };
      const start = courtesyStart(pair);
      const lane = add(middle, scale(rightOf(inward), LANE));
      // The pair travels as one unit: its middle walks the lane to the wheel.
      const pl = body(state, left);
      const pr = body(state, right);
      const unitStart = { position: mix(pl.position, pr.position, 0.5), yaw: inward };
      const wheelMiddle = mix(start.turner.position, start.follower.position, 0.5);
      const unit = walk(unitStart, wheelMiddle, start.turner.yaw, [
        sub(lane, scale(forward(inward), LANE_RUN)),
        lane,
        add(lane, scale(forward(inward), LANE_RUN)),
        sub(wheelMiddle, scale(forward(inward), 0.5)),
      ]);
      const at = (s: number) => {
        const here = unit(s).position;
        // The pair keeps facing across as it walks, sidestepping into its lane.
        const toward = inward;
        const side = scale(leftOf(toward), WHEEL_HALF);
        const gather = progress(Math.min(1, s / GATHER));
        // Each partner closes in on the pair's middle as the pair walks: an
        // offset from the walking middle, shrinking from where they stood.
        const offL = mix(sub(pl.position, unitStart.position), side, gather);
        const offR = mix(sub(pr.position, unitStart.position), scale(side, -1), gather);
        return {
          left: {
            position: add(here, offL),
            yaw: pl.yaw + turn(toward, pl.yaw) * gather,
          },
          right: {
            position: add(here, offR),
            yaw: pr.yaw + turn(toward, pr.yaw) * gather,
          },
        };
      };
      return { pair, at };
    });
  });

  const CROSS = beats < 8 ? QUICK_CROSS : BASE_CROSS;
  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = plans.flatMap((p) => {
      if (t >= CROSS) return courtesyAt(p.pair, (t - CROSS) / (1 - CROSS));
      const s = t / CROSS;
      return [
        { id: p.pair.turner, ...p.at(s).left },
        { id: p.pair.follower, ...p.at(s).right },
      ];
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = plans.flatMap((p) => {
      if (t >= CROSS) return courtesyContacts(p.pair, (t - CROSS) / (1 - CROSS));
      const strength = smooth((t / CROSS - 0.15) / 0.15);
      return [
        {
          a: p.pair.turner,
          handA: 'left' as const,
          b: p.pair.follower,
          handB: 'left' as const,
          kind: 'joined' as const,
          strength,
        },
        {
          a: p.pair.turner,
          handA: 'right' as const,
          b: p.pair.follower,
          handB: 'right' as const,
          kind: 'joined' as const,
          strength,
        },
      ];
    });
    return { bodies, contacts: contacts.map((c) => withinReach(c, map)) };
  };
  return {
    kind: 'promenade',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
