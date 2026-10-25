/**
 * Couple crosses the set ("ones cross", "ones cross over").
 *
 * Definition: the named couple crosses to the other side of the set,
 * partners passing by the named shoulder (right by default) in the middle,
 * and turns to face back in on the other line, in the same place.
 * Source: Playford/ECD manuals ("first couple cross over"); ContraDB rows
 * "ones cross over and cast down below twos", "ones cross to own sides".
 * Reading: partners pass right shoulders and each turns to face in at the
 * end (toward the partner).
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { heading, mean, progress, sub, add, scale, rightOf, leftOf } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { choreograph, facingIn, type Path, placeOf, places, Track } from './common.ts';

export interface CrossParams {
  who: string;
  shoulder?: 'right' | 'left';
}

/** How far each partner veers to pass the other. */
const PASS_HALF = 0.3;

export const cross: Figure<CrossParams> = (state, params, beats) => {
  onlyKeys('cross', params, ['who', 'shoulder']);
  const shoulder = oneOf('cross', 'shoulder', params.shoulder ?? 'right', ['right', 'left'] as const);
  const all = places(state);
  const c = all[placeOf(state, all, params.who, 'cross')];
  const a = body(state, c.lark).position;
  const b = body(state, c.robin).position;
  const mid = mean([a, b]);
  const paths = new Map<number, Path>();
  for (const [id, from, to] of [
    [c.lark, a, b],
    [c.robin, b, a],
  ] as const) {
    const yaw = heading(from, to);
    // Passing right shoulders: each veers to its own left.
    const veer = shoulder === 'right' ? leftOf(yaw) : rightOf(yaw);
    const track = new Track([from, add(mid, scale(veer, PASS_HALF)), to], 0.5);
    const end = facingIn(to.x < mid.x ? -1 : 1);
    paths.set(id, {
      pos: (u) => track.at(track.length * progress(u)),
      yaw: (u) => (u >= 1 ? end : track.heading(track.length * progress(u))),
      unwrap: true,
    });
  }
  void sub;
  const bodies = choreograph(state, beats, paths, 0.75);
  const motion = (beat: number) => ({ bodies: bodies(beat), contacts: [] });
  return { kind: 'pass-through', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
