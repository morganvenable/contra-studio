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
 * - sicilian: a set with no ends (layout.period). Each 1s couple meets the
 *   2s couple one place further along +z, counted round the circle; the 1s
 *   and 2s keep their numbers (and directions) forever.
 * - lines: four face four. Lines of four meet the next line in their own
 *   column; a line with no one to meet waits at its end, turns and changes
 *   number (the duple minor rule, column by column).
 */
import type { Vec2 } from '../../types.ts';
import { mean } from './math.ts';
import { ordinal } from './progression.ts';
import { body, type DanceState, withChanges } from './state.ts';
import { SET } from './config.ts';
import {
  dupleMinorRebind,
  DUPLE_MINOR_PROGRESSION,
  DUPLE_MINOR_PROPER_PROGRESSION,
  MINOR_SET_COUPLES_PROGRESSION,
  MINOR_SET_PROGRESSION,
  type Progression,
} from './progression.ts';

export const MINOR_SET_DOUBLE: Progression = {
  kind: 'minor-set-double',
  crossAtGhostSet: true,
  rebind: MINOR_SET_PROGRESSION.rebind,
};

export const MINOR_SET_COUPLES_DOUBLE: Progression = {
  kind: 'minor-set-couples-double',
  crossAtGhostSet: true,
  rebind: MINOR_SET_COUPLES_PROGRESSION.rebind,
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
  atRoundEnd: true,
  rebind: (state) =>
    withChanges(state, { positions: placeLabels(state), epoch: state.epoch + 1 }),
};

export const LINES_PROGRESSION: Progression = {
  kind: 'lines',
  rebind(state) {
    const next = dupleMinorRebind(state, true, true);
    // In lines of four your opposite is the dancer you face: your neighbor.
    const relations = new Map(next.relations).set('opposite', next.relations.get('neighbor')!);
    return withChanges(next, { relations });
  },
};

/** Distance from a to b along +z, round a circle of `period`, in [0, period). */
export const ahead = (a: number, b: number, period: number) =>
  (((b - a) % period) + period) % period;

export const SICILIAN_PROGRESSION: Progression = {
  kind: 'sicilian',
  rebind(state) {
    const period = state.layout?.period;
    if (!period) throw new Error('A Sicilian circle needs a set with no ends.');
    const ones = new Set(state.positions.get('1s') ?? []);
    const couples = couplesByPlace(state);
    const neighbor = new Map<number, number>();
    const groups: number[][] = [];
    const met = new Set<number>();
    for (const c of couples.filter((k) => ones.has(k.lark))) {
      const found = couples.filter(
        (k) =>
          !ones.has(k.lark) &&
          Math.abs(ahead(c.center.z, k.center.z, period) - SET.slot) < 0.3 &&
          Math.abs(k.center.x - c.center.x) < SET.halfWidth,
      );
      if (found.length !== 1)
        throw new Error(`Couple ${c.lark / 2 + 1} does not face one couple of 2s ahead.`);
      const k = found[0];
      if (met.has(k.lark)) throw new Error(`Couple ${k.lark / 2 + 1} is met by two couples.`);
      met.add(k.lark);
      neighbor.set(c.lark, k.robin).set(k.robin, c.lark).set(c.robin, k.lark).set(k.lark, c.robin);
      groups.push([c.lark, c.robin, k.lark, k.robin]);
    }
    const relations = new Map(state.relations).set('neighbor', neighbor);
    return withChanges(state, { relations, groups, epoch: state.epoch + 1 });
  },
};
