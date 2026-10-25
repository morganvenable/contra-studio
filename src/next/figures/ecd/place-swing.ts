/**
 * Swing in place: a pair swings and ends back where each started, facing
 * the way they faced (same-role swings, and neighbor swings in lines that
 * face, as in three face three).
 *
 * Definition: the pair takes a swing hold and turns clockwise (seen from
 * above) round the point between them a whole number of times, then opens
 * back out to their own places. Used where a swing does not end side by
 * side on a side line: two dancers of the same role ("same roles swing
 * your opposite", "middles swing your opposite"), or anyone in facing lines
 * of three.
 * Source: ContraDB rows "same roles long swing (your opposite)", 'neighbors
 * swing "ends swing your opposite"' (three face three dances).
 * Reading: a swing that has no side line to end on ends where it began.
 */
import type { Figure } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { add, heading, length, mean, mix, polar, progress, smooth, sub, TAU, turn } from '../../core/math.ts';
import { body, minorSets, pairsIn, withChanges, type Hold } from '../../core/state.ts';
import { choreograph, type Path } from './common.ts';

export interface PlaceSwingParams {
  who: string;
  /** Read from an ordinary swing call and ignored: a swing in place ends where it began. */
  end?: string;
  meltdown?: boolean;
}

/** Each dancer's distance from the middle of the swing. */
const SWING_RADIUS = 0.3;
/** Beats a swing takes to go once round. */
const BEATS_PER_TURN = 2.5;

export const placeSwing: Figure<PlaceSwingParams> = (state, params, beats) => {
  onlyKeys('place-swing', params, ['who', 'end', 'meltdown']);
  if (typeof params.who !== 'string') throw new Error('place-swing needs who swings.');
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, params.who));
  const edge = Math.min(0.25, 1.25 / beats);
  const turns = Math.max(1, Math.round((beats * (1 - edge)) / BEATS_PER_TURN));
  const paths = new Map<number, Path>();
  const holds: Hold[] = [];
  for (const [a, b] of pairs) {
    const pa = body(state, a).position;
    const pb = body(state, b).position;
    if (length(sub(pa, pb)) > 2.7) throw new Error(`Dancers ${a} and ${b} are too far apart to swing.`);
    const c = mean([pa, pb]);
    for (const id of [a, b]) {
      const s = body(state, id);
      const a0 = polar(sub(s.position, c));
      const g = (u: number) => Math.min(smooth(u / edge), smooth((1 - u) / edge));
      const pos = (u: number) => {
        const ang = a0 + turns * TAU * progress(u);
        return mix(s.position, add(c, { x: SWING_RADIUS * Math.cos(ang), z: SWING_RADIUS * Math.sin(ang) }), g(u));
      };
      paths.set(id, {
        pos,
        yaw: (u) => s.yaw + turn(heading(pos(u), c), s.yaw) * g(u),
        unwrap: true,
      });
    }
    holds.push({ a, handA: 'right', b, handB: 'left' });
  }
  const bodies = choreograph(state, beats, paths, 0.6);
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const map = bodyMap(moved);
    const u = beat / beats;
    const on = Math.min(smooth((u - edge * 0.6) / (edge * 0.4)), smooth((1 - edge * 0.6 - u) / (edge * 0.4)));
    return {
      bodies: moved,
      contacts: holds.map((h) => withinReach({ ...joined(h, on), target: 'back' as const }, map)),
    };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
