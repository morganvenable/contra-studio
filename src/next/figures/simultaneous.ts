/**
 * Simultaneous: two (or more) groups of dancers each dance their own run
 * of figures at the same time ("SIMULTANEOUS: ones down the outsides and
 * turn as a couple, ones up the outsides and bend into a ring; WHILE: twos
 * meltdown swing").
 *
 * Definition: each part is a list of figure calls danced one after the
 * other from where the dancers stand; the parts start together and take
 * the same beats. No dancer may be moved by two parts. Hands are drawn
 * where either part holds them; the exit holds none.
 * Source: ContraDB rows written as a "SIMULTANEOUS:" or "FOUR larks:" block
 * with a "WHILE:" half (Bale the Hay II, Shades of Impropriety, Rory
 * O'Star, Coray's Silver Jubilee).
 */
import type { Figure, FigureCall, FigureContact, FigureResult, MovedBody } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import type { FigureRegistry } from '../core/fold.ts';
import { withChanges, type DanceState } from '../core/state.ts';

export interface SimultaneousParams {
  parts: { calls: Pick<FigureCall, 'move' | 'params' | 'beats'>[] }[];
}

interface Run {
  readonly starts: readonly number[];
  readonly results: readonly FigureResult[];
  readonly beats: readonly number[];
}

/** The simultaneous figure, reading the other figures from `registry` when it runs. */
export function makeSimultaneous(registry: () => FigureRegistry): Figure<SimultaneousParams> {
  return (state, params, beats) => {
    onlyKeys('simultaneous', params, ['parts']);
    if (!Array.isArray(params.parts) || params.parts.length < 2)
      throw new Error('A simultaneous block needs two or more parts.');
    const runs: Run[] = params.parts.map((part, i) => {
      let at: DanceState = state;
      let t = 0;
      const starts: number[] = [];
      const results: FigureResult[] = [];
      for (const c of part.calls) {
        const figure = registry()[c.move];
        if (!figure) throw new Error(`No figure "${c.move}".`);
        let r: FigureResult;
        try {
          r = figure(at, c.params, c.beats);
        } catch (error) {
          throw new Error(`part ${i + 1} (${c.move}): ${error instanceof Error ? error.message : error}`);
        }
        starts.push(t);
        results.push(r);
        t += c.beats;
        at = r.exit;
      }
      if (Math.abs(t - beats) > 1e-6) throw new Error(`part ${i + 1} takes ${t} beats, not ${beats}.`);
      return { starts, results, beats: part.calls.map((c) => c.beats) };
    });
    const frameOf = (run: Run, beat: number) => {
      const k = Math.max(0, run.starts.findLastIndex((s) => s <= beat + 1e-9));
      return run.results[k].motion(Math.min(run.beats[k], beat - run.starts[k]));
    };
    // Who each part moves: anyone it places or turns away from where they stand.
    const moves = (run: Run) => {
      const ids = new Set<number>();
      for (let s = 0; s <= 8; s++)
        for (const b of frameOf(run, (s / 8) * beats).bodies) {
          const from = state.bodies.get(b.id)!;
          if (
            Math.hypot(b.position.x - from.position.x, b.position.z - from.position.z) > 1e-6 ||
            Math.abs(b.yaw - from.yaw) > 1e-6
          )
            ids.add(b.id);
        }
      return ids;
    };
    const moved = runs.map(moves);
    const owner = new Map<number, number>();
    moved.forEach((ids, i) => {
      for (const id of ids) {
        if (owner.has(id)) throw new Error(`Two parts move dancer ${id}; they can't happen at once.`);
        owner.set(id, i);
      }
    });
    const motion = (beat: number) => {
      const bodies = new Map<number, MovedBody>();
      const contacts: FigureContact[] = [];
      runs.forEach((run, i) => {
        const f = frameOf(run, beat);
        for (const b of f.bodies) if (owner.get(b.id) === i) bodies.set(b.id, b);
        contacts.push(...f.contacts);
      });
      return { bodies: [...bodies.values()], contacts };
    };
    return {
      kind: runs[0].results[0].kind,
      motion,
      exit: withChanges(settle(state, motion, beats), { hands: [] }),
    };
  };
}
