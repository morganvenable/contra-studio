/**
 * Revolving door.
 *
 * Definition: the two dancers of the named role (the door) step into the
 * middle, take the named hand, and turn once around each other, back to
 * their own places. Each brings along the dancer standing with them (their
 * partner or neighbor, as the row says) on the outside, by the other hand,
 * halfway around, and drops them off in the place opposite the one they
 * started in, facing in; the door then finishes its turn alone. So the
 * carried dancers trade sides and the door dancers end where they began.
 * Source: Caller's Box glossary, "Revolving door"; ContraDB rows "revolving
 * door - robins take right hands and drop off partners on other side",
 * "revolving door - larks take left hands and drop off neighbors on other
 * side" (in 2653 and 2903 the partners swing on their side right after, so
 * the door dancers stay on their own side). The walking radii follow the
 * star promenade (star-promenade.ts).
 */
import type { Hand, Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  length,
  mean,
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
import { roleOfGroup } from '../core/roles.ts';
import { body, minorSets, related, roleOf, withChanges, type Body } from '../core/state.ts';
import { INNER, OUTER } from './star-promenade.ts';

export interface RevolvingDoorParams {
  /** The door: who takes hands in the middle. */
  who: 'larks' | 'robins';
  hand: 'left' | 'right';
  /** Whom each of them brings around and drops off. */
  whom: 'partner' | 'neighbor';
}

/** Share of the figure the carried dancers take to reach the other side. */
const CARRY = 0.55;
/** Share of a turn spent stepping in, and again stepping back out. */
const EDGE = 0.25;

export const revolvingDoor: Figure<RevolvingDoorParams> = (state, params, beats) => {
  onlyKeys('revolving door', params, ['who', 'hand', 'whom']);
  const who = oneOf('revolving door', 'who', params.who, ['larks', 'robins'] as const);
  const hand = oneOf('revolving door', 'hand', params.hand, ['left', 'right'] as const);
  const whom = oneOf('revolving door', 'whom', params.whom, ['partner', 'neighbor'] as const);
  const role = roleOfGroup(who)!;
  // Right hands in: clockwise from above, increasing polar angle (as a star).
  const sign = hand === 'right' ? 1 : -1;
  const other: Hand = hand === 'left' ? 'right' : 'left';

  const plans = minorSets(state).map((g) => {
    const middle = mean(g.map((id) => body(state, id).position));
    const doors = g.filter((id) => roleOf(state, id) === role);
    if (doors.length !== 2) throw new Error(`A revolving door needs two ${who}.`);
    const pairs = doors.map((door) => {
      const carried = related(state, whom, door);
      if (carried === undefined || !g.includes(carried))
        throw new Error(`Each of the ${who} needs a ${whom} here to bring around.`);
      return { door, carried };
    });
    const angle = (id: number) => polar(sub(body(state, id).position, middle));
    if (Math.abs(positiveAngle(angle(pairs[1].door) - angle(pairs[0].door)) - Math.PI) > 1)
      throw new Error(
        'The two door dancers of a revolving door must start across from each other.',
      );
    return { middle, pairs };
  });

  /** Walk `turns` of a turn around `middle` over local time u, in to radius `r` and out. */
  const around = (from: Body, middle: Vec2, r: number, turns: number, u: number) => {
    const rel = sub(from.position, middle);
    const r0 = length(rel);
    const a = sign * turns * TAU * progress(u);
    const inward = Math.min(smooth(u / EDGE), smooth((1 - u) / EDGE));
    const radius = r0 + (r - r0) * inward;
    const position = add(middle, rotate(scale(rel, radius / r0), a));
    // Facing as they started, turned with the door, and toward the way
    // they walk while it turns.
    const ahead = rotate(rel, a + sign * (Math.PI / 2));
    const walk = Math.atan2(ahead.x, ahead.z);
    const rigid = from.yaw - a;
    return { position, yaw: rigid + turn(walk, rigid) * inward, inward };
  };

  const motion = (beat: number) => {
    const t = beat / beats;
    const carry = Math.min(1, t / CARRY);
    const bodies = plans.flatMap((p) =>
      p.pairs.flatMap(({ door, carried }) => [
        { id: door, ...around(body(state, door), p.middle, INNER, 1, t) },
        {
          id: carried,
          ...around(body(state, carried), p.middle, OUTER, 0.5, carry),
        },
      ]),
    );
    const map = bodyMap(bodies);
    const doorHold = smooth((Math.min(smooth(t / 0.15), smooth((1 - t) / 0.15)) - 0.5) / 0.3);
    const carryHold = smooth((carry - 0.15) / 0.15) * smooth((0.85 - carry) / 0.15);
    const contacts: FigureContact[] = plans.flatMap((p) => [
      withinReach(
        {
          a: p.pairs[0].door,
          handA: hand,
          b: p.pairs[1].door,
          handB: hand,
          kind: 'joined',
          strength: doorHold,
        },
        map,
      ),
      ...p.pairs.map(({ door, carried }) =>
        withinReach(
          {
            a: door,
            handA: other,
            b: carried,
            handB: hand,
            kind: 'joined',
            strength: carryHold,
          },
          map,
        ),
      ),
    ]);
    return {
      bodies: bodies.map(({ id, position, yaw }) => ({ id, position, yaw })),
      contacts,
    };
  };
  return {
    kind: 'star-promenade',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
