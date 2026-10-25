/**
 * Basket swing for three (three face three: "partners long swing
 * (three-person basket)", "trios basket swing", "basket swing partners").
 *
 * Definition: the three dancers of a trio close into a small ring, arms
 * round each other's waists, and swing round clockwise (seen from above),
 * the way a couple swings, then open back out into their line in the same
 * order, facing the way they faced.
 * Source: ContraDB rows "partners long swing (three-person basket)",
 * "partners long swing (throuples)", "Basket Swing partners" (three face
 * three dances); Caller's Box glossary, "Basket swing".
 * Readings: a trio's "partners" are the other two of its own trio; the
 * basket turns a whole number of times at about a turn per four beats and
 * ends in the line it started from.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { add, forward, heading, mean, mix, polar, progress, smooth, sub, TAU } from '../../core/math.ts';
import { activeIds, body, withChanges, type Hold } from '../../core/state.ts';
import { choreograph, type Path } from './common.ts';

/** Ring radius of a basket of three. */
const BASKET_RADIUS = 0.46;

export const trioBasket: Figure<Record<string, never>> = (state, params, beats) => {
  onlyKeys('trio-basket', params, []);
  if (state.hands.length) throw new Error('A basket swing starts with free hands.');
  const trios = new Map<number, number[]>();
  for (const id of activeIds(state)) {
    const c = state.dancers[id].couple;
    trios.set(c, [...(trios.get(c) ?? []), id]);
  }
  const edge = Math.min(0.3, 2.5 / beats);
  const turns = Math.max(1, Math.round((beats * (1 - edge)) / 4));
  const paths = new Map<number, Path>();
  const holds: Hold[] = [];
  for (const ids of trios.values()) {
    if (ids.length !== 3) throw new Error('A basket swing for three needs trios of three.');
    const center = mean(ids.map((id) => body(state, id).position));
    // The middle dancer of the line takes the ring place just behind the
    // middle (still facing in); the ends close in ahead on either side.
    const mid = ids.reduce((best, id) =>
      sub(body(state, id).position, center).x ** 2 + sub(body(state, id).position, center).z ** 2 <
      sub(body(state, best).position, center).x ** 2 + sub(body(state, best).position, center).z ** 2
        ? id
        : best,
    );
    const ahead = polar(forward(body(state, mid).yaw)) + Math.PI;
    const ring = new Map<number, number>([[mid, ahead]]);
    for (const id of ids.filter((i) => i !== mid)) {
      const side = polar(sub(body(state, id).position, center));
      // Each end sits 120 degrees round from the middle dancer, on its own side.
      const d = Math.atan2(Math.sin(side - ahead), Math.cos(side - ahead));
      ring.set(id, ahead + Math.sign(d) * (TAU / 3));
    }
    for (const id of ids) {
      const start = body(state, id);
      const ringAt = (u: number): Vec2 => {
        const a = ring.get(id)! + turns * TAU * progress((u - edge / 2) / (1 - edge));
        return add(center, { x: BASKET_RADIUS * Math.cos(a), z: BASKET_RADIUS * Math.sin(a) });
      };
      const g = (u: number) => Math.min(smooth(u / edge), smooth((1 - u) / edge));
      const pos = (u: number) => mix(start.position, ringAt(u), g(u));
      paths.set(id, {
        pos,
        yaw: (u) => {
          const k = g(u);
          if (k < 1e-6) return start.yaw;
          // Facing in toward the basket's middle while swinging.
          const inward = heading(ringAt(u), center);
          return start.yaw + Math.atan2(Math.sin(inward - start.yaw), Math.cos(inward - start.yaw)) * k;
        },
        unwrap: true,
      });
    }
    const order = [...ids].sort((a, b) => ring.get(a)! - ring.get(b)!);
    order.forEach((id, i) =>
      holds.push({ a: id, handA: 'left', b: order[(i + 1) % 3], handB: 'right' }),
    );
  }
  const bodies = choreograph(state, beats, paths, 0.75);
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const map = bodyMap(moved);
    const u = beat / beats;
    const on = Math.min(smooth((u - edge * 0.7) / (edge * 0.3)), smooth((1 - edge * 0.7 - u) / (edge * 0.3)));
    return {
      bodies: moved,
      contacts: holds.map((h) => withinReach({ ...joined(h, on), target: 'waist' as const }, map)),
    };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
