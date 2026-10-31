/**
 * Pair figures in a square when the two stand across the square from each
 * other ("partners balance & swing", "partners do si do", "partners swing"
 * right after lines at the sides, when the head partners stand at the ends
 * of opposite lines).
 *
 * Definition: the two meet first: they walk toward each other to the two
 * places of the ring nearest the middle of the gap between them (the lark
 * on the left, facing in), and dance the figure there, the meeting
 * overlapping its first beats. Pairs already side by side, and figures that
 * are not danced in pairs, dance exactly as written. A pair standing in
 * the middle (on the spokes of a star promenade) goes out to its places
 * the same way.
 * Source: Caller's Box glossary, "Swing" and "Balance"; ContraDB 559 notes
 * (Wade Pearson's roll away square: after the lines, partners swing and
 * promenade home), 1335, 3263, 3264.
 * Reading: the meeting point is the nearest pair of free places (for the
 * heads after lines at the sides, their own home places).
 */
import type { FigureResult } from '../../core/figure.ts';
import { RING_CENTER, ringPlaces } from '../../core/formation-ring.ts';
import {
  add,
  distance,
  dot,
  heading,
  mean,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../../core/math.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';
import { settle } from '../../core/figure.ts';
import { withinReach } from '../../core/contacts.ts';
import { FIGURES } from '../index.ts';

/** Farther apart than this, a pair meets before dancing. */
const FAR = 2.7;
/** Beats (at most) the meeting overlaps. */
const MEET = 4;
/** A pair whose middle is nearer the center than this is inside the ring. */
const INSIDE = 1.6;

function across(move: string, state: DanceState, params: Record<string, unknown>, beats: number): FigureResult {
  const inner = FIGURES[move];
  const who = params.who;
  const rel = typeof who === 'string' ? state.relations.get(who) : undefined;
  if (!state.layout?.center || !rel || state.dancers.length !== 8)
    return inner(state, params, beats);
  const ids = minorSets(state).flat();
  const far: [number, number][] = [];
  for (const id of ids) {
    const o = rel.get(id);
    if (o === undefined || o < id || !ids.includes(o)) continue;
    const pa = body(state, id).position;
    const pb = body(state, o).position;
    // Far apart, or standing in the middle (on the spokes of a star).
    const inside = distance(mean([pa, pb]), RING_CENTER) < INSIDE;
    if (distance(pa, pb) > FAR || inside) far.push([id, o]);
  }
  if (!far.length) return inner(state, params, beats);
  const places = ringPlaces(8, RING_CENTER, true).map((p) => p.position);
  const taken = (p: { x: number; z: number }, except: number[]) =>
    state.dancers.some(
      (d) => !except.includes(d.id) && distance(body(state, d.id).position, p) < 0.9,
    );
  const bodies = new Map(state.bodies);
  const offsets = new Map<number, { dp: { x: number; z: number }; dyaw: number }>();
  for (const [a, b] of far) {
    const m = mean([body(state, a).position, body(state, b).position]);
    let best = -1;
    for (let j = 0; j < 8; j++) {
      const q = mean([places[j], places[(j + 1) % 8]]);
      if (best < 0 || distance(q, m) < distance(mean([places[best], places[(best + 1) % 8]]), m))
        best = j;
    }
    const pair = [places[best], places[(best + 1) % 8]];
    if (pair.some((p) => taken(p, [a, b]))) throw new Error('There is no room for the two to meet.');
    // The lark (or the first named) takes the left place, facing in.
    const yawIn = heading(mean(pair), RING_CENTER);
    const [left, right] =
      dot(sub(pair[1], pair[0]), rightOf(yawIn)) > 0 ? [pair[0], pair[1]] : [pair[1], pair[0]];
    const lark = state.dancers[a].role === 'lark' ? a : b;
    const other = lark === a ? b : a;
    for (const [id, place] of [
      [lark, left],
      [other, right],
    ] as const) {
      const s = body(state, id);
      const yaw = heading(place, RING_CENTER);
      bodies.set(id, { position: place, yaw });
      offsets.set(id, { dp: sub(s.position, place), dyaw: turn(s.yaw, yaw) });
    }
  }
  const local = withChanges(state, { bodies });
  const result = inner(local, params, beats);
  const meet = Math.min(MEET, beats * 0.8);
  // A swing starts once the two have nearly met (walking together while
  // already spinning would sweep them through each other); its turns fit
  // the beats left.
  const wait = move === 'swing' ? meet * 0.8 : 0;
  const innerBeat = (beat: number) =>
    wait ? (Math.max(0, beat - wait) * beats) / (beats - wait) : beat;
  const motion = (beat: number) => {
    const frame = result.motion(innerBeat(beat));
    const k = 1 - progress(beat / meet);
    const turnK = 1 - smooth(beat / meet);
    const moved = new Set(frame.bodies.map((b) => b.id));
    const extra = [...offsets.keys()]
      .filter((id) => !moved.has(id))
      .map((id) => ({ id, ...body(local, id) }));
    const bodies = [...frame.bodies, ...extra].map((b) => {
      const o = offsets.get(b.id);
      if (!o) return b;
      return { ...b, position: add(b.position, scale(o.dp, k)), yaw: b.yaw + o.dyaw * turnK };
    });
    const map = new Map(state.bodies);
    for (const b of bodies) map.set(b.id, { position: b.position, yaw: b.yaw });
    // Hands join only once the two can reach each other.
    return {
      ...frame,
      bodies,
      contacts: frame.contacts.map(({ point: _p, ...c }) => withinReach(c, map)),
    };
  };
  return { ...result, motion, exit: withChanges(settle(state, motion, beats), { hands: result.exit.hands }) };
}

export function squareSwing(state: DanceState, params: Record<string, unknown>, beats: number) {
  return across('swing', state, params, beats);
}
export function squareBalance(state: DanceState, params: Record<string, unknown>, beats: number) {
  return across('balance', state, params, beats);
}
export function squareDoSiDo(state: DanceState, params: Record<string, unknown>, beats: number) {
  return across('do-si-do', state, params, beats);
}

/**
 * Corners figures in a square ("first corners allemande left once",
 * "corners swing"): the figure with the corner, who in a square is the
 * neighbor relation, danced in the ring's pair frames. The sets area's
 * corners figures (figures/sets/corners.ts) read lines of four; a square
 * maps them here.
 */
export function squareCorners(
  state: DanceState,
  params: { move: string; params: Record<string, unknown> },
  beats: number,
) {
  const pairMove = ['swing', 'balance', 'do-si-do'].includes(params.move);
  return pairMove
    ? across(params.move, state, params.params, beats)
    : FIGURES[params.move](state, params.params, beats);
}

export function squareCornerSwing(state: DanceState, params: { who: string }, beats: number) {
  return across('swing', state, { who: params.who }, beats);
}
