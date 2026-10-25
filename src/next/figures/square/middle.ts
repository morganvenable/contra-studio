/**
 * A figure danced by two facing couples in the middle of a square ("heads
 * star right 4 places", "ladles chain (heads)", "heads right left through",
 * "side couples promenade across").
 *
 * Definition: the two couples named (heads, sides) step in toward each
 * other until they stand as a minor set of four in the middle of the square
 * (couples 1.8 m apart, facing), dance the contra figure there, and step
 * back out to the nearest of the four places they started from, facing the
 * center again. The other two couples stand still.
 * Source: Caller's Box glossary, "Heads" / "Sides" and the figures named;
 * Tony Parkes, "Contra Dance Calling" (square figures for two couples are
 * danced in the middle of the set); ContraDB rows "star left 4 places
 * (heads)", "ladles chain (heads)", "heads (sides) right left through",
 * "head couples, promenade across (side couples)".
 * Reading: the step in and the step out overlap the first and last beats
 * of the figure, so the figure keeps its whole phrase; the couples always
 * step back out (a figure that keeps dancing in the middle is a separate
 * row's business), so the square keeps its places.
 */
import type { Vec2 } from '../../../types.ts';
import type { FigureContact, FigureResult, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { SET } from '../../core/config.ts';
import { withinReach } from '../../core/contacts.ts';
import { RING_CENTER } from '../../core/formation-ring.ts';
import {
  add,
  distance,
  progress,
  heading,
  length,
  mean,
  polar,
  rotate,
  scale,
  sub,
  turn,
} from '../../core/math.ts';
import { body, minorSets, withChanges, type Body, type DanceState } from '../../core/state.ts';
import { FIGURES } from '../index.ts';
import { MIDDLE_MOVES } from './middle-moves.ts';

export interface MiddleParams {
  /** The contra figure danced in the middle, and its parameters. */
  move: string;
  params?: Record<string, unknown>;
}


/** Beats (at most) spent stepping in, and stepping out, overlapping the figure. */
const STEP = 4;
/**
 * Figures whose own fast part comes early or late step over a different
 * span, so the step and the figure's own travel never add up past a walk.
 */
const STEP_BEATS: Readonly<Record<string, number>> = {
  chain: 5,
  circle: 5,
  'right-left-through': 3,
};
/** A dancer steps out at most this far to a place. */
const REACH_OUT = 2.2;

/** A function declaration, so the registry can load it while figures/index.ts is loading. */
export function squareMiddle(state: DanceState, params: MiddleParams, beats: number): FigureResult {
  onlyKeys('in the middle', params, ['move', 'params']);
  if (!MIDDLE_MOVES.has(params.move))
    throw new Error(`"${params.move}" is not danced in the middle of a square.`);
  const ids = minorSets(state).flat();
  if (ids.length !== 4) throw new Error('Two couples dance in the middle of the square.');
  const center = RING_CENTER;
  // Pair each dancer with the nearest other dancer named: two couples.
  const mate = (id: number) =>
    ids
      .filter((o) => o !== id)
      .reduce((a, b) =>
        distance(body(state, a).position, body(state, id).position) <=
        distance(body(state, b).position, body(state, id).position)
          ? a
          : b,
      );
  const first = ids[0];
  const pairA = [first, mate(first)];
  const pairB = ids.filter((id) => !pairA.includes(id));
  if (mate(pairB[0]) !== pairB[1] || mate(pairA[1]) !== first)
    throw new Error('The dancers in the middle must come as two couples.');
  const centerOf = (p: number[]) => mean(p.map((id) => body(state, id).position));
  const ca = sub(centerOf(pairA), center);
  const cb = sub(centerOf(pairB), center);
  if (length(ca) < 1 || length(cb) < 1 || Math.cos(polar(ca) - polar(cb)) > -0.9)
    throw new Error('The two couples must face each other across the square.');
  // Local frame: couple A on the +x side, couple B on the -x side, as a
  // Becket minor set (couples facing across, partners side by side).
  const angle = -polar(ca);
  const toLocal = (b: Body): Body => ({
    position: rotate(sub(b.position, center), angle),
    yaw: b.yaw - angle,
  });
  const toWorld = (p: Vec2, yaw: number): Body => ({
    position: add(center, rotate(p, -angle)),
    yaw: yaw + angle,
  });
  const home = new Map(ids.map((id) => [id, toLocal(body(state, id))]));
  // Where each dancer stands in the middle: on x = +-halfWidth, facing across.
  const inside = new Map<number, Body>();
  for (const id of ids) {
    const p = home.get(id)!.position;
    const side = pairA.includes(id) ? 1 : -1;
    inside.set(id, {
      position: { x: side * SET.halfWidth, z: Math.sign(p.z) * SET.halfWidth },
      yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2,
    });
  }
  const zs = ids.map((id) => inside.get(id)!.position.z);
  if (pairA.some((id) => home.get(id)!.position.z === 0) || zs.filter((z) => z > 0).length !== 2)
    throw new Error('The couples in the middle must stand side by side.');
  const bodies = new Map(state.bodies);
  for (const id of ids) bodies.set(id, inside.get(id)!);
  const local = withChanges(state, { bodies, hands: [], groups: [ids], layout: undefined });
  const inner = FIGURES[params.move];
  if (!inner) throw new Error(`No figure named "${params.move}".`);
  const result = inner(local, params.params ?? {}, beats);
  const step = Math.min(STEP_BEATS[params.move] ?? STEP, beats * 0.7);
  // Step out to the nearest free place the four started on, facing the center.
  const places = ids.map((id) => home.get(id)!.position);
  const out = new Map<number, Body>();
  const taken = new Set<number>();
  const ends = new Map(ids.map((id) => [id, body(result.exit, id)]));
  const order = [...ids].sort((a, b) => nearest(ends.get(a)!.position) - nearest(ends.get(b)!.position));
  function nearest(p: Vec2) {
    return Math.min(...places.map((q) => distance(p, q)));
  }
  for (const id of order) {
    const p = ends.get(id)!.position;
    let best = -1;
    for (let k = 0; k < places.length; k++) {
      if (taken.has(k)) continue;
      if (best < 0 || distance(p, places[k]) < distance(p, places[best])) best = k;
    }
    if (distance(p, places[best]) > REACH_OUT)
      throw new Error('The couples in the middle must end near the places they came from.');
    taken.add(best);
    out.set(id, { position: places[best], yaw: heading(places[best], { x: 0, z: 0 }) });
  }
  const motion = (beat: number) => {
    const frame = result.motion(beat);
    const kIn = 1 - progress(beat / step);
    const kOut = progress((beat - (beats - step)) / step);
    const moved: MovedBody[] = frame.bodies.map((b) => {
      if (!ids.includes(b.id)) return b;
      const h = home.get(b.id)!;
      const i = inside.get(b.id)!;
      const e = ends.get(b.id)!;
      const o = out.get(b.id)!;
      const p = add(
        add(b.position, scale(sub(h.position, i.position), kIn)),
        scale(sub(o.position, e.position), kOut),
      );
      const yaw = b.yaw + turn(h.yaw, i.yaw) * kIn + turn(o.yaw, e.yaw) * kOut;
      const w = toWorld(p, yaw);
      return { ...b, position: w.position, yaw: w.yaw };
    });
    // Hand points are found again from where the dancers stand, and hands
    // join only once they reach (while stepping in) and let go as they step out.
    const map = new Map(state.bodies);
    for (const b of moved) map.set(b.id, { position: b.position, yaw: b.yaw });
    const contacts: FigureContact[] = frame.contacts.map(({ point: _p, ...c }) =>
      withinReach(c, map),
    );
    return { bodies: moved, contacts };
  };
  return {
    kind: result.kind,
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
    ...(result.styled ? { styled: result.styled } : {}),
  };
}
