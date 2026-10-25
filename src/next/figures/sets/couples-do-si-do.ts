/**
 * Couples do-si-do ("as couples do si do").
 *
 * Definition: two couples face each other, partners side by side holding
 * inside hands. Each couple dances a do-si-do as one: walk forward passing
 * the other couple by the right, slide across back to back, and walk
 * backward past it by the left to place, keeping the same facing all the
 * way. Partners close in to hold hands as they go and open out to their
 * places at the end.
 * Source: Caller's Box glossary, "Do-si-do" ("as couples"); ContraDB row
 * "as couples do si do" (Attleboro Reel, Linda Leslie: "take hand with
 * partner and do si do your neighbors as couples").
 * Reading: the couples pass right shoulders (right side to right side)
 * unless `shoulder` says left; `amount` counts times around as for a
 * do-si-do (1 is back to place).
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { add, dot, forward, length, mean, progress, rotate, scale, smooth, sub, TAU } from '../../core/math.ts';
import { body, handToward, minorSets, pairsIn, withChanges, type Hold } from '../../core/state.ts';

export interface CouplesDoSiDoParams {
  /** Times around: 1 (back to place), 1.5 (to the other couple's place). */
  amount: number;
  shoulder?: 'right' | 'left';
}

/** Half the gap between partners while they travel as a couple. */
const COUPLE_HALF = 0.35;
/** How far each couple's middle steps aside to pass the other couple. */
const PASS_SIDE = 0.65;
const CLOSE = 0.2;

export const couplesDoSiDo: Figure<CouplesDoSiDoParams> = (state, params, beats) => {
  onlyKeys('couples do-si-do', params, ['amount', 'shoulder']);
  const shoulder = oneOf('couples do-si-do', 'shoulder', params.shoulder ?? 'right', [
    'right',
    'left',
  ] as const);
  const amount = params.amount;
  if (!(amount > 0 && amount <= 2 && Number.isInteger(amount * 2)))
    throw new Error('Couples do-si-do amount must be a whole or half number of times around.');
  if (state.hands.length) throw new Error('A couples do-si-do starts with free hands.');
  const sweep = (shoulder === 'right' ? 1 : -1) * amount * TAU;

  const plans = minorSets(state).flatMap((group) => {
    const couples = pairsIn(state, group, 'partner');
    if (couples.length !== 2) throw new Error('A couples do-si-do needs two couples.');
    const centers = couples.map((c) => mean(c.map((id) => body(state, id).position)));
    const middle = mean(centers);
    return couples.map((pair, i) => {
      const half = length(sub(centers[i], middle));
      if (half < 0.6 || half > 1.4)
        throw new Error('A couples do-si-do needs the couples facing a place apart.');
      const axis = scale(sub(centers[i], middle), 1 / half);
      const side = rotate(axis, Math.PI / 2);
      const movers = pair.map((id) => {
        const b = body(state, id);
        if (dot(forward(b.yaw), axis) > -0.7)
          throw new Error('A couples do-si-do needs the couples facing each other.');
        // Sideways offset of each partner from the couple's middle.
        return { id, yaw: b.yaw, off: sub(b.position, centers[i]) };
      });
      const [a, b] = pair.map((id) => body(state, id));
      const hold: Hold = {
        a: pair[0],
        handA: handToward(a, b.position),
        b: pair[1],
        handB: handToward(b, a.position),
      };
      return { middle, axis, side, half, movers, hold };
    });
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const phi = sweep * progress(t);
    const close = Math.min(smooth(t / CLOSE), smooth((1 - t) / CLOSE));
    const bodies = plans.flatMap((p) => {
      const center = add(
        p.middle,
        add(scale(p.axis, p.half * Math.cos(phi)), scale(p.side, PASS_SIDE * Math.sin(phi))),
      );
      return p.movers.map((m) => {
        const r = length(m.off);
        const narrow = (r + (COUPLE_HALF - r) * close) / r;
        return { id: m.id, position: add(center, scale(m.off, narrow)), yaw: m.yaw };
      });
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = plans.map((p) => withinReach(joined(p.hold, close), map));
    return { bodies, contacts };
  };
  return {
    kind: 'couples-do-si-do',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
