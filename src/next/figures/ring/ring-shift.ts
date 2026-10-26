/**
 * Move on to a new partner (one role moves round the ring): "robins turn
 * alone one place to a new partner", "robins turn alone to meet new partner
 * behind them", "move to your next partner", "larks forward & back, turn
 * over the left shoulder and go to a new partner", "larks turn & walk out
 * to next robin".
 *
 * Definition: the dancers of one role (larks or robins) leave their places
 * and walk round the ring to the place `places` dancer places to their left
 * or right (two places = one couple along), everyone else standing. They end
 * on that place of the ring, beside a new partner. Path:
 * - inside (default): a shallow curve just inside the ring, passing in
 *   front of the dancers they pass, turned to face the way they walk.
 * - center: into the middle facing in, turn over the named shoulder (the
 *   way they travel) and walk out to the new place, turning on until they
 *   face the new partner beside them (one and a half turns over that
 *   shoulder in all). A dancer already in the middle
 *   turns as they start.
 * Source: Caller's Box glossary, "Turn alone", "Circassian Circle" (men go
 * in, turn, and come out to the next lady); ContraDB rows in circle mixers
 * (dances 554, 916, 168, 2072, 1741, 1966, 915).
 * Readings: "one place" and "next partner" are one couple along (two dancer
 * places); a robin's partner "behind" her after a counterclockwise
 * promenade is on her left; a lark going to the "next" robin goes to the
 * one on his left (his corner), as in the Circassian Circle.
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import {
  add,
  ease,
  length,
  polar,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { faceIn, namedIds, placeAt, placeIndex, ringOf, sideStep } from './geometry.ts';

export interface RingShiftParams {
  who: 'larks' | 'robins';
  direction: 'left' | 'right';
  /** Dancer places along the ring (2 = one couple). */
  places?: number;
  path?: 'inside' | 'center';
}

/** How far inside the ring the inside path dips. */
const DIP = 0.7;
/** How close to the middle the center path goes. */
const NEAREST = 0.9;
/** Share of the figure spent turning toward the way of travel (inside path). */
const TURN_SHARE = 0.3;

export const ringShift: Figure<RingShiftParams> = (state, params, beats) => {
  onlyKeys('ring shift', params, ['who', 'direction', 'places', 'path']);
  const who = oneOf('ring shift', 'who', params.who, ['larks', 'robins'] as const);
  const direction = oneOf('ring shift', 'direction', params.direction, ['left', 'right'] as const);
  const path = oneOf('ring shift', 'path', params.path ?? 'inside', ['inside', 'center'] as const);
  const places = params.places ?? 2;
  if (!(Number.isInteger(places) && places >= 1)) throw new Error('A ring shift moves whole places.');
  const ring = ringOf(state);
  if (places >= ring.places.length) throw new Error('A ring shift moves less than once round.');
  const step = sideStep(ring, direction);
  // Walking to the left while facing in is clockwise from above: rotate(+).
  const sense = direction === 'left' ? 1 : -1;
  const plans = namedIds(state, who).map((id) => {
    const s = body(state, id);
    const rel = sub(s.position, ring.center);
    const r0 = length(rel);
    if (r0 < 0.5) throw new Error('A ring shift starts from round the ring.');
    const from = placeIndex(ring, s.position);
    const target = placeAt(ring, from + step * places);
    let sweep = polar(sub(target, ring.center)) - polar(rel);
    // The sweep runs the way of travel, the right number of places.
    sweep = ((sweep % TAU) + TAU) % TAU;
    if (sense < 0) sweep -= TAU;
    if (Math.abs(sweep) < 1e-9) sweep = sense * TAU;
    const startTwist = turn(s.yaw, faceIn(ring, s.position));
    const inside = r0 < ring.radius - 0.3;
    const depth = path === 'inside' ? DIP : Math.max(DIP, Math.min(r0, ring.radius) - NEAREST);
    return { id, s, r0, rel, sweep, target, startTwist, depth, inside };
  });
  const at = (p: (typeof plans)[number], t: number) => {
    const angle = p.sweep * progress(t);
    const r = p.r0 + (ring.radius - p.r0) * ease(t) - p.depth * Math.sin(Math.PI * t);
    const dir = rotate(scale(p.rel, 1 / p.r0), angle);
    const position = add(ring.center, scale(dir, r));
    const inward = faceIn(ring, position);
    let twist: number;
    if (path === 'inside') {
      // A dancer starting turned away (facing out after a turn alone) unwinds
      // over a longer share, at a walking turn rate.
      const share = Math.min(0.45, Math.max(TURN_SHARE, (1.5 * Math.abs(p.startTwist)) / (2.5 * beats)));
      const bump = Math.min(smooth(t / share), smooth((1 - t) / TURN_SHARE));
      twist = p.startTwist * (1 - smooth(t / share)) + sense * (Math.PI / 2) * bump;
    } else {
      // In facing in, turn over the shoulder in the middle and on, walking
      // out, to face the new partner: one and a half turns in all.
      const turning = p.inside ? smooth(t) : smooth((t - 0.3) / 0.7);
      twist = p.startTwist * (1 - smooth(t / 0.3)) + sense * 1.5 * Math.PI * turning;
    }
    return { id: p.id, position, yaw: inward + twist };
  };
  const motion = (beat: number) => {
    const t = beat / beats;
    if (t <= 0) return { bodies: plans.map((p) => ({ id: p.id, ...p.s })), contacts: [] };
    if (t >= 1) {
      return {
        bodies: plans.map((p) => {
          const end = at(p, 1);
          return { id: p.id, position: p.target, yaw: end.yaw };
        }),
        contacts: [],
      };
    }
    return { bodies: plans.map((p) => at(p, t)), contacts: [] };
  };
  return {
    kind: 'unknown',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
