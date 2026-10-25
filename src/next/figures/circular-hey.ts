/**
 * Circular hey ("partners start a full circular hey - rights across, lefts
 * along").
 *
 * Definition: the four dancers of a minor set, standing around their ring
 * of places, weave around it like a grand right and left without hands:
 * the named pair starts by passing each other by the named shoulder, and
 * everyone keeps walking the way they started, one place at a time,
 * passing whoever they meet by alternate shoulders. A full circular hey is
 * four changes (everyone back home), a half two; "three changes" is three.
 * Dancers step out of or into the ring to pass, facing the way they walk.
 * Source: ContraDB rows "partners start a full circular hey - rights
 * across, lefts along - and end next to next neighbors", "three changes of
 * a circular hey - neighbors pass right along, partners pass left across".
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import {
  add,
  dot,
  leftOf,
  length,
  polar,
  positiveAngle,
  progress,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { findRing } from '../core/ring.ts';
import { body, counterpart, minorSets, withChanges } from '../core/state.ts';

export interface CircularHeyParams {
  /** The pair that passes first. */
  start: 'partner' | 'neighbor' | 'larks' | 'robins';
  /** Shoulder of the first pass; the passes alternate. */
  shoulder: 'right' | 'left';
  /** Places each dancer moves: 4 for a full circular hey. */
  changes: number;
}

/** How far out of (or into) the ring dancers step to pass. */
const SWING_OUT = 0.27;
/** Share of each leg spent turning onto it, and onto the next. */
const CORNER = 0.25;
const FACE_BEATS = 1;

export const circularHey: Figure<CircularHeyParams> = (state, params, beats) => {
  onlyKeys('circular hey', params, ['start', 'shoulder', 'changes']);
  const start = oneOf('circular hey', 'start', params.start, [
    'partner',
    'neighbor',
    'larks',
    'robins',
  ] as const);
  const shoulder = oneOf('circular hey', 'shoulder', params.shoulder, ['right', 'left'] as const);
  const changes = params.changes;
  if (!(Number.isInteger(changes) && changes >= 1 && changes <= 8))
    throw new Error('A circular hey goes a whole number of changes, 1 to 8.');

  const plans = minorSets(state).flatMap((g) => {
    const ring = findRing(state, g, 'circular hey');
    return ring.order.map((id) => {
      const other = counterpart(state, id, start, g);
      if (other === undefined || !g.includes(other))
        throw new Error(`Each dancer needs a ${start} here to start the circular hey.`);
      const from = body(state, id);
      const rel = sub(from.position, ring.center);
      const a0 = polar(rel);
      const toward = positiveAngle(polar(sub(body(state, other).position, ring.center)) - a0);
      if (Math.abs(toward - TAU / 4) > 0.5 && Math.abs(toward - (3 * TAU) / 4) > 0.5)
        throw new Error(`The ${start} must stand next to each other around the ring.`);
      // Walk the short way toward the first person passed.
      const dir = toward < Math.PI ? 1 : -1;
      return { id, from, center: ring.center, r0: length(rel), a0, dir };
    });
  });

  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      const u = progress(beat / beats, 0.1);
      const steps = changes * u;
      const k = Math.min(changes - 1, Math.floor(steps));
      const f = steps - k;
      // Straight from place to place, stepping aside to pass in the middle.
      const placeAt = (n: number) => {
        const a = p.a0 + (p.dir * n * TAU) / 4;
        return add(p.center, scale({ x: Math.cos(a), z: Math.sin(a) }, p.r0));
      };
      const from = placeAt(k);
      const to = placeAt(k + 1);
      const walk = sub(to, from);
      const yawOf = (n: number) => {
        const d = sub(placeAt(n + 1), placeAt(n));
        return Math.atan2(d.x, d.z);
      };
      const walkYaw = yawOf(k);
      // Round each corner: half way to the next leg's heading at each place.
      const corner = (n: number) => yawOf(n) + turn(yawOf(n + 1), yawOf(n)) / 2;
      const heading =
        f < CORNER && k > 0
          ? corner(k - 1) + turn(walkYaw, corner(k - 1)) * smooth(f / CORNER)
          : f > 1 - CORNER && k < changes - 1
            ? walkYaw + turn(corner(k), walkYaw) * smooth((f - (1 - CORNER)) / CORNER)
            : walkYaw;
      const mid = scale(add(from, to), 0.5);
      const radial = scale(sub(mid, p.center), 1 / length(sub(mid, p.center)));
      const thisShoulder = k % 2 === 0 ? shoulder : shoulder === 'right' ? 'left' : 'right';
      // Passing by the right shoulder, step to your left (and vice versa).
      const out = Math.sign(dot(leftOf(walkYaw), radial)) * (thisShoulder === 'right' ? 1 : -1);
      const swing = Math.sin(Math.PI * f) * (steps >= changes ? 0 : 1);
      const position = add(add(from, scale(walk, f)), scale(radial, out * SWING_OUT * swing));
      const into = smooth(beat / FACE_BEATS);
      return { id: p.id, position, yaw: p.from.yaw + turn(heading, p.from.yaw) * into };
    }),
    contacts: [],
  });
  return { kind: 'hey', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
