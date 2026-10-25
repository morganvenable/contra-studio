/**
 * A swing that spreads through the square ("monkey in the middle swing one
 * person at random", "those two swing two more", "those four swing four
 * more, sending a new monkey to the middle").
 *
 * Definition: one pair swings, then two pairs, then all four, everyone
 * swinging someone of the other role; whoever is left over (with an odd
 * set) is the next monkey.
 * Source: ContraDB 3062 (Monkey in the Middle, arr. Mattie Rynkiewicz),
 * 3180.
 * Reading: "at random" is drawn the same way every time: the monkey is the
 * lark standing nearest the band, every lark swings his corner (the robin
 * on his left round the ring), the monkey's pair first, then the pair
 * across the square from it too, then all four. Everyone ends with their
 * corner as a new partner, so the next monkey is the lark now nearest the
 * band.
 */
import type { FigureResult } from '../../core/figure.ts';
import { RING_CENTER } from '../../core/formation-ring.ts';
import { distance, mean } from '../../core/math.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';
import { FIGURES } from '../index.ts';

export interface CascadeSwingParams {
  /** How many pairs swing: 1, 2 or 4. */
  pairs: 1 | 2 | 4;
}

export function cascadeSwing(
  state: DanceState,
  params: CascadeSwingParams,
  beats: number,
): FigureResult {
  if (![1, 2, 4].includes(params.pairs)) throw new Error('One, two or four pairs swing.');
  if (Object.keys(params).some((k) => k !== 'pairs'))
    throw new Error('The cascade swing takes only pairs.');
  const corner = state.relations.get('neighbor');
  if (!corner) throw new Error('Nobody has a corner here.');
  const larks = minorSets(state)
    .flat()
    .filter((id) => state.dancers[id].role === 'lark');
  if (larks.length !== 4) throw new Error('The monkey swing is for a square of four couples.');
  // The monkey: the lark nearest the band (the top of the hall, lowest z).
  const monkey = larks.reduce((a, b) =>
    body(state, a).position.z <= body(state, b).position.z ? a : b,
  );
  const pairCenter = (lark: number) =>
    mean([body(state, lark).position, body(state, corner.get(lark)!).position]);
  // Then the pair across the square, then everyone.
  const across = larks
    .filter((l) => l !== monkey)
    .reduce((a, b) =>
      distance(pairCenter(a), pairCenter(monkey)) >= distance(pairCenter(b), pairCenter(monkey))
        ? a
        : b,
    );
  const chosen = params.pairs === 1 ? [monkey] : params.pairs === 2 ? [monkey, across] : larks;
  const ids = chosen.flatMap((l) => [l, corner.get(l)!]);
  const local = withChanges(state, {
    groups: [ids],
    relations: new Map(state.relations).set('partner', corner),
    layout: state.layout ?? { center: RING_CENTER },
  });
  const result = FIGURES.swing(local, { who: 'partner' }, beats);
  return {
    ...result,
    exit: withChanges(result.exit, {
      groups: state.groups,
      relations: state.relations,
      layout: state.layout,
    }),
  };
}
