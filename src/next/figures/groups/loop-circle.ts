/**
 * Circle hands all round a set that is not a ring ("circle left 9 places,
 * hands nine").
 *
 * Definition: everyone in the set joins hands in one ring and circles left
 * (clockwise seen from above) or right a number of places; one place is one
 * dancer's spacing round the ring. Dancers standing in some other shape (a
 * horseshoe, two side lines and an end) close into an even ring first and
 * open back out at the end, each to the place of the dancer that many
 * places on round the loop.
 * Source: ContraDB 3294 and 3295 (Millenium Bug), "circle left 9 places
 * (hands nine)", "circle left 4 places (hands nine)"; Caller's Box glossary,
 * "Circle".
 * Reading: hands joined 1.2 m apart round the ring; the ring keeps the
 * middle of the set as its center.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { add, heading, polar, progress, scale, smooth, sub, TAU } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { everyone, hold, inOut, setCenter, steer } from './common.ts';

export interface LoopCircleParams {
  direction: 'left' | 'right';
  places: number;
}

/** Spacing round the ring, hands joined. */
export const HANDS_SPACING = 1.2;
/** Beats to close into the ring, and to open out. */
const EDGE_BEATS = 2.5;

export const ringRadiusFor = (n: number) => HANDS_SPACING / (2 * Math.sin(Math.PI / n));

const dir = (a: number): Vec2 => ({ x: Math.cos(a), z: Math.sin(a) });

export const loopCircle: Figure<LoopCircleParams> = (state, params, beats) => {
  onlyKeys('circle', params, ['direction', 'places']);
  const direction = oneOf('circle', 'direction', params.direction, ['left', 'right'] as const);
  const places = params.places;
  if (!(Number.isInteger(places) && places > 0)) throw new Error('A circle goes a whole number of places.');
  if (state.hands.length) throw new Error('A circle starts with free hands.');
  const ids = everyone(state);
  const n = ids.length;
  if (places > 2 * n) throw new Error('A circle goes at most twice round.');
  const c = setCenter(state);
  const order = [...ids].sort(
    (a, b) => polar(sub(body(state, a).position, c)) - polar(sub(body(state, b).position, c)),
  );
  const angles = order.map((id) => polar(sub(body(state, id).position, c)));
  const step = TAU / n;
  const base = angles.reduce((s, a, i) => s + a - i * step, 0) / n;
  const radius = ringRadiusFor(n);
  const sign = direction === 'left' ? 1 : -1;
  const sweep = sign * places * step;
  const edge = Math.min(0.3, EDGE_BEATS / beats);
  const plans = order.map((id, i) => {
    const spot = body(state, id).position;
    const a0 = base + i * step;
    const j = (((i + sign * places) % n) + n) % n;
    const end = body(state, order[j]).position;
    const ring0 = add(c, scale(dir(a0), radius));
    const ring1 = add(c, scale(dir(a0 + sweep), radius));
    return { id, spot, a0, end, from: sub(spot, ring0), to: sub(end, ring1) };
  });
  const where = (p: (typeof plans)[number], t: number) => {
    const ring = add(c, scale(dir(p.a0 + sweep * progress(t)), radius));
    const wIn = smooth(t / edge);
    const wOut = smooth((1 - t) / edge);
    return add(add(ring, scale(p.from, 1 - wIn)), scale(p.to, 1 - wOut));
  };
  const facing = new Map(
    plans.map((p) => [
      p.id,
      steer((t) => heading(where(p, t), c), body(state, p.id).yaw, heading(p.end, c), edge),
    ]),
  );
  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies: MovedBody[] = plans.map((p) => ({
      id: p.id,
      position: where(p, t),
      yaw: facing.get(p.id)!(t),
    }));
    const strength = inOut(t, edge);
    const contacts: FigureContact[] = order.map((id, i) =>
      hold(id, 'left', order[(i + 1) % n], 'right', strength, bodies),
    );
    return { bodies, contacts };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
