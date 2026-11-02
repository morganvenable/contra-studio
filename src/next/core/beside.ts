/**
 * Who stands beside whom: pairs found from where the dancers are, not from
 * what they are to each other. A partner, a neighbor or a shadow side by
 * side with you is all the same to a figure danced side by side (a
 * California twirl, the balance before it); the relation a line names only
 * breaks a tie (in a ring, the dancers on either side).
 */
import { dot, forward, length, scale, sub } from './math.ts';
import { relationMap } from './relations.ts';
import { activeIds, body, type DanceState } from './state.ts';

/** Farther apart than this (meters) is not beside. */
const BESIDE_REACH = 2;

/**
 * Each dancer's nearest dancer standing beside them, facing much the same way
 * (in a ring, the one on either side), when that is mutual; the one `who`
 * names first when they stand beside. Throws when nobody stands beside anyone.
 */
export function besidePairs(state: DanceState, who?: string, ids: readonly number[] = activeIds(state)): [number, number][] {
  let named: ReadonlyMap<number, number> | undefined;
  try {
    named = who ? relationMap(state, who) : undefined;
  } catch {
    named = undefined;
  }
  const nearest = new Map<number, number>();
  for (const a of ids) {
    const pa = body(state, a);
    let best: [number, number] | undefined;
    for (const b of ids) {
      if (b === a) continue;
      const pb = body(state, b), d = length(sub(pb.position, pa.position));
      const same = dot(forward(pa.yaw), forward(pb.yaw));
      const ahead = dot(forward(pa.yaw), scale(sub(pb.position, pa.position), 1 / d));
      const rank = named?.get(a) === b ? d - 10 : d;
      if (same > -0.2 && Math.abs(ahead) < 0.75 && d < BESIDE_REACH && (!best || rank < best[1])) best = [b, rank];
    }
    if (best) nearest.set(a, best[0]);
  }
  const pairs = ids
    .filter((a) => nearest.get(nearest.get(a)!) === a && a < nearest.get(a)!)
    .map((a) => [a, nearest.get(a)!] as [number, number]);
  if (!pairs.length) throw new Error('Nobody stands side by side.');
  return pairs;
}
