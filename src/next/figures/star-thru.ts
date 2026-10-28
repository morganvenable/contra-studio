/**
 * Star thru.
 *
 * Definition: two dancers facing each other join the lark's right hand with
 * the robin's left; the robin turns a quarter to the left under the joined
 * hands while the lark turns a quarter to the right, and they pass to end
 * side by side in each other's places, the lark on the left, both facing the way the lark's right
 * hand pointed. Source: square dance definition (Callerlab "Star Thru");
 * ContraDB rows "neighbors balance and star through", "star thru (use
 * inside hands)". Two dancers of the same role can't star thru.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import { add, mix, progress, rightOf, scale, smooth, sub, turn } from '../core/math.ts';
import { facingPairs } from '../core/facing.ts';
import { body, minorSets, pairsIn, roleOf, withChanges } from '../core/state.ts';

export interface StarThruParams {
  who: 'partner' | 'neighbor' | '1s' | '2s' | 'facing';
}

/** Half the gap between the two side by side at the end. */
const HALF_GAP = 0.45;
/** Farthest apart they end: in each other's places when they start that close. */
const MAX_HALF = 0.9;
/** Sidesteps as they pass: the robin passes close beneath the raised hands, the lark steps around. */
const LARK_SIDESTEP = 0.45;
const ROBIN_SIDESTEP = 0.15;

export const starThru: Figure<StarThruParams> = (state, params, beats) => {
  onlyKeys('star thru', params, ['who']);
  const who = oneOf('star thru', 'who', params.who, [
    'partner',
    'neighbor',
    '1s',
    '2s',
    'facing',
  ] as const);
  const pairs =
    who === 'facing'
      ? facingPairs(state, minorSets(state).flat())
      : minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const moves = pairs.flatMap(([x, y]) => {
    const lark = roleOf(state, x) === 'lark' ? x : y;
    const robin = lark === x ? y : x;
    if (roleOf(state, robin) !== 'robin') throw new Error('A star thru needs a lark and a robin.');
    const pl = body(state, lark);
    const pr = body(state, robin);
    const middle = mix(pl.position, pr.position, 0.5);
    const d = sub(pr.position, pl.position);
    const n = Math.hypot(d.x, d.z);
    if (n < 0.3) throw new Error('A star thru starts facing each other a step apart.');
    const f = { x: d.x / n, z: d.z / n };
    const yaw = Math.atan2(f.x, f.z);
    // Both end facing the lark's right, side by side, lark on the left.
    const right = rightOf(yaw);
    const endYaw = Math.atan2(right.x, right.z);
    // They trade places (up to arm's length apart), the robin under the arch.
    const half = Math.max(HALF_GAP, Math.min(MAX_HALF, n / 2));
    const larkEnd = add(middle, scale(f, half));
    const robinEnd = add(middle, scale(f, -half));
    return [
      {
        id: lark,
        from: pl,
        to: larkEnd,
        side: scale(right, LARK_SIDESTEP),
        yaw: endYaw,
        hand: 'right' as const,
      },
      {
        id: robin,
        from: pr,
        to: robinEnd,
        side: scale(right, -ROBIN_SIDESTEP),
        yaw: endYaw,
        hand: 'left' as const,
      },
    ];
  });
  const partnerOf = new Map<number, number>();
  for (let i = 0; i < moves.length; i += 2) {
    partnerOf.set(moves[i].id, moves[i + 1].id);
  }
  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = moves.map((m) => ({
      id: m.id,
      position: add(mix(m.from.position, m.to, q), scale(m.side, Math.sin(Math.PI * q))),
      yaw: m.from.yaw + turn(m.yaw, m.from.yaw) * smooth(beat / beats),
    }));
    const map = bodyMap(bodies);
    const strength = Math.min(smooth(beat / beats / 0.2), smooth((1 - beat / beats) / 0.15));
    const contacts: FigureContact[] = [...partnerOf].map(([lark, robin]) =>
      withinReach(
        { a: lark, handA: 'right', b: robin, handB: 'left', kind: 'arch', underId: robin, strength },
        map,
      ),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'california-twirl',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
