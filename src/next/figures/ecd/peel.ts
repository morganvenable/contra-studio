/**
 * Cast off and arch ("peel the banana", the Virginia Reel's ending): the
 * top couple casts to the bottom with everyone following, makes an arch,
 * and the others come up through it with partners, each a place higher.
 *
 * Definition: the named couple (at the top) casts off, each down the
 * outside of their own line; the rest of each line follows its leader (up
 * to the top, out and down the outside). The leaders stop at the bottom
 * place, face up the set... facing the couples coming, and join inside
 * hands high to make an arch. The followers carry on round below the
 * arch, meet their partners in the middle and come up through the arch
 * side by side, each couple stopping one place higher than it started, and
 * step back out into the lines facing across. The leaders let go and face
 * across, now the bottom couple.
 * Parts: `all` dances it in one row; `cast` stops when the leaders have
 * made the arch (the others strung out down the outside, following);
 * `through` is the rest, from there.
 * Source: Playford/ECD manuals ("cast off, others following; arch at the
 * bottom, all come up through"); Caller's Box glossary, "Virginia Reel";
 * ContraDB rows "peel the banana #1s cast to bottom and form arch while
 * others follow but duck thru arch", "ones down the outsides, followed by
 * twos threes fours", "twos up the center under the arch, followed by
 * threes fours", "top couple cast off, make an arch at the bottom of the
 * set", "everyone else go through the arch".
 * Readings: the arch faces the couples coming through (down the set) with
 * the partners' inside hands raised; "top couple cast off, make an arch at
 * the bottom" has the others following, as in the Virginia Reel.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { SET } from '../../core/config.ts';
import { progress, smooth, turn } from '../../core/math.ts';
import { activeIds, body, partnerOf, withChanges, type Hold } from '../../core/state.ts';
import { shoulder } from '../../core/contacts.ts';
import { choreograph, facingIn, type Path, placeOf, places, sideSign, SLOT, Track } from './common.ts';
import { CAST_OUT } from './cast.ts';

export interface PeelParams {
  who: string;
  part?: 'all' | 'cast' | 'through';
}

/** Leaders' distance from the middle while making the arch. */
export const ARCH_HALF = 0.8;
/** Each follower's distance from the middle coming up through the arch. */
export const THROUGH_HALF = 0.26;
/** How far below the bottom place the followers turn in. */
const TURN_BELOW = 1.1;
/** Height of the joined hands of the arch. */
const ARCH_HEIGHT = 1.6;

interface Tracks {
  follow: Track;
  lead: Track;
}

/** The followers' track and the leaders' branch for one side line. */
function tracks(side: number, line: number, top: number, bottom: number): Tracks {
  const x = (d: number) => side * d;
  const out = line + CAST_OUT;
  const start: Vec2[] = [
    { x: x(line), z: bottom },
    { x: x(line), z: top },
    { x: x(line + 0.3), z: top - 0.35 },
    { x: x(out), z: top + 0.15 },
  ];
  const follow = new Track(
    [
      ...start,
      { x: x(out), z: bottom + TURN_BELOW },
      { x: x(THROUGH_HALF), z: bottom + TURN_BELOW },
      { x: x(THROUGH_HALF), z: top - SLOT },
    ],
    0.4,
  );
  const lead = new Track(
    [...start, { x: x(out), z: bottom - 0.5 }, { x: x(ARCH_HALF), z: bottom }],
    0.3,
  );
  return { follow, lead };
}

export const peel: Figure<PeelParams> = (state, params, beats) => {
  onlyKeys('peel', params, ['who', 'part']);
  const part = oneOf('peel', 'part', params.part ?? 'all', ['all', 'cast', 'through'] as const);
  if (typeof params.who !== 'string') throw new Error('peel needs who leads.');
  const ids = activeIds(state);
  const n = ids.length / 2;
  if (n < 3) throw new Error('peel needs at least three couples.');
  // Part way through, the leaders are the couple standing in the arch.
  const inArch = () =>
    ids.filter((id) => Math.abs(Math.abs(body(state, id).position.x) - ARCH_HALF) < 0.05);
  const leaderIds =
    part === 'through'
      ? state.positions.has(params.who)
        ? (state.positions.get(params.who) ?? []).filter((id) => ids.includes(id))
        : inArch()
      : (() => {
          const all = places(state);
          const p = placeOf(state, all, params.who, 'peel');
          if (p !== 0) throw new Error(`peel: the ${params.who} must be at the top.`);
          return [all[0].lark, all[0].robin];
        })();
  if (leaderIds.length !== 2) throw new Error(`peel: the ${params.who} are not one couple.`);
  const [lark] = leaderIds.filter((id) => state.dancers[id].role === 'lark');
  const robin = partnerOf(state, lark);

  // Where the places are: from the bodies, or (part way through) from the leaders at the bottom.
  let top: number;
  let bottom: number;
  let line: number = SET.halfWidth;
  if (part === 'through') {
    bottom = (body(state, lark).position.z + body(state, robin).position.z) / 2;
    top = bottom - (n - 1) * SLOT;
  } else {
    const all = places(state);
    top = all[0].z;
    bottom = all[n - 1].z;
    line = Math.abs(body(state, lark).position.x);
  }
  const placeZ = (k: number) => top + ((bottom - top) * k) / (n - 1);
  const sides = new Map<number, Tracks>();
  const tracksOf = (id: number) => {
    const side = sideSign(state, id);
    if (!sides.has(side)) sides.set(side, tracks(side, line, top, bottom));
    return sides.get(side)!;
  };

  // Followers, side by side, ranked by how far along their track they are.
  const followers = ids.filter((id) => id !== lark && id !== robin);
  const along = new Map(followers.map((id) => [id, tracksOf(id).follow.nearest(body(state, id).position)]));
  const rank = new Map<number, number>();
  for (const side of [-1, 1]) {
    const mine = followers
      .filter((id) => sideSign(state, id) === side)
      .sort((a, b) => along.get(b)! - along.get(a)!);
    mine.forEach((id, i) => rank.set(id, i));
  }
  const leadDistance = tracksOf(lark).lead.length - tracksOf(lark).lead.nearest(body(state, lark).position);
  const paths = new Map<number, Path>();
  // How far the followers go, and when the leaders arrive.
  let followDistance = 0;
  for (const id of followers) {
    const t = tracksOf(id).follow;
    const end = part === 'cast' ? along.get(id)! + leadDistance : t.nearest({ x: sideSign(state, id) * THROUGH_HALF, z: placeZ(rank.get(id)!) });
    followDistance = Math.max(followDistance, end - along.get(id)!);
  }
  // In the cast part the leaders arrive with a beat or two in hand to face
  // down and join hands.
  const arrive =
    part === 'through'
      ? 0
      : part === 'cast'
        ? 1 - Math.min(0.25, 2 / beats)
        : Math.min(0.9, leadDistance / followDistance);
  const edge = Math.min(0.2, 1.5 / beats);

  for (const id of followers) {
    const side = sideSign(state, id);
    const t = tracksOf(id).follow;
    const from = along.get(id)!;
    const to = part === 'cast' ? from + leadDistance : t.nearest({ x: side * THROUGH_HALF, z: placeZ(rank.get(id)!) });
    const arc = (u: number) => from + (to - from) * progress(u);
    const stepOut = (u: number) => (part === 'cast' ? 0 : smooth((u - (1 - edge)) / edge));
    paths.set(id, {
      pos: (u) => {
        const p = t.at(arc(u));
        return { x: p.x + (side * line - side * THROUGH_HALF) * stepOut(u), z: p.z };
      },
      yaw: (u) => {
        const h = t.heading(arc(u));
        const s = stepOut(u);
        return h + turn(facingIn(side), h) * s;
      },
      unwrap: true,
    });
  }
  for (const id of [lark, robin]) {
    const side = sideSign(state, id);
    const t = tracksOf(id).lead;
    const from = t.nearest(body(state, id).position);
    const arch: Vec2 = { x: side * ARCH_HALF, z: bottom };
    const home: Vec2 = { x: side * line, z: bottom };
    const travel = (u: number) => (arrive > 0 ? Math.min(1, u / arrive) : 1);
    const out = (u: number) => (part === 'cast' ? 0 : smooth((u - (1 - edge)) / edge));
    paths.set(id, {
      pos: (u) => {
        const p = part === 'through' ? arch : t.at(from + (t.length - from) * progress(travel(u)));
        const o = out(u);
        return { x: p.x + (home.x - arch.x) * o, z: p.z };
      },
      yaw: (u) => {
        if (part !== 'through' && u < arrive) return t.heading(from + (t.length - from) * progress(travel(u)));
        // Face down the set toward the couples coming, then in at the end.
        if (part === 'cast') return 0;
        return out(u) > 0.5 || u >= 1 ? facingIn(side) : 0;
      },
      unwrap: true,
    });
  }
  const bodies = choreograph(state, beats, paths, 1);
  const hold: Hold = { a: lark, handA: 'left', b: robin, handB: 'right' };
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const u = beat / beats;
    const on =
      part === 'cast'
        ? smooth((u - arrive) / (1 - arrive))
        : part === 'through'
          ? 1 - smooth((u - (1 - 2 * edge)) / edge)
          : Math.min(smooth((u - arrive) / 0.06), 1 - smooth((u - (1 - 2 * edge)) / edge));
    const contacts: FigureContact[] = [];
    if (on > 0.01) {
      const a = moved.find((b) => b.id === lark)!;
      const b = moved.find((m) => m.id === robin)!;
      const sa = shoulder(a, 'left');
      const sb = shoulder(b, 'right');
      contacts.push({
        ...hold,
        kind: 'arch',
        strength: on,
        point: { x: (sa.x + sb.x) / 2, y: ARCH_HEIGHT, z: (sa.z + sb.z) / 2 },
      });
    }
    return { bodies: moved, contacts };
  };
  return {
    kind: 'hall-travel',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: part === 'cast' ? [hold] : [] }),
  };
};
