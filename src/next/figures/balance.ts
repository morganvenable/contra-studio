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
 *   wave if they hold one, otherwise their ring; and when they stand in no
 *   ring but hold hands in some other line (a long wave, a line across
 *   minor sets), everyone holding hands balances right and left in place.
 * - pair: two dancers (partners, neighbors, ...) face each other and step in
 *   toward each other and back ("neighbors balance", "right hand balance"),
 *   ending where they started. Hands join while they are close enough.
 * - solo ("balance yourself"): everyone balances right and left alone, in
 *   place, holding no one.
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
import type { Hand, Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, joined, sameHold, withinReach } from '../core/contacts.ts';
import { withGather } from '../core/wave-gather.ts';
import { assertWaveHeld, findWave, lineHolds } from '../core/lines.ts';
import {
  add,
  dot,
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
  activeIds,
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
  formation: 'wave' | 'ring' | 'pair' | 'current' | 'long-waves' | 'solo';
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

/**
 * A balance is four beats. A row that gives it two or three beats balances
 * quickly; five or six beats balance in four and stand the rest; seven or
 * eight beats balance twice.
 */
export const balance: Figure<BalanceParams> = (state, params, beats) => {
  if (beats === 4) return fourBeatBalance(state, params, 4);
  if (!(beats >= 2 && beats <= 8)) throw new Error('A balance takes four beats (two to eight).');
  const first = fourBeatBalance(state, params, 4);
  if (beats < 4) return { ...first, motion: (beat: number) => first.motion((beat * 4) / beats) };
  if (beats <= 6)
    return { ...first, motion: (beat: number) => first.motion(Math.min(4, beat)) };
  const second = fourBeatBalance(first.exit, params, 4);
  const k = 8 / beats;
  return {
    ...second,
    motion: (beat: number) =>
      beat * k < 4 ? first.motion(beat * k) : second.motion(Math.min(4, beat * k - 4)),
  };
};

const fourBeatBalance: Figure<BalanceParams> = (state, params, beats) => {
  onlyKeys('balance', params, ['formation', 'style', 'first', 'who', 'hand', 'in']);
  const formation = oneOf('balance', 'formation', params.formation, [
    'wave',
    'ring',
    'pair',
    'current',
    'long-waves',
    'solo',
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
    if (!waved && !state.hands.length && linesFacing(state)) return linesBalance(state, beats);
    // Long waves on the side lines ("balance long waves" after a star or a
    // box circulate): the waves close up and take hands.
    if (!waved && inSideLines(state, true)) {
      try {
        return formLongWaves(state, undefined, 1, beats);
      } catch {
        // Not side lines that can close up: as below.
      }
    }
    if (!waved && state.hands.length && !ringed(state)) return heldBalance(state, beats);
    return fourBeatBalance(state, { formation: waved ? 'wave' : 'ring', ...style }, beats);
  }
  if (formation === 'wave') return waveBalance(state, params, beats);
  if (formation === 'ring') return ringBalance(state, params, beats);
  if (formation === 'long-waves') return longWaveBalance(state, params, beats);
  if (formation === 'solo') return heldBalance(state, beats, activeIds(state));
  return pairBalance(state, params, beats);
};

const ringed = (state: Parameters<typeof balance>[0]) =>
  minorSets(state).every((g) => {
    try {
      findRing(state, g);
      return true;
    } catch {
      return false;
    }
  });

/** How far a line steps in toward the line it faces. */
const LINE_STEP = 0.3;

/**
 * Lines facing lines, holding no one (Money Musk's "balance long lines",
 * "balance short lines"): everyone in the groups has someone straight
 * ahead, a line or more away, and stands beside someone (up to a place
 * apart) facing the same way; hands join where they reach.
 */
function linesFacing(state: Parameters<typeof balance>[0]): boolean {
  const ids = activeIds(state);
  if (ids.length < 6) return false;
  return ids.every((id) => {
    const b = body(state, id);
    const f = forward(b.yaw);
    const ahead = ids.some((o) => {
      const v = sub(body(state, o).position, b.position);
      const along = v.x * f.x + v.z * f.z;
      return o !== id && along > 1.2 && Math.abs(v.x * f.z - v.z * f.x) < 0.5;
    });
    const beside = ids.some((o) => {
      const ob = body(state, o);
      const v = sub(ob.position, b.position);
      const along = v.x * f.x + v.z * f.z;
      return o !== id && Math.abs(along) < 0.3 && length(v) < 2.0 && Math.cos(turn(ob.yaw, b.yaw)) > 0.9;
    });
    return ahead && beside;
  });
}

/**
 * Lines balance: each line takes near hands, steps in toward the line it
 * faces and steps back (forward on one, close, back on three, close).
 */
function linesBalance(state: Parameters<typeof balance>[0], beats: number) {
  const ids = activeIds(state);
  const holds: Hold[] = [];
  for (const a of ids)
    for (const b of ids) {
      if (a >= b) continue;
      const A = body(state, a);
      const B = body(state, b);
      const v = sub(B.position, A.position);
      const f = forward(A.yaw);
      if (length(v) > 2.0 || Math.abs(v.x * f.x + v.z * f.z) > 0.3) continue;
      if (Math.cos(turn(B.yaw, A.yaw)) < 0.9) continue;
      holds.push({ a, handA: handToward(A, B.position), b, handB: handToward(B, A.position) });
    }
  // Each line closes up along itself so neighbors reach (WAVE_GAP), and
  // opens back out to the places as the balance ends.
  const close = new Map<number, Vec2>();
  const seen = new Set<number>();
  for (const start of ids) {
    if (seen.has(start)) continue;
    const line = [start];
    seen.add(start);
    for (let i = 0; i < line.length; i++)
      for (const h of holds) {
        const o = h.a === line[i] ? h.b : h.b === line[i] ? h.a : undefined;
        if (o !== undefined && !seen.has(o)) {
          seen.add(o);
          line.push(o);
        }
      }
    if (line.length < 2) continue;
    const axis = rightOf(body(state, start).yaw);
    const at = (id: number) => dot(body(state, id).position, axis);
    line.sort((a, b) => at(a) - at(b));
    const middle = (at(line[0]) + at(line.at(-1)!)) / 2;
    const widest = Math.max(...line.slice(1).map((id, i) => at(id) - at(line[i])));
    const k = widest > WAVE_GAP ? WAVE_GAP / widest : 1;
    for (const id of line) close.set(id, scale(axis, (at(id) - middle) * (k - 1)));
  }
  const motion = (beat: number) => {
    const step = smooth(beat) - smooth(beat - 2);
    const closed = smooth(beat / 1.25) * smooth((beats - beat) / 1.25);
    const bodies = ids.map((id) => {
      const b = body(state, id);
      const inward = scale(close.get(id) ?? { x: 0, z: 0 }, closed);
      return {
        id,
        position: add(add(b.position, inward), scale(forward(b.yaw), LINE_STEP * step)),
        yaw: b.yaw,
      };
    });
    const map = bodyMap(bodies);
    const grip = smooth(beat / 0.5) * smooth((beats - beat) / 0.5);
    return { bodies, contacts: holds.map((h) => withinReach(joined(h, grip), map)) };
  };
  return { kind: 'balance' as const, motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
}

/** Everyone holding hands steps right and back, left and back, keeping hold. */
function heldBalance(
  state: Parameters<typeof balance>[0],
  beats: number,
  ids = [...new Set(state.hands.flatMap((h) => [h.a, h.b]))],
  first: 'right' | 'left' = 'right',
) {
  const sign = first === 'left' ? -1 : 1;
  const motion = (beat: number) => {
    const i = Math.min(3, Math.floor(beat));
    const q = STEPS[i] + (STEPS[i + 1] - STEPS[i]) * ease(beat - i);
    return {
      bodies: ids.map((id) => {
        const b = body(state, id);
        return {
          id,
          position: add(b.position, scale(rightOf(b.yaw), STEP * q * sign)),
          yaw: b.yaw,
        };
      }),
      contacts: state.hands.map((h) => joined(h, 1)),
    };
  };
  return { kind: 'wave-balance' as const, motion, exit: settle(state, motion, beats) };
}

const waveBalance: Figure<BalanceParams> = (state, params, beats) => {
  if (params.who || params.hand) throw new Error('A wave balance takes no partner or hand.');
  const style = oneOf('balance', 'style', params.style ?? 'right-left', [
    'right-left',
    'forward-back',
  ] as const);
  const first = oneOf('balance', 'first', params.first ?? 'right', ['right', 'left'] as const);
  const groups = minorSets(state);
  // Hands the wave still has to take (a wave just walked into): joined at once.
  let taking: Hold[] = [];
  try {
    for (const g of groups) {
      const wave = findWave(state, g);
      try {
        assertWaveHeld(state, wave);
      } catch (error) {
        const missing = lineHolds(state, wave).filter(
          (h) => !state.hands.some((o) => sameHold(o, h)),
        );
        if (!missing.length) throw error;
        taking = [...taking, ...missing];
      }
    }
  } catch (error) {
    // Long waves ("balance the wave" on the side lines, "balance & Rory
    // O'More left"): the waves close up and take hands again.
    if (style === 'right-left' && inSideLines(state, params.first === undefined)) {
      try {
        return formLongWaves(state, undefined, first === 'left' ? -1 : 1, beats);
      } catch {
        // Not side lines this can close up: balance in place, as below.
      }
    }
    // Long waves along the side lines (or another held line): everyone
    // holding hands balances side to side in place.
    if (style === 'right-left' && state.hands.length)
      return heldBalance(state, beats, undefined, first);
    // Long waves too wide apart to hold hands: everyone on the side lines,
    // facing across, balances right and left in place.
    if (style === 'right-left' && inSideLines(state))
      return heldBalance(state, beats, activeIds(state), first);
    throw error;
  }

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
      contacts: [
        ...state.hands.map((h) => joined(h, 1)),
        ...taking.map((h) => joined(h, smooth(beat / 0.5))),
      ],
    };
  };
  const exit = settle(state, motion, beats);
  return {
    kind: 'wave-balance',
    motion,
    exit: taking.length ? withChanges(exit, { hands: [...state.hands, ...taking] }) : exit,
  };
};

/**
 * Everyone active stands on a side line facing across, and on each side
 * line some dancers next to each other face opposite ways: long waves.
 */
function inSideLines(state: Parameters<typeof balance>[0], strict = false): boolean {
  const ids = activeIds(state);
  const across = ids.every((id) => {
    const b = body(state, id);
    return Math.abs(b.position.x) > 0.5 && Math.abs(Math.abs(Math.sin(b.yaw)) - 1) < 1e-3;
  });
  if (!across) return false;
  return [-1, 1].every((side) => {
    const line = ids
      .filter((id) => Math.sign(body(state, id).position.x) === side)
      .sort((a, b) => body(state, a).position.z - body(state, b).position.z);
    // Mostly alternating: after a Rory along the side line the ends, with
    // no one to slide past, can stand facing the same way as the next one.
    const opposite = (id: number, i: number) =>
      i > 0 && Math.sin(body(state, id).yaw) * Math.sin(body(state, line[i - 1]).yaw) < 0;
    // Strict: every dancer faces the other way from the next (a true wave).
    return line.length >= 2 && (strict ? line.slice(1).every((id, i) => opposite(id, i + 1)) : line.some(opposite));
  });
}

/** Beats to turn to face in or out when forming long waves. */
const FORM_BEATS = 2;
/**
 * Long waves close up to hold hands (core/wave-gather.ts): everyone in a
 * side line holds both neighbors' hands, so each run of the line (dancers
 * within LINE_REACH of the next) draws in toward its middle until
 * neighbors stand WAVE_GAP apart, near arm's length. The balance in a held
 * long wave is a small rock (WAVE_STEP), so the hands stay joined.
 */
const WAVE_GAP = 1.5;
const WAVE_STEP = 0.05;
/** Line-mates farther apart than this do not join hands. */
const LINE_REACH = 2.2;

const longWaveBalance: Figure<BalanceParams> = (state, params, beats) => {
  if (params.who || params.hand || params.style)
    throw new Error('A long-wave balance takes no partner, hand or style.');
  const inRole = roleOfGroup(oneOf('balance', 'in', params.in, ['larks', 'robins'] as const))!;
  const first = oneOf('balance', 'first', params.first ?? 'right', ['right', 'left'] as const);
  const sign = first === 'left' ? -1 : 1;
  try {
    return formLongWaves(state, inRole, sign, beats);
  } catch (error) {
    // Already holding a long wave (an allemande that ended in one): balance it.
    if (error instanceof NotInSideLine && state.hands.length)
      return heldBalance(state, beats, undefined, first);
    throw error;
  }
};

class NotInSideLine extends Error {}

function formLongWaves(
  state: Parameters<typeof balance>[0],
  /** The role that turns to face in; undefined: everyone faces as they stand. */
  inRole: string | undefined,
  sign: number,
  beats: number,
) {
  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    return g.map((id) => {
      const s = body(state, id);
      const off = s.position.x - middle.x;
      if (Math.abs(off) < 0.5) throw new NotInSideLine(`Dancer ${id} is not standing in a side line.`);
      const facingIn = off > 0 ? -Math.PI / 2 : Math.PI / 2;
      const yaw =
        inRole === undefined
          ? Math.cos(turn(facingIn, s.yaw)) > 0 ? facingIn : facingIn + Math.PI
          : roleOf(state, id) === inRole ? facingIn : facingIn + Math.PI;
      return { id, s, yaw, side: Math.sign(off), gather: 0 };
    });
  });
  // Hands along each side line, between neighbors in line (across minor sets too).
  const holds: Hold[] = [];
  for (const side of [-1, 1]) {
    const line = plans
      .filter((p) => p.side === side)
      .sort((a, b) => a.s.position.z - b.s.position.z);
    // Runs of the line close enough to join up.
    const runs: (typeof line)[] = [];
    for (const p of line) {
      const run = runs.at(-1);
      if (run && p.s.position.z - run.at(-1)!.s.position.z <= LINE_REACH) run.push(p);
      else runs.push([p]);
    }
    for (const run of runs) {
      const z = run.map((p) => p.s.position.z);
      const middle = (z[0] + z.at(-1)!) / 2;
      const widest = Math.max(0, ...z.slice(1).map((v, i) => v - z[i]));
      const k = widest > WAVE_GAP ? WAVE_GAP / widest : 1;
      for (const p of run) p.gather = (p.s.position.z - middle) * (k - 1);
      for (let i = 1; i < run.length; i++) {
        const [a, b] = [run[i - 1], run[i]];
        const fa = { position: a.s.position, yaw: a.yaw };
        const fb = { position: b.s.position, yaw: b.yaw };
        holds.push({ a: a.id, handA: handToward(fa, fb.position), b: b.id, handB: handToward(fb, fa.position) });
      }
    }
  }
  const motion = (beat: number) => {
    const i = Math.min(3, Math.floor(beat));
    const q = STEPS[i] + (STEPS[i + 1] - STEPS[i]) * ease(beat - i);
    const close = smooth(beat / 1.25);
    const bodies = plans.map((p) => {
      const yaw = p.s.yaw + turn(p.yaw, p.s.yaw) * smooth(beat / FORM_BEATS);
      const home = { x: p.s.position.x, z: p.s.position.z + p.gather * close };
      return { id: p.id, position: add(home, scale(rightOf(yaw), WAVE_STEP * q * sign)), yaw };
    });
    const map = bodyMap(bodies);
    // Hands join as the line closes up and stay joined through the balance.
    const strength = smooth((beat - 0.25) / 0.75);
    return { bodies, contacts: holds.map((h) => withinReach(joined(h, strength), map)) };
  };
  // Keep the hands that still reach at the end (side-line places can be wide).
  const end = motion(beats).contacts;
  const kept = holds.filter((_, i) => end[i].strength > 0.5);
  return {
    kind: 'wave-balance' as const,
    motion,
    exit: withChanges(settle(state, motion, beats), {
      hands: kept,
      relations: withGather(
        state,
        new Map(plans.map((p) => [p.id, p.gather])),
        new Map(plans.map((p) => [p.id, p.s.position.z + p.gather])),
      ),
    }),
  };
};

/** Neighbors round a balancing ring stand this far apart, holding hands. */
const RING_GAP = 1.45;
/** Farthest a dancer steps in to close the ring (m), at a walk. */
const RING_CLOSE = 0.3;

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
  const heldAtStart = (h: Hold) => state.hands.some((o) => sameHold(o, h));
  // Neighbors round a ring of places stand too far apart to hold hands: the
  // ring closes in to RING_GAP between neighbors for the balance and opens
  // back out to the places as it ends.
  const closeBy = rings.map((r) => {
    const gaps = r.holds.map((h) => length(sub(body(state, h.a).position, body(state, h.b).position)));
    const radius = Math.max(...r.order.map((id) => length(sub(body(state, id).position, r.center))));
    // Nobody closes in on anyone (a narrow ring, as after an allemande).
    const nearest = Math.min(
      ...r.order.flatMap((a, i) =>
        r.order.slice(i + 1).map((b) => length(sub(body(state, a).position, body(state, b).position))),
      ),
    );
    return Math.max(
      0,
      Math.min(RING_CLOSE / radius, 1 - RING_GAP / Math.max(...gaps), 1 - RING_GAP / nearest),
    );
  });
  const motion = (beat: number) => {
    const deep = inAndOut(beat);
    const face = smooth(beat / FACE_BEATS);
    const closed = smooth(beat / 0.6) * smooth((beats - beat) / 0.6);
    const bodies = rings.flatMap((r, k) =>
      r.order.map((id) => {
        const s = body(state, id);
        const rel = sub(s.position, r.center);
        const inward = scale(rel, -closeBy[k] * closed - (RING_DEPTH * deep) / length(rel));
        return {
          id,
          position: add(s.position, inward),
          yaw: s.yaw + turn(heading(s.position, r.center), s.yaw) * face,
          lean: 0.06 * deep,
        };
      }),
    );
    const map = bodyMap(bodies);
    // Hands stay joined round the ring for the whole balance (taken at once
    // when coming in without them); the next figure lets go.
    const grip = (h: Hold) => (heldAtStart(h) ? 1 : smooth(beat / 0.5));
    const contacts = rings.flatMap((r) =>
      r.holds.map((h) => withinReach(joined(h, grip(h)), map)),
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
    if (span < 0.6 - 1e-6 || span > 2.7)
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
