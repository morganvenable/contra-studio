/**
 * Pairs of dancers facing each other: for figures a row names without
 * saying who ("pull by right"), or names by a relationship the state does
 * not carry (shadows), the dancers are whoever stands in front of each
 * other, as a caller would see it.
 */
import { dot, forward, length, sub } from './math.ts';
import { body, type DanceState } from './state.ts';

/** How directly someone must stand in front (cosine) to count as faced. */
const AHEAD = 0.7;
/** Farthest apart two dancers can be and still face each other for a figure. */
const REACH = 3;

/** Who stands most directly in front of `id` within `group`, if anyone. */
export function facedBy(state: DanceState, id: number, group: readonly number[]) {
  const me = body(state, id);
  const ahead = forward(me.yaw);
  let best: number | undefined;
  let bestScore = -Infinity;
  for (const other of group) {
    if (other === id) continue;
    const gap = sub(body(state, other).position, me.position);
    const d = length(gap);
    if (d < 1e-6 || d > REACH) continue;
    const cos = dot(gap, ahead) / d;
    if (cos < AHEAD) continue;
    // Straighter first, then nearer.
    const score = cos - 0.1 * d;
    if (score > bestScore) {
      best = other;
      bestScore = score;
    }
  }
  return best;
}

/** Pairs [a, b] (a < b) in `group` who face each other, each the other's best. */
export function facingPairs(state: DanceState, group: readonly number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (const id of group) {
    const other = facedBy(state, id, group);
    if (other === undefined || other < id) continue;
    if (facedBy(state, other, group) === id) pairs.push([id, other]);
  }
  if (!pairs.length) throw new Error('Nobody here faces anyone to dance with.');
  return pairs;
}
