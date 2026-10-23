/**
 * Rory O'More (slide right or left).
 *
 * Definition (the owner's words, authoritative): from a balance in a wave,
 * slide right (or left) one place, passing the neighbor you were holding by
 * that hand face to face. Most dancers also twirl quickly clockwise when
 * sliding right (counterclockwise sliding left). The spin is the default.
 * Also: Caller's Box glossary "Slide right/left"; Colin Hume, session 7.
 *
 * Kernel ported from src/rory-slide.ts: C2 travel clock, each dancer bows
 * BACKWARD (0.44 m at the crossing) so the passing pair goes face to face,
 * and the spin is one full turn in the travel direction. Hands release at the
 * start and the new wave joins hands at the end.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined, sameHold } from '../core/contacts.ts';
import { findWave, lineHolds } from '../core/lines.ts';
import { LIMITS } from '../core/config.ts';
import { add, ease, forward, mix, progress, scale, TAU } from '../core/math.ts';
import { body, handOf, minorSets, withChanges, type Hold } from '../core/state.ts';

export interface RoryParams {
  direction: 'right' | 'left';
  spin?: 'full' | 'none';
}

/** Backward bow at the moment of passing, each dancer. */
const BOW = 0.44;
const RELEASE = 0.18;

/** The twirl is centered on the crossing (travel progress 0.5). */
const TWIRL_SPAN = 0.6;
const twirl = (q: number) => ease((q - 0.5) / TWIRL_SPAN + 0.5);

export const rory: Figure<RoryParams> = (state, params, beats) => {
  onlyKeys('Rory', params, ['direction', 'spin']);
  const direction = oneOf('Rory', 'direction', params.direction, ['right', 'left'] as const);
  const spin = oneOf('Rory', 'spin', params.spin ?? 'full', ['full', 'none'] as const);
  const turnBy = spin === 'full' ? (direction === 'right' ? -TAU : TAU) : 0;

  const groups = minorSets(state);
  const swaps = new Map<number, number>();
  for (const g of groups) {
    const line = findWave(state, g);
    for (const id of line.order) {
      const hold = state.hands.find(
        (h) => handOf(h, id) === direction && g.includes(h.a) && g.includes(h.b),
      );
      if (!hold)
        throw new Error(
          `Dancer ${id} must hold the ${direction} hand of the person to slide past.`,
        );
      const other = hold.a === id ? hold.b : hold.a;
      if (handOf(hold, other) !== direction)
        throw new Error(`A Rory pass needs ${direction} hands joined.`);
      swaps.set(id, other);
    }
  }

  const moves = [...swaps].map(([id, other]) => ({
    id,
    start: body(state, id),
    end: body(state, other).position,
  }));

  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = moves.map((m) => {
      const back = scale(forward(m.start.yaw), -BOW * Math.sin(Math.PI * q));
      return {
        id: m.id,
        position: add(mix(m.start.position, m.end, q), back),
        yaw: m.start.yaw + turnBy * twirl(q),
      };
    });
    const contacts: FigureContact[] = [];
    if (beat < RELEASE)
      contacts.push(...state.hands.map((h) => joined(h, 1 - ease(beat / RELEASE))));
    if (beat > beats - RELEASE) {
      const strength = ease((beat - (beats - RELEASE)) / RELEASE);
      contacts.push(...newHolds.map((h) => joined(h, strength)));
    }
    return { bodies, contacts };
  };

  let newHolds: Hold[] = [];
  const slid = settle(state, motion, beats);
  newHolds = groups.flatMap((g) => lineHolds(slid, findWave(slid, g)));
  if (newHolds.some((h) => state.hands.some((old) => sameHold(old, h)))) {
    throw new Error('Rory must end holding hands with new people.');
  }
  return {
    kind: 'balance-rory-slide',
    motion,
    exit: withChanges(slid, { hands: newHolds }),
    ...(turnBy ? { limits: { maximumYawRate: LIMITS.spinYawRate } } : {}),
  };
};
