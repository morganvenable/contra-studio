/**
 * Balance the wave.
 *
 * Definition: holding hands in a wave, step to one side and back, then to the
 * other side and back (a "right-left" balance), or step forward and back.
 * Before a Rory O'More the side balance starts toward the slide direction.
 * Source: Caller's Box glossary, "Balance"; ContraDB row "balance & Rory O'More
 * right" (dance 2321). Step size and timing ported from the balance half of
 * src/rory-slide.ts (0.1 m steps, one per beat).
 */
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined } from '../core/contacts.ts';
import { assertWaveHeld, findWave } from '../core/lines.ts';
import { add, ease, forward, rightOf, scale } from '../core/math.ts';
import { body, minorSets } from '../core/state.ts';

export interface BalanceParams {
  formation: 'wave';
  style?: 'right-left' | 'forward-back';
  /** Side to step toward first, for a right-left balance. */
  first?: 'right' | 'left';
}

const STEP = 0.1;
/** Offsets at each beat boundary: out, back, out the other way, back. */
const STEPS = [0, 1, 0, -1, 0];

export const balance: Figure<BalanceParams> = (state, params, beats) => {
  onlyKeys('balance', params, ['formation', 'style', 'first']);
  oneOf('balance', 'formation', params.formation, ['wave'] as const);
  const style = oneOf('balance', 'style', params.style ?? 'right-left', ['right-left', 'forward-back'] as const);
  const first = oneOf('balance', 'first', params.first ?? 'right', ['right', 'left'] as const);
  if (beats !== 4) throw new Error('A balance takes four beats.');
  const groups = minorSets(state);
  for (const g of groups) assertWaveHeld(state, findWave(state, g));

  const ids = groups.flat();
  const motion = (beat: number) => {
    const i = Math.min(3, Math.floor(beat));
    const u = beat - i;
    const q = STEPS[i] + (STEPS[i + 1] - STEPS[i]) * ease(u);
    return {
      bodies: ids.map((id) => {
        const b = body(state, id);
        const dir = style === 'forward-back' ? forward(b.yaw) : rightOf(b.yaw);
        const sign = style === 'right-left' && first === 'left' ? -1 : 1;
        return {
          id,
          position: add(b.position, scale(dir, STEP * q * sign)),
          yaw: b.yaw,
          lean: style === 'forward-back' ? 0.07 * q : 0,
        };
      }),
      contacts: state.hands.map((h) => joined(h, 1)),
    };
  };
  return { kind: 'wave-balance', motion, exit: settle(state, motion, beats) };
};
