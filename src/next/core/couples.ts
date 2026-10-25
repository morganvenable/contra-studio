/**
 * Who stands together as a couple now. In Becket lines a couple is a lark
 * with a robin on his right, side by side on a side line, facing the same
 * way: usually his partner, but after a chain on the diagonal (or a
 * neighbor swing) it can be someone else. Progression and figures on a
 * diagonal read couples this way; the partner relation never changes.
 */
import type { Vec2 } from '../../types.ts';
import { SET } from './config.ts';
import { distance, rightOf, scale, add, turn } from './math.ts';
import { body, partnerOf, type DanceState } from './state.ts';

/** The robin standing on this lark's right as his couple, else his partner. */
export function coupleRobin(state: DanceState, lark: number): number {
  const me = body(state, lark);
  // On a side line a couple faces across, whichever way each one is turned.
  const onLine = Math.abs(Math.abs(me.position.x) - SET.halfWidth) < 0.05;
  const facing = onLine ? (me.position.x > 0 ? -Math.PI / 2 : Math.PI / 2) : me.yaw;
  const at = (spot: Vec2) =>
    state.dancers.find((d) => {
      if (d.role !== 'robin') return false;
      const her = body(state, d.id);
      return (
        distance(her.position, spot) < 0.3 && (onLine || Math.abs(turn(her.yaw, me.yaw)) < 0.3)
      );
    });
  const right = at(add(me.position, scale(rightOf(facing), SET.slot)));
  // On a side line, a robin on his left with nobody on his right will do
  // (after a circle three places the couples stand that way round).
  const left = onLine && !right ? at(add(me.position, scale(rightOf(facing), -SET.slot))) : undefined;
  return (right ?? left)?.id ?? partnerOf(state, lark);
}
