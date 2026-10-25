/**
 * Hey for three (and parallel heys: one on each side line at once).
 *
 * Definition: three dancers in a line weave a figure eight round the two
 * end places: the middle dancer starts by passing the named end by the
 * named shoulder, and each dancer, in turn, passes the others alternately
 * by right and left shoulders, looping round each end place. A whole hey
 * brings everyone home; a half hey leaves the ends trading places.
 * Source: Playford/ECD manuals ("hey for three"); Caller's Box glossary,
 * "Hey for three"; ContraDB rows "parallel heys for three - robins 1 pass
 * robins 2, larks 1 pass larks 3 by right shoulders to start" (Thatcher
 * Pass), "Hey for three, start passing left shoulders" (triplets).
 * Readings: the eight is a lemniscate whose loops end on the two end
 * places, 0.5 m either side of the line in the middle; dancers travel it
 * a third of the eight apart (easing from where they stand), at one pace.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { add, dot, length, leftOf, rightOf, scale, smooth, sub, progress, heading } from '../../core/math.ts';
import { activeIds, body, withChanges } from '../../core/state.ts';
import { choreograph, type Path, Track } from './common.ts';

export interface HeyLine {
  /** Who the line is: a role group ("robins") or position label. */
  who: string;
  /** The middle dancer's couple ("1s"). */
  active: string;
  /** The end the middle dancer passes first ("2s"). */
  first: string;
}

export interface HeyForThreeParams {
  lines: HeyLine[];
  shoulder: 'right' | 'left';
  amount?: number;
}

/** Half the width of the eight. */
const HALF_WIDTH = 0.5;

const ROLES: Readonly<Record<string, string>> = { larks: 'lark', robins: 'robin' };

export const heyForThree: Figure<HeyForThreeParams> = (state, params, beats) => {
  onlyKeys('hey-for-three', params, ['lines', 'shoulder', 'amount']);
  const shoulder = oneOf('hey-for-three', 'shoulder', params.shoulder, ['right', 'left'] as const);
  const amount = params.amount ?? 1;
  if (amount !== 0.5 && amount !== 1) throw new Error('A hey for three is whole or half.');
  if (!Array.isArray(params.lines) || !params.lines.length)
    throw new Error('hey-for-three needs its lines.');
  const ids = activeIds(state);
  const paths = new Map<number, Path>();
  for (const line of params.lines) {
    const role = ROLES[line.who];
    const inLine = ids.filter((id) =>
      role ? state.dancers[id].role === role : state.positions.get(line.who)?.includes(id),
    );
    const pick = (label: string) => {
      const found = inLine.filter((id) => state.positions.get(label)?.includes(id));
      if (found.length !== 1) throw new Error(`hey-for-three: no one dancer of the ${label} here.`);
      return found[0];
    };
    const mid = pick(line.active);
    const first = pick(line.first);
    const others = inLine.filter((id) => id !== mid && id !== first);
    if (others.length !== 1) throw new Error('A hey for three needs three dancers in a line.');
    const last = others[0];
    const M = body(state, mid).position;
    const F = body(state, first).position;
    const Lp = body(state, last).position;
    const half = length(sub(F, M));
    if (half < 1 || Math.abs(length(sub(Lp, M)) - half) > 0.3 || dot(sub(F, M), sub(Lp, M)) > 0)
      throw new Error('A hey for three needs the middle dancer between the two ends.');
    const u = scale(sub(F, M), 1 / half);
    // The middle dancer goes toward the first end on the lane that passes it by the shoulder.
    const yawU = heading(M, F);
    const v = shoulder === 'right' ? leftOf(yawU) : rightOf(yawU);
    // A lemniscate (sin t, sin t cos t): crossing at the middle, loop tips on the ends.
    const pts: Vec2[] = [];
    const N = 240;
    for (let k = 0; k <= N; k++) {
      const t = (k / N) * 2 * Math.PI;
      pts.push(add(M, add(scale(u, half * Math.sin(t)), scale(v, 2 * HALF_WIDTH * Math.sin(t) * Math.cos(t)))));
    }
    const eight = new Track(pts, 0);
    const L = eight.length;
    // Where each starts: middle at the crossing heading to the first end,
    // the first end at its loop's tip, the last at the other tip.
    const start = new Map([
      [mid, 0],
      [first, L / 4],
      [last, (3 * L) / 4],
    ]);
    // A third of the eight apart while weaving.
    const spread = new Map([
      [mid, 0],
      [first, L / 3 - L / 4],
      [last, (2 * L) / 3 - (3 * L) / 4],
    ]);
    const travel = L * amount;
    for (const id of [mid, first, last]) {
      const s0 = start.get(id)!;
      const d = spread.get(id)!;
      const arcAt = (w: number) =>
        s0 + travel * progress(w) + d * Math.min(smooth(w / 0.2), smooth((1 - w) / 0.2));
      const at = (s: number) => eight.at(((s % L) + L) % L);
      // A half hey: the ends trade places and take on each other's facing.
      const takes = amount === 1 || id === mid ? id : id === first ? last : first;
      const end = body(state, takes).yaw;
      paths.set(id, {
        pos: (w) => at(arcAt(w)),
        yaw: (w) => {
          if (w >= 1) return end;
          const s = ((arcAt(w) % L) + L) % L;
          return eight.heading(Math.min(s, L - 1e-6));
        },
        unwrap: true,
      });
    }
  }
  const bodies = choreograph(state, beats, paths, 0.75);
  const motion = (beat: number) => ({ bodies: bodies(beat), contacts: [] });
  return { kind: 'hey', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
