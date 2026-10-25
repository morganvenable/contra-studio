/**
 * Promenade home in a square ("promenade home", "partners promenade along
 * the set on the right to home", "partners promenade around the set").
 *
 * Definition: each couple takes promenade hold and walks counterclockwise
 * round the square (the lark on the inside) to the lark's home place, then
 * wheels to face the center, the robin on the lark's right. A couple
 * already home goes once all the way round.
 * Source: Caller's Box glossary, "Promenade" and "Home"; Lloyd Shaw,
 * "Cowboy Dances" (promenade home to the gent's place); Colin Hume's
 * square instructions ("promenade along the set on the right" =
 * counterclockwise); ContraDB rows "promenade home", "partners promenade
 * around the set".
 * Reading: every couple must be the same number of places from home (as
 * after a grand right and left or a star); the walk itself is the ring
 * promenade (figures/ring-promenade.ts), and a couple standing off its
 * places drifts onto its home places on the way.
 */
import type { Figure } from '../../core/figure.ts';
import type { Vec2 } from '../../../types.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { RING_CENTER, ringPlaces } from '../../core/formation-ring.ts';
import {
  add,
  heading,
  mean,
  polar,
  positiveAngle,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, minorSets, partnerOf, withChanges } from '../../core/state.ts';
import { ringPromenade } from '../ring-promenade.ts';

export interface PromenadeHomeParams {
  who: 'partner';
  /** Places already home go all the way round (default), or stand. */
  fromHome?: 'around' | 'stay';
}

export const promenadeHome: Figure<PromenadeHomeParams> = (state, params, beats) => {
  onlyKeys('promenade home', params, ['who', 'fromHome']);
  oneOf('promenade home', 'who', params.who, ['partner'] as const);
  const fromHome = oneOf('promenade home', 'fromHome', params.fromHome ?? 'around', [
    'around',
    'stay',
  ] as const);
  const ids = minorSets(state).flat();
  const n = state.dancers.length;
  if (n !== 8 || ids.length !== 8) throw new Error('Promenade home is for a square of four couples.');
  // Home places: lark k on place 2k, his partner on his right (formation-ring.ts).
  const places = ringPlaces(n, RING_CENTER, true).map((p) => p.position);
  const step = TAU / n;
  let need: number | undefined;
  for (const id of ids) {
    const d = state.dancers[id];
    if (d.role !== 'lark') continue;
    const robin = partnerOf(state, id);
    const now = sub(mean([body(state, id).position, body(state, robin).position]), RING_CENTER);
    const home = sub(mean([places[d.couple * 2], places[d.couple * 2 + 1]]), RING_CENTER);
    // Counterclockwise from above lowers the polar angle (core/math.ts).
    let k = Math.round(positiveAngle(polar(now) - polar(home)) / step) % n;
    if (k === 0 && fromHome === 'around') k = n;
    if (need !== undefined && need !== k)
      throw new Error('Every couple must be the same number of places from home.');
    need = k;
  }
  if (need === undefined) throw new Error('Nobody promenades.');
  if (need === 0) throw new Error('Everyone is already home.');
  const walk = ringPromenade(state, { who: 'partner', places: need }, beats);
  // Couples that started off their places (after lines or a swing in the
  // middle) drift onto the home places as they walk.
  const fix = new Map<number, { dp: Vec2; dyaw: number }>();
  for (const id of ids) {
    const d = state.dancers[id];
    if (d.role !== 'lark') continue;
    const robin = partnerOf(state, id);
    for (const [who, place] of [
      [id, places[d.couple * 2]],
      [robin, places[d.couple * 2 + 1]],
    ] as const) {
      const end = body(walk.exit, who);
      fix.set(who, {
        dp: sub(place, end.position),
        dyaw: turn(heading(place, RING_CENTER), end.yaw),
      });
    }
  }
  const motion = (beat: number) => {
    const frame = walk.motion(beat);
    const k = smooth(beat / beats);
    return {
      ...frame,
      bodies: frame.bodies.map((b) => {
        const f = fix.get(b.id);
        if (!f) return b;
        return { ...b, position: add(b.position, scale(f.dp, k)), yaw: b.yaw + f.dyaw * k };
      }),
    };
  };
  return { ...walk, motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
