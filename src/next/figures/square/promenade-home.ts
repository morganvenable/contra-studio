/**
 * Promenade home in a square ("promenade home", "partners promenade along
 * the set on the right to home", "partners promenade around the set").
 *
 * Definition: each couple takes promenade hold and walks counterclockwise
 * round the square (the lark on the inside) to the lark's home place, then
 * wheels to face the center, the robin on the lark's right. A couple
 * already home goes once all the way round.
 * Source: Caller's Box glossary, "Promenade" and "Home"; Lloyd Shaw,
 * "Cowboy Dances" (promenade home to the gent's place); Colin Hume's
 * square instructions ("promenade along the set on the right" =
 * counterclockwise); ContraDB rows "promenade home", "partners promenade
 * around the set".
 * Readings: every couple must be the same number of places from home (as
 * after a grand right and left or a star). The couples wheel into promenade
 * hold and out of it as in the ring promenade (figures/ring-promenade.ts),
 * while the square draws in toward the middle and opens out again, so a
 * brisk promenade (half way round in 8 beats) walks a smaller ring at a
 * walking pace; a couple standing off its places drifts onto them.
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import type { Vec2 } from '../../../types.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { RING_CENTER, ringPlaces } from '../../core/formation-ring.ts';
import {
  add,
  heading,
  leftOf,
  length,
  mean,
  polar,
  positiveAngle,
  progress,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, minorSets, partnerOf, withChanges } from '../../core/state.ts';
import { bodyMap, withinReach } from '../../core/contacts.ts';
import { fastStyling } from '../../core/fast.ts';

export interface PromenadeHomeParams {
  who: 'partner';
  /** Places already home go all the way round (default), or stand. */
  fromHome?: 'around' | 'stay';
}

/**
 * How far (meters) the promenade draws in toward the center halfway round,
 * for a brisk promenade (half way round in 8 beats); a slower one less.
 */
const DRAW = 1.3;
/** Share of the figure spent wheeling into promenade, and back out. */
const WHEEL = 0.25;
/** Half the distance between partners in promenade hold. */
const HOLD_HALF = 0.3;
const SETTLE_BEATS = 1;
/** The walk speeds up and slows down smoothly, the couples wheeling meanwhile. */
const RAMP = 0.5;

export const promenadeHome: Figure<PromenadeHomeParams> = (state, params, beats) => {
  onlyKeys('promenade home', params, ['who', 'fromHome']);
  oneOf('promenade home', 'who', params.who, ['partner'] as const);
  const fromHome = oneOf('promenade home', 'fromHome', params.fromHome ?? 'around', [
    'around',
    'stay',
  ] as const);
  const ids = minorSets(state).flat();
  const n = state.dancers.length;
  if (n !== 8 || ids.length !== 8) throw new Error('Promenade home is for a square of four couples.');
  // Home places: lark k on place 2k, his partner on his right (formation-ring.ts).
  const places = ringPlaces(n, RING_CENTER, true).map((p) => p.position);
  const step = TAU / n;
  let need: number | undefined;
  for (const id of ids) {
    const d = state.dancers[id];
    if (d.role !== 'lark') continue;
    const robin = partnerOf(state, id);
    const now = sub(mean([body(state, id).position, body(state, robin).position]), RING_CENTER);
    const home = sub(mean([places[d.couple * 2], places[d.couple * 2 + 1]]), RING_CENTER);
    // Counterclockwise from above lowers the polar angle (core/math.ts).
    let k = Math.round(positiveAngle(polar(now) - polar(home)) / step) % n;
    if (k === 0 && fromHome === 'around') k = n;
    if (need !== undefined && need !== k)
      throw new Error('Every couple must be the same number of places from home.');
    need = k;
  }
  if (need === undefined) throw new Error('Nobody promenades.');
  if (need === 0) throw new Error('Everyone is already home.');
  const sweep = -need * step;
  const draw = DRAW * Math.min(1, (2 * need) / beats);
  const plans = ids
    .filter((id) => state.dancers[id].role === 'lark')
    .map((lark) => {
      const d = state.dancers[lark];
      const robin = partnerOf(state, lark);
      const a = body(state, lark);
      const b = body(state, robin);
      if (length(sub(a.position, b.position)) > 2.6)
        throw new Error('Partners promenade home from side by side.');
      const u0 = mean([a.position, b.position]);
      const uE = mean([places[d.couple * 2], places[d.couple * 2 + 1]]);
      const yaw0 = heading(u0, RING_CENTER);
      const half0 = length(sub(a.position, b.position)) / 2;
      const ideal0 = (sign: number) => add(u0, scale(leftOf(yaw0), sign * half0));
      return {
        lark,
        robin,
        a,
        b,
        theta0: polar(sub(u0, RING_CENTER)),
        r0: length(sub(u0, RING_CENTER)),
        rE: length(sub(uE, RING_CENTER)),
        half0,
        halfE: length(sub(places[d.couple * 2], places[d.couple * 2 + 1])) / 2,
        yaw0,
        dLark: sub(a.position, ideal0(1)),
        dRobin: sub(b.position, ideal0(-1)),
      };
    });
  const walk = {
    motion: (beat: number) => {
      const t = beat / beats;
      const q = progress(t, RAMP);
      const wheel = Math.min(smooth(t / WHEEL), smooth((1 - t) / WHEEL));
      const settleIn = 1 - smooth(beat / SETTLE_BEATS);
      const bodies = plans.flatMap((p) => {
        const r = p.r0 + (p.rE - p.r0) * smooth(t) - draw * Math.sin(Math.PI * q);
        const theta = p.theta0 + sweep * q;
        const unit = add(RING_CENTER, { x: r * Math.cos(theta), z: r * Math.sin(theta) });
        // Counterclockwise: a quarter turn right to face round the ring.
        const yaw = heading(unit, RING_CENTER) - (Math.PI / 2) * wheel;
        const half = p.half0 + (p.halfE - p.half0) * smooth(t);
        const off = scale(leftOf(yaw), half + (HOLD_HALF - half) * wheel);
        return [
          {
            id: p.lark,
            position: add(add(unit, off), scale(p.dLark, settleIn)),
            yaw: yaw + turn(p.a.yaw, p.yaw0) * settleIn,
          },
          {
            id: p.robin,
            position: add(sub(unit, off), scale(p.dRobin, settleIn)),
            yaw: yaw + turn(p.b.yaw, p.yaw0) * settleIn,
          },
        ];
      });
      const map = bodyMap(bodies);
      const strength = Math.min(
        smooth((t - WHEEL * 0.4) / (WHEEL * 0.4)),
        smooth((1 - t - WHEEL * 0.4) / (WHEEL * 0.4)),
      );
      const contacts: FigureContact[] = plans.flatMap((p) =>
        (['left', 'right'] as const).map((hand) =>
          withinReach({ a: p.lark, handA: hand, b: p.robin, handB: hand, kind: 'joined', strength }, map),
        ),
      );
      return { bodies, contacts };
    },
    kind: 'promenade' as const,
  };
  const walkExit = settle(state, walk.motion, beats);
  // Couples that started off their places (after lines or a swing in the
  // middle) drift onto the home places as they walk.
  const fix = new Map<number, { dp: Vec2; dyaw: number }>();
  for (const id of ids) {
    const d = state.dancers[id];
    if (d.role !== 'lark') continue;
    const robin = partnerOf(state, id);
    for (const [who, place] of [
      [id, places[d.couple * 2]],
      [robin, places[d.couple * 2 + 1]],
    ] as const) {
      const end = body(walkExit, who);
      fix.set(who, {
        dp: sub(place, end.position),
        dyaw: turn(heading(place, RING_CENTER), end.yaw),
      });
    }
  }
  const motion = (beat: number) => {
    const frame = walk.motion(beat);
    const k = smooth(beat / beats);
    return {
      ...frame,
      bodies: frame.bodies.map((b) => {
        const f = fix.get(b.id);
        if (!f) return b;
        return { ...b, position: add(b.position, scale(f.dp, k)), yaw: b.yaw + f.dyaw * k };
      }),
    };
  };
  return {
    ...walk,
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
    // All the way round from home in a few beats (8) is faster than a walk:
    // a styled brisk promenade, reported rather than failed (core/fast.ts).
    ...fastStyling('brisk promenade', motion, beats),
  };
};
