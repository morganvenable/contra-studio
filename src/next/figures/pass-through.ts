/**
 * Pass through.
 *
 * Definition: walk forward past the person you are facing, passing right
 * shoulders (unless told otherwise), and keep facing the same way. Each dancer
 * ends where the person they faced started. "Across the set" or "along the
 * set" names the direction; otherwise it is the way the dancers face, and
 * from a ring (facing in on the diagonal) it is along the set, to the dancer
 * on your own side line, as in "circle left 3 places, pass through".
 * Source: Caller's Box glossary, "Pass through"; ContraDB rows "pass through
 * across the set" (dance 2321) and "pass through" after a ring. Dancers turn
 * square to the direction of travel over the first beat.
 *
 * From an ocean wave ("balance the wave, pass through" as the progression)
 * nobody faces anyone: each dancer lets go and walks forward one place
 * along the set, where the dancers walking out of the next wave meet them.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import {
  add,
  dot,
  forward,
  leftOf,
  mix,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { SET } from '../core/config.ts';
import { activeIds, body, withChanges, type DanceState } from '../core/state.ts';

export interface PassThroughParams {
  shoulder?: 'right' | 'left';
  axis?: 'across' | 'along';
}

/** Sideways give at the moment of passing, each way. */
const VEER = 0.3;
const FACE_BEATS = 1;
/** Short speed ramps: a pass through is often quick (two beats across the set). */
const RAMP = 0.1;
/** Facings this close to a diagonal count as facing in from a ring. */
const DIAGONAL = 0.25;

export const passThrough: Figure<PassThroughParams> = (state, params, beats) => {
  onlyKeys('pass through', params, ['shoulder', 'axis']);
  const shoulder = oneOf('pass through', 'shoulder', params.shoulder ?? 'right', [
    'right',
    'left',
  ] as const);
  if (params.axis !== undefined)
    oneOf('pass through', 'axis', params.axis, ['across', 'along'] as const);
  const ids = activeIds(state);

  const moves = ids.map((id) => {
    const me = body(state, id);
    const yaw = travelYaw(me.yaw, params.axis);
    const ahead = ids.filter((other) => {
      if (other === id) return false;
      const them = body(state, other);
      const gap = sub(them.position, me.position);
      const lateral = Math.abs(dot(gap, leftOf(yaw)));
      const along = dot(gap, forward(yaw));
      const back = travelYaw(them.yaw, params.axis);
      return (
        lateral < 0.3 && along > 0.5 && along < 2.8 && Math.abs(turn(back, yaw + Math.PI)) < 0.1
      );
    });
    if (ahead.length === 0 && inWave(state, id)) {
      const end = add(me.position, scale(forward(yaw), SET.slot));
      return { id, start: me, yaw, end, veer: { x: 0, z: 0 } };
    }
    if (ahead.length !== 1) throw new Error(`Dancer ${id} must face exactly one dancer to pass.`);
    const veer = scale((shoulder === 'right' ? leftOf : rightOf)(yaw), VEER);
    return { id, start: me, yaw, end: body(state, ahead[0]).position, veer };
  });

  const motion = (beat: number) => ({
    bodies: moves.map((m) => {
      const q = progress(beat / beats, RAMP);
      const position = add(mix(m.start.position, m.end, q), scale(m.veer, Math.sin(Math.PI * q)));
      const yaw = m.start.yaw + turn(m.yaw, m.start.yaw) * smooth(beat / FACE_BEATS);
      return { id: m.id, position, yaw };
    }),
    contacts: [],
  });
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

/** Holding hands with someone beside them who faces the other way: in a wave. */
function inWave(state: DanceState, id: number): boolean {
  const me = body(state, id);
  return state.hands.some((h) => {
    if (h.a !== id && h.b !== id) return false;
    const them = body(state, h.a === id ? h.b : h.a);
    const gap = sub(them.position, me.position);
    return (
      Math.abs(dot(gap, forward(me.yaw))) < 0.3 && Math.abs(turn(them.yaw, me.yaw + Math.PI)) < 0.3
    );
  });
}

/** The square direction a dancer facing `yaw` travels in. */
function travelYaw(yaw: number, axis: PassThroughParams['axis']): number {
  const f = forward(yaw);
  const alongSet = f.z >= 0 ? 0 : Math.PI;
  const acrossSet = f.x >= 0 ? Math.PI / 2 : -Math.PI / 2;
  if (axis === 'along') return alongSet;
  if (axis === 'across') return acrossSet;
  const diagonal = Math.abs(Math.abs(f.x) - Math.abs(f.z)) < Math.sin(DIAGONAL);
  if (diagonal) return alongSet;
  return Math.abs(f.z) > Math.abs(f.x) ? alongSet : acrossSet;
}
