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
/** How far each dancer closes toward the middle of the minor set's line. */
const GATHER = 0.35;

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
      const along = middle.z - b.position.z;
      const gather = { x: 0, z: Math.sign(along) * Math.min(GATHER, Math.abs(along)) };
      return { id, start: b, yaw, side: Math.sign(off), gather, group: g };
    });
  });

  // Hands along each side line, between line-mates of the same minor set.
  const holds: Hold[] = [];
  for (const g of minorSets(state)) {
    for (const side of [-1, 1]) {
      const line = movers
        .filter((m) => m.side === side && m.group === g)
        .sort((a, b) => a.start.position.z - b.start.position.z);
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1];
        const b = line[i];
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

  const motion = (beat: number) => {
    const t = beat / beats;
    const out = params.back ? (t < 0.5 ? progress(t * 2) : 1 - progress(t * 2 - 1)) : progress(t);
    const bodies = movers.map((m) => ({
      id: m.id,
      position: add(
        m.start.position,
        add(scale(forward(m.yaw), DEPTH * out), scale(m.gather, out)),
      ),
      yaw: m.start.yaw + turn(m.yaw, m.start.yaw) * smooth(beat / FACE_BEATS),
      lean: 0.05 * out,
    }));
    const map = bodyMap(bodies);
    const strength = smooth(beat / 0.75) * (params.back ? smooth((beats - beat) / 0.5) : 1);
    const contacts: FigureContact[] = holds.map((h) => withinReach(joined(h, strength), map));
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
