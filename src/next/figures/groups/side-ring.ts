/**
 * Figures danced in the side squares of a Tempest set.
 *
 * Definition: after the 1s turn to face the 2s, each side of the set is a
 * square of four: a 1s couple and a 2s couple facing across, 1.8 m apart,
 * exactly a Becket minor set turned to stand on one side of the hall. An
 * ordinary contra figure called there ("circle left 2 places (two circles
 * either side of set)", "twos arch ones dive", "neighbors do si do",
 * "neighbors balance & swing") is danced in each square as in a Becket
 * minor set; neighbors are the dancers of the other role in the other
 * couple of the square.
 * Source: ContraDB 342 (Tempus Fugit, David Smukler); Caller's Box
 * glossary for each figure.
 * Each square is shown to the figure moved to the middle of the set and
 * its motion moved back (as layout.ts does for four face four).
 */
import type { Figure, FigureContact, FigureFrame, FigureResult, MovedBody } from '../../core/figure.ts';
import { tempestRings, type SideRing } from '../../core/formation-groups.ts';
import { complete } from '../../core/contacts.ts';
import { body, type Body, type DanceState, type Hold, withChanges } from '../../core/state.ts';
import { archDive } from '../sets/arch-dive.ts';
import { balance } from '../balance.ts';
import { circle } from '../circle.ts';
import { doSiDo } from '../do-si-do.ts';
import { swing } from '../swing.ts';

/** Far away: dancers outside the square, out of every figure's sight. */
const AWAY = 1000;

function runInRings(base: Figure<any>): Figure<any> {
  return (state, params, beats) => {
    const rings = tempestRings(state);
    if (!rings.length) throw new Error('No square of four stands on a side of the set.');
    const runs = rings.map((ring) => {
      const ids = [...ring.inner, ...ring.outer];
      const dx = ring.side * 1.5;
      const shift = (p: { x: number; z: number }) => ({ x: p.x - dx, z: p.z - ring.z });
      const back = (p: { x: number; z: number }) => ({ x: p.x + dx, z: p.z + ring.z });
      const bodies = new Map<number, Body>();
      for (const [id, b] of state.bodies)
        bodies.set(id, ids.includes(id) ? { ...b, position: shift(b.position) } : { ...b, position: { x: 0, z: AWAY + id } });
      const local = withChanges(state, {
        bodies,
        groups: [ids],
        relations: new Map(state.relations).set('neighbor', neighbors(state, ring)),
        layout: undefined,
        hands: state.hands.filter((h) => ids.includes(h.a) && ids.includes(h.b)),
      });
      return { ring, ids, back, local, result: base(local, params, beats) };
    });
    const motion = (beat: number): FigureFrame => {
      const bodies: MovedBody[] = [];
      const contacts: FigureContact[] = [];
      for (const r of runs) {
        const f = r.result.motion(beat);
        const near = new Map(r.local.bodies);
        for (const b of f.bodies) {
          near.set(b.id, { position: b.position, yaw: b.yaw });
          if (r.ids.includes(b.id)) bodies.push({ ...b, position: r.back(b.position) });
        }
        for (const c of f.contacts) {
          const point = complete(c, near).point;
          const w = r.back({ x: point.x, z: point.z });
          contacts.push({ ...c, point: { x: w.x, y: point.y, z: w.z } });
        }
      }
      return { bodies, contacts };
    };
    const exitBodies = new Map(state.bodies);
    const hands: Hold[] = [];
    for (const r of runs) {
      for (const id of r.ids) {
        const e = body(r.result.exit, id);
        exitBodies.set(id, { position: r.back(e.position), yaw: e.yaw });
      }
      hands.push(...r.result.exit.hands.filter((h) => r.ids.includes(h.a)));
    }
    const first: FigureResult = runs[0].result;
    return {
      kind: first.kind,
      motion,
      exit: withChanges(state, { bodies: exitBodies, hands }),
      ...(first.styled ? { styled: first.styled } : {}),
    };
  };
}

/** Neighbors in a square: each dancer and the other role in the other couple. */
function neighbors(state: DanceState, ring: SideRing) {
  const map = new Map<number, number>();
  for (const a of ring.inner) {
    const b = ring.outer.find((o) => state.dancers[o].role !== state.dancers[a].role);
    if (b !== undefined) map.set(a, b).set(b, a);
  }
  return map;
}

export const sideCircle = runInRings(circle);
export const sideArchDive = runInRings(archDive);
export const sideDoSiDo = runInRings(doSiDo);
export const sideBalance = runInRings(balance);
export const sideSwing = runInRings(swing);
