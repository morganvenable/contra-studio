/**
 * Visiting couples in a square ("active couple lead right", "on to the next",
 * "actives cast back to home").
 *
 * Definition: the active couple (couple 1 the first time through, then 2, 3
 * and 4 in turn) walks over to stand in front of a couple at its home place,
 * facing it, the two couples making a minor set of four; the figures that
 * follow ("circle left 4 places with right-hand couple", "circle right")
 * are danced by those four as in a contra minor set while the others stand.
 * "On to the next" moves the actives on round the square to the next
 * couple; "home" sends them back to their own place, and the square dances
 * as a square again.
 * Source: Lloyd Shaw, "Cowboy Dances" (visiting couple figures); Caller's
 * Box glossary, "Lead right", "Visiting couple"; ContraDB "Dip and Dive".
 * Reading: the right-hand couple is the next couple counterclockwise (the
 * one on the actives' right as they face the middle); the actives stand a
 * place (1.8 m) in toward the middle from the couple they visit.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { SET } from '../../core/config.ts';
import { fastStyling } from '../../core/fast.ts';
import type { Layout } from '../../core/layout.ts';
import { wholeSetMove } from '../../core/layout.ts';
import { add, heading, leftOf, mean, progress, scale, smooth, sub, turn } from '../../core/math.ts';
import { body, withChanges, type Body, type DanceState } from '../../core/state.ts';

wholeSetMove('visit');

export interface VisitParams {
  /** The couple on the right, the next one on, or home. */
  to: 'right' | 'next' | 'home';
}

/** A square being visited: the square's own layout, and whom the actives visit. */
export interface Visiting {
  readonly square: Layout;
  readonly visited: number;
}

export const visitingOf = (state: DanceState): Visiting | undefined =>
  (state.layout as { visit?: Visiting } | undefined)?.visit;

export const visit: Figure<VisitParams> = (state, params, beats) => {
  onlyKeys('visit', params, ['to']);
  const to = oneOf('visit', 'to', params.to, ['right', 'next', 'home'] as const);
  const now = visitingOf(state);
  const square = now?.square ?? state.layout;
  const homes = square?.homes;
  const center = square?.center;
  const actives = state.positions.get('actives');
  if (!homes || !center || !actives || actives.length !== 2)
    throw new Error('Visiting is danced in a square with an active couple.');
  const couples = state.dancers.length / 2;
  const activeCouple = state.dancers[actives[0]].couple;
  const lark = actives.find((id) => state.dancers[id].role === 'lark')!;
  const robin = actives.find((id) => id !== lark)!;
  const homeOf = (c: number) => mean([homes.get(c * 2)!, homes.get(c * 2 + 1)!]);
  const targets = new Map<number, Body>();
  let visited: number | undefined;
  if (to === 'home') {
    if (!now) throw new Error('The actives are already home.');
    for (const id of actives) targets.set(id, { position: homes.get(id)!, yaw: heading(homes.get(id)!, center) });
  } else {
    if (to === 'next' && !now) throw new Error('The actives visit no one yet.');
    visited = to === 'right' ? (activeCouple + 1) % couples : (now!.visited + 1) % couples;
    if (visited === activeCouple) throw new Error('The actives are back at their own place.');
    const v = homeOf(visited);
    const inward = scale(sub(center, v), 1 / Math.hypot(center.x - v.x, center.z - v.z));
    const spot = add(v, scale(inward, SET.slot));
    // Facing the visited couple, the lark on the left.
    const yaw = heading(spot, v);
    const side = scale(leftOf(yaw), SET.halfWidth);
    targets.set(lark, { position: add(spot, side), yaw });
    targets.set(robin, { position: sub(spot, side), yaw });
  }
  const from = new Map(actives.map((id) => [id, body(state, id)]));
  const motion = (beat: number) => {
    const t = progress(beat / beats);
    const face = smooth(beat / Math.min(beats, 1.5));
    return {
      bodies: actives.map((id) => {
        const a = from.get(id)!;
        const b = targets.get(id)!;
        const walking = heading(a.position, b.position);
        const yaw =
          beat < beats * 0.6
            ? a.yaw + turn(walking, a.yaw) * face
            : walking + turn(b.yaw, walking) * smooth((beat / beats - 0.6) / 0.4);
        return { id, position: add(a.position, scale(sub(b.position, a.position), t)), yaw };
      }),
      contacts: [],
    };
  };
  const exitBodies = settle(state, motion, beats);
  const all = state.dancers.map((d) => d.id);
  const layout: Layout =
    to === 'home'
      ? square!
      : ({ separate: true, visit: { square: square!, visited } } as unknown as Layout);
  const groups =
    to === 'home' ? [all] : [[...actives, visited! * 2, visited! * 2 + 1]];
  return {
    kind: 'promenade',
    motion,
    exit: withChanges(exitBodies, { groups, layout, hands: [] }),
    ...fastStyling('brisk lead to the next couple', motion, beats),
  };
};

/** The actives' home, for tests. */
export const homePlace = (state: DanceState, id: number): Vec2 | undefined =>
  (visitingOf(state)?.square ?? state.layout)?.homes?.get(id);
