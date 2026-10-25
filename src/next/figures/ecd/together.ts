/**
 * Two figures at once, by different dancers ("ones & twos allemande left
 * neighbor once, threes allemande left partner once").
 *
 * Definition: each part is an ordinary figure call (move and params, with
 * `among` naming who dances it); they start together and take the row's
 * beats. No dancer may be in two parts.
 * Neighbors in a whole set: a whole set has no neighbor relationship, so a
 * part danced by two couples ("ones & twos ... neighbor") pairs each dancer
 * with the dancer of the other role in the other couple.
 * Source: ContraDB rows "ones & twos allemande left neighbor once, threes
 * allemande left partner once" (Impromptu Triplet #2).
 * Reading: a triplet neighbor is the dancer of the other role in the
 * adjacent couple the row names.
 */
import type { Figure, FigureContact, FigureResult, MovedBody } from '../../core/figure.ts';
import { onlyKeys } from '../../core/figure.ts';
import { withChanges, type DanceState, type Hold } from '../../core/state.ts';
import { FIGURES } from '../index.ts';

export interface Part {
  move: string;
  params: Record<string, unknown>;
}

export interface TogetherParams {
  parts: Part[];
}

/** Neighbors between the two couples a part names, when the set has none. */
export function withCoupleNeighbors(state: DanceState, among: readonly string[]): DanceState {
  if (state.relations.has('neighbor') || among.length !== 2) return state;
  const couples = among.map((label) => state.positions.get(label));
  if (couples.some((c) => !c || c.length !== 2)) return state;
  const neighbor = new Map<number, number>();
  const [a, b] = couples as number[][];
  for (const x of a) {
    const y = b.find((id) => state.dancers[id].role !== state.dancers[x].role);
    if (y === undefined) return state;
    neighbor.set(x, y).set(y, x);
  }
  return withChanges(state, { relations: new Map(state.relations).set('neighbor', neighbor) });
}

export const together: Figure<TogetherParams> = (state, params, beats) => {
  onlyKeys('together', params, ['parts']);
  if (!Array.isArray(params.parts) || params.parts.length < 2)
    throw new Error('together needs two or more parts.');
  const results: FigureResult[] = params.parts.map((part, i) => {
    const figure = FIGURES[part.move];
    if (!figure) throw new Error(`together: no figure named "${part.move}".`);
    const among = part.params.among;
    const local =
      part.params.who === 'neighbor' && Array.isArray(among)
        ? withCoupleNeighbors(state, among as string[])
        : state;
    try {
      return figure(local, part.params, beats);
    } catch (error) {
      throw new Error(`part ${i + 1} (${part.move}): ${error instanceof Error ? error.message : error}`);
    }
  });
  const owner = new Map<number, number>();
  results.forEach((r, i) => {
    for (const b of r.motion(0).bodies) {
      if (owner.has(b.id)) throw new Error(`together: dancer ${b.id} is in two parts.`);
      owner.set(b.id, i);
    }
  });
  const motion = (beat: number) => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const r of results) {
      const f = r.motion(beat);
      bodies.push(...f.bodies);
      contacts.push(...f.contacts);
    }
    return { bodies, contacts };
  };
  const moved = new Map(state.bodies);
  const hands: Hold[] = [];
  results.forEach((r, i) => {
    for (const [id, i2] of owner) if (i2 === i) moved.set(id, r.exit.bodies.get(id)!);
    hands.push(...r.exit.hands);
  });
  return {
    kind: results[0].kind,
    motion,
    exit: withChanges(state, { bodies: moved, hands }),
  };
};
