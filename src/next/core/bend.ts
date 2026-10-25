/**
 * Display for a set with no ends (layout.period): the straight set the
 * figures dance in is bent round a circle, z running round it and x
 * outward, so a Sicilian circle is drawn as a circle. Only the display
 * bends; the physical check runs on the straight set, where every group
 * dances exactly as in a contra set.
 *
 * Local axes map to the circle without a mirror: +x outward, +z along the
 * way a ring circling left travels, so a yaw turns by the angle round.
 * Small sets are drawn on a circle at least MIN_RADIUS across so the
 * inner line does not crowd the middle.
 */
import type { Frame, Pose } from '../../types.ts';
import type { Layout } from './layout.ts';

const MIN_RADIUS = 2.6;

export function bendPoint(layout: Layout, x: number, z: number) {
  const period = layout.period!;
  const radius = Math.max(period / (2 * Math.PI), MIN_RADIUS);
  const theta = (2 * Math.PI * z) / period;
  const rho = radius + x;
  return { x: rho * Math.cos(theta), z: rho * Math.sin(theta), theta };
}

export function bendFrame(frame: Frame, layout: Layout): Frame {
  if (!layout.period) return frame;
  const poses: Pose[] = frame.poses.map((p) => {
    const b = bendPoint(layout, p.position.x, p.position.z);
    return { ...p, position: { x: b.x, z: b.z }, yaw: p.yaw - b.theta };
  });
  const contacts = frame.contacts.map((c) => {
    const b = bendPoint(layout, c.point.x, c.point.z);
    return { ...c, point: { x: b.x, y: c.point.y, z: b.z } };
  });
  return { ...frame, poses, contacts };
}
