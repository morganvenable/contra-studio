/**
 * Courtesy turn and the walk into it, shared by chains and right-and-left
 * throughs.
 *
 * A courtesy turn: the turner (on the left) puts the right hand at the
 * follower's waist and takes the follower's left hand in the left hand; the
 * pair wheels counterclockwise (seen from above) half a turn, the turner
 * backing up, and ends side by side facing the other way. Here the pair
 * wheels about the middle of its two final places at a close hold, then
 * opens out into those places.
 * Source: Caller's Box glossary, "Courtesy turn"; wheel speed and hold
 * spacing match the swing (0.6 m apart).
 */
import type { Vec2 } from '../../types.ts';
import type { FigureContact, MovedBody } from './figure.ts';
import {
  add,
  heading,
  leftOf,
  length,
  mix,
  progress,
  rightOf,
  rotate,
  scale,
  smooth,
  sub,
  turn,
} from './math.ts';
import type { Body } from './state.ts';

/** Half the turner-follower gap while wheeling. */
export const WHEEL_HALF = 0.3;
/** Points used to measure a walk's length. */
const ARC_SAMPLES = 48;
/** Share of the courtesy phase spent wheeling; the rest opens out. */
const WHEEL_SHARE = 0.7;

export interface CourtesyPair {
  readonly turner: number;
  readonly follower: number;
  /** Final places and facing; the follower ends on the turner's right. */
  readonly turnerEnd: Vec2;
  readonly followerEnd: Vec2;
  readonly yaw: number;
  /**
   * How far the pair wheels, in radians: half a turn when it arrives facing
   * out, three quarters when the follower arrives walking along the line.
   */
  readonly sweep: number;
  /** Share of the courtesy phase spent wheeling (the rest opens out); 0.7 unless set. */
  readonly wheelShare?: number;
}

/** A pair ending side by side at two places, facing `yaw`, turner on the left. */
export function courtesyPair(
  turner: number,
  follower: number,
  places: readonly [Vec2, Vec2],
  yaw: number,
  sweep = Math.PI,
): CourtesyPair {
  const right = rightOf(yaw);
  const [p, q] = places;
  const qRight = right.x * (q.x - p.x) + right.z * (q.z - p.z) > 0;
  return { turner, follower, turnerEnd: qRight ? p : q, followerEnd: qRight ? q : p, yaw, sweep };
}

function frame(pair: CourtesyPair) {
  const span = sub(pair.followerEnd, pair.turnerEnd);
  const e = scale(span, 1 / length(span));
  const middle = mix(pair.turnerEnd, pair.followerEnd, 0.5);
  return { middle, e };
}

/** Where the turner and follower stand, and face, as the wheel begins. */
export function courtesyStart(pair: CourtesyPair): { turner: Body; follower: Body } {
  const [turner, follower] = courtesyAt(pair, 0);
  return { turner, follower };
}

/** The wheel and the opening out, u in [0, 1]. */
export function courtesyAt(pair: CourtesyPair, u: number): MovedBody[] {
  const { middle, e } = frame(pair);
  const share = pair.wheelShare ?? WHEEL_SHARE;
  const w = Math.min(1, u / share);
  // Counterclockwise from above is decreasing angle in rotate().
  const angle = pair.sweep * (1 - progress(w));
  const open = smooth((u - share) / (1 - share));
  const axis = rotate(e, angle);
  const yaw = pair.yaw - angle;
  const turner = sub(middle, scale(axis, WHEEL_HALF));
  const follower = add(middle, scale(axis, WHEEL_HALF));
  return [
    { id: pair.turner, position: mix(turner, pair.turnerEnd, open), yaw },
    { id: pair.follower, position: mix(follower, pair.followerEnd, open), yaw },
  ];
}

/** Left hands joined and the turner's right hand at the follower's waist. */
export function courtesyContacts(pair: CourtesyPair, u: number): FigureContact[] {
  const share = pair.wheelShare ?? WHEEL_SHARE;
  const strength = smooth(u / 0.08) * smooth((share + 0.05 - u) / 0.1);
  if (strength <= 0) return [];
  return [
    { a: pair.turner, handA: 'left', b: pair.follower, handB: 'left', kind: 'courtesy', strength },
    {
      a: pair.turner,
      handA: 'right',
      b: pair.follower,
      handB: 'right',
      kind: 'courtesy',
      target: 'waist',
      strength,
    },
  ];
}

/**
 * A walk from `from` to `to` (s in [0, 1]), veering `veer` meters to the
 * walker's left at the middle so passing dancers go by right shoulders, or
 * passing through the points `veer`.
 * Facing turns from the start facing to the walking direction early on, and
 * to `endYaw` by the end; `turnRight` resolves an about-face to the right.
 */
export function walk(
  from: Body,
  to: Vec2,
  endYaw: number,
  veer: number | readonly Vec2[] = 0,
  turnRight = false,
): (s: number) => { position: Vec2; yaw: number } {
  const dist = length(sub(to, from.position));
  const side = dist > 1e-9 ? leftOf(heading(from.position, to)) : { x: 0, z: 0 };
  // A smooth curve through the given points, or one whose middle is offset by `veer`.
  const through =
    typeof veer === 'number' ? [add(mix(from.position, to, 0.5), scale(side, veer))] : veer;
  const points = [from.position, ...through, to];
  const curve = (q: number) => spline(points, q);
  // Walk the curve at an even pace: map distance walked back to the curve.
  const lengths = [0];
  for (let i = 1; i <= ARC_SAMPLES; i++) {
    const step = length(sub(curve(i / ARC_SAMPLES), curve((i - 1) / ARC_SAMPLES)));
    lengths.push(lengths[i - 1] + step);
  }
  const total = lengths[ARC_SAMPLES];
  const atDistance = (d: number) => {
    if (total < 1e-9) return 0;
    const i = Math.max(
      1,
      lengths.findIndex((l) => l >= d - 1e-12),
    );
    const span = lengths[i] - lengths[i - 1];
    return (i - 1 + (span > 0 ? (d - lengths[i - 1]) / span : 0)) / ARC_SAMPLES;
  };
  const travel = dist > 1e-9 ? heading(from.position, curve(0.25)) : endYaw;
  const passing = (typeof veer !== 'number' || Math.abs(veer) > 0) && dist > 1e-9;
  const toEnd = (yaw: number) => {
    const d = turn(endYaw, yaw);
    return turnRight && Math.abs(d) > Math.PI - 0.3 ? -Math.abs(d) : d;
  };
  return (s: number) => {
    const position = curve(Math.min(1, atDistance(progress(s) * total)));
    if (!passing) return { position, yaw: from.yaw + toEnd(from.yaw) * smooth(s / 0.85) };
    // Walkers who pass someone face their travel, then settle to the end facing.
    const into = from.yaw + turn(travel, from.yaw) * smooth(s / 0.25);
    const yaw = into + toEnd(into) * smooth((s - 0.55) / 0.45);
    return { position, yaw };
  };
}

/** Catmull-Rom curve through `points`, q in [0, 1]. */
function spline(points: readonly Vec2[], q: number): Vec2 {
  const n = points.length - 1;
  const at = Math.min(n - 1e-9, Math.max(0, q * n));
  const i = Math.floor(at);
  const u = at - i;
  const p0 = points[i];
  const p1 = points[i + 1];
  const tangent = (k: number) =>
    scale(
      sub(points[Math.min(n, k + 1)], points[Math.max(0, k - 1)]),
      k === 0 || k === n ? 1 : 0.5,
    );
  const m0 = tangent(i);
  const m1 = tangent(i + 1);
  const u2 = u * u;
  const u3 = u2 * u;
  return add(
    add(scale(p0, 2 * u3 - 3 * u2 + 1), scale(m0, u3 - 2 * u2 + u)),
    add(scale(p1, -2 * u3 + 3 * u2), scale(m1, u3 - u2)),
  );
}
