/**
 * Long waves close up to hold hands. The side lines stand a couple place
 * (SET.slot) apart, too far for neighbors to hold hands, so when a long-wave
 * balance forms the waves each side line draws in along itself until
 * everyone holds both neighbors' hands. The step in is kept in the state;
 * the figure after (box circulate, Rory) lets go of the hands as it sets
 * off and opens back out to the places.
 */
import type { DanceState } from './state.ts';

/** Relation keys: each dancer's step in along z, and where it stood then (mm). */
const KEY = 'wave-gather';
const AT = 'wave-gather-at';

/** Relations with each dancer's step in along the line recorded. */
export function withGather(
  state: DanceState,
  steps: ReadonlyMap<number, number>,
  at: ReadonlyMap<number, number>,
) {
  const relations = new Map(state.relations);
  const mm = (m: ReadonlyMap<number, number>) => new Map([...m].map(([id, v]) => [id, Math.round(v * 1000)]));
  relations.set(KEY, mm(steps));
  relations.set(AT, mm(at));
  return relations;
}

/**
 * How far dancer `id` stepped in to hold its wave hands (meters along z),
 * while it still stands where the wave left it; 0 otherwise.
 */
export function gatherOf(state: DanceState, id: number): number {
  if (!inBalancedWave(state, id)) return 0;
  return (state.relations.get(KEY)?.get(id) ?? 0) / 1000;
}

/** True while dancer `id` stands where a long-wave balance left it. */
export function inBalancedWave(state: DanceState, id: number): boolean {
  const at = state.relations.get(AT)?.get(id);
  const b = state.bodies.get(id);
  return at !== undefined && !!b && Math.abs(b.position.z * 1000 - at) <= 2;
}

/** Relations with the record of the step in dropped (the line opened out). */
export function withoutGather(state: DanceState) {
  if (!state.relations.has(KEY)) return state.relations;
  return new Map([...state.relations].filter(([name]) => name !== KEY && name !== AT));
}
