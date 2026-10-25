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
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import {
  add,
  dot,
  forward,
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
  who: PairName;
  hand: 'right' | 'left';
  /** Turns: 0.5, 0.75, 1, 1.5 ... */
  amount: number;
  /** End in a short wave with this role in the middle. */
  wave?: { middle: Role };
  /**
   * "To long waves": end facing across the set, still holding on and close
   * (a pair turning ¾ out of a short wave, or 1½ along a side line).
   */
  longWaves?: boolean;
}

/** Distance from each dancer to the joined hands while turning. */
export const HOLD_RADIUS = 0.45;
/** Turning radius of a pair that lets go and steps back out at the end. */
const TIGHT_RADIUS = 0.38;
/** Closing in takes this much of a turn (or the first share of a short one). */
const GATHER_TURNS = 0.3;
/** Samples along the path for walking it at a steady pace. */
const PATH_STEPS = 240;

export const allemande: Figure<AllemandeParams> = (state, params, beats) => {
  onlyKeys('allemande', params, ['who', 'hand', 'amount', 'wave', 'longWaves']);
  if (params.longWaves !== undefined && params.longWaves !== true)
    throw new Error('allemande longWaves must be true when given.');
  if (params.longWaves && params.wave)
    throw new Error('An allemande ends in short waves or long waves, not both.');
  const who = oneOf('allemande', 'who', params.who, PAIR_NAMES);
  const hand = oneOf('allemande', 'hand', params.hand, ['right', 'left'] as const);
  const amount = params.amount;
  if (!(Number.isFinite(amount) && amount > 0 && amount <= 4)) {
    throw new Error('Allemande amount must be a number of turns between 0 and 4.');
  }
  const sign = hand === 'right' ? 1 : -1;
  const sweep = sign * amount * TAU;
  const stepsOut = !params.wave && !params.longWaves && Number.isInteger(amount * 2);
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

  // The path by u in [0, 1] (the share of the turn): close in to the held
  // radius over the first part of the turn and, for a whole or half turn
  // with no wave to form, let go and step back out over the last part. A
  // pair that steps back out turns at a tighter radius, since it need not
  // end at a wave's spacing.
  const inner = stepsOut ? TIGHT_RADIUS : HOLD_RADIUS;
  const share = Math.min(stepsOut ? 0.45 : 0.4, GATHER_TURNS / amount);
  // Share of the sweep turned by u: none at first while closing in (and,
  // stepping back out, none at the end), so the pair moves straight in and
  // out instead of sweeping wide around at its starting distance.
  const lead = share / 2;
  const tail = stepsOut ? share / 2 : 0;
  const swept = (u: number) => {
    const span = 1 - lead - tail;
    if (u < share) return (u * u) / (2 * share) / span;
    if (stepsOut && u > 1 - share) return 1 - ((1 - u) * (1 - u)) / (2 * share) / span;
    return (u - lead) / span;
  };
  const shape = (radius: number, u: number) => {
    const g = smooth(u / share);
    const out = stepsOut ? smooth((u - (1 - share)) / share) : 0;
    return { g, out, r: radius + (inner - radius) * g * (1 - out), angle: sweep * swept(u) };
  };
  // Walk the path at one steady pace (with the usual ramps at the ends), so
  // closing in from far apart does not rush the first beat.
  const pace = new Map(
    orbits.map((o) => {
      const lengths = [0];
      let last = o.rel;
      for (let k = 1; k <= PATH_STEPS; k++) {
        const { r, angle } = shape(o.radius, k / PATH_STEPS);
        const here = rotate(scale(o.rel, r / o.radius), angle);
        lengths.push(lengths[k - 1] + length(sub(here, last)));
        last = here;
      }
      return [o.id, lengths] as const;
    }),
  );
  const along = (id: number, t: number) => {
    const lengths = pace.get(id)!;
    const goal = lengths[PATH_STEPS] * progress(t);
    let lo = 0;
    let hi = PATH_STEPS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] < goal) lo = mid;
      else hi = mid;
    }
    const span = lengths[hi] - lengths[lo];
    return (lo + (span > 1e-12 ? (goal - lengths[lo]) / span : 0)) / PATH_STEPS;
  };

  const motion = (beat: number) => {
    const t = beat / beats;
    const at = new Map(orbits.map((o) => [o.id, { o, ...shape(o.radius, along(o.id, t)) }]));
    const bodies = [...at.values()].map(({ o, g, r, angle }) => {
      const position = add(o.center, rotate(scale(o.rel, r / o.radius), angle));
      return { id: o.id, position, yaw: o.start.yaw + o.needed * g - angle };
    });
    const contacts: FigureContact[] = holds.map((h) => {
      const held = state.hands.some((s) => sameHold(s, h));
      const { g, out } = at.get(h.a)!;
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
  if (params.longWaves) {
    for (const [a] of pairs)
      if (Math.abs(forward(body(turned, a).yaw).x) < 0.9)
        throw new Error('This allemande does not end facing across, in long waves.');
  }
  return {
    kind: 'allemande',
    motion,
    exit: withChanges(turned, { hands: stepsOut ? [] : [...holds, ...waveHolds] }),
  };
};
