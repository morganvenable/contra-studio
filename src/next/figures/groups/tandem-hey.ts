/**
 * Hey for three along a line, with tandem units: the dolphin hey and the
 * double dolphin hey.
 *
 * Definition: a hey for three in which a unit may be two dancers in tandem
 * (one following the other) who weave as one dancer. In a double dolphin
 * hey a line of five weaves as three: the dancer in the middle alone, and
 * the two dancers on each side of them as a tandem. The middle dancer
 * passes one side's unit by the named shoulder, then the other side's unit
 * by the other shoulder, and so on round a figure eight; the units loop
 * round the ends. A full hey brings everyone back to place.
 * Source: ContraDB 3521 (Quintilinear (variation), John Sweeney), "double
 * dolphin hey - start with no.1 passing 4&5 by left (2&3) 1 (4&5)" and its
 * note ("with #1 (now in the middle) the only one acting solo"); ContraDB
 * dolphin heys (1948 "gentlespoon one followed by ladle one starts by
 * passing ladle two by the left"); Caller's Box glossary, "Hey for three".
 * Reading: the three units keep a third of the figure eight apart and go
 * once round it in the beats given; the tandem's leader is whichever of the
 * two is ahead on the track (the inner one of the unit coming in first,
 * the outer one of the other). Dancers flow onto the track from their places
 * and back to them at the end, facing as they started.
 */
import type { Figure, MovedBody } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { add, dot, heading, leftOf, mix, progress, scale, sub } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { arcPath, everyone, inOut, named, steer } from './common.ts';

export interface TandemHeyParams {
  /** Position label of the dancer in the middle, who dances alone. */
  solo: string;
  /** Position label of a dancer in the unit the solo passes first. */
  toward: string;
  /** Shoulder of that first pass. */
  shoulder: 'left' | 'right';
}

/** Width of each loop of the figure eight, from its axis. */
const LOOP = 0.8;
/** Gap along the track between the two dancers of a tandem. */
const TANDEM = 1.0;
/** Share of the figure spent flowing onto the track, and again off it. */
const EDGE = 0.12;

export const tandemHey: Figure<TandemHeyParams> = (state, params, beats) => {
  onlyKeys('dolphin hey', params, ['solo', 'toward', 'shoulder']);
  const shoulder = oneOf('dolphin hey', 'shoulder', params.shoulder, ['left', 'right'] as const);
  const solos = named(state, params.solo, 'dolphin hey');
  const towards = named(state, params.toward, 'dolphin hey');
  if (solos.length !== 1 || towards.length !== 1)
    throw new Error('A dolphin hey names one dancer in the middle and one to pass first.');
  if (state.hands.length) throw new Error('A hey starts with free hands.');
  const solo = solos[0];
  const c = body(state, solo).position;
  const axis = sub(body(state, towards[0]).position, c);
  const e = scale(axis, 1 / Math.hypot(axis.x, axis.z));
  const n = leftOf(heading({ x: 0, z: 0 }, e));
  const along = (id: number) => dot(sub(body(state, id).position, c), e);
  const across = (id: number) => dot(sub(body(state, id).position, c), n);
  const others = everyone(state).filter((id) => id !== solo);
  for (const id of others)
    if (Math.abs(across(id)) > 0.3) throw new Error('A dolphin hey starts in a line.');
  // Inner dancer first on each side.
  const ahead = others.filter((id) => along(id) > 0).sort((a, b) => along(a) - along(b));
  const behind = others.filter((id) => along(id) < 0).sort((a, b) => along(b) - along(a));
  if (!ahead.length || ahead.length !== behind.length || ahead.length > 2)
    throw new Error('A dolphin hey needs the same unit (one or two dancers) on each side.');
  const tip = Math.max(...others.map((id) => Math.abs(along(id))));
  // First pass by the left: the unit coming in is on the solo's left (+n).
  const side = shoulder === 'left' ? -1 : 1;
  const track = arcPath((u) => {
    const th = u * 2 * Math.PI;
    const X = tip * Math.sin(th);
    const Z = side * 2 * LOOP * Math.sin(th) * Math.cos(th);
    return add(c, add(scale(e, X), scale(n, Z)));
  }, true);
  const L = track.length;
  // Units a third of the track apart: the one coming in, then the other.
  const half = ahead.length === 2 ? TANDEM / 2 : 0;
  const start = new Map<number, number>([[solo, 0]]);
  // The unit passed first is coming back in toward the middle: inner leads.
  start.set(ahead[0], L / 3 + half);
  if (ahead[1] !== undefined) start.set(ahead[1], L / 3 - half);
  // The other is heading out to its end: outer leads.
  start.set(behind[0], (2 * L) / 3 - half);
  if (behind[1] !== undefined) start.set(behind[1], (2 * L) / 3 + half);

  const ids = [solo, ...ahead, ...behind];
  const where = (id: number, t: number) => track.at(start.get(id)! + L * progress(t, 0.1));
  const facing = new Map(
    ids.map((id) => {
      const y = body(state, id).yaw;
      return [id, steer((t) => where(id, t).yaw, y, y, EDGE)];
    }),
  );
  const motion = (beat: number) => {
    const t = beat / beats;
    const w = inOut(t, EDGE);
    const bodies: MovedBody[] = ids.map((id) => {
      const s = body(state, id);
      return {
        id,
        position: mix(s.position, where(id, t).position, w),
        yaw: facing.get(id)!(t),
      };
    });
    return { bodies, contacts: [] };
  };
  return { kind: 'hey', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
