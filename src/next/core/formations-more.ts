/**
 * Formations beyond contra duple minor and Becket, as data. Each one builds
 * the starting DanceState and says what the corpus check expects of it
 * (models.ts). Figures never ask which formation they are in.
 *
 * Small whole sets (ECD style), all proper (larks on the -x line, facing
 * across), the 1st couple at the top (lowest z, next to the band):
 * - Triplet: three couples dancing as one set; the 1s work their way to
 *   the bottom and the others move up one place a time through.
 * - Longways for four to six couples: the same, with more couples.
 *
 * Only types come from formation.ts (its registry spreads MORE_FORMATIONS).
 */
import type { Dancer } from '../../types.ts';
import { SET } from './config.ts';
import { createDancers } from './dancers.ts';
import type { Formation } from './formation.ts';
import { coupleZ, type CheckSpec } from './models.ts';
import { placeLabels } from './progression-more.ts';
import type { Body, DanceState } from './state.ts';

export const partnerMap = (dancers: readonly Dancer[]) =>
  new Map(dancers.map((d) => [d.id, d.id ^ 1]));

function count(f: Pick<Formation, 'name' | 'couples'>, couples: number) {
  if (!Number.isInteger(couples) || couples < f.couples.min || couples > f.couples.max) {
    const range =
      f.couples.min === f.couples.max ? `${f.couples.min}` : `${f.couples.min}-${f.couples.max}`;
    throw new Error(`${f.name} needs ${range} couples.`);
  }
}

/**
 * Model for a whole set that sends its top couple to the bottom each time
 * through: after r rounds the couple that started in place p is in place
 * (p - r) mod n, on its own side.
 */
export function topToBottomModel(couples: number, rounds: number): number[][] {
  const z = (p: number) => (p - (couples - 1) / 2) * SET.slot;
  return Array.from({ length: rounds }, (_, r) =>
    Array.from({ length: couples }, (_, c) => z((((c - r - 1) % couples) + couples) % couples)),
  );
}

const placesSpec = (counts: readonly number[]): CheckSpec => ({
  counts,
  meeting: 'none',
  rounds: (couples) => couples + 1,
  model: (c, r) => coupleZ(topToBottomModel(c, r)),
});

/** Proper longways whole set, couples labeled by place ("1s", "2s" ...). */
function properWholeSet(name: string, min: number, max: number, counts: number[]): Formation {
  return {
    name,
    shape: min === max ? 'small-set' : 'longways',
    grouping: 'whole-set',
    couples: { min, max },
    check: placesSpec(counts),
    start(couples) {
      count(this, couples);
      const dancers = createDancers(couples);
      const bodies = new Map<number, Body>();
      for (let c = 0; c < couples; c++) {
        const z = (c - (couples - 1) / 2) * SET.slot;
        bodies.set(c * 2, { position: { x: -SET.halfWidth, z }, yaw: Math.PI / 2 });
        bodies.set(c * 2 + 1, { position: { x: SET.halfWidth, z }, yaw: -Math.PI / 2 });
      }
      const state: DanceState = {
        dancers,
        bodies,
        hands: [],
        relations: new Map([['partner', partnerMap(dancers)]]),
        groups: [dancers.map((d) => d.id)],
        positions: new Map(),
        epoch: 0,
        waiting: [],
      };
      return Object.freeze({ ...state, positions: placeLabels(state) });
    },
  };
}

export const TRIPLET = properWholeSet('Triplet', 3, 3, [3]);
export const LONGWAYS_SET = properWholeSet('Longways set', 3, 8, [4, 5, 6]);

export const MORE_FORMATIONS: Readonly<Record<string, Formation>> = {
  triplet: TRIPLET,
  'longways-set': LONGWAYS_SET,
};
