/**
 * Long lines forward and back.
 *
 * Definition: everyone in the two side lines joins hands along their line,
 * faces across, walks forward toward the other line for half the beats and
 * backs up to place for the other half ("forward & back"), or only walks
 * forward ("long lines forward"). "Long lines back" is the second half on
 * its own: lines that went forward (or stand in from the side lines) back
 * up to the side lines, still facing across.
 * Source: Caller's Box glossary, "Long lines"; ContraDB rows "long lines
 * forward & back", "long lines forward". Dancers who are not quite facing
 * across turn to face across over the first beat.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import { SET } from '../core/config.ts';
import { add, forward, progress, scale, smooth, sub, turn } from '../core/math.ts';
import {
  body,
  groupCenter,
  handToward,
  minorSets,
  withChanges,
  type Body,
  type Hold,
} from '../core/state.ts';

export interface LongLinesParams {
  /** True: forward and back. False: forward only. */
  back: boolean;
  /** Only the backing-up half. */
  only?: 'back';
}

/** How far each line walks in toward the other. */
const DEPTH = 0.5;
const FACE_BEATS = 1;
/** Radians a beat, at most, turning to face across. */
const TURN_RATE = 2.5;
/** Forward only: how far each dancer closes toward its minor set's middle, and the closest line-mates come. */
const GATHER = 0.35;
const LINE_GAP = 0.75;
/** Line-mates hold hands this far apart (m), the line closed up. */
const LINE_HOLD = 1.5;
/** Line-mates farther apart than this are not in the same line. */
const LINE_REACH = 2.2;
/** Beats to close the line up (and open it again). */
const CLOSE_BEATS = 0.75;

export const longLines: Figure<LongLinesParams> = (state, params, beats) => {
  onlyKeys('long lines', params, ['back', 'only']);
  if (typeof params.back !== 'boolean') throw new Error('long lines back must be true or false.');
  if (params.only !== undefined) {
    if (params.only !== 'back' || !params.back)
      throw new Error('Long lines can do only the back half, with back: true.');
    return backOnly(state, beats);
  }
  const movers = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    return g.map((id) => {
      const b = body(state, id);
      const off = b.position.x - middle.x;
      if (Math.abs(Math.abs(off) - SET.halfWidth) > 0.3)
        throw new Error(`Dancer ${id} is not standing in a side line.`);
      const yaw = off > 0 ? -Math.PI / 2 : Math.PI / 2;
      // Farther to turn (from facing out or along) takes longer.
      const turnBeats = (1.5 * Math.abs(turn(yaw, b.yaw))) / TURN_RATE;
      const face = Math.min(beats / 3, Math.max(FACE_BEATS, turnBeats));
      return { id, start: b, yaw, side: Math.sign(off), gather: { x: 0, z: 0 }, face };
    });
  });

  // Everyone in a side line takes hands with both neighbors: each run of
  // the line (line-mates within LINE_REACH of the next) closes up toward its
  // middle until neighbors stand LINE_HOLD apart, near arm's length.
  const holds: Hold[] = [];
  for (const side of [-1, 1]) {
    const line = movers
      .filter((m) => m.side === side)
      .sort((a, b) => a.start.position.z - b.start.position.z);
    const runs: (typeof line)[] = [];
    for (const m of line) {
      const run = runs.at(-1);
      if (run && m.start.position.z - run.at(-1)!.start.position.z <= LINE_REACH) run.push(m);
      else runs.push([m]);
    }
    for (const run of runs) {
      if (!params.back) continue;
      const z = run.map((m) => m.start.position.z);
      const mid = (z[0] + z.at(-1)!) / 2;
      const widest = Math.max(0, ...z.slice(1).map((v, i) => v - z[i]));
      const k = widest > LINE_HOLD ? LINE_HOLD / widest : 1;
      for (const m of run) m.gather = { x: 0, z: (m.start.position.z - mid) * (k - 1) };
      for (let i = 1; i < run.length; i++) {
        const [a, b] = [run[i - 1], run[i]];
        const fa: Body = { position: a.start.position, yaw: a.yaw };
        const fb: Body = { position: b.start.position, yaw: b.yaw };
        holds.push({
          a: a.id,
          handA: handToward(fa, fb.position),
          b: b.id,
          handB: handToward(fb, fa.position),
        });
      }
    }
  }

  // Forward only (into the middle, for what follows there): each minor
  // set's line gathers toward its middle and holds hands within it.
  if (!params.back) {
    for (const m of movers) {
      const g = minorSets(state).find((x) => x.includes(m.id))!;
      const along = groupCenter(state, g).z - m.start.position.z;
      m.gather = {
        x: 0,
        z: Math.sign(along) * Math.min(GATHER, Math.max(0, Math.abs(along) - LINE_GAP / 2)),
      };
    }
    for (const g of minorSets(state))
      for (const side of [-1, 1]) {
        const line = movers
          .filter((m) => m.side === side && g.includes(m.id))
          .sort((a, b) => a.start.position.z - b.start.position.z);
        for (let i = 1; i < line.length; i++) {
          const [a, b] = [line[i - 1], line[i]];
          const fa: Body = { position: a.start.position, yaw: a.yaw };
          const fb: Body = { position: b.start.position, yaw: b.yaw };
          holds.push({ a: a.id, handA: handToward(fa, fb.position), b: b.id, handB: handToward(fb, fa.position) });
        }
      }
  }

  const motion = (beat: number) => {
    const t = beat / beats;
    const out = params.back ? (t < 0.5 ? progress(t * 2) : 1 - progress(t * 2 - 1)) : progress(t);
    // The line closes up as it takes hands, and opens to the places again
    // as the figure ends.
    const closed = params.back
      ? smooth(beat / CLOSE_BEATS) * smooth((beats - beat) / CLOSE_BEATS)
      : progress(t);
    const bodies = movers.map((m) => ({
      id: m.id,
      position: add(
        m.start.position,
        add(scale(forward(m.yaw), DEPTH * out), scale(m.gather, closed)),
      ),
      yaw: m.start.yaw + turn(m.yaw, m.start.yaw) * smooth(beat / m.face),
      lean: 0.05 * out,
    }));
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = holds.map((h) => withinReach(joined(h, 1), map));
    return { bodies, contacts };
  };
  return {
    kind: 'long-lines',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: params.back ? [] : holds }),
  };
};

/** Lines standing in from the side lines back up to them, facing across. */
const backOnly = (state: Parameters<typeof longLines>[0], beats: number) => {
  const movers = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    return g.map((id) => {
      const b = body(state, id);
      const off = b.position.x - middle.x;
      if (Math.abs(off) < 0.2 || Math.abs(off) > SET.halfWidth + 0.05)
        throw new Error(`Dancer ${id} is not standing in a line to back up from.`);
      const side = Math.sign(off);
      const yaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      return { id, start: b, yaw, to: { x: middle.x + side * SET.halfWidth, z: b.position.z } };
    });
  });
  const motion = (beat: number) => {
    const q = progress(beat / beats);
    return {
      bodies: movers.map((m) => ({
        id: m.id,
        position: add(m.start.position, scale(sub(m.to, m.start.position), q)),
        yaw: m.start.yaw + turn(m.yaw, m.start.yaw) * smooth(beat / FACE_BEATS),
      })),
      contacts: state.hands.map((h) => joined(h, smooth((beats - beat) / 0.5))),
    };
  };
  return {
    kind: 'long-lines' as const,
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
