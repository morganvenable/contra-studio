/**
 * Pairs that stand in different groups.
 *
 * After a figure on a diagonal the foursomes are the couples it left
 * straight across from each other (core/diagonal.ts), and a pair figure
 * named by a stored relationship ("partners balance & swing") can then find
 * each dancer's partner standing just across the foursome boundary. The
 * dancers simply turn to that partner: for the figure's duration the set
 * regroups into the named pairs (as core/relations.ts does for shadows),
 * provided every pair is within reach; the groups come back afterward.
 */
import { distance } from './math.ts';
import { SHADOW_REACH } from './relations.ts';
import { activeIds, body, withChanges, type DanceState } from './state.ts';

/** The state grouped in `who` pairs when some of them cross groups, else unchanged. */
export function regroupAcross(state: DanceState, who: unknown): DanceState {
  if (typeof who !== 'string') return state;
  const rel = state.relations.get(who);
  if (!rel) return state;
  const groupOf = new Map<number, number>();
  state.groups.forEach((g, i) => g.forEach((id) => groupOf.set(id, i)));
  const active = activeIds(state);
  const pairs: [number, number][] = [];
  let crossing = false;
  for (const a of active) {
    const b = rel.get(a);
    if (b === undefined || b < a || !groupOf.has(b) || rel.get(b) !== a) continue;
    if (groupOf.get(a) !== groupOf.get(b)) crossing = true;
    pairs.push([a, b]);
  }
  if (!crossing) return state;
  for (const [a, b] of pairs)
    if (distance(body(state, a).position, body(state, b).position) > SHADOW_REACH) return state;
  return withChanges(state, { groups: pairs.map(([a, b]) => [a, b]) });
}
