/**
 * Diamond and cloverleaf: a minor set's ring, shifted or turned.
 *
 * Definitions:
 * - diamond ("circle left 3 places to a diamond, robins in the center",
 *   "star ... a little extra to form a diamond"): the four keep going an
 *   eighth of the way around their ring, so that they stand at the points of
 *   a diamond, two along the middle of the set and two out toward the sides.
 *   The role named "in the center" ends on the middle line of the set; with
 *   none named, the ring keeps turning clockwise (the way a circle left
 *   goes). Everyone faces the center.
 * - cloverleaf ("neighbors California twirl ... reach back to partners to
 *   form a cloverleaf", "cloverleaf left 3 places"): the four join hands in a
 *   ring facing out, and the ring turns the places named (one place is a
 *   quarter of the way around), left being clockwise seen from above as for
 *   a circle left.
 * Source: ContraDB rows "circle left 3 places to a diamond, ladles in the
 * center", "ladles chain to a diamond", "cloverleaf left 3 places", "turn
 * the clover left 3 places", "circle left 4 places in cloverleaf".
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { joined } from '../core/contacts.ts';
import {
  add,
  heading,
  length,
  mean,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { roleOfGroup } from '../core/roles.ts';
import { body, minorSets, roleOf, withChanges, type Hold } from '../core/state.ts';

export interface DiamondParams {
  /** The role that ends on the middle line of the set. */
  center?: 'larks' | 'robins';
}

export interface CloverleafParams {
  direction: 'left' | 'right';
  /** Quarter turns of the ring. */
  places: number;
}

/** Radius of a cloverleaf ring (shoulder to shoulder, facing out). */
const CLOVER_RADIUS = 0.7;
const FACE_BEATS = 1;

export const diamond: Figure<DiamondParams> = (state, params, beats) => {
  onlyKeys('diamond', params, ['center']);
  const role =
    params.center === undefined
      ? undefined
      : roleOfGroup(oneOf('diamond', 'center', params.center, ['larks', 'robins'] as const));
  const plans = minorSets(state).flatMap((g) => {
    const middle = mean(g.map((id) => body(state, id).position));
    // Clockwise from above is a positive rotation (core/math.ts).
    const off = (a: number) =>
      g
        .filter((id) => roleOf(state, id) === role)
        .reduce(
          (n, id) =>
            n +
            Math.abs(add(middle, rotate(sub(body(state, id).position, middle), a)).x - middle.x),
          0,
        );
    const a = role && off(-Math.PI / 4) < off(Math.PI / 4) ? -Math.PI / 4 : Math.PI / 4;
    return g.map((id) => {
      const s = body(state, id);
      return { id, s, rel: sub(s.position, middle), middle, a };
    });
  });
  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      const turned = p.a * progress(beat / beats);
      const position = add(p.middle, rotate(p.rel, turned));
      const inward = heading(position, p.middle);
      const yaw = p.s.yaw + turn(inward, p.s.yaw) * smooth(beat / Math.min(FACE_BEATS, beats));
      return { id: p.id, position, yaw };
    }),
    contacts: [],
  });
  return {
    kind: 'circle',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};

export const cloverleaf: Figure<CloverleafParams> = (state, params, beats) => {
  onlyKeys('cloverleaf', params, ['direction', 'places']);
  const direction = oneOf('cloverleaf', 'direction', params.direction, ['left', 'right'] as const);
  const places = params.places;
  if (!(places > 0 && places <= 8)) throw new Error('A cloverleaf turns between 0 and 8 places.');
  const sweep = (direction === 'left' ? 1 : -1) * places * (Math.PI / 2);
  const holds: Hold[] = [];
  const plans = minorSets(state).flatMap((g) => {
    if (g.length !== 4) throw new Error('A cloverleaf needs four dancers.');
    const middle = mean(g.map((id) => body(state, id).position));
    const around = [...g].sort(
      (x, y) =>
        Math.atan2(body(state, x).position.z - middle.z, body(state, x).position.x - middle.x) -
        Math.atan2(body(state, y).position.z - middle.z, body(state, y).position.x - middle.x),
    );
    around.forEach((id, i) => {
      // Facing out, each holds the next dancer around by the hand toward them.
      holds.push({ a: id, handA: 'right', b: around[(i + 1) % 4], handB: 'left' });
    });
    return g.map((id) => {
      const s = body(state, id);
      const rel = sub(s.position, middle);
      const r = length(rel);
      if (r < 0.2) throw new Error(`Dancer ${id} stands in the middle, not around a ring.`);
      return { id, s, rel, r, middle };
    });
  });
  const motion = (beat: number) => {
    const t = beat / beats;
    const formed = smooth(beat / Math.min(FACE_BEATS, beats / 2));
    const a = sweep * progress(t);
    const bodies = plans.map((p) => {
      const radius = p.r + (CLOVER_RADIUS - p.r) * formed;
      const position = add(p.middle, rotate(scale(p.rel, radius / p.r), a));
      // Facing out from where the dancer started, then turning with the ring.
      const outward = heading(p.middle, add(p.middle, p.rel));
      return { id: p.id, position, yaw: p.s.yaw + turn(outward, p.s.yaw) * formed - a };
    });
    const contacts: FigureContact[] = holds.map((h) =>
      joined(h, smooth((beat - 0.5) / 0.5) * smooth((beats - beat) / 0.3)),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'circle',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
