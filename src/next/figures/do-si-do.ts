/**
 * Do-si-do (and see-saw).
 *
 * Definition: two dancers face each other, walk forward passing right
 * shoulders, slide across back to back, and walk backward passing left
 * shoulders to where they started, keeping the same facing throughout. A
 * see-saw passes left shoulders first. "1½" goes on around to the other
 * dancer's place, still facing the same way (so the pair ends back to back,
 * ready to meet someone new). "1¼" (or "¾") stops a quarter on, the pair
 * side by side facing opposite ways, ready for a short wave.
 * Source: Caller's Box glossary, "Do-si-do" and "See-saw"; ContraDB rows
 * "neighbors do si do once", "ladles do si do 1½". Pairs that start side by
 * side turn to face each other over the first beat and a half.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import {
  add,
  heading,
  length,
  mix,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import { body, minorSets, pairsIn, withChanges } from '../core/state.ts';

export interface DoSiDoParams {
  who: PairName;
  /** Times around: 1 (back home), 1.5 (to the other's place) ... */
  amount: number;
  /** Shoulder passed first: right for a do-si-do, left for a see-saw. */
  shoulder?: 'right' | 'left';
}

/** Half the gap between the pair as they pass shoulder to shoulder. */
const PASS_HALF = 0.33;
/** Half the gap a quarter-turn do-si-do ends at, side by side. */
const END_HALF = 0.45;
/** Far-apart pairs close in to this half distance in the middle of the figure. */
const MIDDLE_HALF = 0.75;
const CLOSE = 0.2;
const FACE_BEATS = 1.5;

export const doSiDo: Figure<DoSiDoParams> = (state, params, beats) => {
  onlyKeys('do-si-do', params, ['who', 'amount', 'shoulder']);
  const who = oneOf('do-si-do', 'who', params.who, PAIR_NAMES);
  const shoulder = oneOf('do-si-do', 'shoulder', params.shoulder ?? 'right', [
    'right',
    'left',
  ] as const);
  const amount = params.amount;
  if (!(amount > 0 && amount <= 3 && Number.isInteger(amount * 4)))
    throw new Error('Do-si-do amount must be a whole number of quarters around.');
  // A quarter more or less than a whole or half ends side by side, facing
  // opposite ways, as for a short wave: open out to a wave's hand gap.
  const sideBySide = !Number.isInteger(amount * 2);
  // Passing right shoulders goes clockwise from above: increasing polar angle.
  const sweep = (shoulder === 'right' ? 1 : -1) * amount * TAU;

  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const plans = pairs.flatMap(([a, b]) => {
    const pa = body(state, a);
    const pb = body(state, b);
    const center = mix(pa.position, pb.position, 0.5);
    const half = length(sub(pa.position, pb.position)) / 2;
    if (half < 0.3 || half > 1.4)
      throw new Error(`Dancers ${a} and ${b} are too far apart to do-si-do.`);
    return [
      [a, pa, pb],
      [b, pb, pa],
    ].map(([id, me, other]) => {
      const self = me as typeof pa;
      const axis = scale(sub(self.position, center), 1 / half);
      const side = rotate(axis, Math.PI / 2);
      const face = heading(self.position, (other as typeof pa).position);
      return { id: id as number, start: self, center, axis, side, half, face };
    });
  });

  const lateral = (t: number) =>
    sideBySide ? PASS_HALF + (END_HALF - PASS_HALF) * smooth((t - 0.75) / 0.25) : PASS_HALF;
  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      const t = beat / beats;
      const phi = sweep * progress(t);
      const close = Math.min(smooth(t / CLOSE), smooth((1 - t) / CLOSE));
      const along = p.half + (Math.min(p.half, MIDDLE_HALF) - p.half) * close;
      const position = add(
        p.center,
        add(scale(p.axis, along * Math.cos(phi)), scale(p.side, lateral(t) * Math.sin(phi))),
      );
      const yaw = p.start.yaw + turn(p.face, p.start.yaw) * smooth(beat / FACE_BEATS);
      return { id: p.id, position, yaw };
    }),
    contacts: [],
  });
  return {
    kind: 'do-si-do',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
