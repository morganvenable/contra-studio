/**
 * Long wave in the center: one role dances into the middle of the set.
 *
 * Definition: "robins dance in to a long wave in the center - balance the
 * wave": the named role steps forward from the side lines into one line down
 * the middle of the set, each facing the side they came from's opposite
 * (the way they walked), so neighbors in the line face opposite ways, and
 * they join hands along it: a long wave in the center. The others stay on
 * the side lines. "X dance out while Y dance in": the dancers in the center
 * first back out to the side line they came from (facing in) while the
 * others dance in. "& balance": balance the wave right and left (the last
 * 4 beats; half of a shorter row).
 *
 * Geometry: in each minor set the two dancers of the role take the center
 * line level with the minor set's middle, 1.2 m apart, so hands join inside
 * each minor set; between minor sets the gap is wider than a reach, so those
 * hands join only where they reach (as for long waves on the side lines).
 * Source: Caller's Box glossary, "Long wave", "Balance"; ContraDB rows
 * "ladles dance in to a long wave in the center - balance the wave",
 * "ladles dance out while gentlespoons dance in to a long wave in the
 * center - balance the wave" (Trip to Brown University, 1381).
 *
 * Dancers of the role already in the center line stay in it and re-form
 * the wave. Dancers of the other role still in the center when one role
 * dances in dance out, as if the row said so.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import { add, ease, forward, mix, progress, rightOf, scale, smooth, turn } from '../core/math.ts';
import { roleOfGroup } from '../core/roles.ts';
import {
  body,
  groupCenter,
  handToward,
  minorSets,
  roleOf,
  withChanges,
  type Body,
  type Hold,
} from '../core/state.ts';

export interface CenterWaveParams {
  /** The role that dances into the center. */
  in: 'larks' | 'robins';
  /** The role that backs out of the center first, if any. */
  out?: 'larks' | 'robins';
  /** Balance the wave once formed. */
  balance?: boolean;
}

/** Distance between the two dancers of one minor set in the center line. */
const PAIR_GAP = 1.2;
/** Farther than this from the center line counts as on a side line. */
const SIDE = 0.5;
const STEP = 0.1;
const STEPS = [0, 1, 0, -1, 0];
/** Neighbors in the center line join hands when this close. */
const LINE_REACH = 2.2;

export const centerWave: Figure<CenterWaveParams> = (state, params, beats) => {
  onlyKeys('center wave', params, ['in', 'out', 'balance']);
  const inRole = roleOfGroup(oneOf('center wave', 'in', params.in, ['larks', 'robins'] as const))!;
  const outRole =
    params.out === undefined
      ? undefined
      : roleOfGroup(oneOf('center wave', 'out', params.out, ['larks', 'robins'] as const))!;
  if (outRole === inRole) throw new Error('The same role cannot dance in and out.');
  if (params.balance !== undefined && typeof params.balance !== 'boolean')
    throw new Error('center wave balance must be true or false.');
  const formBeats = params.balance ? (beats >= 8 ? beats - 4 : beats / 2) : beats;
  if (formBeats < 1) throw new Error('A long wave needs a beat to form.');

  const targets = new Map<number, Body>();
  const center: number[] = [];
  for (const g of minorSets(state)) {
    const middle = groupCenter(state, g);
    const comers = g
      .filter((id) => roleOf(state, id) === inRole)
      .sort((a, b) => body(state, a).position.z - body(state, b).position.z);
    if (comers.length !== 2) throw new Error(`A long wave needs two ${params.in} in each minor set.`);
    comers.forEach((id, i) => {
      const b = body(state, id);
      const off = b.position.x - middle.x;
      // Walk in from your side, facing the far side; in the center already,
      // face across the way nearer your facing.
      const yaw =
        Math.abs(off) >= SIDE
          ? off > 0
            ? -Math.PI / 2
            : Math.PI / 2
          : forward(b.yaw).x >= 0
            ? Math.PI / 2
            : -Math.PI / 2;
      targets.set(id, {
        position: { x: middle.x, z: middle.z + (i ? 1 : -1) * (PAIR_GAP / 2) },
        yaw,
      });
      center.push(id);
    });
    for (const id of g.filter((d) => roleOf(state, d) !== inRole)) {
      const b = body(state, id);
      const inCenter = Math.abs(b.position.x - middle.x) <= SIDE;
      if (outRole && !inCenter) throw new Error(`Dancer ${id} is not in the center to dance out.`);
      if (inCenter) {
        // Back out to the side behind you, still facing in.
        const back = -Math.sign(forward(b.yaw).x) || 1;
        targets.set(id, {
          position: { x: middle.x + back * SET.halfWidth, z: b.position.z },
          yaw: back > 0 ? -Math.PI / 2 : Math.PI / 2,
        });
      }
    }
  }
  const line = center
    .map((id) => ({ id, to: targets.get(id)! }))
    .sort((a, b) => a.to.position.z - b.to.position.z);
  const holds: Hold[] = [];
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    if (Math.abs(a.to.position.x - b.to.position.x) > 0.3) continue;
    if (b.to.position.z - a.to.position.z > LINE_REACH) continue;
    holds.push({
      a: a.id,
      handA: handToward(a.to, b.to.position),
      b: b.id,
      handB: handToward(b.to, a.to.position),
    });
  }
  const movers = [...targets].map(([id, to]) => ({ id, from: body(state, id), to }));
  const inCenter = new Set(center);

  const motion = (beat: number) => {
    const t = Math.min(1, beat / formBeats);
    const q = progress(t);
    const steps =
      params.balance && beat > formBeats ? ((beat - formBeats) / (beats - formBeats)) * 4 : 0;
    const i = Math.min(3, Math.floor(steps));
    const side = params.balance ? STEPS[i] + (STEPS[i + 1] - STEPS[i]) * ease(steps - i) : 0;
    const bodies = movers.map(({ id, from, to }) => {
      const yaw = from.yaw + turn(to.yaw, from.yaw) * smooth(t / 0.6);
      const sway = inCenter.has(id) ? scale(rightOf(to.yaw), STEP * side) : { x: 0, z: 0 };
      return { id, position: add(mix(from.position, to.position, q), sway), yaw };
    });
    const map = bodyMap(bodies);
    const strength = smooth((t - 0.6) / 0.3);
    const contacts: FigureContact[] = holds.map((h) => withinReach(joined(h, strength), map));
    return { bodies, contacts };
  };
  const end = motion(beats).contacts;
  const kept = holds.filter((_, i) => end[i].strength > 0.5);
  return {
    kind: params.balance ? 'wave-balance' : 'pass-to-wave',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: kept }),
  };
};
