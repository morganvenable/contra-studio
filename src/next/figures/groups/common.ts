/** Small helpers shared by the figures for sets not made of couples. */
import type { Hand, Vec2 } from '../../../types.ts';
import type { FigureContact, MovedBody } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { clamp, heading, mean, polar, smooth, sub, TAU } from '../../core/math.ts';
import { body, type DanceState } from '../../core/state.ts';

/** Who a position label names, checked to be somebody. */
export function named(state: DanceState, label: unknown, move: string): number[] {
  if (typeof label !== 'string') throw new Error(`${move} needs a dancer named.`);
  const ids = state.positions.get(label);
  if (!ids?.length) throw new Error(`Nobody is called "${label}" here.`);
  return [...ids];
}

/** Everyone in the set. */
export const everyone = (state: DanceState) => state.dancers.map((d) => d.id);

/** Middle of the whole set. */
export const setCenter = (state: DanceState): Vec2 =>
  mean(everyone(state).map((id) => body(state, id).position));

/** Polar angle of `id` about `center`. */
export const angleOf = (state: DanceState, id: number, center: Vec2) =>
  polar(sub(body(state, id).position, center));

/** A joined pair of hands that fades where they cannot reach. */
export function hold(
  a: number,
  handA: Hand,
  b: number,
  handB: Hand,
  strength: number,
  bodies: readonly MovedBody[],
): FigureContact {
  return withinReach(joined({ a, handA, b, handB }, strength), bodyMap(bodies));
}

/** 0 -> 1 -> 0 over [0, 1]: in over `edge`, out over the last `edge`. */
export const inOut = (t: number, edge: number) =>
  Math.min(smooth(t / edge), smooth((1 - t) / edge));

/** Local time in [0, 1] of a window [from, to] of a figure's beats. */
export const window = (beat: number, from: number, to: number) =>
  clamp((beat - from) / (to - from));

/** Signed angle a - b wrapped to (-pi, pi]. */
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Yaw facing from `p` toward `q`. */
export const facingTo = heading;

export { TAU };

/** Center of the circle through points (least squares), for a ring with a gap. */
export function circleCenter(points: readonly Vec2[]): Vec2 {
  // x^2 + z^2 + D x + E z + F = 0, solved in least squares.
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const v = [0, 0, 0];
  for (const p of points) {
    const row = [p.x, p.z, 1];
    const rhs = -(p.x * p.x + p.z * p.z);
    for (let i = 0; i < 3; i++) {
      v[i] += row[i] * rhs;
      for (let j = 0; j < 3; j++) m[i][j] += row[i] * row[j];
    }
  }
  const det = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det(m);
  if (Math.abs(d) < 1e-9) return mean(points);
  const col = (k: number) => m.map((r, i) => r.map((x, j) => (j === k ? v[i] : x)));
  return { x: -det(col(0)) / d / 2, z: -det(col(1)) / d / 2 };
}

/**
 * Dancers standing round a ring with one place empty: their order by angle
 * starting just after the gap, the center, the mean radius, and the empty
 * place (the middle of the widest gap).
 */
export function ringWithGap(state: DanceState, ids: readonly number[]) {
  const center = circleCenter(ids.map((id) => body(state, id).position));
  const angle = (id: number) => polar(sub(body(state, id).position, center));
  const sorted = [...ids].sort((a, b) => angle(a) - angle(b));
  let widest = -1;
  let gap = -Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const a = angle(sorted[i]);
    const b = angle(sorted[(i + 1) % sorted.length]);
    const g = (((b - a) % TAU) + TAU) % TAU || TAU;
    if (g > gap) {
      gap = g;
      widest = i;
    }
  }
  const order = sorted.map((_, i) => sorted[(widest + 1 + i) % sorted.length]);
  const radius =
    ids.reduce((n, id) => n + Math.hypot(...xz(sub(body(state, id).position, center))), 0) /
    ids.length;
  const emptyAngle = angle(sorted[widest]) + gap / 2;
  const empty = {
    x: center.x + radius * Math.cos(emptyAngle),
    z: center.z + radius * Math.sin(emptyAngle),
  };
  return { center, order, radius, empty, gap };
}

const xz = (v: Vec2): [number, number] => [v.x, v.z];

export { heading };

/** A curve sampled by arc length: position and travel heading at a distance along it. */
export interface Path {
  readonly length: number;
  at(s: number): { position: Vec2; yaw: number };
}

/**
 * Sample a curve f(u), u in [0, 1], by arc length. `closed` wraps
 * distances round the curve.
 */
export function arcPath(f: (u: number) => Vec2, closed: boolean, samples = 1200): Path {
  const pts: Vec2[] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= samples; i++) pts.push(f(i / samples));
  for (let i = 1; i <= samples; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  const length = cum[samples];
  const at = (input: number) => {
    const s = closed ? (((input % length) + length) % length) : Math.max(0, Math.min(length, input));
    let lo = 0;
    let hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = cum[hi] - cum[lo] || 1;
    const t = (s - cum[lo]) / span;
    const a = pts[lo];
    const b = pts[hi];
    const position = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    // Heading from a short chord around the point.
    const i0 = Math.max(0, lo - 2);
    const i1 = Math.min(samples, hi + 2);
    const yaw = heading(pts[i0], pts[i1]);
    return { position, yaw };
  };
  return { length, at };
}

/** Catmull-Rom spline through points (closed or open), as a curve on [0, 1]. */
export function spline(points: readonly Vec2[], closed: boolean): (u: number) => Vec2 {
  const n = points.length;
  const segs = closed ? n : n - 1;
  const p = (i: number) =>
    closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  return (u: number) => {
    const x = Math.min(segs - 1e-9, Math.max(0, u * segs));
    const i = Math.floor(x);
    const t = x - i;
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c = (a: number, b: number, cc: number, d: number) =>
      0.5 *
      (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
    return { x: c(p0.x, p1.x, p2.x, p3.x), z: c(p0.z, p1.z, p2.z, p3.z) };
  };
}

/**
 * A facing that follows a travel heading `track(t)` (t in [0, 1]) without
 * jumps: it turns from `start` onto the heading over the first `edge` of the
 * figure and from the heading to `end` over the last `edge`, the shortest
 * way each time, and in between follows the heading continuously.
 */
export function steer(
  track: (t: number) => number,
  start: number,
  end: number,
  edge: number,
  samples = 600,
): (t: number) => number {
  const u: number[] = [];
  let prev = track(0);
  u.push(prev);
  for (let i = 1; i <= samples; i++) {
    const y = track(i / samples);
    prev = prev + wrap(y - prev);
    u.push(prev);
  }
  const at = (t: number) => {
    const x = clamp(t) * samples;
    const i = Math.min(samples - 1, Math.floor(x));
    return u[i] + (u[i + 1] - u[i]) * (x - i);
  };
  const into = wrap(start - u[0]);
  const outof = wrap(end - u[samples]);
  return (t: number) =>
    at(t) + into * (1 - smooth(t / edge)) + outof * smooth((t - (1 - edge)) / edge);
}
