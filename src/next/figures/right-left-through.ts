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
import type { Vec2 } from '../../types.ts';
import { SET } from '../core/config.ts';
import { mirrored } from '../core/mirror.ts';
import { add, distance, dot, forward, heading, leftOf, mix, scale, smooth, sub } from '../core/math.ts';
import { body, groupCenter, minorSets, withChanges, type DanceState } from '../core/state.ts';

export interface RightLeftThroughParams {
  /**
   * Left for a "left right through": the mirror image, pulling by left
   * hands and courtesy turning the other way round.
   */
  hand?: 'right' | 'left';
}

/**
 * Where each dancer counts as standing. Two couples in one line of four
 * across the set (after up or down the hall) bend the line as they set off:
 * the ends step forward and the middles back, so the halves face across
 * as two couples on the side lines.
 */
function linePlaces(state: DanceState, group: readonly number[], middle: Vec2) {
  const line = group.every((id) => Math.abs(body(state, id).position.z - middle.z) < 0.2);
  const places = new Map<number, Vec2>();
  if (line) {
    for (const id of group) {
      const b = body(state, id);
      const dx = b.position.x - middle.x;
      const ahead = forward(b.yaw).z >= 0 ? 1 : -1;
      const end = Math.abs(dx) > SET.halfWidth / 2 + 0.2 ? 1 : -1;
      places.set(id, {
        x: middle.x + Math.sign(dx) * SET.halfWidth,
        z: middle.z + ahead * end * (SET.slot / 2),
      });
    }
  }
  return (id: number) => places.get(id) ?? body(state, id).position;
}

/** Share of the figure spent crossing; the courtesy turn takes the rest. */
const BASE_CROSS = 0.5;
const MOST_CROSS = 0.65;
/** Meters a beat a crossing walk may average, with room for its ramps. */
const WALK = 1.0;
const VEER = 0.3;

export const rightLeftThrough: Figure<RightLeftThroughParams> = (state, params, beats) => {
  onlyKeys('right left through', params, ['hand']);
  if (params.hand === 'left') return mirrored(rightHanded)(state, {}, beats);
  if (params.hand !== undefined && params.hand !== 'right')
    throw new Error(`right left through hand must be right or left; got ${String(params.hand)}.`);
  return rightHanded(state, {}, beats);
};

const rightHanded: Figure<Record<string, never>> = (state, params, beats) => {
  onlyKeys('right left through', params, []);
  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    const at = linePlaces(state, g, middle);
    const side = (id: number) => Math.sign(at(id).x - middle.x);
    // From a line, walk out through the bent place, then pass right shoulders.
    const via = (id: number, to: Vec2): number | Vec2[] => {
      const from = at(id);
      if (from === body(state, id).position) return VEER;
      const pass = add(mix(from, to, 0.5), scale(leftOf(heading(from, to)), VEER));
      return [from, pass];
    };
    const lines = [1, -1].map((s) => g.filter((id) => side(id) === s));
    if (lines.some((l) => l.length !== 2))
      throw new Error('A right and left through needs two dancers on each side.');
    return lines.map((line, i) => {
      const far = lines[1 - i];
      const yaw = side(far[0]) > 0 ? -Math.PI / 2 : Math.PI / 2;
      // Whoever is on the left (facing in) courtesy turns; crossing keeps the order.
      const inward = yaw + Math.PI;
      const [left, right] = [...line].sort((a, b) =>
        dot(sub(at(b), at(a)), leftOf(inward)) > 0 ? 1 : -1,
      );
      const pair = courtesyPair(
        left,
        right,
        [at(far[0]), at(far[1])],
        yaw,
      );
      const start = courtesyStart(pair);
      // Each dancer passes the one standing straight across.
      const opposite = (id: number) =>
        far.reduce((best, o) =>
          Math.abs(at(o).z - at(id).z) < Math.abs(at(best).z - at(id).z)
            ? o
            : best,
        );
      return {
        pair,
        passes: [left, right].map((id) => [id, opposite(id)] as const),
        left: walk(body(state, left), start.turner.position, start.turner.yaw, via(left, start.turner.position)),
        right: walk(body(state, right), start.follower.position, start.follower.yaw, via(right, start.follower.position)),
      };
    });
  });

  // A long way across (to a couple on the diagonal) takes more of the beats.
  const far = Math.max(
    0,
    ...plans.flatMap((p) => {
      const start = courtesyStart(p.pair);
      return [
        distance(body(state, p.pair.turner).position, start.turner.position),
        distance(body(state, p.pair.follower).position, start.follower.position),
      ];
    }),
  );
  const CROSS = Math.min(MOST_CROSS, Math.max(BASE_CROSS, (1.3 * far) / (WALK * beats)));

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
