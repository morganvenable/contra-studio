/**
 * Balance.
 *
 * Definition: step toward someone and back, in four beats. Three shapes:
 * - wave: holding hands in a wave, step to one side and back, then to the
 *   other side and back ("right-left"), or step forward and back. Before a
 *   Rory O'More the side balance starts toward the slide direction.
 * - ring: the group joins hands in a ring and steps in toward the center and
 *   back out ("balance the ring").
 * - current: a plain "balance" balances what the dancers hold now: their
 *   wave if they hold one, otherwise their ring.
 * - pair: two dancers (partners, neighbors, ...) face each other and step in
 *   toward each other and back ("neighbors balance", "right hand balance"),
 *   ending where they started. Hands join while they are close enough.
 * - long-waves: everyone on the side lines takes hands along their line,
 *   the named role facing in across the set and the others facing out
 *   (turning to face that way over the first two beats), and balances
 *   right and left. Hands stay joined along the side lines.
 * Source: Caller's Box glossary, "Balance"; ContraDB rows "balance & Rory
 * O'More right" (2321), "balance the ring", "neighbors balance & swing",
 * "neighbors right hand balance & box the gnat", "form long waves -
 * gentlespoons face in, ladles face out" with "balance & box circulate".
 * Wave step size and timing
 * ported from src/rory-slide.ts (0.1 m steps, one per beat).
 */
import type { Hand } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import { assertWaveHeld, findWave } from '../core/lines.ts';
import {
  add,
  ease,
  forward,
  heading,
  length,
  mix,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { findRing, ringHolds } from '../core/ring.ts';
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import { roleOfGroup } from '../core/roles.ts';
import {
  body,
  groupCenter,
  handToward,
  minorSets,
  pairsIn,
  roleOf,
  withChanges,
  type Hold,
} from '../core/state.ts';

export interface BalanceParams {
  /** 'current': a wave if the group holds one, otherwise its ring. */
  formation: 'wave' | 'ring' | 'pair' | 'current' | 'long-waves';
  /** Long waves: the role that faces in across the set. */
  in?: 'larks' | 'robins';
  style?: 'right-left' | 'forward-back';
  /** Side to step toward first, for a right-left wave balance. */
  first?: 'right' | 'left';
  /** Pair balance: who faces whom. */
  who?: PairName;
  /** Pair balance: which hands join. */
  hand?: 'right' | 'left' | 'both' | 'none';
}

const STEP = 0.1;
/** Offsets at each beat boundary: out, back, out the other way, back. */
const STEPS = [0, 1, 0, -1, 0];
/** How far a ring steps in toward its center. */
const RING_DEPTH = 0.45;
/** Pair balance: distance apart at the deepest step. */
const PAIR_IN = 0.75;
/** Beats to turn and face into the balance. */
const FACE_BEATS = 1.5;

export const balance: Figure<BalanceParams> = (state, params, beats) => {
  onlyKeys('balance', params, ['formation', 'style', 'first', 'who', 'hand', 'in']);
  const formation = oneOf('balance', 'formation', params.formation, [
    'wave',
    'ring',
    'pair',
    'current',
    'long-waves',
  ] as const);
  if (params.in !== undefined && formation !== 'long-waves')
    throw new Error('Only long waves name who faces in.');
  if (beats !== 4) throw new Error('A balance takes four beats.');
  if (formation === 'current') {
    const waved = minorSets(state).every((g) => {
      try {
        assertWaveHeld(state, findWave(state, g));
        return true;
      } catch {
        return false;
      }
    });
    const style = waved ? { style: 'right-left' as const } : {};
    return balance(state, { formation: waved ? 'wave' : 'ring', ...style }, beats);
  }
  if (formation === 'wave') return waveBalance(state, params, beats);
  if (formation === 'ring') return ringBalance(state, params, beats);
  if (formation === 'long-waves') return longWaveBalance(state, params, beats);
  return pairBalance(state, params, beats);
};

const waveBalance: Figure<BalanceParams> = (state, params, beats) => {
  if (params.who || params.hand) throw new Error('A wave balance takes no partner or hand.');
  const style = oneOf('balance', 'style', params.style ?? 'right-left', [
    'right-left',
    'forward-back',
  ] as const);
  const first = oneOf('balance', 'first', params.first ?? 'right', ['right', 'left'] as const);
  const groups = minorSets(state);
  for (const g of groups) assertWaveHeld(state, findWave(state, g));

  const ids = groups.flat();
  const motion = (beat: number) => {
    const i = Math.min(3, Math.floor(beat));
    const u = beat - i;
    const q = STEPS[i] + (STEPS[i + 1] - STEPS[i]) * ease(u);
    return {
      bodies: ids.map((id) => {
        const b = body(state, id);
        const dir = style === 'forward-back' ? forward(b.yaw) : rightOf(b.yaw);
        const sign = style === 'right-left' && first === 'left' ? -1 : 1;
        return {
          id,
          position: add(b.position, scale(dir, STEP * q * sign)),
          yaw: b.yaw,
          lean: style === 'forward-back' ? 0.07 * q : 0,
        };
      }),
      contacts: state.hands.map((h) => joined(h, 1)),
    };
  };
  return { kind: 'wave-balance', motion, exit: settle(state, motion, beats) };
};

/** Beats to turn to face in or out when forming long waves. */
const FORM_BEATS = 2;
/** Neighbors along a side line farther apart than this do not join hands. */
const LINE_REACH = 2.2;

const longWaveBalance: Figure<BalanceParams> = (state, params, beats) => {
  if (params.who || params.hand || params.style)
    throw new Error('A long-wave balance takes no partner, hand or style.');
  const inRole = roleOfGroup(oneOf('balance', 'in', params.in, ['larks', 'robins'] as const))!;
  const first = oneOf('balance', 'first', params.first ?? 'right', ['right', 'left'] as const);
  const sign = first === 'left' ? -1 : 1;
  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    return g.map((id) => {
      const s = body(state, id);
      const off = s.position.x - middle.x;
      if (Math.abs(off) < 0.5) throw new Error(`Dancer ${id} is not standing in a side line.`);
      const facingIn = off > 0 ? -Math.PI / 2 : Math.PI / 2;
      const yaw = roleOf(state, id) === inRole ? facingIn : facingIn + Math.PI;
      return { id, s, yaw, side: Math.sign(off) };
    });
  });
  // Hands along each side line, between neighbors in line (across minor sets too).
  const holds: Hold[] = [];
  for (const side of [-1, 1]) {
    const line = plans
      .filter((p) => p.side === side)
      .sort((a, b) => a.s.position.z - b.s.position.z);
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]];
      if (Math.abs(b.s.position.z - a.s.position.z) > LINE_REACH) continue;
      const fa = { position: a.s.position, yaw: a.yaw };
      const fb = { position: b.s.position, yaw: b.yaw };
      holds.push({
        a: a.id,
        handA: handToward(fa, fb.position),
        b: b.id,
        handB: handToward(fb, fa.position),
      });
    }
  }
  const motion = (beat: number) => {
    const i = Math.min(3, Math.floor(beat));
    const q = STEPS[i] + (STEPS[i + 1] - STEPS[i]) * ease(beat - i);
    const bodies = plans.map((p) => {
      const yaw = p.s.yaw + turn(p.yaw, p.s.yaw) * smooth(beat / FORM_BEATS);
      return { id: p.id, position: add(p.s.position, scale(rightOf(yaw), STEP * q * sign)), yaw };
    });
    const map = bodyMap(bodies);
    const strength = smooth((beat - 0.5) / 1);
    return { bodies, contacts: holds.map((h) => withinReach(joined(h, strength), map)) };
  };
  // Keep the hands that still reach at the end (side-line places can be wide).
  const end = motion(beats).contacts;
  const kept = holds.filter((_, i) => end[i].strength > 0.5);
  return {
    kind: 'wave-balance',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: kept }),
  };
};

/** 0 -> 1 -> 0: in over the first two beats, out over the last two. */
const inAndOut = (beat: number) =>
  beat < 2 ? smooth(beat / 1.5) : 1 - smooth((beat - 2.25) / 1.5);

const ringBalance: Figure<BalanceParams> = (state, params, beats) => {
  if (params.who || params.hand || params.style || params.first)
    throw new Error('A ring balance takes no partner, hand or side.');
  const rings = minorSets(state).map((g) => {
    const ring = findRing(state, g, 'ring balance');
    return { ...ring, holds: ringHolds(ring) };
  });
  const motion = (beat: number) => {
    const deep = inAndOut(beat);
    const face = smooth(beat / FACE_BEATS);
    const bodies = rings.flatMap((r) =>
      r.order.map((id) => {
        const s = body(state, id);
        const rel = sub(s.position, r.center);
        const inward = scale(rel, (-RING_DEPTH * deep) / length(rel));
        return {
          id,
          position: add(s.position, inward),
          yaw: s.yaw + turn(heading(s.position, r.center), s.yaw) * face,
          lean: 0.06 * deep,
        };
      }),
    );
    const map = bodyMap(bodies);
    const contacts = rings.flatMap((r) =>
      r.holds.map((h) => withinReach(joined(h, smooth(deep / 0.5)), map)),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'ring-balance',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

const pairBalance: Figure<BalanceParams> = (state, params, beats) => {
  if (params.style || params.first) throw new Error('A pair balance steps in and out.');
  const who = oneOf('balance', 'who', params.who, PAIR_NAMES);
  const hand = oneOf('balance', 'hand', params.hand ?? 'both', [
    'right',
    'left',
    'both',
    'none',
  ] as const);
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const plans = pairs.map(([a, b]) => {
    const pa = body(state, a);
    const pb = body(state, b);
    const center = mix(pa.position, pb.position, 0.5);
    const span = length(sub(pa.position, pb.position));
    if (span < 0.6 || span > 2.7)
      throw new Error(`Dancers ${a} and ${b} are too far apart to balance.`);
    const holds: Hold[] = hands(hand).map(([ha, hb]) => ({ a, handA: ha, b, handB: hb }));
    const at = (id: number, beat: number) => {
      const me = id === a ? pa : pb;
      const other = id === a ? pb : pa;
      const out = sub(me.position, center);
      const unit = scale(out, 1 / length(out));
      const deep = inAndOut(beat);
      const r = span / 2 + (Math.min(PAIR_IN, span) / 2 - span / 2) * deep;
      const face = heading(me.position, other.position);
      return {
        id,
        position: add(center, scale(unit, r)),
        yaw: me.yaw + turn(face, me.yaw) * smooth(beat / FACE_BEATS),
        lean: 0.06 * deep,
      };
    };
    return { ids: [a, b], at, holds };
  });
  const motion = (beat: number) => {
    const bodies = plans.flatMap((p) => p.ids.map((id) => p.at(id, beat)));
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = plans.flatMap((p) =>
      p.holds.map((h) => withinReach(joined(h, 1), map)),
    );
    return { bodies, contacts };
  };
  const exit = settle(state, motion, beats);
  const held = plans.flatMap((p) => p.holds);
  const reachable = motion(beats).contacts.every((c) => c.strength > 0.5);
  return { kind: 'balance', motion, exit: withChanges(exit, { hands: reachable ? held : [] }) };
};

/** Hand pairs (first dancer's hand, second dancer's hand) for a facing pair. */
function hands(hand: 'right' | 'left' | 'both' | 'none'): [Hand, Hand][] {
  if (hand === 'none') return [];
  if (hand === 'both') {
    return [
      ['right', 'left'],
      ['left', 'right'],
    ];
  }
  return [[hand, hand]];
}
