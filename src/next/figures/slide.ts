/**
 * Slide left (or right) along the set.
 *
 * Definition: in Becket lines, each couple, side by side and facing across,
 * slides sideways one place along its side line to its left (or right),
 * still facing across, to meet new neighbors. Like a slice without the step
 * in toward the other line; in Becket dances it is the progression, and the
 * dance's Progression rebinds neighbors where the couples end up.
 * Source: ContraDB row "slide left along set" (Becket, 2 beats). Every couple
 * slides, including couples waiting at the ends (src/next/figures/slice.ts).
 */
import type { Figure, FigureResult } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, heading, leftOf, progress, rightOf, scale, smooth, turn } from '../core/math.ts';
import { SET } from '../core/config.ts';
import { activeIds, body, roleOf, withChanges, type DanceState } from '../core/state.ts';
import { sideMoves, squareUp } from './slice.ts';

export interface SlideParams {
  direction: 'left' | 'right';
  /**
   * Only these slide ("ladles slide right to partner"), one place to their
   * own left or right, letting go of any hands; everyone else stands.
   */
  who?: 'larks' | 'robins';
  /** Places along the set (default 1): "slide left along set 2 places", "one person" (½). */
  places?: number;
  /**
   * "travel": single file (a single-file promenade along the set): each
   * dancer turns to face the way they go, walks, and turns back in to face
   * across at the end.
   */
  facing?: 'travel';
}

export const slide: Figure<SlideParams> = (state, params, beats) => {
  onlyKeys('slide', params, ['direction', 'who', 'places', 'facing']);
  if (params.facing !== undefined) oneOf('slide', 'facing', params.facing, ['travel'] as const);
  const direction = oneOf('slide', 'direction', params.direction, ['left', 'right'] as const);
  const places = params.places ?? 1;
  if (!(places > 0 && places <= 4 && Number.isInteger(places * 2)))
    throw new Error('A slide goes a whole or half number of places, up to four.');
  if (params.who !== undefined) {
    if (places !== 1) throw new Error('A role slides one place.');
    return roleSlide(state, params.who, direction, beats);
  }
  if (state.hands.length) throw new Error('A slide along the set needs free hands.');
  const moves = sideMoves(state, direction).map((m) => ({
    ...m,
    lateral: scale(m.lateral, places),
  }));
  const motion = (beat: number) => ({
    bodies: moves.map((m) => ({
      id: m.id,
      position: add(m.start.position, scale(m.lateral, progress(beat / beats))),
      yaw:
        params.facing === 'travel'
          ? singleFile(m.start.yaw, heading({ x: 0, z: 0 }, m.lateral), m.across, beat / beats)
          : squareUp(m.start.yaw, m.across, beat, beats),
    })),
    contacts: [],
  });
  return {
    kind: 'becket-slice',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

/** Single file: turn to the travel, walk, and turn in to face across at the end. */
function singleFile(from: number, travel: number, across: number, t: number) {
  if (t < TURN_SHARE) return from + turn(travel, from) * smooth(t / TURN_SHARE);
  if (t > 1 - TURN_SHARE) return travel + turn(across, travel) * smooth((t - 1 + TURN_SHARE) / TURN_SHARE);
  return travel;
}
const TURN_SHARE = 0.3;

/** One role slides a place sideways, keeping its facing. */
function roleSlide(
  state: DanceState,
  who: 'larks' | 'robins',
  direction: 'left' | 'right',
  beats: number,
): FigureResult {
  const role = oneOf('slide', 'who', who, ['larks', 'robins'] as const) === 'larks' ? 'lark' : 'robin';
  const moves = activeIds(state)
    .filter((id) => roleOf(state, id) === role)
    .map((id) => {
      const b = body(state, id);
      return { id, start: b, lateral: scale((direction === 'left' ? leftOf : rightOf)(b.yaw), SET.slot) };
    });
  if (!moves.length) throw new Error(`No ${who} to slide.`);
  const motion = (beat: number) => ({
    bodies: moves.map((m) => ({
      id: m.id,
      position: add(m.start.position, scale(m.lateral, progress(beat / beats))),
      yaw: m.start.yaw,
    })),
    contacts: [],
  });
  return { kind: 'becket-slice', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
}
