/**
 * Moves two figure files implement for different settings, under one name.
 *
 * - "arch-dive": arch-dive.ts takes the arching and diving couples
 *   (`{ arch, dive }`, couples facing in a contra or a ring);
 *   sets/arch-dive.ts takes the arching couple and whether the couples back
 *   up through each other (`{ arch, backing }`, rolling arches). The params
 *   say which one a call means.
 * - "contra-corners": in a group of three or more couples (triple minor,
 *   a triplet), ecd/contra-corners.ts: the actives turn
 *   partner, first corner, partner, second corner, partner, back to place.
 *   Otherwise (duple minor contra), contra-corners.ts: the corners reach into
 *   the next minor sets and the actives end in the middle, back to back.
 */
import type { Figure } from '../core/figure.ts';
import type { DanceState } from '../core/state.ts';
import { archDive as archDiveCouples } from './arch-dive.ts';
import { contraCorners as contraCornersDuple } from './contra-corners.ts';
import { contraCorners as contraCornersTriple } from './ecd/contra-corners.ts';
import { archDive as archDiveRolling } from './sets/arch-dive.ts';

export const archDive: Figure<Record<string, unknown>> = (state, params, beats) =>
  'dive' in params
    ? archDiveCouples(state, params as never, beats)
    : archDiveRolling(state, params as never, beats);

/** True when the named couple's group holds three or more couples (triple minor, a triplet). */
function tripleGroup(state: DanceState, who: unknown): boolean {
  if (typeof who !== 'string') return false;
  const ids = state.positions.get(who);
  if (!ids?.length) return false;
  const group = state.groups.find((g) => ids.some((id) => g.includes(id)));
  return (group?.length ?? 0) >= 6;
}

export const contraCorners: Figure<Record<string, unknown>> = (state, params, beats) =>
  tripleGroup(state, params.who)
    ? contraCornersTriple(state, params as never, beats)
    : contraCornersDuple(state, params as never, beats);
