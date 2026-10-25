/**
 * Pairs in lines of four: roll away with a half sashay, or balance, with
 * the dancer beside you ("two ladles roll away with a half sashay", "same
 * roles balance", "center two roll away", "everybody roll away (corners)").
 *
 * Definition: everyone stands in lines of four facing the same way (lines
 * at the sides of a square). The pairs named are two dancers side by side
 * in a line: the two of one role standing together, the middle two, or
 * both end pairs. In a roll away the one rolled crosses in front of the
 * other, spinning once toward the way they travel, while the other slides
 * behind: they trade places. In a balance the two take inside hands and
 * step toward each other and back.
 * Source: Caller's Box glossary, "Roll away with a half sashay" and
 * "Balance"; ContraDB 558/559 (Wade Pearson's roll away teaching square),
 * 1335, 3263, 3264.
 * Readings: in a lark-robin pair the lark rolls the robin (she spins); in a
 * pair of one role the one on the right is rolled across to the left
 * ("roll right to left") unless the call names the left one. A trade is a
 * trade, so who spins never changes where anyone ends.
 */
import type { Vec2 } from '../../../types.ts';
import type { FigureContact, FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { SET } from '../../core/config.ts';
import {
  add,
  distance,
  dot,
  ease,
  forward,
  leftOf,
  mix,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';

export interface LinePairsParams {
  action: 'roll' | 'balance';
  /** Which pairs in each line. */
  pairs: 'same-roles' | 'larks' | 'robins' | 'center' | 'ends';
  /** In a pair of one role, who is rolled across: the right one (default) or the left. */
  rolled?: 'right' | 'left';
}

const FRONT = 0.35;
const BEHIND = 0.2;
const STEP_IN = 0.2;

/** Lines of four: dancers facing the same way, side by side, ordered left to right. */
export function linesOfFour(state: DanceState, ids: readonly number[]): number[][] {
  const lines: number[][] = [];
  for (const id of ids) {
    const b = body(state, id);
    const line = lines.find((l) => {
      const o = body(state, l[0]);
      return (
        Math.abs(turn(o.yaw, b.yaw)) < 0.35 &&
        Math.abs(dot(sub(b.position, o.position), forward(o.yaw))) < 0.4
      );
    });
    if (line) line.push(id);
    else lines.push([id]);
  }
  for (const line of lines) {
    if (line.length !== 4) throw new Error('Everyone must stand in lines of four.');
    const yaw = body(state, line[0]).yaw;
    line.sort(
      (a, b) =>
        dot(body(state, a).position, rightOf(yaw)) - dot(body(state, b).position, rightOf(yaw)),
    );
    for (let i = 1; i < 4; i++) {
      const gap = distance(body(state, line[i - 1]).position, body(state, line[i]).position);
      if (Math.abs(gap - SET.slot) > 0.35) throw new Error('A line of four stands a place apart.');
    }
  }
  return lines;
}

export function linePairs(state: DanceState, params: LinePairsParams, beats: number): FigureResult {
  onlyKeys('lines of four', params, ['action', 'pairs', 'rolled']);
  const action = oneOf('lines of four', 'action', params.action, ['roll', 'balance'] as const);
  const which = oneOf('lines of four', 'pairs', params.pairs, [
    'same-roles',
    'larks',
    'robins',
    'center',
    'ends',
  ] as const);
  const rolledSide = oneOf('lines of four', 'rolled', params.rolled ?? 'right', ['right', 'left'] as const);
  const role = (id: number) => state.dancers[id].role;
  const pairs: [number, number][] = [];
  for (const line of linesOfFour(state, minorSets(state).flat())) {
    const candidates: [number, number][] =
      which === 'center' ? [[line[1], line[2]]] : [[line[0], line[1]], [line[2], line[3]]];
    for (const [a, b] of candidates) {
      const same = role(a) === role(b);
      if (which === 'same-roles' && !same) continue;
      if ((which === 'larks' || which === 'robins') && !(same && role(a) === which.slice(0, -1)))
        continue;
      pairs.push([a, b]);
    }
  }
  if (!pairs.length) throw new Error('No pairs in the lines dance this.');
  const moves = pairs.flatMap(([left, right]) => {
    const a = body(state, left);
    const b = body(state, right);
    const yaw = a.yaw;
    const ahead = forward(yaw);
    if (action === 'balance') {
      const mid = mix(a.position, b.position, 0.5);
      return [left, right].map((id) => {
        const s = body(state, id);
        const toward = sub(mid, s.position);
        const k = STEP_IN / distance(mid, s.position);
        return { id, from: s, to: s.position, bulge: scale(toward, k), spin: 0, balance: true };
      });
    }
    // Who is rolled: the robin of a mixed pair, else the side named.
    const rolled =
      role(left) !== role(right)
        ? role(left) === 'robin'
          ? left
          : right
        : rolledSide === 'right'
          ? right
          : left;
    const roller = rolled === left ? right : left;
    const r = body(state, rolled);
    const o = body(state, roller);
    // The rolled dancer spins toward the way she travels.
    const toward = Math.sign(dot(sub(o.position, r.position), leftOf(yaw)));
    return [
      { id: rolled, from: r, to: o.position, bulge: scale(ahead, FRONT), spin: toward * TAU, balance: false },
      { id: roller, from: o, to: r.position, bulge: scale(ahead, -BEHIND), spin: 0, balance: false },
    ];
  });
  const holds = action === 'balance'
    ? pairs.map(([l, r]) => ({ a: l, handA: 'right' as const, b: r, handB: 'left' as const }))
    : [];
  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = moves.map((m) => {
      if (m.balance) {
        const out = Math.sin(Math.PI * smooth(t));
        return { id: m.id, position: add(m.from.position, scale(m.bulge, out)), yaw: m.from.yaw };
      }
      const q = progress(t);
      const position: Vec2 = add(mix(m.from.position, m.to, q), scale(m.bulge, Math.sin(Math.PI * q)));
      return { id: m.id, position, yaw: m.from.yaw + m.spin * ease(t) };
    });
    const map = bodyMap(bodies);
    const strength = Math.min(smooth(t / 0.15), smooth((1 - t) / 0.15));
    const contacts: FigureContact[] = holds.map((h) => withinReach(joined(h, strength), map));
    return { bodies, contacts };
  };
  return {
    kind: action === 'roll' ? 'rollaway' : 'balance',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}
