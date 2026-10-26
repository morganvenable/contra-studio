/**
 * Triple minor: a proper longways set of six or more couples in minor sets
 * of three (1s, 2s, 3s from the top of each), every minor set dancing at
 * once.
 *
 * Progression: each time through the 1s of every minor set go down one
 * place and the 2s come up one (the figures carry the bodies); then new
 * minor sets form from the top down: each 1s couple with the two couples
 * now below it. A 1s couple with fewer than two couples below it waits at
 * the bottom and turns inactive (it will come up the set from there); a
 * couple at the top with two inactive couples below it becomes a 1s couple
 * and starts a new minor set. Couples not in a minor set wait in place.
 * Each minor set dances on its own (layout.separate), so whole-set figures
 * (casts, contra corners, stars with no places) stay inside it.
 * Source: Playford/ECD practice for triple minor sets ("1s progress one
 * place each time; at the top a couple waits out twice").
 */
import { SET } from './config.ts';
import { createDancers } from './dancers.ts';
import type { Formation } from './formation.ts';
import { coupleZ } from './models.ts';
import type { Progression } from './progression.ts';
import { couplesByPlace } from './progression-more.ts';
import { withChanges, type Body, type DanceState, type WaitingCouple } from './state.ts';

/** Places (top = 0) grouped from the top: [lark ids of each group], waiting, next actives. */
function regroup<T>(order: readonly T[], active: (c: T) => boolean) {
  const groups: T[][] = [];
  const waiting: T[] = [];
  const actives = new Set<T>();
  for (let i = 0; i < order.length; ) {
    const c = order[i];
    const two = order.slice(i + 1, i + 3);
    const free = two.length === 2 && two.every((k) => !active(k));
    // An active couple with two below starts a set; so does an inactive one
    // with two inactive couples below it, above every other set (the top).
    if (free && (active(c) || groups.length === 0)) {
      groups.push([c, ...two]);
      actives.add(c);
      i += 3;
    } else {
      waiting.push(c);
      i += 1;
    }
  }
  return { groups, waiting, actives };
}

/** Labels, groups and waiting couples for couples standing in `order` (top first). */
function arrange(
  state: DanceState,
  order: readonly { lark: number; robin: number }[],
  active: (lark: number) => boolean,
): DanceState {
  const { groups, waiting } = regroup(order, (c) => active(c.lark));
  const label = (k: number) => groups.flatMap((g) => [g[k].lark, g[k].robin]).sort((a, b) => a - b);
  const positions = new Map(state.positions)
    .set('1s', label(0))
    .set('2s', label(1))
    .set('3s', label(2));
  const ids = (g: { lark: number; robin: number }[]) => g.flatMap((c) => [c.lark, c.robin]);
  return withChanges(state, {
    groups: groups.map(ids),
    positions,
    waiting: waiting.map((c): WaitingCouple => ({ couple: state.dancers[c.lark].couple, crossed: true })),
    epoch: state.epoch + 1,
  });
}

export const TRIPLE_MINOR_PROGRESSION: Progression = {
  kind: 'triple-minor',
  atRoundEnd: true,
  rebind(state) {
    const ones = new Set(state.positions.get('1s') ?? []);
    return arrange(state, couplesByPlace(state), (lark) => ones.has(lark));
  },
};

/** Expected couple z after each round: the 1s and 2s of each set trade places, then regroup. */
export function tripleMinorModel(couples: number, rounds: number): number[][] {
  const z = (p: number) => (p - (couples - 1) / 2) * SET.slot;
  let order = Array.from({ length: couples }, (_, c) => c);
  // At the start every third couple from the top leads a set.
  let { groups, actives } = regroup(order, (c) => c % 3 === 0);
  const out: number[][] = [];
  for (let r = 0; r < rounds; r++) {
    for (const g of groups) {
      const i = order.indexOf(g[0]);
      [order[i], order[i + 1]] = [order[i + 1], order[i]];
    }
    order = [...order];
    const place = new Map(order.map((c, p) => [c, p]));
    out.push(Array.from({ length: couples }, (_, c) => z(place.get(c)!)));
    const next = regroup(order, (c) => actives.has(c));
    groups = next.groups;
    actives = next.actives;
  }
  return out;
}

export const TRIPLE_MINOR_SET: Formation = {
  name: 'Triple minor',
  shape: 'longways',
  grouping: 'triple-minor',
  // Two minor sets at least, so sets dance side by side and couples wait.
  couples: { min: 6, max: 15 },
  fit: (couples) => Math.max(6, Math.min(15, couples)),
  // Three minor sets, so sets dance side by side and couples wait at each end.
  display: 9,
  moves: { circle: 'whole-circle', 'star-wheel': 'star-around' },
  check: {
    counts: [6, 9],
    meeting: 'none',
    rounds: (couples) => couples + 3,
    model: (c, r) => coupleZ(tripleMinorModel(c, r)),
  },
  start(couples) {
    if (!Number.isInteger(couples) || couples < this.couples.min || couples > this.couples.max)
      throw new Error(`Triple minor needs ${this.couples.min}-${this.couples.max} couples.`);
    const dancers = createDancers(couples);
    const bodies = new Map<number, Body>();
    for (let c = 0; c < couples; c++) {
      const z = (c - (couples - 1) / 2) * SET.slot;
      bodies.set(c * 2, { position: { x: -SET.halfWidth, z }, yaw: Math.PI / 2 });
      bodies.set(c * 2 + 1, { position: { x: SET.halfWidth, z }, yaw: -Math.PI / 2 });
    }
    const state: DanceState = {
      dancers,
      bodies,
      hands: [],
      relations: new Map([['partner', new Map(dancers.map((d) => [d.id, d.id ^ 1]))]]),
      groups: [],
      positions: new Map(),
      epoch: 0,
      waiting: [],
      layout: { separate: true },
    };
    // Every third couple from the top leads a set.
    const order = Array.from({ length: couples }, (_, c) => ({ lark: c * 2, robin: c * 2 + 1 }));
    const first = new Set(order.filter((_, i) => i % 3 === 0).map((c) => c.lark));
    return Object.freeze({ ...arrange(state, order, (lark) => first.has(lark)), epoch: 0 });
  },
};
