/**
 * Half poussette.
 *
 * Definition: pairs (partners, or neighbors) face each other holding both
 * hands. The named role pulls their pair back, then to their left (or
 * right): the two pairs of a minor set travel around each other and trade
 * places, half way around the middle of the minor set, every dancer keeping
 * the way they face. "Larks pull partners back then left": each lark backs
 * up, drawing their partner along, then the pair moves to the lark's left.
 * Pairs that start apart step together first, and every pair opens back out
 * to the side lines (partners across the set) as it arrives.
 * Source: Caller's Box glossary, "Poussette"; ContraDB rows "half poussette
 * - gentlespoons pull partners back then left", "half poussette - ladles
 * pull neighbors back then right". The pairs' path is a half circle about
 * the minor set's middle, so the first step is straight back and the
 * second along the set, as named; a turn the geometry contradicts (the
 * pair would leave the minor set) is an error.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  dot,
  forward,
  heading,
  leftOf,
  length,
  mean,
  progress,
  rightOf,
  rotate,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { SET } from '../core/config.ts';
import { roleOfGroup } from '../core/roles.ts';
import { body, minorSets, pairsIn, roleOf, withChanges } from '../core/state.ts';

export interface PoussetteParams {
  /** Who pulls back. */
  who: 'larks' | 'robins';
  /** Who holds hands with whom. */
  pair: 'partner' | 'neighbor';
  /** Which way the puller goes after backing up. */
  then: 'left' | 'right';
  /** Times around: 0.5 for a half poussette, 1 for a whole one. */
  amount?: number;
}

/** Distance between the two dancers of a pair, holding both hands. */
const PAIR_GAP = 0.8;
/** Share of the figure spent stepping together, and opening out at the end. */
const GATHER = 0.2;
const OPEN = 0.2;

export const poussette: Figure<PoussetteParams> = (state, params, beats) => {
  onlyKeys('poussette', params, ['who', 'pair', 'then', 'amount']);
  const who = oneOf('poussette', 'who', params.who, ['larks', 'robins'] as const);
  const pair = oneOf('poussette', 'pair', params.pair, ['partner', 'neighbor'] as const);
  const then = oneOf('poussette', 'then', params.then, ['left', 'right'] as const);
  const amount = params.amount ?? 0.5;
  if (amount !== 0.5 && amount !== 1) throw new Error('A poussette goes half or all the way.');
  const role = roleOfGroup(who)!;

  const plans = minorSets(state).map((g) => {
    const middle = mean(g.map((id) => body(state, id).position));
    const pairs = pairsIn(state, g, pair).map(([a, b]) => {
      const puller = roleOf(state, a) === role ? a : b;
      const other = puller === a ? b : a;
      if (roleOf(state, other) === role) throw new Error(`Each pair needs one of the ${who}.`);
      const pp = body(state, puller).position;
      const po = body(state, other).position;
      const c = mean([pp, po]);
      // Face each other along the line between them.
      const yaw = heading(pp, po);
      const back = scale(forward(yaw), -1);
      const side = then === 'left' ? leftOf(yaw) : rightOf(yaw);
      const rel = sub(c, middle);
      if (length(rel) < 0.3) throw new Error('The pairs must stand apart to poussette.');
      // Around the middle: the first step is back, so the orbit's tangent there is `back`.
      const tangent = { x: -rel.z, z: rel.x };
      const sign = dot(tangent, back) >= 0 ? 1 : -1;
      // Then along: the pair must head toward the middle's far side, the named way.
      if (dot(side, scale(rel, -1)) <= 0)
        throw new Error(`Going ${then} after backing up would take the pair out of the minor set.`);
      return { puller, other, c, rel, yaw, sign };
    });
    return { middle, pairs };
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const gather = smooth(t / GATHER);
    const bodies = plans.flatMap((p) =>
      p.pairs.flatMap((q) => {
        const a = q.sign * Math.PI * 2 * amount * progress(t);
        const center = add(p.middle, rotate(q.rel, a));
        // Hands-held gap while traveling, opening to the side lines at the end.
        const gap = PAIR_GAP + (2 * SET.halfWidth - PAIR_GAP) * smooth((t - (1 - OPEN)) / OPEN);
        const half = scale(forward(q.yaw), gap / 2);
        return [
          [q.puller, scale(half, -1), q.yaw],
          [q.other, half, q.yaw + Math.PI],
        ].map(([id, off, yaw]) => {
          const from = body(state, id as number);
          const target = add(center, off as { x: number; z: number });
          const home = add(q.c, scale(forward(q.yaw), ((id === q.puller ? -1 : 1) * PAIR_GAP) / 2));
          // Step together around the start, then ride the orbit.
          const position = add(target, scale(sub(from.position, home), 1 - gather));
          return {
            id: id as number,
            position,
            yaw: from.yaw + turn(yaw as number, from.yaw) * gather,
          };
        });
      }),
    );
    const map = bodyMap(bodies);
    const strength = smooth((t - GATHER * 0.5) / (GATHER * 0.5)) * smooth((1 - OPEN - t) / 0.1);
    const contacts: FigureContact[] = plans.flatMap((p) =>
      p.pairs.flatMap((q) =>
        (['right', 'left'] as const).map((h) =>
          withinReach(
            {
              a: q.puller,
              handA: h,
              b: q.other,
              handB: h === 'right' ? 'left' : 'right',
              kind: 'joined',
              strength,
            },
            map,
          ),
        ),
      ),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'half-poussette',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
