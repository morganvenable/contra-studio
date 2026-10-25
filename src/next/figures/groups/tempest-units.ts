/**
 * Units of a Tempest set as dancers stand (lines of four, pairs of side
 * couples) and a couple's wheel, shared by the Tempest figures. Not a figure.
 */
import type { Vec2 } from '../../../types.ts';
import { TEMPEST } from '../../core/formation-groups.ts';
import { add, length, mix, polar, progress, rotate, scale, sub } from '../../core/math.ts';
import { body, type DanceState } from '../../core/state.ts';
import { everyone, wrap } from './common.ts';

export interface Line {
  readonly z: number;
  /** Couples by side: [west couple ids], [east couple ids]. */
  readonly west: readonly number[];
  readonly east: readonly number[];
}

export interface SidePair {
  readonly z: number;
  readonly west: readonly number[];
  readonly east: readonly number[];
}

/** Lines of four (four dancers level across the middle) and side-couple pairs. */
export function tempestUnits(state: DanceState): { lines: Line[]; sides: SidePair[] } {
  const ids = everyone(state);
  const p = (id: number) => body(state, id).position;
  const middle = ids.filter((id) => Math.abs(p(id).x) <= 1.8).sort((a, b) => p(a).z - p(b).z);
  const lines: Line[] = [];
  for (let i = 0; i < middle.length; ) {
    const row = middle.filter((id) => Math.abs(p(id).z - p(middle[i]).z) < 0.3);
    if (row.length === 4 && row.every((id) => Math.abs(p(id).x) >= 0.3)) {
      lines.push({
        z: p(row[0]).z,
        west: row.filter((id) => p(id).x < 0),
        east: row.filter((id) => p(id).x > 0),
      });
    }
    i += Math.max(1, row.length);
  }
  const couplesOn = (side: number) => {
    const out = ids
      .filter((id) => Math.abs(p(id).x) > 1.8 && Math.sign(p(id).x) === side)
      .sort((a, b) => p(a).z - p(b).z);
    const pairs: { z: number; ids: number[] }[] = [];
    for (let i = 0; i + 1 < out.length; i += 2)
      pairs.push({ z: (p(out[i]).z + p(out[i + 1]).z) / 2, ids: [out[i], out[i + 1]] });
    return pairs;
  };
  const west = couplesOn(-1);
  const east = couplesOn(1);
  const sides: SidePair[] = [];
  for (const w of west) {
    const e = east.find((k) => Math.abs(k.z - w.z) < 0.3);
    if (e) sides.push({ z: w.z, west: w.ids, east: e.ids });
  }
  return { lines, sides };
}

/** Where a line's couple stands facing down: lark on the left (+x). */
export function lineSpots(state: DanceState, couple: readonly number[], side: -1 | 1, z: number) {
  const lark = couple.find((id) => state.dancers[id].role === 'lark')!;
  const robin = couple.find((id) => id !== lark)!;
  const xs = side < 0 ? [-TEMPEST.lineIn, -TEMPEST.lineOut] : [TEMPEST.lineOut, TEMPEST.lineIn];
  return new Map<number, Vec2>([
    [lark, { x: xs[0], z }],
    [robin, { x: xs[1], z }],
  ]);
}

/**
 * Where a side couple stands on its side line facing in, the robin on the
 * lark's left (the 2s' places; see formation-groups.ts).
 */
export function sideSpots(state: DanceState, couple: readonly number[], side: -1 | 1, z: number) {
  const lark = couple.find((id) => state.dancers[id].role === 'lark')!;
  const robin = couple.find((id) => id !== lark)!;
  const h = TEMPEST.level / 2;
  // Facing in from the west the left is -z; the lark stands on the robin's right.
  const lz = side < 0 ? z + h : z - h;
  const rz = side < 0 ? z - h : z + h;
  return new Map<number, Vec2>([
    [lark, { x: side * TEMPEST.side, z: lz }],
    [robin, { x: side * TEMPEST.side, z: rz }],
  ]);
}

/**
 * A couple turning together (a wheel) from where it stands to new places:
 * its middle travels straight while the pair turns about it, spreading or
 * closing to the new width. Returns the position of each partner at q in
 * [0, 1] and the turn angle (rotate() convention).
 */
export function wheel(state: DanceState, pair: readonly number[], to: ReadonlyMap<number, Vec2>, turn?: number) {
  const [a, b] = pair;
  const a0 = body(state, a).position;
  const b0 = body(state, b).position;
  const c0 = mix(a0, b0, 0.5);
  const c1 = mix(to.get(a)!, to.get(b)!, 0.5);
  const h0 = sub(a0, c0);
  const h1 = sub(to.get(a)!, c1);
  const angle = turn ?? wrap(polar(h1) - polar(h0));
  const u0 = scale(h0, 1 / length(h0));
  const at = (q: number) => {
    const c = mix(c0, c1, progress(q));
    const r = length(h0) + (length(h1) - length(h0)) * progress(q);
    const h = scale(rotate(u0, angle * progress(q)), r);
    return new Map<number, Vec2>([
      [a, add(c, h)],
      [b, sub(c, h)],
    ]);
  };
  return { at, angle };
}
