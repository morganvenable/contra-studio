/**
 * Swing at random, new lonesome dancer (a set with one extra lark).
 *
 * Definition: from one loop of dancers (a ring, or side lines closed by the
 * lonesome dancer), everyone but one finds someone new to swing; the
 * swinging couples end on the couples' places of the set and the dancer
 * left over goes to the lonesome dancer's place.
 * Source: ContraDB 3294 and 3295 (Millenium Bug, Erik Hoffman), "four
 * couples swing at random, new lonesome person to the top of the set";
 * Caller's Box glossary, "Swing".
 * Reading (a fixed rule in place of "at random"): each robin swings the
 * lark on her other side round the loop (not her partner), so the larks
 * move one couple on round the set each time; the lark nobody takes is the
 * new lonesome dancer. Robins keep their couple's place; each new couple
 * ends there, lark on the left facing across, and the lonesome dancer walks
 * up the middle of the set to its top place.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { SET } from '../../core/config.ts';
import { add, heading, length, mean, mix, polar, progress, rotate, scale, smooth, sub, TAU } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { everyone, hold, inOut, steer, window, wrap } from './common.ts';

export interface SwingAtRandomParams {
  /** Where the dancer left over goes. */
  lonesome: 'top' | 'bottom';
}

/** Swing orbit radius (as in swing.ts). */
const ORBIT = 0.31;
/** A swing's pace round the orbit, meters per beat. */
const PACE = 0.6;
/** Beats to meet and close in, and to open out. */
const EDGE = 3;
/** Share of the figure the couples take to reach their places. */
const TRAVEL = 0.6;

export const swingAtRandom: Figure<SwingAtRandomParams> = (state, params, beats) => {
  onlyKeys('swing at random', params, ['lonesome']);
  const end = oneOf('swing at random', 'lonesome', params.lonesome, ['top', 'bottom'] as const);
  const homes = state.layout?.homes;
  if (!homes) throw new Error('Swing at random needs the places of the set.');
  if (state.hands.length) throw new Error('The swing starts with free hands.');
  const partner = state.relations.get('partner');
  if (!partner) throw new Error('Nobody has a partner here.');
  const role = (id: number) => state.dancers[id].role;
  const ids = everyone(state);
  // Places: each robin's place beside a lark's place on her line; the
  // lark's place with no robin's place beside it is the lonesome one.
  const spots = [...homes].map(([id, p]) => ({ role: role(id), p }));
  const larkSpots = spots.filter((s) => s.role === 'lark').map((s) => s.p);
  const robinSpots = spots.filter((s) => s.role === 'robin').map((s) => s.p);
  const used = new Set<Vec2>();
  const couplePlaces = robinSpots.map((r) => {
    const l = larkSpots.find(
      (q) => !used.has(q) && Math.abs(q.x - r.x) < 0.3 && Math.abs(Math.abs(q.z - r.z) - SET.slot) < 0.3,
    );
    if (!l) throw new Error('A robin place has no lark place beside it.');
    used.add(l);
    return { robin: r, lark: l };
  });
  const lonesomeSpots = larkSpots.filter((q) => !used.has(q));
  if (lonesomeSpots.length !== 1) throw new Error('The set has no single lonesome place.');
  const lonesomeSpot = lonesomeSpots[0];
  const top = end === 'top';
  if (top !== lonesomeSpot.z < mean(robinSpots).z) throw new Error(`The lonesome place is not at the ${end}.`);

  // The loop as it stands, and each robin's lark on her other side.
  const c = mean(ids.map((id) => body(state, id).position));
  const angle = (id: number) => polar(sub(body(state, id).position, c));
  const loop = [...ids].sort((a, b) => angle(a) - angle(b));
  const n = loop.length;
  const robins = loop.filter((id) => role(id) === 'robin');
  const taken = new Set<number>();
  const pairs = robins.map((r) => {
    const i = loop.indexOf(r);
    const sides = [loop[(i + 1) % n], loop[(i - 1 + n) % n]];
    const other = sides.find((o) => o !== partner.get(r));
    if (other === undefined || role(other) !== 'lark' || taken.has(other))
      throw new Error(`Robin ${r} has no lark on her other side.`);
    taken.add(other);
    return { robin: r, lark: other };
  });
  const left = ids.filter((id) => role(id) === 'lark' && !taken.has(id));
  if (left.length !== 1) throw new Error('One lark must be left over to be lonesome.');
  // Robins to couple places in loop order, turned round to fit best.
  const placeCenter = mean(spots.map((s) => s.p));
  const placeAngle = (p: Vec2) => polar(sub(p, placeCenter));
  const places = [...couplePlaces].sort((a, b) => placeAngle(a.robin) - placeAngle(b.robin));
  let best = 0;
  let bestCost = Infinity;
  for (let k = 0; k < places.length; k++) {
    const cost = robins.reduce(
      (sum, r, i) => sum + Math.abs(wrap(angle(r) - placeAngle(places[(i + k) % places.length].robin))),
      0,
    );
    if (cost < bestCost) {
      bestCost = cost;
      best = k;
    }
  }
  const midX = mean(spots.map((s) => s.p)).x;
  const span = beats - 2 * EDGE;
  if (span < 4) throw new Error('Not enough beats to swing.');
  const plans = pairs.map((pair, i) => {
    const place = places[(i + best) % places.length];
    const a0 = body(state, pair.lark).position;
    const b0 = body(state, pair.robin).position;
    const m0 = mix(a0, b0, 0.5);
    const m1 = mix(place.lark, place.robin, 0.5);
    const h0 = sub(a0, m0);
    const h1 = sub(place.lark, m1);
    const turns = Math.max(1, Math.floor((PACE * span) / (TAU * ORBIT)));
    const delta = (((polar(h1) - polar(h0)) % TAU) + TAU) % TAU;
    const sweep = turns * TAU + delta;
    const across = heading(m1, { x: midX, z: m1.z });
    return { ...pair, m0, m1, r0: length(h0), r1: length(h1), u0: scale(h0, 1 / length(h0)), sweep, across };
  });
  // Couples reach their places early, clearing the middle for the lonesome dancer.
  const centerAt = (p: (typeof plans)[number], t: number) => mix(p.m0, p.m1, progress(t / TRAVEL));
  const where = (p: (typeof plans)[number], t: number, sign: 1 | -1) => {
    const m = centerAt(p, t);
    const beat = t * beats;
    const close = smooth(window(beat, 0, EDGE));
    const open = smooth(window(beat, beats - EDGE, beats));
    const r = p.r0 + (ORBIT - p.r0) * close + (p.r1 - ORBIT) * open;
    const a = p.sweep * progress(window(beat, EDGE * 0.5, beats - EDGE * 0.5));
    return add(m, scale(rotate(p.u0, a), sign * r));
  };
  const facing = new Map<number, (t: number) => number>();
  for (const p of plans)
    for (const [id, sign] of [
      [p.lark, 1],
      [p.robin, -1],
    ] as const)
      facing.set(
        id,
        steer(
          (t) => heading(where(p, t, sign), centerAt(p, t)),
          body(state, id).yaw,
          p.across,
          EDGE / beats,
        ),
      );
  // The lonesome dancer steps to the middle of the set, then walks to its place.
  const lone = left[0];
  const ls = body(state, lone);
  // Onto the middle line a slot toward its place, clear of the couples.
  const onLine = {
    x: midX,
    z: ls.position.z + Math.sign(lonesomeSpot.z - ls.position.z) * SET.slot,
  };
  const finalYaw = top ? 0 : Math.PI;
  const lonePos = (beat: number) => {
    const step = 0.2 * beats;
    return beat < step
      ? mix(ls.position, onLine, progress(beat / step))
      : mix(onLine, lonesomeSpot, progress(window(beat, step, beats)));
  };
  const loneFacing = steer((t) => heading(lonePos(t * beats), lonesomeSpot), ls.yaw, finalYaw, 0.15);

  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const p of plans) {
      bodies.push({ id: p.lark, position: where(p, t, 1), yaw: facing.get(p.lark)!(t) });
      bodies.push({ id: p.robin, position: where(p, t, -1), yaw: facing.get(p.robin)!(t) });
      const strength = inOut(window(beat, EDGE * 0.5, beats - EDGE * 0.5), 0.1);
      contacts.push(hold(p.lark, 'right', p.robin, 'left', strength, bodies));
    }
    bodies.push({ id: lone, position: lonePos(beat), yaw: loneFacing(t) });
    return { bodies, contacts };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
