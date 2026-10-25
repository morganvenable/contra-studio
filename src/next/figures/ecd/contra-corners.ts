/**
 * Contra corners (turn contra corners).
 *
 * Definition: the active couple, in a middle place with a couple above and
 * below, turns partner by the right in the middle until each faces their
 * first corner, turns that corner by the left once round, turns partner by
 * the right again to face their second corner, turns that corner by the
 * left once round, and turns partner by the right back to their own places,
 * facing across. Each active's corners are the two dancers on the partner's
 * line in the places above and below; the first corner is the one on the
 * active's left when they cross toward the partner's line (a lark on the
 * west line turns the robin above first, the robin the lark below). The
 * three right-hand turns with the partner make one whole turn between them;
 * corners step in to turn and back to place.
 * Source: Caller's Box glossary, "Contra corners"; ECD manuals (Chorus Jig:
 * "first man's first corner is the second woman"); ContraDB rows "ones
 * contra corners", "twos contra corners (actives)".
 * Reading: 16 beats split 3 + 4 + 2 + 4 + 3 (partner, first corner,
 * partner, second corner, partner); corners are turned by the left, the
 * partner by the right.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import {
  add,
  dot,
  heading,
  leftOf,
  length,
  mean,
  mix,
  polar,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, partnerOf, withChanges, type Hold } from '../../core/state.ts';
import { choreograph, facingIn, type Path, placeOf, places, sideSign, window01 } from './common.ts';

export interface ContraCornersParams {
  who: string;
}

/** Share of the figure for each part: partner, corner, partner, corner, partner. */
const PARTS = [3, 4, 2, 4, 3].map((b) => b / 16);
/** Actives' distance from the middle when they meet a corner. */
const MEET = 0.7;
/** Distance from each dancer to the joined hands while turning. */
const HOLD = 0.45;

const posmod = (a: number) => ((a % TAU) + TAU) % TAU;
const fromPolar = (c: Vec2, r: number, a: number): Vec2 => add(c, { x: r * Math.cos(a), z: r * Math.sin(a) });

export const contraCorners: Figure<ContraCornersParams> = (state, params, beats) => {
  onlyKeys('contra-corners', params, ['who']);
  if (typeof params.who !== 'string') throw new Error('contra-corners needs the active couple.');
  if (state.hands.length) throw new Error('Contra corners start with free hands.');
  const all = places(state);
  const m = placeOf(state, all, params.who, 'contra-corners');
  if (m === 0 || m === all.length - 1)
    throw new Error(`contra-corners: the ${params.who} need a couple above and below.`);
  const actives = [all[m].lark, all[m].robin];
  const center = mean(actives.map((id) => body(state, id).position));
  const bounds = [0];
  for (const p of PARTS) bounds.push(bounds[bounds.length - 1] + p);
  // A corner turn: once round by the left.
  const around = (w: number) => -TAU * progress(w);

  const paths = new Map<number, Path>();
  const holds: { hold: Hold; part: number }[] = [];
  for (const x of actives) {
    const y = partnerOf(state, x);
    const ySide = sideSign(state, y);
    const home = body(state, x);
    const corners = [all[m - 1], all[m + 1]].map((c) =>
      sideSign(state, c.lark) === ySide ? c.lark : c.robin,
    );
    const toward = heading(home.position, body(state, y).position);
    corners.sort(
      (a, b) =>
        dot(leftOf(toward), sub(body(state, b).position, center)) -
        dot(leftOf(toward), sub(body(state, a).position, center)),
    );
    const theta0 = polar(sub(home.position, center));
    const r0 = length(sub(home.position, center));
    const meet = corners.map((k) => polar(sub(body(state, k).position, center)));
    const spots = meet.map((a) => fromPolar(center, MEET, a));
    // The three partner turns, each a right-hand (clockwise) sweep.
    const sweeps = [
      posmod(meet[0] - theta0),
      posmod(meet[1] - meet[0]),
      posmod(theta0 - meet[1]),
    ];
    const turns = [
      { from: theta0, r0, sweep: sweeps[0], r1: MEET },
      { from: meet[0], r0: MEET, sweep: sweeps[1], r1: MEET },
      { from: meet[1], r0: MEET, sweep: sweeps[2], r1: r0 },
    ];
    // Each corner turn: the active and the corner orbit their middle by the left, once.
    const orbits = corners.map((k, i) => {
      const k0 = body(state, k).position;
      const a = spots[i];
      const kIn = add(a, scale(sub(k0, a), (2 * HOLD) / length(sub(k0, a))));
      const mid = mean([a, kIn]);
      return { k, k0, mid, aRel: sub(a, mid), kRel: sub(k0, mid), kR0: length(sub(k0, mid)) };
    });
    const centerTurn = (i: number, u: number) => {
      const t = turns[i];
      const angle = t.from + t.sweep * progress(u);
      const dip = Math.min(smooth(u / 0.35), smooth((1 - u) / 0.35));
      const ends = t.r0 + (t.r1 - t.r0) * smooth(u);
      const r = ends + (HOLD - ends) * dip;
      return fromPolar(center, r, angle);
    };
    const walkAround = (c: Vec2, p: Vec2, sign: number) =>
      heading(p, add(p, rotate(sub(p, c), (sign * Math.PI) / 2)));
    paths.set(x, {
      pos: (u) => {
        const i = Math.min(4, bounds.findLastIndex((b) => b <= u));
        const w = window01(u, bounds[i], bounds[i + 1]);
        if (i % 2 === 0) return centerTurn(i / 2, w);
        const o = orbits[(i - 1) / 2];
        return add(o.mid, rotate(o.aRel, around(w)));
      },
      yaw: (u) => {
        if (u >= 1) return facingIn(sideSign(state, x));
        const i = Math.min(4, bounds.findLastIndex((b) => b <= u));
        const w = window01(u, bounds[i], bounds[i + 1]);
        if (i % 2 === 0) return walkAround(center, centerTurn(i / 2, w), 1);
        const o = orbits[(i - 1) / 2];
        return walkAround(o.mid, add(o.mid, rotate(o.aRel, around(w))), -1);
      },
      unwrap: true,
    });
    orbits.forEach((o, i) => {
      const part = 1 + 2 * i;
      const [a, b] = [bounds[part], bounds[part + 1]];
      // The corner steps in while the actives turn toward them, and back after.
      const step = Math.min(1.25 / beats, PARTS[part - 1] * 0.8, PARTS[part + 1] * 0.8);
      const kHome = body(state, o.k);
      const kIn = add(o.mid, o.kRel.x === 0 && o.kRel.z === 0 ? o.kRel : scale(o.kRel, HOLD / o.kR0));
      const kPos = (u: number): Vec2 => {
        if (u < a) return mix(o.k0, kIn, smooth((u - (a - step)) / step));
        if (u > b) return mix(kIn, o.k0, smooth((u - b) / step));
        return add(o.mid, rotate(sub(kIn, o.mid), around(window01(u, a, b))));
      };
      const tangent = (u: number) => walkAround(o.mid, kPos(Math.min(b, Math.max(a, u))), -1);
      paths.set(o.k, {
        pos: kPos,
        yaw: (u) => {
          if (u < a) return kHome.yaw + turn(tangent(a), kHome.yaw) * smooth((u - (a - step)) / step);
          if (u > b) return tangent(b) + turn(kHome.yaw, tangent(b)) * smooth((u - b) / step);
          return tangent(u);
        },
        unwrap: true,
      });
      holds.push({ hold: { a: x, handA: 'left', b: o.k, handB: 'left' }, part });
    });
  }
  for (const part of [0, 2, 4])
    holds.push({ hold: { a: actives[0], handA: 'right', b: actives[1], handB: 'right' }, part });

  const bodies = choreograph(state, beats, paths, 0.75);
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const map = bodyMap(moved);
    const u = beat / beats;
    const contacts: FigureContact[] = holds.map(({ hold, part }) => {
      const w = window01(u, bounds[part], bounds[part + 1]);
      const on = u > bounds[part] && u < bounds[part + 1] ? Math.min(smooth(w / 0.2), smooth((1 - w) / 0.2)) : 0;
      return withinReach(joined(hold, on), map);
    });
    return { bodies: moved, contacts: contacts.filter((c) => c.strength > 0.01) };
  };
  return {
    kind: 'allemande',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
