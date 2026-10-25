/**
 * Couples do-si-do.
 *
 * Definition: each couple, side by side and keeping the facing it has, does
 * a do-si-do with the couple it faces as if the two were one dancer: the
 * couples walk forward passing right shoulders (each robin passes the other
 * robin), slide across back to back, and back up to place, still facing the
 * same way. ½ more ("1½") ends in the other couple's place. Partners close up
 * to a comfortable side-by-side distance while dancing as a unit and open
 * out again at the end.
 * Source: Caller's Box glossary, "Do-si-do" ("couples do-si-do"); ContraDB
 * rows "neighbors do si do once as couples", "partners do si do once as a
 * couple around neighbors".
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import {
  add,
  dot,
  forward,
  heading,
  length,
  mean,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, minorSets, partnerOf, roleOf, withChanges } from '../core/state.ts';

export interface CouplesDoSiDoParams {
  /** Times around: 1 (back home), 1.5 (to the other couple's place). */
  amount: number;
}

/** Half the sideways gap between the couples' centers as they pass. */
const PASS_HALF = 0.75;
/** Partners close to this distance apart while dancing as one. */
const UNIT_GAP = 0.8;
/** Couples farther apart close in to this half distance mid-figure. */
const MIDDLE_HALF = 0.85;
const CLOSE = 0.3;

export const couplesDoSiDo: Figure<CouplesDoSiDoParams> = (state, params, beats) => {
  onlyKeys('couples do-si-do', params, ['amount']);
  const amount = params.amount;
  if (!(amount > 0 && amount <= 3 && Number.isInteger(amount * 2)))
    throw new Error('A couples do-si-do goes a whole or half number of times around.');
  const sweep = amount * TAU;

  const plans = minorSets(state).flatMap((g) => {
    const larks = g.filter((id) => roleOf(state, id) === 'lark');
    if (g.length !== 4 || larks.length !== 2)
      throw new Error('A couples do-si-do needs two couples.');
    const units = larks.map((lark) => {
      const robin = partnerOf(state, lark);
      if (!g.includes(robin)) throw new Error(`Dancer ${lark}'s partner is not here.`);
      const pl = body(state, lark);
      const pr = body(state, robin);
      if (Math.abs(turn(pl.yaw, pr.yaw)) > 0.6)
        throw new Error('Partners must face the same way to dance as a couple.');
      return { lark, robin, center: mean([pl.position, pr.position]), yaw: pl.yaw };
    });
    const [a, b] = units;
    const gap = sub(b.center, a.center);
    const half = length(gap) / 2;
    if (half < 0.5 || half > 1.6) throw new Error('The couples are too far apart to do-si-do.');
    if (dot(forward(a.yaw), gap) < 0.5 * length(gap) || dot(forward(b.yaw), gap) > -0.5 * length(gap))
      throw new Error('The couples must face each other to do-si-do.');
    const middle = mean([a.center, b.center]);
    return units.flatMap((u) => {
      const axis = scale(sub(u.center, middle), 1 / half);
      const side = rotate(axis, Math.PI / 2);
      return [u.lark, u.robin].map((id) => {
        const start = body(state, id);
        const offset = sub(start.position, u.center);
        const across = length(offset);
        return { id, start, axis, side, half, middle, offset, across, face: heading(u.center, middle) };
      });
    });
  });

  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      const t = beat / beats;
      // Passing right shoulders goes clockwise from above: increasing polar angle.
      const phi = sweep * progress(t);
      const close = Math.min(smooth(t / CLOSE), smooth((1 - t) / CLOSE));
      const along = p.half + (Math.min(p.half, MIDDLE_HALF) - p.half) * close;
      const unit: Vec2 = add(
        p.middle,
        add(scale(p.axis, along * Math.cos(phi)), scale(p.side, PASS_HALF * Math.sin(phi))),
      );
      const width = p.across + (UNIT_GAP / 2 - p.across) * close;
      const offset = p.across > 1e-6 ? scale(p.offset, width / p.across) : p.offset;
      return { id: p.id, position: add(unit, offset), yaw: p.start.yaw };
    }),
    contacts: [],
  });
  return {
    kind: 'couples-do-si-do',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
