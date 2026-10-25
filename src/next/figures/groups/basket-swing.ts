/**
 * Basket swing of three.
 *
 * Definition: the three dancers of a line close into a small ring, arms
 * round each other's waists or shoulders (a basket), and swing round
 * clockwise (seen from above) together, then open back out into the line.
 * "End with a different person in the center": the basket stops a third of
 * a turn on, so everyone opens out one place round from where they began.
 * Source: ContraDB 2555 (Catch Somebody), "partners long swing (basket), and
 * end with a different person in the center"; ContraDB 2517 (The Mean
 * Dance), "three people basket swing"; Caller's Box glossary, "Basket"
 * and "Swing".
 * Reading: two beats to close in and two to open out; whole turns between
 * (as many as a swing's pace covers), plus a third of a turn when the center
 * changes. Turning clockwise, the dancer on the inside end becomes the
 * center, the center the outside end and the outside end the inside end.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { dot, heading, mix, polar, progress, smooth, TAU, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { hold, inOut, window } from './common.ts';
import { triosOf } from './trios.ts';

export interface BasketSwingParams {
  /** Places round the basket everyone opens out from where they began (0 or 1). */
  shift?: 0 | 1;
}

/** Radius of the basket. */
const RADIUS = 0.55;
/** Beats to close in, and to open out. */
const EDGE = 2;
/** A swing's pace round the basket, meters per beat. */
const PACE = 0.85;

const at = (c: Vec2, a: number, r: number): Vec2 => ({ x: c.x + r * Math.cos(a), z: c.z + r * Math.sin(a) });

export const basketSwing: Figure<BasketSwingParams> = (state, params, beats) => {
  onlyKeys('basket swing', params, ['shift']);
  const shift = params.shift ?? 0;
  if (shift !== 0 && shift !== 1) throw new Error('A basket opens out 0 or 1 place on.');
  if (state.hands.length) throw new Error('A basket starts with free hands.');
  const span = beats - 2 * EDGE;
  if (span < 4) throw new Error('Not enough beats to swing.');
  const { trios } = triosOf(state, 'basket swing');
  const turns = Math.max(1, Math.floor((PACE * span) / (TAU * RADIUS)));
  // Clockwise seen from above is a positive rotate(), increasing polar angle.
  const sweep = turns * TAU + (shift * TAU) / 3;
  const plans = trios.map((t) => {
    const f = { x: Math.sin(t.ahead), z: Math.cos(t.ahead) };
    const c0 = t.spot;
    const base = polar(f);
    const slots = [base, base + TAU / 3, base - TAU / 3];
    // The slot nearer the outside goes to the outside end.
    const outward = (a: number) => dot({ x: Math.cos(a), z: Math.sin(a) }, t.out);
    const [outSlot, inSlot] = outward(slots[1]) > outward(slots[2]) ? [slots[1], slots[2]] : [slots[2], slots[1]];
    const line = [t.inside, t.center, t.outside];
    const angle = new Map([
      [t.inside, inSlot],
      [t.center, slots[0]],
      [t.outside, outSlot],
    ]);
    const spots = new Map(line.map((id) => [id, body(state, id).position]));
    // Where each opens out: the line place whose slot it ends nearest.
    const ends = new Map<number, Vec2>();
    for (const id of line) {
      const a = angle.get(id)! + sweep;
      let best = line[0];
      for (const o of line)
        if (Math.abs(turn(angle.get(o)!, a)) < Math.abs(turn(angle.get(best)!, a))) best = o;
      ends.set(id, spots.get(best)!);
    }
    return { t, c0, line, angle, ends };
  });

  const motion = (beat: number) => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    const gather = smooth(window(beat, 0, EDGE));
    const open = smooth(window(beat, beats - EDGE, beats));
    const spin = sweep * progress(window(beat, EDGE, beats - EDGE));
    for (const p of plans) {
      for (const id of p.line) {
        const s = body(state, id);
        const ring = at(p.c0, p.angle.get(id)! + spin, RADIUS);
        const inward = heading(ring, p.c0);
        let position: Vec2;
        let yaw: number;
        if (open > 0) {
          position = mix(ring, p.ends.get(id)!, progress(window(beat, beats - EDGE, beats)));
          yaw = inward + turn(p.t.ahead, inward) * open;
        } else {
          position = mix(s.position, ring, progress(window(beat, 0, EDGE)));
          yaw = s.yaw + turn(inward, s.yaw) * gather;
        }
        bodies.push({ id, position, yaw });
      }
      const order = [...p.line].sort((a, b) => p.angle.get(a)! - p.angle.get(b)!);
      const strength = inOut(window(beat, EDGE * 0.6, beats - EDGE * 0.6), 0.08);
      for (let i = 0; i < 3; i++)
        contacts.push(hold(order[i], 'left', order[(i + 1) % 3], 'right', strength, bodies));
    }
    return { bodies, contacts };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
