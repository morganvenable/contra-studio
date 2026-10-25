/**
 * Tempest: the 1s' lines of four down the hall and turn as couples, while
 * the 2s slide up.
 *
 * Definition: each line of four 1s walks down the middle of the set,
 * between the 2s, and each couple turns as a couple (the lark backing, the
 * robin walking forward) to face up. Meanwhile the 2s couples slide up
 * their side lines into the place the line left. A unit with no one to
 * meet waits out and changes kind: 2s at the top slide together into a
 * line of four facing down (the new 1s); a line of 1s at the bottom
 * separates into a couple on each side line facing in (the new 2s).
 * Source: ContraDB 342 (Tempus Fugit, David Smukler), "down the hall and
 * turn as a couple (two #1 cpls in line of four)" and its notes ("#2s must
 * slide up while #1s go down the hall"; "#2s when out at the top must slide
 * together and become new #1s facing down; #1s when out at bottom must
 * separate and face in along side"); Caller's Box glossary, "Down the hall".
 * Reading: the line walks 2 m down in the first nine sixteenths of the
 * beats and turns in the rest; the 2s slide one level (1.8 m) up.
 */
import type { Figure, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { TEMPEST } from '../../core/formation-groups.ts';
import { add, heading, mix, progress, smooth, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { window } from './common.ts';
import { lineSpots, sideSpots, tempestUnits, wheel } from './tempest-units.ts';

export type TempestLeadParams = Record<string, never>;

/** How far the lines walk down. */
export const TEMPEST_DOWN = 2;
/** Share of the beats spent walking, before the couples turn. */
const WALK = 9 / 16;

export const tempestLead: Figure<TempestLeadParams> = (state, params, beats) => {
  onlyKeys('down the hall (Tempest)', params, []);
  const { lines, sides } = tempestUnits(state);
  const D = TEMPEST.level;
  const active = lines.filter((l) => sides.some((s) => Math.abs(s.z - (l.z + D)) < 0.3));
  if (!active.length) throw new Error('No line of four has 2s below it.');
  for (const l of active)
    for (const id of [...l.west, ...l.east])
      if (Math.cos(body(state, id).yaw) < 0.7) throw new Error('The lines face down the hall.');
  const activeSides = sides.filter((s) => lines.some((l) => Math.abs(s.z - (l.z + D)) < 0.3));
  const waitingSides = sides.filter((s) => !activeSides.includes(s));
  const waitingLines = lines.filter((l) => !active.includes(l));
  const walkEnd = WALK * beats;
  const plans: ((beat: number) => MovedBody[])[] = [];
  for (const l of active) {
    for (const couple of [l.west, l.east]) {
      const down = new Map(couple.map((id) => [id, add(body(state, id).position, { x: 0, z: TEMPEST_DOWN })]));
      const moved = withChanges(state, {
        bodies: new Map([...state.bodies, ...[...down].map(([id, p]) => [id, { position: p, yaw: 0 }] as const)]),
      });
      // Turn as a couple: the robin walks forward round the lark (a half turn).
      const flip = new Map(couple.map((id) => {
        const other = couple.find((o) => o !== id)!;
        return [id, down.get(other)!];
      }));
      const w = wheel(moved, couple, flip, -Math.PI);
      plans.push((beat) =>
        couple.map((id) => {
          const s = body(state, id);
          if (beat <= walkEnd) {
            return { id, position: mix(s.position, down.get(id)!, progress(beat / walkEnd)), yaw: s.yaw };
          }
          const q = window(beat, walkEnd, beats);
          return { id, position: w.at(q).get(id)!, yaw: s.yaw - w.angle * progress(q) };
        }),
      );
    }
  }
  for (const s of activeSides) {
    for (const id of [...s.west, ...s.east]) {
      const b = body(state, id);
      plans.push((beat) => [
        { id, position: add(b.position, { x: 0, z: -D * progress(beat / beats) }), yaw: b.yaw },
      ]);
    }
  }
  // Waiting units change kind where they stand.
  const goTo = (targets: Map<number, { x: number; z: number }>, yaw: (id: number) => number) => {
    for (const [id, to] of targets) {
      const b = body(state, id);
      const travel = heading(b.position, to);
      plans.push((beat) => {
        const q = beat / beats;
        const face = b.yaw + turn(travel, b.yaw) * smooth(window(q, 0, 0.2));
        return [
          {
            id,
            position: mix(b.position, to, progress(q)),
            yaw: face + turn(yaw(id), travel) * smooth(window(q, 0.75, 1)),
          },
        ];
      });
    }
  };
  for (const s of waitingSides) {
    goTo(new Map([...lineSpots(state, s.west, -1, s.z), ...lineSpots(state, s.east, 1, s.z)]), () => 0);
  }
  for (const l of waitingLines) {
    const west = sideSpots(state, l.west, -1, l.z);
    const east = sideSpots(state, l.east, 1, l.z);
    goTo(new Map([...west, ...east]), (id) => (west.has(id) ? Math.PI / 2 : -Math.PI / 2));
  }
  const motion = (beat: number) => ({ bodies: plans.flatMap((p) => p(beat)), contacts: [] });
  return { kind: 'hall-travel', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
