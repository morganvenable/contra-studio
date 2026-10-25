/**
 * Hands held along a line or wave of three or more dancers.
 *
 * A figure that needs a hand still holding a line (an allemande straight
 * out of a wave balance) lets go of the line: that is ordinary dancing, so
 * such a hold does not make the hand busy.
 */
import type { DanceState, Hold } from './state.ts';

/** The dancers joined to `id` through held hands, `id` included. */
export function heldGroup(state: DanceState, id: number): Set<number> {
  const seen = new Set([id]);
  const todo = [id];
  while (todo.length) {
    const me = todo.pop()!;
    for (const h of state.hands) {
      const other = h.a === me ? h.b : h.b === me ? h.a : undefined;
      if (other !== undefined && !seen.has(other)) {
        seen.add(other);
        todo.push(other);
      }
    }
  }
  return seen;
}

/**
 * True when `hold` is part of an open line of held hands (a wave or a line)
 * of three or more dancers: every dancer holds at most two others and the
 * hands do not close into a ring.
 */
export function inHeldLine(state: DanceState, hold: Hold): boolean {
  const group = heldGroup(state, hold.a);
  if (group.size < 3) return false;
  const edges = new Set<string>();
  const degree = new Map<number, Set<number>>();
  for (const h of state.hands) {
    if (!group.has(h.a) || !group.has(h.b)) continue;
    edges.add(h.a < h.b ? `${h.a}:${h.b}` : `${h.b}:${h.a}`);
    for (const [x, y] of [
      [h.a, h.b],
      [h.b, h.a],
    ])
      degree.set(x, (degree.get(x) ?? new Set()).add(y));
  }
  return edges.size === group.size - 1 && [...degree.values()].every((s) => s.size <= 2);
}
