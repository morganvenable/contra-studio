/**
 * Relationships that are not fixed minor-set pairs: shadows, previous
 * neighbors and same-role pairs. A figure addressing one of them ("shadows
 * allemande left", "same roles do si do") runs unchanged: for its duration
 * the dancers regroup into the named pairs, the relation is added to the
 * state, and the minor sets come back afterward (as core/diagonal.ts does
 * for figures on a diagonal).
 *
 * - shadow: your nearest dancer of the other role who is neither your
 *   partner nor your current neighbor, when you are each other's nearest
 *   (and within a hand turn's reach). This is how dancers find their shadow
 *   on the floor; "1st shadows" and "2nd shadows" are whichever shadow is
 *   nearest at the time. Dancers with no shadow nearby stand still.
 * - previous-neighbor: the neighbor before the last progression (the
 *   progression records it), wherever they now stand.
 * - same-role: the other dancer of your role in your minor set.
 * - next-neighbor: the couple you will meet after the progression, before
 *   the progression mark is reached: the nearest dancer of the other role
 *   outside your minor set, mutually.
 */
import type { Figure } from './figure.ts';
import { distance } from './math.ts';
import {
  activeIds,
  body,
  partnerOf,
  related,
  roleOf,
  withChanges,
  type DanceState,
} from './state.ts';

/** A shadow stands within this distance (meters): close enough to take hands. */
export const SHADOW_REACH = 2.7;

/** Relationship names this module computes from where dancers stand. */
export const COMPUTED_RELATIONS = ['shadow', 'same-role', 'next-neighbor'] as const;
/** Relationship names that regroup the set for the figure's duration. */
const REGROUPING = new Set<string>([...COMPUTED_RELATIONS, 'previous-neighbor']);

/** Mutual nearest pairing: pair the closest free candidates first. */
function nearestPairs(
  state: DanceState,
  ids: readonly number[],
  allowed: (a: number, b: number) => boolean,
  reach: number,
): [number, number][] {
  const options: [number, number, number][] = [];
  for (const a of ids)
    for (const b of ids) {
      if (b <= a || !allowed(a, b)) continue;
      const d = distance(body(state, a).position, body(state, b).position);
      if (d <= reach) options.push([d, a, b]);
    }
  options.sort((x, y) => x[0] - y[0]);
  const used = new Set<number>();
  const pairs: [number, number][] = [];
  for (const [, a, b] of options) {
    if (used.has(a) || used.has(b)) continue;
    // Closest first: nobody still free is nearer to either of them.
    used.add(a).add(b);
    pairs.push([a, b]);
  }
  return pairs;
}

const isPair = (state: DanceState, name: string, a: number, b: number) =>
  related(state, name, a) === b;

export function shadowPairs(state: DanceState): [number, number][] {
  return nearestPairs(
    state,
    activeIds(state),
    (a, b) =>
      roleOf(state, a) !== roleOf(state, b) &&
      partnerOf(state, a) !== b &&
      !isPair(state, 'neighbor', a, b),
    SHADOW_REACH,
  );
}

export function nextNeighborPairs(state: DanceState): [number, number][] {
  const groupOf = new Map<number, number>();
  state.groups.forEach((g, i) => g.forEach((id) => groupOf.set(id, i)));
  const ids = state.dancers.map((d) => d.id);
  return nearestPairs(
    state,
    ids,
    (a, b) =>
      roleOf(state, a) !== roleOf(state, b) &&
      partnerOf(state, a) !== b &&
      (groupOf.get(a) === undefined || groupOf.get(a) !== groupOf.get(b)),
    SHADOW_REACH,
  );
}

export function sameRolePairs(state: DanceState): [number, number][] {
  return state.groups.flatMap((g) => {
    const pairs: [number, number][] = [];
    for (const a of g)
      for (const b of g) if (a < b && roleOf(state, a) === roleOf(state, b)) pairs.push([a, b]);
    return pairs;
  });
}

function storedPairs(state: DanceState, name: string): [number, number][] {
  const map = state.relations.get(name);
  if (!map) throw new Error(`Nobody has a ${name.replace('-', ' ')} yet.`);
  const active = new Set(activeIds(state));
  return [...map]
    .filter(([a, b]) => a < b && map.get(b) === a && active.has(a) && active.has(b))
    .map(([a, b]) => [a, b] as [number, number]);
}

/** The pairs a relationship names now, across the whole set. */
export function relationPairs(state: DanceState, who: string): [number, number][] {
  switch (who) {
    case 'shadow':
      return shadowPairs(state);
    case 'same-role':
      return sameRolePairs(state);
    case 'next-neighbor':
      return nextNeighborPairs(state);
    default:
      return storedPairs(state, who);
  }
}

/**
 * The state with `who` as a relation and the dancers grouped in its pairs,
 * or the state unchanged when `who` is an ordinary minor-set name.
 */
export function regroupFor(state: DanceState, who: unknown): DanceState {
  if (typeof who !== 'string' || !REGROUPING.has(who)) return state;
  const pairs = relationPairs(state, who);
  if (!pairs.length) throw new Error(`Nobody stands near enough to a ${who.replace('-', ' ')}.`);
  const map = new Map<number, number>();
  for (const [a, b] of pairs) map.set(a, b).set(b, a);
  return withChanges(state, {
    relations: new Map(state.relations).set(who, map),
    groups: pairs.map(([a, b]) => [a, b]),
  });
}

/**
 * Let a figure address shadows, previous or next neighbors and same-role
 * pairs through its `who`: it runs on the regrouped state and the exit gets
 * the minor sets and relations back.
 */
export function withRelations<P>(figure: Figure<P>): Figure<P> {
  return (state, params, beats) => {
    const who = (params as { who?: unknown }).who;
    const regrouped = regroupFor(state, who);
    if (regrouped === state) return figure(state, params, beats);
    const result = figure(regrouped, params, beats);
    return {
      ...result,
      exit: withChanges(result.exit, {
        groups: state.groups,
        relations: state.relations,
      }),
    };
  };
}
