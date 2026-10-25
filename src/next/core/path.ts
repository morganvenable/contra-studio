/**
 * Walking paths made of straight lines and circle arcs, joined where they
 * share a tangent, so a dancer's heading never jumps and turns only as fast
 * as walking the arc needs. Sampled by arc length: walking a path at an
 * even pace moves at an even speed.
 */
import type { Vec2 } from '../../types.ts';
import { add, length, polar, scale, sub, TAU } from './math.ts';

export interface WalkPath {
  /** Point and unit tangent at share `s` (0..1) of the path's length. */
  at(s: number): { p: Vec2; tangent: Vec2 };
  readonly length: number;
}

const ray = (a: number): Vec2 => ({ x: Math.cos(a), z: Math.sin(a) });

/**
 * From `from` straight to a circle around `center`, around it with polar
 * sense `sense` (+1: increasing polar angle), and straight on to `to`. Both
 * ends must lie outside the circle.
 */
export function loopPath(
  from: Vec2,
  center: Vec2,
  radius: number,
  sense: 1 | -1,
  to: Vec2,
): WalkPath {
  // Travel direction on the circle at polar angle a.
  const along = (a: number) => scale({ x: -Math.sin(a), z: Math.cos(a) }, sense);
  const tangentPoint = (p: Vec2, entering: boolean) => {
    const d = length(sub(p, center));
    if (d <= radius) throw new Error('A loop path must start and end outside its circle.');
    const base = polar(sub(p, center));
    const spread = Math.acos(radius / d);
    for (const a of [base + spread, base - spread]) {
      const t = add(center, scale(ray(a), radius));
      const way = entering ? sub(t, p) : sub(p, t);
      const dir = along(a);
      if (way.x * dir.x + way.z * dir.z > 0) return { a, t };
    }
    throw new Error('No tangent onto the loop.');
  };
  const enter = tangentPoint(from, true);
  const leave = tangentPoint(to, false);
  let sweep = (sense * (leave.a - enter.a)) % TAU;
  if (sweep < 0) sweep += TAU;
  const first = length(sub(enter.t, from));
  const arc = radius * sweep;
  const last = length(sub(to, leave.t));
  const total = first + arc + last;
  const at = (s: number) => {
    const d = Math.max(0, Math.min(1, s)) * total;
    if (d <= first) {
      const dir = scale(sub(enter.t, from), 1 / (first || 1));
      return { p: add(from, scale(dir, d)), tangent: dir };
    }
    if (d <= first + arc) {
      const a = enter.a + (sense * (d - first)) / radius;
      return { p: add(center, scale(ray(a), radius)), tangent: along(a) };
    }
    const dir = scale(sub(to, leave.t), 1 / (last || 1));
    return { p: add(leave.t, scale(dir, d - first - arc)), tangent: dir };
  };
  return { at, length: total };
}
