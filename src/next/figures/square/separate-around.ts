/**
 * Separate and go around two to lines at the sides ("heads separate, go
 * around two - form lines at the sides", "heads go around 2 to form lines
 * at the sides").
 *
 * Definition: the couples named turn their backs on each other (the lark
 * to his left, the robin to her right), walk round the outside of the two
 * dancers standing on that side, and stand beyond them at the end of their
 * line, facing the way the line faces. The side couples stay where they
 * are, so each side becomes a line of four: lark, lark, robin, robin from
 * its left, the head dancers at the ends.
 * Source: Caller's Box glossary, "Separate" and "Go around one / two";
 * Tony Parkes, "Contra Dance Calling" (lines at the sides in squares);
 * ContraDB 559 notes ("This gives a gentlespoon - gentlespoon - ladle - ladle
 * line with heads at the ends"), 1335, 3263, 3264.
 * Reading: the two dancers coming round the same side couple from opposite
 * ends pass behind it on two lanes, the larks nearer the line.
 */
import type { Vec2 } from '../../../types.ts';
import type { FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { SET } from '../../core/config.ts';
import {
  add,
  distance,
  dot,
  forward,
  heading,
  leftOf,
  length,
  progress,
  rightOf,
  rotate,
  scale,
  smooth,
  sub,
  turn,
} from '../../core/math.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';

export interface SeparateAroundParams {
  /** How many dancers to go around. */
  around: 2;
  /** Where they end: at the ends of lines of four. */
  end: 'lines';
}

/** How far behind the line each role passes. */
const LANE = { lark: 0.65, robin: 1.2 } as const;
/** How far past each dancer gone around the path swings wide. */
const PAST = 0.6;
const TURN_IN = 1;
const TURN_OUT = 1.5;

/** A smooth path through the points (Catmull-Rom), sampled by arc length. */
export function pathThrough(points: readonly Vec2[]) {
  const pts = [points[0], ...points, points[points.length - 1]];
  const samples: Vec2[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    for (let k = 0; k < 40; k++) {
      const t = k / 40;
      const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
      const c = (a: number, b: number, c2: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c2) * t +
          (2 * a - 5 * b + 4 * c2 - d) * t * t +
          (-a + 3 * b - 3 * c2 + d) * t * t * t);
      samples.push({ x: c(p0.x, p1.x, p2.x, p3.x), z: c(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  samples.push(points[points.length - 1]);
  const lengths = [0];
  for (let i = 1; i < samples.length; i++)
    lengths.push(lengths[i - 1] + distance(samples[i - 1], samples[i]));
  const total = lengths[lengths.length - 1];
  // Walking headings, unwrapped so a path that curls round never jumps a turn.
  const headings: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const v = sub(samples[i], samples[i - 1]);
    const h = length(v) > 1e-9 ? heading({ x: 0, z: 0 }, v) : (headings.at(-1) ?? 0);
    headings.push(headings.length ? headings[headings.length - 1] + turn(h, headings[headings.length - 1]) : h);
  }
  const at = (u: number): { position: Vec2; walk: number } => {
    const s = Math.max(0, Math.min(1, u)) * total;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < s) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    const f = (s - lengths[i - 1]) / span;
    const a = samples[i - 1];
    const b = samples[i];
    return { position: add(a, scale(sub(b, a), f)), walk: headings[i - 1] };
  };
  return { at, total, first: headings[0], last: headings[headings.length - 1] };
}

export function separateAround(
  state: DanceState,
  params: SeparateAroundParams,
  beats: number,
): FigureResult {
  onlyKeys('separate', params, ['around', 'end']);
  if (params.around !== 2) throw new Error('Separate goes around two here.');
  oneOf('separate', 'end', params.end, ['lines'] as const);
  const movers = minorSets(state).flat();
  if (movers.length === state.dancers.length || !movers.length)
    throw new Error('Name the couples who separate.');
  const standing = state.dancers.map((d) => d.id).filter((id) => !movers.includes(id));
  const ends = new Set<string>();
  // The dancers gone around square up to face straight across.
  const square = new Map<number, number>();
  const plans = movers.map((id) => {
    const s = body(state, id);
    const lark = state.dancers[id].role === 'lark';
    // Away from the partner beside them (the lark to his left, the robin to
    // her right when facing in; the same way after a cross trail).
    const mate = movers
      .filter((o) => o !== id)
      .reduce((a, b) =>
        distance(body(state, a).position, s.position) <= distance(body(state, b).position, s.position) ? a : b,
      );
    const apart = sub(s.position, body(state, mate).position);
    const away =
      distance(body(state, mate).position, s.position) < 2.6
        ? scale(apart, 1 / length(apart))
        : lark
          ? leftOf(s.yaw)
          : rightOf(s.yaw);
    // The two standing dancers on that side, nearer first.
    const side = standing
      .filter((o) => dot(sub(body(state, o).position, s.position), away) > 0.3)
      .sort(
        (a, b) =>
          distance(body(state, a).position, s.position) -
          distance(body(state, b).position, s.position),
      )
      .slice(0, 2);
    if (side.length < 2) throw new Error('There are not two dancers to go around.');
    const [p1, p2] = side.map((o) => body(state, o));
    if (Math.abs(turn(p1.yaw, p2.yaw)) > 1 || Math.abs(distance(p1.position, p2.position) - SET.slot) > 0.3)
      throw new Error('The dancers gone around must stand side by side.');
    const along = scale(sub(p2.position, p1.position), 1 / distance(p1.position, p2.position));
    // The line faces straight across, the way the two gone around face.
    const across = rotate(along, Math.PI / 2);
    const facing = dot(across, add(forward(p1.yaw), forward(p2.yaw))) > 0 ? across : scale(across, -1);
    const lineYaw = heading({ x: 0, z: 0 }, facing);
    for (const o of side) square.set(o, lineYaw);
    const back = scale(facing, -1);
    const lane = LANE[state.dancers[id].role];
    const target = add(p2.position, scale(along, SET.slot));
    const key = `${target.x.toFixed(1)},${target.z.toFixed(1)}`;
    if (ends.has(key)) throw new Error('Two dancers would end on the same place.');
    ends.add(key);
    const path = pathThrough([
      s.position,
      add(add(p1.position, scale(back, lane)), scale(along, -PAST)),
      add(add(p2.position, scale(back, lane)), scale(along, PAST)),
      target,
    ]);
    return { id, s, path, yawEnd: lineYaw };
  });
  const motion = (beat: number) => ({
    bodies: [
      ...[...square].map(([id, yaw]) => {
        const b = body(state, id);
        return { id, position: b.position, yaw: b.yaw + turn(yaw, b.yaw) * smooth(beat / beats) };
      }),
      ...plans.map((p) => {
      const u = progress(beat / beats);
      const { position, walk } = p.path.at(u);
      // Walking headings shifted to the branch nearest the starting facing.
      const shift = p.s.yaw + turn(p.path.first, p.s.yaw) - p.path.first;
      const w = walk + shift;
      const into = smooth(beat / TURN_IN);
      const out = smooth((beat - (beats - TURN_OUT)) / TURN_OUT);
      const yaw0 = p.s.yaw + (w - p.s.yaw) * into;
      const last = p.path.last + shift;
      return { id: p.id, position, yaw: yaw0 + (last + turn(p.yawEnd, last) - yaw0) * out };
      }),
    ],
    contacts: [],
  });
  return {
    kind: 'unknown',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}
