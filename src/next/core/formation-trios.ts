/**
 * Three face three: lines of three face lines of three all round a big
 * circle (like a Sicilian circle with trios), each trio a center between
 * two ends. Drawn as a set with no ends (layout.period): the trios facing
 * +z ("1s") travel on round the circle one way and those facing -z ("2s")
 * the other; the display bends it into a circle.
 *
 * Reading: the center of each trio dances the lark's part and the ends the
 * robins' (most three face three dances are written for any trio). Each
 * dancer's neighbor (and opposite) is the dancer straight across in the
 * facing line. Trios are numbered as "couples" for the app (dancer 3k + 1
 * is trio k's center).
 */
import type { Dancer } from '../../types.ts';
import { SET } from './config.ts';
import type { Formation } from './formation.ts';
import type { CheckSpec } from './models.ts';
import type { Progression } from './progression.ts';
import { ahead } from './progression-more.ts';
import { body, type Body, type DanceState, withChanges } from './state.ts';

const SPACING = 2 * SET.halfWidth;

function trioDancers(trios: number): Dancer[] {
  return Array.from({ length: trios * 3 }, (_, id) => {
    const trio = Math.floor(id / 3);
    const center = id % 3 === 1;
    const side = id % 3 === 0 ? 'Left' : 'Right';
    return {
      id,
      name: center ? `Center ${trio + 1}` : `${side} ${trio + 1}`,
      role: center ? 'lark' : 'robin',
      couple: trio,
      direction: trio % 2 ? -1 : 1,
      color: center ? '#438b86' : '#cb815a',
    } satisfies Dancer;
  });
}

/** Neighbors: the dancer straight across (same x) in the line each trio faces. */
function across(state: DanceState, groups: readonly (readonly number[])[]) {
  const neighbor = new Map<number, number>();
  for (const g of groups) {
    for (const a of g) {
      const pa = body(state, a).position;
      const b = g.find((o) => {
        if (o === a || Math.floor(o / 3) === Math.floor(a / 3)) return false;
        return Math.abs(body(state, o).position.x - pa.x) < 0.3;
      });
      if (b !== undefined) neighbor.set(a, b);
    }
  }
  return neighbor;
}

export const TRIOS_PROGRESSION: Progression = {
  kind: 'trios',
  rebind(state) {
    const period = state.layout?.period;
    if (!period) throw new Error('Three face three needs a set with no ends.');
    const ones = new Set(state.positions.get('1s') ?? []);
    const trios = new Map<number, { ids: number[]; z: number; x: number }>();
    for (const d of state.dancers) {
      const t = trios.get(d.couple) ?? { ids: [], z: 0, x: 0 };
      t.ids.push(d.id);
      trios.set(d.couple, t);
    }
    for (const t of trios.values()) {
      const ps = t.ids.map((id) => body(state, id).position);
      t.z = ps.reduce((n, p) => n + p.z, 0) / ps.length;
      t.x = ps.reduce((n, p) => n + p.x, 0) / ps.length;
    }
    const groups: number[][] = [];
    const met = new Set<number>();
    for (const [k, t] of trios) {
      if (!ones.has(t.ids[0])) continue;
      const found = [...trios].filter(
        ([j, o]) =>
          !ones.has(o.ids[0]) && Math.abs(ahead(t.z, o.z, period) - SET.slot) < 0.3 && j !== k,
      );
      if (found.length !== 1) throw new Error(`Trio ${k + 1} does not face one line of three ahead.`);
      const [j, o] = found[0];
      if (met.has(j)) throw new Error(`Trio ${j + 1} is met by two lines.`);
      met.add(j);
      groups.push([...t.ids, ...o.ids]);
    }
    const neighbor = across(state, groups);
    const relations = new Map(state.relations).set('neighbor', neighbor).set('opposite', neighbor);
    return withChanges(state, { relations, groups, epoch: state.epoch + 1 });
  },
};

const trioCheck: CheckSpec = {
  counts: [4, 6],
  meeting: 'none',
  rounds: (trios) => trios / 2 + 1,
  model: (trios, rounds) => {
    const start = THREE_FACE_THREE.start(trios);
    const ones = new Set(start.positions.get('1s'));
    return {
      kind: 'dancer',
      period: trios * SET.slot,
      rounds: Array.from({ length: rounds }, (_, r) =>
        start.dancers.map((d) => {
          const p = start.bodies.get(d.id)!.position;
          return { x: p.x, z: p.z + (ones.has(d.id) ? 1 : -1) * (r + 1) * SET.slot };
        }),
      ),
    };
  },
};

/** `couples` counts lines of three here (an even number, at least four). */
export const THREE_FACE_THREE: Formation = {
  name: 'Three face three',
  shape: 'sicilian',
  grouping: 'duple-minor',
  couples: { min: 4, max: 12 },
  fit: (trios) => Math.max(4, trios - (trios % 2)),
  moves: { 'long-lines': 'forward-back', circle: 'whole-circle', swing: 'place-swing' },
  check: trioCheck,
  start(trios) {
    if (!Number.isInteger(trios) || trios < 4 || trios > 12 || trios % 2)
      throw new Error('Three face three needs an even number of lines of three, 4 to 12.');
    const dancers = trioDancers(trios);
    const bodies = new Map<number, Body>();
    const ones: number[] = [];
    const twos: number[] = [];
    for (let k = 0; k < trios; k++) {
      const z = (k - (trios - 1) / 2) * SET.slot;
      const forward = k % 2 === 0;
      const yaw = forward ? 0 : Math.PI;
      // The line's left is +x facing +z, -x facing -z.
      const left = forward ? 1 : -1;
      [1, 0, -1].forEach((slot, i) => {
        bodies.set(3 * k + i, { position: { x: left * slot * SPACING, z }, yaw });
      });
      (forward ? ones : twos).push(3 * k, 3 * k + 1, 3 * k + 2);
    }
    const groups: number[][] = [];
    for (let k = 0; k < trios; k += 2)
      groups.push([3 * k, 3 * k + 1, 3 * k + 2, 3 * k + 3, 3 * k + 4, 3 * k + 5]);
    const base: DanceState = {
      dancers,
      bodies,
      hands: [],
      relations: new Map(),
      groups,
      positions: new Map([
        ['1s', ones],
        ['2s', twos],
        ['centers', dancers.filter((d) => d.id % 3 === 1).map((d) => d.id)],
        ['outsides', dancers.filter((d) => d.id % 3 !== 1).map((d) => d.id)],
      ]),
      epoch: 0,
      waiting: [],
      layout: { period: trios * SET.slot, lines: 'facing' },
    };
    const neighbor = across(base, groups);
    return Object.freeze({
      ...base,
      relations: new Map([
        ['neighbor', neighbor],
        ['opposite', neighbor],
      ]),
    });
  },
};
