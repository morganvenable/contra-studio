/**
 * Tempest: the 1s pass through across the set; the 2s turn to face in.
 *
 * Definition: the two 1s couples, facing each other in the middle of the
 * set after diving under the 2s' arches, pass through (right shoulders)
 * to the other side, where they face the 2s couple across the set. The
 * 2s, who went over the 1s facing out, turn alone to face in.
 * Source: ContraDB 342 (Tempus Fugit, David Smukler), "pass through across
 * the set (two #1 couples in center of set)" after "twos arch ones dive";
 * Caller's Box glossary, "Pass through".
 * Reading: each 1s dancer crosses to the mirror place on the other side,
 * stepping a little to the left to pass right shoulders; the 2s turn to the
 * right. The 2s were facing in with the robin on the lark's left at the
 * start; after the circle and the arch they face in with the lark on the
 * left, ready for neighbors across.
 */
import type { Figure, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { add, leftOf, progress, scale, smooth } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { tempestRings } from '../../core/formation-groups.ts';

export type TempestPassParams = Record<string, never>;

/** Sideways step to pass right shoulders. */
const VEER = 0.3;

export const tempestPass: Figure<TempestPassParams> = (state, params, beats) => {
  onlyKeys('pass through (Tempest)', params, []);
  const rings = tempestRings(state);
  if (rings.length < 2) throw new Error('The 1s pass through between two side squares.');
  const plans: ((beat: number) => MovedBody)[] = [];
  for (const r of rings) {
    for (const id of r.inner) {
      const b = body(state, id);
      // Facing the middle of the set.
      if (Math.sin(b.yaw) * -r.side < 0.7) throw new Error('The 1s face across the set to pass through.');
      const to = { x: -b.position.x, z: b.position.z };
      const left = leftOf(b.yaw);
      plans.push((beat) => {
        const q = progress(beat / beats);
        const p = { x: b.position.x + (to.x - b.position.x) * q, z: b.position.z };
        return { id, position: add(p, scale(left, VEER * Math.sin(Math.PI * q))), yaw: b.yaw };
      });
    }
    for (const id of r.outer) {
      const b = body(state, id);
      const facingIn = Math.sin(b.yaw) * r.side < 0;
      plans.push((beat) => ({
        id,
        position: b.position,
        yaw: facingIn ? b.yaw : b.yaw - Math.PI * smooth(beat / beats),
      }));
    }
  }
  const motion = (beat: number) => ({ bodies: plans.map((p) => p(beat)), contacts: [] });
  return { kind: 'pass-through', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
