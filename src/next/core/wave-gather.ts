/**
 * Long waves close up to hold hands. The side lines stand a couple place
 * (SET.slot) apart, too far for neighbors to hold hands, so when a long-wave
 * balance forms the waves each side line draws in along itself until
 * everyone holds both neighbors' hands. The step in is kept in the state;
 * the figure after (box circulate, Rory) lets go of the hands as it sets
 * off and opens back out to the places.
 */
import type { DanceState } from './state.ts';

/** Relation key: each dancer's step in along z, in millimeters. */
const KEY = 'wave-gather';

/** Relations with each dancer's step in along the line recorded. */
export function withGather(state: DanceState, steps: ReadonlyMap<number, number>) {
  const relations = new Map(state.relations);
  relations.set(KEY, new Map([...steps].map(([id, dz]) => [id, Math.round(dz * 1000)])));
  return relations;
}

/**
 * How far dancer `id` stepped in to hold its wave hands (meters along z),
 * while the wave is still held; 0 otherwise.
 */
export function gatherOf(state: DanceState, id: number): number {
  if (!state.hands.some((h) => h.a === id || h.b === id)) return 0;
  return (state.relations.get(KEY)?.get(id) ?? 0) / 1000;
}

/** Relations with the record of the step in dropped (the line opened out). */
export function withoutGather(state: DanceState) {
  if (!state.relations.has(KEY)) return state.relations;
  return new Map([...state.relations].filter(([name]) => name !== KEY));
}
