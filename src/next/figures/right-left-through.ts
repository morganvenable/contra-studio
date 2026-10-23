/**
 * Right and left through.
 *
 * Definition: two couples (or two lines of two) facing across give right
 * hands to the dancer opposite and pull by, crossing the set; each pair that
 * crossed together then courtesy turns to face back in. Everyone ends on the
 * other side.
 * Source: Caller's Box glossary, "Right and left through"; ContraDB rows
 * "right left through", "right left through (with courtesy turn)". The pair
 * crossing together is the two dancers who share a side line at the start;
 * the one on the left does the courtesy turn, whatever the role.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  courtesyAt,
  courtesyContacts,
  courtesyPair,
  courtesyStart,
  walk,
} from '../core/courtesy.ts';
import { dot, leftOf, smooth, sub } from '../core/math.ts';
import { body, groupCenter, minorSets, withChanges } from '../core/state.ts';

export type RightLeftThroughParams = Record<string, never>;

/** Share of the figure spent crossing; the courtesy turn takes the rest. */
const CROSS = 0.5;
const VEER = 0.3;

export const rightLeftThrough: Figure<RightLeftThroughParams> = (state, params, beats) => {
  onlyKeys('right left through', params, []);
  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    const side = (id: number) => Math.sign(body(state, id).position.x - middle.x);
    const lines = [1, -1].map((s) => g.filter((id) => side(id) === s));
    if (lines.some((l) => l.length !== 2))
      throw new Error('A right and left through needs two dancers on each side.');
    return lines.map((line, i) => {
      const far = lines[1 - i];
      const yaw = side(far[0]) > 0 ? -Math.PI / 2 : Math.PI / 2;
      // Whoever is on the left (facing in) courtesy turns; crossing keeps the order.
      const inward = yaw + Math.PI;
      const [left, right] = [...line].sort((a, b) =>
        dot(sub(body(state, b).position, body(state, a).position), leftOf(inward)) > 0 ? 1 : -1,
      );
      const pair = courtesyPair(
        left,
        right,
        [body(state, far[0]).position, body(state, far[1]).position],
        yaw,
      );
      const start = courtesyStart(pair);
      // Each dancer passes the one standing straight across.
      const opposite = (id: number) =>
        far.reduce((best, o) =>
          Math.abs(body(state, o).position.z - body(state, id).position.z) <
          Math.abs(body(state, best).position.z - body(state, id).position.z)
            ? o
            : best,
        );
      return {
        pair,
        passes: [left, right].map((id) => [id, opposite(id)] as const),
        left: walk(body(state, left), start.turner.position, start.turner.yaw, VEER),
        right: walk(body(state, right), start.follower.position, start.follower.yaw, VEER),
      };
    });
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = plans.flatMap((p) => {
      if (t >= CROSS) return courtesyAt(p.pair, (t - CROSS) / (1 - CROSS));
      const s = t / CROSS;
      return [
        { id: p.pair.turner, ...p.left(s) },
        { id: p.pair.follower, ...p.right(s) },
      ];
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = plans.flatMap((p) => {
      if (t >= CROSS) return courtesyContacts(p.pair, (t - CROSS) / (1 - CROSS));
      const s = t / CROSS;
      const strength = smooth((s - 0.2) / 0.15) * smooth((0.85 - s) / 0.15);
      return p.passes
        .filter(([a, b]) => a < b)
        .map(([a, b]) => ({
          a,
          handA: 'right' as const,
          b,
          handB: 'right' as const,
          kind: 'joined' as const,
          strength,
        }));
    });
    return { bodies, contacts: contacts.map((c) => withinReach(c, map)) };
  };
  return {
    kind: 'right-left-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
