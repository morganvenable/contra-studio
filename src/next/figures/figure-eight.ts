/**
 * Half figure eight ("ones half figure 8 below").
 *
 * Definition: the named couple crosses through the middle of the other
 * couple in its minor set (the one below or above it, as the row says),
 * each dancer then loops around the outside of the standing dancer on the
 * far side, and comes back to the named couple's own places, now on the
 * other side of the set: partners have traded places. The other couple
 * stands still. One dancer goes first through the middle: the robin unless
 * the row says otherwise ("ones half figure 8 above, first larks leading").
 * Source: Caller's Box glossary, "Figure eight"; ContraDB rows "ones half
 * figure 8 below", "twos half figure 8 above". The dancers end facing in
 * across the set.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { clamp, heading, mean, progress, smooth, turn } from '../core/math.ts';
import { loopPath } from '../core/path.ts';
import { body, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface FigureEightParams {
  /** The couple that dances it. */
  who: '1s' | '2s';
  /** Around the couple below (down the set) or above; any when not given. */
  around?: 'below' | 'above';
  /** Who goes through the middle first. */
  lead?: 'larks' | 'robins';
}

/** Radius of the loop around each standing dancer. */
const LOOP = 0.6;
/** Beats the second dancer trails the first through the middle, in an 8-beat figure. */
const TRAIL = 1;
const FACE_BEATS = 1;

export const figureEight: Figure<FigureEightParams> = (state, params, beats) => {
  onlyKeys('half figure eight', params, ['who', 'around', 'lead']);
  const who = oneOf('half figure eight', 'who', params.who, ['1s', '2s'] as const);
  const around =
    params.around === undefined
      ? undefined
      : oneOf('half figure eight', 'around', params.around, ['below', 'above'] as const);
  const lead = oneOf('half figure eight', 'lead', params.lead ?? 'robins', [
    'larks',
    'robins',
  ] as const);
  const trail = TRAIL * Math.min(1, beats / 8);

  const plans = minorSets(state).flatMap((g) => {
    const label = state.positions.get(who) ?? [];
    const actives = g.filter((id) => label.includes(id));
    const standing = g.filter((id) => !label.includes(id));
    if (actives.length !== 2 || standing.length !== 2)
      throw new Error(`A half figure eight needs the ${who} and one other couple.`);
    const middle = mean(g.map((id) => body(state, id).position));
    const z = (ids: number[]) => mean(ids.map((id) => body(state, id).position)).z;
    const zA = z(actives);
    const zP = z(standing);
    const dir = Math.sign(zP - zA);
    if (Math.abs(zP - zA) < 0.9) throw new Error('The two couples must stand one above the other.');
    if (around && (around === 'below') !== dir > 0)
      throw new Error(`The other couple is not ${around} the ${who}.`);
    const side = (id: number) => Math.sign(body(state, id).position.x - middle.x);
    if (side(actives[0]) === side(actives[1]) || side(standing[0]) === side(standing[1]))
      throw new Error('Each couple stands across the set for a half figure eight.');
    const leader = actives.find(
      (id) => roleOf(state, id) === (lead === 'larks' ? 'lark' : 'robin'),
    );
    if (leader === undefined) throw new Error(`No ${lead} among the ${who} to lead.`);
    return actives.map((id) => {
      const from = body(state, id);
      const sx = side(id);
      const wA = Math.abs(from.position.x - middle.x);
      const passive = standing.find((s) => side(s) === -sx)!;
      const pp = body(state, passive).position;
      const to: Vec2 = { x: middle.x - sx * wA, z: from.position.z };
      // Through the middle, around the standing dancer on the far side
      // (behind them, then their outside), and up to the place across.
      const path = loopPath(from.position, pp, LOOP, (sx * dir) as 1 | -1, to);
      const across = heading(to, { x: middle.x, z: to.z });
      const [t0, t1] = id === leader ? [0, beats - trail] : [trail, beats];
      return { id, from, path, across, t0, t1 };
    });
  });

  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      const local = clamp((beat - p.t0) / (p.t1 - p.t0));
      const { p: position, tangent } = p.path.at(progress(local));
      const walk = Math.atan2(tangent.x, tangent.z);
      const span = p.t1 - p.t0;
      const into = smooth((beat - p.t0) / FACE_BEATS);
      const out = smooth((beat - (p.t1 - FACE_BEATS)) / FACE_BEATS);
      const walking = p.from.yaw + turn(walk, p.from.yaw) * into;
      const yaw = walking + turn(p.across, walking) * out;
      return { id: p.id, position, yaw: span > 0 ? yaw : p.from.yaw };
    }),
    contacts: [],
  });
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
