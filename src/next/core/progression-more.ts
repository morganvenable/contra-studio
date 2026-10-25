/**
 * Progressions beyond the duple minor and Becket ones in progression.ts.
 *
 * - Double progressions ("-double"): the figures carry each couple two
 *   places a round. Rebinding is the same as for a single progression
 *   (new neighbors are found where the couples stand); only the corpus
 *   check's model (models.ts) differs.
 * - places: a whole set (a triplet, a longways set for four to six couples)
 *   renames couples by where they now stand, top (lowest z) first: "1s",
 *   "2s", "3s" ... and "1st couple", "2nd couple" ... The figures carry the
 *   bodies (the 1s cast to the bottom, the others move up); relationships
 *   do not change.
 */
import type { Vec2 } from '../../types.ts';
import { mean } from './math.ts';
import { ordinal } from './progression.ts';
import { body, type DanceState, withChanges } from './state.ts';
import {
  DUPLE_MINOR_PROGRESSION,
  DUPLE_MINOR_PROPER_PROGRESSION,
  MINOR_SET_PROGRESSION,
  type Progression,
} from './progression.ts';

export const MINOR_SET_DOUBLE: Progression = {
  kind: 'minor-set-double',
  rebind: MINOR_SET_PROGRESSION.rebind,
};

export const DUPLE_MINOR_DOUBLE: Progression = {
  kind: 'duple-minor-double',
  rebind: DUPLE_MINOR_PROGRESSION.rebind,
};

export const DUPLE_MINOR_PROPER_DOUBLE: Progression = {
  kind: 'duple-minor-proper-double',
  rebind: DUPLE_MINOR_PROPER_PROGRESSION.rebind,
};

/** Couples (lark, robin by original couple) ordered top to bottom by where they stand. */
export function couplesByPlace(state: DanceState): { lark: number; robin: number; center: Vec2 }[] {
  const out: { lark: number; robin: number; center: Vec2 }[] = [];
  for (const d of state.dancers) {
    if (d.role !== 'lark') continue;
    const robin = state.relations.get('partner')?.get(d.id) ?? d.id + 1;
    out.push({
      lark: d.id,
      robin,
      center: mean([body(state, d.id).position, body(state, robin).position]),
    });
  }
  return out.sort((a, b) => a.center.z - b.center.z || a.center.x - b.center.x);
}

/** Label couples by place: "1s", "1st couple" ... (top first). */
export function placeLabels(state: DanceState): Map<string, readonly number[]> {
  const positions = new Map(state.positions);
  couplesByPlace(state).forEach((c, i) => {
    positions.set(`${i + 1}s`, [c.lark, c.robin]);
    positions.set(`${ordinal(i + 1)} couple`, [c.lark, c.robin]);
  });
  return positions;
}

export const PLACES_PROGRESSION: Progression = {
  kind: 'places',
  rebind: (state) =>
    withChanges(state, { positions: placeLabels(state), epoch: state.epoch + 1 }),
};
