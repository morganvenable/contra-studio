/**
 * Down the hall and back.
 *
 * Definitions:
 * - Down the hall: each minor set forms a line of four across the set,
 *   facing down (away from the top), and walks down the hall; then turns
 *   around to face up, either "as a couple" (each pair in the line wheels
 *   to the left, the one on the left backing up) or "alone" (each dancer
 *   turns in place toward the neighbor in line).
 * - Up the hall: the lines walk back up, and "bend into a ring": the ends
 *   of each line come forward and the middle two back up, into a ring of
 *   four facing in.
 * Couples waiting out at the ends walk along with the lines (turning alone,
 * in place) so the whole set travels together.
 * - With no ending named, the lines simply arrive ("down the hall", "up the
 *   hall"); "backward" walks the line the way it is facing's opposite ("up
 *   the hall backward" after going down without turning), and a ring can end
 *   either way.
 * Source: Caller's Box glossary, "Down the hall", "Bend the line"; ContraDB
 * rows "down the hall and turn as a couple", "down the hall and turn alone",
 * "up the hall and bend into a ring". Each side pair keeps its left-right
 * order as it turns from facing across to facing down.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import {
  add,
  clamp,
  dot,
  ease,
  heading,
  leftOf,
  mix,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import {
  activeIds,
  body,
  groupCenter,
  minorSets,
  withChanges,
  type DanceState,
} from '../core/state.ts';

export interface HallParams {
  direction: 'down' | 'up';
  /** Down the hall ends by turning around. */
  turn?: 'couple' | 'alone';
  /** The lines bend into a ring at the end. */
  end?: 'ring';
  /** Walk backward: face the other way from the way the lines travel. */
  backward?: boolean;
}

/** How far the lines walk. */
const DISTANCE = SET.slot;
/** Gap between dancers in a line of four. */
const LINE_GAP = 0.9;
/** Beats spent forming the line, and turning or bending at the end. */
const FORM = 2;
const ENDING = 2.5;

interface Mover {
  readonly id: number;
  readonly from: Vec2;
  readonly yaw: number;
  /** Place in the line before walking. */
  readonly slot: Vec2;
  /** Where and how the dancer ends, given u in [0, 1] of the ending. */
  readonly end: (u: number, at: Vec2) => { position: Vec2; yaw: number };
}

export const hall: Figure<HallParams> = (state, params, beats) => {
  onlyKeys('hall', params, ['direction', 'turn', 'end', 'backward']);
  const direction = oneOf('hall', 'direction', params.direction, ['down', 'up'] as const);
  if (params.turn !== undefined) oneOf('hall', 'turn', params.turn, ['couple', 'alone'] as const);
  if (params.end !== undefined) oneOf('hall', 'end', params.end, ['ring'] as const);
  if (params.turn && params.end) throw new Error('The lines either turn or bend, not both.');
  if (params.backward !== undefined && typeof params.backward !== 'boolean')
    throw new Error('hall backward must be true or false.');
  if (beats < (params.turn || params.end ? 6 : 4))
    throw new Error('Down or up the hall needs at least six beats (four with no ending).');
  // The top of the set is -z: down the hall faces +z (yaw 0).
  const facing = (direction === 'down') !== !!params.backward ? 0 : Math.PI;
  const travel = { x: 0, z: direction === 'down' ? DISTANCE : -DISTANCE };
  const walkEnd = params.turn || params.end ? beats - ENDING : beats;
  const left = leftOf(facing);

  const movers: Mover[] = [];
  for (const g of minorSets(state)) {
    const c = groupCenter(state, g);
    const line = lineOrder(state, g, c, facing, direction, !!params.backward);
    const slot = (i: number) => add(c, scale(left, (1.5 - i) * LINE_GAP));
    line.forEach((id, i) => {
      const b = body(state, id);
      const mate = i % 2 === 0 ? i + 1 : i - 1;
      const pairMiddle = add(mix(slot(i), slot(mate), 0.5), travel);
      const outer = i === 0 || i === line.length - 1;
      const ringCenter = add(c, travel);
      const end = (u: number, at: Vec2) => {
        if (params.turn === 'alone') {
          // Turn toward the neighbor in line: the left one of a pair turns right.
          const sign = i % 2 === 0 ? -1 : 1;
          return { position: at, yaw: facing + sign * Math.PI * ease(u) };
        }
        if (params.turn === 'couple') {
          // Wheel left: counterclockwise from above, decreasing angle in rotate().
          const angle = -Math.PI * progress(u);
          return {
            position: add(pairMiddle, rotate(sub(at, pairMiddle), angle)),
            yaw: facing - angle,
          };
        }
        if (params.end === 'ring') {
          const corner = {
            x: ringCenter.x + Math.sign(at.x - ringCenter.x) * SET.halfWidth,
            z: ringCenter.z + (outer ? 1 : -1) * SET.halfWidth * Math.cos(facing),
          };
          const yaw = facing + turn(heading(corner, ringCenter), facing) * smooth(u);
          return { position: mix(at, corner, smooth(u)), yaw };
        }
        return { position: at, yaw: facing };
      };
      movers.push({ id, from: b.position, yaw: b.yaw, slot: slot(i), end });
    });
  }
  // Waiting couples walk along, turning alone, and face across again at the top.
  // A couple still crossing over stays out of it.
  const grouped = new Set(activeIds(state));
  const crossing = new Set(state.waiting.filter((w) => w.crossing).map((w) => w.couple));
  for (const d of state.dancers) {
    if (grouped.has(d.id) || crossing.has(d.couple)) continue;
    const b = body(state, d.id);
    const across = heading(b.position, { x: 0, z: b.position.z });
    const end = (u: number, at: Vec2) => {
      if (direction === 'down') return { position: at, yaw: facing + Math.PI * ease(u) };
      return { position: at, yaw: facing + turn(across, facing) * ease(u) };
    };
    movers.push({ id: d.id, from: b.position, yaw: b.yaw, slot: b.position, end });
  }

  const motion = (beat: number) => ({
    bodies: movers.map((m) => {
      const formed = mix(m.from, m.slot, smooth(beat / FORM));
      const walked = add(formed, scale(travel, progress(clamp((beat - 0.5) / (walkEnd - 0.5)))));
      if (beat <= walkEnd) {
        const yaw = m.yaw + turn(facing, m.yaw) * smooth(beat / FORM);
        return { id: m.id, position: walked, yaw };
      }
      return { id: m.id, ...m.end((beat - walkEnd) / ENDING, walked) };
    }),
    contacts: [],
  });
  return {
    kind: 'hall-travel',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

/**
 * Order a minor set left to right in a line facing `facing`. Down the hall:
 * each side pair keeps the left-right order it had facing across. Up the
 * hall: the line already faces up; order by place.
 */
function lineOrder(
  state: DanceState,
  group: readonly number[],
  c: Vec2,
  facing: number,
  direction: 'down' | 'up',
  backward = false,
): number[] {
  const along = (id: number) => dot(sub(body(state, id).position, c), leftOf(facing));
  // A line already facing along the set keeps its order.
  if (direction === 'up' || backward) return [...group].sort((a, b) => along(b) - along(a));
  const sides = [-1, 1].map((s) =>
    group.filter((id) => Math.sign(body(state, id).position.x - c.x) === s),
  );
  if (sides.some((s) => s.length !== 2))
    throw new Error('Down the hall needs two dancers on each side to form a line of four.');
  sides.sort((a, b) => along(b[0]) - along(a[0]));
  return sides.flatMap((side) => {
    const p = body(state, side[0]).position;
    const l = leftOf(heading(p, { x: c.x, z: p.z }));
    return [...side].sort((a, b) =>
      dot(sub(body(state, b).position, body(state, a).position), l) > 0 ? 1 : -1,
    );
  });
}
