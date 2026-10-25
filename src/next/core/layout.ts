/**
 * Layouts: where a formation's groups stand, so the same figures run in
 * any of them. Every figure is written for a contra minor set: a group of
 * dancers around a center near x = 0, the set running along z. A layout
 * says how to show each group to a figure that way, and the figure's
 * motion is mapped back:
 *
 * - columns: groups stand side by side across the hall (four face four is
 *   two improper sets side by side). Each group runs with its own column
 *   moved to x = 0.
 * - period: the set has no ends (a Sicilian circle). Raw positions run
 *   along z forever and repeat every `period` meters; a group that spans
 *   the seam is unwrapped before it runs. The display bends z round a
 *   circle (bend.ts).
 * - center: dancers stand at true positions around a center (a circle
 *   mixer, a square). A figure danced in pairs ("partners swing") runs for
 *   each pair in a frame turned so the center of the set is straight
 *   across (-x), the pair standing on its side line (x = +halfWidth), so
 *   the pair ends where a contra pair would: side by side, lark on the
 *   left, facing in.
 *
 * Any figure may also take `among`: position labels or role groups
 * ("1s", "2s", "larks", "middle", "ends" ...) naming who dances it. The
 * figure then runs on just those dancers of each group; everyone else stands.
 *
 * A figure that names a relationship the figure itself doesn't list
 * ("corners swing") runs with that relationship standing in for partners.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact, FigureFrame, FigureResult, MovedBody } from './figure.ts';
import { add, length, mean, polar, rotate, scale, sub } from './math.ts';
import { SET } from './config.ts';
import { complete } from './contacts.ts';
import { body, type Body, type DanceState, type Hold, withChanges } from './state.ts';

export interface Layout {
  /** Groups stand in columns across the set, each run with its column at x = 0. */
  readonly columns?: boolean;
  /** Raw z repeats every `period` meters: a set with no ends. */
  readonly period?: number;
  /** Dancers stand at true positions around this point. */
  readonly center?: Vec2;
  /**
   * "Long lines forward & back" here means lines facing each other along
   * the set walk toward each other (four face four, Sicilian circles).
   */
  readonly lines?: 'facing';
  /** Each dancer's home place (a square, a ring), for "promenade home". */
  readonly homes?: ReadonlyMap<number, Vec2>;
}

/** World <-> local: local = rotate(world + shift - origin, angle); yaw' = yaw - angle. */
interface Frame {
  readonly origin: Vec2;
  readonly angle: number;
  /** Per-dancer unwrap along z (periodic sets). */
  readonly shift?: ReadonlyMap<number, number>;
}

const IDENTITY: Frame = { origin: { x: 0, z: 0 }, angle: 0 };

function toLocal(f: Frame, id: number, b: Body): Body {
  const s = f.shift?.get(id) ?? 0;
  const p = { x: b.position.x, z: b.position.z + s };
  return { position: rotate(sub(p, f.origin), f.angle), yaw: b.yaw - f.angle };
}

function toWorld(f: Frame, id: number, p: Vec2, yaw: number): Body {
  const w = add(f.origin, rotate(p, -f.angle));
  const s = f.shift?.get(id) ?? 0;
  return { position: { x: w.x, z: w.z - s }, yaw: yaw + f.angle };
}

/** Relations a figure is asked to dance with, which it may not list itself. */
const STANDARD = new Set(['partner', 'neighbor']);

/**
 * Pair figures that name a place instead of a relationship ("ones
 * allemande right 1½", "heads do si do"): those dancers dance it with their
 * partners. Only for figures that do not take places themselves.
 */
const PAIRS_BY_PLACE = new Set(['allemande', 'balance', 'do-si-do', 'gyre', 'pass-by', 'promenade']);

interface Run {
  readonly group: readonly number[];
  readonly frame: Frame;
}

/** Who `among` names inside a group. */
function pick(state: DanceState, group: readonly number[], among: readonly string[]): number[] {
  const chosen = new Set<number>();
  for (const name of among) {
    if (name === 'larks' || name === 'robins') {
      const role = name === 'larks' ? 'lark' : 'robin';
      for (const id of group) if (state.dancers[id].role === role) chosen.add(id);
      continue;
    }
    if (name === 'middle' || name === 'ends') {
      // The four nearest the middle of the group (or the rest).
      const c = mean(group.map((id) => body(state, id).position));
      const order = [...group].sort(
        (a, b) =>
          Math.abs(body(state, a).position.x - c.x) - Math.abs(body(state, b).position.x - c.x),
      );
      const half = order.length / 2;
      for (const id of name === 'middle' ? order.slice(0, half) : order.slice(half))
        chosen.add(id);
      continue;
    }
    const place = state.positions.get(name);
    if (!place) throw new Error(`Nobody is called "${name}" here.`);
    for (const id of place) if (group.includes(id)) chosen.add(id);
  }
  return group.filter((id) => chosen.has(id));
}

/**
 * Groups of eight in a column layout: the column groups whose dancers
 * stand level along the set (two lines facing each other).
 */
export function lineSets(state: DanceState): number[][] {
  const sets: { z: number; ids: number[] }[] = [];
  for (const g of state.groups) {
    const z = mean(g.map((id) => body(state, id).position)).z;
    const same = sets.find((s) => Math.abs(s.z - z) < 0.6);
    if (same) same.ids.push(...g);
    else sets.push({ z, ids: [...g] });
  }
  return sets.map((s) => s.ids);
}

function columnFrame(state: DanceState, group: readonly number[]): Frame {
  const c = mean(group.map((id) => body(state, id).position));
  return { origin: { x: c.x, z: 0 }, angle: 0 };
}

function periodicFrame(state: DanceState, group: readonly number[], period: number): Frame {
  const ref = body(state, group[0]).position.z;
  const shift = new Map<number, number>();
  for (const id of group) {
    const z = body(state, id).position.z;
    const k = Math.round((ref - z) / period);
    if (k) shift.set(id, k * period);
  }
  return { origin: { x: 0, z: 0 }, angle: 0, shift };
}

/** A pair (or any small group) facing in toward `center`, seen as a contra pair on the +x line. */
function radialFrame(state: DanceState, group: readonly number[], center: Vec2): Frame {
  const c = mean(group.map((id) => body(state, id).position));
  const out = sub(c, center);
  const r = length(out);
  if (r < 1e-6) return { origin: c, angle: 0 };
  const u = scale(out, 1 / r);
  // rotate(u, angle) = +x
  return { origin: sub(c, scale(u, SET.halfWidth)), angle: -polar(u) };
}

function pairsOf(state: DanceState, groups: readonly (readonly number[])[], who: string) {
  const rel = state.relations.get(who);
  if (!rel) return undefined;
  const pairs: number[][] = [];
  const seen = new Set<number>();
  for (const g of groups) {
    for (const id of g) {
      const o = rel.get(id);
      if (o === undefined || seen.has(id) || seen.has(o)) continue;
      seen.add(id).add(o);
      pairs.push([id, o]);
    }
  }
  return pairs;
}

const sameHold = (a: Hold, b: Hold) =>
  (a.a === b.a && a.b === b.b && a.handA === b.handA && a.handB === b.handB) ||
  (a.a === b.b && a.b === b.a && a.handA === b.handB && a.handB === b.handA);

/** Run a figure once per (group, frame) and merge the results. */
function runAll<P>(
  figure: Figure<P>,
  state: DanceState,
  params: P,
  beats: number,
  runs: readonly Run[],
  relation?: { name: string },
): FigureResult {
  if (!runs.length) throw new Error('Nobody here dances this figure.');
  const results = runs.map((run) => {
    const bodies = new Map<number, Body>();
    for (const [id, b] of state.bodies) bodies.set(id, toLocal(run.frame, id, b));
    let relations = state.relations;
    if (relation) {
      const rel = state.relations.get(relation.name);
      if (!rel) throw new Error(`Nobody has a ${relation.name} here.`);
      relations = new Map(state.relations).set('partner', rel);
    }
    const local = withChanges(state, {
      bodies,
      groups: [run.group],
      relations,
      layout: undefined,
    });
    return { run: { ...run, local }, result: figure(local, params, beats) };
  });
  const motion = (beat: number): FigureFrame => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const { run, result } of results) {
      const frame = result.motion(beat);
      for (const b of frame.bodies) {
        const w = toWorld(run.frame, b.id, b.position, b.yaw);
        bodies.push({ ...b, position: w.position, yaw: w.yaw });
      }
      // Hand points are found where the dancers stand in this frame, then mapped back.
      const near = new Map(run.local.bodies);
      for (const b of frame.bodies) near.set(b.id, { position: b.position, yaw: b.yaw });
      for (const c of frame.contacts) {
        const point = complete(c, near).point;
        const w = toWorld(run.frame, c.a, { x: point.x, z: point.z }, 0).position;
        contacts.push({ ...c, point: { x: w.x, y: point.y, z: w.z } });
      }
    }
    return { bodies, contacts };
  };
  const exitBodies = new Map(state.bodies);
  const hands: Hold[] = [];
  for (const { run, result } of results) {
    for (const id of new Set(result.motion(beats).bodies.map((b) => b.id))) {
      const e = body(result.exit, id);
      exitBodies.set(id, toWorld(run.frame, id, e.position, e.yaw));
    }
    for (const h of result.exit.hands) {
      if (!run.group.includes(h.a) && !run.group.includes(h.b)) continue;
      if (!hands.some((k) => sameHold(k, h))) hands.push(h);
    }
  }
  const first = results[0].result;
  return {
    kind: first.kind,
    motion,
    exit: withChanges(state, { bodies: exitBodies, hands }),
    ...(first.styled ? { styled: first.styled } : {}),
  };
}

/** Figures that, in a ring or square, dance the whole set at true positions. */
const WHOLE = new Set<string>(['ring-circle', 'ring-promenade', 'forward-back', 'still']);

/**
 * Let any figure run in any layout, and take `among`. In a plain contra set
 * with no `among` the figure runs exactly as written.
 */
export function inLayout<P>(move: string, figure: Figure<P>): Figure<P & { among?: string[] }> {
  return (state, input, beats) => {
    let params = input as P & { among?: string[] };
    const named0 = (params as { who?: unknown }).who;
    if (
      PAIRS_BY_PLACE.has(move) &&
      typeof named0 === 'string' &&
      state.positions.has(named0) &&
      partnersWithin(state, state.positions.get(named0)!)
    ) {
      params = { ...params, who: 'partner', among: [...(params.among ?? []), named0] };
    }
    const { among, ...rest } = params;
    const layout = state.layout;
    const who = (rest as { who?: unknown }).who;
    const named = typeof who === 'string' && !STANDARD.has(who) && state.relations.has(who);
    if ((!layout && !among && !named) || move === 'hold') return figure(state, rest as P, beats);
    let groups: readonly (readonly number[])[] = state.groups;
    if (among) {
      if (!Array.isArray(among) || !among.every((a) => typeof a === 'string'))
        throw new Error('among must list who dances.');
      const base = layout?.columns && among.some((a) => a === 'middle' || a === 'ends')
        ? lineSets(state)
        : groups;
      groups = base.map((g) => pick(state, g, among)).filter((g) => g.length);
    }
    const p = (named ? { ...rest, who: 'partner' } : rest) as P;
    const relation = named ? { name: who as string } : undefined;
    let runs: Run[];
    if (layout?.center && !WHOLE.has(move)) {
      const pairs = typeof who === 'string' ? pairsOf(state, groups, who) : undefined;
      runs = (pairs ?? groups).map((g) => ({
        group: g,
        frame: radialFrame(state, g, layout.center!),
      }));
    } else if (layout?.period) {
      runs = groups.map((g) => ({ group: g, frame: periodicFrame(state, g, layout.period!) }));
    } else if (layout?.columns) {
      runs = groups.map((g) => ({ group: g, frame: columnFrame(state, g) }));
    } else {
      runs = [{ group: groups.flat(), frame: IDENTITY }];
      if (groups.length > 1) runs = groups.map((g) => ({ group: g, frame: IDENTITY }));
    }
    return runAll(figure, state, p, beats, runs, relation);
  };
}

/** True when every dancer named has their partner among them too. */
function partnersWithin(state: DanceState, ids: readonly number[]) {
  const partner = state.relations.get('partner');
  return !!partner && ids.every((id) => ids.includes(partner.get(id) ?? -1));
}

/** Mark a move as dancing the whole set at true positions in ring and square layouts. */
export function wholeSetMove(move: string) {
  WHOLE.add(move);
}
