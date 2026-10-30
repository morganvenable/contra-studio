/**
 * Shoulder joint limit. An upper arm never points behind the shoulder (the
 * torso's frontal plane, in the torso's own frame: body-local +z is forward)
 * unless it hangs low, more than about 45 degrees below the horizontal; a
 * low arm may go up to SHOULDER_BACK_LIMIT degrees behind (the teapot hand
 * on the hip for a courtesy turn). Between 40 and 50 degrees down the
 * allowance eases in, so an elbow never jumps as an arm passes 45. The pose
 * solver (scene.ts) and the engine's holds (contacts.ts) keep to it; the
 * audit measures it. (Owner's rule, 2026-10-30.)
 */
export const SHOULDER_BACK_LIMIT = 10;
/** Degrees below the horizontal over which a low arm's allowance eases in. */
export const LOW_ARM_FROM = 40;
export const LOW_ARM_TO = 50;

/**
 * Degrees an upper arm may point behind the shoulder, given `down`: the sine
 * of how far below the horizontal it points (-1 straight up, 1 straight down).
 */
export function backLimit(down: number): number {
  const deg = (Math.asin(Math.max(-1, Math.min(1, down))) * 180) / Math.PI;
  const t = Math.max(0, Math.min(1, (deg - LOW_ARM_FROM) / (LOW_ARM_TO - LOW_ARM_FROM)));
  return SHOULDER_BACK_LIMIT * t * t * (3 - 2 * t);
}

/** Shoulder in body-local coordinates; side is +1 for the left arm. */
export const shoulderPoint = (side: number) => ({x: side * .235, y: 1.355, z: 0});

/** Degrees the upper arm (shoulder to elbow, body-local) points behind the shoulder. */
export function upperArmBehind(side: number, elbow: {x: number; y: number; z: number}): number {
  const s = shoulderPoint(side), dx = elbow.x - s.x, dy = elbow.y - s.y, dz = elbow.z - s.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-9) return 0;
  return Math.max(0, Math.asin(Math.min(1, -dz / length)) * 180 / Math.PI);
}

/** Degrees this upper arm (shoulder to elbow, body-local) may point behind the shoulder. */
export function upperArmAllowance(side: number, elbow: {x: number; y: number; z: number}): number {
  const s = shoulderPoint(side), dx = elbow.x - s.x, dy = elbow.y - s.y, dz = elbow.z - s.z;
  const length = Math.hypot(dx, dy, dz);
  return length < 1e-9 ? SHOULDER_BACK_LIMIT : backLimit(-dy / length);
}
