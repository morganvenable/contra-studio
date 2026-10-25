/**
 * Lonesome dancer to the bottom (or top) of the set.
 *
 * Definition: the dancer named walks alone down (or up) the middle of the
 * set to just past its end, optionally turning single (once round to the
 * right) as they arrive, and ends facing the way named.
 * Source: ContraDB 3294 (Millenium Bug (variant), Erik Hoffman), "lonesome
 * person promenade to the bottom of the set, turn single"; ContraDB 3295,
 * "while the lonesome person promenades to the bottom of the set";
 * Caller's Box glossary, "Promenade" and "Turn single".
 * Reading: the end of the set is half a slot past the last dancers on the
 * side lines, on the set's center line; the turn single takes the last
 * three beats. Ending facing up the set (toward the others) when not
 * turning single; a turn single ends facing the way they walked.
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { SET } from '../../core/config.ts';
import { heading, mix, progress, smooth, TAU, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { everyone, named, window } from './common.ts';

export interface LonesomeTravelParams {
  who: string;
  to: 'top' | 'bottom';
  turnSingle?: boolean;
}

const TURN_BEATS = 3;
/** Beats to step onto the set's center line first, when off it. */
const ONTO = 1.5;

export const lonesomeTravel: Figure<LonesomeTravelParams> = (state, params, beats) => {
  onlyKeys('lonesome travel', params, ['who', 'to', 'turnSingle']);
  const to = oneOf('lonesome travel', 'to', params.to, ['top', 'bottom'] as const);
  const movers = named(state, params.who, 'lonesome travel');
  if (movers.length !== 1) throw new Error('One dancer travels alone.');
  const id = movers[0];
  const rest = everyone(state).filter((o) => o !== id);
  const zs = rest.map((o) => body(state, o).position.z);
  const xs = rest.map((o) => body(state, o).position.x);
  const cx = xs.reduce((n, x) => n + x, 0) / xs.length;
  const end = { x: cx, z: to === 'bottom' ? Math.max(...zs) + SET.halfWidth : Math.min(...zs) - SET.halfWidth };
  const s = body(state, id);
  const onLine = { x: cx, z: s.position.z };
  const onto = Math.abs(s.position.x - cx) < 0.05 ? 0 : ONTO;
  const walk = heading(onLine, end);
  const finalYaw = params.turnSingle ? walk : walk + Math.PI;
  const spin = params.turnSingle ? -TAU : 0;
  const motion = (beat: number) => {
    const position =
      beat < onto
        ? mix(s.position, onLine, progress(window(beat, 0, onto)))
        : mix(onLine, end, progress(window(beat, onto, beats)));
    const face = s.yaw + turn(walk, s.yaw) * smooth(window(beat, 0, onto + 1));
    const last = smooth(window(beat, beats - TURN_BEATS, beats));
    const yaw = face + (turn(finalYaw, walk) + spin) * last;
    return { bodies: [{ id, position, yaw }], contacts: [] };
  };
  return { kind: 'promenade', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
