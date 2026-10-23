/**
 * Allemande (hand turn).
 *
 * Definition: two dancers join the named hand and walk forward around each
 * other, the joined hands at the center, for the named amount (1/2, 3/4, once,
 * 1 1/2...). Right-hand turns go clockwise seen from above. "To short waves
 * with X in the middle" means the turn ends in a four-dancer line with X in the
 * center, who then join their free hands. A whole or half turn with no wave
 * ends back on the pair's own line: the pair lets go and steps back out to
 * the distance it started at. A quarter or three-quarter turn keeps hands,
 * the pair standing across its old line (ready for, say, a turn in the middle).
 * Source: Caller's Box glossary, "Allemande"; ContraDB rows "partners
 * allemande right 3/4 to short waves with gentlespoons in the middle" and
 * "gentlespoons allemande left 1/2" (dance 2321). Orbit math ported from the
 * allemande primitive in src/engine.ts (gather to a held radius, C2 travel).
 */
import type { Role } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined, sameHold } from '../core/contacts.ts';
import { findWave, lineHolds, middleRole } from '../core/lines.ts';
import {
  add,
  dot,
  heading,
  leftOf,
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
import { body, holdsBetween, minorSets, pairsIn, withChanges, type Hold } from '../core/state.ts';

export interface AllemandeParams {
  who: 'partner' | 'neighbor' | 'larks' | 'robins';
  hand: 'right' | 'left';
  /** Turns: 0.5, 0.75, 1, 1.5 ... */
  amount: number;
  /** End in a short wave with this role in the middle. */
  wave?: { middle: Role };
}

/** Distance from each dancer to the joined hands while turning. */
export const HOLD_RADIUS = 0.45;

export const allemande: Figure<AllemandeParams> = (state, params, beats) => {
  onlyKeys('allemande', params, ['who', 'hand', 'amount', 'wave']);
  const who = oneOf('allemande', 'who', params.who, [
    'partner',
    'neighbor',
    'larks',
    'robins',
  ] as const);
  const hand = oneOf('allemande', 'hand', params.hand, ['right', 'left'] as const);
  const amount = params.amount;
  if (!(Number.isFinite(amount) && amount > 0 && amount <= 4)) {
    throw new Error('Allemande amount must be a number of turns between 0 and 4.');
  }
  const sign = hand === 'right' ? 1 : -1;
  const sweep = sign * amount * TAU;
  const gather = Math.min(0.4, 1.5 / beats);
  const stepsOut = !params.wave && Number.isInteger(amount * 2);
  const groups = minorSets(state);

  const pairs = groups.flatMap((g) => pairsIn(state, g, who));
  const holds: Hold[] = pairs.map(([a, b]) => ({ a, handA: hand, b, handB: hand }));
  const orbits = pairs.flatMap(([a, b]) => {
    for (const h of state.hands) {
      const uses = (id: number) =>
        (h.a === id && h.handA === hand) || (h.b === id && h.handB === hand);
      const isPair = holdsBetween(state, a, b).includes(h);
      if ((uses(a) || uses(b)) && !isPair)
        throw new Error(`Dancer ${uses(a) ? a : b}'s ${hand} hand is not free.`);
    }
    const pa = body(state, a);
    const pb = body(state, b);
    const center = mean([pa.position, pb.position]);
    const span = length(sub(pa.position, pb.position));
    if (span < 0.5 || span > 2.7)
      throw new Error(`Dancers ${a} and ${b} are too far apart to turn by the hand.`);
    return [a, b].map((id) => {
      const me = id === a ? pa : pb;
      const other = id === a ? pb : pa;
      const rel = sub(me.position, center);
      // Facing the way you walk, with the joined hands on the turning side.
      const walk = scale(rotate(rel, Math.PI / 2), sign);
      let needed = turn(heading(me.position, add(me.position, walk)), me.yaw);
      if (Math.abs(needed) > Math.PI - 0.2) {
        // About-face: turn toward the person you are about to take hands with.
        needed =
          dot(leftOf(me.yaw), sub(other.position, me.position)) >= 0
            ? Math.abs(needed)
            : -Math.abs(needed);
      }
      return { id, center, rel, radius: length(rel), start: me, needed };
    });
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const g = smooth(t / gather);
    // Ending back on its own line (a whole or half turn) with no wave to
    // form, the pair lets go and steps back out to its span.
    const out = stepsOut ? smooth((t - (1 - gather)) / gather) : 0;
    const angle = sweep * progress(t);
    const bodies = orbits.map((o) => {
      const r = o.radius + (HOLD_RADIUS - o.radius) * g * (1 - out);
      const position = add(o.center, rotate(scale(o.rel, r / o.radius), angle));
      return { id: o.id, position, yaw: o.start.yaw + o.needed * g - angle };
    });
    const contacts: FigureContact[] = holds.map((h) => {
      const held = state.hands.some((s) => sameHold(s, h));
      // Hands join once the pair has closed in enough to reach.
      return joined(h, (held ? 1 : smooth((g - 0.5) / 0.5)) * (1 - smooth(out / 0.5)));
    });
    if (waveHolds.length) {
      const strength = smooth((beat - (beats - 0.25)) / 0.25);
      contacts.push(...waveHolds.map((h) => joined(h, strength)));
    }
    return { bodies, contacts };
  };

  let waveHolds: Hold[] = [];
  const turned = settle(state, motion, beats);
  if (params.wave) {
    const middle = oneOf('allemande', 'wave middle', params.wave.middle, [
      'lark',
      'robin',
    ] as const);
    for (const g of groups) {
      const line = findWave(turned, g);
      if (middleRole(turned, line) !== middle) {
        throw new Error(`This allemande does not end in a wave with ${middle}s in the middle.`);
      }
      const extra = lineHolds(turned, line).filter((h) => !holds.some((p) => sameHold(p, h)));
      waveHolds = waveHolds.concat(extra);
    }
  }
  return {
    kind: 'allemande',
    motion,
    exit: withChanges(turned, { hands: stepsOut ? [] : [...holds, ...waveHolds] }),
  };
};
