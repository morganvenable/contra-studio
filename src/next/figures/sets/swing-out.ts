/**
 * Swing, ending facing out ("partners swing, end facing the next").
 *
 * Definition: an ordinary swing (swing.ts) that ends with the pair side by
 * side on its own side of the minor set, lark on the left, facing away from
 * the other couple: toward the couple (or line) it meets next. Couples
 * facing couples (a Sicilian circle, four face four) end a swing this way
 * when the swing finishes the progression.
 * Source: Caller's Box glossary, "Swing"; ContraDB rows "partners swing, end
 * facing the next" (The Mariposa), "partners swing, face the next" (Fast
 * Living), "partners balance & swing and end facing new lines of 4" (Dance
 * All Night), "partners swing and face your direction of travel".
 * Reading: "the next", "new lines", "direction of travel/progression" and
 * "new neighbors" in these formations all mean facing out of the minor set,
 * away from the couple just danced with.
 *
 * Each pair dances the plain swing in a frame turned so that its side of
 * the minor set looks like the far side of a set lying beyond it.
 */
import type { Figure, FigureContact, FigureFrame, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { complete } from '../../core/contacts.ts';
import { SET } from '../../core/config.ts';
import { add, mean, polar, rotate, sub } from '../../core/math.ts';
import {
  body,
  groupCenter,
  minorSets,
  pairsIn,
  withChanges,
  type Body,
  type DanceState,
} from '../../core/state.ts';
import { swing, type SwingParams } from '../swing.ts';
import { assignRound, fourFaceFour, inLines, linePlaces, swingTo } from './square.ts';

export interface SwingOutParams {
  who: 'partner' | 'neighbor';
  meltdown?: boolean;
}

/** How far off the middle a pair must swing to know which side it ends on. */
const SIDE_MARGIN = 0.5;

interface Frame {
  readonly origin: { x: number; z: number };
  readonly angle: number;
}
const toLocal = (f: Frame, b: Body): Body => ({
  position: rotate(sub(b.position, f.origin), f.angle),
  yaw: b.yaw - f.angle,
});
const toWorld = (f: Frame, p: { x: number; z: number }) => add(f.origin, rotate(p, -f.angle));

export const swingOut: Figure<SwingOutParams> = (state, params, beats) => {
  onlyKeys('swing', params, ['who', 'meltdown']);
  if (params.who !== 'partner' && params.who !== 'neighbor')
    throw new Error('A swing that ends facing out pairs partners or neighbors.');
  const groups = minorSets(state);
  if (groups.some((g) => fourFaceFour(state, g) && !inLines(state, g)))
    return outOfSquare(state, params, beats);
  const runs = groups.flatMap((group) => {
    const middle = groupCenter(state, group);
    return pairsIn(state, group, params.who).map((pair) => {
      const c = mean(pair.map((id) => body(state, id).position));
      const across = c.x - middle.x;
      if (Math.abs(across) < SIDE_MARGIN)
        throw new Error('A swing that ends facing out must start nearer one side.');
      const side = Math.sign(across);
      // A set center beyond this side: the pair stands on its near side line.
      const frame: Frame = {
        origin: { x: middle.x + side * 2 * SET.halfWidth, z: c.z },
        angle: -polar({ x: side, z: 0 }),
      };
      const bodies = new Map<number, Body>();
      for (const [id, b] of state.bodies) bodies.set(id, toLocal(frame, b));
      const local: DanceState = withChanges(state, { bodies, groups: [pair], hands: [] });
      const swingParams: SwingParams = {
        who: params.who,
        ...(params.meltdown ? { meltdown: true } : {}),
      };
      return { frame, local, result: swing(local, swingParams, beats) };
    });
  });

  const motion = (beat: number): FigureFrame => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const run of runs) {
      const frame = run.result.motion(beat);
      const near = new Map(run.local.bodies);
      for (const b of frame.bodies) {
        near.set(b.id, { position: b.position, yaw: b.yaw });
        bodies.push({ ...b, position: toWorld(run.frame, b.position), yaw: b.yaw + run.frame.angle });
      }
      for (const c of frame.contacts) {
        const point = complete(c, near).point;
        const w = toWorld(run.frame, { x: point.x, z: point.z });
        const extra = c.bodyPoint
          ? (() => {
              const bp = toWorld(run.frame, { x: c.bodyPoint.x, z: c.bodyPoint.z });
              return { bodyPoint: { x: bp.x, y: c.bodyPoint.y, z: bp.z } };
            })()
          : {};
        contacts.push({ ...c, ...extra, point: { x: w.x, y: point.y, z: w.z } });
      }
    }
    return { bodies, contacts };
  };
  return {
    kind: 'swing',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

/**
 * Four face four, squared (after corners swing, a grand right and left):
 * partners swing into lines of four again, each couple on the couple's
 * place the way round to the right brings it to, facing out of the lines,
 * toward the next line.
 */
function outOfSquare(state: DanceState, params: SwingOutParams, beats: number) {
  if (params.who !== 'partner') throw new Error('From a square, only partners swing into lines.');
  if (beats < 4) throw new Error('A swing needs at least four beats.');
  const plans = minorSets(state).flatMap((group) => {
    if (group.length !== 8) throw new Error('A swing into lines needs the eight of a square.');
    const center = mean(group.map((id) => body(state, id).position));
    const out = linePlaces(center).map((p) => ({ ...p, yaw: p.yaw + Math.PI }));
    const to = assignRound(state, group, out, -1);
    return pairsIn(state, group, 'partner').map((pair) => swingTo(state, pair, to, beats));
  });
  const motion = (beat: number): FigureFrame => {
    const t = beat / beats;
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const p of plans) {
      const b = p.at(t);
      bodies.push(...b);
      contacts.push(...p.contacts(t, b));
    }
    return { bodies, contacts };
  };
  return {
    kind: 'swing' as const,
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
}
