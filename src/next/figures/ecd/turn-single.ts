/**
 * Turn single / cloverleaf turn single: each dancer turns round alone, in
 * place, toward someone, ending facing out of the group along the set.
 *
 * Definition: every dancer of the group turns on the spot, the way that
 * faces them toward the named dancer (partner or neighbor) first, and ends
 * facing along the set away from the group's middle (a cloverleaf: each
 * pair turning toward each other, everyone ending facing out).
 * Source: Playford/ECD manuals ("turn single"); ContraDB rows "cloverleaf
 * turn single (face to face with partners) to face next neighbors",
 * "Cloverleaf turn a single towards neighbors".
 * Reading: a cloverleaf turn single ends facing along the set, away from
 * the middle of the minor set, toward the next neighbors.
 */
import type { Figure } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { dot, leftOf, sub, turn } from '../../core/math.ts';
import { activeIds, body, groupCenter, groupOf, related, withChanges } from '../../core/state.ts';
import { choreograph, type Path } from './common.ts';

export interface TurnSingleParams {
  toward: string;
}

export const turnSingle: Figure<TurnSingleParams> = (state, params, beats) => {
  onlyKeys('turn-single', params, ['toward']);
  if (typeof params.toward !== 'string') throw new Error('turn-single needs who to turn toward.');
  const paths = new Map<number, Path>();
  for (const id of activeIds(state)) {
    const me = body(state, id);
    const group = groupOf(state, id)!;
    const c = groupCenter(state, group);
    const other = related(state, params.toward, id);
    if (other === undefined) throw new Error(`turn-single: dancer ${id} has no ${params.toward}.`);
    const end = me.position.z >= c.z ? 0 : Math.PI;
    let d = turn(end, me.yaw);
    // Turn the way that faces the named dancer first.
    const toOther = dot(leftOf(me.yaw), sub(body(state, other).position, me.position)) > 0 ? 1 : -1;
    if (Math.sign(d) !== toOther) d = d + toOther * 2 * Math.PI;
    paths.set(id, { pos: () => me.position, yaw: (u) => me.yaw + d * u });
  }
  const bodies = choreograph(state, beats, paths, 0.5);
  const motion = (beat: number) => ({ bodies: bodies(beat), contacts: [] });
  return { kind: 'unknown', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
