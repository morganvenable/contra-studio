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
 * away on the way back to it, everyone facing across. The spin is part of the figure's definition;
 * in four beats or more it stays within the ordinary turn limit, and a quicker
 * roll away reports it as styled motion.
 *
 * Anywhere else the two only need to stand side by side: in a ring ("balance
 * the ring, larks roll away partners") they face the middle, and the rolled
 * dancer crosses in front, toward the middle, ending in the roller's place
 * still facing the middle; two side by side facing the same way keep that
 * facing. "Across" or "along the set" in the row names the way the rolled
 * dancer crosses, and is checked against where the two stand.
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
import {
  body,
  groupCenter,
  minorSets,
  related,
  roleOf,
  withChanges,
  type Body,
} from '../core/state.ts';

export interface RollAwayParams {
  /** Who does the rolling (stays upright, slides behind). */
  who: 'larks' | 'robins';
  /**
   * Whom they roll across in front of them. A shadow is the dancer of the
   * other role beside them who is neither partner nor neighbor.
   */
  whom: 'partner' | 'neighbor' | 'shadow' | 'next-neighbor' | 'larks' | 'robins';
  /** The way the rolled dancer crosses, when the row says. */
  axis?: 'across' | 'along';
}

/** How far in front the rolled dancer passes, and behind the slider. */
const FRONT = 0.35;
const BEHIND = 0.2;
const FACE_BEATS = 1;

export const rollAway: Figure<RollAwayParams> = (state, params, beats) => {
  onlyKeys('roll away', params, ['who', 'whom', 'axis']);
  const axis =
    params.axis === undefined
      ? undefined
      : oneOf('roll away', 'axis', params.axis, ['across', 'along'] as const);
  const who = oneOf('roll away', 'who', params.who, ['larks', 'robins'] as const);
  const whom = oneOf('roll away', 'whom', params.whom, ['partner', 'neighbor', 'shadow', 'next-neighbor', 'larks', 'robins'] as const);
  const active = minorSets(state).flat();
  const beside = (id: number) => {
    const me = body(state, id);
    let best: number | undefined;
    let bestD = 2.2;
    for (const o of active) {
      // A shadow is the other role beside you, neither partner nor neighbor;
      // a role ("robins roll away larks") is whoever of that role is beside you.
      if (whom === 'larks' || whom === 'robins') {
        if (roleOf(state, o) !== (whom === 'larks' ? 'lark' : 'robin')) continue;
      } else if (roleOf(state, o) === roleOf(state, id)) continue;
      if (whom === 'shadow' && (o === related(state, 'partner', id) || o === related(state, 'neighbor', id))) continue;
      const d = Math.hypot(
        body(state, o).position.x - me.position.x,
        body(state, o).position.z - me.position.z,
      );
      if (d < bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  };
  const role = who === 'larks' ? 'lark' : 'robin';
  const moves = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    return g
      .filter((id) => roleOf(state, id) === role)
      .flatMap((roller) => {
        // The named dancer when they stand here, else whoever is beside.
        const named = whom === 'partner' || whom === 'neighbor' ? related(state, whom, roller) : undefined;
        const rolled = named !== undefined && g.includes(named) ? named : beside(roller);
        if (rolled === undefined)
          throw new Error(`Dancer ${roller} has no ${whom} here to roll away.`);
        const a = body(state, roller);
        const b = body(state, rolled);
        const gap = sub(a.position, b.position);
        if (axis) {
          const along = Math.abs(gap.z) / Math.hypot(gap.x, gap.z);
          if ((axis === 'along') !== along > 0.5)
            throw new Error(`These two do not stand ${axis} the set from each other.`);
        }
        // Both face across the set; dancers standing in from their side line
        // (after long lines forward) roll away on the way back to it.
        const sideX = Math.sign(a.position.x - middle.x);
        const facingAcross = Math.abs(forward(a.yaw).x) > 0.7 && Math.abs(forward(b.yaw).x) > 0.7;
        if (
          sideX === 0 ||
          Math.sign(b.position.x - middle.x) !== sideX ||
          Math.abs(gap.x) > 0.3 ||
          !facingAcross
        )
          return sideBySide(roller, rolled, a, b, middle);
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
  /**
   * Two side by side anywhere: facing the middle of a ring, or facing the
   * same way. The rolled dancer crosses in front of the roller.
   */
  function sideBySide(roller: number, rolled: number, a: Body, b: Body, middle: Vec2) {
    const pair = mix(a.position, b.position, 0.5);
    const inward = sub(middle, pair);
    const same = dot(forward(a.yaw), forward(b.yaw)) > 0.5;
    const front = same
      ? scale(add(forward(a.yaw), forward(b.yaw)), 0.5)
      : Math.hypot(inward.x, inward.z) > 0.3
        ? inward
        : undefined;
    if (!front) throw new Error('A roll away needs the two side by side.');
    const n = Math.hypot(front.x, front.z);
    const ahead = { x: front.x / n, z: front.z / n };
    const gap = sub(a.position, b.position);
    if (Math.abs(dot(gap, ahead)) > 0.5 * Math.hypot(gap.x, gap.z))
      throw new Error('A roll away needs the two side by side.');
    const finalYaw = (to: Vec2, own: number) =>
      same ? own : Math.atan2(middle.x - to.x, middle.z - to.z);
    const toward = Math.sign(dot(gap, leftOf(Math.atan2(ahead.x, ahead.z))));
    return [
      {
        id: roller,
        from: a,
        to: b.position,
        yaw: finalYaw(b.position, a.yaw),
        offset: scale(ahead, -BEHIND),
        spin: 0,
      },
      {
        id: rolled,
        from: b,
        to: a.position,
        yaw: finalYaw(a.position, b.yaw),
        offset: scale(ahead, FRONT),
        spin: toward * TAU,
      },
    ];
  }

  const motion = (beat: number) => ({
    bodies: moves.map((m) => {
      // A quick (2-beat) roll away keeps its pace even to the ends.
      const q = progress(beat / beats, beats <= 2 ? 0.1 : 0.18);
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
    // The rolled dancer's full spin is the figure itself; done in under four
    // beats it turns faster than an ordinary walk, so it is reported as
    // styled motion (like the Rory twirl) rather than failed.
    ...(beats < 4 ? { styled: { name: 'Roll away spin' } } : {}),
  };
};
