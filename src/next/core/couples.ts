/**
 * Who stands together as a couple now. In Becket lines a couple is a lark
 * with a robin on his right, side by side on a side line, facing the same
 * way: usually his partner, but after a chain on the diagonal (or a
 * neighbor swing) it can be someone else. Progression and figures on a
 * diagonal read couples this way; the partner relation never changes.
 */
import { SET } from './config.ts';
import { distance, rightOf, scale, add, turn } from './math.ts';
import { body, partnerOf, type DanceState } from './state.ts';

/** The robin standing on this lark's right as his couple, else his partner. */
export function coupleRobin(state: DanceState, lark: number): number {
  const me = body(state, lark);
  const spot = add(me.position, scale(rightOf(me.yaw), SET.slot));
  const beside = state.dancers.find((d) => {
    if (d.role !== 'robin') return false;
    const her = body(state, d.id);
    return distance(her.position, spot) < 0.3 && Math.abs(turn(her.yaw, me.yaw)) < 0.3;
  });
  return beside?.id ?? partnerOf(state, lark);
}
