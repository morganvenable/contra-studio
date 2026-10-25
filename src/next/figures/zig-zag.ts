/**
 * Zig zag ("zig left, zag right").
 *
 * Definition: the two pairs of a minor set (partners, unless the row names
 * neighbors) trade places, each pair traveling side by side as a unit: first
 * a step diagonally to the named side ("zig left"), then back the other way
 * ("zag right") into the other pair's place, so the pairs pass each other
 * without touching. Everyone keeps facing the way they faced. It is the
 * simple stand-in for a half poussette as a progression.
 * Source: ContraDB rows "circle left 3 places, zig left zag right" (the
 * Becket progression), "circle right 3 places, zig right zag left" (Cary
 * Ravitz, "weave the line"), and the note on 1318 that a zig zag can replace
 * the half poussette.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, length, mean, progress, scale, sub } from '../core/math.ts';
import { body, minorSets, pairsIn, withChanges } from '../core/state.ts';

export interface ZigZagParams {
  /** Which way the pairs step first. */
  first: 'left' | 'right';
  /** Who travels together. */
  pair?: 'partner' | 'neighbor';
}

/** How far to the side the pairs step as they pass. */
const ZIG = 0.55;

export const zigZag: Figure<ZigZagParams> = (state, params, beats) => {
  onlyKeys('zig zag', params, ['first', 'pair']);
  const first = oneOf('zig zag', 'first', params.first, ['left', 'right'] as const);
  const pair = oneOf('zig zag', 'pair', params.pair ?? 'partner', ['partner', 'neighbor'] as const);
  const moves = minorSets(state).flatMap((g) => {
    const pairs = pairsIn(state, g, pair);
    if (pairs.length !== 2) throw new Error('A zig zag needs two pairs.');
    const centers = pairs.map((p) => mean(p.map((id) => body(state, id).position)));
    const travel = sub(centers[1], centers[0]);
    if (length(travel) < 0.8) throw new Error('The two pairs of a zig zag must stand apart.');
    return pairs.flatMap((p, i) => {
      const d = i === 0 ? travel : scale(travel, -1);
      // Left of the way the pair travels.
      const left = { x: d.z / length(d), z: -d.x / length(d) };
      const side = scale(left, first === 'left' ? ZIG : -ZIG);
      return p.map((id) => ({ id, from: body(state, id), d, side }));
    });
  });
  const motion = (beat: number) => {
    const q = progress(beat / beats);
    return {
      bodies: moves.map((m) => ({
        id: m.id,
        position: add(add(m.from.position, scale(m.d, q)), scale(m.side, Math.sin(Math.PI * q))),
        yaw: m.from.yaw,
      })),
      contacts: [],
    };
  };
  return {
    kind: 'becket-slice',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
