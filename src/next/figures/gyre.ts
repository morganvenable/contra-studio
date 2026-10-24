/**
 * Gyre (right-shoulder round).
 *
 * Definition: two dancers face each other and walk around each other by the
 * right shoulder, keeping eye contact, no hands: clockwise seen from above,
 * the same way as a swing. "Once" goes around back to place; "1½" ends in
 * the other dancer's place. Dancers apart across the set ("in the center")
 * walk in to meet, go around close together, and walk back out.
 * Source: Caller's Box glossary, "Gyre" / "Gypsy"; ContraDB rows "neighbors
 * gyre once", "ladles gyre once in the center", "ladles gyre 1½". Close
 * radius matches the meltdown round in swing.ts (0.45 m).
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import {
  add,
  heading,
  length,
  mix,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, minorSets, pairsIn, withChanges } from '../core/state.ts';

export interface GyreParams {
  who: 'partner' | 'neighbor' | 'larks' | 'robins';
  /** Times around: 1 (back home), 1.5 (to the other's place) ... */
  amount: number;
  /** Shoulder toward the other dancer; right unless the source says left. */
  shoulder?: 'right' | 'left';
}

/** Distance from the middle of the pair while going around. */
const RADIUS = 0.45;
/** Share of the figure spent closing in, and again opening out. */
const CLOSE = 0.2;
const FACE_BEATS = 1;

export const gyre: Figure<GyreParams> = (state, params, beats) => {
  onlyKeys('gyre', params, ['who', 'amount', 'shoulder']);
  const shoulder = oneOf('gyre', 'shoulder', params.shoulder ?? 'right', [
    'right',
    'left',
  ] as const);
  const who = oneOf('gyre', 'who', params.who, ['partner', 'neighbor', 'larks', 'robins'] as const);
  const amount = params.amount;
  if (!(amount > 0 && amount <= 3 && Number.isInteger(amount * 2)))
    throw new Error('Gyre amount must be a whole or half number of times around.');
  if (state.hands.length) throw new Error('A gyre starts with free hands.');
  // By the right shoulder: clockwise from above, increasing polar angle.
  const sweep = (shoulder === 'right' ? 1 : -1) * amount * TAU;

  const plans = minorSets(state)
    .flatMap((g) => pairsIn(state, g, who))
    .flatMap(([a, b]) => {
      const pa = body(state, a);
      const pb = body(state, b);
      const center = mix(pa.position, pb.position, 0.5);
      const half = length(sub(pa.position, pb.position)) / 2;
      if (half < 0.25) throw new Error(`Dancers ${a} and ${b} stand too close to gyre.`);
      return [pa, pb].map((self, i) => ({
        id: i ? b : a,
        start: self,
        center,
        half,
        offset: sub(self.position, center),
        face: heading(self.position, center),
      }));
    });

  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      const t = beat / beats;
      const phi = sweep * progress(t);
      const close = Math.min(smooth(t / CLOSE), smooth((1 - t) / CLOSE));
      const r = p.half + (Math.min(p.half, RADIUS) - p.half) * close;
      const position = add(p.center, rotate(scale(p.offset, r / p.half), phi));
      // Face the other dancer: turn in at the start, then turn with the orbit.
      const yaw = p.start.yaw + turn(p.face, p.start.yaw) * smooth(beat / FACE_BEATS) - phi;
      return { id: p.id, position, yaw };
    }),
    contacts: [],
  });
  return { kind: 'gyre', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
