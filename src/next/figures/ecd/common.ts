/**
 * Shared geometry for the ECD-style whole-set figures (triplets, longways
 * sets of four to six couples): places along the set, rounded tracks that
 * dancers walk, and a choreographer that samples every dancer's path once,
 * smooths the facing so nobody snaps round, and serves motion(beat).
 *
 * Places: couples stand in places along the set, top (lowest z, next to the
 * band) first. A place is where a couple's middle stands now; figures read
 * places from the bodies, never from a dance's title or a couple's number.
 */
import type { Vec2 } from '../../../types.ts';
import type { MovedBody } from '../../core/figure.ts';
import { SET } from '../../core/config.ts';
import { add, clamp, distance, ease, heading, mix, scale, smooth, sub, TAU, turn } from '../../core/math.ts';
import { couplesByPlace } from '../../core/progression-more.ts';
import { body, type DanceState } from '../../core/state.ts';

export interface Place {
  readonly lark: number;
  readonly robin: number;
  /** Middle of the couple. */
  readonly z: number;
}

/** Couples top to bottom where they stand now. */
export function places(state: DanceState): Place[] {
  const active = new Set(state.groups.flat());
  return couplesByPlace(state)
    .filter((c) => active.has(c.lark) || active.has(c.robin))
    .map((c) => ({ lark: c.lark, robin: c.robin, z: c.center.z }));
}

/** The place index of the couple a position label ("1s"), "top" or "bottom" names. */
export function placeOf(state: DanceState, all: readonly Place[], who: string, move: string) {
  if (who === 'top') return 0;
  if (who === 'bottom') return all.length - 1;
  const ids = state.positions.get(who);
  if (!ids) throw new Error(`${move}: nobody is called "${who}" here.`);
  const i = all.findIndex((p) => ids.includes(p.lark) && ids.includes(p.robin));
  if (i < 0) throw new Error(`${move}: the ${who} are not a couple standing in a place.`);
  return i;
}

/** A target place: a 1-based place number, "top" or "bottom". */
export type PlaceName = number | 'top' | 'bottom';

export function placeIndex(name: unknown, count: number, move: string): number {
  if (name === 'top') return 0;
  if (name === 'bottom') return count - 1;
  if (typeof name === 'number' && Number.isInteger(name) && name >= 1 && name <= count)
    return name - 1;
  throw new Error(`${move}: no place "${String(name)}" in a set of ${count} couples.`);
}

/** Which side line a dancer stands on: -1 (west, -x) or +1 (east, +x). */
export function sideSign(state: DanceState, id: number): -1 | 1 {
  return body(state, id).position.x < 0 ? -1 : 1;
}

/** The yaw that faces straight across the set from a side line, toward the middle. */
export const facingIn = (side: number) => (side < 0 ? Math.PI / 2 : -Math.PI / 2);

/**
 * A walked path through way points, corners rounded so dancers turn
 * smoothly: each corner is cut back `radius` along both legs and rounded by
 * corner cutting. Measured by arc length.
 */
export class Track {
  private readonly pts: Vec2[];
  private readonly cum: number[];
  readonly length: number;

  constructor(points: readonly Vec2[], radius = 0.35) {
    let pts: Vec2[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1];
      const v = points[i];
      const b = points[i + 1];
      const la = distance(a, v);
      const lb = distance(v, b);
      const ca = Math.min(radius, la / 2);
      const cb = Math.min(radius, lb / 2);
      pts.push(mix(v, a, ca / la), v, mix(v, b, cb / lb));
    }
    pts.push(points[points.length - 1]);
    pts = pts.filter((p, i) => i === 0 || distance(p, pts[i - 1]) > 1e-9);
    for (let k = 0; k < 5; k++) {
      const next: Vec2[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        next.push(mix(pts[i], pts[i + 1], 0.25), mix(pts[i], pts[i + 1], 0.75));
      }
      next.push(pts[pts.length - 1]);
      pts = next;
    }
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + distance(pts[i], pts[i - 1]));
    this.length = this.cum[this.cum.length - 1];
  }

  private seg(s: number) {
    const c = this.cum;
    let lo = 0;
    let hi = c.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (c[m] <= s) lo = m;
      else hi = m;
    }
    return lo;
  }

  /** Point at arc length s (clamped to the track). */
  at(s: number): Vec2 {
    const x = clamp(s, 0, this.length);
    const i = this.seg(x);
    const span = this.cum[i + 1] - this.cum[i];
    return mix(this.pts[i], this.pts[i + 1], span > 0 ? (x - this.cum[i]) / span : 0);
  }

  /** Heading (yaw) of travel at arc length s. */
  heading(s: number): number {
    const x = clamp(s, 0, this.length);
    const i = Math.min(this.seg(x), this.pts.length - 2);
    return heading(this.pts[i], this.pts[i + 1]);
  }

  /** Arc length of the track point nearest p. */
  nearest(p: Vec2): number {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i];
      const d = sub(this.pts[i + 1], a);
      const l2 = d.x * d.x + d.z * d.z;
      const t = l2 > 0 ? clamp(((p.x - a.x) * d.x + (p.z - a.z) * d.z) / l2) : 0;
      const q = add(a, scale(d, t));
      const dd = distance(p, q);
      if (dd < bestD) {
        bestD = dd;
        best = this.cum[i] + t * Math.sqrt(l2);
      }
    }
    return best;
  }
}

/** One dancer's path through a figure, u in [0, 1]. */
export interface Path {
  pos(u: number): Vec2;
  /**
   * Preferred facing. With `unwrap` the choreographer unwraps the samples;
   * otherwise the values must already be continuous.
   */
  yaw(u: number): number;
  readonly unwrap?: boolean;
}

/** Samples per beat. */
const RATE = 48;

/**
 * Sample every path, smooth each facing over about `smoothBeats` (a
 * window that shrinks to nothing at both ends, so the figure starts and
 * ends exactly on the given facings) and serve bodies by beat. Positions
 * start exactly where the state has the dancers.
 */
export function choreograph(
  state: DanceState,
  beats: number,
  paths: ReadonlyMap<number, Path>,
  smoothBeats = 1,
): (beat: number) => MovedBody[] {
  const n = Math.max(8, Math.ceil(beats * RATE));
  const half = Math.round((smoothBeats * RATE) / 2);
  const tracks = [...paths].map(([id, p]) => {
    const start = body(state, id);
    const pos: Vec2[] = [];
    const raw: number[] = [];
    // Continuous facings keep their shape, moved by whole turns to meet the start.
    const offset = Math.round((start.yaw - p.yaw(0)) / TAU) * TAU;
    const gap = sub(start.position, p.pos(0));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      // A path that starts off where the dancer stands takes up the gap over a beat.
      const fade = 1 - smooth((u * beats) / Math.min(1, beats / 4));
      pos.push(i === 0 ? start.position : add(p.pos(u), scale(gap, fade)));
      let y = i === 0 ? start.yaw : p.yaw(u);
      if (i > 0) y = p.unwrap ? raw[i - 1] + turn(y, raw[i - 1]) : y + offset;
      raw.push(y);
    }
    // Ease in from the starting facing and out to the final one, slowly
    // enough for a big turn (about 2.4 radians a beat at most).
    const at = (beat: number) => raw[Math.min(n, Math.round((beat / beats) * n))];
    const lead = Math.max(0.6, Math.abs(at(1) - raw[0]) / 2.4, smoothBeats / 2);
    const tail = Math.max(0.6, Math.abs(at(beats - 1) - raw[n]) / 2.4, smoothBeats / 2);
    for (let i = 0; i <= n; i++) {
      const beat = (i / n) * beats;
      const a = smooth(beat / lead);
      const b = smooth((beats - beat) / tail);
      raw[i] = raw[n] + (raw[0] + (raw[i] - raw[0]) * a - raw[n]) * b;
    }
    const prefix = [0];
    for (const y of raw) prefix.push(prefix[prefix.length - 1] + y);
    const yaw = raw.map((_, i) => {
      const h = Math.min(half, i, n - i);
      return (prefix[i + h + 1] - prefix[i - h]) / (2 * h + 1);
    });
    return { id, pos, yaw };
  });
  return (beat: number) => {
    const f = (clamp(beat, 0, beats) / beats) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const t = f - i;
    return tracks.map((k) => ({
      id: k.id,
      position: t === 0 ? k.pos[i] : t === 1 ? k.pos[i + 1] : mix(k.pos[i], k.pos[i + 1], t),
      yaw: k.yaw[i] + (k.yaw[i + 1] - k.yaw[i]) * t,
    }));
  };
}

/** Map u in [a, b] to [0, 1], clamped. */
export const window01 = (u: number, a: number, b: number) => clamp((u - a) / (b - a));

/** A dancer who walks straight from where they stand to `to` in [a, b], keeping their facing. */
export function slidePath(state: DanceState, id: number, to: Vec2, a = 0.2, b = 0.8): Path {
  const s = body(state, id);
  return {
    pos: (u) => mix(s.position, to, ease(window01(u, a, b))),
    yaw: () => s.yaw,
  };
}

/** Spacing of places along the set. */
export const SLOT = SET.slot;
