/**
 * Dolphin hey.
 *
 * Definition: a hey for three along the set in which the named couple
 * (usually the 1s) dances as one, one following close behind the other
 * like a pair of dolphins, weaving with the two dancers of the other couple.
 * All three "dancers" follow the same figure-eight track through the middle
 * of the minor set, a third of the track apart, so the pair and the two
 * others pass each other alternately by the right and left shoulder. A full
 * dolphin hey goes once around the figure eight and everyone ends where
 * they started; a half one ends half way round.
 * Source: ContraDB rows "dolphin hey - start with ones passing second
 * robins by right shoulders", "dolphin hey - larks one followed by robins
 * one starts by passing robins two by the left". The track and its pass
 * order are chosen so the first pass is the one the row names.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, dot, length, mix, rightOf, scale, smooth, sub, TAU, turn } from '../core/math.ts';
import { body, groupCenter, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface DolphinHeyParams {
  /** The couple that dances as one. */
  pair: '1s' | '2s';
  /** Whom the pair passes first, and by which shoulder. */
  first: 'larks' | 'robins';
  shoulder: 'right' | 'left';
  /** 1 for a full dolphin hey, 0.5 for half. */
  amount?: number;
  /** Who of the pair leads, when the row says. */
  lead?: 'larks' | 'robins';
}

/** Half length of the figure eight along the set, and its full width. */
const HALF_LENGTH = 1.4;
const WIDTH = 1.9;
/** How far behind the leader the follower walks, as a share of the track. */
const TANDEM = 0.1;
/** Beats spent walking onto the track at the start, and back to place at the end. */
const JOIN = 2;

export const dolphinHey: Figure<DolphinHeyParams> = (state, params, beats) => {
  onlyKeys('dolphin hey', params, ['pair', 'first', 'shoulder', 'amount', 'lead']);
  const pairName = oneOf('dolphin hey', 'pair', params.pair, ['1s', '2s'] as const);
  const first = oneOf('dolphin hey', 'first', params.first, ['larks', 'robins'] as const);
  const shoulder = oneOf('dolphin hey', 'shoulder', params.shoulder, ['right', 'left'] as const);
  const amount = params.amount ?? 1;
  if (amount !== 1 && amount !== 0.5) throw new Error('A dolphin hey goes half or all the way.');
  if (beats < 8) throw new Error('A dolphin hey needs at least eight beats.');
  const label = state.positions.get(pairName) ?? [];

  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    const pair = g.filter((id) => label.includes(id));
    const others = g.filter((id) => !label.includes(id));
    if (pair.length !== 2 || others.length !== 2)
      throw new Error(`A dolphin hey needs the ${pairName} and one other couple.`);
    const target = others.find(
      (id) => roleOf(state, id) === (first === 'larks' ? 'lark' : 'robin'),
    );
    if (target === undefined) throw new Error(`No ${first} to pass first.`);
    const pairAt = mix(body(state, pair[0]).position, body(state, pair[1]).position, 0.5);

    // Track: figure eight along the set (a lemniscate of Gerono), in one of
    // four orientations: which way round, and mirrored across the set.
    const track =
      (dir: number, mirror: number) =>
      (theta: number): Vec2 => ({
        x: middle.x + mirror * (WIDTH / 2) * Math.sin(theta) * Math.cos(theta),
        z: middle.z + HALF_LENGTH * Math.sin(dir * theta),
      });
    let best: { score: number; plan: ReturnType<typeof planFor> } | undefined;
    for (const dir of [1, -1])
      for (const mirror of [1, -1])
        for (const order of [0, 1]) {
          const plan = planFor(track(dir, mirror), order);
          if (!plan) continue;
          if (!best || plan.score < best.score) best = { score: plan.score, plan };
        }
    if (!best)
      throw new Error(
        `No dolphin hey here starts with the ${pairName} passing the ${first} by the ${shoulder}.`,
      );
    return best.plan!.moves;

    /**
     * Phases for the pair and the two others (a third apart) closest to
     * where they stand, if the pair's first pass is the asked-for one.
     */
    function planFor(at: (theta: number) => Vec2, order: number) {
      const slots = [
        pairAt,
        ...[target!, others.find((o) => o !== target)!].map((id) => body(state, id).position),
      ];
      // Pair at phase p; the others a third and two thirds on, in `order`.
      let bestPhase = 0;
      let bestCost = Infinity;
      for (let k = 0; k < 120; k++) {
        const p = (k / 120) * TAU;
        const phases = [p, p + (order ? 2 : 1) * (TAU / 3), p + (order ? 1 : 2) * (TAU / 3)];
        const cost = phases.reduce((n, ph, i) => n + length(sub(at(ph), slots[i])) ** 2, 0);
        if (cost < bestCost) [bestPhase, bestCost] = [p, cost];
      }
      const phase = [
        bestPhase,
        bestPhase + (order ? 2 : 1) * (TAU / 3),
        bestPhase + (order ? 1 : 2) * (TAU / 3),
      ];
      // The pair's first close pass, walking forward along the track.
      const sweep = amount * TAU;
      let firstWith = -1;
      let firstSide = 0;
      for (let s = 0.01; s < sweep; s += 0.01) {
        const me = at(phase[0] + s);
        for (const j of [1, 2]) {
          const other = at(phase[j] + s);
          if (length(sub(other, me)) < 0.9) {
            const ahead = sub(at(phase[0] + s + 0.01), me);
            const yaw = Math.atan2(ahead.x, ahead.z);
            firstWith = j;
            firstSide = dot(rightOf(yaw), sub(other, me));
            break;
          }
        }
        if (firstWith >= 0) break;
      }
      if (firstWith !== 1) return undefined;
      if ((shoulder === 'right') !== firstSide > 0) return undefined;
      // Leader: as named, else the one of the pair nearer the first pass.
      const leadRole =
        params.lead === 'larks' ? 'lark' : params.lead === 'robins' ? 'robin' : undefined;
      const toward = at(phase[0] + 0.3);
      const leader =
        pair.find((id) => roleOf(state, id) === leadRole) ??
        (length(sub(body(state, pair[0]).position, toward)) <=
        length(sub(body(state, pair[1]).position, toward))
          ? pair[0]
          : pair[1]);
      const follower = pair.find((id) => id !== leader)!;
      const dancers = [
        { id: leader, phase: phase[0] + (TANDEM / 2) * TAU },
        { id: follower, phase: phase[0] - (TANDEM / 2) * TAU },
        { id: target!, phase: phase[1] },
        { id: others.find((o) => o !== target)!, phase: phase[2] },
      ];
      const moves = dancers.map((d) => {
        const from = body(state, d.id);
        const travel = (beat: number) => {
          const u = Math.max(0, Math.min(1, (beat - JOIN) / (beats - 2 * JOIN)));
          return d.phase + sweep * u;
        };
        return { id: d.id, from, at, travel, home: amount === 1 };
      });
      return { score: bestCost, moves };
    }
  });

  const motion = (beat: number) => ({
    bodies: plans.map((m) => {
      const onTrack = m.at(m.travel(beat));
      const ahead = sub(m.at(m.travel(beat) + 0.02), onTrack);
      const walk = Math.atan2(ahead.x, ahead.z);
      const joining = smooth(beat / JOIN);
      const leaving = m.home ? smooth((beat - (beats - JOIN)) / JOIN) : 0;
      const weight = joining * (1 - leaving);
      const position = add(m.from.position, scale(sub(onTrack, m.from.position), weight));
      const yaw = m.from.yaw + turn(walk, m.from.yaw) * weight;
      return { id: m.id, position, yaw };
    }),
    contacts: [],
  });
  return { kind: 'hey', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
