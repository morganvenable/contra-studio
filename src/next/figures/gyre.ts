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
  clamp,
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
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import { body, minorSets, pairsIn, withChanges } from '../core/state.ts';

export interface GyreParams {
  who: PairName;
  /** Times around: 1 (back home), 1.5 (to the other's place), 1¼ ... */
  amount: number;
  /** Shoulder toward the other dancer; right unless the source says left. */
  shoulder?: 'right' | 'left';
}

/** Distance from the middle of the pair while going around. */
const RADIUS = 0.45;
const MIN_RADIUS = 0.27;
/** Average meters a beat a gyre's path may take. */
const WALK = 0.95;
/** Share of the figure spent closing in, and again opening out. */
const CLOSE = 0.2;
/** Share of a far-apart gyre's path spent closing in, and opening out. */
const FAR_CLOSE = 0.3;
const SAMPLES = 400;
const FAR_RAMP = 0.1;
/** A far-apart pair goes around mostly once close in. */
const farTurn = (u: number) => clamp((u - FAR_CLOSE / 2) / (1 - FAR_CLOSE));
/** Meters a beat, on average, walking in to close up or out to open. */
const CLOSE_SPEED = 0.8;
const FACE_BEATS = 1;
/** Turning in to face the other takes longer the farther there is to turn. */
const FACE_RATE = 2.5;
const faceBeats = (into: number, beats: number) =>
  Math.min(beats / 2, Math.max(FACE_BEATS, (1.5 * Math.abs(into)) / FACE_RATE));

export const gyre: Figure<GyreParams> = (state, params, beats) => {
  onlyKeys('gyre', params, ['who', 'amount', 'shoulder']);
  const shoulder = oneOf('gyre', 'shoulder', params.shoulder ?? 'right', [
    'right',
    'left',
  ] as const);
  const who = oneOf('gyre', 'who', params.who, PAIR_NAMES);
  const amount = params.amount;
  if (!(amount > 0 && amount <= 3 && Number.isInteger(amount * 4)))
    throw new Error('Gyre amount must be a whole number of quarters around.');
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
      // Close round, unless the walk in, around and out would outpace a walk:
      // then a tighter round (never closer than the clearance allows).
      const fit = (WALK * beats - 2 * half) / (TAU * amount - 2);
      const radius = Math.max(MIN_RADIUS, Math.min(RADIUS, fit));
      return [pa, pb].map((self, i) => ({
        id: i ? b : a,
        start: self,
        center,
        half,
        radius,
        offset: sub(self.position, center),
        face: heading(self.position, center),
      }));
    });

  // Far apart (opposite corners): the path in, around and out is laid out
  // first and walked at a steady pace, so nobody outruns a walk.
  const steady = plans.map((p) => {
    const far = (1.5 * (p.half - p.radius)) / CLOSE_SPEED / beats > CLOSE;
    if (!far) return undefined;
    const at = (u: number) => {
      const close = Math.min(smooth(u / FAR_CLOSE), smooth((1 - u) / FAR_CLOSE));
      const r = p.half + (p.radius - p.half) * close;
      return add(p.center, rotate(scale(p.offset, r / p.half), sweep * farTurn(u)));
    };
    const lengths = [0];
    for (let i = 1; i <= SAMPLES; i++)
      lengths.push(lengths[i - 1] + length(sub(at(i / SAMPLES), at((i - 1) / SAMPLES))));
    const total = lengths[SAMPLES];
    return (q: number) => {
      const d = q * total;
      const i = Math.max(1, lengths.findIndex((l) => l >= d - 1e-12));
      const span = lengths[i] - lengths[i - 1];
      return Math.min(1, (i - 1 + (span > 0 ? (d - lengths[i - 1]) / span : 0)) / SAMPLES);
    };
  });

  const motion = (beat: number) => ({
    bodies: plans.map((p, k) => {
      const t = beat / beats;
      const walkTo = steady[k];
      const u = walkTo ? walkTo(progress(t, FAR_RAMP)) : progress(t);
      const phi = sweep * (walkTo ? farTurn(u) : u);
      const close = walkTo
        ? Math.min(smooth(u / FAR_CLOSE), smooth((1 - u) / FAR_CLOSE))
        : Math.min(smooth(t / CLOSE), smooth((1 - t) / CLOSE));
      const r = p.half + (Math.min(p.half, p.radius) - p.half) * close;
      const position = add(p.center, rotate(scale(p.offset, r / p.half), phi));
      // Face the other dancer: turn in at the start, then turn with the orbit.
      const into = turn(p.face, p.start.yaw);
      const yaw = p.start.yaw + into * smooth(beat / faceBeats(into, beats)) - phi;
      return { id: p.id, position, yaw };
    }),
    contacts: [],
  });
  return { kind: 'gyre', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
