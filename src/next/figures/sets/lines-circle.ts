/**
 * Circle left (or right) with all eight: two lines of four facing each
 * other (four face four) join into one ring.
 *
 * Definition: the two lines join hands into a ring of eight, walk to their
 * left (clockwise from above) or right the named number of places, and open
 * out into two lines again, each dancer ending on the place of the dancer
 * that many places ahead round the ring, facing the way that place faced.
 * "Circle left 4 places" (halfway) carries each line to where the other
 * line stood; 8 places is all the way round. A ring whose dancers face out
 * (after a California twirl: "circle up 8, everyone facing out", Boston
 * Cream Pie) stays facing out and still walks to each dancer's own left,
 * so it turns the other way round. Otherwise everyone turns in to the ring.
 * Source: Caller's Box glossary, "Circle"; ContraDB rows "circle left 4
 * places [all eight]" (Dead Simple), "in a ring of 8, circle left 4 places"
 * (Petronella Sunrise), "circle left 8 places all 8" (Apple Pie Quadrille),
 * "circle left 4 places [halfway]" (Mind the Shark).
 * Reading: in four face four a circle of 4 or 8 places with no ring named
 * is the ring of eight (4 places is halfway, the lines trade places); any
 * other number of places is danced in rings of four, each couple with the
 * couple it faces (a minor set), as in "circle left 3 places". `ring`
 * names the ring outright.
 *
 * Runs on a group of eight (the two lines; layout.ts lineSets). A group of
 * four dances the ordinary circle (circle.ts).
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import {
  add,
  dot,
  forward,
  heading,
  length,
  mean,
  polar,
  progress,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { ringHolds } from '../../core/ring.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';
import { circle, type CircleParams } from '../circle.ts';

export interface LinesCircleParams extends CircleParams {
  /** 8: one ring of everyone; 4: rings of four. Default: see the header. */
  ring?: 4 | 8;
}

/** Radius of the ring of eight (neighbors about 1.15 m apart). */
const RING_RADIUS = 1.35;
/** Share of the figure spent closing into the ring, and again opening out. */
const EDGE = 0.3;
const TURN_BEATS = 1;

/** A group's center and the unit vector along its lines (its long axis). */
function lineAxis(state: DanceState, group: readonly number[]) {
  const center = mean(group.map((id) => body(state, id).position));
  const rel = group.map((id) => sub(body(state, id).position, center));
  const spreadX = Math.max(...rel.map((r) => Math.abs(r.x)));
  const spreadZ = Math.max(...rel.map((r) => Math.abs(r.z)));
  return { center, along: spreadX >= spreadZ ? { x: 1, z: 0 } : { x: 0, z: 1 } };
}

/** Split a group of eight into its two halves along its lines. */
function halves(state: DanceState, group: readonly number[]): number[][] {
  const { center, along } = lineAxis(state, group);
  const key = (id: number) => dot(sub(body(state, id).position, center), along);
  const sorted = [...group].sort((a, b) => key(a) - key(b));
  return [sorted.slice(0, 4), sorted.slice(4)];
}

export const linesCircle: Figure<LinesCircleParams> = (state, params, beats) => {
  onlyKeys('circle', params, ['direction', 'places', 'amount', 'ring']);
  const direction = oneOf('circle', 'direction', params.direction, ['left', 'right'] as const);
  if (params.ring !== undefined && params.ring !== 4 && params.ring !== 8)
    throw new Error('A circle ring must be 4 or 8.');
  const { ring: named, ...plain } = params;
  const groups = minorSets(state);
  const eights = groups.filter((g) => g.length === 8);
  if (!eights.length) {
    if (named === 8) throw new Error('A ring of eight needs two lines of four.');
    return circle(state, plain, beats);
  }
  if (groups.some((g) => g.length !== 8))
    throw new Error('A ring of eight needs every group to be two lines of four.');
  const places =
    params.places ?? (params.amount !== undefined ? params.amount * 8 : undefined);
  if (places === undefined || (params.places === undefined) === (params.amount === undefined))
    throw new Error('A circle needs either places or an amount.');
  const eight = named ? named === 8 : places === 4 || places === 8;
  if (!eight) {
    if (params.places === undefined)
      throw new Error('A circle in rings of four counts places, not an amount.');
    return circle(withChanges(state, { groups: groups.flatMap((g) => halves(state, g)) }), plain, beats);
  }
  if (!(Number.isInteger(places) && places >= 1 && places <= 16))
    throw new Error('A ring of eight circles 1 to 16 places.');
  if (state.hands.length) throw new Error('A circle starts with free hands.');
  const rings = groups.map((group) => {
    const { center, along } = lineAxis(state, group);
    // Facing toward the other line or away from it (a ring balance or a
    // twirl may leave dancers on a diagonal). Facing out, a dancer's left is
    // the other way round the ring.
    const across = { x: -along.z, z: along.x };
    const inward = group.map((id) => {
      const b = body(state, id);
      const toOther = Math.sign(dot(sub(center, b.position), across));
      return dot(forward(b.yaw), across) * toOther;
    });
    // Anyone not facing the other line (after a do-si-do, say) turns in to join.
    const out = inward.every((d) => d < -0.15);
    const sign = (direction === 'left' ? 1 : -1) * (out ? -1 : 1);
    const order = [...group].sort(
      (a, b) =>
        polar(sub(body(state, a).position, center)) - polar(sub(body(state, b).position, center)),
    );
    const n = order.length;
    for (const id of order) {
      if (length(sub(body(state, id).position, center)) < 0.6)
        throw new Error('A ring of eight needs the dancers round a center.');
    }
    const sweep = sign * places * (TAU / n);
    // Evenly spaced ring places nearest the dancers' own angles.
    const angle0 = order.map((id) => polar(sub(body(state, id).position, center)));
    const offset = Math.atan2(
      angle0.reduce((s, a, i) => s + Math.sin(a - (i * TAU) / n), 0),
      angle0.reduce((s, a, i) => s + Math.cos(a - (i * TAU) / n), 0),
    );
    const plans = order.map((id, i) => {
      const s = body(state, id);
      const destId = order[(((i + sign * places) % n) + n) % n];
      const d = body(state, destId);
      const rs = length(sub(s.position, center));
      const re = length(sub(d.position, center));
      const a0 = angle0[i];
      // Travel the way the ring turns, the whole number of places.
      const raw = polar(sub(d.position, center)) - a0;
      const turns = Math.round((sweep - raw) / TAU);
      const travel = raw + turns * TAU;
      const even = offset + (i * TAU) / n;
      const faceIn = turn(heading(s.position, center) + (out ? Math.PI : 0), s.yaw);
      return { id, s, rs, re, a0, travel, even: a0 + turn(even, a0), endYaw: d.yaw, faceIn };
    });
    return { center, plans, sweep, hands: ringHolds({ center, order }) };
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const q = progress(t);
    // Round the ring mostly once it has closed in: a wide line is slow to swing round.
    const qa = progress((t - EDGE / 2) / (1 - EDGE));
    const bump = Math.min(smooth(t / EDGE), smooth((1 - t) / EDGE));
    const bodies = rings.flatMap((ring) =>
      ring.plans.map((p) => {
        const place = p.a0 + p.travel * qa;
        const evenly = p.even + ring.sweep * qa;
        const a = place + (evenly - place) * bump;
        const r = p.rs + (p.re - p.rs) * q;
        const radius = r + (RING_RADIUS - r) * bump;
        const position = add(ring.center, { x: radius * Math.cos(a), z: radius * Math.sin(a) });
        // Face the center (or straight out) while circling: that heading
        // turns with the ring, -a - pi/2. Then turn to the way the new place faces.
        const toIn = smooth(beat / TURN_BEATS);
        const toOut = smooth((beat - (beats - TURN_BEATS)) / TURN_BEATS);
        const yawIn = p.s.yaw + p.faceIn * toIn - (a - p.a0);
        const yaw = yawIn + turn(p.endYaw, yawIn) * toOut;
        return { id: p.id, position, yaw };
      }),
    );
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = rings.flatMap((r) =>
      r.hands.map((h) => withinReach(joined(h, bump), map)),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'circle',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
