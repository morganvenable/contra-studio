/**
 * Meanwhile: two figures at once, on different dancers ("balance & centers
 * Rory O'More right while ends turn over right shoulder", "robins ricochet
 * in the center while the larks slide left").
 *
 * Both figures start from the same state and run over the same beats; each
 * dancer follows the one figure that moves them. A dancer both figures move
 * is an error: the row asks for something one body cannot do. Hands joined
 * by either figure are drawn; the exit holds none.
 */
import type { Figure, FigureCall, FigureContact, MovedBody } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import type { FigureRegistry } from '../core/fold.ts';
import { withChanges } from '../core/state.ts';

export interface MeanwhileParams {
  first: Pick<FigureCall, 'move' | 'params'>;
  second: Pick<FigureCall, 'move' | 'params'>;
}

/** The meanwhile figure, reading the other figures from `registry` when it runs. */
export function makeMeanwhile(registry: () => FigureRegistry): Figure<MeanwhileParams> {
  return (state, params, beats) => {
    onlyKeys('meanwhile', params, ['first', 'second']);
    const run = (part: MeanwhileParams['first']) => {
      const figure = registry()[part.move];
      if (!figure) throw new Error(`No figure "${part.move}".`);
      return figure(state, part.params, beats);
    };
    const a = run(params.first);
    const b = run(params.second);
    // Who each figure moves: anyone it places away from where they stand,
    // or turns, at some point.
    const moves = (r: typeof a) => {
      const ids = new Set<number>();
      for (const t of [0.25, 0.5, 0.75, 1].map((f) => f * beats))
        for (const body of r.motion(t).bodies) {
          const s = state.bodies.get(body.id)!;
          if (
            Math.hypot(body.position.x - s.position.x, body.position.z - s.position.z) > 1e-6 ||
            Math.abs(body.yaw - s.yaw) > 1e-6
          )
            ids.add(body.id);
        }
      return ids;
    };
    const movedB = moves(b);
    const movedA = moves(a);
    const both = [...movedA].filter((id) => movedB.has(id));
    if (both.length)
      throw new Error(`Both figures of the row move dancer ${both[0]}; they can't happen at once.`);
    const motion = (beat: number) => {
      const fa = a.motion(beat);
      const fb = b.motion(beat);
      const bodies = new Map<number, MovedBody>();
      for (const body of fa.bodies) bodies.set(body.id, body);
      for (const body of fb.bodies) if (movedB.has(body.id)) bodies.set(body.id, body);
      const contacts: FigureContact[] = [...fa.contacts, ...fb.contacts];
      return { bodies: [...bodies.values()], contacts };
    };
    return {
      kind: a.kind,
      motion,
      exit: withChanges(settle(state, motion, beats), { hands: [] }),
      ...(a.styled || b.styled ? { styled: a.styled ?? b.styled } : {}),
    };
  };
}
