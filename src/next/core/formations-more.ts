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
import { coupleZ, improperModel, type CheckSpec } from './models.ts';
import { placeLabels } from './progression-more.ts';
import { BIG_CIRCLE, CIRCLE_MIXER } from './formation-ring.ts';
import type { Body, DanceState, WaitingCouple } from './state.ts';

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

/**
 * Sicilian circle: couples face couples all round a big circle, partners
 * side by side; the 1s face one way round and the 2s the other, and every
 * couple meets the next one coming. Drawn as an improper set with no ends
 * (layout.period) that the display bends into a circle (bend.ts): the 1s
 * travel +z for ever and the 2s -z. Even couple counts only.
 */
export const SICILIAN: Formation = {
  name: 'Sicilian circle',
  shape: 'sicilian',
  grouping: 'duple-minor',
  couples: { min: 4, max: 16 },
  fit: (couples) => Math.max(4, couples - (couples % 2)),
  moves: { 'long-lines': 'forward-back' },
  check: {
    counts: [4, 6, 8],
    meeting: 'ones-twos',
    rounds: (couples) => couples / 2 + 1,
    model: (couples, rounds) => {
      const start = SICILIAN.start(couples);
      const ones = new Set(start.positions.get('1s'));
      return {
        kind: 'dancer',
        period: couples * SET.slot,
        rounds: Array.from({ length: rounds }, (_, r) =>
          start.dancers.map((d) => {
            const p = start.bodies.get(d.id)!.position;
            return { x: p.x, z: p.z + (ones.has(d.id) ? 1 : -1) * (r + 1) * SET.slot };
          }),
        ),
      };
    },
  },
  start(couples) {
    count(this, couples);
    if (couples % 2) throw new Error('A Sicilian circle needs an even number of couples.');
    const dancers = createDancers(couples);
    const bodies = new Map<number, Body>();
    const groups: number[][] = [];
    const neighbor = new Map<number, number>();
    const ones: number[] = [];
    const twos: number[] = [];
    for (let c = 0; c < couples; c++) {
      const z = (c - (couples - 1) / 2) * SET.slot;
      const isOnes = c % 2 === 0;
      const yaw = isOnes ? 0 : Math.PI;
      const lark = isOnes ? 1 : -1;
      bodies.set(c * 2, { position: { x: lark * SET.halfWidth, z }, yaw });
      bodies.set(c * 2 + 1, { position: { x: -lark * SET.halfWidth, z }, yaw });
      (isOnes ? ones : twos).push(c * 2, c * 2 + 1);
    }
    for (let c = 0; c < couples; c += 2) {
      const [l1, r1, l2, r2] = [c * 2, c * 2 + 1, c * 2 + 2, c * 2 + 3];
      groups.push([l1, r1, l2, r2]);
      neighbor.set(l1, r2).set(r2, l1).set(r1, l2).set(l2, r1);
    }
    return Object.freeze({
      dancers,
      bodies,
      hands: [],
      relations: new Map([
        ['partner', partnerMap(dancers)],
        ['neighbor', neighbor],
      ]),
      groups,
      positions: new Map([
        ['1s', ones],
        ['2s', twos],
      ]),
      epoch: 0,
      waiting: [],
      layout: { period: couples * SET.slot, lines: 'facing' as const },
    });
  },
};

/**
 * Four face four: lines of four (two couples side by side, each lark on its
 * partner's left) face lines of four along the hall, the 1s' lines facing
 * down and the 2s' up. It dances as two improper sets side by side
 * (layout.columns): each couple faces the couple across in its own column,
 * and those four are a minor set. The lines pass on to meet the next line;
 * a line at an end waits, turns round and changes number. Even couple
 * counts only (two per line).
 */
export const FOUR_FACE_FOUR: Formation = {
  name: 'Four face four',
  shape: 'longways',
  grouping: 'duple-minor',
  // Three lines at least, so lines keep meeting new lines.
  couples: { min: 6, max: 16 },
  fit: (couples) => Math.max(6, couples - (couples % 2)),
  moves: { 'long-lines': 'forward-back' },
  check: {
    counts: [6, 8],
    meeting: 'all-lines',
    model: (couples, rounds) => {
      const lines = improperModel(couples / 2, rounds);
      return coupleZ(lines.map((z) => Array.from({ length: couples }, (_, c) => z[c >> 1])));
    },
  },
  start(couples) {
    count(this, couples);
    if (couples % 2) throw new Error('Four face four needs an even number of couples.');
    const dancers = createDancers(couples);
    const lines = couples / 2;
    const bodies = new Map<number, Body>();
    const ones: number[] = [];
    const twos: number[] = [];
    const waiting: WaitingCouple[] = [];
    const column = 2 * SET.halfWidth;
    for (let k = 0; k < lines; k++) {
      const z = (k - (lines - 1) / 2) * SET.slot;
      const down = k % 2 === 0 && k + 1 < lines;
      const yaw = down ? 0 : Math.PI;
      // The line's left is +x facing down, -x facing up; its first couple stands there.
      const left = down ? 1 : -1;
      for (const [i, c] of [2 * k, 2 * k + 1].entries()) {
        const cx = (i === 0 ? left : -left) * column;
        bodies.set(c * 2, { position: { x: cx + left * SET.halfWidth, z }, yaw });
        bodies.set(c * 2 + 1, { position: { x: cx - left * SET.halfWidth, z }, yaw });
        (down ? ones : twos).push(c * 2, c * 2 + 1);
        if (!down && k % 2 === 0) waiting.push({ couple: c, crossed: true });
      }
    }
    const groups: number[][] = [];
    const neighbor = new Map<number, number>();
    for (let k = 0; k + 1 < lines; k += 2) {
      // Down line: couples 2k (its left, +x) and 2k+1; up line: 2k+2 (its left, -x) and 2k+3.
      for (const [a, b] of [
        [2 * k, 2 * k + 3],
        [2 * k + 1, 2 * k + 2],
      ]) {
        const [l1, r1, l2, r2] = [a * 2, a * 2 + 1, b * 2, b * 2 + 1];
        groups.push([l1, r1, l2, r2]);
        neighbor.set(l1, r2).set(r2, l1).set(r1, l2).set(l2, r1);
      }
    }
    return Object.freeze({
      dancers,
      bodies,
      hands: [],
      relations: new Map([
        ['partner', partnerMap(dancers)],
        ['neighbor', neighbor],
      ]),
      groups,
      positions: new Map([
        ['1s', ones],
        ['2s', twos],
      ]),
      epoch: 0,
      waiting,
      layout: { columns: true, lines: 'facing' as const },
    });
  },
};

export const MORE_FORMATIONS: Readonly<Record<string, Formation>> = {
  triplet: TRIPLET,
  'longways-set': LONGWAYS_SET,
  sicilian: SICILIAN,
  'four-face-four': FOUR_FACE_FOUR,
  'circle-mixer': CIRCLE_MIXER,
  circle: BIG_CIRCLE,
};
