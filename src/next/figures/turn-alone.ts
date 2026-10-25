/**
 * Turn alone.
 *
 * Definition: each dancer turns around in place, a half turn, to face the
 * other way. Dancers turn toward their partner (so a couple side by side
 * turns face to face through the turn, as when lines turn alone).
 * Source: Caller's Box glossary, "Turn alone"; ContraDB rows "turn alone"
 * after a pass through or a circle. Couples waiting out at the ends are not
 * dancing and stay as they are. "Robins turn alone over their right
 * shoulder": only that role turns, the named way (over the right shoulder is
 * clockwise seen from above).
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { progress } from '../core/math.ts';
import { activeIds, body, handToward, partnerOf, withChanges } from '../core/state.ts';

export interface TurnAloneParams {
  /** Only this role (or this numbered couple) turns. */
  who?: 'larks' | 'robins' | '1s' | '2s';
  /** Turn over this shoulder instead of toward the partner. */
  over?: 'right' | 'left';
}

export const turnAlone: Figure<TurnAloneParams> = (state, params, beats) => {
  onlyKeys('turn alone', params, ['who', 'over']);
  const who =
    params.who === undefined
      ? undefined
      : oneOf('turn alone', 'who', params.who, ['larks', 'robins', '1s', '2s'] as const);
  const named = (id: number) =>
    who === undefined ||
    (who === '1s' || who === '2s'
      ? (state.positions.get(who) ?? []).includes(id)
      : state.dancers[id].role === who.slice(0, -1));
  const over =
    params.over === undefined
      ? undefined
      : oneOf('turn alone', 'over', params.over, ['right', 'left'] as const);
  const turners = activeIds(state).filter(named);
  const plans = turners.map((id) => {
    const self = body(state, id);
    const toward = over ?? handToward(self, body(state, partnerOf(state, id)).position);
    // Turning right decreases yaw.
    return { id, self, sweep: toward === 'right' ? -Math.PI : Math.PI };
  });
  const motion = (beat: number) => ({
    bodies: plans.map((p) => ({
      id: p.id,
      position: p.self.position,
      yaw: p.self.yaw + p.sweep * progress(beat / beats, 0.3),
    })),
    contacts: [],
  });
  return {
    kind: 'unknown',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
