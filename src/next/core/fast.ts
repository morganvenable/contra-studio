/**
 * Styled fast moves: a figure the source asks for faster than a walk (a
 * full promenade home in 8 beats, a ring going half round in 2) keeps its
 * reading and is marked styled, so the physical check reports its speed
 * instead of failing it (the owner's styled-motion rule). The limits do not
 * change; a figure only uses this after its own gentlest path still runs.
 */
import type { Vec2 } from '../../types.ts';
import { LIMITS } from './config.ts';
import type { Styling } from './figure.ts';

/** Fastest any dancer moves (m/beat), sampled every 0.05 beat. */
export function peakSpeed(
  motion: (beat: number) => { bodies: readonly { id: number; position: Vec2 }[] },
  beats: number,
): number {
  const dt = 0.05;
  let peak = 0;
  let before = new Map(motion(0).bodies.map((b) => [b.id, b.position]));
  for (let beat = dt; beat <= beats + 1e-9; beat += dt) {
    const now = new Map(motion(beat).bodies.map((b) => [b.id, b.position]));
    for (const [id, p] of now) {
      const q = before.get(id);
      if (q) peak = Math.max(peak, Math.hypot(p.x - q.x, p.z - q.z) / dt);
    }
    before = now;
  }
  return peak;
}

/** The styling to return when the motion is faster than a walk, else nothing. */
export function fastStyling(
  name: string,
  motion: (beat: number) => { bodies: readonly { id: number; position: Vec2 }[] },
  beats: number,
): { styled?: Styling } {
  return peakSpeed(motion, beats) > LIMITS.maximumSpeed ? { styled: { name, fast: true } } : {};
}
