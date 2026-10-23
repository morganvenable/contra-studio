/**
 * Formation is data: how a set is laid out, how it is grouped, and the names
 * of its positions. A formation only builds the starting DanceState; figures
 * and the fold never ask which formation they are in.
 *
 * Built so far: Becket and improper (contra, duple minor) and proper
 * longways as one whole set (three-couple sets, whole-set longways).
 * Deferred: proper duple minor, triple minor, four-couple sets, squares,
 * circles, Sicilian circles, triplets and other small fixed sets.
 *
 * The top of a longways set is +z: "down the hall" faces -z.
 */
import type { Dancer } from '../../types.ts';
import { SET } from './config.ts';
import { leftOf } from './math.ts';
import { WHOLE_SET_PROGRESSION } from './progression.ts';
import type { Body, DanceState, WaitingCouple } from './state.ts';

export interface Formation {
  readonly name: string;
  readonly shape: 'longways' | 'small-set' | 'square' | 'circle' | 'sicilian';
  /** How dancers group for figures: minor sets, or the whole set as one. */
  readonly grouping: 'duple-minor' | 'triple-minor' | 'whole-set';
  readonly couples: { readonly min: number; readonly max: number };
  start(couples: number): DanceState;
}

/** Same identities and colors as src/engine.ts createDancers. */
export function createDancers(couples: number): Dancer[] {
  return Array.from({ length: couples * 2 }, (_, id) => {
    const couple = Math.floor(id / 2);
    const robin = id % 2 === 1;
    return {
      id,
      name: `${robin ? 'Robin' : 'Lark'} ${couple + 1}`,
      role: robin ? 'robin' : 'lark',
      couple,
      direction: couple % 2 ? -1 : 1,
      color: robin ? '#cb815a' : '#438b86',
    } satisfies Dancer;
  });
}

function checkCount(f: Pick<Formation, 'name' | 'couples'>, couples: number) {
  if (!Number.isInteger(couples) || couples < f.couples.min || couples > f.couples.max) {
    const range =
      f.couples.min === f.couples.max ? `${f.couples.min}` : `${f.couples.min}-${f.couples.max}`;
    throw new Error(`${f.name} needs ${range} couples.`);
  }
}

const partners = (dancers: readonly Dancer[]) => new Map(dancers.map((d) => [d.id, d.id ^ 1]));

/** A couple side by side facing `yaw`, lark on the left, centered at `center`. */
function placeCouple(
  bodies: Map<number, Body>,
  couple: number,
  center: { x: number; z: number },
  yaw: number,
  gap: number,
) {
  const left = leftOf(yaw);
  const half = gap / 2;
  bodies.set(couple * 2, {
    position: { x: center.x + left.x * half, z: center.z + left.z * half },
    yaw,
  });
  bodies.set(couple * 2 + 1, {
    position: { x: center.x - left.x * half, z: center.z - left.z * half },
    yaw,
  });
}

/**
 * Becket: couples on the east (+x) and west (-x) side lines facing across,
 * lark on the left, as in src/becket.ts createBecketState. With an odd count
 * one extra west couple waits at the top, ready to enter.
 */
export const BECKET: Formation = {
  name: 'Becket',
  shape: 'longways',
  grouping: 'duple-minor',
  couples: { min: 2, max: 12 },
  start(couples) {
    checkCount(this, couples);
    const dancers = createDancers(couples);
    const rows = Math.floor(couples / 2);
    const bodies = new Map<number, Body>();
    const waiting: WaitingCouple[] = [];
    const place = (couple: number, side: 1 | -1, z: number) =>
      placeCouple(
        bodies,
        couple,
        { x: side * SET.halfWidth, z },
        side > 0 ? -Math.PI / 2 : Math.PI / 2,
        SET.slot,
      );
    const groups: number[][] = [];
    const neighbor = new Map<number, number>();
    for (let row = 0; row < rows; row++) {
      const z = (row - (rows - 1) / 2) * 2 * SET.slot;
      const east = row * 2;
      const west = row * 2 + 1;
      place(east, 1, z);
      place(west, -1, z);
      groups.push([east * 2, east * 2 + 1, west * 2, west * 2 + 1]);
      neighbor.set(east * 2, west * 2 + 1).set(west * 2 + 1, east * 2);
      neighbor.set(east * 2 + 1, west * 2).set(west * 2, east * 2 + 1);
    }
    if (couples % 2) {
      place(couples - 1, -1, (rows - (rows - 1) / 2) * 2 * SET.slot);
      waiting.push({ couple: couples - 1, crossed: true });
    }
    const relations = new Map([
      ['partner', partners(dancers)],
      ['neighbor', neighbor],
    ]);
    return Object.freeze({
      dancers,
      bodies,
      hands: [],
      relations,
      groups,
      positions: new Map(),
      epoch: 0,
      waiting,
    });
  },
};

/**
 * Improper duple minor: couples stand one place apart along the set, partners
 * side by side across it (lark on the left), the 1s facing down and the 2s
 * facing up, so each 1s couple faces its 2s couple (its neighbors). The 1s
 * are crossed over: 1s larks on the -x line, 2s larks on the +x line. With an
 * odd count the bottom couple waits out as 2s, already on its proper side.
 * Position labels "1s" and "2s" name who travels down and up.
 */
export const IMPROPER: Formation = {
  name: 'Improper',
  shape: 'longways',
  grouping: 'duple-minor',
  couples: { min: 2, max: 12 },
  start(couples) {
    checkCount(this, couples);
    const dancers = createDancers(couples);
    const bodies = new Map<number, Body>();
    const groups: number[][] = [];
    const neighbor = new Map<number, number>();
    const ones: number[] = [];
    const twos: number[] = [];
    const waiting: WaitingCouple[] = [];
    for (let c = 0; c < couples; c++) {
      const z = ((couples - 1) / 2 - c) * SET.slot;
      const isOnes = c % 2 === 0 && c + 1 < couples;
      placeCouple(bodies, c, { x: 0, z }, isOnes ? Math.PI : 0, SET.slot);
      (isOnes ? ones : twos).push(c * 2, c * 2 + 1);
      if (!isOnes && c % 2 === 0) waiting.push({ couple: c, crossed: true });
    }
    for (let c = 0; c + 1 < couples; c += 2) {
      const [lark1, robin1, lark2, robin2] = [c * 2, c * 2 + 1, c * 2 + 2, c * 2 + 3];
      groups.push([lark1, robin1, lark2, robin2]);
      neighbor.set(lark1, robin2).set(robin2, lark1).set(robin1, lark2).set(lark2, robin1);
    }
    return Object.freeze({
      dancers,
      bodies,
      hands: [],
      relations: new Map([
        ['partner', partners(dancers)],
        ['neighbor', neighbor],
      ]),
      groups,
      positions: new Map([
        ['1s', ones],
        ['2s', twos],
      ]),
      epoch: 0,
      waiting,
    });
  },
};

/**
 * Proper longways, the whole set dancing together: partners face across,
 * larks on the +x line, the 1st couple at the top (highest z).
 */
function wholeSet(name: string, min: number, max: number): Formation {
  return {
    name,
    shape: min === max ? 'small-set' : 'longways',
    grouping: 'whole-set',
    couples: { min, max },
    start(couples) {
      checkCount(this, couples);
      const dancers = createDancers(couples);
      const bodies = new Map<number, Body>();
      for (let c = 0; c < couples; c++) {
        const z = ((couples - 1) / 2 - c) * SET.slot;
        bodies.set(c * 2, { position: { x: SET.halfWidth, z }, yaw: -Math.PI / 2 });
        bodies.set(c * 2 + 1, { position: { x: -SET.halfWidth, z }, yaw: Math.PI / 2 });
      }
      const state: DanceState = Object.freeze({
        dancers,
        bodies,
        hands: [],
        relations: new Map([['partner', partners(dancers)]]),
        groups: [dancers.map((d) => d.id)],
        positions: new Map(),
        epoch: 0,
        waiting: [],
      });
      return { ...WHOLE_SET_PROGRESSION.rebind(state), epoch: 0 };
    },
  };
}

export const THREE_COUPLE_SET = wholeSet('Three-couple set', 3, 3);
export const WHOLE_SET_LONGWAYS = wholeSet('Longways for as many as will', 2, 12);

export const FORMATIONS: Readonly<Record<string, Formation>> = {
  becket: BECKET,
  improper: IMPROPER,
  'three-couple-set': THREE_COUPLE_SET,
  'whole-set-longways': WHOLE_SET_LONGWAYS,
};
