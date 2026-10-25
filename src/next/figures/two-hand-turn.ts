/**
 * Two-hand turn.
 *
 * Definition: two dancers face each other, join both hands (right to left,
 * left to right) and walk around their shared center, clockwise seen from
 * above unless the source says otherwise, for the named amount (½, once,
 * 1½, twice). They face each other the whole way. A whole or half turn ends
 * back on the pair's own line and the pair lets go, stepping back out to the
 * distance it started at.
 * Source: Caller's Box glossary, "Two-hand turn"; ContraDB rows "partners
 * two-hand turn", "neighbor two hand turn", "partners two hand turn 1½".
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined, sameHold } from '../core/contacts.ts';
import {
  add,
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
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import { body, minorSets, pairsIn, withChanges, type Hold } from '../core/state.ts';

export interface TwoHandTurnParams {
  who: PairName;
  /** Turns: 0.5, 1, 1.5, 2 ... */
  amount: number;
  /** Seen from above; clockwise is the usual way. */
  direction?: 'clockwise' | 'counterclockwise';
}

/** Distance from each dancer to the pair's center while turning. */
const HOLD_RADIUS = 0.42;

export const twoHandTurn: Figure<TwoHandTurnParams> = (state, params, beats) => {
  onlyKeys('two-hand turn', params, ['who', 'amount', 'direction']);
  const who = oneOf('two-hand turn', 'who', params.who, PAIR_NAMES);
  const direction = oneOf('two-hand turn', 'direction', params.direction ?? 'clockwise', [
    'clockwise',
    'counterclockwise',
  ] as const);
  const amount = params.amount;
  if (!(Number.isFinite(amount) && amount > 0 && amount <= 4))
    throw new Error('A two-hand turn goes between 0 and 4 times around.');
  // Clockwise from above is a positive rotation (core/math.ts).
  const sweep = (direction === 'clockwise' ? 1 : -1) * amount * TAU;
  const stepsOut = Number.isInteger(amount * 2);
  const gather = Math.min(0.35, 1.5 / beats);

  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const holds: Hold[] = pairs.flatMap(([a, b]) => [
    { a, handA: 'right', b, handB: 'left' },
    { a, handA: 'left', b, handB: 'right' },
  ]);
  const plans = pairs.flatMap(([a, b]) => {
    const pa = body(state, a);
    const pb = body(state, b);
    const span = length(sub(pa.position, pb.position));
    if (span < 0.5 || span > 2.7)
      throw new Error(`Dancers ${a} and ${b} are too far apart to turn by two hands.`);
    const center = mean([pa.position, pb.position]);
    return [
      { id: a, start: pa, other: pb, center },
      { id: b, start: pb, other: pa, center },
    ].map((p) => {
      const rel = sub(p.start.position, p.center);
      const face = heading(p.start.position, p.other.position);
      return { ...p, rel, radius: length(rel), face };
    });
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const g = smooth(t / gather);
    const out = stepsOut ? smooth((t - (1 - gather)) / gather) : 0;
    const angle = sweep * progress(t);
    const bodies = plans.map((p) => {
      const r = p.radius + (HOLD_RADIUS - p.radius) * g * (1 - out);
      const position = add(p.center, rotate(scale(p.rel, r / p.radius), angle));
      // Facing the center (the other dancer) the whole way round.
      const facing = p.start.yaw + turn(p.face, p.start.yaw) * smooth(t / gather);
      return { id: p.id, position, yaw: facing - angle * smooth(t / gather) };
    });
    const contacts: FigureContact[] = holds.map((h) => {
      const held = state.hands.some((s) => sameHold(s, h));
      return joined(h, (held ? 1 : smooth((g - 0.5) / 0.5)) * (1 - smooth(out / 0.5)));
    });
    return { bodies, contacts };
  };
  return {
    kind: 'allemande',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: stepsOut ? [] : holds }),
  };
};
