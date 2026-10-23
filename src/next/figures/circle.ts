/**
 * Circle left (or right).
 *
 * Definition: the dancers of a group (a minor set of four, or a whole small
 * set) join hands in a ring, facing the center, and walk to their left
 * (clockwise from above) or right, either a number of places (one place is
 * one dancer's spacing around the ring) or an amount of the way around,
 * ending facing the center. Hands release at the end.
 * Source: Caller's Box glossary, "Circle"; ContraDB row "circle left 3 places"
 * (dance 2321). The ring tightening (32% at mid-figure) and travel clock are
 * ported from the circle primitive in src/engine.ts.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined } from '../core/contacts.ts';
import {
  add,
  heading,
  length,
  mean,
  polar,
  positiveAngle,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, minorSets, withChanges, type Hold } from '../core/state.ts';

export interface CircleParams {
  direction: 'left' | 'right';
  /** Places around the ring (with four dancers, 4 is once around). */
  places?: number;
  /** Or: times around (0.75, 1, 1.5). */
  amount?: number;
}

const TIGHTEN = 0.32;
const EDGE = 0.16;

export const circle: Figure<CircleParams> = (state, params, beats) => {
  onlyKeys('circle', params, ['direction', 'places', 'amount']);
  const direction = oneOf('circle', 'direction', params.direction, ['left', 'right'] as const);
  if ((params.places === undefined) === (params.amount === undefined)) {
    throw new Error('A circle needs either places or an amount.');
  }
  if (params.places !== undefined && !(Number.isInteger(params.places) && params.places >= 1)) {
    throw new Error('Circle places must be a whole number of places.');
  }
  if (params.amount !== undefined && !(params.amount > 0 && params.amount <= 4)) {
    throw new Error('Circle amount must be between 0 and 4 times around.');
  }
  if (state.hands.length) throw new Error('A circle starts with free hands.');
  const sign = direction === 'left' ? 1 : -1;

  const rings = minorSets(state).map((group) => {
    const n = group.length;
    const center = mean(group.map((id) => body(state, id).position));
    const order = [...group].sort(
      (a, b) =>
        polar(sub(body(state, a).position, center)) - polar(sub(body(state, b).position, center)),
    );
    for (let i = 0; i < n; i++) {
      const rel = sub(body(state, order[i]).position, center);
      const next = sub(body(state, order[(i + 1) % n]).position, center);
      const gap = positiveAngle(polar(next) - polar(rel));
      if (length(rel) < 0.6 || length(rel) > 3 || Math.abs(gap - TAU / n) > 0.5) {
        throw new Error(`A circle of ${n} needs the dancers spaced around a ring.`);
      }
    }
    if (params.places !== undefined && params.places > 2 * n)
      throw new Error('Too many circle places.');
    const turns = params.amount ?? params.places! / n;
    // Moving to the left is increasing polar angle, so each dancer's left-hand
    // neighbor is the next one in polar order.
    const hands: Hold[] = order.map((id, i) => ({
      a: id,
      handA: 'left',
      b: order[(i + 1) % n],
      handB: 'right',
    }));
    return { center, ids: order, hands, sweep: sign * turns * TAU };
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const radius = 1 - TIGHTEN * Math.min(smooth(t / EDGE), smooth((1 - t) / EDGE));
    // Hands join once the ring has closed enough to reach, and let go as it opens.
    const reachable = (u: number) => smooth((u / EDGE - 0.5) / 0.5);
    const strength = Math.min(reachable(t), reachable(1 - t));
    const bodies = rings.flatMap((ring) =>
      ring.ids.map((id) => {
        const angle = ring.sweep * progress(t);
        const s = body(state, id);
        const position = add(
          ring.center,
          rotate(scale(sub(s.position, ring.center), radius), angle),
        );
        // Face the center: turn in over the opening, then turn with the ring.
        const into = turn(heading(s.position, ring.center), s.yaw);
        const yaw = s.yaw + into * smooth(t / EDGE) - angle;
        return { id, position, yaw };
      }),
    );
    const contacts: FigureContact[] = rings.flatMap((r) => r.hands.map((h) => joined(h, strength)));
    return { bodies, contacts };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
