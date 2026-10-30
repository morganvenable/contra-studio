/**
 * Shoulder joint limit. An upper arm may point at most SHOULDER_BACK_LIMIT
 * degrees behind the shoulder: behind the torso's frontal plane, measured in
 * the torso's own frame (body-local +z is forward). This covers a hanging arm
 * swung back, an arm out to the side drawn back, and an arm overhead tipped
 * back alike. The pose solver (scene.ts) enforces it; the audit measures it.
 */
export const SHOULDER_BACK_LIMIT = 10;

/** Shoulder in body-local coordinates; side is +1 for the left arm. */
export const shoulderPoint = (side: number) => ({x: side * .235, y: 1.355, z: 0});

/** Degrees the upper arm (shoulder to elbow, body-local) points behind the shoulder. */
export function upperArmBehind(side: number, elbow: {x: number; y: number; z: number}): number {
  const s = shoulderPoint(side), dx = elbow.x - s.x, dy = elbow.y - s.y, dz = elbow.z - s.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-9) return 0;
  return Math.max(0, Math.asin(Math.min(1, -dz / length)) * 180 / Math.PI);
}
