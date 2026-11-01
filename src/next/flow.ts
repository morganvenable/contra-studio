/**
 * Flow between figures, as a dancer feels it.
 *
 * Two layers:
 * - Momentum, measured from the motion: each figure's main rotation (the
 *   middle of it; the engine eases every spin out at the end and starts the
 *   next with a small turn to face). Going straight from one way round to
 *   the other is a counter-turn: momentum fought. A figure with no turn of
 *   its own (a balance, long lines) lets the momentum go between them.
 * - Habit, measured from the library: how often choreographers follow one
 *   figure (move, hand, direction) with another (flow-habits.json, made by
 *   scripts/flow-habits.ts).
 *
 * Travel reversals and plain hand changes are left out: measured on the
 * library's well-danced dances they are everywhere (balances, forward and
 * back, letting go and taking a new hand), so they say nothing. Hands come
 * in through the habit key instead: allemande right then allemande left is
 * a different pair from allemande right then allemande right.
 *
 * Each is a feel, not a fault: a choreographer may want it.
 */
import type { FigureCall, FigureResult } from './core/figure.ts';
import type { DanceState } from './core/state.ts';

export interface FlowSegment {
  readonly call: FigureCall;
  readonly entry: DanceState;
  readonly result: FigureResult;
}

export interface FlowNote {
  readonly kind: 'counter-turn';
  /** Who feels it: larks, robins, or everyone. */
  readonly who: string;
  readonly text: string;
}

/** Below this a figure has no turn of its own (radians a beat); a circle left turns about 0.7, a star 0.5. */
const SPIN = 0.35;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** A dancer's main rotation through the middle of a figure: radians a beat, + counter-clockwise from above. */
export function mainSpin(seg: FlowSegment, id: number): number {
  const beats = seg.call.beats, from = beats * 0.2, to = beats * 0.8, steps = 12;
  let turned = 0, last: number | undefined;
  for (let i = 0; i <= steps; i++) {
    const yaw = seg.result.motion(from + ((to - from) * i) / steps).bodies.find((b) => b.id === id)?.yaw;
    if (yaw === undefined) return 0;
    if (last !== undefined) turned += wrap(yaw - last);
    last = yaw;
  }
  return to > from ? turned / (to - from) : 0;
}

const label = (call: FigureCall) => (call.text ?? call.move).split(' · ').at(-1) ?? call.move;
const way = (s: number) => (s > 0 ? 'counter-clockwise' : 'clockwise');

/** Counter-turns going from `before` into `after`, for the dancers `ids` (one minor set: the others dance the same). */
export function flowBetween(before: FlowSegment, after: FlowSegment, ids: readonly number[]): FlowNote[] {
  const byRole = new Map<string, { a: number; b: number }>();
  for (const id of ids) {
    const a = mainSpin(before, id), b = mainSpin(after, id);
    if (Math.abs(a) < SPIN || Math.abs(b) < SPIN || Math.sign(a) === Math.sign(b)) continue;
    byRole.set(after.entry.dancers[id]?.role ?? 'lark', { a, b });
  }
  if (!byRole.size) return [];
  const [role, { a, b }] = [...byRole][0];
  return [
    {
      kind: 'counter-turn',
      who: byRole.size > 1 ? 'everyone' : `${role}s`,
      text: `turning ${way(a)} in the ${label(before.call)}, then ${way(b)} in the ${label(after.call)}`,
    },
  ];
}

/** Flow notes at every join of a round, keyed by the index of the figure after the join. */
export function flowOfRound(segments: readonly FlowSegment[], ids: readonly number[] = [0, 1, 2, 3]): Map<number, FlowNote[]> {
  const out = new Map<number, FlowNote[]>();
  for (let i = 1; i < segments.length; i++) {
    const notes = flowBetween(segments[i - 1], segments[i], ids);
    if (notes.length) out.set(i, notes);
  }
  return out;
}

/** A figure as habit counts it: the move, and its hand or direction when it has one. */
export function habitKey(call: Pick<FigureCall, 'move' | 'params'>): string {
  const p = call.params as Record<string, unknown>;
  const side = p.hand ?? p.shoulder ?? p.direction;
  return typeof side === 'string' && side !== 'both' ? `${call.move}:${side}` : call.move;
}

/** How often choreographers follow one figure with another, from the library. */
export interface FlowHabits {
  /** Dances counted. */
  readonly dances: number;
  /** after[a][b]: joins from figure a into figure b. */
  readonly after: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/** How often `b` follows `a` in the library, against how often anything follows `a`. */
export function habit(habits: FlowHabits, a: string, b: string): { count: number; of: number } {
  const row = habits.after[a] ?? {};
  return { count: row[b] ?? 0, of: Object.values(row).reduce((n, c) => n + c, 0) };
}
