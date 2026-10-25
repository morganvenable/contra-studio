/**
 * Chevron ("larks chevron into neighbors' place", "robins chevron into
 * neighbors place - robins pass right shoulder to trade places, then fall
 * back straight across the set while larks cast up or down into their
 * neighbors' place").
 *
 * Definition: neighbors trade places. The named role walks a V (a chevron):
 * in toward the middle of the minor set, where the two of them pass by the
 * right shoulder, then back out into the neighbor's place. Their neighbors
 * meanwhile walk (cast) straight into the named dancers' places, keeping a
 * little to the outside so the two paths clear. Everyone keeps facing as
 * they started. Source: ContraDB rows 2335 and 2279 (the row spells the
 * figure out).
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, length, mix, progress, scale, sub } from '../core/math.ts';
import { body, groupCenter, minorSets, related, roleOf, withChanges } from '../core/state.ts';

export interface ChevronParams {
  /** Who walks the V. */
  who: 'larks' | 'robins';
}

/** How far toward the middle of the minor set the V reaches, as a share. */
const DEPTH = 0.55;
/** The others keep this far outside their straight line. */
const OUTSIDE = 0.25;

export const chevron: Figure<ChevronParams> = (state, params, beats) => {
  onlyKeys('chevron', params, ['who']);
  const who = oneOf('chevron', 'who', params.who, ['larks', 'robins'] as const);
  const role = who === 'larks' ? 'lark' : 'robin';
  const moves = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    return g.map((id) => {
      const other = related(state, 'neighbor', id);
      if (other === undefined || !g.includes(other))
        throw new Error('A chevron trades places with neighbors in the minor set.');
      const from = body(state, id);
      const to = body(state, other).position;
      const mid = mix(from.position, to, 0.5);
      const inward = sub(middle, mid);
      const n = length(inward) || 1;
      const unit = { x: inward.x / n, z: inward.z / n };
      const named = roleOf(state, id) === role;
      // The V reaches in toward the middle; the others bow out.
      const bend = named ? scale(inward, DEPTH) : scale(unit, -OUTSIDE);
      return { id, from, to, bend };
    });
  });
  const motion = (beat: number) => {
    const q = progress(beat / beats);
    return {
      bodies: moves.map((m) => {
        // A V for the named dancers (straight legs), a gentle bow for the others.
        const tip = 1 - Math.abs(2 * q - 1);
        const position: Vec2 = add(mix(m.from.position, m.to, q), scale(m.bend, tip));
        return { id: m.id, position, yaw: m.from.yaw };
      }),
      contacts: [],
    };
  };
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
