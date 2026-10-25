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
 * - "couples-do-si-do" and "two-hand-turn": couples-do-si-do.ts and
 *   two-hand-turn.ts (contra) are tried first; where they cannot start, or
 *   the params are ones only the other takes, sets/couples-do-si-do.ts and
 *   ecd/two-hand-turn.ts (other formations).
 * - "forward-back" forward only ("walk forward"), with no one named:
 *   walk-forward.ts first (contra: everyone walks one place on, to the next
 *   neighbors or the next wave), then forward-back.ts (lines, rings).
 */
import type { Figure } from '../core/figure.ts';
import type { DanceState } from '../core/state.ts';
import { archDive as archDiveCouples } from './arch-dive.ts';
import { contraCorners as contraCornersDuple } from './contra-corners.ts';
import { contraCorners as contraCornersTriple } from './ecd/contra-corners.ts';
import { archDive as archDiveRolling } from './sets/arch-dive.ts';
import { couplesDoSiDo as couplesDoSiDoContra } from './couples-do-si-do.ts';
import { couplesDoSiDo as couplesDoSiDoSets } from './sets/couples-do-si-do.ts';
import { twoHandTurn as twoHandTurnContra } from './two-hand-turn.ts';
import { twoHandTurn as twoHandTurnEcd } from './ecd/two-hand-turn.ts';
import { forwardBack as forwardBackLines } from './forward-back.ts';
import { walkForward } from './walk-forward.ts';

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

/** The first figure that starts; the first one's reason if none does. */
function firstThatStarts(...figures: readonly Figure<never>[]): Figure<Record<string, unknown>> {
  return (state, params, beats) => {
    let failure: unknown;
    for (const figure of figures) {
      try {
        return figure(state, params as never, beats);
      } catch (error) {
        failure ??= error;
      }
    }
    throw failure;
  };
}

export const couplesDoSiDo = firstThatStarts(couplesDoSiDoContra, couplesDoSiDoSets);
export const twoHandTurn = firstThatStarts(twoHandTurnContra, twoHandTurnEcd);

const walkOn = firstThatStarts((state, _params, beats) => walkForward(state, {}, beats), forwardBackLines);

export const forwardBack: Figure<Record<string, unknown>> = (state, params, beats) =>
  params.back === false && Object.keys(params).length === 1 && !state.layout
    ? walkOn(state, params, beats)
    : forwardBackLines(state, params as never, beats);
