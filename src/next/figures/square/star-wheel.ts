/**
 * Star promenade for a whole square, and the butterfly whirl that turns it
 * inside out (Texas Star: "pick up the next for a star promenade", "butterfly
 * whirl to put ladles in the center (shoot the star)", "star left").
 *
 * Star promenade: the four of one role make a star in the middle (left
 * hands for a star left, turning counterclockwise seen from above; right
 * hands clockwise), each with a partner on the outside beside them (an arm
 * round the waist), two by two on four spokes, and the whole wheel turns
 * the amount called. From places round the ring the couples gather onto the
 * spokes as the wheel starts to turn. The couples keep their spokes at the
 * end, for a whirl or a swing.
 * Butterfly whirl: each couple on a spoke turns half round about its middle
 * as a unit, the outside dancer walking forward and the inside one backing
 * up, so the other role is in the middle, facing the other way round.
 * Source: Caller's Box glossary, "Star promenade" and "Butterfly whirl";
 * Lloyd Shaw, "Cowboy Dances" (Texas Star); ContraDB 1919, 2203 (patter:
 * "now gents back out and ladies go in").
 * Readings: the pairs are partners (the progression has already given each
 * lark the robin he picked up); a bare "star left/right" while the wheel is
 * made goes on with it half round.
 */
import type { Vec2 } from '../../../types.ts';
import type { FigureContact, FigureResult } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, withinReach } from '../../core/contacts.ts';
import { RING_CENTER } from '../../core/formation-ring.ts';
import {
  add,
  distance,
  dot,
  heading,
  length,
  mean,
  polar,
  progress,
  rightOf,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, minorSets, partnerOf, withChanges, type DanceState } from '../../core/state.ts';
import { STAR_RADIUS } from './role-star.ts';
import { FIGURES } from '../index.ts';

export interface StarWheelParams {
  hand: 'left' | 'right';
  /** Turns of the wheel. */
  amount?: number;
  /** Who is in the middle; else whoever stands nearer it. */
  center?: 'larks' | 'robins';
  /** A backup star: the wheel turns the other way, the middle ones backing up. */
  backing?: boolean;
  /** Who rides each spoke together: partners, or the nearest of the other role (the one just turned). */
  pairs?: 'partner' | 'nearest';
}

/** Distance from the one in the star to the partner outside. */
const SPOKE = 0.7;
/** Share of the figure spent gathering onto the spokes from places. */
const GATHER = 0.4;
const TURN_BEATS = 2;

/** Couples [inside, outside] of a wheel, by who is nearer the middle. */
function spokes(
  state: DanceState,
  ids: readonly number[],
  center?: 'larks' | 'robins',
  nearest = false,
) {
  const r = (id: number) => length(sub(body(state, id).position, RING_CENTER));
  const larks = ids.filter((id) => state.dancers[id].role === 'lark');
  if (larks.length !== 4) throw new Error('A star promenade here needs four couples.');
  const pairs = larks.map((l) => {
    const p = nearest
      ? ids
          .filter((id) => state.dancers[id].role !== 'lark')
          .reduce((a, b) =>
            distance(body(state, a).position, body(state, l).position) <=
            distance(body(state, b).position, body(state, l).position)
              ? a
              : b,
          )
      : partnerOf(state, l);
    if (!ids.includes(p) || distance(body(state, l).position, body(state, p).position) > 2.6)
      throw new Error('Partners make the star promenade together.');
    return [l, p] as const;
  });
  const larksIn =
    center !== undefined
      ? center === 'larks'
      : pairs.reduce((n, [l, p]) => n + r(l) - r(p), 0) < 0;
  return pairs.map(([l, p]) => (larksIn ? [l, p] : [p, l]) as [number, number]);
}

export function starWheel(state: DanceState, params: StarWheelParams, beats: number): FigureResult {
  onlyKeys('star promenade', params, ['hand', 'amount', 'center', 'backing', 'pairs']);
  const hand = oneOf('star promenade', 'hand', params.hand, ['left', 'right'] as const);
  const amount = params.amount ?? 0.5;
  if (!(amount >= 0 && amount <= 3)) throw new Error('A star promenade goes up to three times round.');
  if (params.center !== undefined) oneOf('star promenade', 'center', params.center, ['larks', 'robins'] as const);
  // Outside a ring or square: the ordinary star.
  if (!state.layout?.center) return FIGURES.star(state, { hand, places: amount * 4 }, beats);
  const ids = minorSets(state).flat();
  const pairs = spokes(state, ids, params.center, params.pairs === 'nearest');
  // Left hands in turn counterclockwise from above: a negative rotation
  // (the other way round backing up).
  const sweep = (hand === 'right' ? 1 : -1) * (params.backing ? -1 : 1) * amount * TAU;
  const along = hand === 'right' ? Math.PI / 2 : -Math.PI / 2;
  // A backup star stands a little wider, so the turns out of it clear the middle.
  const radius = STAR_RADIUS + (params.backing ? 0.15 : 0);
  const plans = pairs.map(([inside, outside]) => {
    const a = body(state, inside);
    const b = body(state, outside);
    const theta0 = polar(sub(mean([a.position, b.position]), RING_CENTER));
    const spokeAt = (theta: number) => {
      const u = { x: Math.cos(theta), z: Math.sin(theta) };
      const yaw = heading(u, { x: 0, z: 0 }) + along;
      return {
        inside: add(RING_CENTER, scale(u, radius)),
        outside: add(RING_CENTER, scale(u, radius + SPOKE)),
        yaw,
      };
    };
    const s0 = spokeAt(theta0);
    const gather = Math.max(distance(a.position, s0.inside), distance(b.position, s0.outside)) > 0.2;
    return { inside, outside, a, b, theta0, spokeAt, s0, gather };
  });
  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies = plans.flatMap((p) => {
      const s = p.spokeAt(p.theta0 + sweep * progress(t));
      const k = p.gather ? 1 - smooth(t / GATHER) : 0;
      // Facing comes round over the gathering, or two beats at least.
      const ky = 1 - smooth(Math.min(p.gather ? t / GATHER : Infinity, beat / TURN_BEATS));
      const place = (from: { position: Vec2; yaw: number }, to: Vec2, start: Vec2) => ({
        position: add(to, scale(sub(from.position, start), k)),
        yaw: s.yaw + turn(from.yaw, p.s0.yaw) * ky,
      });
      return [
        { id: p.inside, ...place(p.a, s.inside, p.s0.inside) },
        { id: p.outside, ...place(p.b, s.outside, p.s0.outside) },
      ];
    });
    const map = bodyMap(bodies);
    const hold = smooth((t - (plans[0].gather ? GATHER * 0.6 : 0)) / 0.15);
    const contacts: FigureContact[] = plans.flatMap((p, i) => {
      const next = plans[(i + 1) % plans.length];
      const inner = hand;
      const outer = hand === 'left' ? 'right' : 'left';
      return [
        withinReach({ a: p.inside, handA: inner, b: next.inside, handB: inner, kind: 'joined', strength: hold }, map),
        withinReach({ a: p.inside, handA: outer, b: p.outside, handB: inner, kind: 'joined', strength: hold }, map),
      ];
    });
    return { bodies, contacts };
  };
  return {
    kind: 'star-promenade',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}

export interface StarWhirlParams {
  /** Turns of the whirl: a half turn puts the other role in the middle. */
  amount?: number;
}

export function starWhirl(state: DanceState, params: StarWhirlParams, beats: number): FigureResult {
  onlyKeys('butterfly whirl', params, ['amount']);
  const amount = params.amount ?? 0.5;
  if (!(amount > 0 && amount <= 2 && Number.isInteger(amount * 2)))
    throw new Error('A butterfly whirl turns a whole or half number of times.');
  const ids = minorSets(state).flat();
  const pairs = spokes(state, ids);
  const plans = pairs.map(([inside, outside]) => {
    const a = body(state, inside);
    const b = body(state, outside);
    if (distance(a.position, b.position) > 1.2)
      throw new Error('A butterfly whirl starts with the couple side by side.');
    const mid = mean([a.position, b.position]);
    // The outside one walks forward, the inside one backs up.
    const outsideOnRight = dot(sub(b.position, a.position), rightOf(a.yaw)) > 0;
    const yawTurn = (outsideOnRight ? 1 : -1) * amount * TAU;
    return { inside, outside, a, b, mid, yawTurn };
  });
  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = plans.flatMap((p) => {
      const d = p.yawTurn * q;
      // Turning left raises the yaw; the positions go round the other way.
      return [
        { id: p.inside, position: add(p.mid, rotate(sub(p.a.position, p.mid), -d)), yaw: p.a.yaw + d },
        { id: p.outside, position: add(p.mid, rotate(sub(p.b.position, p.mid), -d)), yaw: p.b.yaw + d },
      ];
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = plans.map((p) =>
      withinReach({ a: p.inside, handA: 'right', b: p.outside, handB: 'left', kind: 'joined', strength: 1 }, map),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'butterfly-whirl',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}
