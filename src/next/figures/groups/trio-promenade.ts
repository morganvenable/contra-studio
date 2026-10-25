/**
 * Lines of three promenade round the ring.
 *
 * Definition: each line of three (a center between two ends, hands joined)
 * walks forward round the big ring, counterclockwise (the line of dance),
 * keeping its shape, and ends on the places of a line further on.
 * Source: ContraDB 2555 (Catch Somebody, circle of threes), "partners
 * promenade around the ring"; ContraDB 2517 (The Mean Dance), "lines of
 * three promenade anywhere in the room"; Caller's Box glossary,
 * "Promenade".
 * Reading: as many whole lines' places as an easy walk (0.8 m a beat at the
 * outside end) covers in the beats, so everyone ends on a place of the ring;
 * "anywhere in the room" is drawn as round the ring.
 */
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { add, length, progress, rotate, sub, TAU } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { hold, inOut } from './common.ts';
import { triosOf } from './trios.ts';

export interface TrioPromenadeParams {
  /** Lines' places to go round (default: as far as an easy walk covers). */
  places?: number;
  /** "Partners promenade": the line itself; nothing else is accepted. */
  who?: 'partner';
}

/** An easy walk at the outside end, meters per beat. */
const WALK = 0.8;

export const trioPromenade: Figure<TrioPromenadeParams> = (state, params, beats) => {
  onlyKeys('promenade', params, ['places', 'who']);
  if (params.who !== undefined && params.who !== 'partner')
    throw new Error('Lines of three promenade together.');
  if (state.hands.length) throw new Error('A promenade starts with free hands.');
  const { ring, trios } = triosOf(state, 'promenade');
  const n = trios.length;
  const outer = Math.max(...trios.map((t) => length(sub(body(state, t.outside).position, ring))));
  const step = (TAU / n) * outer;
  const places = params.places ?? Math.max(1, Math.floor((WALK * beats) / step));
  if (!(Number.isInteger(places) && places > 0)) throw new Error('Promenade a whole number of places.');
  // Counterclockwise seen from above is a negative rotate().
  const sweep = (-places * TAU) / n;
  const ids = trios.flatMap((t) => [t.inside, t.center, t.outside]);
  const motion = (beat: number) => {
    const angle = sweep * progress(beat / beats);
    const bodies: MovedBody[] = ids.map((id) => {
      const s = body(state, id);
      return { id, position: add(ring, rotate(sub(s.position, ring), angle)), yaw: s.yaw - angle };
    });
    const strength = inOut(beat / beats, 0.1);
    const contacts: FigureContact[] = trios.flatMap((t) => [
      hold(t.inside, 'right', t.center, 'left', strength, bodies),
      hold(t.center, 'right', t.outside, 'left', strength, bodies),
    ]);
    return { bodies, contacts };
  };
  return { kind: 'promenade', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
