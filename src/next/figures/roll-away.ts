/**
 * Roll away with a half sashay.
 *
 * Definition: two dancers side by side trade places: the one being rolled
 * crosses in front of the other, spinning once toward the way she travels,
 * while the other slides sideways behind her. "Larks roll away neighbors"
 * means each lark rolls his neighbor (the neighbor spins). Both keep facing
 * the way they faced.
 * Source: Caller's Box glossary, "Roll away with a half sashay"; ContraDB
 * rows "gentlespoons roll away neighbors with a half sashay" (usually right
 * after "long lines forward"). Dancers standing in from their side line roll
 * away on the way back to it, everyone facing across. The spin is part of the figure's definition
 * and stays within the ordinary turn limit.
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import type { Vec2 } from '../../types.ts';
import { SET } from '../core/config.ts';
import {
  add,
  dot,
  ease,
  forward,
  leftOf,
  mix,
  progress,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, groupCenter, minorSets, related, roleOf, withChanges } from '../core/state.ts';

export interface RollAwayParams {
  /** Who does the rolling (stays upright, slides behind). */
  who: 'larks' | 'robins';
  /** Whom they roll across in front of them. */
  whom: 'partner' | 'neighbor';
}

/** How far in front the rolled dancer passes, and behind the slider. */
const FRONT = 0.35;
const BEHIND = 0.2;
const FACE_BEATS = 1;

export const rollAway: Figure<RollAwayParams> = (state, params, beats) => {
  onlyKeys('roll away', params, ['who', 'whom']);
  const who = oneOf('roll away', 'who', params.who, ['larks', 'robins'] as const);
  const whom = oneOf('roll away', 'whom', params.whom, ['partner', 'neighbor'] as const);
  const role = who === 'larks' ? 'lark' : 'robin';
  const moves = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    return g
      .filter((id) => roleOf(state, id) === role)
      .flatMap((roller) => {
        const rolled = related(state, whom, roller);
        if (rolled === undefined || !g.includes(rolled))
          throw new Error(`Dancer ${roller} has no ${whom} here to roll away.`);
        const a = body(state, roller);
        const b = body(state, rolled);
        // Both face across the set; dancers standing in from their side line
        // (after long lines forward) roll away on the way back to it.
        const sideX = Math.sign(a.position.x - middle.x);
        if (sideX === 0 || Math.sign(b.position.x - middle.x) !== sideX)
          throw new Error('A roll away needs the two side by side on one side.');
        const yaw = sideX > 0 ? -Math.PI / 2 : Math.PI / 2;
        const lineX = middle.x + sideX * SET.halfWidth;
        const onLine = (p: Vec2) => ({ x: lineX, z: p.z });
        const ahead = forward(yaw);
        // The rolled dancer travels toward the roller's side: left or right of her facing.
        const toward = Math.sign(dot(sub(a.position, b.position), leftOf(yaw)));
        return [
          {
            id: roller,
            from: a,
            to: onLine(b.position),
            yaw,
            offset: scale(ahead, -BEHIND),
            spin: 0,
          },
          {
            id: rolled,
            from: b,
            to: onLine(a.position),
            yaw,
            offset: scale(ahead, FRONT),
            spin: toward * TAU,
          },
        ];
      });
  });
  const motion = (beat: number) => ({
    bodies: moves.map((m) => {
      const q = progress(beat / beats);
      const position = add(mix(m.from.position, m.to, q), scale(m.offset, Math.sin(Math.PI * q)));
      const face = m.from.yaw + turn(m.yaw, m.from.yaw) * smooth(beat / FACE_BEATS);
      return { id: m.id, position, yaw: face + m.spin * ease(beat / beats) };
    }),
    contacts: [],
  });
  return {
    kind: 'rollaway',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
