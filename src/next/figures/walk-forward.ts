/**
 * Walk forward (to the next wave, to the next neighbors).
 *
 * Definition: everyone lets go and walks straight ahead the way they face
 * to the next place: dancers facing along the set walk one place (to the
 * line where the next neighbors, walking the other way, arrive at the same
 * moment); dancers facing across walk out to their side line. Where they
 * arrive beside someone facing the other way within reach, they take hands
 * with them: walking forward out of an ocean wave arrives in the next wave.
 * Couples waiting out at the ends stay where they are.
 * Source: ContraDB rows "walk forward to next neighbors", "walk forward to
 * new wave", "dance forward to next neighbor" (after "balance the wave").
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import { add, distance, dot, forward, progress, scale, smooth, sub, turn } from '../core/math.ts';
import { activeIds, body, handToward, withChanges, type Body, type Hold } from '../core/state.ts';

/** Arriving this close beside someone facing the other way, take hands. */
const TAKE_HANDS = 1.2;

export const walkForward: Figure<Record<string, never>> = (state, params, beats) => {
  onlyKeys('walk forward', params, []);
  const movers = activeIds(state).map((id) => {
    const from = body(state, id);
    const ahead = forward(from.yaw);
    let to;
    if (Math.abs(ahead.x) > 0.7) {
      // Facing across: out to the side line ahead.
      const side = Math.sign(ahead.x) * SET.halfWidth;
      if (Math.abs(side - from.position.x) < 0.3)
        throw new Error(`Dancer ${id} already stands on the side line they face.`);
      to = { x: side, z: from.position.z };
    } else if (Math.abs(ahead.z) > 0.7) {
      to = add(from.position, { x: 0, z: Math.sign(ahead.z) * SET.slot });
    } else {
      throw new Error(`Dancer ${id} faces neither along nor across the set.`);
    }
    return { id, from, to };
  });
  const ends = new Map<number, Body>(movers.map((m) => [m.id, { position: m.to, yaw: m.from.yaw }]));
  const holds: Hold[] = [];
  for (const a of movers)
    for (const b of movers) {
      if (b.id <= a.id) continue;
      const ea = ends.get(a.id)!;
      const eb = ends.get(b.id)!;
      if (distance(ea.position, eb.position) > TAKE_HANDS) continue;
      if (Math.abs(Math.abs(turn(ea.yaw, eb.yaw)) - Math.PI) > 0.2) continue;
      // Side by side: the gap runs across the way they face.
      if (Math.abs(dot(forward(ea.yaw), sub(eb.position, ea.position))) > 0.2) continue;
      holds.push({
        a: a.id,
        handA: handToward(ea, eb.position),
        b: b.id,
        handB: handToward(eb, ea.position),
      });
    }

  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = movers.map((m) => ({
      id: m.id,
      position: add(m.from.position, scale(sub(m.to, m.from.position), q)),
      yaw: m.from.yaw,
    }));
    const map = bodyMap(bodies);
    const strength = smooth((beat - (beats - 0.75)) / 0.5);
    const contacts: FigureContact[] = holds.map((h) => withinReach(joined(h, strength), map));
    return { bodies, contacts };
  };
  const end = motion(beats).contacts;
  return {
    kind: 'unknown',
    motion,
    exit: withChanges(settle(state, motion, beats), {
      hands: holds.filter((_, i) => end[i].strength > 0.5),
    }),
  };
};
