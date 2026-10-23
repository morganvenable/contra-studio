/**
 * The figure contract: (state, params, beats) -> { motion, exit }.
 */
import type { FigureKind, HandContact, Vec2 } from '../../types.ts';
import type { DanceState } from './state.ts';

/** One row step of a dance: which move, with what parameters, for how long. */
export interface FigureCall {
  readonly move: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly beats: number;
  /** Source row text this call came from, for labels. */
  readonly text?: string;
  /** The source marks this row as the progression. */
  readonly progression?: boolean;
}

export interface MovedBody {
  readonly id: number;
  readonly position: Vec2;
  readonly yaw: number;
  readonly lean?: number;
}

/** A contact without a point gets one from the two hands' shoulders. */
export type FigureContact = Omit<HandContact, 'point'> & { point?: HandContact['point'] };

export interface FigureFrame {
  readonly bodies: readonly MovedBody[];
  readonly contacts: readonly FigureContact[];
}

export interface FigureResult {
  /** Local beat in [0, beats]. Covers every dancer the figure moves. */
  motion(beat: number): FigureFrame;
  readonly exit: DanceState;
  /** Rendering label for the scene and UI. */
  readonly kind: FigureKind;
}

export type Figure<P> = (state: DanceState, params: P, beats: number) => FigureResult;

/** Throw if params carry keys the figure does not read. */
export function onlyKeys(move: string, params: object, allowed: readonly string[]) {
  const extra = Object.keys(params).filter((k) => !allowed.includes(k));
  if (extra.length) throw new Error(`${move} does not take ${extra.join(', ')}.`);
}

export function oneOf<T extends string>(
  move: string,
  name: string,
  value: unknown,
  options: readonly T[],
): T {
  if (!options.includes(value as T)) {
    throw new Error(`${move} ${name} must be one of ${options.join(', ')}; got ${String(value)}.`);
  }
  return value as T;
}

/** Exit state: the bodies where motion(beats) leaves them, plus any changes. */
export function settle(
  state: DanceState,
  motion: (beat: number) => FigureFrame,
  beats: number,
  changes: Partial<DanceState> = {},
): DanceState {
  const bodies = new Map(state.bodies);
  for (const b of motion(beats).bodies) bodies.set(b.id, { position: b.position, yaw: b.yaw });
  return Object.freeze({ ...state, ...changes, bodies });
}
