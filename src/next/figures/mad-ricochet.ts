/**
 * Mad ricochet (Don Flaherty's "mad robins, larks in front - mad
 * ricochet").
 *
 * Definition: the path of a mad robin (mad-robin.ts: the two dancers on
 * each side line circle each other while facing across), but the dancers
 * going in front walk all the way into the middle of the set, meet the
 * dancer of the same role coming from the other side with both hands, and
 * ricochet back out; on the way back the other role goes into the middle
 * and does the same. Everyone ends where they started; "twice around" does
 * it twice. Source: ContraDB rows by Don Flaherty, "mad robins, larks in
 * front - mad ricochet, same gender ricochet out of center with both hands",
 * "mad robins twice around, larks in front ... both genders do the
 * ricochet out twice".
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import { heading, progress, smooth, TAU, turn } from '../core/math.ts';
import { roleOfGroup } from '../core/roles.ts';
import { body, groupCenter, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface MadRicochetParams {
  /** The role that goes into the middle first. */
  front: 'larks' | 'robins';
  /** Times around: 1 or 2. */
  times?: number;
}

/** How far toward the middle the dancers in front walk: to 0.28 m from it. */
const LANE = 0.62;
const FACE_BEATS = 1;

export const madRicochet: Figure<MadRicochetParams> = (state, params, beats) => {
  onlyKeys('mad ricochet', params, ['front', 'times']);
  const front = roleOfGroup(
    oneOf('mad ricochet', 'front', params.front, ['larks', 'robins'] as const),
  )!;
  const times = params.times ?? 1;
  if (times !== 1 && times !== 2) throw new Error('A mad ricochet goes once or twice around.');
  if (beats < 6 * times) throw new Error('A mad ricochet needs six beats each time around.');

  const movers = minorSets(state).flatMap((group) => {
    const middle = groupCenter(state, group);
    const sideOf = (id: number) => Math.sign(body(state, id).position.x - middle.x);
    const endOf = (id: number) => Math.sign(body(state, id).position.z - middle.z);
    for (const side of [-1, 1]) {
      const line = group.filter((id) => sideOf(id) === side);
      if (line.length !== 2 || endOf(line[0]) === endOf(line[1]))
        throw new Error('A mad ricochet needs two dancers on each side line, one above the other.');
    }
    const senses = group
      .filter((id) => roleOf(state, id) === front)
      .map((id) => sideOf(id) * endOf(id));
    if (senses.length !== 2 || senses[0] !== senses[1])
      throw new Error(`Both ${params.front} cannot go in front in this layout.`);
    const sense = senses[0];
    return group.map((id) => {
      const s = body(state, id);
      const end = endOf(id);
      const half = Math.abs(s.position.z - middle.z);
      const across = heading(s.position, { x: 2 * middle.x - s.position.x, z: s.position.z });
      const at = (t: number): Vec2 => {
        const theta = TAU * times * progress(t);
        return {
          x: s.position.x - sense * end * LANE * Math.sin(theta),
          z: middle.z + end * half * Math.cos(theta),
        };
      };
      return { id, s, across, at };
    });
  });

  // The two of a role who meet in the middle of each minor set.
  const meetings = minorSets(state).flatMap((g) =>
    (['lark', 'robin'] as const).map((r) => g.filter((id) => roleOf(state, id) === r)),
  );

  const motion = (beat: number) => {
    const bodies = movers.map((m) => ({
      id: m.id,
      position: m.at(beat / beats),
      yaw: m.s.yaw + turn(m.across, m.s.yaw) * smooth(beat / FACE_BEATS),
    }));
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = meetings.flatMap(([a, b]) => {
      const pa = map.get(a)!.position;
      const pb = map.get(b)!.position;
      const close = smooth((1.0 - Math.hypot(pa.x - pb.x, pa.z - pb.z)) / 0.3);
      return (['right', 'left'] as const).map((hand) =>
        withinReach(
          {
            a,
            handA: hand,
            b,
            handB: hand === 'right' ? 'left' : 'right',
            kind: 'joined',
            strength: close,
          },
          map,
        ),
      );
    });
    return { bodies, contacts };
  };
  return {
    kind: 'mad-robin',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
