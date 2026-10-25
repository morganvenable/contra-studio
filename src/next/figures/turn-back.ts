/**
 * Turn back ("robins turn back over right shoulder", "larks turn around").
 *
 * Definition: the named dancers (everyone in the minor sets when none is
 * named) turn half around in place, over the named shoulder (the right
 * when none is named), to face the other way. Others stand still.
 * Source: trailing clauses of ContraDB rows, "star right 3 places; robins
 * turn back over right shoulder", "star right 4 places robins turn around",
 * "star right 4 places and larks turn out over left shoulder".
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { progress } from '../core/math.ts';
import { activeIds, body, groupCenter, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface TurnBackParams {
  /** 'centers' and 'ends': the two of each minor set nearest its middle, or farthest. */
  who?: 'larks' | 'robins' | '1s' | '2s' | 'centers' | 'ends';
  shoulder?: 'right' | 'left';
}

export const turnBack: Figure<TurnBackParams> = (state, params, beats) => {
  onlyKeys('turn back', params, ['who', 'shoulder']);
  const who =
    params.who === undefined
      ? undefined
      : oneOf('turn back', 'who', params.who, [
          'larks',
          'robins',
          '1s',
          '2s',
          'centers',
          'ends',
        ] as const);
  const middleTwo = new Set(
    minorSets(state).flatMap((g) => {
      const c = groupCenter(state, g);
      const d = (id: number) =>
        Math.hypot(body(state, id).position.x - c.x, body(state, id).position.z - c.z);
      return [...g].sort((x, y) => d(x) - d(y)).slice(0, 2);
    }),
  );
  const shoulder = oneOf('turn back', 'shoulder', params.shoulder ?? 'right', [
    'right',
    'left',
  ] as const);
  const named = (id: number) =>
    who === undefined ||
    (who === 'centers' || who === 'ends'
      ? middleTwo.has(id) === (who === 'centers')
      : who === 'larks' || who === 'robins'
        ? roleOf(state, id) === (who === 'larks' ? 'lark' : 'robin')
        : (state.positions.get(who)?.includes(id) ?? false));
  // Over the right shoulder is turning right: yaw decreases.
  const sweep = shoulder === 'right' ? -Math.PI : Math.PI;
  const plans = activeIds(state)
    .filter(named)
    .map((id) => ({ id, self: body(state, id) }));
  if (!plans.length) throw new Error(`No ${who} here to turn back.`);
  const motion = (beat: number) => ({
    bodies: plans.map((p) => ({
      id: p.id,
      position: p.self.position,
      yaw: p.self.yaw + sweep * progress(beat / beats, 0.3),
    })),
    contacts: [],
  });
  return {
    kind: 'unknown',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
