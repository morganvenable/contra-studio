/**
 * Whole set circle ("whole set circle left", "oval left"): everyone in a
 * longways set joins hands in one long ring round the set and walks it.
 *
 * Definition: the whole set (or the group dancing) joins hands in a ring
 * round the outside of the set, an oval with the two lines as its long
 * sides, and walks it to the left (clockwise from above) or right a number
 * of places, each dancer following the ring of places, ending facing in.
 * Source: Playford/ECD manuals ("all circle", "hands all round"); ContraDB
 * rows "whole set circle left", "whole set circle right", "Oval left",
 * "Oval right".
 * Reading: with no amount named, the ring goes as far as a steady walk
 * (0.75 m a beat) carries it, a whole number of places; the matching circle
 * back the other way, with the same beats, brings everyone home.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { clamp, distance, heading, mean, mix, polar, progress, smooth, sub } from '../../core/math.ts';
import { body, minorSets, withChanges, type Hold } from '../../core/state.ts';
import { choreograph, facingIn, type Path, SLOT } from './common.ts';
import { WALK } from './center-travel.ts';

export interface SetCircleParams {
  direction: 'left' | 'right';
  places?: number;
}

/** How much the lines close in while circling (across the set only). */
const TIGHTEN = 0.2;

export const setCircle: Figure<SetCircleParams> = (state, params, beats) => {
  onlyKeys('set-circle', params, ['direction', 'places']);
  const direction = oneOf('set-circle', 'direction', params.direction, ['left', 'right'] as const);
  const count = params.places ?? Math.max(1, Math.floor((WALK * beats) / SLOT));
  if (!(Number.isInteger(count) && count >= 1)) throw new Error('set-circle places must be whole.');
  if (state.hands.length) throw new Error('A circle starts with free hands.');
  const sign = direction === 'left' ? 1 : -1;
  const paths = new Map<number, Path>();
  const holds: Hold[] = [];
  const edge = Math.min(0.25, 1.5 / beats);
  for (const group of minorSets(state)) {
    const n = group.length;
    if (n < 4) throw new Error('A whole set circle needs at least two couples.');
    const center = mean(group.map((id) => body(state, id).position));
    const order = [...group].sort(
      (a, b) =>
        polar(sub(body(state, a).position, center)) - polar(sub(body(state, b).position, center)),
    );
    const pts = order.map((id) => body(state, id).position);
    const cum = [0];
    for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + distance(pts[i - 1], pts[i % n]));
    const total = cum[n];
    const at = (s: number): Vec2 => {
      const x = ((s % total) + total) % total;
      const i = Math.min(n - 1, cum.findLastIndex((c) => c <= x));
      return mix(pts[i], pts[(i + 1) % n], (x - cum[i]) / (cum[i + 1] - cum[i]));
    };
    const zs = pts.map((p) => p.z);
    const inset = Math.min(SLOT / 2, (Math.max(...zs) - Math.min(...zs)) / 2);
    const top = Math.min(...zs) + inset;
    const bottom = Math.max(...zs) - inset;
    order.forEach((id, i) => {
      const k = (((i + sign * count) % n) + n) % n;
      let travel = cum[k] - cum[i];
      if (sign > 0 && travel <= 0) travel += total;
      if (sign < 0 && travel >= 0) travel -= total;
      const posAt = (u: number) => {
        const p = at(cum[i] + travel * progress(u));
        const f = 1 - TIGHTEN * Math.min(smooth(u / edge), smooth((1 - u) / edge));
        return { x: center.x + (p.x - center.x) * f, z: p.z };
      };
      const end = pts[k];
      paths.set(id, {
        pos: posAt,
        yaw: (u) => {
          if (u >= 1) return facingIn(end.x < center.x ? -1 : 1);
          const p = posAt(u);
          return heading(p, { x: center.x, z: clamp(p.z, top, bottom) });
        },
        unwrap: true,
      });
      holds.push({ a: id, handA: 'left', b: order[(i + 1) % n], handB: 'right' });
    });
  }
  const bodies = choreograph(state, beats, paths, 1);
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const map = bodyMap(moved);
    const u = beat / beats;
    const strength = Math.min(smooth((u / edge - 0.5) / 0.5), smooth(((1 - u) / edge - 0.5) / 0.5));
    return { bodies: moved, contacts: holds.map((h) => withinReach(joined(h, strength), map)) };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
