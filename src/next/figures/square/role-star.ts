/**
 * A star of the four of one role in the middle of a ring or square ("star
 * right 3 places ladles", "gents to the center for a right hand star", "gents
 * star left, pass your partner").
 *
 * Definition: the four larks (or robins) walk into the middle, join hands
 * in a star (right hands for a star right: they turn clockwise seen from
 * above; left hands counterclockwise) and turn it the amount called; they
 * either stay in the star (to go on with another figure in the middle) or
 * walk back out to the places of the ring the star has brought them to,
 * facing in. The others stand.
 * Source: Caller's Box glossary, "Star"; Lloyd Shaw, "Cowboy Dances" (Texas
 * Star: "gents to the center for a right hand star, back by the left");
 * ContraDB 1341 ("star right 3 places ladles"), 1919, 2203.
 * Readings: a star of four goes ¼ round per place; the walk in and out and
 * the turn of the star are one smooth path, the star drawn in to a small
 * ring in the middle; a star with no grip named is a basket star (each
 * holds the wrist of the one ahead).
 */
import type { FigureContact, FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { withinReach } from '../../core/contacts.ts';
import { RING_CENTER } from '../../core/formation-ring.ts';
import {
  add,
  heading,
  length,
  polar,
  progress,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';
import { FIGURES } from '../index.ts';

export interface RoleStarParams {
  /** Who stars: the larks or the robins; else the dancers named (`among`). */
  who?: 'larks' | 'robins';
  hand: 'right' | 'left';
  /** Turns of the star (a place is ¼ for a star of four). */
  amount: number;
  /** Stay in the middle, or walk out to the places reached (default). */
  end?: 'places' | 'center';
}

/** Radius of the star in the middle. */
export const STAR_RADIUS = 0.62;
/** A dancer this near the center is already in the star. */
const IN_STAR = 1.2;
const RAMP = 0.12;
/** Share of the path spent walking in (and out). */
const IN_SHARE = 0.2;
const SAMPLES = 400;
/** Beats to turn from the starting facing to face along the star. */
const TURN_IN = 2;

export function roleStar(state: DanceState, params: RoleStarParams, beats: number): FigureResult {
  onlyKeys('star', params, ['who', 'hand', 'amount', 'end']);
  const who =
    params.who === undefined ? undefined : oneOf('star', 'who', params.who, ['larks', 'robins'] as const);
  const hand = oneOf('star', 'hand', params.hand, ['right', 'left'] as const);
  const end = oneOf('star', 'end', params.end ?? 'places', ['places', 'center'] as const);
  const amount = params.amount;
  if (!(amount > 0 && amount <= 3)) throw new Error('A star goes up to three times round.');
  // Outside a ring or square, the ordinary star of those dancers.
  if (!state.layout?.center)
    return FIGURES.star(state, { hand, places: amount * 4, ...(who ? { among: [who] } : {}) }, beats);
  const role = who === 'larks' ? 'lark' : who === 'robins' ? 'robin' : undefined;
  const ids = minorSets(state)
    .flat()
    .filter((id) => !role || state.dancers[id].role === role);
  if (ids.length === state.dancers.length) throw new Error('Name who stars in the middle.');
  if (ids.length < 3) throw new Error('A star needs three or more dancers.');
  // A right-hand star turns clockwise from above: a positive rotation (core/math.ts).
  const sweep = (hand === 'right' ? 1 : -1) * amount * TAU;
  const plans = ids
    .map((id) => {
      const s = body(state, id);
      const rel = sub(s.position, RING_CENTER);
      const r0 = length(rel);
      return { id, s, theta0: polar(rel), r0, inStar: r0 < IN_STAR };
    })
    .sort((a, b) => a.theta0 - b.theta0);
  const rOut = Math.max(...plans.map((p) => p.r0));
  // Each dancer's path: in to the star, round, and out, walked at one pace
  // along its length (the turn mostly happens in the small ring).
  const paths = new Map(
    plans.map((p) => {
      const from = p.inStar ? STAR_RADIUS : p.r0;
      const to = end === 'center' ? STAR_RADIUS : p.inStar ? rOut : p.r0;
      const at = (phi: number) => {
        const inward = from > STAR_RADIUS ? smooth(phi / IN_SHARE) : 1;
        const outward = to > STAR_RADIUS ? smooth((phi - (1 - IN_SHARE)) / IN_SHARE) : 0;
        const r = from + (STAR_RADIUS - from) * inward + (to - STAR_RADIUS) * outward;
        const theta = p.theta0 + sweep * phi;
        return add(RING_CENTER, { x: r * Math.cos(theta), z: r * Math.sin(theta) });
      };
      const samples = Array.from({ length: SAMPLES + 1 }, (_, k) => at(k / SAMPLES));
      const lengths = [0];
      for (let k = 1; k <= SAMPLES; k++)
        lengths.push(lengths[k - 1] + length(sub(samples[k], samples[k - 1])));
      const total = lengths[SAMPLES];
      const point = (u: number) => {
        const want = Math.max(0, Math.min(1, u)) * total;
        let k = 1;
        while (k < SAMPLES && lengths[k] < want) k++;
        const f = (want - lengths[k - 1]) / (lengths[k] - lengths[k - 1] || 1);
        return add(samples[k - 1], { x: (samples[k].x - samples[k - 1].x) * f, z: (samples[k].z - samples[k - 1].z) * f });
      };
      return [p.id, point] as const;
    }),
  );
  // Facing along the star: the star hand toward the center.
  const along = hand === 'right' ? Math.PI / 2 : -Math.PI / 2;
  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = plans.map((p) => {
      const position = paths.get(p.id)!(progress(t, RAMP));
      const inward = heading(position, RING_CENTER);
      const into = smooth(beat / TURN_IN);
      const out = end === 'places' ? smooth((t - 0.8) / 0.2) : 0;
      const yaw0 = p.s.yaw + turn(inward + along, p.s.yaw) * into;
      return { id: p.id, position, yaw: yaw0 + turn(inward, yaw0) * out };
    });
    const map = new Map(state.bodies);
    for (const b of bodies) map.set(b.id, { position: b.position, yaw: b.yaw });
    // Basket star: each takes the wrist of the one ahead while near the middle.
    const hold = Math.min(smooth((t - 0.15) / 0.15), end === 'places' ? smooth((0.85 - t) / 0.15) : 1);
    const ahead = hand === 'right' ? 1 : -1;
    const contacts: FigureContact[] = plans.map((p, i) => {
      const next = plans[(i + ahead + plans.length) % plans.length];
      return withinReach(
        { a: p.id, handA: hand, b: next.id, handB: hand, kind: 'joined', strength: hold },
        map,
      );
    });
    return { bodies, contacts };
  };
  return {
    kind: 'star',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}
