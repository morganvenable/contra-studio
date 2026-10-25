/**
 * Pass through and cross trail, for two couples facing across a square
 * ("heads pass through and cross trail").
 *
 * Definition: the two couples named walk straight across the square,
 * passing the opposite couple by right shoulders in the middle, and as they
 * come to the far side partners cross over, the robin in front of the lark,
 * so each ends on the far side of the square on the other side from where
 * they started, facing out (ready to go around the dancers there).
 * Source: Caller's Box glossary, "Pass through" and "Cross trail"; ContraDB
 * 558 (Roll Away: "heads pass through and cross trail", then "go around 2
 * to form lines at the sides").
 * Reading: the cross trail is part of the same walk (the robin a step
 * ahead, crossing in front of the lark), so the row ends with each head dancer where the point opposite
 * them across the square is, facing out.
 */
import type { FigureResult } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { RING_CENTER } from '../../core/formation-ring.ts';
import {
  add,
  distance,
  dot,
  heading,
  length,
  mean,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../../core/math.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';
import { pathThrough } from './separate-around.ts';

export type CrossTrailParams = Record<string, never>;

/** Beats to turn from facing in to facing across. */
const TURN_BEATS = 1.5;
/** How far each passes to the right of the one coming the other way. */
const SHIFT = 0.4;
/** Where along the way (from the center) each role crosses over. */
const CROSS = { robin: [1.0, 1.6], lark: [1.7, 2.2] } as const;
/** The robin walks a little ahead of the lark, so she crosses in front of him. */
const LEAD = 0.2;

export function crossTrail(state: DanceState, params: CrossTrailParams, beats: number): FigureResult {
  onlyKeys('pass through and cross trail', params, []);
  const ids = minorSets(state).flat();
  if (ids.length !== 4) throw new Error('Two couples pass through and cross trail.');
  const plans = ids.map((id) => {
    const s = body(state, id);
    const mate = ids
      .filter((o) => o !== id)
      .reduce((a, b) =>
        distance(body(state, a).position, s.position) <= distance(body(state, b).position, s.position) ? a : b,
      );
    const c = sub(mean([s.position, body(state, mate).position]), RING_CENTER);
    const r = length(c);
    if (r < 1) throw new Error('The couples start on their sides of the square.');
    const out = scale(c, 1 / r);
    const d = scale(out, -1);
    const w = { x: -out.z, z: out.x };
    const y0 = dot(sub(s.position, add(RING_CENTER, c)), w);
    const walkYaw = heading({ x: 0, z: 0 }, d);
    const right = Math.sign(dot(rightOf(walkYaw), w)) * SHIFT;
    const at = (a: number, b: number) => add(RING_CENTER, add(scale(d, a), scale(w, b)));
    const robin = state.dancers[id].role === 'robin';
    const [from, to] = CROSS[state.dancers[id].role];
    const path = pathThrough([
      s.position,
      at(-0.8, y0 + right),
      at(Math.min(from, r - 0.9), y0 + right),
      at(Math.min(to, r), -y0),
      ...(to < r ? [at(r, -y0)] : []),
    ]);
    const start = robin ? 0 : LEAD;
    return { id, s, path, endYaw: walkYaw, start };
  });
  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      // Facing straight across the square all the way; the crossing is a
      // sideways drift as they walk.
      const { position } = p.path.at(progress((beat / beats - p.start) / (1 - LEAD)));
      return { id: p.id, position, yaw: p.s.yaw + turn(p.endYaw, p.s.yaw) * smooth(beat / TURN_BEATS) };
    }),
    contacts: [],
  });
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}
