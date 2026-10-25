/**
 * Ends arch, centers travel single file (lines of three round a ring).
 *
 * Definition: in each line of three the two ends step together and join
 * inside hands in an arch; the centers turn and walk single file round the
 * big ring the way named, passing under the arches, and each is caught by
 * the arch they are under when the call comes, becoming the center of that
 * line. The ends step back out to place.
 * Source: ContraDB 2555 (Catch Somebody, Cis Hinkle's version), "Current
 * ends arch; current center people single file promenade clockwise around
 * the major set under arches, until caller says 'CATCH SOMEONE!'";
 * Caller's Box glossary, "Arch".
 * Reading: the call comes when the centers have gone two lines on: each
 * passes under the next line's arch and is caught by the one after. The
 * centers end facing forward with their new line.
 */
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { add, progress, rotate, scale, smooth, sub, TAU } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { hold, inOut, window } from './common.ts';
import { triosOf } from './trios.ts';

export interface CentersTravelParams {
  direction: 'clockwise' | 'counterclockwise';
  /** Lines the centers go on (default two). */
  places?: number;
}

/** How far each end steps in toward the center's place to make the arch. */
const STEP_IN = 0.4;
/** Beats to step in (and out) and to turn round. */
const EDGE = 2;

export const centersTravel: Figure<CentersTravelParams> = (state, params, beats) => {
  onlyKeys('centers travel', params, ['direction', 'places']);
  const direction = oneOf('centers travel', 'direction', params.direction, [
    'clockwise',
    'counterclockwise',
  ] as const);
  const places = params.places ?? 2;
  if (!(Number.isInteger(places) && places > 0)) throw new Error('Centers go a whole number of lines.');
  if (state.hands.length) throw new Error('The ends start with free hands.');
  if (beats < 3 * EDGE) throw new Error('Not enough beats to travel.');
  const { ring, trios } = triosOf(state, 'centers travel');
  const n = trios.length;
  // Clockwise seen from above is a positive rotate().
  const sweep = ((direction === 'clockwise' ? 1 : -1) * places * TAU) / n;
  // Clockwise is backward for lines facing counterclockwise: turn round to go.
  const reverse = direction === 'clockwise' ? Math.PI : 0;

  const motion = (beat: number) => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    const arch = inOut(beat / beats, EDGE / beats);
    const strength = smooth((arch - 0.6) / 0.4);
    for (const t of trios) {
      for (const id of [t.inside, t.outside]) {
        const s = body(state, id);
        const inward = sub(t.spot, s.position);
        const k = STEP_IN / Math.hypot(inward.x, inward.z);
        bodies.push({ id, position: add(s.position, scale(inward, k * arch)), yaw: s.yaw });
      }
      const c = body(state, t.center);
      const angle = sweep * progress(window(beat, EDGE * 0.5, beats - EDGE * 0.5));
      const turnOut = smooth(window(beat, 0, EDGE));
      const turnIn = smooth(window(beat, beats - EDGE, beats));
      bodies.push({
        id: t.center,
        position: add(ring, rotate(sub(c.position, ring), angle)),
        yaw: c.yaw - angle - reverse * turnOut + reverse * turnIn,
      });
      contacts.push(hold(t.inside, 'right', t.outside, 'left', strength, bodies));
    }
    return { bodies, contacts };
  };
  return { kind: 'pass-through', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
