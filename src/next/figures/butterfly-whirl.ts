/**
 * Butterfly whirl.
 *
 * Definition: partners side by side, the lark's right arm around the
 * robin's waist, turn clockwise (seen from above) as a couple around the
 * point between them, the lark backing up and the robin walking forward.
 * It usually follows a star promenade and ends with each couple back on its
 * side of the set, side by side facing in across it, lark on the left.
 * Source: Caller's Box glossary, "Butterfly whirl"; ContraDB rows "star
 * promenade left ½" then "butterfly whirl". The source gives no amount: the
 * couple turns clockwise from where it is to facing in, at least half a turn
 * (as the old engine's reading: 1⅜ turns from its star promenade exit). The
 * couple whirls close together and opens out to its side places over the
 * last quarter, so no one outruns a walk.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import {
  add,
  length,
  leftOf,
  mean,
  mix,
  polar,
  positiveAngle,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, minorSets, pairsIn, roleOf, withChanges } from '../core/state.ts';

/** Partners' distance apart while whirling. */
const CLOSE = 0.6;
/** Share of the figure spent opening out to the side places. */
const OPEN = 0.3;
/** Share of the figure by which the whirl itself is done. */
const WHIRL_END = 0.85;

/** Couple facing with the robin on the lark's right: d = robin - lark. */
const coupleYaw = (d: Vec2) => Math.atan2(d.z, -d.x);

export const butterflyWhirl: Figure<Record<string, never>> = (state, params, beats) => {
  onlyKeys('butterfly whirl', params, []);
  const plans = minorSets(state).flatMap((g) => {
    const middle = mean(g.map((id) => body(state, id).position));
    return pairsIn(state, g, 'partner').map(([a, b]) => {
      const lark = roleOf(state, a) === 'lark' ? a : b;
      const robin = lark === a ? b : a;
      const pl = body(state, lark);
      const pr = body(state, robin);
      const c0 = mean([pl.position, pr.position]);
      const d0 = sub(pr.position, pl.position);
      const side = Math.sign(c0.x - middle.x);
      if (Math.abs(c0.x - middle.x) < 0.15)
        throw new Error('A butterfly whirl ends on a side; this couple is in the middle.');
      const yaw1 = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const c1 = { x: middle.x + side * SET.halfWidth, z: c0.z };
      const d1 = scale(leftOf(yaw1), -SET.slot);
      let sweep = positiveAngle(polar(d1) - polar(d0));
      if (sweep < Math.PI) sweep += TAU;
      const yaw0 = coupleYaw(d0);
      return {
        lark,
        robin,
        pl,
        pr,
        c0,
        c1,
        u0: scale(d0, 1 / Math.max(1e-6, length(d0))),
        sep0: length(d0),
        sweep,
        yaw0,
      };
    });
  });

  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = plans.flatMap((p) => {
      // The whirl slows to its end as the couple opens out to its places.
      const a = p.sweep * progress(Math.min(1, t / WHIRL_END));
      const center = mix(p.c0, p.c1, smooth(t));
      const apart =
        t < 0.5
          ? p.sep0 + (CLOSE - p.sep0) * smooth(t / 0.2)
          : CLOSE + (SET.slot - CLOSE) * smooth((t - (1 - OPEN)) / OPEN);
      const d = scale(rotate(p.u0, a), apart);
      const yaw = p.yaw0 - a;
      // Each dancer turns from their own facing to the couple's over the first beat.
      const blend = smooth(beat / 1);
      return [
        {
          id: p.lark,
          position: sub(center, scale(d, 0.5)),
          yaw: p.pl.yaw + turn(yaw, p.pl.yaw) * blend,
        },
        {
          id: p.robin,
          position: add(center, scale(d, 0.5)),
          yaw: p.pr.yaw + turn(yaw, p.pr.yaw) * blend,
        },
      ];
    });
    const strength = smooth(t / 0.1) * smooth((1 - OPEN - t) / 0.1);
    const contacts: FigureContact[] = plans.map((p) => ({
      a: p.lark,
      handA: 'right',
      b: p.robin,
      handB: 'left',
      kind: 'joined',
      target: 'waist',
      strength,
    }));
    return { bodies, contacts };
  };
  return {
    kind: 'butterfly-whirl',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
