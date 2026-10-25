/**
 * Two lines of four facing (four face four) and the square of eight they
 * form ("square the set"), as places round one ring.
 *
 * Read in a group frame (layout.ts turns each group so couples face across):
 * the lines run along z at x = +-halfWidth, each dancer facing the other
 * line. Going round the ring the dancers alternate partner, corner,
 * partner ... (the middle two of a line are corners; an end dancer's corner
 * faces them in the other line), so squaring keeps that order: everyone
 * moves round to the left until each couple stands on a side of a square,
 * facing in. The middle couples become the heads (at the ends of the hall)
 * and the end couples the sides. Lining up again is the same move back.
 *
 * Also a swing that carries a pair from two places to two other places
 * (a swing of corners in a square, partners swinging back into lines).
 */
import type { FigureContact } from '../../core/figure.ts';
import { joined, withinReach, bodyMap } from '../../core/contacts.ts';
import { SET } from '../../core/config.ts';
import type { Vec2 } from '../../../types.ts';
import {
  add,
  length,
  mean,
  mix,
  polar,
  positiveAngle,
  progress,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, partnerOf, roleOf, type DanceState } from '../../core/state.ts';

/**
 * Radius of the square's ring. Sets of eight stand two lines (3.6 m) apart
 * along the hall, so the square stays small enough for the next set's heads
 * to pass clear: neighbors on the ring about 1.2 m apart.
 */
export const SQUARE_RADIUS = 1.6;

export interface Place {
  readonly position: Vec2;
  readonly yaw: number;
}

const facingIn = (center: Vec2, p: Vec2) => Math.atan2(center.x - p.x, center.z - p.z);

/** The eight places of the square round `center`, couples centered on the axes. */
export function squarePlaces(center: Vec2): Place[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const position = add(center, { x: SQUARE_RADIUS * Math.cos(a), z: SQUARE_RADIUS * Math.sin(a) });
    return { position, yaw: facingIn(center, position) };
  });
}

/** The eight places of two lines of four facing across, round `center`. */
export function linePlaces(center: Vec2): Place[] {
  const out: Place[] = [];
  for (const side of [1, -1]) {
    for (const z of [-3, -1, 1, 3]) {
      out.push({
        position: add(center, { x: side * SET.halfWidth, z: (z * SET.slot) / 2 }),
        yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2,
      });
    }
  }
  return out;
}

/** True when the group stands in two lines of four facing across. */
export function inLines(state: DanceState, group: readonly number[]): boolean {
  if (group.length !== 8) return false;
  const c = mean(group.map((id) => body(state, id).position));
  return group.every((id) => {
    const p = sub(body(state, id).position, c);
    return Math.abs(Math.abs(p.x) - SET.halfWidth) < 0.35 && Math.abs(p.z) < 3.2;
  });
}

/**
 * Give each dancer of the group a place, keeping their order round the ring:
 * partners on two places that make a couple (side by side, the lark on the
 * left facing in), everyone moving round `way` (+1 to the left, -1 to the
 * right) as little as possible.
 */
export function assignRound(
  state: DanceState,
  group: readonly number[],
  places: readonly Place[],
  way: 1 | -1,
): Map<number, Place> {
  const center = mean(group.map((id) => body(state, id).position));
  const pc = mean(places.map((p) => p.position));
  const angle = (v: Vec2, c: Vec2) => polar(sub(v, c));
  const order = [...group].sort(
    (a, b) => angle(body(state, a).position, center) - angle(body(state, b).position, center),
  );
  const spots = [...places].sort((a, b) => angle(a.position, pc) - angle(b.position, pc));
  const couple = (a: number, pa: Place, b: number, pb: Place) => {
    // Side by side facing in, the lark on the left: the robin is on the lark's right.
    const lark = roleOf(state, a) === 'lark' ? pa : pb;
    const robin = lark === pa ? pb : pa;
    const right = { x: -Math.cos(lark.yaw), z: Math.sin(lark.yaw) };
    const v = sub(robin.position, lark.position);
    return v.x * right.x + v.z * right.z > 0.5 && roleOf(state, a) !== roleOf(state, b);
  };
  let best: Map<number, Place> | undefined;
  let bestScore = Infinity;
  for (let k = 0; k < 8; k++) {
    const map = new Map(order.map((id, i) => [id, spots[(i + k) % 8]]));
    const ok = order.every((id) => {
      const p = partnerOf(state, id);
      return map.has(p) && couple(id, map.get(id)!, p, map.get(p)!);
    });
    if (!ok) continue;
    let mean = 0;
    for (const id of order) {
      const d = turn(angle(map.get(id)!.position, pc), angle(body(state, id).position, center));
      mean += d / 8;
    }
    // Prefer the way asked, then the shortest move.
    const score = Math.abs(mean - (way * Math.PI) / 4);
    if (score < bestScore) {
      bestScore = score;
      best = map;
    }
  }
  if (!best) throw new Error('The eight cannot reach those places as couples.');
  return best;
}

/** Corners round the ring: the neighbor on the other side from the partner. */
export function cornerPairs(state: DanceState, group: readonly number[]): [number, number][] {
  const center = mean(group.map((id) => body(state, id).position));
  const order = [...group].sort(
    (a, b) =>
      polar(sub(body(state, a).position, center)) - polar(sub(body(state, b).position, center)),
  );
  const pairs: [number, number][] = [];
  for (let i = 0; i < order.length; i++) {
    const a = order[i];
    const b = order[(i + 1) % order.length];
    if (partnerOf(state, a) === b) continue;
    if (roleOf(state, a) === roleOf(state, b))
      throw new Error('Corners must be a lark and a robin side by side round the ring.');
    pairs.push([a, b]);
  }
  if (pairs.length !== group.length / 2) throw new Error('Everyone needs a partner beside them.');
  return pairs;
}

const ORBIT = 0.31;
const LEAD_BEATS = 1;
const TURN_IN_BEATS = 1.6;
const OPEN = 0.25;
const FRAME = Math.PI / 3;

/**
 * A swing that ends with each dancer on a given place, facing that place's
 * way: the pair closes to the orbit, turns clockwise (from above) a whole
 * number of times and more, drifting to the middle of the new places, and
 * opens out onto them.
 */
export function swingTo(
  state: DanceState,
  pair: readonly [number, number],
  to: ReadonlyMap<number, Place>,
  beats: number,
) {
  const [a, b] = pair;
  const sa = body(state, a);
  const sb = body(state, b);
  const ta = to.get(a)!;
  const tb = to.get(b)!;
  const mid0 = mix(sa.position, sb.position, 0.5);
  const mid1 = mix(ta.position, tb.position, 0.5);
  const r0 = length(sub(sa.position, mid0));
  const r1 = length(sub(ta.position, mid1));
  const th0 = polar(sub(sa.position, mid0));
  const th1 = polar(sub(ta.position, mid1));
  const turns = Math.max(1, Math.floor(beats / 4 - 0.5));
  // Clockwise from above is increasing polar angle (math.ts rotate).
  const sweep = turns * TAU + positiveAngle(th1 - th0);
  const lead = Math.min(0.25, LEAD_BEATS / beats);
  const turnIn = Math.min(0.3, TURN_IN_BEATS / beats);
  const spin = (t: number) => sweep * progress((t - lead) / (1 - lead));
  const radius = (t: number) => {
    if (t < lead) return r0 + (ORBIT - r0) * smooth(t / lead);
    return ORBIT + (r1 - ORBIT) * smooth((t - (1 - OPEN)) / OPEN);
  };
  // In the swing each faces 60 degrees left of the partner; facing the
  // partner from polar angle th is heading -th - pi/2 (continuous in th).
  const frameYaw = (th: number) => -th - Math.PI / 2 + FRAME;
  const plans = [
    { id: a, s: sa, end: ta.yaw, off: 0 },
    { id: b, s: sb, end: tb.yaw, off: Math.PI },
  ].map((p) => {
    // Swing facing on the winding branch nearest the start facing.
    const f0 = frameYaw(th0 + p.off);
    return { ...p, shift: p.s.yaw + turn(f0, p.s.yaw) - f0 };
  });
  const at = (t: number) =>
    plans.map((p) => {
      const th = th0 + p.off + spin(t);
      const center = mix(mid0, mid1, smooth(t));
      const r = radius(t);
      const position = add(center, { x: r * Math.cos(th), z: r * Math.sin(th) });
      const swingYaw = frameYaw(th) + p.shift;
      let yaw = p.s.yaw + (swingYaw - p.s.yaw) * smooth(t / turnIn);
      if (t > 1 - OPEN) {
        const last = frameYaw(th0 + p.off + sweep) + p.shift;
        yaw += turn(p.end, last) * smooth((t - (1 - OPEN)) / OPEN);
      }
      return { id: p.id, position, yaw };
    });
  const lark = roleOf(state, a) === 'lark' ? a : b;
  const robin = lark === a ? b : a;
  const contacts = (t: number, bodies: ReturnType<typeof at>): FigureContact[] => {
    const strength = smooth((t - lead) / (turnIn * 0.5)) * smooth((1 - OPEN * 0.6 - t) / 0.08);
    if (strength <= 0) return [];
    const hold = joined({ a: lark, handA: 'left', b: robin, handB: 'right' }, strength);
    return [withinReach(hold, bodyMap(bodies))];
  };
  return { at, contacts };
}

/**
 * True when the group is the eight of a four face four (two lines, or the
 * square they form): its dancers have line mates (formations-more.ts). A
 * square dance's whole set is a group of eight too, and keeps its own
 * figures.
 */
export const fourFaceFour = (state: DanceState, group: readonly number[]) =>
  group.length === 8 && state.relations.has('line-mate');
