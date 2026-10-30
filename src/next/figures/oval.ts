/**
 * Big oval (whole-set circle) left or right.
 *
 * Definition: everyone in the set joins hands in one long ring: along each
 * side line, and across each end of the set. Facing in, the ring moves to
 * the left (clockwise seen from above) or right a number of places, each
 * dancer walking along the side lines and across the ends to a place
 * another dancer stood in. Usually "oval left" then "oval right" the same
 * number of places, back home.
 * Source: ContraDB rows "entire set oval left", "entire set oval right",
 * "big oval circle right/left". The source gives no amount: the ring moves
 * one place every two beats (a walk). Hands join where they reach: along a
 * side line dancers stand a slot (1.8 m) apart, so the drawn hands fade at
 * full stretch rather than pull anyone out of place.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import { clamp, heading, progress, smooth, turn } from '../core/math.ts';
import { body, withChanges } from '../core/state.ts';
import { fastStyling } from '../core/fast.ts';

export interface OvalParams {
  direction: 'left' | 'right';
  /** Places around the oval; one place is one slot. Or `half`: half way round. */
  places?: number;
  half?: boolean;
  /**
   * `travel` for a promenade along the set: no hands, everyone facing the
   * way they walk, single file around the oval. Otherwise facing in, hands
   * joined.
   */
  facing?: 'in' | 'travel';
}

const FACE_BEATS = 1;
/** Radians a beat, at most, turning to face the way the oval goes. */
const TURN_RATE = 2.5;
/** How far behind and ahead a walker looks to face along the oval (smooths the corners). */
const LOOK = 0.7;

export const oval: Figure<OvalParams> = (state, params, beats) => {
  onlyKeys('oval', params, ['direction', 'places', 'half', 'facing']);
  const direction = oneOf('oval', 'direction', params.direction, ['left', 'right'] as const);
  const travelFacing = params.facing === 'travel';
  if (params.facing !== undefined) oneOf('oval', 'facing', params.facing, ['in', 'travel'] as const);
  if (!params.half && !(Number.isInteger(params.places) && params.places! >= 1))
    throw new Error('An oval moves a whole number of places.');
  if (state.hands.length) throw new Error('An oval starts with free hands.');
  const ids = state.dancers.map((d) => d.id);
  const zs = ids.map((id) => body(state, id).position.z);
  const top = Math.min(...zs);
  const bottom = Math.max(...zs);
  const length = bottom - top;
  const w = SET.halfWidth;
  const perimeter = 2 * length + 4 * w;

  // Distance along the oval, increasing the way a circle left goes (core/math.ts):
  // down the east line, west across the bottom, up the west line, east across the top.
  const along = (p: Vec2): number => {
    if (Math.abs(p.x - w) < 0.05) return p.z - top;
    if (Math.abs(p.x + w) < 0.05) return length + 2 * w + (bottom - p.z);
    throw new Error('An oval starts with everyone on the side lines.');
  };
  const at = (s: number): Vec2 => {
    const u = ((s % perimeter) + perimeter) % perimeter;
    if (u <= length) return { x: w, z: top + u };
    if (u <= length + 2 * w) return { x: w - (u - length), z: bottom };
    if (u <= 2 * length + 2 * w) return { x: -w, z: bottom - (u - length - 2 * w) };
    return { x: -w + (u - 2 * length - 2 * w), z: top };
  };
  // Facing in: toward the nearest point of the set's middle line, kept a
  // half slot inside the ends so the ends turn smoothly.
  const inward = (p: Vec2) =>
    heading(p, { x: 0, z: clamp(p.z, top + SET.slot / 2, bottom - SET.slot / 2) });

  const sign = direction === 'left' ? 1 : -1;
  const places = params.half ? state.dancers.length / 2 : params.places!;
  if (!Number.isInteger(places)) throw new Error('Half an oval must land on places.');
  const travel = sign * places * SET.slot;
  const movers = ids.map((id) => {
    const s = body(state, id);
    const from = along(s.position);
    if (Math.abs(from / SET.slot - Math.round(from / SET.slot)) > 0.05)
      throw new Error('An oval needs everyone a slot apart around the set.');
    // A dancer with farther to turn (round from the way the last oval went)
    // takes longer, at a walking turn rate.
    const face0 = travelFacing
      ? heading(at(from - sign * LOOK), at(from + sign * LOOK))
      : inward(s.position);
    const turnBeats = (1.5 * Math.abs(turn(face0, s.yaw))) / TURN_RATE;
    const faceBeats = Math.min(beats / 3, Math.max(FACE_BEATS, turnBeats));
    return { id, s, from, faceBeats };
  });
  // Ring order: by distance along the oval; each one's left hand to the next.
  const order = [...movers].sort((a, b) => a.from - b.from).map((m) => m.id);
  const holds = order.map((id, i) => ({
    a: id,
    handA: 'left' as const,
    b: order[(i + 1) % order.length],
    handB: 'right' as const,
  }));

  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = movers.map((m) => {
      const position = at(m.from + travel * q);
      // Walking along the oval: the heading from just behind to just ahead.
      const face = travelFacing
        ? heading(at(m.from + travel * q - sign * LOOK), at(m.from + travel * q + sign * LOOK))
        : inward(position);
      // Turn toward the way of travel as it keeps turning round the ends,
      // followed continuously (not the short way at each moment, which
      // flips round the end of the oval).
      const faceAt = (u: number) =>
        travelFacing
          ? heading(at(m.from + travel * u - sign * LOOK), at(m.from + travel * u + sign * LOOK))
          : inward(at(m.from + travel * u));
      let swept = 0;
      const steps = 24;
      for (let i = 1; i <= steps; i++) swept += turn(faceAt((q * i) / steps), faceAt((q * (i - 1)) / steps));
      const target = m.s.yaw + turn(faceAt(0), m.s.yaw) + swept;
      const yaw = m.s.yaw + (target - m.s.yaw) * smooth(beat / m.faceBeats);
      return { id: m.id, position, yaw: beat >= m.faceBeats ? face : yaw };
    });
    const t = beat / beats;
    const strength = Math.min(smooth(t / 0.1), smooth((1 - t) / 0.1));
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = travelFacing
      ? []
      : holds.map((h) => withinReach(joined(h, strength), map));
    return { bodies, contacts };
  };
  return {
    kind: 'circle',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
    // Half way round a long set in 8 beats is more than a walk: a styled
    // brisk promenade along the set (core/fast.ts).
    ...(params.half ? fastStyling('brisk oval', motion, beats) : {}),
  };
};
