/**
 * Hand geometry shared by every figure: shoulder points, where a joined pair
 * of hands meets, and the canonical reach test from src/engine.ts.
 */
import type { Hand, HandContact, Vec3 } from '../../types.ts';
import { BODY, LIMITS } from './config.ts';
import { SHOULDER_BACK_LIMIT } from '../../arm-limit.ts';
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

/**
 * Joined hands meet halfway between the two shoulders, at hand height. When
 * the shoulders are close the hands hang lower, so each arm still reaches
 * HOLD_REACH from its shoulder: a hand tucked up beside the shoulder could
 * only be held with the elbow behind the back, past the shoulder limit
 * (src/arm-limit.ts).
 */
export function holdPoint(a: Body, handA: Hand, b: Body, handB: Hand): Vec3 {
  const sa = shoulder(a, handA);
  const sb = shoulder(b, handB);
  const half = Math.hypot(sa.x - sb.x, sa.z - sb.z) / 2;
  const y = Math.min(BODY.handHeight, BODY.shoulderHeight - Math.sqrt(Math.max(0, HOLD_REACH ** 2 - half ** 2)));
  return { x: (sa.x + sb.x) / 2, y, z: (sa.z + sb.z) / 2 };
}

/** Shoulder-to-hand distance a joined hand keeps when the shoulders are close. */
export const HOLD_REACH = 0.5;

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

/** Highest an arch's joined hands go, above any dancer's head. */
const ARCH_TOP = 2.0;

/** Farthest an arch's hands reach from either shoulder. */
const ARCH_REACH = LIMITS.armReach * 0.97;

/**
 * An arch's joined hands, as high as both arms reach. They rise as the pair
 * closes in and come down as it parts, so whoever passes beneath goes under
 * the hands, not through the arms. With someone of the pair turning under
 * (a twirl, a star thru) the hands go over that dancer's head, as far
 * toward it as the other's arm reaches.
 */
export function archPoint(a: Body, handA: Hand, b: Body, handB: Hand, under?: Body): Vec3 {
  const shoulders = [shoulder(a, handA), shoulder(b, handB)];
  const mid = { x: (shoulders[0].x + shoulders[1].x) / 2, z: (shoulders[0].z + shoulders[1].z) / 2 };
  const height = (x: number, z: number) =>
    Math.min(
      ...shoulders.map(
        (s) => s.y + Math.sqrt(Math.max(0, ARCH_REACH ** 2 - (x - s.x) ** 2 - (z - s.z) ** 2)),
      ),
    );
  let best = { x: mid.x, z: mid.z, y: height(mid.x, mid.z) };
  if (under) {
    // Slide from between the shoulders toward the head beneath, keeping the
    // hands at least head-high-less-a-duck.
    for (let k = 1; k <= 8; k++) {
      const t = (k / 8) * 0.8;
      const x = mid.x + (under.position.x - mid.x) * t;
      const z = mid.z + (under.position.z - mid.z) * t;
      const y = height(x, z);
      if (y < UNDER_LOWEST) break;
      best = { x, z, y };
    }
  }
  return { x: best.x, y: Math.max(BODY.handHeight, Math.min(ARCH_TOP, best.y)), z: best.z };
}

/** Lowest the hands go over a dancer turning under them (who ducks the rest). */
const UNDER_LOWEST = 1.82;

/** Top of a dancer's head, plus room for the arm passing over it. */
const HEAD_CLEAR = 1.87;
/** Deepest duck, in metres of knee bend. */
const MAX_DUCK = 0.4;

/**
 * How far each dancer near a held arch lowers to pass under its arms: the
 * arms run from the joined hands down to each shoulder, and anyone whose
 * head is beneath one bends their knees until it clears.
 */
export function archDucks(
  contacts: readonly HandContact[],
  bodies: ReadonlyMap<number, Body>,
): Map<number, number> {
  const ducks = new Map<number, number>();
  for (const c of contacts) {
    if (c.kind !== 'arch' || c.strength < 0.05) continue;
    const arms = [shoulder(bodies.get(c.a)!, c.handA), shoulder(bodies.get(c.b)!, c.handB)];
    for (const [id, b] of bodies) {
      // The one turning under ducks beneath the other's arm, not their own.
      if ((id === c.a || id === c.b) && id !== c.underId) continue;
      const others = id === c.a ? [arms[1]] : id === c.b ? [arms[0]] : arms;
      let duck = 0;
      for (const s of others) {
        const dx = s.x - c.point.x;
        const dz = s.z - c.point.z;
        const len2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((b.position.x - c.point.x) * dx + (b.position.z - c.point.z) * dz) / len2));
        const off = Math.hypot(b.position.x - (c.point.x + dx * t), b.position.z - (c.point.z + dz * t));
        const armY = c.point.y + (s.y - c.point.y) * t;
        duck = Math.max(duck, (HEAD_CLEAR - armY) * smooth((0.35 - off) / 0.15));
      }
      duck = Math.min(MAX_DUCK, Math.max(0, duck)) * Math.min(1, c.strength);
      if (duck > (ducks.get(id) ?? 0)) ducks.set(id, duck);
    }
  }
  return ducks;
}

export function complete(c: FigureContact, bodies: ReadonlyMap<number, Body>): HandContact {
  if (c.point) return c as HandContact;
  const a = bodies.get(c.a);
  const b = bodies.get(c.b);
  if (!a || !b) throw new Error(`Contact ${c.a}-${c.b} names a dancer with no pose.`);
  const under = c.underId === undefined ? undefined : bodies.get(c.underId);
  const point =
    c.kind === 'arch' ? archPoint(a, c.handA, b, c.handB, under) : holdPoint(a, c.handA, b, c.handB);
  return { ...c, point };
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

/** Degrees inside the shoulder limit a hold starts letting go, since a drawn body also leans and bobs. */
const LIMIT_MARGIN = 4;

/** Upper arm and forearm length of the drawn dancers (src/scene.ts). */
const ARM_SEGMENT = 0.325;

/** Radians past the shoulder limit (src/arm-limit.ts) that reaching a point from this shoulder needs, bending the elbow as far as it helps; 0 when it is in reach. */
export function shoulderLimitExcess(b: Body, hand: Hand, point: Vec3): number {
  const s = shoulder(b, hand);
  const dx = point.x - s.x, dy = point.y - s.y, dz = point.z - s.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1e-6) return 0;
  const behind = -(dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw)) / d;
  const bend = Math.acos(Math.min(1, d / (2 * ARM_SEGMENT)));
  return Math.max(0, Math.asin(Math.max(-1, Math.min(1, behind))) - bend - ((SHOULDER_BACK_LIMIT - LIMIT_MARGIN) * Math.PI) / 180);
}

/** Over this much past the shoulder limit a held hand has let go. */
const LIMIT_FADE = (15 * Math.PI) / 180;

/**
 * Hands let go before holding on would pull an upper arm behind the
 * shoulder past its limit: a pull-by or a passing hold releases as the hands
 * come level with the shoulders, rather than trailing behind the back.
 */
export function shoulderLimitFade(c: HandContact, bodies: ReadonlyMap<number, Body>): number {
  if (c.kind === 'arch' || c.kind === 'courtesy' || c.kind === 'swing-frame') return 1;
  const a = bodies.get(c.a), b = bodies.get(c.b);
  if (!a || !b) return 1;
  let excess = shoulderLimitExcess(a, c.handA, c.point);
  if (!c.target || c.target === 'hands') excess = Math.max(excess, shoulderLimitExcess(b, c.handB, c.point));
  return smooth((LIMIT_FADE - excess) / LIMIT_FADE);
}
