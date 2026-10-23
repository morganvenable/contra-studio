/**
 * Pass through.
 *
 * Definition: walk forward past the person you are facing, passing right
 * shoulders (unless told otherwise), and keep facing the same way. Each dancer
 * ends where the person they faced started.
 * Source: Caller's Box glossary, "Pass through"; ContraDB row "pass through
 * across the set" (dance 2321). In Becket lines "across the set" is simply who
 * you face.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, dot, forward, leftOf, mix, progress, rightOf, scale, sub, turn } from '../core/math.ts';
import { activeIds, body, withChanges } from '../core/state.ts';

export interface PassThroughParams {
  shoulder?: 'right' | 'left';
}

/** Sideways give at the moment of passing, each way. */
const VEER = 0.3;

export const passThrough: Figure<PassThroughParams> = (state, params, beats) => {
  onlyKeys('pass through', params, ['shoulder']);
  const shoulder = oneOf('pass through', 'shoulder', params.shoulder ?? 'right', ['right', 'left'] as const);
  if (state.hands.length) throw new Error('Pass through needs free hands.');
  const ids = activeIds(state);

  const moves = ids.map((id) => {
    const me = body(state, id);
    const ahead = ids.filter((other) => {
      if (other === id) return false;
      const them = body(state, other);
      const gap = sub(them.position, me.position);
      const lateral = Math.abs(dot(gap, leftOf(me.yaw)));
      return lateral < 0.1 && dot(gap, forward(me.yaw)) > 0 && Math.abs(turn(them.yaw, me.yaw + Math.PI)) < 1e-6;
    });
    if (ahead.length !== 1) throw new Error(`Dancer ${id} must face exactly one dancer to pass.`);
    const veer = scale((shoulder === 'right' ? leftOf : rightOf)(me.yaw), VEER);
    return { id, start: me, end: body(state, ahead[0]).position, veer };
  });

  const motion = (beat: number) => ({
    bodies: moves.map((m) => {
      const q = progress(beat / beats);
      const position = add(mix(m.start.position, m.end, q), scale(m.veer, Math.sin(Math.PI * q)));
      return { id: m.id, position, yaw: m.start.yaw };
    }),
    contacts: [],
  });
  return { kind: 'pass-through', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
