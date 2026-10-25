/**
 * A figure with corners ("first corners allemande left 1¼", "corners pull
 * by right").
 *
 * Definition: the named figure for two, danced with one's corner. In four
 * face four, from lines or a squared set, corners are the neighbors round
 * the ring of eight on the other side from one's partner (the middle two of
 * a line; an end dancer and the dancer facing them; across each corner of
 * the square). Anywhere else the figure is danced with the neighbor, as a
 * square names its corners.
 * Source: ContraDB rows "first corners allemande left 1¼" (Dance All Night,
 * Rick Mohr), "corners allemande left 1.25" (Dance All Night, Rich Mohr),
 * "first corners pull by right" (Mind the Shark).
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys } from '../../core/figure.ts';
import { minorSets, withChanges } from '../../core/state.ts';
import { allemande } from '../allemande.ts';
import { balance } from '../balance.ts';
import { doSiDo } from '../do-si-do.ts';
import { passBy } from '../pass-by.ts';
import { cornerPairs, fourFaceFour } from './square.ts';

const MOVES = { allemande, balance, 'do-si-do': doSiDo, 'pass-by': passBy } as const;
type Move = keyof typeof MOVES;

export interface CornersParams {
  move: Move;
  /** The figure's own parameters, with who: 'neighbor'. */
  params: Record<string, unknown>;
}

export const corners: Figure<CornersParams> = (state, params, beats) => {
  onlyKeys('corners', params, ['move', 'params']);
  const move = oneOf('corners', 'move', params.move, Object.keys(MOVES) as Move[]);
  const figure = MOVES[move] as unknown as Figure<Record<string, unknown>>;
  const groups = minorSets(state);
  if (!groups.some((g) => fourFaceFour(state, g))) return figure(state, params.params, beats);
  if (!groups.every((g) => fourFaceFour(state, g)))
    throw new Error('Corners dance round a ring of eight.');
  const pairs = groups.flatMap((g) => cornerPairs(state, g));
  const corner = new Map<number, number>();
  for (const [a, b] of pairs) corner.set(a, b).set(b, a);
  const local = withChanges(state, {
    groups: pairs,
    relations: new Map(state.relations).set('partner', corner),
  });
  const result = figure(local, { ...params.params, who: 'partner' }, beats);
  return { ...result, exit: withChanges(result.exit, { groups: state.groups, relations: state.relations }) };
};
