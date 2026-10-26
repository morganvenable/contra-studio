/**
 * Rory O'More (slide right or left).
 *
 * Definition (the owner's words, authoritative): from a balance in a wave,
 * slide right (or left) one place, passing the neighbor you were holding by
 * that hand face to face. Most dancers also twirl quickly clockwise when
 * sliding right (counterclockwise sliding left). The spin is the default.
 * Also: Caller's Box glossary "Slide right/left"; Colin Hume, session 7.
 *
 * Kernel ported from src/rory-slide.ts: C2 travel clock, each dancer bows
 * BACKWARD (0.44 m at the crossing) so the passing pair goes face to face,
 * and the spin is one full turn in the travel direction. Hands release at the
 * start and the new wave joins hands at the end.
 *
 * Named dancers ("balance & larks Rory O'More right", "centers Rory O'More
 * right"): only the pairs holding that hand with a named dancer slide; the
 * others stand still, and the wave may end holding some of the same hands.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined, sameHold } from '../core/contacts.ts';
import { findWave, lineHolds } from '../core/lines.ts';
import {
  add,
  dot,
  ease,
  forward,
  mix,
  progress,
  rightOf,
  scale,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import type { Hand } from '../../types.ts';
import {
  body,
  handOf,
  handToward,
  minorSets,
  roleOf,
  withChanges,
  type DanceState,
  type Hold,
} from '../core/state.ts';

export interface RoryParams {
  direction: 'right' | 'left';
  spin?: 'full' | 'none';
  /** Only these slide: a role, a couple number, or the two in the middle of the wave. */
  who?: 'larks' | 'robins' | '1s' | '2s' | 'centers';
}

/** Backward bow at the moment of passing, each dancer. */
const BOW = 0.44;
const RELEASE = 0.18;

/** The twirl is centered on the crossing (travel progress 0.5). */
const TWIRL_SPAN = 0.6;
const twirl = (q: number) => ease((q - 0.5) / TWIRL_SPAN + 0.5);

export const rory: Figure<RoryParams> = (state, params, beats) => {
  onlyKeys('Rory', params, ['direction', 'spin', 'who']);
  const named =
    params.who === undefined
      ? undefined
      : oneOf('Rory', 'who', params.who, ['larks', 'robins', '1s', '2s', 'centers'] as const);
  const direction = oneOf('Rory', 'direction', params.direction, ['right', 'left'] as const);
  const spin = oneOf('Rory', 'spin', params.spin ?? 'full', ['full', 'none'] as const);
  const turnBy = spin === 'full' ? (direction === 'right' ? -TAU : TAU) : 0;

  const groups = minorSets(state);
  const swaps = new Map<number, number>();
  let held: ReturnType<typeof heldLine> | undefined;
  for (const g of groups) {
    let line: ReturnType<typeof findWave>;
    try {
      line = findWave(state, g);
    } catch (error) {
      // Long waves along the side lines (a held line across minor sets).
      held = named === undefined ? heldLine(state, direction, error) : undefined;
      if (!held) throw error;
      break;
    }
    const slides = (id: number) =>
      named === undefined ||
      (named === 'centers'
        ? id === line.order[1] || id === line.order[2]
        : named === 'larks' || named === 'robins'
          ? roleOf(state, id) === (named === 'larks' ? 'lark' : 'robin')
          : (state.positions.get(named)?.includes(id) ?? false));
    for (const id of line.order) {
      const hold = state.hands.find(
        (h) => handOf(h, id) === direction && g.includes(h.a) && g.includes(h.b),
      );
      if (!hold && !slides(id)) continue;
      if (!hold)
        throw new Error(
          `Dancer ${id} must hold the ${direction} hand of the person to slide past.`,
        );
      const other = hold.a === id ? hold.b : hold.a;
      if (handOf(hold, other) !== direction)
        throw new Error(`A Rory pass needs ${direction} hands joined.`);
      if (slides(id) || slides(other)) swaps.set(id, other);
    }
  }

  if (held) {
    swaps.clear();
    for (const [a, b] of held.swaps) swaps.set(a, b);
  }
  const moves = [...swaps].map(([id, other]) => ({
    id,
    start: body(state, id),
    end: body(state, other).position,
  }));

  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = moves.map((m) => {
      const back = scale(forward(m.start.yaw), -BOW * Math.sin(Math.PI * q));
      return {
        id: m.id,
        position: add(mix(m.start.position, m.end, q), back),
        yaw: m.start.yaw + turnBy * twirl(q),
      };
    });
    const contacts: FigureContact[] = [];
    if (beat < RELEASE)
      contacts.push(...state.hands.map((h) => joined(h, 1 - ease(beat / RELEASE))));
    if (beat > beats - RELEASE) {
      const strength = ease((beat - (beats - RELEASE)) / RELEASE);
      contacts.push(...newHolds.map((h) => joined(h, strength)));
    }
    return { bodies, contacts };
  };

  let newHolds: Hold[] = [];
  const slid = settle(state, motion, beats);
  // Named dancers sliding may leave no wave behind them (the others turn
  // or step meanwhile): then no new hands join.
  newHolds = held
    ? held.after(slid)
    : named === undefined
      ? groups.flatMap((g) => lineHolds(slid, findWave(slid, g)))
      : [];
  if (named === undefined && newHolds.some((h) => state.hands.some((old) => sameHold(old, h)))) {
    throw new Error('Rory must end holding hands with new people.');
  }
  return {
    kind: 'balance-rory-slide',
    motion,
    exit: withChanges(slid, {
      hands: newHolds,
      ...(held ? { relations: withSlid(state, held.swaps) } : {}),
    }),
    ...(turnBy ? { styled: { name: 'Rory twirl' } } : {}),
  };
};

/**
 * A Rory in a held line that is not one wave per minor set (long waves on
 * the side lines): every pair holding `direction` hands, facing opposite
 * ways, slides past each other; the other holds join again between the
 * dancers who now stand where the old holders stood.
 */
function heldLine(state: DanceState, direction: Hand, failure: unknown) {
  const active = minorSets(state).flat();
  const swaps = new Map<number, number>();
  // The dancer on `direction`'s side, along the line it faces across, who
  // faces the other way and has this dancer on the same side.
  const beside = (id: number): number | undefined => {
    const me = body(state, id);
    const side = direction === 'right' ? rightOf(me.yaw) : scale(rightOf(me.yaw), -1);
    let best: number | undefined;
    let bestD = SIDE_REACH;
    for (const other of active) {
      if (other === id) continue;
      const o = body(state, other);
      const off = sub(o.position, me.position);
      const along = dot(off, side);
      if (along <= 0.3 || Math.abs(dot(off, forward(me.yaw))) > 0.3) continue;
      if (Math.abs(Math.abs(turn(me.yaw, o.yaw)) - Math.PI) > 0.2) continue;
      if (along < bestD) {
        bestD = along;
        best = other;
      }
    }
    return best;
  };
  // Not back past the one just slid past (in long waves the Rory back
  // passes the next person along; at the ends there may be none).
  const passed = state.relations.get(slidKey(state));
  for (const id of active) {
    const other = beside(id);
    if (other === undefined || beside(other) !== id || passed?.get(id) === other) continue;
    swaps.set(id, other);
  }
  // In long waves whose slide partners are all out at the ends (one minor
  // set dancing, the next couple waiting), nobody here slides.
  if (!swaps.size && !inLongWaves(state, active)) throw failure;
  const at = (id: number) => swaps.get(id) ?? id;
  const kept = state.hands.filter((h) => swaps.get(h.a) !== h.b);
  const after = (slid: DanceState): Hold[] =>
    kept.map((h) => {
      const a = at(h.a);
      const b = at(h.b);
      const pa = body(slid, a);
      const pb = body(slid, b);
      return { a, handA: handToward(pa, pb.position), b, handB: handToward(pb, pa.position) };
    });
  return { swaps, after };
}

/** Farthest a long-wave neighbor stands to slide past (one place along a side line). */
const SIDE_REACH = 2.2;

/** Everyone on a side line facing across, some neighbors along each facing opposite ways. */
function inLongWaves(state: DanceState, ids: readonly number[]): boolean {
  const across = ids.every((id) => {
    const b = body(state, id);
    return Math.abs(b.position.x) > 0.5 && Math.abs(Math.abs(Math.sin(b.yaw)) - 1) < 1e-3;
  });
  return (
    across &&
    [-1, 1].every((side) => {
      const line = ids
        .filter((id) => Math.sign(body(state, id).position.x) === side)
        .sort((a, b) => body(state, a).position.z - body(state, b).position.z);
      return line.some(
        (id, i) =>
          i > 0 && Math.sin(body(state, id).yaw) * Math.sin(body(state, line[i - 1]).yaw) < 0,
      );
    })
  );
}

/** Who each dancer last slid past in long waves, this time through (the epoch). */
const slidKey = (state: DanceState) => `rory-slid-past@${state.epoch}`;

function withSlid(state: DanceState, swaps: ReadonlyMap<number, number>) {
  const relations = new Map(
    [...state.relations].filter(([name]) => !name.startsWith('rory-slid-past@')),
  );
  relations.set(slidKey(state), new Map(swaps));
  return relations;
}
