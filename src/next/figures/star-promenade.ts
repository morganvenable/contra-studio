/**
 * Star promenade.
 *
 * Definition: the named role joins the named hand in the middle of the
 * minor set, as in a star, with their other arm around their partner's
 * waist, partners side by side on the outside; the two couples walk forward
 * around the center ("star promenade left ½": larks' left hands in, partners
 * on their right, counterclockwise seen from above, halfway around). The
 * couples step in to star size over the first beat, keeping each couple on
 * its own side of the center.
 * Source: Caller's Box glossary, "Star promenade"; ContraDB rows "star
 * promenade left ½", "ladles star promenade right ½". With no role named,
 * a left-hand star promenade has the larks in the middle and a right-hand
 * one the robins (the usual pairing of hand and role).
 */
import type { Hand } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  heading,
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
import { body, minorSets, partnerOf, related, roleOf, withChanges } from '../core/state.ts';

export interface StarPromenadeParams {
  hand: 'left' | 'right';
  /** Who stands in the middle; by default larks for left, robins for right. */
  center?: 'larks' | 'robins';
  /** Who walks on the outside with each center dancer: partners unless named ("larks pick up neighbor"). */
  pair?: 'partner' | 'neighbor';
  /** Times around: 0.5 is halfway. */
  amount: number;
}

/** Distance from the middle to each center dancer, and to their partner. */
export const INNER = 0.45;
export const OUTER = 1.0;
/**
 * Beats spent stepping into the star promenade, and the most of the figure
 * that may take: a short star promenade steps in over most of it, a long one
 * settles into the star sooner.
 */
const ENTRY_BEATS = 2.4;
const ENTRY_SHARE = 0.6;

export const starPromenade: Figure<StarPromenadeParams> = (state, params, beats) => {
  onlyKeys('star promenade', params, ['hand', 'center', 'amount', 'pair']);
  const pairName = oneOf('star promenade', 'pair', params.pair ?? 'partner', [
    'partner',
    'neighbor',
  ] as const);
  const hand = oneOf('star promenade', 'hand', params.hand, ['left', 'right'] as const);
  const centerName = oneOf(
    'star promenade',
    'center',
    params.center ?? (hand === 'left' ? 'larks' : 'robins'),
    ['larks', 'robins'] as const,
  );
  if (!(params.amount > 0 && params.amount <= 2))
    throw new Error('A star promenade goes up to twice around.');
  const role = roleOfGroup(centerName)!;
  // Right hands in: clockwise from above, increasing polar angle.
  const sign = hand === 'right' ? 1 : -1;
  const sweep = sign * params.amount * TAU;
  const other: Hand = hand === 'left' ? 'right' : 'left';

  const plans = minorSets(state).map((g) => {
    const middle = mean(g.map((id) => body(state, id).position));
    const inner = g.filter((id) => roleOf(state, id) === role);
    if (inner.length !== 2) throw new Error(`A star promenade needs two ${centerName}.`);
    const couples = inner.map((c) => {
      const partner = pairName === 'partner' ? partnerOf(state, c) : related(state, 'neighbor', c);
      if (partner === undefined) throw new Error('Each center dancer needs a neighbor here.');
      if (!g.includes(partner)) throw new Error('Partners must be in the same minor set.');
      const at = mean([body(state, c).position, body(state, partner).position]);
      return { c, partner, angle: polar(sub(at, middle)) };
    });
    const apart = positiveAngle(couples[1].angle - couples[0].angle);
    if (Math.abs(apart - Math.PI) > Math.PI / 3)
      throw new Error('The couples must start on opposite sides of the middle.');
    return { middle, couples };
  });

  const ray = (angle: number) => ({ x: Math.cos(angle), z: Math.sin(angle) });
  const place = (middle: { x: number; z: number }, angle: number, r: number) =>
    add(middle, scale(ray(angle), r));
  // Facing the way they walk: a quarter turn from the ray.
  const walkYaw = (angle: number) =>
    heading({ x: 0, z: 0 }, rotate(ray(angle), (sign * Math.PI) / 2));

  const entry = Math.min(ENTRY_SHARE, ENTRY_BEATS / beats);
  const motion = (beat: number) => {
    const t = beat / beats;
    const a = sweep * progress(t);
    const inStep = smooth(t / entry);
    const bodies = plans.flatMap((p) =>
      p.couples.flatMap(({ c, partner, angle }) =>
        [
          [c, INNER],
          [partner, OUTER],
        ].map(([id, r]) => {
          const from = body(state, id);
          const target = place(p.middle, angle + a, r);
          const yaw0 = from.yaw + turn(walkYaw(angle), from.yaw);
          return {
            id,
            position: add(from.position, scale(sub(target, from.position), inStep)),
            yaw: from.yaw + (yaw0 - from.yaw) * inStep - a * inStep,
          };
        }),
      ),
    );
    const map = bodyMap(bodies);
    const strength = smooth((t - entry * 0.6) / (entry * 0.4)) * smooth((1 - t) / 0.08);
    const contacts: FigureContact[] = plans.flatMap((p) => [
      withinReach(
        {
          a: p.couples[0].c,
          handA: hand,
          b: p.couples[1].c,
          handB: hand,
          kind: 'joined',
          strength,
        },
        map,
      ),
      ...p.couples.map(
        ({ c, partner }): FigureContact => ({
          a: c,
          handA: other,
          b: partner,
          handB: hand,
          kind: 'joined',
          target: 'waist',
          strength,
        }),
      ),
    ]);
    return { bodies, contacts };
  };
  return {
    kind: 'star-promenade',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
