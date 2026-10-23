/**
 * Mad robin.
 *
 * Definition: dancers stand in pairs along the side lines, each facing the
 * dancer across the set, and the two on each side line circle around each
 * other once while still facing across, like a do-si-do that keeps facing
 * the other side. The named role goes in front (toward the middle of the
 * set) first, then behind on the way back; everyone ends where they started.
 * Source: Caller's Box glossary, "Mad robin"; ContraDB rows "mad robin,
 * gentlespoons in front", "mad robin, ladles in front (CW)". Orbit ported
 * from src/mad-robin.ts: x swings 0.34 m in front of and behind the side
 * line while z swaps the pair's places, one C2-eased turn, facing fixed.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { ease, heading, smooth, TAU, turn } from '../core/math.ts';
import { roleOfGroup } from '../core/roles.ts';
import { body, groupCenter, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface MadRobinParams {
  /** The role that goes in front first. */
  front: 'larks' | 'robins';
  /** Optional, as some sources write it: must agree with the front role. */
  direction?: 'clockwise' | 'counterclockwise';
}

/** How far in front of and behind the side line the dancers swing. */
const LANE = 0.34;
const FACE_BEATS = 1;

export const madRobin: Figure<MadRobinParams> = (state, params, beats) => {
  onlyKeys('mad robin', params, ['front', 'direction']);
  const front = roleOfGroup(
    oneOf('mad robin', 'front', params.front, ['larks', 'robins'] as const),
  )!;
  if (beats < 6) throw new Error('A mad robin needs at least six beats.');
  if (state.hands.length) throw new Error('A mad robin starts with free hands.');

  const movers = minorSets(state).flatMap((group) => {
    const middle = groupCenter(state, group);
    const sideOf = (id: number) => Math.sign(body(state, id).position.x - middle.x);
    const endOf = (id: number) => Math.sign(body(state, id).position.z - middle.z);
    for (const side of [-1, 1]) {
      const line = group.filter((id) => sideOf(id) === side);
      if (line.length !== 2 || endOf(line[0]) === endOf(line[1]))
        throw new Error('A mad robin needs two dancers on each side line, one above the other.');
    }
    // The front role starts toward the middle of the set: that sets the turn.
    const senses = group
      .filter((id) => roleOf(state, id) === front)
      .map((id) => sideOf(id) * endOf(id));
    if (senses.length !== 2 || senses[0] !== senses[1])
      throw new Error(`Both ${front}s cannot go in front in this layout.`);
    // +1 is clockwise seen from above (increasing polar angle, core/math.ts).
    const sense = senses[0];
    if (params.direction) {
      const wanted = params.direction === 'clockwise' ? 1 : -1;
      if (wanted !== sense)
        throw new Error(`With the ${front}s in front this mad robin turns the other way.`);
    }
    return group.map((id) => {
      const s = body(state, id);
      const end = endOf(id);
      const half = Math.abs(s.position.z - middle.z);
      const across = heading(s.position, { x: 2 * middle.x - s.position.x, z: s.position.z });
      const at = (t: number): Vec2 => {
        const theta = TAU * ease(t);
        return {
          x: s.position.x - sense * end * LANE * Math.sin(theta),
          z: middle.z + end * half * Math.cos(theta),
        };
      };
      return { id, s, across, at };
    });
  });

  const motion = (beat: number) => ({
    bodies: movers.map((m) => ({
      id: m.id,
      position: m.at(beat / beats),
      yaw: m.s.yaw + turn(m.across, m.s.yaw) * smooth(beat / FACE_BEATS),
    })),
    contacts: [],
  });
  return {
    kind: 'mad-robin',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
