/**
 * Promenade round the ring (a circle mixer, a square: "partners promenade",
 * "promenade home", "promenade counterclockwise").
 *
 * Definition: each couple (side by side facing in, the robin on the lark's
 * right) takes promenade hold and wheels to face round the ring, then walks
 * round as a couple and wheels back to face the center on new places.
 * Counterclockwise (seen from above, the line of dance; the lark on the
 * inside) unless the caller says clockwise. Distance: the places named
 * (two per couple), or times round (1 = all the way home), else as many
 * couples' places as an easy walk (0.6 m a beat) covers.
 * Source: Caller's Box glossary, "Promenade"; Lloyd Shaw, "Cowboy Dances"
 * (promenade in the line of direction, lady on the right).
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import { SET } from '../core/config.ts';
import {
  add,
  heading,
  leftOf,
  length,
  mean,
  mix,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import { body, minorSets, partnerOf, withChanges } from '../core/state.ts';

export interface RingPromenadeParams {
  who: 'partner';
  direction?: 'ccw' | 'cw';
  /** Dancer places round the ring (two per couple). */
  places?: number;
  /** Or times round (1 = all the way home). */
  amount?: number;
}

/** Share of the figure spent wheeling into promenade, and back out. */
const WHEEL = 0.2;
/** A wheel takes at least this many beats, so a short promenade wheels at a walk. */
const WHEEL_BEATS = 2.6;
/** Half the distance between partners in promenade hold. */
const HOLD_HALF = 0.3;
const SETTLE_BEATS = 1;
/** An easy promenade walk, meters per beat. */
const WALK = 0.55;

export const ringPromenade: Figure<RingPromenadeParams> = (state, params, beats) => {
  onlyKeys('promenade', params, ['who', 'direction', 'places', 'amount']);
  oneOf('promenade', 'who', params.who, ['partner'] as const);
  const direction = oneOf('promenade', 'direction', params.direction ?? 'ccw', [
    'ccw',
    'cw',
  ] as const);
  if (params.places !== undefined && params.amount !== undefined)
    throw new Error('A promenade goes either some places or some times round.');
  // Clockwise from above is a positive rotation (core/math.ts).
  const sign = direction === 'cw' ? 1 : -1;
  const plans = minorSets(state).flatMap((g) => {
    const center = mean(g.map((id) => body(state, id).position));
    const n = g.length;
    const places =
      params.places ??
      (params.amount !== undefined
        ? params.amount * n
        : 2 * Math.max(1, Math.floor((WALK * beats) / (2 * SET.slot))));
    if (!(places > 0 && places <= 3 * n))
      throw new Error('A promenade goes up to three times round.');
    const sweep = (sign * places * TAU) / n;
    return g
      .filter((id) => state.dancers[id].role === 'lark')
      .map((lark) => {
        const robin = partnerOf(state, lark);
        if (!g.includes(robin)) throw new Error('Partners promenade together.');
        const a = body(state, lark);
        const b = body(state, robin);
        if (length(sub(a.position, b.position)) > 2.2)
          throw new Error('Partners promenade from side by side.');
        const unit = mix(a.position, b.position, 0.5);
        if (length(sub(unit, center)) < 0.5) throw new Error('Couples promenade round a ring.');
        const yaw0 = heading(unit, center);
        const half = length(sub(a.position, unit));
        const off = (yaw: number, h: number) => scale(leftOf(yaw), h);
        // How far each starts from the ideal couple shape; blended out.
        const dLark = sub(a.position, add(unit, off(yaw0, half)));
        const dRobin = sub(b.position, sub(unit, off(yaw0, half)));
        return { lark, robin, a, b, unit, yaw0, half, center, sweep, dLark, dRobin, off };
      });
  });
  const motion = (beat: number) => {
    const t = beat / beats;
    const settleIn = 1 - smooth(beat / SETTLE_BEATS);
    const wheelShare = Math.min(0.4, Math.max(WHEEL, WHEEL_BEATS / beats));
    const bodies = plans.flatMap((p) => {
      // Travel eases in and out over the wheels, so a wheel adds little to the walk.
      const angle = p.sweep * progress(t, wheelShare);
      const unit = add(p.center, rotate(sub(p.unit, p.center), angle));
      const wheel = Math.min(smooth(t / wheelShare), smooth((1 - t) / wheelShare));
      // Counterclockwise: a quarter turn right to face round the ring.
      const yaw = p.yaw0 - angle + (p.sweep < 0 ? -1 : 1) * (Math.PI / 2) * wheel;
      const h = p.half + (HOLD_HALF - p.half) * wheel;
      return [
        {
          id: p.lark,
          position: add(add(unit, p.off(yaw, h)), scale(p.dLark, settleIn)),
          yaw: yaw + turn(p.a.yaw, p.yaw0) * settleIn,
        },
        {
          id: p.robin,
          position: add(sub(unit, p.off(yaw, h)), scale(p.dRobin, settleIn)),
          yaw: yaw + turn(p.b.yaw, p.yaw0) * settleIn,
        },
      ];
    });
    const map = bodyMap(bodies);
    const share = Math.min(0.4, Math.max(WHEEL, WHEEL_BEATS / beats));
    const strength = Math.min(
      smooth((t - share * 0.4) / (share * 0.4)),
      smooth((1 - t - share * 0.4) / (share * 0.4)),
    );
    const contacts: FigureContact[] = plans.flatMap((p) =>
      (['left', 'right'] as const).map((hand) =>
        withinReach({ a: p.lark, handA: hand, b: p.robin, handB: hand, kind: 'joined', strength }, map),
      ),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'promenade',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
