/**
 * Strip the willow (both actives stripping together).
 *
 * Definition: the top couple turns by the right about one and a half times,
 * moving down into the middle, so each faces the opposite line one place
 * down. Each active turns the dancer of the other role there (the next
 * dancer on the partner's line) by the left once round, then meets the
 * partner in the middle and turns by the right on to the next place down;
 * so on down the set. After the last couple, partners turn by the right
 * half way back to their own sides, now the bottom couple. Each couple,
 * once turned, moves up a place along its lines.
 * Source: Scottish/ceilidh and ECD manuals ("strip the willow"); Caller's
 * Box glossary, "Strip the willow"; ContraDB row "top couple strip the
 * willow" (Strip the Ironwood, a triplet).
 * Reading: both actives strip at the same time (lark down the robins'
 * line, robin down the larks' line); the beats are shared in proportion to
 * how far each turn goes (1 1/2 at the top, 1 for each turn on the way
 * down, 1/2 at the bottom).
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { add, heading, length, mix, polar, progress, rotate, smooth, sub, TAU } from '../../core/math.ts';
import { body, withChanges, type Hold } from '../../core/state.ts';
import { choreograph, facingIn, type Path, placeOf, places, sideSign, window01 } from './common.ts';

export interface StripParams {
  who: string;
}

/** Center of each side turn, from the middle of the set. */
const SIDE_CENTER = 0.7;
/** Radius of each side turn. */
const SIDE_RADIUS = 0.42;
/** Radius of the partner turns at their closest. */
const HOLD = 0.45;

const posmod = (a: number) => ((a % TAU) + TAU) % TAU;

interface Orbit {
  /** Center of the turn at its start and end (a partner turn moves down the set). */
  c0: Vec2;
  c1: Vec2;
  from: number;
  sweep: number;
  r0: number;
  r1: number;
  /** Radius in the middle of the turn (the hold). */
  rm: number;
}

const orbitAt = (o: Orbit, w: number): Vec2 => {
  const dip = Math.min(smooth(w / 0.3), smooth((1 - w) / 0.3));
  const ends = o.r0 + (o.r1 - o.r0) * smooth(w);
  const r = ends + (o.rm - ends) * dip;
  const t = progress(w);
  const a = o.from + o.sweep * t;
  return add(mix(o.c0, o.c1, t), { x: r * Math.cos(a), z: r * Math.sin(a) });
};

/** A turn from p (round c0) to q (round c1), clockwise (sign 1) or not, plus whole turns. */
function between(c0: Vec2, c1: Vec2, p: Vec2, q: Vec2, sign: number, extra: number, rm: number): Orbit {
  const a = polar(sub(p, c0));
  const b = polar(sub(q, c1));
  const sweep = sign > 0 ? posmod(b - a) + extra * TAU : -(posmod(a - b) + extra * TAU);
  return { c0, c1, from: a, sweep, r0: length(sub(p, c0)), r1: length(sub(q, c1)), rm };
}

export const stripTheWillow: Figure<StripParams> = (state, params, beats) => {
  onlyKeys('strip-the-willow', params, ['who']);
  if (typeof params.who !== 'string') throw new Error('strip-the-willow needs the top couple.');
  if (state.hands.length) throw new Error('Strip the willow starts with free hands.');
  const all = places(state);
  const p = placeOf(state, all, params.who, 'strip-the-willow');
  if (p !== 0) throw new Error(`strip-the-willow: the ${params.who} must be at the top.`);
  const n = all.length;
  if (n < 2) throw new Error('strip-the-willow needs another couple.');
  const lark = all[0].lark;
  const robin = all[0].robin;
  const z = all.map((c) => c.z);
  // Each active's side turns are on the partner's line.
  const sideOfActive = new Map([
    [lark, sideSign(state, robin)],
    [robin, sideSign(state, lark)],
  ]);
  const spot = (id: number, k: number): Vec2 => ({
    x: sideOfActive.get(id)! * (SIDE_CENTER - SIDE_RADIUS),
    z: z[k],
  });
  // Turns in order, weighted by how far they go.
  const parts: { weight: number; kind: 'partner' | 'side'; k: number }[] = [
    { weight: 1.5, kind: 'partner', k: 0 },
  ];
  for (let k = 1; k < n; k++) {
    parts.push({ weight: 1, kind: 'side', k });
    parts.push({ weight: k === n - 1 ? 0.5 : 1, kind: 'partner', k });
  }
  const total = parts.reduce((a, b) => a + b.weight, 0);
  const bounds = [0];
  for (const q of parts) bounds.push(bounds[bounds.length - 1] + q.weight / total);
  const partAt = (u: number) => Math.min(parts.length - 1, bounds.findLastIndex((b) => b <= u));

  const paths = new Map<number, Path>();
  const holds: { hold: Hold; part: number }[] = [];
  const corners = new Map<number, number>();
  for (const id of [lark, robin]) {
    const home = body(state, id).position;
    const side = sideOfActive.get(id)!;
    const orbits: Orbit[] = parts.map((q, i) => {
      if (q.kind === 'side') {
        const c = { x: side * SIDE_CENTER, z: z[q.k] };
        return between(c, c, spot(id, q.k), spot(id, q.k), -1, 1, SIDE_RADIUS);
      }
      // Partner turns by the right: 1 1/2 at the top, once on down the set, 1/2 at the bottom.
      const from = i === 0 ? home : spot(id, q.k);
      const last = q.k === n - 1;
      const to = last ? { x: home.x, z: z[n - 1] } : spot(id, q.k + 1);
      const c0 = { x: 0, z: from.z };
      const c1 = { x: 0, z: to.z };
      const extra = i === 0 || (!last && i > 0) ? 1 : 0;
      const o = between(c0, c1, from, to, 1, extra, HOLD);
      // Once round on down the set comes back to the same angle: a whole turn.
      return !last && i > 0 ? { ...o, sweep: TAU } : o;
    });
    const at = (u: number) => {
      const i = partAt(u);
      return orbitAt(orbits[i], window01(u, bounds[i], bounds[i + 1]));
    };
    paths.set(id, {
      pos: at,
      yaw: (u) => {
        if (u >= 1) return facingIn(-side);
        const a = at(Math.max(0, u - 0.002));
        const b = at(Math.min(1, u + 0.002));
        return heading(a, b);
      },
      unwrap: true,
    });
  }
  // The couples turned: each side turn's dancer steps out to turn, then moves up a place.
  for (let k = 1; k < n; k++) {
    const part = 2 * k - 1;
    const [a, b] = [bounds[part], bounds[part + 1]];
    for (const active of [lark, robin]) {
      const side = sideOfActive.get(active)!;
      const c = all[k];
      const id = sideSign(state, c.lark) === side ? c.lark : c.robin;
      corners.set(id, active);
      const home = body(state, id);
      const out: Vec2 = { x: side * (SIDE_CENTER + SIDE_RADIUS), z: z[k] };
      const center = { x: side * SIDE_CENTER, z: z[k] };
      const up: Vec2 = { x: home.position.x, z: z[k - 1] };
      const step = Math.min(1.2 / beats, a * 0.5);
      const pos = (u: number): Vec2 => {
        if (u < a) return add(home.position, { x: (out.x - home.position.x) * smooth((u - (a - step)) / step), z: 0 });
        if (u <= b) return add(center, rotate(sub(out, center), -TAU * progress(window01(u, a, b))));
        return mix(out, up, progress(window01(u, b, 1)));
      };
      const tangent = (u: number) => {
        const pt = pos(u);
        return heading(pt, add(pt, rotate(sub(pt, center), -Math.PI / 2)));
      };
      paths.set(id, {
        pos,
        yaw: (u) => {
          if (u < a) return home.yaw + angleTo(tangent(a), home.yaw) * smooth((u - (a - step)) / step);
          if (u <= b) return tangent(u);
          return tangent(b) + angleTo(home.yaw, tangent(b)) * smooth((u - b) / step);
        },
        unwrap: true,
      });
      holds.push({ hold: { a: active, handA: 'left', b: id, handB: 'left' }, part });
    }
  }
  parts.forEach((q, i) => {
    if (q.kind === 'partner') holds.push({ hold: { a: lark, handA: 'right', b: robin, handB: 'right' }, part: i });
  });

  const bodies = choreograph(state, beats, paths, 0.75);
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const map = bodyMap(moved);
    const u = beat / beats;
    const contacts: FigureContact[] = holds
      .map(({ hold, part }) => {
        const w = window01(u, bounds[part], bounds[part + 1]);
        const on = u > bounds[part] && u < bounds[part + 1] ? Math.min(smooth(w / 0.2), smooth((1 - w) / 0.2)) : 0;
        return withinReach(joined(hold, on), map);
      })
      .filter((c) => c.strength > 0.01);
    return { bodies: moved, contacts };
  };
  return { kind: 'allemande', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};

const angleTo = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
