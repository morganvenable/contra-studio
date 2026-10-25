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
import type { Vec2 } from '../../types.ts';
import { SET } from './config.ts';
import type { Figure } from './figure.ts';
import { settle } from './figure.ts';
import { add, dot, forward, leftOf, mean, rightOf, scale, smooth, sub, turn } from './math.ts';
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
    const groups = diagonalGroups(state, diagonal);
    const shifts = gatherShifts(state, groups);
    const bodies = new Map(state.bodies);
    for (const [id, d] of shifts) {
      const b = body(state, id);
      bodies.set(id, { ...b, position: add(b.position, d) });
    }
    const regrouped = withChanges(state, { groups, bodies });
    const result = figure(regrouped, rest as P, beats);
    if (!shifts.size) return { ...result, exit: withChanges(result.exit, { groups: state.groups }) };
    // Close up over the first beats, and spread back to the side lines'
    // places over the last ones: each dancer takes back the shift of the
    // couple whose side of the minor set they end on.
    const span = Math.min(GATHER_BEATS, beats / 3);
    const end = result.motion(beats);
    const back = new Map<number, Vec2>();
    for (const g of groups) {
      const middle = mean(g.map((id) => body(regrouped, id).position));
      const sideShift = (x: number) => {
        const from = g.find((id) => Math.sign(body(regrouped, id).position.x - middle.x) === Math.sign(x - middle.x));
        return from === undefined ? { x: 0, z: 0 } : shifts.get(from)!;
      };
      for (const b of end.bodies) if (g.includes(b.id)) back.set(b.id, sideShift(b.position.x));
    }
    const motion = (beat: number) => {
      const frame = result.motion(beat);
      const open = smooth(beat / span);
      const close = smooth((beat - (beats - span)) / span);
      return {
        bodies: frame.bodies.map((b) => {
          const d = shifts.get(b.id);
          if (!d) return b;
          const position = sub(add(b.position, scale(back.get(b.id)!, -close)), scale(d, 1 - open));
          return { ...b, position };
        }),
        contacts: frame.contacts.map((c) => (shifts.has(c.a) ? { ...c, point: undefined } : c)),
      };
    };
    return {
      ...result,
      motion,
      exit: withChanges(settle(result.exit, motion, beats), { groups: state.groups }),
    };
  };
}

/** Beats, at most, to close up to a diagonal couple, and to spread back. */
const GATHER_BEATS = 3;

/**
 * Couples on a diagonal stand farther apart along the set than couples
 * straight across (in Becket lines, a whole couple's width). Each couple
 * steps half the extra distance toward the other, along its own line, so the
 * two stand one place apart on the diagonal, like neighbors in an improper set.
 */
function gatherShifts(state: DanceState, groups: readonly (readonly number[])[]): Map<number, Vec2> {
  const shifts = new Map<number, Vec2>();
  for (const [lark, robin, olark, orobin] of groups) {
    const a = body(state, lark).position;
    const ar = body(state, robin).position;
    const line = sub(ar, a);
    const len = Math.hypot(line.x, line.z);
    if (len < 1e-6) continue;
    const u = scale(line, 1 / len);
    const cA = mean([a, ar]);
    const cB = mean([body(state, olark).position, body(state, orobin).position]);
    const d = dot(sub(cB, cA), u);
    const extra = Math.abs(d);
    if (extra < 0.05) continue;
    const g = scale(u, (Math.sign(d) * extra) / 2);
    for (const id of [lark, robin]) shifts.set(id, g);
    for (const id of [olark, orobin]) shifts.set(id, scale(g, -1));
  }
  return shifts;
}
