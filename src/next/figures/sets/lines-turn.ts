/**
 * Turn into lines across, and back out to places (Money Musk).
 *
 * Definition: a couple standing across the set from each other meets in the
 * middle, turns by the hand the named amount, and lets go, each stepping out
 * the way the turn sent them:
 * - to: 'lines': into the middle of the line across formed by the couple
 *   above (or below) it, who turn to face down (or up) the set, so two lines
 *   of three face each other ("ones allemande right ¾ into short lines
 *   across");
 * - to: 'places': from the middle of those lines back out to the side lines,
 *   each into an empty place, while the couples in the lines turn back to
 *   face across ("ones allemande right ¾" out of short lines).
 * Everyone ends facing the middle of the set.
 * Source: ContraDB 907, Money Musk (Bicky McLain): "ones allemande right ¾
 * into short lines across", "balance short lines", "ones allemande right ¾";
 * the traditional Money Musk turns: "turn three quarters to lines of three
 * across ... turn three quarters to place".
 * Reading: a quick turn (four beats from lines 3.6 m apart) is faster than a
 * walk; it keeps its shape and is styled fast (core/fast.ts).
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, withinReach } from '../../core/contacts.ts';
import { SET } from '../../core/config.ts';
import { fastStyling } from '../../core/fast.ts';
import {
  add,
  dot,
  heading,
  length,
  mean,
  mix,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, minorSets, pairsIn, withChanges } from '../../core/state.ts';

export interface LinesTurnParams {
  /** The couple that turns ("1s"). */
  who: string;
  hand: 'right' | 'left';
  /** Turns: 0.75 for Money Musk. */
  amount: number;
  /** Into lines across, or back out to places on the sides. */
  to: 'lines' | 'places';
}

/** Each dancer's distance from the joined hands while turning. */
const HOLD_RADIUS = 0.45;
/** Shares of the figure spent closing in and stepping out. */
const IN = 0.3;
const OUT = 0.3;

export const linesTurn: Figure<LinesTurnParams> = (state, params, beats) => {
  onlyKeys('lines turn', params, ['who', 'hand', 'amount', 'to']);
  const hand = oneOf('lines turn', 'hand', params.hand, ['right', 'left'] as const);
  const to = oneOf('lines turn', 'to', params.to, ['lines', 'places'] as const);
  const amount = params.amount;
  if (!(Number.isFinite(amount) && amount > 0 && amount <= 2))
    throw new Error('A lines turn takes between 0 and 2 turns.');
  // Right-hand turns go clockwise from above, positive in rotate().
  const sweep = (hand === 'right' ? 1 : -1) * amount * TAU;

  const plans = minorSets(state).map((g) => {
    const pair = pairsIn(state, g, params.who);
    if (pair.length !== 1) throw new Error(`One couple of ${params.who} turns in each group.`);
    const [a, b] = pair[0];
    const center = mean([body(state, a).position, body(state, b).position]);
    const others = g.filter((id) => id !== a && id !== b);
    const turners = [a, b].map((id) => {
      const s = body(state, id);
      const rel = sub(s.position, center);
      const r0 = length(rel);
      if (r0 < 0.2) throw new Error(`Dancer ${id} stands in the middle already.`);
      const dir = scale(rotate(rel, sweep), 1 / r0);
      let target: Vec2;
      if (to === 'lines') {
        // The line the turn sends this dancer to: the others standing that way.
        const line = others.filter(
          (o) => dot(sub(body(state, o).position, center), dir) > 0.9,
        );
        if (line.length < 2) throw new Error('A line across needs a couple to join.');
        const reach = Math.min(...line.map((o) => dot(sub(body(state, o).position, center), dir)));
        target = add(center, scale(dir, reach));
      } else {
        target = add(center, scale(dir, SET.halfWidth));
        if (others.some((o) => length(sub(body(state, o).position, target)) < 0.5))
          throw new Error('The place the turn ends in is taken.');
      }
      return { id, s, rel, r0, target, endYaw: heading(target, center) };
    });
    // The others turn to face along the set (into lines) or across (to places).
    const standers = others.map((id) => {
      const s = body(state, id);
      const toward = to === 'lines' ? { x: s.position.x, z: center.z } : { x: center.x, z: s.position.z };
      return { id, s, endYaw: heading(s.position, toward) };
    });
    return { a, b, turners, standers };
  });

  const motion = (beat: number) => {
    const u = Math.max(0, Math.min(1, beat / beats));
    const closing = smooth(u / IN);
    const opening = smooth((u - (1 - OUT)) / OUT);
    const spin = smooth((u - IN * 0.5) / (1 - IN * 0.5 - OUT * 0.5));
    const bodies = plans.flatMap((p) => [
      ...p.turners.map((t) => {
        const r = t.r0 + (HOLD_RADIUS - t.r0) * closing;
        const center = sub(t.s.position, t.rel);
        const circle = add(center, scale(rotate(t.rel, sweep * spin), r / t.r0));
        const position = mix(circle, t.target, opening);
        // Face the way round while turning, then the middle of the set.
        const around = heading(circle, add(circle, rotate(sub(circle, center), Math.sign(sweep) * Math.PI / 2)));
        const into = t.s.yaw + turn(around, t.s.yaw) * smooth(u / IN);
        return { id: t.id, position, yaw: into + turn(t.endYaw, into) * opening };
      }),
      ...p.standers.map((s) => ({
        id: s.id,
        position: s.s.position,
        yaw: s.s.yaw + turn(s.endYaw, s.s.yaw) * smooth(to === 'lines' ? (u - 0.5) / 0.5 : u / 0.5),
      })),
    ]);
    const map = bodyMap(bodies);
    const strength = smooth((u - IN * 0.6) / 0.1) * smooth((1 - OUT * 0.6 - u) / 0.1);
    const contacts: FigureContact[] = plans.map((p) =>
      withinReach({ a: p.a, handA: hand, b: p.b, handB: hand, kind: 'joined', strength }, map),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'allemande',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
    ...fastStyling('quick lines turn', motion, beats),
  };
};
