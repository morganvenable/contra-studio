/**
 * Two swing, the third moves on (lines of three round a ring).
 *
 * Definition: in each line of three two dancers swing while the third
 * walks on alone (promenades single) to the next line ahead round the
 * ring, where they make a new line of three with the two who swung there.
 * Source: ContraDB 2517 (The Mean Dance, Mattie Rynkiewicz), "first two
 * people to make eye contact swing, remaining person promenade single to
 * another couple to form a new line of three"; Caller's Box glossary,
 * "Swing" and "Promenade".
 * Reading: the center and the outside end are the two who swing (they end
 * side by side on their own places, center on the left); the inside end
 * walks on to the next line counterclockwise (the line of dance), inside
 * the ring, and takes the inside place there.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { add, heading, mix, progress, rotate, scale, smooth, sub, TAU, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { hold, inOut, window } from './common.ts';
import { triosOf } from './trios.ts';

export type SwingAndMoveOnParams = Record<string, never>;

/** Swing orbit radius (as in swing.ts). */
const ORBIT = 0.31;
/** Beats to close in to swing, and to open out. */
const EDGE = 2;
/** A swing's pace, meters per beat round the orbit. */
const PACE = 0.85;

export const swingAndMoveOn: Figure<SwingAndMoveOnParams> = (state, params, beats) => {
  onlyKeys('swing and move on', params, []);
  if (state.hands.length) throw new Error('The swing starts with free hands.');
  const span = beats - 2 * EDGE;
  if (span < 4) throw new Error('Not enough beats to swing.');
  const { ring, trios } = triosOf(state, 'swing and move on');
  const n = trios.length;
  const turns = Math.max(1, Math.floor((PACE * span) / (TAU * ORBIT)));
  const sweep = turns * TAU;
  // One line on, counterclockwise: a negative rotate().
  const walk = -TAU / n;

  const motion = (beat: number) => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const t of trios) {
      const a = body(state, t.center);
      const b = body(state, t.outside);
      const mid = mix(a.position, b.position, 0.5);
      const half = sub(a.position, mid);
      const r0 = Math.hypot(half.x, half.z);
      const close = smooth(window(beat, 0, EDGE)) * (1 - smooth(window(beat, beats - EDGE, beats)));
      const r = r0 + (ORBIT - r0) * close;
      const angle = sweep * progress(window(beat, EDGE * 0.5, beats - EDGE * 0.5));
      for (const [id, s, sign] of [
        [t.center, a, 1],
        [t.outside, b, -1],
      ] as const) {
        const dir = scale(half, (sign * r) / r0);
        const position: Vec2 = add(mid, rotate(dir, angle));
        const face = heading(position, mid);
        const w = inOut(beat / beats, EDGE / beats);
        bodies.push({ id, position, yaw: s.yaw + turn(face, s.yaw) * w });
      }
      contacts.push(
        hold(t.center, 'right', t.outside, 'left', inOut(window(beat, 1, beats - 1), 0.1), bodies),
      );
      // The inside end walks on round the inside of the ring.
      const c = body(state, t.inside);
      const step = walk * progress(beat / beats);
      bodies.push({
        id: t.inside,
        position: add(ring, rotate(sub(c.position, ring), step)),
        yaw: c.yaw - step,
      });
    }
    return { bodies, contacts };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
