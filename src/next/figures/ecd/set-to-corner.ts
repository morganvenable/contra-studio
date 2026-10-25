/**
 * Set to corners (ECD): the active couple and their first (or second)
 * corners face each other and set (a balance in place).
 *
 * Definition: each active dancer and their corner turn to face each other
 * and set: a small step toward each other and back (step right, step left),
 * staying in their places. Corners are as in contra corners: the two
 * dancers on the partner's line in the places above and below; the first
 * is the one on the active's left on crossing toward the partner's line.
 * Source: Playford/ECD manuals ("set to corners"); ContraDB row "ones set
 * to first corners" (Duke of Perth).
 * Reading: setting is drawn as a step toward each other and back, the
 * dancers ending facing each other.
 */
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { add, dot, heading, leftOf, mean, scale, smooth, sub, forward } from '../../core/math.ts';
import { body, partnerOf, withChanges } from '../../core/state.ts';
import { choreograph, type Path, placeOf, places, sideSign } from './common.ts';

export interface SetToCornerParams {
  who: string;
  corner: 'first' | 'second';
}

/** How far each dancer steps toward the other while setting. */
const STEP = 0.2;

export const setToCorner: Figure<SetToCornerParams> = (state, params, beats) => {
  onlyKeys('set-to-corner', params, ['who', 'corner']);
  const which = oneOf('set-to-corner', 'corner', params.corner, ['first', 'second'] as const);
  const all = places(state);
  const m = placeOf(state, all, params.who, 'set-to-corner');
  if (m === 0 || m === all.length - 1)
    throw new Error(`set-to-corner: the ${params.who} need a couple above and below.`);
  const actives = [all[m].lark, all[m].robin];
  const center = mean(actives.map((id) => body(state, id).position));
  const paths = new Map<number, Path>();
  for (const x of actives) {
    const y = partnerOf(state, x);
    const corners = [all[m - 1], all[m + 1]].map((c) =>
      sideSign(state, c.lark) === sideSign(state, y) ? c.lark : c.robin,
    );
    const toward = heading(body(state, x).position, body(state, y).position);
    corners.sort(
      (a, b) =>
        dot(leftOf(toward), sub(body(state, b).position, center)) -
        dot(leftOf(toward), sub(body(state, a).position, center)),
    );
    const k = corners[which === 'first' ? 0 : 1];
    for (const [id, other] of [
      [x, k],
      [k, x],
    ]) {
      const p0 = body(state, id).position;
      const face = heading(p0, body(state, other).position);
      paths.set(id, {
        pos: (u) => add(p0, scale(forward(face), STEP * Math.sin(Math.PI * smooth(u)))),
        yaw: () => face,
        unwrap: true,
      });
    }
  }
  const bodies = choreograph(state, beats, paths, 0.75);
  const motion = (beat: number) => ({ bodies: bodies(beat), contacts: [] });
  return { kind: 'balance', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
