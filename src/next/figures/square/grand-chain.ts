/**
 * Grand chain in a square ("all four ladles grand chain", "four ladies chain
 * across").
 *
 * Definition: the four robins (or larks) give right hands in a star in the
 * middle and turn it halfway, to the opposite couple's place, where the
 * dancer waiting there turns them in beside him with a courtesy turn: they
 * end facing in, the robin on the lark's right. The others stay home.
 * Source: Caller's Box glossary, "Chain" and "Grand chain" (all four
 * ladies chain across); Lloyd Shaw, "Cowboy Dances" (four ladies chain);
 * ContraDB 3323 ("all four ladles grand chain").
 * Reading: the chain crosses straight to the opposite place (half a turn
 * of the star) unless `amount` says otherwise (¾ chains to the right-hand
 * couple); the courtesy turn is drawn as the dancer swinging round into the
 * place beside the one who receives them, left hands joined.
 */
import type { FigureContact, FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { withinReach } from '../../core/contacts.ts';
import { RING_CENTER } from '../../core/formation-ring.ts';
import {
  add,
  distance,
  heading,
  length,
  polar,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, minorSets, withChanges, type DanceState } from '../../core/state.ts';

export interface GrandChainParams {
  /** Who chains: the robins (default) or the larks. */
  who?: 'robins' | 'larks';
  /** Share of a turn the star goes: ½ to the opposite couple (default), ¾ or ¼. */
  amount?: number;
}

/** Radius of the star in the middle. */
const STAR = 0.75;
/** The courtesy turn's held hands, as a share of the figure at the end. */
const RECEIVE = 0.3;

export function grandChain(
  state: DanceState,
  params: GrandChainParams,
  beats: number,
): FigureResult {
  onlyKeys('grand chain', params, ['who', 'amount']);
  const who = oneOf('grand chain', 'who', params.who ?? 'robins', ['robins', 'larks'] as const);
  const amount = params.amount ?? 0.5;
  if (![0.25, 0.5, 0.75].includes(amount)) throw new Error('A grand chain goes ¼, ½ or ¾ round.');
  if (beats < 4) throw new Error('A grand chain needs at least four beats.');
  const role = who === 'robins' ? 'robin' : 'lark';
  const ids = minorSets(state).flat();
  const chainers = ids.filter((id) => state.dancers[id].role === role);
  const others = state.dancers.filter((d) => d.role !== role).map((d) => d.id);
  if (chainers.length !== 4) throw new Error('A grand chain needs four dancers of one role.');
  // A right-hand star turns clockwise from above: a positive rotation (core/math.ts).
  const sweep = amount * TAU;
  const plans = chainers.map((id) => {
    const s = body(state, id);
    const rel = sub(s.position, RING_CENTER);
    const r0 = length(rel);
    if (r0 < 1.2) throw new Error('A grand chain starts from places round the square.');
    const target = add(RING_CENTER, rotate(rel, sweep));
    // Whoever stands beside the place they come to receives them.
    const host = others.reduce((a, b) =>
      distance(body(state, a).position, target) <= distance(body(state, b).position, target)
        ? a
        : b,
    );
    if (distance(body(state, host).position, target) > 2.2)
      throw new Error('Nobody waits to receive the grand chain.');
    const yawEnd = heading(target, RING_CENTER);
    return { id, s, rel, r0, host, yawEnd };
  });
  const occupied = new Set(plans.map((p) => p.host));
  if (occupied.size !== 4) throw new Error('Each dancer chained to must receive one.');
  const motion = (beat: number) => {
    const t = beat / beats;
    const a = sweep * progress(t);
    const dip = Math.sin(Math.PI * smooth(t));
    const bodies = plans.map((p) => {
      const r = p.r0 + (STAR - p.r0) * dip;
      const position = add(RING_CENTER, scale(rotate(p.rel, a), r / p.r0));
      // Turn left to face along the star (right hand in), then round to face in at the end.
      const travel = heading(p.s.position, RING_CENTER) + Math.PI / 2 - a;
      const into = smooth(t / 0.15);
      const out = smooth((t - 0.7) / 0.3);
      const start = p.s.yaw + turn(travel, p.s.yaw) * into;
      const yaw = start + turn(p.yawEnd, start) * out;
      return { id: p.id, position, yaw };
    });
    const map = new Map(state.bodies);
    for (const b of bodies) map.set(b.id, { position: b.position, yaw: b.yaw });
    const hold = smooth((t - (1 - RECEIVE)) / 0.1);
    const contacts: FigureContact[] = plans.map((p) =>
      withinReach(
        { a: p.id, handA: 'left', b: p.host, handB: 'left', kind: 'joined', strength: hold },
        map,
      ),
    );
    return { bodies, contacts };
  };
  return {
    kind: who === 'larks' ? 'larks-chain' : 'robins-chain',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}
