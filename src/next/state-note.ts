/**
 * Where the dancers are coming out of a figure, in a choreographer's words:
 * the shape of a minor set, and for the 1s' lark and robin which way they
 * face and who stands beside, facing and behind them.
 *
 * In a duple minor set the 2s are the 1s turned half round, so the 1s' view
 * says it for everyone (the 2s face the other way up or down the hall).
 */
import type { DanceState } from './core/state.ts';
import { forward, rightOf } from './core/math.ts';
import { relationMap } from './core/relations.ts';

export interface StateNote {
  /** The shape, e.g. "a ring", "long lines facing across", "a wave across the set". */
  readonly shape: string;
  /** One phrase per dancer of the 1s: "1s lark faces across to partner · neighbor on the right". */
  readonly views: readonly string[];
}

/** Someone this close (meters) is beside, facing or behind you. */
const NEAR = 1.9;
const RELATIONS = ['partner', 'neighbor', 'next-neighbor', 'shadow'];

/** up, down, across (to the middle), out, or a diagonal of two, for a direction on the floor. */
function facingWord(dir: { x: number; z: number }, inward: number) {
  // +z runs down the hall.
  const updown = dir.z > 0 ? 'down' : 'up';
  const across = Math.abs(inward) < 0.2 || Math.sign(dir.x) === Math.sign(inward) ? 'across' : 'out';
  if (Math.abs(dir.z) > 0.88) return updown;
  if (Math.abs(dir.x) > 0.88) return across;
  return `${updown} and ${across}`;
}

export function describeState(state: DanceState): StateNote | undefined {
  const group = state.groups.find((g) => g.includes(0)) ?? [];
  if (group.length < 2 || group.length > 8 || !state.bodies.has(0) || !state.bodies.has(1)) return undefined;
  const pos = (id: number) => state.bodies.get(id)!.position;
  const ahead = (id: number) => forward(state.bodies.get(id)!.yaw);
  const cx = group.reduce((n, id) => n + pos(id).x, 0) / group.length;
  const cz = group.reduce((n, id) => n + pos(id).z, 0) / group.length;
  const maps = RELATIONS.map((r) => {
    try {
      return [r, relationMap(state, r)] as const;
    } catch {
      return [r, new Map<number, number>()] as const;
    }
  });
  const role = (id: number) => (state.dancers[id].role === 'lark' ? 'lark' : 'robin');
  const name = (a: number, b: number) =>
    maps.find(([, m]) => m.get(a) === b)?.[0].replace('-', ' ') ?? `${state.dancers[b].couple % 2 ? '2s' : '1s'} ${role(b)}`;

  // Shape: everyone facing the middle at much the same distance is a ring;
  // in a row, all one way is a line and alternating a wave; otherwise how
  // the 1s' lark faces says lines across or couples up and down.
  const toMiddle = group.map((id) => {
    const p = pos(id), f = ahead(id), dx = cx - p.x, dz = cz - p.z, d = Math.hypot(dx, dz) || 1;
    return { d, cos: (f.x * dx + f.z * dz) / d };
  });
  const ds = toMiddle.map((t) => t.d);
  const ring = group.length >= 3 && toMiddle.every((t) => t.cos > 0.8) && Math.max(...ds) - Math.min(...ds) < 0.5;
  const xs = group.map((id) => pos(id).x), zs = group.map((id) => pos(id).z);
  const spanX = Math.max(...xs) - Math.min(...xs), spanZ = Math.max(...zs) - Math.min(...zs);
  const row = group.length >= 3 && Math.min(spanX, spanZ) < 0.6 ? (spanX > spanZ ? 'across' : 'along') : undefined;
  let shape: string;
  if (ring) shape = 'a ring';
  else if (row) {
    const order = [...group].sort((a, b) => (row === 'across' ? pos(a).x - pos(b).x : pos(a).z - pos(b).z));
    const ways = order.map((id) => ahead(id)[row === 'across' ? 'z' : 'x']);
    const alternating = ways.every((w, i) => i === 0 || Math.sign(w) !== Math.sign(ways[i - 1]));
    const same = ways.every((w) => Math.sign(w) === Math.sign(ways[0]) && Math.abs(w) > 0.7);
    const n = group.length;
    shape = alternating
      ? `a wave ${row} the set`
      : same && row === 'across'
        ? `a line of ${n} facing ${ways[0] > 0 ? 'down' : 'up'}`
        : `a line of ${n} ${row} the set`;
  } else {
    // Who the 1s' lark faces, and which way: long lines face across.
    const faced = group.find((o) => {
      const p = pos(o), q = pos(0), dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz);
      return o !== 0 && d < NEAR && (ahead(0).x * dx + ahead(0).z * dz) / d > 0.75;
    });
    const lark = facingWord(ahead(0), cx - pos(0).x), robin = facingWord(ahead(1), cx - pos(1).x);
    shape =
      lark === 'across' && robin === 'across'
        ? 'long lines'
        : faced !== undefined && (lark === 'up' || lark === 'down')
          ? `facing ${name(0, faced)}s up and down`
          : 'two couples, mixed facings';
  }

  const views = [0, 1].map((me) => {
    let faces = '';
    const others: string[] = [];
    for (const n of around(state, me, ring)) {
      if (n.where === 'close') faces = ` close with ${n.who}`;
      else if (n.where === 'facing') faces = ` to ${n.who}`;
      else others.push(`${n.who} ${n.where === 'behind' || n.where === 'across the ring' ? n.where : `on the ${n.where}`}`);
    }
    const facing = ring ? 'in' : facingWord(ahead(me), cx - pos(me).x);
    return `1s ${role(me)} faces ${facing}${faces}${others.length ? ` · ${others.join(' · ')}` : ''}`;
  });
  return { shape, views };
}

export interface Nearby {
  /** partner, neighbor, next neighbor, shadow, or e.g. "2s robin". */
  readonly who: string;
  readonly where: 'close' | 'facing' | 'behind' | 'right' | 'left' | 'across the ring';
}

/** The (up to three) dancers nearest one dancer, by relation, and where they stand from that dancer. */
export function around(state: DanceState, me: number, ring = false): Nearby[] {
  const b = state.bodies.get(me);
  if (!b) return [];
  const f = forward(b.yaw), r = rightOf(b.yaw);
  const named = new Map<number, string>();
  for (const rel of RELATIONS) {
    try {
      const other = relationMap(state, rel).get(me);
      if (other !== undefined && !named.has(other)) named.set(other, rel.replace('-', ' '));
    } catch {
      /* not every relation is known everywhere */
    }
  }
  const near = [...state.bodies.keys()]
    .filter((o) => o !== me)
    .map((o) => {
      const q = state.bodies.get(o)!.position, dx = q.x - b.position.x, dz = q.z - b.position.z, d = Math.hypot(dx, dz);
      return { o, d, front: (f.x * dx + f.z * dz) / (d || 1), right: (r.x * dx + r.z * dz) / (d || 1) };
    })
    .filter((n) => n.d < NEAR)
    .sort((a, c) => a.d - c.d)
    .slice(0, 3);
  let facing = false;
  return near.map((n) => {
    const d = state.dancers[n.o];
    const who = named.get(n.o) ?? `${d.couple % 2 ? '2s' : '1s'} ${d.role === 'lark' ? 'lark' : 'robin'}`;
    let where: Nearby['where'];
    if (n.d < 0.75 && n.front > 0.5) where = 'close';
    else if (!ring && n.front > 0.75 && !facing) where = 'facing';
    else if (ring && n.front > 0.9) where = 'across the ring';
    else if (n.front < -0.75) where = 'behind';
    else where = n.right > 0 ? 'right' : 'left';
    if (where === 'close' || where === 'facing') facing = true;
    return { who, where };
  });
}
