/**
 * Circle left (or right) in one big ring: a circle mixer, a big circle, a
 * square ("circle left 8 places, all eight").
 *
 * Definition: everyone in the ring joins hands, facing the center, and
 * walks to their left (clockwise seen from above) or right a number of
 * places (one place is one dancer's spacing round the ring) or an amount
 * of the way round, ending facing the center on a place of the ring.
 * Hands release at the end.
 * Source: Caller's Box glossary, "Circle"; ContraDB rows "circle left 8
 * places", "circle left" in circle mixers. The small-ring circle
 * (circle.ts) tightens the ring as it walks; a big ring keeps its size.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined } from '../core/contacts.ts';
import {
  add,
  heading,
  mean,
  polar,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { ringHolds } from '../core/ring.ts';
import { body, minorSets, withChanges } from '../core/state.ts';

export interface RingCircleParams {
  direction: 'left' | 'right';
  places?: number;
  amount?: number;
}

const TURN_IN_BEATS = 1;
const EDGE = 0.12;
/** The ring draws in this much while hands are joined (places are a slot apart). */
const TIGHTEN = 0.12;

export const ringCircle: Figure<RingCircleParams> = (state, params, beats) => {
  onlyKeys('circle', params, ['direction', 'places', 'amount']);
  const direction = oneOf('circle', 'direction', params.direction, ['left', 'right'] as const);
  if ((params.places === undefined) === (params.amount === undefined))
    throw new Error('A circle needs either places or an amount.');
  if (state.hands.length) throw new Error('A circle starts with free hands.');
  const sign = direction === 'left' ? 1 : -1;
  const rings = minorSets(state).map((g) => {
    const center = mean(g.map((id) => body(state, id).position));
    const order = [...g].sort(
      (a, b) =>
        polar(sub(body(state, a).position, center)) - polar(sub(body(state, b).position, center)),
    );
    const n = order.length;
    const turns = params.amount ?? params.places! / n;
    if (!(turns > 0 && turns <= 3)) throw new Error('A circle goes up to three times round.');
    return { center, order, sweep: sign * turns * TAU, hands: ringHolds({ center, order }) };
  });
  const motion = (beat: number) => {
    const t = beat / beats;
    const closed = Math.min(smooth(t / EDGE), smooth((1 - t) / EDGE));
    const radius = 1 - TIGHTEN * closed;
    // Hands join once the ring has closed in, and let go as it opens.
    const reachable = (u: number) => smooth((u / EDGE - 0.6) / 0.4);
    const strength = Math.min(reachable(t), reachable(1 - t));
    const bodies = rings.flatMap((ring) =>
      ring.order.map((id) => {
        const s = body(state, id);
        const angle = ring.sweep * progress(t);
        const position = add(ring.center, rotate(scale(sub(s.position, ring.center), radius), angle));
        const into = turn(heading(s.position, ring.center), s.yaw);
        const yaw = s.yaw + into * smooth(beat / TURN_IN_BEATS) - angle;
        return { id, position, yaw };
      }),
    );
    const contacts: FigureContact[] = rings.flatMap((r) => r.hands.map((h) => joined(h, strength)));
    return { bodies, contacts };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
