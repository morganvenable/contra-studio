/**
 * Hey for four (across the set), full or half.
 *
 * Definition: the four dancers of a minor set weave past each other along a
 * line across the set, alternating shoulders: the two in the middle pass
 * each other ("rights in center" passes right shoulders), then each passes
 * the dancer coming in from the end of the line by the other shoulder
 * ("lefts on ends"), and so on. Dancers at the ends loop around to come back
 * in. A half hey is four passes (everyone ends on the other side), a full hey
 * eight (everyone ends where they started). "Robins start" means the robins
 * make the first pass, in the middle; "partners start" means partners make
 * the first pass, on the ends.
 * The hey line runs between the two dancers who pass first in the middle,
 * so they meet head on; in lines facing across they stand on a diagonal.
 * Source: Caller's Box glossary, "Hey"; ContraDB rows "ladles start a full
 * hey - rights in center, lefts on ends", "partners start a half hey - rights
 * on ends, lefts in center". Track ported from the serpentine pass kernel in
 * src/hey.ts (slot spacing 1.1, shoulder gates 0.66 apart, C2 quintic
 * passes, outside loops at the ends). Dancers step from their places onto
 * the line during the first beats and back out to places, facing across, at
 * the end: the dancer ending in a slot takes the place that slot started from.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import type { Role } from '../../types.ts';
import { add, dot, heading, length, mix, scale, smooth, sub, turn } from '../core/math.ts';
import {
  body,
  groupCenter,
  minorSets,
  roleOf,
  withChanges,
  type DanceState,
} from '../core/state.ts';

export interface HeyParams {
  /** Who makes the first pass: a role (in the middle) or a relationship (on the ends). */
  start: 'robins' | 'larks' | 'partner' | 'neighbor';
  /** 0.5 for a half hey, 1 for a full hey. */
  amount: number;
  /** Shoulder passed in the middle; the ends pass by the other shoulder. */
  center: 'right' | 'left';
}

/** Distance between neighboring places on the hey line. */
const SPACING = 0.9;
/** Half the gap between two dancers as they pass shoulder to shoulder. */
const GATE = 0.4;
/** Beats spent stepping onto the line at the start and back to places at the end. */
const ENTRY = 3.5;
/** The ends step onto the line a little after the middle two set off. */
const END_DELAY = 0.75;
const FACE_BEATS = 1;
/** The first pass's share of time, against 1 for each other pass. */
const FIRST_WEIGHT = 1.75;
const SLOTS = [-1.5, -0.5, 0.5, 1.5];

type Phase = 'center' | 'sides';

export const hey: Figure<HeyParams> = (state, params, beats) => {
  onlyKeys('hey', params, ['start', 'amount', 'center']);
  const start = oneOf('hey', 'start', params.start, [
    'robins',
    'larks',
    'partner',
    'neighbor',
  ] as const);
  const center = oneOf('hey', 'center', params.center, ['right', 'left'] as const);
  if (params.amount !== 0.5 && params.amount !== 1)
    throw new Error('A hey goes half way (0.5) or all the way (1).');
  const passes = params.amount === 1 ? 8 : 4;
  const first: Phase = start === 'robins' || start === 'larks' ? 'center' : 'sides';
  const phases: Phase[] = Array.from({ length: passes }, (_, i) =>
    (i % 2 === 0) === (first === 'center') ? 'center' : 'sides',
  );
  const sign = center === 'right' ? 1 : -1;
  // The first pass takes longer: the middle two walk in from their places.
  const weights = phases.map((_, i) => (i === 0 ? FIRST_WEIGHT : 1));
  const unit = beats / weights.reduce((a, b) => a + b, 0);
  const starts = weights.map((_, i) => weights.slice(0, i).reduce((a, b) => a + b, 0) * unit);

  if (start === 'partner' || start === 'neighbor')
    throw new Error('A hey started by partners or neighbors on the ends is not built yet.');
  const role = start === 'larks' ? 'lark' : 'robin';

  const lines = minorSets(state).map((g) => {
    const middle = groupCenter(state, g);
    const { order, axis } = entryOrder(state, g, middle, role, sign);
    const places = order.map((id) => body(state, id).position);
    // Slot order after each pass, and the order at the start of each pass.
    const orders: number[][] = [order];
    for (const phase of phases) {
      const o = [...orders.at(-1)!];
      if (phase === 'center') [o[1], o[2]] = [o[2], o[1]];
      else [o[0], o[1], o[2], o[3]] = [o[1], o[0], o[3], o[2]];
      orders.push(o);
    }
    // The middle two walk straight from their places into the first pass.
    const reach = Math.abs(dot(sub(places[1], middle), axis));
    return { middle, orders, places, axis, reach };
  });

  /** Track position and velocity for whoever is in `slot` during pass `index`. */
  /** `reach`: how far out along the line the first pass's middle two start. */
  const track = (index: number, slot: number, u: number, reach: number) => {
    const phase = phases[index];
    const firstMiddle = index === 0 && phase === 'center' && (slot === 1 || slot === 2);
    const x0 = firstMiddle ? Math.sign(SLOTS[slot]) * reach : SLOTS[slot] * SPACING;
    if (phase === 'center' && (slot === 0 || slot === 3)) {
      // Ends loop around outside the line while the middle two pass.
      const side = slot === 0 ? -1 : 1;
      const a = Math.PI * u;
      return {
        p: { x: x0 + side * GATE * Math.sin(a), z: side * GATE * sign * Math.cos(a) },
        v: {
          x: side * GATE * Math.PI * Math.cos(a),
          z: -side * GATE * sign * Math.PI * Math.sin(a),
        },
      };
    }
    const direction = phase === 'center' ? (slot === 1 ? 1 : -1) : slot % 2 === 0 ? 1 : -1;
    const outward = phase === 'sides' && (slot === 1 || slot === 2);
    const inward = phase === 'sides' && !outward;
    const target = phase === 'center' ? 3 - slot : slot + (slot % 2 === 0 ? 1 : -1);
    const x1 = SLOTS[target] * SPACING;
    const X = quintic(
      x0,
      x1,
      direction * (inward ? GATE * Math.PI : SPACING),
      direction * (outward ? GATE * Math.PI : SPACING),
      u,
    );
    let Z: { p: number; v: number };
    if (phase === 'center') {
      const theta = (Math.PI * (SLOTS[slot] * SPACING + direction * SPACING * u)) / SPACING;
      Z = {
        p: -direction * GATE * sign * Math.cos(theta),
        v: GATE * sign * Math.PI * Math.sin(theta),
      };
    } else {
      const z0 = inward ? direction * GATE * sign : 0;
      const z1 = outward ? direction * GATE * sign : 0;
      const mid = direction * GATE * sign;
      Z =
        u <= 0.5
          ? quinticSpan(z0, mid, outward ? direction * GATE * sign * Math.PI : 0, 0, 0.5, u)
          : quinticSpan(mid, z1, 0, inward ? -direction * GATE * sign * Math.PI : 0, 0.5, u - 0.5);
    }
    return { p: { x: X.p, z: Z.p }, v: { x: X.v, z: Z.v } };
  };

  const motion = (beat: number) => {
    const t = Math.max(0, Math.min(beats, beat));
    const index = Math.max(
      0,
      starts.findLastIndex((b) => b <= t),
    );
    const u = Math.min(1, (t - starts[index]) / (weights[index] * unit));
    const out = smooth((t - (beats - ENTRY)) / ENTRY);
    const bodies = lines.flatMap((line) =>
      line.orders[index].map((id, slot) => {
        const { p, v } = track(index, slot, u, line.reach);
        const onTrack = add(line.middle, toSet(p, line.axis));
        const s = body(state, id);
        // Those who start in the middle step onto the line at once; the ends
        // follow once the middle has cleared their way.
        const starter = line.orders[0].indexOf(id) === 1 || line.orders[0].indexOf(id) === 2;
        const into = starter ? 1 : smooth((t - END_DELAY) / ENTRY);
        // The dancer ending in a slot steps out to the place that slot started from.
        const finalSlot = line.orders[passes].indexOf(id);
        const place = line.places[finalSlot];
        let position = mix(s.position, onTrack, into);
        position = mix(position, place, out);
        const dir = toSet(v, line.axis);
        const travel = Math.atan2(dir.x, dir.z);
        const across = heading(place, { x: line.middle.x, z: place.z });
        let yaw = s.yaw + turn(travel, s.yaw) * (starter ? smooth(t / FACE_BEATS) : into);
        yaw += turn(across, yaw) * out;
        return { id, position, yaw };
      }),
    );
    return { bodies, contacts: [] };
  };
  return { kind: 'hey', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};

/** Line coordinates (x along the hey line, z to its left side) to set coordinates. */
function toSet(p: Vec2, axis: Vec2): Vec2 {
  const normal = { x: -axis.z, z: axis.x };
  return { x: axis.x * p.x + normal.x * p.z, z: axis.z * p.x + normal.z * p.z };
}

/**
 * The hey line runs between the two dancers who start in the middle (the
 * named role, one on each side of the set), so they meet head on. Slots 0-3
 * run along it; the others take the end slots on the side of the line where
 * the track begins each end's loop.
 */
function entryOrder(
  state: DanceState,
  group: readonly number[],
  middle: Vec2,
  role: Role,
  sign: number,
): { order: number[]; axis: Vec2 } {
  const mids = group.filter((id) => roleOf(state, id) === role);
  const ends = group.filter((id) => roleOf(state, id) !== role);
  if (mids.length !== 2 || ends.length !== 2)
    throw new Error(`A hey started by the ${role}s needs two of them and two others.`);
  const [a, b] = mids.map((id) => body(state, id).position);
  if (Math.sign(a.x - middle.x) === Math.sign(b.x - middle.x))
    throw new Error(`The ${role}s must start on opposite sides of the set.`);
  const span = sub(b, a);
  const axis = scale(span, 1 / length(span));
  const normal = { x: -axis.z, z: axis.x };
  const side = (id: number) => dot(sub(body(state, id).position, middle), normal);
  // Slot 3's loop starts on the +sign side of the line, slot 0's on the other.
  const [end0, end3] = side(ends[0]) * sign < side(ends[1]) * sign ? ends : [ends[1], ends[0]];
  return { order: [end0, mids[0], mids[1], end3], axis };
}

/** C2 quintic from (p0, v0) to (p1, v1) over unit time, zero end accelerations. */
function quintic(p0: number, p1: number, v0: number, v1: number, u: number) {
  return quinticSpan(p0, p1, v0, v1, 1, u);
}

function quinticSpan(p0: number, p1: number, v0: number, v1: number, span: number, time: number) {
  const u = Math.max(0, Math.min(1, time / span));
  const d = p1 - p0;
  const V0 = v0 * span;
  const V1 = v1 * span;
  const c = [
    p0,
    V0,
    0,
    10 * d - 6 * V0 - 4 * V1,
    -15 * d + 8 * V0 + 7 * V1,
    6 * d - 3 * V0 - 3 * V1,
  ];
  const p = c.reduce((s, k, i) => s + k * u ** i, 0);
  const v = c.reduce((s, k, i) => s + (i ? (i * k * u ** (i - 1)) / span : 0), 0);
  return { p, v };
}
