/**
 * Split and cast home ("ones split the twos, then cast home", "ones split
 * twos, return to place").
 *
 * Definition: the splitting couple, side by side and facing the other
 * couple, walks forward between the two dancers of that couple (who step
 * apart to let them through and back in after), a little past them; then
 * the two separate, each turning away from the other, and walk back up the
 * outside of the other couple to their own places, ending facing the way
 * they started.
 * Source: ContraDB rows "ones split the twos, then cast home" (2513, 2514),
 * "ones split twos, return to place" (351). The path is a smooth curve
 * through its waypoints, walked at an even pace (ramped at the ends).
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { length, mix, progress, smooth, sub, turn } from '../core/math.ts';
import { body, minorSets, withChanges } from '../core/state.ts';

export interface SplitParams {
  /** The couple that splits the other couple and comes home. */
  who: '1s' | '2s';
}

/** Half the gap the splitters walk through, side by side. */
const THROUGH = 0.36;
/** How far past the other couple's line the splitters go before turning. */
const PAST = 0.85;
/** Distance from the set's middle line to the outside path home. */
const OUTSIDE = 1.5;
/** How far the split couple steps apart, from the middle line. */
const APART = 1.15;
const SAMPLES = 240;

export const split: Figure<SplitParams> = (state, params, beats) => {
  onlyKeys('split', params, ['who']);
  const who = oneOf('split', 'who', params.who, ['1s', '2s'] as const);
  if (beats < 6) throw new Error('Splitting a couple and coming home takes six beats or more.');
  const named = state.positions.get(who) ?? [];
  const plans = minorSets(state).flatMap((g) => {
    const splitters = g.filter((id) => named.includes(id));
    const others = g.filter((id) => !named.includes(id));
    if (splitters.length !== 2 || others.length !== 2)
      throw new Error(`The ${who} and the other couple must share the minor set.`);
    const sp = splitters.map((id) => body(state, id).position);
    const op = others.map((id) => body(state, id).position);
    const middleX = (sp[0].x + sp[1].x + op[0].x + op[1].x) / 4;
    const zS = (sp[0].z + sp[1].z) / 2;
    const zO = (op[0].z + op[1].z) / 2;
    const d = Math.sign(zO - zS);
    if (!d || Math.abs(zO - zS) < 1 || Math.abs(sp[0].z - sp[1].z) > 0.3 || Math.abs(op[0].z - op[1].z) > 0.3)
      throw new Error('Splitting needs the two couples side by side, one above the other.');
    const walkers = splitters.map((id) => {
      const s = body(state, id);
      const side = Math.sign(s.position.x - middleX) || 1;
      const points: Vec2[] = [
        s.position,
        { x: middleX + side * THROUGH, z: zO - d * 0.5 },
        { x: middleX + side * THROUGH, z: zO + d * PAST * 0.4 },
        // A round turn out at the far end.
        ...[0.25, 0.5, 0.75].map((k) => {
          const a = Math.PI * k;
          const r = (OUTSIDE - THROUGH) / 2;
          return {
            x: middleX + side * (THROUGH + r - r * Math.cos(a)),
            z: zO + d * (PAST * 0.4 + r * Math.sin(a)),
          };
        }),
        { x: middleX + side * OUTSIDE, z: zO + d * PAST * 0.4 },
        { x: middleX + side * OUTSIDE, z: zO },
        { x: middleX + side * OUTSIDE, z: zS + d * 0.5 },
        s.position,
      ];
      const track = evenTrack(points);
      // The travel heading against the starting facing, unwrapped so it
      // never jumps a full turn.
      const offsets: number[] = [];
      let last = 0;
      for (let i = 0; i <= SAMPLES; i++) {
        const u = i / SAMPLES;
        const v = sub(track(Math.min(1, u + 0.005)), track(Math.max(0, u - 0.005)));
        const h = length(v) > 1e-9 ? Math.atan2(v.x, v.z) : s.yaw + last;
        last += turn(turn(h, s.yaw), last);
        offsets.push(last);
      }
      const offset = (u: number) => {
        const k = Math.min(SAMPLES - 1, Math.floor(u * SAMPLES));
        const f = u * SAMPLES - k;
        return offsets[k] + (offsets[k + 1] - offsets[k]) * f;
      };
      return { id, s, track, offset };
    });
    const steppers = others.map((id) => {
      const s = body(state, id);
      const side = Math.sign(s.position.x - middleX) || 1;
      return { id, s, apart: { x: middleX + side * APART, z: s.position.z } };
    });
    return [{ walkers, steppers }];
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const q = progress(t);
    const bodies = plans.flatMap((p) => [
      ...p.walkers.map((w) => {
        // Face the way the path goes, back to the starting facing at the end.
        const into = smooth(t / 0.12) * (1 - smooth((t - 0.7) / 0.3));
        return { id: w.id, position: w.track(q), yaw: w.s.yaw + w.offset(q) * into };
      }),
      ...p.steppers.map((o) => {
        // Apart while the splitters come through, back in before they pass outside.
        const out = Math.min(smooth((t - 0.02) / 0.18), 1 - smooth((t - 0.32) / 0.18));
        return { id: o.id, position: mix(o.s.position, o.apart, out), yaw: o.s.yaw };
      }),
    ]);
    return { bodies, contacts: [] };
  };
  return {
    kind: 'unknown',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

/** A smooth curve through the points, walked at an even pace for u in [0, 1]. */
function evenTrack(points: readonly Vec2[]) {
  const n = points.length - 1;
  const at = (s: number) => {
    const i = Math.min(n - 1, Math.floor(s * n));
    const u = s * n - i;
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n, i + 2)];
    const k = (a: number, b: number, c: number, e: number) =>
      0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - e) * u * u + (-a + 3 * b - 3 * c + e) * u * u * u);
    return { x: k(p0.x, p1.x, p2.x, p3.x), z: k(p0.z, p1.z, p2.z, p3.z) };
  };
  const lengths = [0];
  for (let i = 1; i <= SAMPLES; i++)
    lengths.push(lengths[i - 1] + length(sub(at(i / SAMPLES), at((i - 1) / SAMPLES))));
  const total = lengths[SAMPLES];
  return (u: number) => {
    const want = u * total;
    const i = Math.max(1, lengths.findIndex((l) => l >= want - 1e-12));
    const span = lengths[i] - lengths[i - 1];
    const f = span > 0 ? (want - lengths[i - 1]) / span : 0;
    return at((i - 1 + f) / SAMPLES);
  };
}

