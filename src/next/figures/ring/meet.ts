/**
 * A pair figure with the one you meet: "next neighbors long swing - number
 * 7! that's your new partner" after the pull bys of a grand right and left,
 * "this one is the new neighbor, do si do".
 *
 * Definition: each lark dances the named pair figure (swing, balance &
 * swing, do-si-do, allemande, promenade ...) with the robin he faces now,
 * the one he just met (`pair: facing`), or the robin beside him on his
 * right (`pair: beside`: "neighbors scatter promenade", "neighbor is now
 * partner, promenade"), whatever their relationship was. The pair figure
 * runs exactly as it does for partners in the ring (layout.ts radial pair
 * frames); it changes no relationship itself (the progression mark, or the end of the
 * round, finds partners where they stand).
 * Source: ContraDB dances 2079 (Lucky Seven), 2005; Caller's Box glossary,
 * "Grand right and left" (meet the next and swing).
 */
import type { Figure, FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys } from '../../core/figure.ts';
import { inLayout } from '../../core/layout.ts';
import { distance, dot, forward, sub } from '../../core/math.ts';
import { besideOf } from '../../core/formation-ring.ts';
import { body, type DanceState, withChanges } from '../../core/state.ts';
import { allemande } from '../allemande.ts';
import { balance } from '../balance.ts';
import { doSiDo } from '../do-si-do.ts';
import { gyre } from '../gyre.ts';
import { ringPromenade } from '../ring-promenade.ts';
import { swing } from '../swing.ts';
import { ringOf } from './geometry.ts';

const PAIR_FIGURES = {
  swing: inLayout('swing', swing),
  balance: inLayout('balance', balance),
  'do-si-do': inLayout('do-si-do', doSiDo),
  allemande: inLayout('allemande', allemande),
  gyre: inLayout('gyre', gyre),
  // Promenade runs on the whole ring already.
  promenade: ringPromenade,
} as const;

export interface MeetParams {
  figure: keyof typeof PAIR_FIGURES;
  /** The pair figure's own parameters, without `who`. */
  params?: Record<string, unknown>;
  /** Who dances together: the robin each lark faces, or the one on his right. */
  pair?: 'facing' | 'beside';
}

export const meet: Figure<MeetParams> = (state, params, beats) => {
  onlyKeys('meet', params, ['figure', 'params', 'pair']);
  const name = oneOf('meet', 'figure', params.figure, Object.keys(PAIR_FIGURES) as (keyof typeof PAIR_FIGURES)[]);
  const how = oneOf('meet', 'pair', params.pair ?? 'facing', ['facing', 'beside'] as const);
  const ring = ringOf(state);
  const pair = how === 'facing' ? facingPairs(state) : besidePairs(state);
  const local = withChanges(state, {
    layout: { center: ring.center },
    relations: new Map(state.relations).set('partner', pair),
  });
  const result: FigureResult = PAIR_FIGURES[name](
    local,
    { ...(params.params ?? {}), who: 'partner' } as never,
    beats,
  );
  return {
    ...result,
    exit: withChanges(result.exit, { layout: state.layout, relations: state.relations }),
  };
};

function besidePairs(state: DanceState) {
  const pair = new Map<number, number>();
  for (const lark of state.groups.flat().filter((id) => state.dancers[id].role === 'lark')) {
    const robin = besideOf(state, lark, 'right', 'robin');
    if (robin === undefined) throw new Error(`Lark ${lark} has no robin beside him on his right.`);
    if (pair.has(robin)) throw new Error('Two larks have the same robin beside them.');
    pair.set(lark, robin).set(robin, lark);
  }
  return pair;
}

function facingPairs(state: DanceState) {
  const ids = state.groups.flat();
  const pair = new Map<number, number>();
  for (const lark of ids.filter((id) => state.dancers[id].role === 'lark')) {
    const l = body(state, lark);
    let best: number | undefined;
    let bestD = Infinity;
    for (const robin of ids.filter((id) => state.dancers[id].role === 'robin')) {
      const v = sub(body(state, robin).position, l.position);
      const d = distance(body(state, robin).position, l.position);
      // In front of him and facing him.
      if (d > 2.6 || dot(v, forward(l.yaw)) < 0.5 * d) continue;
      if (dot(forward(body(state, robin).yaw), forward(l.yaw)) > 0) continue;
      if (d < bestD) {
        best = robin;
        bestD = d;
      }
    }
    if (best === undefined) throw new Error(`Lark ${lark} is not facing a robin to dance with.`);
    if (pair.has(best)) throw new Error('Two larks face the same robin.');
    pair.set(lark, best).set(best, lark);
  }
  return pair;
}
