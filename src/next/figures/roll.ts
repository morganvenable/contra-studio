/**
 * Roll away inside a ring, along or across the set.
 *
 * Definition: as roll-away.ts (the rolled dancer crosses in front of the
 * roller, spinning once, while the roller slides behind), for a pair that
 * stands side by side anywhere around a ring of four: on a side line (the
 * rolled dancer travels along the set) or at one end of the ring (the rolled
 * dancer travels across the set). Both end facing the way the pair faced,
 * square to the line they stand on, toward the middle of the minor set.
 * Source: ContraDB rows "circle left 2 places and gentlespoons roll neighbor
 * across set with half sashay", "circle left 2 places gentlespoons roll
 * partner along set". Which way the pair stands is read from the dancers;
 * an "across" or "along" the source names is checked against it. The roll
 * across is the roll along, turned a quarter (core/quarter-turn.ts).
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys } from '../core/figure.ts';
import { quarterTurned } from '../core/quarter-turn.ts';
import { body, minorSets, related, roleOf } from '../core/state.ts';
import { rollAway, type RollAwayParams } from './roll-away.ts';

export interface RollParams extends RollAwayParams {
  /** The way the rolled dancer travels, as the source names it (checked). */
  axis?: 'along' | 'across';
}

const rollAcross = quarterTurned(rollAway);

export const roll: Figure<RollParams> = (state, params, beats) => {
  onlyKeys('roll', params, ['who', 'whom', 'axis']);
  const { axis, ...rest } = params;
  if (axis !== undefined) oneOf('roll', 'axis', axis, ['along', 'across'] as const);
  const role = rest.who === 'larks' ? 'lark' : 'robin';
  // Where the first pair stands: one above the other (along) or side by side across.
  const group = minorSets(state)[0] ?? [];
  const roller = group.find((id) => roleOf(state, id) === role);
  const rolled = roller === undefined ? undefined : related(state, rest.whom, roller);
  if (roller === undefined || rolled === undefined)
    throw new Error(`No ${rest.who} with a ${rest.whom} to roll here.`);
  const a = body(state, roller).position;
  const b = body(state, rolled).position;
  const stands = Math.abs(a.z - b.z) > Math.abs(a.x - b.x) ? 'along' : 'across';
  if (axis && axis !== stands)
    throw new Error(`The pair stands ${stands} the set, so the roll cannot go ${axis} it.`);
  return stands === 'along' ? rollAway(state, rest, beats) : rollAcross(state, rest, beats);
};
