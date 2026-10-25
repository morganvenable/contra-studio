/**
 * Circle left (or right) in one big ring: a circle mixer, a big circle, a
 * square ("circle left 8 places, all eight").
 *
 * Definition: everyone in the ring joins hands, facing the center, and
 * walks to their left (clockwise seen from above) or right a number of
 * places (one place is one dancer's spacing round the ring) or an amount
 * of the way round, ending facing the center on a place of the ring.
 * Hands release at the end. A circle named in times round ("circle left",
 * "circle left once") goes no farther than a steady walk (0.85 m a beat)
 * covers in its beats, in whole places: in a big ring, eight beats of
 * "circle left" go about half way.
 * Source: Caller's Box glossary, "Circle"; ContraDB rows "circle left 8
 * places", "circle left" in circle mixers. The small-ring circle
 * (circle.ts) tightens the ring as it walks; a big ring keeps its size.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import {
  add,
  heading,
  length,
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
/** The fastest steady walk a big circle keeps, meters per beat. */
const WALK = 0.85;

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
    let turns = params.amount ?? params.places! / n;
    if (params.amount !== undefined) {
      // Times round in a big ring: no farther than a walk covers, in whole places.
      const r =
        (g.reduce((k, id) => k + length(sub(body(state, id).position, center)), 0) / n) *
        (1 - TIGHTEN);
      const reach = Math.floor((WALK * beats * n) / (TAU * r));
      if (reach < turns * n) turns = Math.max(1, reach) / n;
    }
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
        // A dancer facing well away from the center takes longer to turn in.
        const turnIn = Math.max(TURN_IN_BEATS, Math.abs(into) / 2);
        const yaw = s.yaw + into * smooth(beat / turnIn) - angle;
        return { id, position, yaw };
      }),
    );
    // Hands join only where they reach (a dancer still turning in reaches later).
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = rings.flatMap((r) =>
      r.hands.map((h) => withinReach(joined(h, strength), map)),
    );
    return { bodies, contacts };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
