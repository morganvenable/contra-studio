/**
 * Tempest: the 1s' lines up the hall, each couple turning to face the 2s
 * on its side.
 *
 * Definition: each line of four that came down the hall walks back up to
 * the 2s, now level with them, and each couple turns as a couple to face
 * the 2s couple on its own side, making a square of four on each side of
 * the set (a Becket minor set: couples facing across, 1.8 m apart).
 * Source: ContraDB 342 (Tempus Fugit, David Smukler), "up the hall and turn
 * as a couple (#1s turn to face nearest #2s)"; Caller's Box glossary, "Up
 * the hall", "Turn as a couple".
 * Reading: the line walks up the 2 m it went down in the first nine
 * sixteenths, then each couple wheels a quarter (the west couple turning
 * left, the east couple right) and widens to the 2s' width, ending lark on
 * the left.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { TEMPEST } from '../../core/formation-groups.ts';
import { add, mix, progress } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { window } from './common.ts';
import { TEMPEST_DOWN } from './tempest-lead.ts';
import { tempestUnits, wheel } from './tempest-units.ts';

export type TempestReturnParams = Record<string, never>;

const WALK = 9 / 16;

export const tempestReturn: Figure<TempestReturnParams> = (state, params, beats) => {
  onlyKeys('up the hall (Tempest)', params, []);
  const { lines, sides } = tempestUnits(state);
  // Lines facing up, with the 2s they meet one walk above them.
  const active = lines.filter(
    (l) =>
      Math.cos(body(state, l.west[0]).yaw) < -0.7 &&
      sides.some((s) => Math.abs(s.z - (l.z - TEMPEST_DOWN)) < 0.3),
  );
  if (!active.length) throw new Error('No line faces up toward its 2s.');
  const walkEnd = WALK * beats;
  const plans: ((beat: number) => MovedBody[])[] = [];
  const h = TEMPEST.level / 2;
  for (const l of active) {
    const z = l.z - TEMPEST_DOWN;
    for (const [couple, side] of [
      [l.west, -1],
      [l.east, 1],
    ] as const) {
      const up = new Map(couple.map((id) => [id, add(body(state, id).position, { x: 0, z: -TEMPEST_DOWN })]));
      const moved = withChanges(state, {
        bodies: new Map([...state.bodies, ...[...up].map(([id, p]) => [id, { position: p, yaw: Math.PI }] as const)]),
      });
      // Facing out, lark on the left: west couple faces -x (left is +z).
      const lark = couple.find((id) => state.dancers[id].role === 'lark')!;
      const robin = couple.find((id) => id !== lark)!;
      const x = side * TEMPEST.inner;
      const to = new Map<number, Vec2>([
        [lark, { x, z: side < 0 ? z + h : z - h }],
        [robin, { x, z: side < 0 ? z - h : z + h }],
      ]);
      const w = wheel(moved, couple, to);
      plans.push((beat) =>
        couple.map((id) => {
          const s = body(state, id);
          if (beat <= walkEnd)
            return { id, position: mix(s.position, up.get(id)!, progress(beat / walkEnd)), yaw: s.yaw };
          const q = window(beat, walkEnd, beats);
          return { id, position: w.at(q).get(id)!, yaw: s.yaw - w.angle * progress(q) };
        }),
      );
    }
  }
  const motion = (beat: number) => ({ bodies: plans.flatMap((p) => p(beat)), contacts: [] });
  return { kind: 'hall-travel', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
