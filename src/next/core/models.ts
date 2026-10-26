/**
 * What the corpus check expects of each formation, as data: the couple
 * counts to compile at, where couples (or dancers) stand after each round,
 * and who must meet whom over enough rounds. verify.ts runs these; it never
 * asks for a formation by name itself.
 *
 * The models are independent of the figures: they are the textbook rule for
 * each progression (couples trade places in minor sets, Becket couples shift
 * one place to their left, the 1st couple of a triplet goes to the bottom,
 * a mixer hands each robin on to the next lark ...).
 */
import type { Vec2 } from '../../types.ts';
import { SET } from './config.ts';

/** Expected couple centers along the set (z), one array per round. */
export interface CoupleZModel {
  readonly kind: 'couple-z';
  readonly rounds: readonly (readonly number[])[];
}

/** Expected dancer positions, one array (by dancer id) per round. */
export interface DancerModel {
  readonly kind: 'dancer';
  readonly rounds: readonly (readonly Vec2[])[];
  /** Expected partner of every dancer after each round, when partners change. */
  readonly partners?: readonly (readonly number[])[];
  /** Positions along z repeat every `period` meters (a set with no ends). */
  readonly period?: number;
}

/**
 * Everyone ends each round on a place of their own role in the starting
 * set (a mixer: who stands where changes, the places do not).
 */
export interface SlotsModel {
  readonly kind: 'slots';
  readonly rounds: number;
  readonly larks: readonly Vec2[];
  readonly robins: readonly Vec2[];
}

export type RoundModel = CoupleZModel | DancerModel | SlotsModel;

/**
 * Who must meet over the rounds checked:
 * - all-couples: every couple dances in a group with every other couple.
 * - ones-twos: every 1s couple meets every 2s couple (a Sicilian circle,
 *   where couples keep their direction forever).
 * - all-partners: every lark dances with every robin as a partner (mixers).
 * - all-lines: every line of four (couples 2k and 2k+1) meets every other.
 * - none: one fixed set (triplets, squares), nothing to meet.
 */
export type MeetingRule = 'all-couples' | 'all-lines' | 'ones-twos' | 'all-partners' | 'none';

export interface CheckSpec {
  /** Couple counts to compile and check at. */
  readonly counts: readonly number[];
  readonly model?: (couples: number, rounds: number) => RoundModel | undefined;
  readonly meeting: MeetingRule;
  /** Rounds to check at `couples`; the default is couples + 2. */
  readonly rounds?: (couples: number) => number;
  /** Couple counts to check the meeting rule at; the default is every count. */
  readonly meetingCounts?: readonly number[];
}

/** Expected couple-center z after each round, improper duple minor. */
export function improperModel(couples: number, rounds: number, steps = 1): number[][] {
  const place = Array.from({ length: couples }, (_, c) => c); // place 0 is the top
  // The top of the set is -z.
  const z = (p: number) => (p - (couples - 1) / 2) * SET.slot;
  const out: number[][] = [];
  for (let r = 0; r < rounds; r++) {
    for (let k = 0; k < steps; k++) {
      const s = r * steps + k;
      const byPlace = new Map(place.map((p, c) => [p, c]));
      for (let p = s % 2; p + 1 < couples; p += 2) {
        const a = byPlace.get(p)!;
        const b = byPlace.get(p + 1)!;
        place[a] = p + 1;
        place[b] = p;
      }
    }
    out.push(place.map(z));
  }
  return out;
}

/**
 * Expected couple-center z after each round, Becket (as in the 2321 test).
 * Clockwise, each couple moves one place to its left; counterclockwise
 * (`direction` -1), to its right, and the extra couple waits at the other end.
 * A double progression shifts twice a round.
 */
export function becketModel(
  couples: number,
  rounds: number,
  direction: 1 | -1 = 1,
  steps = 1,
): number[][] {
  const rows = Math.floor(couples / 2);
  const spots = Array.from({ length: couples }, (_, c) => {
    if (c === couples - 1 && couples % 2)
      return { side: -1, z: ((direction > 0 ? rows : -1) - (rows - 1) / 2) * 2 * SET.slot };
    return { side: c % 2 ? -1 : 1, z: (Math.floor(c / 2) - (rows - 1) / 2) * 2 * SET.slot };
  });
  const out: number[][] = [];
  for (let r = 0; r < rounds; r++) {
    for (let k = 0; k < steps; k++) {
      for (const s of spots) s.z += direction * s.side * SET.slot;
      for (const s of spots) {
        const across = spots.some(
          (o) => o !== s && o.side === -s.side && Math.abs(o.z - s.z) < 1e-6,
        );
        if (!across) s.side = -s.side;
      }
    }
    // Built with the top at +z as in the 2321 test; the set's top is -z.
    out.push(spots.map((s) => -s.z));
  }
  return out;
}

const DEFAULT_COUNTS = [3, 4, 6] as const;

export const coupleZ = (rounds: number[][]): CoupleZModel => ({ kind: 'couple-z', rounds });

/**
 * The spec for the duple minor and Becket relatives, by formation key and
 * progression kind (a "-double" progression moves couples two places a
 * round). Other formations carry their own spec (Formation.check).
 */
export function contraSpec(formation: string | null, progression: string | null): CheckSpec {
  const steps = progression?.endsWith('-double') ? 2 : 1;
  if (formation?.startsWith('becket')) {
    const direction = formation.includes('ccw') ? -1 : 1;
    return {
      counts: DEFAULT_COUNTS,
      meeting: 'all-couples',
      model: (c, r) => coupleZ(becketModel(c, r, direction, steps)),
    };
  }
  return {
    counts: DEFAULT_COUNTS,
    meeting: 'all-couples',
    model: (c, r) => coupleZ(improperModel(c, r, steps)),
  };
}
