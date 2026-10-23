/**
 * Rings: the dancers of a group standing around a common center (a minor set
 * of four in its square of places, or a small set in a circle).
 */
import type { Vec2 } from '../../types.ts';
import { length, mean, polar, positiveAngle, sub, TAU } from './math.ts';
import { body, type DanceState, type Hold } from './state.ts';

export interface Ring {
  readonly center: Vec2;
  /** Ids in increasing polar angle: each one's left-hand neighbor is the next. */
  readonly order: readonly number[];
}

/** Order a group around its center, or explain why it is not a ring. */
export function findRing(state: DanceState, group: readonly number[], what = 'ring'): Ring {
  const n = group.length;
  const center = mean(group.map((id) => body(state, id).position));
  const order = [...group].sort(
    (a, b) =>
      polar(sub(body(state, a).position, center)) - polar(sub(body(state, b).position, center)),
  );
  for (let i = 0; i < n; i++) {
    const rel = sub(body(state, order[i]).position, center);
    const next = sub(body(state, order[(i + 1) % n]).position, center);
    const gap = positiveAngle(polar(next) - polar(rel));
    if (length(rel) < 0.6 || length(rel) > 3 || Math.abs(gap - TAU / n) > 0.5) {
      throw new Error(`A ${what} of ${n} needs the dancers spaced around a ring.`);
    }
  }
  return { center, order };
}

/** Ring hands: each dancer's left hand in the next dancer's right. */
export function ringHolds(ring: Ring): Hold[] {
  const n = ring.order.length;
  return ring.order.map((id, i) => ({
    a: id,
    handA: 'left',
    b: ring.order[(i + 1) % n],
    handB: 'right',
  }));
}
