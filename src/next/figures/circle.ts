/**
 * Circle left (or right).
 *
 * Definition: the dancers of a group (a minor set of four, or a whole small
 * set) join hands in a ring, facing the center, and walk to their left
 * (clockwise from above) or right, either a number of places (one place is
 * one dancer's spacing around the ring) or an amount of the way around,
 * ending facing the center. Hands release at the end.
 * Source: Caller's Box glossary, "Circle"; ContraDB row "circle left 3 places"
 * (dance 2321). The ring tightening (32% at mid-figure) and travel clock are
 * ported from the circle primitive in src/engine.ts.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import type { Vec2 } from '../../types.ts';
import {
  add,
  distance,
  heading,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { findRing, ringHolds } from '../core/ring.ts';
import { body, minorSets, withChanges, type DanceState } from '../core/state.ts';
import { SET } from '../core/config.ts';

export interface CircleParams {
  direction: 'left' | 'right';
  /** Places around the ring (with four dancers, 4 is once around). */
  places?: number;
  /** Or: times around (0.75, 1, 1.5). */
  amount?: number;
  /**
   * Single file: no hands, each dancer turns to walk along the ring behind
   * the one ahead, and turns back in to face the center at the end.
   */
  singleFile?: boolean;
}

const TIGHTEN = 0.32;
const EDGE = 0.16;
const EDGE_BEATS = 0.8;
/** Beats, at least, to turn in to face the center. */
const TURN_IN_BEATS = 1;
/** Radians a beat, at most, for the turn in. */
const TURN_IN_RATE = 2.5;

/** A fast circle's pace along its path (m/beat), with the short ramps of progress(t, 0.1). */
const FAST_PACE = 1.05;
const FAST_RAMP = 0.1;
/** Share of the turn spent closing in, and again opening out. */
const FAST_EDGE = 0.25;

/**
 * A circle too fast for the usual ring ("circle left 3 places" in 4 beats)
 * closes in tighter, down to where neighbors in the ring stand 0.72 m
 * apart, and moves at one steady pace along its path, closing in and
 * opening out while it turns. Undefined when the usual ring is slow enough.
 */
function fastRing(
  state: DanceState,
  order: readonly number[],
  center: Vec2,
  sweep: number,
  beats: number,
) {
  const n = order.length;
  const r0 = Math.max(...order.map((id) => distance(body(state, id).position, center)));
  const usual = (1 - TIGHTEN) * r0;
  const peak = 1 / (1 - FAST_RAMP);
  // The usual ring's pace around its closed middle.
  if ((Math.abs(sweep) * usual * peak) / beats <= FAST_PACE * 0.9) return undefined;
  const floor = Math.max(0.5, 0.36 / Math.sin(Math.PI / n)) / r0;
  const shape = (k: number) => (phi: number) =>
    1 - (1 - k) * Math.min(smooth(phi / FAST_EDGE), smooth((1 - phi) / FAST_EDGE));
  // Path length (for the farthest dancer) of a ring closing to k of its radius.
  const STEPS = 200;
  const table = (k: number) => {
    const r = shape(k);
    const lengths = [0];
    for (let i = 1; i <= STEPS; i++) {
      const a = (i - 1) / STEPS;
      const b = i / STEPS;
      const dr = (r(b) - r(a)) * r0;
      const arc = Math.abs(sweep) * (b - a) * r0 * ((r(a) + r(b)) / 2);
      lengths.push(lengths[i - 1] + Math.hypot(dr, arc));
    }
    return lengths;
  };
  // The loosest ring that keeps to the pace, but no tighter than the floor.
  let k = 1 - TIGHTEN;
  let lengths = table(k);
  while (k > floor && (lengths[STEPS] * peak) / beats > FAST_PACE) {
    k = Math.max(floor, k - 0.02);
    lengths = table(k);
  }
  const r = shape(k);
  const total = lengths[STEPS];
  return (t: number) => {
    const goal = progress(t, FAST_RAMP) * total;
    let i = 1;
    while (i < STEPS && lengths[i] < goal) i++;
    const span = lengths[i] - lengths[i - 1];
    const phi = (i - 1 + (span > 0 ? (goal - lengths[i - 1]) / span : 0)) / STEPS;
    return { turned: phi, radius: r(phi) };
  };
}

/**
 * A minor set's ring standing a little off its places (off the set's middle
 * line, or squeezed after a roll away from long lines forward) drifts onto
 * them as it goes round, so the circle ends on the side lines: each dancer
 * ends on the place of the minor set's square nearest where the plain ring
 * would leave them. Only in a contra set, for a ring of four, when each
 * place is within 0.7 m across the set and 0.15 m along it, and no two
 * dancers share one.
 */
function settleOnPlaces(
  state: DanceState,
  order: readonly number[],
  center: Vec2,
  sweep: number,
): ReadonlyMap<number, Vec2> {
  const none = new Map<number, Vec2>();
  if (state.layout || order.length !== 4) return none;
  const square = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => ({ x: sx * SET.halfWidth, z: center.z + sz * SET.halfWidth })),
  );
  const drift = new Map<number, Vec2>();
  const used = new Set<number>();
  for (const id of order) {
    const end = add(center, rotate(sub(body(state, id).position, center), sweep));
    const k = square.reduce((best, p, i) => (distance(p, end) < distance(square[best], end) ? i : best), 0);
    const d = sub(square[k], end);
    if (used.has(k) || Math.abs(d.x) > 0.7 || Math.abs(d.z) > 0.15) return none;
    used.add(k);
    drift.set(id, d);
  }
  return [...drift.values()].some((d) => Math.hypot(d.x, d.z) > 1e-6) ? drift : none;
}

export const circle: Figure<CircleParams> = (state, params, beats) => {
  onlyKeys('circle', params, ['direction', 'places', 'amount', 'singleFile']);
  const single = params.singleFile === true;
  const direction = oneOf('circle', 'direction', params.direction, ['left', 'right'] as const);
  if ((params.places === undefined) === (params.amount === undefined)) {
    throw new Error('A circle needs either places or an amount.');
  }
  if (params.places !== undefined && !(Number.isInteger(params.places) && params.places >= 1)) {
    throw new Error('Circle places must be a whole number of places.');
  }
  if (params.amount !== undefined && !(params.amount > 0 && params.amount <= 4)) {
    throw new Error('Circle amount must be between 0 and 4 times around.');
  }
  if (state.hands.length) throw new Error('A circle starts with free hands.');
  const sign = direction === 'left' ? 1 : -1;

  const rings = minorSets(state).map((group) => {
    const n = group.length;
    const { center, order } = findRing(state, group, 'circle');
    if (params.places !== undefined && params.places > 2 * n)
      throw new Error('Too many circle places.');
    const turns = params.amount ?? params.places! / n;
    const hands = ringHolds({ center, order });
    const sweep = sign * turns * TAU;
    return {
      center,
      ids: order,
      hands,
      sweep,
      drift: settleOnPlaces(state, order, center, sweep),
      fast: fastRing(state, order, center, sweep, beats),
    };
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    // Closing up takes at least EDGE_BEATS, so a short circle does not jerk in.
    const edge = Math.min(0.45, Math.max(EDGE, EDGE_BEATS / beats));
    // A quick circle (under four beats) closes up less and keeps a steadier pace.
    const quick = Math.min(1, beats / 4);
    const radius = 1 - TIGHTEN * quick * Math.min(smooth(t / edge), smooth((1 - t) / edge));
    // Hands join once the ring has closed enough to reach, and let go as it opens.
    const reachable = (u: number) => smooth((u / edge - 0.5) / 0.5);
    const strength = Math.min(reachable(t), reachable(1 - t));
    const bodies = rings.flatMap((ring) =>
      ring.ids.map((id) => {
        const fast = ring.fast?.(t);
        const turned = fast ? fast.turned : progress(t, quick < 1 ? 0.1 : undefined);
        const angle = ring.sweep * turned;
        const s = body(state, id);
        const position = add(
          add(ring.center, scale(ring.drift.get(id) ?? { x: 0, z: 0 }, smooth(t))),
          rotate(scale(sub(s.position, ring.center), fast?.radius ?? radius), angle),
        );
        // Face the center: turn in over the opening, then turn with the ring.
        const into = turn(heading(s.position, ring.center), s.yaw);
        // A dancer with farther to turn takes longer (a smooth turn peaks at 1.5x).
        const inBeats = Math.min(
          beats / 2,
          Math.max(EDGE * beats, TURN_IN_BEATS, (1.5 * Math.abs(into)) / TURN_IN_RATE),
        );
        const yaw = s.yaw + into * smooth(beat / inBeats) - angle;
        if (!single) return { id, position, yaw };
        // Single file: a quarter turn toward the travel, and back in at the end
        // (a short circle, under four beats, turns less of the way).
        const along = Math.min(smooth(t / 0.2), smooth((1 - t) / 0.2));
        const quarter = (Math.PI / 2) * Math.min(1, beats / 4);
        return { id, position, yaw: yaw + sign * quarter * along };
      }),
    );
    // Hands join only where they reach (a dancer still arriving from afar).
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = single
      ? []
      : rings.flatMap((r) => r.hands.map((h) => withinReach(joined(h, strength), map)));
    return { bodies, contacts };
  };
  return {
    kind: 'circle',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
