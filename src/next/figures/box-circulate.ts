/**
 * Box circulate (from long waves).
 *
 * Definition: in long waves each minor set is a box of four. The named role,
 * facing in, crosses the set straight to the other side line ("ladles
 * cross"); the others, facing out, loop around to the right or left into the
 * place the crosser on their side left ("while gentlespoons loop right").
 * Crossers end facing out, loopers facing in, ready to balance the waves
 * again and circulate the other way.
 * Source: Caller's Box glossary, "Box circulate"; ContraDB rows "balance &
 * box circulate - ladles cross while gentlespoons loop right". Hands along
 * the side lines let go as everyone sets off (src/box-circulate-binding.ts:
 * crossers and loopers trade places within the box).
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import {
  add,
  dot,
  ease,
  forward,
  mix,
  progress,
  scale,
  sub,
} from '../core/math.ts';
import { roleOfGroup } from '../core/roles.ts';
import { body, groupCenter, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface BoxCirculateParams {
  /** The role that crosses the set; the others loop. */
  cross: 'larks' | 'robins';
  loop: 'right' | 'left';
}

/** How far outside the side line a loop swings. */
const LOOP_DEPTH = 0.5;

export const boxCirculate: Figure<BoxCirculateParams> = (state, params, beats) => {
  onlyKeys('box circulate', params, ['cross', 'loop']);
  const crossRole = roleOfGroup(
    oneOf('box circulate', 'cross', params.cross, ['larks', 'robins'] as const),
  )!;
  const loop = oneOf('box circulate', 'loop', params.loop, ['right', 'left'] as const);
  if (beats < 3) throw new Error('A box circulate needs at least three beats.');

  const movers = minorSets(state).flatMap((group) => {
    const middle = groupCenter(state, group);
    const crossers = group.filter((id) => roleOf(state, id) === crossRole);
    const loopers = group.filter((id) => roleOf(state, id) !== crossRole);
    if (crossers.length !== 2 || loopers.length !== 2)
      throw new Error('A box circulate needs two crossers and two loopers.');
    const sideOf = (id: number) => Math.sign(body(state, id).position.x - middle.x);
    const crossing = crossers.map((id) => {
      const s = body(state, id);
      if (dot(forward(s.yaw), sub({ x: middle.x, z: s.position.z }, s.position)) <= 0)
        throw new Error('The dancers who cross must face in across the set.');
      const end: Vec2 = { x: 2 * middle.x - s.position.x, z: s.position.z };
      const at = (t: number) => ({ id, position: mix(s.position, end, progress(t)), yaw: s.yaw });
      return { id, at };
    });
    const looping = loopers.map((id) => {
      const s = body(state, id);
      const mate = crossers.find((c) => sideOf(c) === sideOf(id));
      if (mate === undefined) throw new Error('Each looper needs a crosser on the same side line.');
      const end = body(state, mate).position;
      const along = sub(end, s.position);
      const outward = { x: sideOf(id), z: 0 };
      if (dot(forward(s.yaw), outward) <= 0)
        throw new Error('The dancers who loop must face out of the set.');
      // The looper always travels to the crosser's place on its side line;
      // "loop right/left" names the way it turns (over the right or left
      // shoulder), which is not always the way it travels.
      const center = mix(s.position, end, 0.5);
      // Half an ellipse outside the side line, from the place to the crosser's.
      const at = (t: number) => {
        const a = Math.PI * progress(t);
        const position = add(
          add(center, scale(along, -0.5 * Math.cos(a))),
          scale(outward, LOOP_DEPTH * Math.sin(a)),
        );
        // A half turn from facing out to facing in (turning right lowers yaw).
        const yaw = s.yaw + (loop === 'right' ? -1 : 1) * Math.PI * ease(t);
        return { id, position, yaw };
      };
      return { id, at };
    });
    return [...crossing, ...looping];
  });

  const motion = (beat: number) => ({
    bodies: movers.map((m) => m.at(beat / beats)),
    contacts: [],
  });
  return {
    kind: 'box-circulate',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
