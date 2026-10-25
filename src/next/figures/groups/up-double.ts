/**
 * Up a double and back.
 *
 * Definition: the dancers named face up the hall (toward the band), walk
 * up a double (four steps, about 0.9 m) and fall back to place, as many
 * times as called, then turn back to face as they were.
 * Source: Playford ECD manuals ("Lead up a double and back"); ContraDB 3295
 * (Millenium Bug, Erik Hoffman), "up a double and back twice"; Caller's Box
 * glossary, "Up a double".
 * Reading: dancers standing in side lines face up individually and walk up
 * their own line (not leading a partner by the hand), so the middle of the
 * set stays clear.
 */
import type { Figure } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { add, progress, smooth, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { named, window } from './common.ts';

export interface UpDoubleParams {
  who: string;
  times?: number;
}

/** A double: four steps up. */
const DOUBLE = 0.9;
/** Beats to face up, and to face back. */
const FACE = 1;
/** Up the hall is -z, toward the band. */
const UP = Math.PI;

export const upDouble: Figure<UpDoubleParams> = (state, params, beats) => {
  onlyKeys('up a double', params, ['who', 'times']);
  const ids = named(state, params.who, 'up a double');
  const times = params.times ?? 1;
  if (!(Number.isInteger(times) && times >= 1 && times <= 4)) throw new Error('Up a double 1 to 4 times.');
  const each = (beats - 2 * FACE) / times;
  if (each < 3) throw new Error('Not enough beats to go up a double and back.');
  const motion = (beat: number) => ({
    bodies: ids.map((id) => {
      const s = body(state, id);
      const local = beat - FACE;
      const k = Math.min(times - 1, Math.max(0, Math.floor(local / each)));
      const u = window(local, k * each, (k + 1) * each);
      const out = u < 0.5 ? progress(u * 2) : 1 - progress(u * 2 - 1);
      const lift = local < 0 || local > times * each ? 0 : out;
      const face = turn(UP, s.yaw);
      const yaw =
        s.yaw + face * smooth(window(beat, 0, FACE)) - face * smooth(window(beat, beats - FACE, beats));
      return { id, position: add(s.position, { x: 0, z: -DOUBLE * lift }), yaw };
    }),
    contacts: [],
  });
  return { kind: 'long-lines', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
