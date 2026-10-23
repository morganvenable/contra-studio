/**
 * Lines and waves: four dancers in a straight line, each facing across it.
 */
import type { Role, Vec2 } from '../../types.ts';
import { dot, forward, mean, sub, turn } from './math.ts';
import { body, handToward, holdsBetween, roleOf, type DanceState, type Hold } from './state.ts';

export interface Line {
  /** Ids in order along `axis`. */
  readonly order: readonly number[];
  readonly axis: Vec2;
  readonly center: Vec2;
}

/** Order a group along its line, or explain why it is not one. */
export function findLine(state: DanceState, group: readonly number[]): Line {
  const points = group.map((id) => body(state, id).position);
  const center = mean(points);
  const far = group.reduce(
    (best, id) => {
      const d = sub(body(state, id).position, center);
      return Math.hypot(d.x, d.z) > Math.hypot(best.x, best.z) ? d : best;
    },
    { x: 0, z: 0 },
  );
  const size = Math.hypot(far.x, far.z);
  if (size < 1e-6) throw new Error('Dancers stand on one spot, not in a line.');
  const axis = { x: far.x / size, z: far.z / size };
  for (const id of group) {
    const b = body(state, id);
    const off = sub(b.position, center);
    if (Math.abs(off.x * axis.z - off.z * axis.x) > 0.05)
      throw new Error('Dancers are not in a straight line.');
    if (Math.abs(dot(forward(b.yaw), axis)) > 1e-6)
      throw new Error('Dancers in a wave must face across the line.');
  }
  const order = [...group].sort(
    (a, b) =>
      dot(sub(body(state, a).position, center), axis) -
      dot(sub(body(state, b).position, center), axis),
  );
  return { order, axis, center };
}

/** A wave: a line whose neighbors face opposite ways. */
export function findWave(state: DanceState, group: readonly number[]): Line {
  const line = findLine(state, group);
  for (let i = 1; i < line.order.length; i++) {
    const a = body(state, line.order[i - 1]);
    const b = body(state, line.order[i]);
    if (Math.abs(Math.abs(turn(a.yaw, b.yaw)) - Math.PI) > 1e-6) {
      throw new Error('Neighbors in a wave must face opposite ways.');
    }
  }
  return line;
}

/** The hands adjacent dancers in a line would join. */
export function lineHolds(state: DanceState, line: Line): Hold[] {
  const holds: Hold[] = [];
  for (let i = 1; i < line.order.length; i++) {
    const a = line.order[i - 1];
    const b = line.order[i];
    const pa = body(state, a);
    const pb = body(state, b);
    holds.push({ a, handA: handToward(pa, pb.position), b, handB: handToward(pb, pa.position) });
  }
  return holds;
}

/** Throw unless every adjacent pair in the wave holds hands. */
export function assertWaveHeld(state: DanceState, line: Line) {
  for (let i = 1; i < line.order.length; i++) {
    if (!holdsBetween(state, line.order[i - 1], line.order[i]).length) {
      throw new Error('Everyone in the wave must be holding hands with their neighbors in line.');
    }
  }
}

export function middleRole(state: DanceState, line: Line): Role | undefined {
  const [a, b] = [line.order[1], line.order[2]].map((id) => roleOf(state, id));
  return a === b ? a : undefined;
}
