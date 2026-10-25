/**
 * Circle in a whole set: the circle for groups larger than a minor set.
 *
 * Definition: the dancers of the group join hands in one ring and walk to
 * their left (clockwise from above) or right a number of places, ending on
 * the places of the set (each dancer where the dancer that many places
 * along the ring stood). Six dancers of a triplet first round out into a
 * true ring (their places stand on a long rectangle) and step back out to
 * places at the end; a set of four or more couples circles as an oval round
 * the set (set-circle). A group of four is the ordinary circle.
 * Source: Caller's Box glossary, "Circle"; ContraDB rows "circle left" and
 * "circle left 4 places (hands six)" in triplets.
 * Readings: "places" are places of the set, so a circle ends on places
 * (circle left 4 places with six: each dancer ends four places on round
 * the ring of places); an amount of the way round counts places the same
 * way (once round with six is six places).
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { add, heading, length, mean, polar, progress, smooth, sub, TAU } from '../../core/math.ts';
import { body, minorSets, withChanges, type Hold } from '../../core/state.ts';
import { circle } from '../circle.ts';
import { choreograph, facingIn, type Path } from './common.ts';
import { setCircle } from './set-circle.ts';

export interface WholeCircleParams {
  direction: 'left' | 'right';
  places?: number;
  amount?: number;
}

/** Spacing between neighbors in the ring. */
const RING_GAP = 0.84;
/** Share of the figure spent speeding up, and again slowing down. */
const RAMP = 0.3;

const posmod = (a: number) => ((a % TAU) + TAU) % TAU;

export const wholeCircle: Figure<WholeCircleParams> = (state, params, beats) => {
  onlyKeys('whole-circle', params, ['direction', 'places', 'amount']);
  const direction = oneOf('whole-circle', 'direction', params.direction, ['left', 'right'] as const);
  if ((params.places === undefined) === (params.amount === undefined))
    throw new Error('A circle needs either places or an amount.');
  const groups = minorSets(state);
  const sizes = new Set(groups.map((g) => g.length));
  if (sizes.size !== 1) throw new Error('whole-circle needs groups of one size.');
  const [n] = sizes;
  if (n <= 4) return circle(state, params, beats);
  const count = params.places ?? (params.amount ?? 1) * n;
  if (!(Number.isInteger(count) && count >= 1 && count <= 2 * n))
    throw new Error(`A circle of ${n} goes a whole number of places, 1 to ${2 * n}.`);
  if (n > 6) return setCircle(state, { direction, places: count }, beats);
  if (state.hands.length) throw new Error('A circle starts with free hands.');
  const sign = direction === 'left' ? 1 : -1;
  const radius = Math.max(0.75, (RING_GAP * n) / TAU);
  const paths = new Map<number, Path>();
  const holds: Hold[] = [];
  for (const g of groups) {
    const center = mean(g.map((id) => body(state, id).position));
    const order = [...g].sort(
      (a, b) =>
        polar(sub(body(state, a).position, center)) - polar(sub(body(state, b).position, center)),
    );
    const angle = order.map((id) => polar(sub(body(state, id).position, center)));
    const r = order.map((id) => length(sub(body(state, id).position, center)));
    const far = Math.max(...r);
    const edge = Math.min(0.3, Math.max(0.12, (far - radius) / 0.5 / beats));
    order.forEach((id, i) => {
      const k = (((i + sign * count) % n) + n) % n;
      const laps = Math.ceil(count / n) - 1;
      const base = posmod(sign * (angle[k] - angle[i]));
      const sweep = sign * ((base < 1e-9 ? TAU : base) + laps * TAU);
      // Round the ring slowly while stepping in and out (long speed ramps),
      // so dancers from the corners of the set don't sweep wide.
      const pos = (u: number) => {
        const a = angle[i] + sweep * progress(u, RAMP);
        const ends = r[i] + (r[k] - r[i]) * smooth(u);
        const rr = ends + (radius - ends) * Math.min(smooth(u / edge), smooth((1 - u) / edge));
        return add(center, { x: rr * Math.cos(a), z: rr * Math.sin(a) });
      };
      const end = body(state, order[k]).position;
      paths.set(id, {
        pos,
        yaw: (u) => (u >= 1 ? facingIn(end.x < center.x ? -1 : 1) : heading(pos(u), center)),
        unwrap: true,
      });
      holds.push({ a: id, handA: 'left', b: order[(i + 1) % n], handB: 'right' });
    });
  }
  const bodies = choreograph(state, beats, paths, 0.75);
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const map = bodyMap(moved);
    const u = beat / beats;
    const strength = Math.min(smooth((u - 0.12) / 0.1), smooth((0.88 - u) / 0.1));
    return { bodies: moved, contacts: holds.map((h) => withinReach(joined(h, strength), map)) };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
