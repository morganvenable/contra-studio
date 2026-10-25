/**
 * Sashay in & out (partners in a ring): "sashay in & out" (Celebration,
 * dance 554), after "face partner and take two hands".
 *
 * Definition: the pair turns to face each other and takes two hands, draws
 * in to an easy two-hand hold, slides sideways into the middle of the ring
 * and back out to their places, and opens out again, still facing.
 * Source: Caller's Box glossary, "Sashay" (slide sideways, facing, both
 * hands joined); ContraDB dance 554.
 * Reading: they end on their own places facing each other (a sashay that
 * follows starts from there; a figure after them turns them on).
 * Runs per pair in the radial frame (layout.ts): the center of the ring is
 * straight across (-x), the pair on its side line along z.
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, withinReach } from '../../core/contacts.ts';
import { add, heading, mean, progress, scale, smooth, sub, turn } from '../../core/math.ts';
import { body, minorSets, pairsIn, roleOf, withChanges } from '../../core/state.ts';

export interface SashayParams {
  who: 'partner' | 'neighbor';
  /** How far into the middle, meters. */
  depth?: number;
}

/** Each dancer steps this far toward the other for the two-hand hold. */
const CLOSE = 0.4;
const DEPTH = 1;

export const sashay: Figure<SashayParams> = (state, params, beats) => {
  onlyKeys('sashay', params, ['who', 'depth']);
  const who = oneOf('sashay', 'who', params.who, ['partner', 'neighbor'] as const);
  const depth = params.depth ?? DEPTH;
  if (!(depth > 0 && depth <= 2)) throw new Error('A sashay goes up to 2 m in.');
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  // Into the middle: -x in the radial frame.
  const inward = { x: -1, z: 0 };
  const plans = pairs.flatMap(([a, b]) => {
    if (roleOf(state, a) === roleOf(state, b)) throw new Error('A sashay pairs a lark with a robin.');
    const c = mean([a, b].map((id) => body(state, id).position));
    return [a, b].map((id) => {
      const s = body(state, id);
      const toward = sub(c, s.position);
      const half = Math.hypot(toward.x, toward.z);
      if (half < 0.3) throw new Error('A sashay starts from apart.');
      const unit = scale(toward, 1 / half);
      const face = heading(s.position, c);
      return { id, s, unit, close: Math.min(CLOSE, half - 0.45), twist: turn(face, s.yaw) };
    });
  });
  const motion = (beat: number) => {
    const t = beat / beats;
    const close = Math.min(smooth(t / 0.2), smooth((1 - t) / 0.2));
    const slide =
      t < 0.5 ? progress(Math.min(1, Math.max(0, (t - 0.1) / 0.4))) : 1 - progress(Math.min(1, Math.max(0, (t - 0.5) / 0.4)));
    const bodies = plans.map((p) => ({
      id: p.id,
      position: add(add(p.s.position, scale(p.unit, p.close * close)), scale(inward, depth * slide)),
      yaw: p.s.yaw + p.twist * smooth(t / 0.15),
    }));
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = [];
    for (const [a, b] of pairs) {
      for (const hand of ['left', 'right'] as const) {
        const other = hand === 'left' ? 'right' : 'left';
        contacts.push(
          withinReach({ a, handA: hand, b, handB: other, kind: 'joined', strength: close }, map),
        );
      }
    }
    return { bodies, contacts };
  };
  return {
    kind: 'balance',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
