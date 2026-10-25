/**
 * Two-hand turn: two dancers face, take both hands and turn once round
 * clockwise (seen from above), back to their places.
 *
 * Definition: the pair face each other, join both hands, and walk round
 * each other clockwise the named amount (once by default), keeping facing,
 * then let go and step back to the distance they started at.
 * Source: Playford/ECD manuals ("two-hand turn", "turn partner both
 * hands"); ContraDB rows "partners two hand turn", "partners two-hand turn
 * once", "partners swing two hand".
 * Readings: a two-hand turn goes clockwise; "swing two hand" (an ECD
 * two-hand swing) is drawn as a two-hand turn once round.
 */
import type { Figure } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { add, heading, length, mean, progress, rotate, scale, smooth, sub, TAU } from '../../core/math.ts';
import { body, minorSets, pairsIn, withChanges, type Hold } from '../../core/state.ts';

export interface TwoHandTurnParams {
  who: string;
  amount?: number;
}

/** Each dancer's distance from the pair's middle while turning. */
const TURN_RADIUS = 0.36;

export const twoHandTurn: Figure<TwoHandTurnParams> = (state, params, beats) => {
  onlyKeys('two-hand-turn', params, ['who', 'amount']);
  if (typeof params.who !== 'string') throw new Error('two-hand-turn needs who turns.');
  const amount = params.amount ?? 1;
  if (!(amount > 0 && amount <= 3)) throw new Error('two-hand-turn amount must be 0-3 turns.');
  if (state.hands.length) throw new Error('A two-hand turn starts with free hands.');
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, params.who));
  const gather = Math.min(0.3, 1.5 / beats);
  const orbits = pairs.flatMap(([a, b]) => {
    const pa = body(state, a).position;
    const pb = body(state, b).position;
    const center = mean([pa, pb]);
    const span = length(sub(pa, pb));
    if (span < 0.5 || span > 2.7) throw new Error(`Dancers ${a} and ${b} are too far apart to turn.`);
    return [a, b].map((id) => ({ id, center, rel: sub(body(state, id).position, center), r0: span / 2 }));
  });
  const holds: Hold[] = pairs.flatMap(([a, b]) => [
    { a, handA: 'right', b, handB: 'left' },
    { a, handA: 'left', b, handB: 'right' },
  ]);
  const sweep = amount * TAU;
  const motion = (beat: number) => {
    const t = beat / beats;
    const close = Math.min(smooth(t / gather), smooth((1 - t) / gather));
    const angle = sweep * progress(t);
    const bodies = orbits.map((o) => {
      const r = o.r0 + (TURN_RADIUS - o.r0) * close;
      const position = add(o.center, rotate(scale(o.rel, r / o.r0), angle));
      // Facing the partner throughout.
      const yaw = body(state, o.id).yaw - angle;
      return { id: o.id, position, yaw };
    });
    const map = bodyMap(bodies);
    const strength = smooth((close - 0.6) / 0.3);
    return { bodies, contacts: holds.map((h) => withinReach(joined(h, strength), map)) };
  };
  void heading;
  return { kind: 'allemande', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
