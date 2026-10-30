/**
 * Contra corners ("ones contra corners").
 *
 * Definition: the active couple, across from each other in the middle of
 * their minor set, turn each other by the right three quarters, so they
 * stand back to back along the set, each facing a corner; each turns that
 * first corner by the left once around; the actives turn by the right half
 * way in the middle, to the other two corners; and each turns that second
 * corner by the left once around, ending in the middle back to back, ready
 * to balance and swing. The corners are the dancers standing diagonally from
 * the actives, one place up or down the set: two in the actives' own minor
 * set and two in the next one, so the figure reaches into the neighboring
 * minor sets. An active's corners are the other-role dancers on that end
 * (ContraDB 1572: "opposite role - first corners then second corners").
 * Corners step in to arm's length for their turn and back to place after.
 * A corner position nobody stands at (an end of the set) is left out; that
 * active turns in place.
 * Source: Caller's Box glossary, "Contra corners"; ContraDB rows "ones
 * contra corners" (16 beats).
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  heading,
  length,
  mean,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface ContraCornersParams {
  /** The active couple. */
  who: '1s' | '2s';
}

/** Distance from the pivot to each dancer of a hand turn. */
const TURN_RADIUS = 0.4;
/** How far from the expected corner place a corner may stand. */
const CORNER_REACH = 0.9;
/** Beats each dancer takes to face the next person at a turn's start. */
const FACE_BEATS = 2;
/** Share of a corner's turn after which it turns back to its own facing. */
const CORNER_HOME = 0.55;

interface Turn {
  /** Ids turning, rotating about their midpoint by `angle` (rotate() sense). */
  readonly a: number;
  readonly b: number;
  readonly angle: number;
  readonly hand: 'right' | 'left';
}

export const contraCorners: Figure<ContraCornersParams> = (state, params, beats) => {
  onlyKeys('contra corners', params, ['who']);
  const who = oneOf('contra corners', 'who', params.who, ['1s', '2s'] as const);
  const label = state.positions.get(who) ?? [];
  // Beats of 16: the first partner turn 4, each corner 4.5, the second
  // partner turn (only half way) 3; the actives travel out to each corner
  // and back around it.
  const starts = [0, 4 / 16, 8.75 / 16, 11.25 / 16, 1].map((f) => f * beats);

  // Where everyone stands at the start of each quarter, built quarter by quarter.
  const places: Map<number, { position: Vec2; yaw: number }>[] = [
    new Map([...state.bodies].map(([id, b]) => [id, { position: b.position, yaw: b.yaw }])),
  ];
  const turns: Turn[][] = [[], [], [], []];
  const actives: { a: number; b: number; middle: Vec2 }[] = [];
  for (const g of minorSets(state)) {
    const pair = g.filter((id) => label.includes(id));
    if (pair.length !== 2)
      throw new Error(`Contra corners needs the two ${who} in each minor set.`);
    const [a, b] = pair.map((id) => body(state, id).position);
    if (Math.abs(a.z - b.z) > 0.6 || Math.abs(a.x - b.x) < 0.5)
      throw new Error(`The ${who} must stand across from each other to start contra corners.`);
    actives.push({ a: pair[0], b: pair[1], middle: mean([a, b]) });
  }
  const isActive = new Set(actives.flatMap((x) => [x.a, x.b]));

  /** Positions after a set of turns (pairs rotate about their midpoints). */
  const after = (from: Map<number, { position: Vec2; yaw: number }>, list: Turn[], home = false) => {
    const next = new Map(from);
    for (const t of list) {
      const pa = from.get(t.a)!.position;
      const pb = from.get(t.b)!.position;
      const m = mean([pa, pb]);
      const end = (p: Vec2, keepCorner: boolean) =>
        keepCorner ? p : add(m, scale(rotate(sub(p, m), t.angle), TURN_RADIUS / length(sub(p, m))));
      // Actives end at turn radius from the pivot; corners go back to place.
      // (`home`: the second corner turn, after which the actives come back into the middle.)
      next.set(t.a, { position: end(pa, home || !isActive.has(t.a)), yaw: from.get(t.a)!.yaw });
      next.set(t.b, { position: end(pb, home || !isActive.has(t.b)), yaw: from.get(t.b)!.yaw });
    }
    return next;
  };

  /** The other-role dancer near the corner place `z` ends away, on either side. */
  const cornerOf = (
    id: number,
    at: Map<number, { position: Vec2 }>,
    side: number,
    used: Set<number>,
  ) => {
    const me = at.get(id)!.position;
    const active = actives.find((x) => x.a === id || x.b === id)!;
    let best: number | undefined;
    let bestD = Infinity;
    for (const d of state.dancers) {
      if (isActive.has(d.id) || used.has(d.id) || roleOf(state, d.id) === roleOf(state, id))
        continue;
      const p = body(state, d.id).position;
      const along = (p.z - active.middle.z) * side;
      if (along < 1.8 - CORNER_REACH || along > 1.8 + CORNER_REACH) continue;
      if (Math.abs(Math.abs(p.x - active.middle.x) - 0.9) > CORNER_REACH) continue;
      const dist = length(sub(p, me));
      if (dist < bestD) [best, bestD] = [d.id, dist];
    }
    return best;
  };

  // 1: actives turn by the right three quarters.
  turns[0] = actives.map((x) => ({ a: x.a, b: x.b, angle: 0.75 * TAU, hand: 'right' }));
  places.push(after(places[0], turns[0]));
  // 2: each active turns the first corner, at their end of the set, by the left.
  const used1 = new Set<number>();
  for (const x of actives)
    for (const id of [x.a, x.b]) {
      const side = Math.sign(places[1].get(id)!.position.z - x.middle.z) || 1;
      const c = cornerOf(id, places[1], side, used1);
      if (c === undefined) continue;
      used1.add(c);
      turns[1].push({ a: id, b: c, angle: -TAU, hand: 'left' });
    }
  places.push(after(places[1], turns[1]));
  // 3: actives turn by the right half way.
  turns[2] = actives.map((x) => ({ a: x.a, b: x.b, angle: 0.5 * TAU, hand: 'right' }));
  places.push(after(places[2], turns[2]));
  // 4: each active turns the second corner by the left.
  const used2 = new Set<number>();
  for (const x of actives)
    for (const id of [x.a, x.b]) {
      const side = Math.sign(places[3].get(id)!.position.z - x.middle.z) || 1;
      const c = cornerOf(id, places[3], side, used2);
      if (c === undefined) continue;
      used2.add(c);
      turns[3].push({ a: id, b: c, angle: -TAU, hand: 'left' });
    }
  places.push(after(places[3], turns[3], true));

  const moving = new Set(turns.flat().flatMap((t) => [t.a, t.b]));

  const motion = (beat: number) => {
    // At (or past) the last beat there is no later start: the last quarter.
    const next = starts.findIndex((b) => b > beat);
    const k = next < 0 ? 3 : Math.max(0, Math.min(3, next - 1));
    const local = Math.min(1, (beat - starts[k]) / (starts[k + 1] - starts[k]));
    const from = places[k];
    const bodies = new Map<number, { id: number; position: Vec2; yaw: number }>();
    for (const id of moving) {
      const p = from.get(id)!;
      bodies.set(id, { id, position: p.position, yaw: p.yaw });
    }
    const contacts: FigureContact[] = [];
    /** A turning dancer's place at share u of quarter k. */
    const placeAt = (t: Turn, id: number, u: number) => {
      const pa = from.get(t.a)!.position;
      const pb = from.get(t.b)!.position;
      const m = mean([pa, pb]);
      const rel = sub(id === t.a ? pa : pb, m);
      const r0 = length(rel);
      // Actives finish at turn radius (back in the middle after the second
      // corner); corners step in and back to place.
      const radius = isActive.has(id) && k < 3
        ? r0 + (TURN_RADIUS - r0) * smooth(u / 0.4)
        : r0 + (TURN_RADIUS - r0) * Math.min(smooth(u / 0.3), smooth((1 - u) / 0.3));
      return add(m, rotate(scale(rel, radius / Math.max(r0, 1e-6)), t.angle * progress(u)));
    };
    for (const t of turns[k])
      for (const id of [t.a, t.b]) bodies.set(id, { id, position: placeAt(t, id, local), yaw: 0 });
    // Out of the second corner each active pair comes home centered on its
    // minor set's middle (an active with no corner at an end of the set
    // waits off center).
    if (k === 3) {
      const home = smooth((local - 0.6) / 0.4);
      for (const x of actives) {
        const end = mean([places[4].get(x.a)!.position, places[4].get(x.b)!.position]);
        const shift = scale(sub(x.middle, end), home);
        for (const id of [x.a, x.b]) {
          const me = bodies.get(id)!;
          bodies.set(id, { ...me, position: add(me.position, shift) });
        }
      }
    }
    // Facing: toward whoever the dancer turns with, blended in at the
    // quarter's start; dancers not turning keep their facing.
    for (const t of turns[k]) {
      for (const [id, other] of [
        [t.a, t.b],
        [t.b, t.a],
      ] as const) {
        const me = bodies.get(id)!;
        const was = from.get(id)!.yaw;

        // Corners stop following the active as they step home, and turn
        // back to their own facing from there.
        const corner = !isActive.has(id);
        const blendIn = corner ? smooth(local / 0.5) : smooth((beat - starts[k]) / FACE_BEATS);
        const u = corner ? Math.min(local, CORNER_HOME) : local;
        // The line to the other dancer turns with the pair (a turn by angle
        // a changes a heading by -a), so follow it unwrapped from the start.
        const toward0 = heading(placeAt(t, id, 0), placeAt(t, other, 0));
        // Turning in to face the other dancer goes against the pair's turn
        // when that is not much the longer way, so the two do not add up.
        const short = turn(toward0, was);
        const against = short - Math.sign(short) * TAU;
        const into =
          Math.sign(short) !== Math.sign(t.angle) && Math.abs(against) < 1.25 * Math.PI
            ? against
            : short;
        const toward = was + into - t.angle * progress(u);
        const face = was + (toward - was) * blendIn;
        if (!corner || local <= CORNER_HOME) {
          bodies.set(id, { ...me, yaw: face });
          continue;
        }
        const own = state.bodies.get(id)!.yaw;
        bodies.set(id, {
          ...me,
          yaw: face + turn(own, face) * smooth((local - CORNER_HOME) / (1 - CORNER_HOME)),
        });
      }
      contacts.push(
        withinReach(
          { a: t.a, handA: t.hand, b: t.b, handB: t.hand, kind: 'joined', strength: 1 },
          bodyMap([...bodies.values()]),
        ),
      );
    }
    // Keep each quarter's end facing for the next quarter.
    return { bodies: [...bodies.values()], contacts };
  };

  // Record each quarter's end facing so the next starts from it.
  for (let k = 0; k < 4; k++) {
    const end = motion(starts[k + 1] - 1e-9).bodies;
    for (const b of end) {
      const p = places[k + 1].get(b.id)!;
      places[k + 1].set(b.id, { position: p.position, yaw: b.yaw });
    }
  }

  return {
    kind: 'allemande',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
