/**
 * Tempest: partners swing; the 1s end in a line of four facing down, the
 * 2s on their side lines facing in.
 *
 * Definition: in each side square both couples swing partners. The 1s
 * couple swings down into the line of four one level below (on the side of
 * the set its square is on), facing down the hall; the 2s couple ends on
 * its side line facing in. This is the end of the Tempest's progression:
 * the 1s have moved one level down, the 2s one level up.
 * Source: ContraDB 342 (Tempus Fugit, David Smukler), "partners swing (#1s
 * end facing down; #2s face in)"; Caller's Box glossary, "Swing".
 * Reading: the 1s end lark on the left facing down; the 2s end facing in
 * with the robin on the lark's left, as they started (see
 * formation-groups.ts).
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { TEMPEST, tempestRings } from '../../core/formation-groups.ts';
import { add, heading, length, mix, polar, progress, rotate, scale, smooth, sub, TAU } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { hold, inOut, steer, window } from './common.ts';
import { lineSpots, sideSpots } from './tempest-units.ts';

export type TempestSwingParams = Record<string, never>;

const ORBIT = 0.31;
const PACE = 1.0;
const EDGE = 1.5;
/** Share of the figure the 1s take to reach the line below. */
const TRAVEL = 0.85;
/** Share of the figure spent moving across first. */
const ACROSS = 0.35;

export const tempestSwing: Figure<TempestSwingParams> = (state, params, beats) => {
  onlyKeys('partners swing (Tempest)', params, []);
  const partner = state.relations.get('partner');
  const ones = new Set(state.positions.get('1s') ?? []);
  if (!partner) throw new Error('Nobody has a partner here.');
  const rings = tempestRings(state);
  if (!rings.length) throw new Error('No square of four to swing in.');
  const span = beats - 2 * EDGE;
  if (span < 4) throw new Error('Not enough beats to swing.');
  const turns = Math.max(1, Math.floor((PACE * span) / (TAU * ORBIT)));
  const plans = rings.flatMap((r) => {
    const ids = [...r.inner, ...r.outer];
    const couples: number[][] = [];
    for (const id of ids) {
      const p = partner.get(id)!;
      if (!ids.includes(p)) throw new Error(`Dancer ${id}'s partner is not in the square.`);
      if (id < p) couples.push([id, p]);
    }
    return couples.map((couple) => {
      const isOnes = couple.every((id) => ones.has(id));
      const targets: Map<number, Vec2> = isOnes
        ? lineSpots(state, couple, r.side, r.z + TEMPEST.level)
        : sideSpots(state, couple, r.side, r.z);
      const lark = couple.find((id) => state.dancers[id].role === 'lark')!;
      const robin = couple.find((id) => id !== lark)!;
      const a0 = body(state, lark).position;
      const b0 = body(state, robin).position;
      const m0 = mix(a0, b0, 0.5);
      const m1 = mix(targets.get(lark)!, targets.get(robin)!, 0.5);
      const h0 = sub(a0, m0);
      const h1 = sub(targets.get(lark)!, m1);
      const delta = (((polar(h1) - polar(h0)) % TAU) + TAU) % TAU;
      const finalYaw = isOnes ? 0 : r.side < 0 ? Math.PI / 2 : -Math.PI / 2;
      return {
        lark,
        robin,
        m0,
        m1,
        r0: length(h0),
        r1: length(h1),
        u0: scale(h0, 1 / length(h0)),
        sweep: turns * TAU + delta,
        travel: isOnes ? TRAVEL : 1,
        finalYaw,
      };
    });
  });
  type Plan = (typeof plans)[number];
  // Each couple first moves across to its column (the 1s nearer the middle,
  // the 2s to the side line), then along the set, so the couples never meet.
  const centerAt = (p: Plan, t: number) => ({
    x: p.m0.x + (p.m1.x - p.m0.x) * progress(Math.min(1, t / ACROSS)),
    z: p.m0.z + (p.m1.z - p.m0.z) * progress(window(t, ACROSS * 0.8, p.travel)),
  });
  const where = (p: Plan, t: number, sign: 1 | -1) => {
    const beat = t * beats;
    const close = smooth(window(beat, 0, EDGE));
    const open = smooth(window(beat, beats - EDGE, beats));
    const r = p.r0 + (ORBIT - p.r0) * close + (p.r1 - ORBIT) * open;
    const a = p.sweep * progress(window(beat, EDGE * 0.5, beats - EDGE * 0.5));
    return add(centerAt(p, t), scale(rotate(p.u0, a), sign * r));
  };
  const facing = new Map<number, (t: number) => number>();
  for (const p of plans)
    for (const [id, sign] of [
      [p.lark, 1],
      [p.robin, -1],
    ] as const)
      facing.set(id, steer((t) => heading(where(p, t, sign), centerAt(p, t)), body(state, id).yaw, p.finalYaw, EDGE / beats));
  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const p of plans) {
      bodies.push({ id: p.lark, position: where(p, t, 1), yaw: facing.get(p.lark)!(t) });
      bodies.push({ id: p.robin, position: where(p, t, -1), yaw: facing.get(p.robin)!(t) });
      contacts.push(hold(p.lark, 'right', p.robin, 'left', inOut(window(beat, EDGE * 0.5, beats - EDGE * 0.5), 0.1), bodies));
    }
    return { bodies, contacts };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
