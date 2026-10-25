/**
 * Grand right and left (right left grand) round a ring, and its single
 * changes ("partners pull by right - that's number 1", "next neighbors
 * pull by left - 2").
 *
 * Definition: partners face (larks counterclockwise, robins clockwise),
 * take right hands and pull by, give a left hand to the next and pull by,
 * and so on, alternating hands, larks travelling counterclockwise and
 * robins clockwise, weaving in and out round the ring. Each change moves
 * every dancer one place along the ring. `changes` hands are pulled by;
 * then the dancers either stay facing the next one they meet (`end: face`,
 * ready for another change or a figure with them), or meet that next one
 * and turn to face in beside them, the robin on the lark's right (`end:
 * in`): "grand right and left, count to seven" pulls by six and meets the
 * seventh. A change can start from the ring facing in (the first, with a
 * partner) or from facing the next one after an earlier change.
 * Source: Caller's Box glossary, "Grand right and left"; Lloyd Shaw,
 * "Cowboy Dances"; ContraDB dances 3288, 2079 (Lucky Seven), 2093.
 * Readings: a change takes two beats or more; the pull by passes right
 * shoulders on a right hand (the lark inside the ring), left shoulders on a
 * left hand (the lark outside).
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, withinReach } from '../../core/contacts.ts';
import { add, length, polar, progress, rotate, scale, smooth, sub, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { faceIn, placeAt, placeIndex, ringOf, sideStep } from './geometry.ts';

export interface GrandRightLeftParams {
  /** Hands pulled by. */
  changes: number;
  /** Hand of the first pull by. */
  hand?: 'right' | 'left';
  /** Face the next one met, or meet them and face in beside them. */
  end?: 'face' | 'in';
}

/** How far each dancer weaves off the ring to pass. */
const WEAVE = 0.3;
const TURN_BEATS = 1;

export const grandRightLeft: Figure<GrandRightLeftParams> = (state, params, beats) => {
  onlyKeys('grand right and left', params, ['changes', 'hand', 'end']);
  const changes = params.changes;
  if (!(Number.isInteger(changes) && changes >= 1 && changes <= 16))
    throw new Error('A grand right and left pulls by 1-16 hands.');
  const hand = oneOf('grand right and left', 'hand', params.hand ?? 'right', ['right', 'left'] as const);
  const end = oneOf('grand right and left', 'end', params.end ?? 'face', ['face', 'in'] as const);
  if (beats < 2 * changes) throw new Error('Each change of a grand right and left takes two beats.');
  const ids = state.groups.flat();
  if (ids.length !== state.dancers.length) throw new Error('Everyone in the ring dances a grand right and left.');
  const ring = ringOf(state);
  const n = ring.places.length;
  // Larks travel toward the robin on their right (counterclockwise).
  const larkStep = sideStep(ring, 'right');
  const index = new Map(ids.map((id) => [id, placeIndex(ring, body(state, id).position)]));
  if (new Set(index.values()).size !== n) throw new Error('A grand right and left starts with everyone on a place of the ring.');
  const stepOf = (id: number) => (state.dancers[id].role === 'lark' ? larkStep : -larkStep);
  // Each lark faces a robin on the next place his way.
  for (const id of ids) {
    const ahead = ids.find((o) => index.get(o) === (((index.get(id)! + stepOf(id)) % n) + n) % n);
    if (ahead === undefined || state.dancers[ahead].role === state.dancers[id].role)
      throw new Error('A grand right and left needs larks and robins alternating round the ring.');
  }
  const changeBeats = (beats - (end === 'in' ? TURN_BEATS : 0)) / changes;
  const travelShare = (changes * changeBeats) / beats;
  // Right hand first: the lark passes inside the ring (nearer the center).
  const firstSide = hand === 'right' ? -1 : 1;
  const plans = ids.map((id) => {
    const s = body(state, id);
    const rel = sub(s.position, ring.center);
    const r0 = length(rel);
    const step = stepOf(id);
    const lark = state.dancers[id].role === 'lark';
    const target = placeAt(ring, index.get(id)! + step * changes);
    // Places go up in polar angle, so the sweep has the sign of the step.
    const sweep = step * changes * ring.step;
    // Facing the way of travel: larks turn right from facing in, robins left.
    const travelTwist = lark ? -Math.PI / 2 : Math.PI / 2;
    const startTwist = turn(s.yaw, faceIn(ring, s.position));
    return { id, s, rel, r0, sweep, lark, travelTwist, startTwist, target };
  });
  const at = (p: (typeof plans)[number], beat: number) => {
    const t = Math.min(1, beat / (beats * travelShare));
    const u = changes * progress(t, 0.1);
    const side = (p.lark ? firstSide : -firstSide) * Math.sin(Math.PI * u);
    const r = p.r0 + (ring.radius - p.r0) * smooth(t) + WEAVE * side;
    const dir = rotate(scale(p.rel, 1 / p.r0), p.sweep * (u / changes));
    const position = add(ring.center, scale(dir, r));
    const into = smooth(beat / TURN_BEATS);
    const out = end === 'in' ? smooth((beat - (beats - TURN_BEATS)) / TURN_BEATS) : 0;
    const twist =
      p.startTwist + turn(p.travelTwist, p.startTwist) * into - p.travelTwist * out * into;
    return { id: p.id, position, yaw: faceIn(ring, position) + twist };
  };
  const motion = (beat: number) => {
    if (beat <= 0) return { bodies: plans.map((p) => ({ id: p.id, ...p.s })), contacts: [] };
    const bodies = plans.map((p) => {
      const b = at(p, beat);
      return beat >= beats ? { ...b, position: p.target } : b;
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = [];
    // The hands of change i peak as the pair passes, half way through it.
    const t = Math.min(1, beat / (beats * travelShare));
    const u = changes * progress(t, 0.1);
    const i = Math.min(changes - 1, Math.floor(u));
    const strength = Math.max(0, Math.sin(Math.PI * (u - i))) ** 0.5;
    if (strength > 0.01) {
      const handNow = i % 2 === 0 ? hand : hand === 'right' ? 'left' : 'right';
      for (const p of plans) {
        if (!p.lark) continue;
        const meet = passing(plans, index, p.id, i, larkStep, n);
        contacts.push(
          withinReach(
            { a: p.id, handA: handNow, b: meet, handB: handNow, kind: 'joined', strength },
            map,
          ),
        );
      }
    }
    return { bodies, contacts };
  };
  return {
    kind: 'pull-by',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

/** The robin lark `id` passes in change i (0-based). */
function passing(
  plans: readonly { id: number; lark: boolean }[],
  index: ReadonlyMap<number, number>,
  id: number,
  i: number,
  larkStep: number,
  n: number,
): number {
  const mod = (k: number) => ((k % n) + n) % n;
  const want = mod(index.get(id)! + larkStep * (2 * i + 1));
  const robin = plans.find((p) => !p.lark && index.get(p.id) === want);
  if (!robin) throw new Error(`No robin meets dancer ${id} in change ${i + 1}.`);
  return robin.id;
}
