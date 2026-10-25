/**
 * A pair figure with the dancer standing beside you in a ring or square,
 * by place rather than by face ("next neighbors swing (next corner)" after
 * a petronella, "swing the one beside you").
 *
 * Definition: every lark dances the figure with the robin standing next
 * to him on the side named, whoever she is: on his left is his corner
 * place, on his right his partner place. Everyone faces the center on
 * the places of the ring.
 * Source: Caller's Box glossary, "Corner" (the dancer beside you on the
 * other side from your partner); ContraDB 442 Petronella Swing Break
 * ("a corner is a place rather than a face").
 * Reading: the pair runs the ordinary figure (swing, allemande, do si do,
 * balance ...) as if they were partners, in the ring's pair frame, so it
 * ends with the two side by side on their two places facing in.
 */
import type { FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys } from '../../core/figure.ts';
import { besideOf, RING_CENTER } from '../../core/formation-ring.ts';
import { minorSets, withChanges, type DanceState } from '../../core/state.ts';
import { FIGURES } from '../index.ts';

export interface BesideParams {
  /** The pair figure danced. */
  move: string;
  /** Which side of the lark the robin stands on. */
  side: 'left' | 'right';
  params?: Record<string, unknown>;
}

const PAIR_MOVES = new Set(['swing', 'allemande', 'do-si-do', 'balance', 'gyre', 'pass-by']);

/** A function declaration, so the registry can load it while figures/index.ts is loading. */
export function beside(state: DanceState, params: BesideParams, beats: number): FigureResult {
  onlyKeys('with the one beside you', params, ['move', 'side', 'params']);
  const side = oneOf('with the one beside you', 'side', params.side, ['left', 'right'] as const);
  if (!PAIR_MOVES.has(params.move))
    throw new Error(`"${params.move}" is not a figure for two.`);
  const ids = minorSets(state).flat();
  const pairs = new Map<number, number>();
  for (const id of ids) {
    if (state.dancers[id].role !== 'lark') continue;
    const robin = besideOf(state, id, side, 'robin');
    if (robin === undefined || !ids.includes(robin))
      throw new Error(`Lark ${state.dancers[id].couple + 1} has no robin on his ${side}.`);
    if (pairs.has(robin)) throw new Error('Two larks have the same robin beside them.');
    pairs.set(id, robin).set(robin, id);
  }
  if (!pairs.size) throw new Error('Nobody here dances this figure.');
  const relations = new Map(state.relations).set('partner', pairs);
  // Each pair dances in the ring's pair frame (core/layout.ts).
  const local = withChanges(state, {
    relations,
    groups: [ids.filter((id) => pairs.has(id))],
    layout: { center: RING_CENTER },
  });
  const figure = FIGURES[params.move];
  const result = figure(local, { ...(params.params ?? {}), who: 'partner' }, beats);
  return {
    ...result,
    exit: withChanges(result.exit, {
      relations: state.relations,
      groups: state.groups,
      layout: state.layout,
    }),
  };
}
