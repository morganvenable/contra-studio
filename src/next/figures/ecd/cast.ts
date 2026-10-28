/**
 * Cast (cast off, cast down, cast up), the others moving up.
 *
 * Definition: the named couple turns outward, away from each other (the
 * lark over the left shoulder, the robin over the right when casting down
 * from facing across), and walks along the outside of its own line to the
 * named place, stepping back into its line there facing across. The couples
 * standing in the places it passes move up (or down) one place each, along
 * their own lines, so every place is filled at the end. "Cast alone" is the
 * same path for each dancer on their own.
 * Source: Playford/ECD manuals ("cast off", "cast down one place, 2s move
 * up"); Caller's Box glossary, "Cast off"; ContraDB rows "1s cast, 2s move
 * up", "ones cast to second position, twos move up", "Top couple cast off to
 * bottom, all move up", "1s cast to bottom, others move up".
 * "Up the center and cast to the bottom": the couple first goes up the
 * middle between the couples above, round the top of the set and down the
 * outside.
 * Reading: with no place named, a cast goes one place; the couples passed
 * move toward where the casting couple started; "cast alone" is the same
 * path (each dancer on their own side).
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { forward, progress } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { CENTER_HALF } from './center-travel.ts';
import {
  choreograph,
  facingIn,
  type Path,
  placeIndex,
  placeOf,
  places,
  type PlaceName,
  sideSign,
  slidePath,
  Track,
} from './common.ts';

export interface CastParams {
  /** Position label of the casting couple ("1s", "top"...). */
  who: string;
  /** Target place; or */
  to?: PlaceName;
  /** places to travel, in `direction` (default one place down). */
  places?: number;
  direction?: 'down' | 'up';
  /**
   * "center": up (or down) the middle first, past the couples on that side,
   * then round the end of the set and down the outside ("up the center and
   * cast to the bottom").
   */
  via?: 'outside' | 'center';
}

/** How far outside its line a casting dancer walks. */
export const CAST_OUT = 0.6;

export const cast: Figure<CastParams> = (state, params, beats) => {
  onlyKeys('cast', params, ['who', 'to', 'places', 'direction', 'via']);
  const via = oneOf('cast', 'via', params.via ?? 'outside', ['outside', 'center'] as const);
  if (typeof params.who !== 'string') throw new Error('cast needs who casts.');
  if (params.to !== undefined && params.places !== undefined)
    throw new Error('cast takes a target place or a number of places, not both.');
  const direction = oneOf('cast', 'direction', params.direction ?? 'down', ['down', 'up'] as const);
  const all = places(state);
  const p = placeOf(state, all, params.who, 'cast');
  let q: number;
  if (params.to !== undefined) q = placeIndex(params.to, all.length, 'cast');
  else {
    const n = params.places ?? 1;
    if (!(Number.isInteger(n) && n >= 1)) throw new Error('cast places must be a whole number.');
    q = p + (direction === 'down' ? n : -n);
  }
  if (q < 0 || q >= all.length) throw new Error(`cast: the ${params.who} cannot go that far.`);
  if (q === p) throw new Error(`cast: the ${params.who} are already in that place.`);
  const dir = q > p ? 1 : -1;
  const zq = all[q].z;

  const paths = new Map<number, Path>();
  // The long way round (up the middle first) keeps a steadier pace.
  const ramp = via === 'center' ? 0.1 : 0.18;
  for (const id of [all[p].lark, all[p].robin]) {
    const s0 = body(state, id);
    const side = sideSign(state, id);
    const x0 = s0.position.x;
    const z0 = s0.position.z;
    const out = x0 + side * CAST_OUT;
    // Up the middle first: between the couples above, round the end of the set.
    const turnAt = all[dir > 0 ? 0 : all.length - 1].z - dir * 0.7;
    const start: Vec2[] =
      via === 'center'
        ? [
            { x: x0, z: z0 },
            { x: side * CENTER_HALF, z: z0 - dir * 0.6 },
            { x: side * CENTER_HALF, z: turnAt + dir * 0.35 },
            { x: side * 0.6, z: turnAt },
            { x: side * 1.25, z: turnAt },
            { x: out, z: turnAt + dir * 0.45 },
          ]
        : forward(s0.yaw).z * dir > 0.5
          ? // Already facing the way the cast goes (out of a turn along the
            // set): straight out and on, with no step back up first.
            [
              { x: x0, z: z0 },
              { x: x0 + side * 0.35, z: z0 + dir * 0.2 },
              { x: out, z: z0 + dir * 0.55 },
            ]
          : [
              { x: x0, z: z0 },
              { x: x0 + side * 0.3, z: z0 - dir * 0.35 },
              { x: out, z: z0 + dir * 0.15 },
            ];
    const track = new Track(
      [...start, { x: out, z: zq - dir * 0.55 }, { x: x0, z: zq }],
      0.3,
    );
    const end = facingIn(side);
    paths.set(id, {
      pos: (u) => track.at(track.length * progress(u, ramp)),
      yaw: (u) => (u >= 1 ? end : track.heading(track.length * progress(u, ramp))),
      unwrap: true,
    });
  }
  // The couples passed move one place toward where the casting couple started.
  for (let k = Math.min(p, q); k <= Math.max(p, q); k++) {
    if (k === p) continue;
    for (const id of [all[k].lark, all[k].robin]) {
      const goal: Vec2 = { x: body(state, id).position.x, z: all[k - dir].z };
      paths.set(id, slidePath(state, id, goal, 0.1, 0.9));
    }
  }
  const bodies = choreograph(state, beats, paths, 1);
  const motion = (beat: number) => ({ bodies: bodies(beat), contacts: [] });
  return { kind: 'hall-travel', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
