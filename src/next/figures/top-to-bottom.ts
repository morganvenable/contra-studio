/**
 * Top two couples to the bottom, over everyone's heads ("top 2 couples form
 * line of 4, dance to the bottom over everyone's heads").
 *
 * Definition: the minor set at the top of the set (two couples) steps into a
 * line of four across the set, hands joined and raised as arches, and
 * dances down the middle of the hall to the bottom; everyone else steps up
 * one minor set's place along their own side lines, ducking under the
 * arches as they pass. At the bottom the four step back out to their own
 * places as they stood at the top. A whole-set progression: the set's top
 * minor set is now at the bottom.
 * Source: ContraDB "Riverside Jig" and its variation (Becket).
 * Reading: the line's arches stand wide (0.35 m and 2 m out from the middle
 * line on each side) so the dancers coming up the side lines pass under
 * them clear of the arching dancers.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import { add, clamp, mean, progress, smooth, sub, turn } from '../core/math.ts';
import { body, minorSets, withChanges } from '../core/state.ts';

/** Where the four stand across the set in the line, from the -x side. */
const LINE_X = [-2, -0.35, 0.35, 2];
/** Share of the beats spent forming the line, and stepping back out. */
const EDGE = 0.18;

export const topToBottom: Figure<Record<string, never>> = (state, params, beats) => {
  onlyKeys('top to bottom', params, []);
  const sets = [...minorSets(state)]
    .map((g) => ({ g, c: mean(g.map((id) => body(state, id).position)) }))
    .sort((a, b) => a.c.z - b.c.z);
  if (sets.length < 2) throw new Error('The top couples need a set below them to dance down.');
  const top = sets[0];
  const gap = sets[1].c.z - top.c.z;
  const bottom = sets[sets.length - 1].c.z;
  if (!(gap > 1)) throw new Error('The minor sets must stand one below another.');
  const others = state.dancers.map((d) => d.id).filter((id) => !top.g.includes(id));
  const lineOrder = [...top.g].sort((a, b) => body(state, a).position.x - body(state, b).position.x);
  // The line walks down facing down (+z); the others step up facing across.
  const startZ = top.c.z - 0.6;
  const endZ = bottom + 0.6;
  const plans = lineOrder.map((id, i) => {
    const b = body(state, id);
    const home = sub(b.position, top.c);
    const target = add(home, { x: 0, z: bottom });
    const lineAt = (z: number): Vec2 => ({ x: LINE_X[i], z });
    return { id, b, target: { x: target.x, z: target.z }, lineAt };
  });
  const motion = (beat: number) => {
    const t = beat / beats;
    const form = smooth(t / EDGE);
    const open = smooth((t - (1 - EDGE)) / EDGE);
    const walk = progress(clamp((t - EDGE * 0.6) / (1 - EDGE * 1.2)));
    const z = startZ + (endZ - startZ) * walk;
    const bodies = plans.map((p) => {
      const inLine = p.lineAt(z);
      const from = add(p.b.position, { x: (inLine.x - p.b.position.x) * form, z: (inLine.z - p.b.position.z) * form });
      const position = {
        x: from.x + (p.target.x - from.x) * open,
        z: from.z + (p.target.z - from.z) * open,
      };
      const yaw = p.b.yaw + turn(0, p.b.yaw) * smooth(t / EDGE);
      return { id: p.id, position, yaw: open > 0 ? yaw + turn(p.b.yaw, yaw) * open : yaw };
    });
    const up = progress(clamp((t - EDGE * 0.5) / (1 - EDGE)));
    for (const id of others) {
      const b = body(state, id);
      bodies.push({ id, position: { x: b.position.x, z: b.position.z - gap * up }, yaw: b.yaw });
    }
    const contacts: FigureContact[] = [];
    const hold = Math.min(smooth((t - EDGE * 0.5) / (EDGE * 0.5)), smooth((1 - EDGE - t) / (EDGE * 0.5)));
    // The middle two hold hands; the arches out to the sides are drawn open.
    contacts.push({ a: lineOrder[1], handA: 'left', b: lineOrder[2], handB: 'right', kind: 'joined', strength: hold });
    return { bodies, contacts };
  };
  return {
    kind: 'hall-travel',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
