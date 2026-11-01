/**
 * A trio's center turns the end on one side (three face three: "centers on
 * the right, right elbow turn (right hand partner)").
 *
 * Definition: in each line of three, the center dancer and the end on the
 * named side of the center (as the line faces) turn by the named hand, the
 * named amount (once by default). The other end stands.
 * Source: ContraDB rows "centers on the right, right elbow turn (right hand
 * partner)", "centers on the left, left elbow turn (left hand partner)"
 * (Peak Bagger).
 * Readings: an elbow turn is drawn as a hand turn (allemande) by that hand;
 * a whole turn ends back in the line, facing the way the line faces.
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { dot, rightOf, smooth, sub, turn } from '../../core/math.ts';
import { activeIds, body } from '../../core/state.ts';
import { allemande } from '../allemande.ts';
import { complete, contactReach, reachFade } from '../../core/contacts.ts';
import { onPairs } from './common.ts';

export interface TrioTurnParams {
  side: 'right' | 'left';
  hand: 'right' | 'left';
  amount?: number;
}

export const trioTurn: Figure<TrioTurnParams> = (state, params, beats) => {
  onlyKeys('trio-turn', params, ['side', 'hand', 'amount']);
  const side = oneOf('trio-turn', 'side', params.side, ['right', 'left'] as const);
  const hand = oneOf('trio-turn', 'hand', params.hand, ['right', 'left'] as const);
  const trios = new Map<number, number[]>();
  for (const id of activeIds(state)) {
    const c = state.dancers[id].couple;
    trios.set(c, [...(trios.get(c) ?? []), id]);
  }
  const pairs: [number, number][] = [];
  for (const ids of trios.values()) {
    if (ids.length !== 3) throw new Error('trio-turn needs lines of three.');
    const center = ids.find((id) => state.dancers[id].role === 'lark');
    if (center === undefined) throw new Error('trio-turn: no center in the trio.');
    const c = body(state, center);
    const sign = side === 'right' ? 1 : -1;
    const end = ids.find(
      (id) => id !== center && sign * dot(rightOf(c.yaw), sub(body(state, id).position, c.position)) > 0.5,
    );
    if (end === undefined) throw new Error(`trio-turn: no end on the center's ${side}.`);
    pairs.push([center, end]);
  }
  const amount = params.amount ?? 1;
  const turned = onPairs(allemande, state, pairs, { who: 'partner', hand, amount }, beats);
  if (!Number.isInteger(amount)) return turned;
  // A whole turn ends back in the line: face the way the line faces again.
  const settleBeats = Math.min(1.5, beats / 4);
  const motion = (beat: number) => {
    const frame = turned.motion(beat);
    const k = smooth((beat - (beats - settleBeats)) / settleBeats);
    if (k <= 0) return frame;
    const bodies = frame.bodies.map((b) => {
      const start = body(state, b.id).yaw;
      return { ...b, yaw: b.yaw + turn(start, b.yaw) * k };
    });
    // Facing the line again moves the shoulders: let a hand go as it leaves reach.
    const where = new Map(bodies.map((b) => [b.id, { position: b.position, yaw: b.yaw }]));
    const contacts = frame.contacts.map((c) =>
      where.has(c.a) && where.has(c.b) ? { ...c, strength: Math.min(c.strength, reachFade(contactReach(complete(c, where), where))) } : c,
    );
    return { ...frame, bodies, contacts };
  };
  return { ...turned, motion, exit: settle(turned.exit, motion, beats) };
};
