/**
 * Progression is pluggable. Each kind rebinds relationships and position
 * labels at a reached endpoint (the figure the source marks as the
 * progression, or the end of the round). Rebinding never moves a body.
 *
 * - minor-set: contra-style. Couples facing each other one place apart become
 *   neighbors; couples left over wait out at the ends and cross over
 *   (port of rebindAtEndpoint in src/progression-topology.ts).
 * - duple-minor: improper-style. The 1s travel down the set and the 2s up;
 *   each 1s couple's new neighbors are the 2s couple one place below it.
 *   Facing does not matter, only where the couples stand. A couple with no
 *   one to meet waits out at its end and changes number (1s <-> 2s).
 * - whole-set: the set keeps one group; places are renamed from where the
 *   couples now stand (e.g. after the top couple casts to the bottom).
 * - none: same relationships every time (set dances, once-through dances).
 */
import type { Vec2 } from '../../types.ts';
import { SET } from './config.ts';
import { dot, forward, mean, sub } from './math.ts';
import { coupleRobin } from './couples.ts';
import { body, partnerOf, type DanceState, type WaitingCouple, withChanges } from './state.ts';

export interface Progression {
  readonly kind: 'minor-set' | 'duple-minor' | 'duple-minor-proper' | 'whole-set' | 'none';
  rebind(state: DanceState): DanceState;
}

export const NO_PROGRESSION: Progression = { kind: 'none', rebind: (s) => s };

interface CoupleSpot {
  readonly lark: number;
  readonly robin: number;
  readonly center: Vec2;
  readonly facing: Vec2;
}

function coupleSpots(state: DanceState, beside = false): Map<number, CoupleSpot> {
  const couples = new Map<number, CoupleSpot>();
  for (const d of state.dancers) {
    if (d.role !== 'lark') continue;
    // Becket: whoever stands with the lark as a couple (core/couples.ts).
    const robin = beside ? coupleRobin(state, d.id) : partnerOf(state, d.id);
    const a = body(state, d.id);
    const b = body(state, robin);
    couples.set(d.couple, {
      lark: d.id,
      robin,
      center: mean([a.position, b.position]),
      facing: forward(a.yaw),
    });
  }
  return couples;
}

export const MINOR_SET_PROGRESSION: Progression = {
  kind: 'minor-set',
  rebind(state) {
    const couples = coupleSpots(state, true);
    for (const [c, spot] of couples) {
      // A couple on a side line faces across the set, whichever way each one
      // is turned (into a ring, say); elsewhere both must face the same way.
      const lark = body(state, spot.lark).position;
      const robin = body(state, spot.robin).position;
      const onLine =
        Math.abs(Math.abs(lark.x) - SET.halfWidth) < 0.05 && Math.abs(robin.x - lark.x) < 0.05;
      if (onLine) {
        couples.set(c, { ...spot, facing: { x: -Math.sign(lark.x), z: 0 } });
        continue;
      }
      if (dot(spot.facing, forward(body(state, spot.robin).yaw)) < 0.9) {
        throw new Error(`Couple ${c + 1} must face the same way to find new neighbors.`);
      }
    }
    const neighbor = new Map<number, number>();
    const groups: number[][] = [];
    for (const [c, me] of couples) {
      const facingMe = [...couples].filter(([k, o]) => {
        if (k === c) return false;
        const gap = sub(o.center, me.center);
        const apart = Math.abs(Math.hypot(gap.x, gap.z) - SET.slot) < 0.05;
        return apart && dot(me.facing, gap) > 0 && dot(o.facing, gap) < 0;
      });
      if (facingMe.length > 1) throw new Error(`Couple ${c + 1} faces more than one couple.`);
      if (!facingMe.length) continue;
      const [k, other] = facingMe[0];
      neighbor.set(me.lark, other.robin).set(me.robin, other.lark);
      if (c < k) groups.push([me.lark, me.robin, other.lark, other.robin]);
    }
    const previous = new Map(state.waiting.map((w) => [w.couple, w]));
    const waiting: WaitingCouple[] = [...couples.keys()]
      .filter((c) => !neighbor.has(couples.get(c)!.lark))
      .map((c) => {
        const before = previous.get(c);
        return before && !before.crossed ? before : { couple: c, crossed: false };
      });
    const activeZ = groups.flat().map((id) => body(state, id).position.z);
    for (const w of waiting) {
      const z = couples.get(w.couple)!.center.z;
      if (z > Math.min(...activeZ) && z < Math.max(...activeZ)) {
        throw new Error(`Couple ${w.couple + 1} has no neighbors in the middle of the set.`);
      }
    }
    const relations = withNeighbors(state, neighbor);
    return withChanges(state, { relations, groups, waiting, epoch: state.epoch + 1 });
  },
};

/** Distance along the set (z) between the 1s and the 2s they meet. */
const MEET_TOLERANCE = 0.3;

/**
 * Duple minor where 1s and 2s stand on the same sides (proper): a couple
 * waiting out at an end changes number without crossing the set.
 */
export const DUPLE_MINOR_PROPER_PROGRESSION: Progression = {
  kind: 'duple-minor-proper',
  rebind: (state) => dupleMinorRebind(state, false),
};

export const DUPLE_MINOR_PROGRESSION: Progression = {
  kind: 'duple-minor',
  rebind: (state) => dupleMinorRebind(state, true),
};

function dupleMinorRebind(state: DanceState, cross: boolean): DanceState {
  {
    const couples = coupleSpots(state);
    const ones = new Set(state.positions.get('1s') ?? []);
    const twos = new Set(state.positions.get('2s') ?? []);
    const isOnes = (c: number) => ones.has(couples.get(c)!.lark);
    for (const [c, spot] of couples) {
      if (ones.has(spot.lark) === twos.has(spot.lark))
        throw new Error(`Couple ${c + 1} must be either 1s or 2s.`);
    }
    const oldGroup = new Map<number, string>();
    for (const g of state.groups) {
      const key = g
        .map((id) => state.dancers[id].couple)
        .filter((c, i, a) => a.indexOf(c) === i)
        .sort()
        .join('-');
      for (const id of g) oldGroup.set(state.dancers[id].couple, key);
    }
    const below = (c: number) =>
      [...couples.keys()].filter((k) => {
        if (isOnes(k)) return false;
        // Down the set is +z.
        const gap = couples.get(k)!.center.z - couples.get(c)!.center.z;
        return Math.abs(gap - SET.slot) < MEET_TOLERANCE;
      });
    const neighbor = new Map<number, number>();
    const groups: number[][] = [];
    const paired = new Set<number>();
    for (const c of [...couples.keys()].filter(isOnes)) {
      const found = below(c);
      if (found.length > 1) throw new Error(`The 1s of couple ${c + 1} meet more than one couple.`);
      if (!found.length) continue;
      const k = found[0];
      if (paired.has(k)) throw new Error(`Couple ${k + 1} is met by two couples.`);
      if (oldGroup.get(c) !== undefined && oldGroup.get(c) === oldGroup.get(k)) {
        throw new Error(`Couples ${c + 1} and ${k + 1} have not passed each other yet.`);
      }
      const me = couples.get(c)!;
      const other = couples.get(k)!;
      neighbor.set(me.lark, other.robin).set(other.robin, me.lark);
      neighbor.set(me.robin, other.lark).set(other.lark, me.robin);
      groups.push([me.lark, me.robin, other.lark, other.robin]);
      paired.add(c).add(k);
    }
    // Waiting couples change number: they will travel the other way.
    const nextOnes = new Set(ones);
    const nextTwos = new Set(twos);
    const previous = new Map(state.waiting.map((w) => [w.couple, w]));
    const waiting: WaitingCouple[] = [];
    for (const [c, spot] of couples) {
      if (paired.has(c)) continue;
      const before = previous.get(c);
      waiting.push(
        before && !before.crossed ? before : { couple: c, crossed: !cross || before !== undefined },
      );
      if (before) continue;
      for (const id of [spot.lark, spot.robin]) {
        if (isOnes(c)) {
          nextOnes.delete(id);
          nextTwos.add(id);
        } else {
          nextTwos.delete(id);
          nextOnes.add(id);
        }
      }
    }
    const activeZ = groups.flat().map((id) => body(state, id).position.z);
    for (const w of waiting) {
      const z = couples.get(w.couple)!.center.z;
      if (z > Math.min(...activeZ) && z < Math.max(...activeZ)) {
        throw new Error(`Couple ${w.couple + 1} has no neighbors in the middle of the set.`);
      }
    }
    const relations = withNeighbors(state, neighbor);
    const positions = new Map(state.positions)
      .set(
        '1s',
        [...nextOnes].sort((a, b) => a - b),
      )
      .set(
        '2s',
        [...nextTwos].sort((a, b) => a - b),
      );
    return withChanges(state, { relations, groups, waiting, positions, epoch: state.epoch + 1 });
  }
}

/** New neighbors; the old ones are kept as previous neighbors ("prev neighbors"). */
function withNeighbors(state: DanceState, neighbor: Map<number, number>) {
  const relations = new Map(state.relations).set('neighbor', neighbor);
  const before = state.relations.get('neighbor');
  if (before) relations.set('previous-neighbor', before);
  return relations;
}

/** Name couples by place from the top (lowest z) down: "1st couple", ... */
export const WHOLE_SET_PROGRESSION: Progression = {
  kind: 'whole-set',
  rebind(state) {
    const order = [...coupleSpots(state).values()].sort((a, b) => a.center.z - b.center.z);
    const positions = new Map(state.positions);
    order.forEach((spot, i) => positions.set(`${ordinal(i + 1)} couple`, [spot.lark, spot.robin]));
    return withChanges(state, { positions, epoch: state.epoch + 1 });
  },
};

export function ordinal(n: number) {
  const suffix =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th';
  return `${n}${suffix}`;
}
