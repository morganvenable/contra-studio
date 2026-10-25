/**
 * Ring geometry shared by the ring figures. A ring figure runs on the whole
 * ring at true positions (wholeSetMove), but layout.ts hands it a state
 * without the layout, so the ring is found again from where everyone
 * stands: its center is the middle of all dancers, its places are the
 * starting ring's places (formation-ring.ts ringPlaces), SET.slot apart.
 */
import type { Vec2 } from '../../../types.ts';
import { ringPlaces, ringRadius } from '../../core/formation-ring.ts';
import { distance, heading, mean, polar, positiveAngle, sub, TAU } from '../../core/math.ts';
import { body, type DanceState } from '../../core/state.ts';

export interface RingFrame {
  readonly center: Vec2;
  readonly radius: number;
  /** Places of the ring, in increasing polar angle. */
  readonly places: readonly Vec2[];
  /** Polar angle of place 0; place j is at phase + j * step. */
  readonly phase: number;
  readonly step: number;
}

/** The ring everyone stands on (or near): center, radius and places. */
export function ringOf(state: DanceState): RingFrame {
  const ids = state.dancers.map((d) => d.id);
  const n = ids.length;
  if (n < 6) throw new Error('A ring figure needs a ring of at least three couples.');
  const center = mean(ids.map((id) => body(state, id).position));
  const radius = ringRadius(n);
  // The places of the starting ring, or the square's (centered on the sides),
  // whichever the dancers stand on.
  const options = [false, true].map((paired) => ringPlaces(n, center, paired).map((b) => b.position));
  const score = (places: Vec2[]) =>
    ids.reduce(
      (s, id) => s + Math.min(...places.map((p) => distance(p, body(state, id).position))),
      0,
    );
  const best = score(options[0]) <= score(options[1]) ? options[0] : options[1];
  const places = [...best].sort((a, b) => polar(sub(a, center)) - polar(sub(b, center)));
  return { center, radius, places, phase: polar(sub(places[0], center)), step: TAU / n };
}

/** Index of the ring place nearest a point, by angle round the center. */
export function placeIndex(ring: RingFrame, p: Vec2): number {
  const a = positiveAngle(polar(sub(p, ring.center)) - ring.phase);
  return Math.round(a / ring.step) % ring.places.length;
}

export const placeAt = (ring: RingFrame, j: number): Vec2 => {
  const n = ring.places.length;
  return ring.places[((j % n) + n) % n];
};

/** Yaw facing the center of the ring from p. */
export const faceIn = (ring: RingFrame, p: Vec2) => heading(p, ring.center);

/** Place-index step (+1 or -1) toward a dancer's left or right while facing in. */
export function sideStep(ring: RingFrame, side: 'left' | 'right'): 1 | -1 {
  const p0 = ring.places[0];
  const p1 = ring.places[1 % ring.places.length];
  const yaw = faceIn(ring, p0);
  // leftOf(yaw) = (cos yaw, -sin yaw)
  const left = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  const v = sub(p1, p0);
  const plusIsLeft = v.x * left.x + v.z * left.z > 0;
  return (side === 'left') === plusIsLeft ? 1 : -1;
}

/** The ids `who` names: a role group, or everyone. */
export function namedIds(state: DanceState, who: string | undefined): number[] {
  if (who === undefined || who === 'all') return state.groups.flat();
  const role = who === 'larks' ? 'lark' : who === 'robins' ? 'robin' : undefined;
  if (!role) throw new Error(`Ring figures name larks, robins or all; got ${who}.`);
  return state.groups.flat().filter((id) => state.dancers[id].role === role);
}
