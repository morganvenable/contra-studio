/**
 * Progression is pluggable. Each kind rebinds relationships and position
 * labels at a reached endpoint (the figure the source marks as the
 * progression, or the end of the round). Rebinding never moves a body.
 *
 * - minor-set: contra-style. Couples facing each other one place apart become
 *   neighbors; couples left over wait out at the ends and cross over
 *   (port of rebindAtEndpoint in src/progression-topology.ts).
 * - whole-set: the set keeps one group; places are renamed from where the
 *   couples now stand (e.g. after the top couple casts to the bottom).
 * - none: same relationships every time (set dances, once-through dances).
 */
import type { Vec2 } from '../../types.ts';
import { SET } from './config.ts';
import { dot, forward, mean, sub } from './math.ts';
import { body, partnerOf, type DanceState, type WaitingCouple, withChanges } from './state.ts';

export interface Progression {
  readonly kind: 'minor-set' | 'whole-set' | 'none';
  rebind(state: DanceState): DanceState;
}

export const NO_PROGRESSION: Progression = { kind: 'none', rebind: (s) => s };

interface CoupleSpot {
  readonly lark: number;
  readonly robin: number;
  readonly center: Vec2;
  readonly facing: Vec2;
}

function coupleSpots(state: DanceState): Map<number, CoupleSpot> {
  const couples = new Map<number, CoupleSpot>();
  for (const d of state.dancers) {
    if (d.role !== 'lark') continue;
    const robin = partnerOf(state, d.id);
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
    const couples = coupleSpots(state);
    for (const [c, spot] of couples) {
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
    const relations = new Map(state.relations).set('neighbor', neighbor);
    return withChanges(state, { relations, groups, waiting, epoch: state.epoch + 1 });
  },
};

/** Name couples by place from the top (highest z) down: "1st couple", ... */
export const WHOLE_SET_PROGRESSION: Progression = {
  kind: 'whole-set',
  rebind(state) {
    const order = [...coupleSpots(state).values()].sort((a, b) => b.center.z - a.center.z);
    const positions = new Map(state.positions);
    order.forEach((spot, i) => positions.set(`${ordinal(i + 1)} couple`, [spot.lark, spot.robin]));
    return withChanges(state, { positions, epoch: state.epoch + 1 });
  },
};

export function ordinal(n: number) {
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}
