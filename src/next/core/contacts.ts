/**
 * Hand geometry shared by every figure: shoulder points, where a joined pair
 * of hands meets, and the canonical reach test from src/engine.ts.
 */
import type { Hand, HandContact, Vec3 } from '../../types.ts';
import { BODY, LIMITS } from './config.ts';
import { leftOf, smooth } from './math.ts';
import type { Body, Hold } from './state.ts';
import type { FigureContact } from './figure.ts';

export function shoulder(b: Body, hand: Hand): Vec3 {
  const side = hand === 'left' ? 1 : -1;
  const l = leftOf(b.yaw);
  return {
    x: b.position.x + side * BODY.shoulder * l.x,
    y: BODY.shoulderHeight,
    z: b.position.z + side * BODY.shoulder * l.z,
  };
}

/** Joined hands meet halfway between the two shoulders, at hand height. */
export function holdPoint(a: Body, handA: Hand, b: Body, handB: Hand): Vec3 {
  const sa = shoulder(a, handA);
  const sb = shoulder(b, handB);
  return { x: (sa.x + sb.x) / 2, y: BODY.handHeight, z: (sa.z + sb.z) / 2 };
}

/** Straight-line shoulder-to-hand distance. */
export function reach(b: Body, hand: Hand, point: Vec3): number {
  const s = shoulder(b, hand);
  return Math.hypot(point.x - s.x, point.y - s.y, point.z - s.z);
}

/** The farther of the two reaches a contact asks for. */
export function contactReach(c: HandContact, bodies: ReadonlyMap<number, Body>): number {
  const a = bodies.get(c.a)!;
  const b = bodies.get(c.b)!;
  const ra = reach(a, c.handA, c.point);
  const rb = c.target && c.target !== 'hands' ? 0 : reach(b, c.handB, c.point);
  return Math.max(ra, rb);
}

/** Rendering fade so a hand never stretches past reach (as in src/engine.ts). */
export function reachFade(distance: number): number {
  return smooth((LIMITS.armReach + LIMITS.reachFade - distance) / LIMITS.reachFade);
}

/** A held pair of hands as a contact at the given strength. */
export function joined(hold: Hold, strength: number): FigureContact {
  return { ...hold, strength, kind: 'joined' };
}

export function complete(c: FigureContact, bodies: ReadonlyMap<number, Body>): HandContact {
  if (c.point) return c as HandContact;
  const a = bodies.get(c.a);
  const b = bodies.get(c.b);
  if (!a || !b) throw new Error(`Contact ${c.a}-${c.b} names a dancer with no pose.`);
  return { ...c, point: holdPoint(a, c.handA, b, c.handB) };
}

export const sameHold = (h: Hold, c: { a: number; b: number; handA: Hand; handB: Hand }) =>
  (h.a === c.a && h.b === c.b && h.handA === c.handA && h.handB === c.handB) ||
  (h.a === c.b && h.b === c.a && h.handA === c.handB && h.handB === c.handA);

/** Below this reach a hold is drawn at full strength. */
const REACH_EASE = 0.05;

/**
 * Hands join only when they can reach: scale a contact's strength down as
 * the reach it needs passes armReach. Positions come from the frame.
 */
export function withinReach(c: FigureContact, bodies: ReadonlyMap<number, Body>): FigureContact {
  const r = contactReach(complete(c, bodies), bodies);
  return { ...c, strength: c.strength * smooth((LIMITS.armReach - r) / REACH_EASE + 0.5) };
}

/** Body map from a list of moved bodies. */
export const bodyMap = (
  bodies: readonly { id: number; position: Body['position']; yaw: number }[],
) => new Map(bodies.map((b) => [b.id, { position: b.position, yaw: b.yaw }]));
