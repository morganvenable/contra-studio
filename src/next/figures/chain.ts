/**
 * Chain (robins chain, larks chain).
 *
 * Definition: the two named dancers (robins in a robins chain) give right
 * hands to each other in the middle and pull by, crossing the set; each is
 * then courtesy turned by the dancer of the other role waiting on that side
 * and ends beside that dancer, facing back in. "Chain to your neighbor"
 * names who does the courtesy turn; here it is checked, not chosen: the turner
 * is whoever stands on the far side.
 * Source: Caller's Box glossary, "Chain" and "Courtesy turn"; ContraDB rows
 * "ladles chain", "ladles chain to neighbor", "gentlespoons chain". The
 * turner ends on the left, as in every courtesy turn. The chainer curves
 * left into the courtesy turn, which wheels three quarters around.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  courtesyAt,
  courtesyContacts,
  courtesyPair,
  courtesyStart,
  walk,
} from '../core/courtesy.ts';
import { clamp, forward, scale, smooth, sub } from '../core/math.ts';
import { mirrored } from '../core/mirror.ts';
import { roleOfGroup } from '../core/roles.ts';
import { body, groupCenter, minorSets, related, roleOf, withChanges } from '../core/state.ts';

export interface ChainParams {
  who: 'robins' | 'larks';
  /**
   * The hand the chainers pull by: right unless the source says a left-hand
   * chain, which is the mirror image (pull by left, courtesy turn by the
   * right hand, the turner on the right wheeling clockwise).
   */
  hand?: 'right' | 'left';
  /** Who courtesy turns the chainers, as the source names it (checked). */
  to?: 'partner' | 'neighbor';
}

/** Share of the figure spent crossing; the courtesy turn takes the rest. */
const CROSS = 0.5;
/**
 * The turner steps over to the courtesy-turn place in the middle of the
 * crossing: after the dancer leaving that side has gone, before the chainer
 * arrives.
 */
/** Half the gap between chainers as they pass in the middle. */
const PASS_HALF = 0.4;
/** The chainer's last stretch runs straight along the line into the wheel. */
const LEAD = 0.6;
/** The courtesy turn wheels three quarters, continuing the chainer's left curve. */
const SWEEP = 1.5 * Math.PI;
const TURNER_FROM = 0.2;
const TURNER_TO = 0.75;

export const chain: Figure<ChainParams> = (state, params, beats) => {
  onlyKeys('chain', params, ['who', 'to', 'hand']);
  const { hand, ...rest } = params;
  if (hand === undefined || hand === 'right') return rightHandChain(state, rest, beats);
  oneOf('chain', 'hand', hand, ['right', 'left'] as const);
  return mirrored(rightHandChain)(state, rest, beats);
};

const rightHandChain: Figure<Omit<ChainParams, 'hand'>> = (state, params, beats) => {
  const who = oneOf('chain', 'who', params.who, ['robins', 'larks'] as const);
  if (params.to !== undefined) oneOf('chain', 'to', params.to, ['partner', 'neighbor'] as const);
  const role = roleOfGroup(who)!;

  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    const side = (id: number) => Math.sign(body(state, id).position.x - middle.x);
    const chainers = g.filter((id) => roleOf(state, id) === role);
    const turners = g.filter((id) => roleOf(state, id) !== role);
    if (chainers.length !== 2 || turners.length !== 2)
      throw new Error(`A ${who} chain needs two ${who} and two others.`);
    if (side(chainers[0]) === side(chainers[1]) || side(turners[0]) === side(turners[1]))
      throw new Error(`The ${who} must start on opposite sides of the set.`);
    return chainers.map((c) => {
      const other = chainers.find((x) => x !== c)!;
      const turner = turners.find((t) => side(t) !== side(c))!;
      if (params.to && related(state, params.to, turner) !== c)
        throw new Error(`The ${who} would chain to someone who is not their ${params.to}.`);
      const yaw = side(turner) > 0 ? -Math.PI / 2 : Math.PI / 2;
      const pair = courtesyPair(
        turner,
        c,
        [body(state, turner).position, body(state, other).position],
        yaw,
        SWEEP,
      );
      const start = courtesyStart(pair);
      // The chainer arrives walking along the side line into the wheel, and
      // crosses the middle short of that, so the two chainers pass right
      // shoulders.
      const arrive = forward(start.follower.yaw);
      const pass = { x: middle.x, z: middle.z - arrive.z * PASS_HALF };
      const lead = sub(start.follower.position, scale(arrive, LEAD));
      return {
        pair,
        other,
        chainer: walk(body(state, c), start.follower.position, start.follower.yaw, [pass, lead]),
        turner: walk(body(state, turner), start.turner.position, start.turner.yaw, 0, true),
      };
    });
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = plans.flatMap((p) => {
      if (t >= CROSS) return courtesyAt(p.pair, (t - CROSS) / (1 - CROSS));
      const s = t / CROSS;
      return [
        { id: p.pair.turner, ...p.turner(clamp((s - TURNER_FROM) / (TURNER_TO - TURNER_FROM))) },
        { id: p.pair.follower, ...p.chainer(s) },
      ];
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = plans.flatMap((p) => {
      if (t >= CROSS) return courtesyContacts(p.pair, (t - CROSS) / (1 - CROSS));
      if (p.pair.follower > p.other) return [];
      const s = t / CROSS;
      const strength = smooth((s - 0.2) / 0.15) * smooth((0.85 - s) / 0.15);
      return [
        {
          a: p.pair.follower,
          handA: 'right' as const,
          b: p.other,
          handB: 'right' as const,
          kind: 'joined' as const,
          strength,
        },
      ];
    });
    return { bodies, contacts: contacts.map((c) => withinReach(c, map)) };
  };
  return {
    kind: who === 'robins' ? 'robins-chain' : 'larks-chain',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
