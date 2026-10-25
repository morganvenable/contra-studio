/**
 * Figures on a diagonal: "left diagonal robins chain", "right diagonal
 * right left through". For the figure's duration the dancers regroup with
 * the couple across the set on their left (or right) diagonal instead of
 * their minor set; the figure runs unchanged inside those groups, and the
 * minor sets come back afterward (the progression, when the source marks
 * this row, finds the new ones).
 *
 * A couple is a lark and the robin beside him (partner, else neighbor). The
 * diagonal couple: for a couple facing across the set, the couple on
 * the other side line that is nearest along the couple's own left (or right)
 * and that names this couple on its own matching diagonal. Couples with no
 * one on that diagonal (at the ends of the set) stand still.
 */
import type { Figure } from './figure.ts';
import { dot, forward, leftOf, mean, rightOf, sub, turn } from './math.ts';
import { body, partnerOf, withChanges, type DanceState } from './state.ts';

/** How far along the set a diagonal couple may stand: up to two rows. */
const REACH = 4;

export function diagonalGroups(state: DanceState, side: 'left' | 'right'): number[][] {
  const couples = state.dancers
    .filter((d) => d.role === 'lark')
    .map((d) => {
      const robin = besideOf(state, d.id);
      const lark = body(state, d.id);
      const center = mean([lark.position, body(state, robin).position]);
      return { lark: d.id, robin, center, yaw: lark.yaw };
    });
  const choose = (c: (typeof couples)[number]) => {
    const toward = (side === 'left' ? leftOf : rightOf)(c.yaw);
    const facing = forward(c.yaw);
    let best: (typeof couples)[number] | undefined;
    let bestAlong = Infinity;
    for (const o of couples) {
      if (o === c) continue;
      const gap = sub(o.center, c.center);
      const across = dot(gap, facing);
      const along = dot(gap, toward);
      if (across < 0.9 || along < 0.5 || along > REACH) continue;
      if (along < bestAlong) {
        best = o;
        bestAlong = along;
      }
    }
    return best;
  };
  const groups: number[][] = [];
  for (const c of couples) {
    const o = choose(c);
    if (!o || choose(o) !== c || o.lark < c.lark) continue;
    groups.push([c.lark, c.robin, o.lark, o.robin]);
  }
  if (!groups.length) throw new Error(`No couples face each other on the ${side} diagonal.`);
  return groups;
}

/**
 * The robin a lark stands with as a couple: his partner when she stands
 * beside him on his side line facing the same way, else his neighbor when
 * she does (after a chain, or a neighbor swing in Becket).
 */
function besideOf(state: DanceState, lark: number): number {
  const me = body(state, lark);
  for (const name of ['partner', 'neighbor']) {
    const robin = state.relations.get(name)?.get(lark);
    if (robin === undefined) continue;
    const her = body(state, robin);
    const gap = sub(her.position, me.position);
    if (Math.abs(dot(gap, forward(me.yaw))) < 0.3 && Math.abs(turn(her.yaw, me.yaw)) < 0.3)
      return robin;
  }
  return partnerOf(state, lark);
}

/** Let any figure take `diagonal: 'left' | 'right'`. */
export function onDiagonal<P>(figure: Figure<P>): Figure<P & { diagonal?: 'left' | 'right' }> {
  return (state, params, beats) => {
    const { diagonal, ...rest } = params as P & { diagonal?: 'left' | 'right' };
    if (diagonal === undefined) return figure(state, rest as P, beats);
    if (diagonal !== 'left' && diagonal !== 'right')
      throw new Error(`diagonal must be left or right; got ${String(diagonal)}.`);
    const regrouped = withChanges(state, { groups: diagonalGroups(state, diagonal) });
    const result = figure(regrouped, rest as P, beats);
    return { ...result, exit: withChanges(result.exit, { groups: state.groups }) };
  };
}
