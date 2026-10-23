/**
 * Shared math for every figure. Ported from src/ring-twirl-contract.ts so the
 * figure library has exactly one copy of each helper.
 *
 * Coordinates: x runs across the set, z runs along it. A yaw of 0 faces +z;
 * forward(yaw) = (sin yaw, cos yaw). Turning left increases yaw, so a
 * clockwise turn seen from above decreases it. rotate(v, a) with a > 0 moves
 * points the way a dancer walks when circling left (clockwise from above).
 */
import type { Vec2 } from '../../types.ts';

export const TAU = Math.PI * 2;

export const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/** C1 smoothstep. */
export const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};

/** C2 smootherstep. */
export const ease = (x: number) => {
  const t = clamp(x);
  return t * t * t * (10 + t * (-15 + 6 * t));
};

/**
 * Travel progress with short C2 speed ramps at both ends and a steady middle,
 * so a figure keeps one walking speed instead of surging mid-figure.
 */
export function progress(time: number, ramp = 0.18): number {
  const t = clamp(time);
  const n = 1 - ramp;
  if (t < ramp) {
    const u = t / ramp;
    return (ramp * (u * u * u - 0.5 * u * u * u * u)) / n;
  }
  if (t > 1 - ramp) return 1 - progress(1 - t, ramp);
  return (t - ramp / 2) / n;
}

/** Signed shortest angle from b to a, in (-pi, pi]. */
export const turn = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Angle in [0, 2pi). */
export const positiveAngle = (a: number) => {
  const v = ((a % TAU) + TAU) % TAU;
  return v > TAU - 1e-7 ? 0 : v;
};

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

/** Yaw that faces from a toward b. */
export const heading = (a: Vec2, b: Vec2) => Math.atan2(b.x - a.x, b.z - a.z);

export function sampleTime(beat: number, beats: number) {
  if (!Number.isFinite(beat)) throw new Error('Sample beat must be finite.');
  return clamp(beat, 0, beats);
}

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, z: a.z * k });
export const mix = (a: Vec2, b: Vec2, t: number): Vec2 => add(scale(a, 1 - t), scale(b, t));
export const length = (a: Vec2) => Math.hypot(a.x, a.z);
export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.z * b.z;
export const mean = (ps: readonly Vec2[]): Vec2 =>
  scale(ps.reduce(add, { x: 0, z: 0 }), 1 / ps.length);

export const rotate = (p: Vec2, a: number): Vec2 => ({
  x: p.x * Math.cos(a) - p.z * Math.sin(a),
  z: p.x * Math.sin(a) + p.z * Math.cos(a),
});

/** Polar angle of a vector in the rotate() convention. */
export const polar = (v: Vec2) => Math.atan2(v.z, v.x);

export const forward = (yaw: number): Vec2 => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
export const leftOf = (yaw: number): Vec2 => ({ x: Math.cos(yaw), z: -Math.sin(yaw) });
export const rightOf = (yaw: number): Vec2 => ({ x: -Math.cos(yaw), z: Math.sin(yaw) });

/**
 * Yaw of a body whose position rotates by `a` about a center: rotating a
 * point by +a changes the heading of any attached direction by -a.
 */
export const yawAfterRotation = (yaw: number, a: number) => yaw - a;

/** Blend yaw a toward b by t along the shortest branch. */
export const yawMix = (a: number, b: number, t: number) => a + turn(b, a) * t;
