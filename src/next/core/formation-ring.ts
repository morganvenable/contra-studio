/**
 * Ring formations: everyone in one big circle facing the center, each
 * couple side by side with the robin on the lark's right (layout.center).
 * Neighbors (corners) are the dancers on each other's other side.
 *
 * - Circle mixer: partners change every time through. The progression
 *   finds couples where they stand: each lark's new partner is the robin now
 *   beside them on their right (usually the one they just swung).
 * - Circle: the same ring for dances that keep partners.
 *
 * Places are SET.slot apart along the ring (a chord), so a pair that swings
 * or turns ends exactly on its two places, as a contra pair would.
 */
import type { Vec2 } from '../../types.ts';
import { SET } from './config.ts';
import { createDancers } from './dancers.ts';
import type { Formation } from './formation.ts';
import { distance, dot, heading, rightOf, leftOf, sub } from './math.ts';
import type { CheckSpec, MeetingRule, SlotsModel } from './models.ts';
import type { Progression } from './progression.ts';
import { body, type Body, type DanceState, withChanges } from './state.ts';

export const RING_CENTER: Vec2 = { x: 0, z: 0 };

/** Radius of a ring of `n` places SET.slot apart. */
export const ringRadius = (n: number) => SET.slot / 2 / Math.sin(Math.PI / n);

/** The places of a ring of n dancers, the first nearest the band (lowest z). */
export function ringPlaces(n: number, center: Vec2 = RING_CENTER): Body[] {
  const r = ringRadius(n);
  const place = (j: number, dir: number): Body => {
    const a = -Math.PI / 2 + (dir * j * 2 * Math.PI) / n;
    const position = { x: center.x + r * Math.cos(a), z: center.z + r * Math.sin(a) };
    return { position, yaw: heading(position, center) };
  };
  // The next place round must be on the first dancer's right.
  const first = place(0, 1);
  const dir = dot(sub(place(1, 1).position, first.position), rightOf(first.yaw)) > 0 ? 1 : -1;
  return Array.from({ length: n }, (_, j) => place(j, dir));
}

/** Dancer on `id`'s right (or left) side, standing beside them facing the same way. */
export function besideOf(state: DanceState, id: number, side: 'right' | 'left', role?: string) {
  const b = body(state, id);
  const dir = side === 'right' ? rightOf(b.yaw) : leftOf(b.yaw);
  let best: number | undefined;
  let bestD = Infinity;
  for (const d of state.dancers) {
    if (d.id === id || (role && d.role !== role)) continue;
    const o = body(state, d.id);
    const v = sub(o.position, b.position);
    const along = dot(v, dir);
    const dd = distance(o.position, b.position);
    if (along < 1.2 || dd > 2.6) continue;
    if (dd < bestD) {
      best = d.id;
      bestD = dd;
    }
  }
  return best;
}

/** Partners and corners from where everyone stands in the ring. */
function ringRelations(state: DanceState) {
  const partner = new Map<number, number>();
  const neighbor = new Map<number, number>();
  for (const d of state.dancers) {
    if (d.role !== 'lark') continue;
    const p = besideOf(state, d.id, 'right', 'robin');
    if (p === undefined) throw new Error(`Lark ${d.couple + 1} has no robin on the right.`);
    if (partner.has(p)) throw new Error('Two larks have the same robin on their right.');
    partner.set(d.id, p).set(p, d.id);
    const n = besideOf(state, d.id, 'left', 'robin');
    if (n !== undefined) neighbor.set(d.id, n).set(n, d.id);
  }
  if (partner.size !== state.dancers.length)
    throw new Error('Not everyone stands beside a partner.');
  return { partner, neighbor };
}

export const MIXER_PROGRESSION: Progression = {
  kind: 'mixer',
  rebind(state) {
    const { partner, neighbor } = ringRelations(state);
    const relations = new Map(state.relations)
      .set('partner', partner)
      .set('neighbor', neighbor)
      .set('corner', neighbor);
    return withChanges(state, { relations, epoch: state.epoch + 1 });
  },
};

/** Everyone back on a place of the starting ring. */
const slotsSpec = (counts: number[], meeting: MeetingRule): CheckSpec => ({
  counts,
  meeting,
  rounds: (couples) => couples + 1,
  model: (couples, rounds): SlotsModel => {
    const places = ringPlaces(couples * 2);
    return {
      kind: 'slots',
      rounds,
      // Whoever stands where: a mixer moves larks and robins on round the places.
      larks: places.map((p) => p.position),
      robins: places.map((p) => p.position),
    };
  },
});

function ring(name: string, meeting: MeetingRule): Formation {
  return {
    name,
    shape: 'circle',
    grouping: 'whole-set',
    couples: { min: 3, max: 16 },
    moves: { circle: 'ring-circle', 'long-lines': 'forward-back', promenade: 'ring-promenade' },
    check: slotsSpec([4, 5, 6], meeting),
    start(couples) {
      if (!Number.isInteger(couples) || couples < 3 || couples > 16)
        throw new Error(`${name} needs 3-16 couples.`);
      const dancers = createDancers(couples);
      const places = ringPlaces(couples * 2);
      const bodies = new Map<number, Body>();
      // Lark k on place 2k, robin k on its right (place 2k + 1).
      for (const d of dancers) bodies.set(d.id, places[d.couple * 2 + (d.role === 'robin' ? 1 : 0)]);
      const state: DanceState = {
        dancers,
        bodies,
        hands: [],
        relations: new Map(),
        groups: [dancers.map((d) => d.id)],
        positions: new Map(),
        epoch: 0,
        waiting: [],
        layout: { center: RING_CENTER },
      };
      const { partner, neighbor } = ringRelations(state);
      return Object.freeze({
        ...state,
        relations: new Map([
          ['partner', partner],
          ['neighbor', neighbor],
          ['corner', neighbor],
        ]),
      });
    },
  };
}

export const CIRCLE_MIXER = ring('Circle mixer', 'all-partners');
export const BIG_CIRCLE = ring('Circle', 'none');
