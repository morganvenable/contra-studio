/**
 * Birdie in the cage.
 *
 * Definition: one dancer (the birdie) stands in the middle while the others
 * join hands in a ring round them and circle left (or right). The ring
 * closes up evenly round the birdie to take hands and opens back to its
 * places at the end; the birdie stays in the middle, facing in from the
 * place they left, ready to step back out.
 * Source: Caller's Box glossary, "Birdie in the cage" (an old square-dance
 * figure: "birdie in the cage and seven hands round"); ContraDB 2387 (Tighten
 * Your Lugnuts), "birdie in the cage (other dancers circle left around the
 * 1)".
 * Reading: once round unless an amount is given, so the ring ends on the
 * places it started from (the birdie's place still empty).
 */
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { heading, mix, progress, smooth, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { everyone, hold, inOut, named, ringWithGap, TAU } from './common.ts';

export interface BirdieParams {
  /** Position label naming the birdie. */
  who: string;
  direction?: 'left' | 'right';
  /** Times round (default once). */
  amount?: number;
}

/** The ring draws in this far while hands are joined. */
const TIGHTEN = 0.2;
const EDGE = 0.15;
/** Beats the birdie takes to step into the middle. */
const STEP_IN = 2;

export const birdieInTheCage: Figure<BirdieParams> = (state, params, beats) => {
  onlyKeys('birdie in the cage', params, ['who', 'direction', 'amount']);
  const direction = oneOf('birdie in the cage', 'direction', params.direction ?? 'left', [
    'left',
    'right',
  ] as const);
  const amount = params.amount ?? 1;
  if (!(amount > 0 && amount <= 2)) throw new Error('The cage circles up to twice round.');
  const birds = named(state, params.who, 'birdie in the cage');
  if (birds.length !== 1) throw new Error('One birdie goes in the cage.');
  const bird = birds[0];
  if (state.hands.length) throw new Error('Birdie in the cage starts with free hands.');
  const cage = everyone(state).filter((id) => id !== bird);
  if (cage.length < 3) throw new Error('The cage needs at least three dancers.');
  const ring = ringWithGap(state, cage);
  const m = ring.order.length;
  const angles = ring.order.map((id) => {
    const p = body(state, id).position;
    return Math.atan2(p.z - ring.center.z, p.x - ring.center.x);
  });
  // Unwrap so the order runs on round the ring, then space evenly.
  for (let i = 1; i < m; i++) while (angles[i] < angles[i - 1]) angles[i] += TAU;
  const even = angles.map((_, i) => (i * TAU) / m);
  const shift = angles.reduce((n, a, i) => n + a - even[i], 0) / m;
  const sweep = (direction === 'left' ? 1 : -1) * amount * TAU;
  const birdStart = body(state, bird);
  const birdFace = heading(ring.empty, ring.center);

  const motion = (beat: number) => {
    const t = beat / beats;
    const w = inOut(t, EDGE);
    const bodies: MovedBody[] = ring.order.map((id, i) => {
      const s = body(state, id);
      const r0 = Math.hypot(s.position.x - ring.center.x, s.position.z - ring.center.z);
      const a = angles[i] + (even[i] + shift - angles[i]) * w + sweep * progress(t);
      const r = r0 - TIGHTEN * w;
      const position = { x: ring.center.x + r * Math.cos(a), z: ring.center.z + r * Math.sin(a) };
      const off = turn(s.yaw, heading(s.position, ring.center));
      return { id, position, yaw: heading(position, ring.center) + off * (1 - smooth(beat)) };
    });
    const u = Math.min(1, beat / STEP_IN);
    bodies.push({
      id: bird,
      position: mix(birdStart.position, ring.center, progress(u)),
      yaw: birdStart.yaw + turn(birdFace, birdStart.yaw) * smooth(u),
    });
    const strength = inOut(t, 0.2);
    const contacts: FigureContact[] = ring.order.map((id, i) =>
      hold(id, 'left', ring.order[(i + 1) % m], 'right', strength, bodies),
    );
    return { bodies, contacts };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
