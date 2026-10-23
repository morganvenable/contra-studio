/**
 * Set geometry and physical limits, in one place. Geometry matches the old
 * engine (src/engine.ts HALF_WIDTH/ROW_GAP, src/becket.ts) so both engines
 * can be compared side by side. Limits come from src/hey-transition.ts
 * TransitionBudget and the canonical hand reach in src/engine.ts.
 */
export const SET = {
  /** Distance from the set's center line to each side line. */
  halfWidth: 0.9,
  /** Spacing between neighboring places along a side line. */
  slot: 1.8,
} as const;

export const BODY = {
  /** Shoulder offset from the body root, sideways. */
  shoulder: 0.235,
  shoulderHeight: 1.355,
  /** Height of an ordinary joined-hand contact. */
  handHeight: 1.2,
} as const;

export const LIMITS = {
  /** Closest any two body roots may come, in meters. */
  minimumClearance: 0.5,
  /** Root speed, meters per beat. */
  maximumSpeed: 1.2,
  /** Body turn rate, radians per beat. */
  maximumYawRate: 4,
  /** Turn rate a figure may declare for a styled spin; flourishy twirls are fast. */
  spinYawRate: 12,
  /** Shoulder-to-hand reach for a held contact (strength >= 0.5). */
  armReach: 0.62,
  /** Rendered contacts fade out over this extra distance past armReach. */
  reachFade: 0.06,
} as const;

export type Limits = { readonly [K in keyof typeof LIMITS]: number };
