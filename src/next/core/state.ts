/**
 * DanceState is the only thing carried from one figure to the next.
 */
import type { Dancer, Hand, Role, Vec2 } from '../../types.ts';
import { dot, rightOf, sub } from './math.ts';

export interface Body {
  readonly position: Vec2;
  readonly yaw: number;
}

export interface Hold {
  readonly a: number;
  readonly handA: Hand;
  readonly b: number;
  readonly handB: Hand;
}

export interface WaitingCouple {
  readonly couple: number;
  /** True once the couple has made its end-of-set crossing. */
  readonly crossed: boolean;
}

/** A relationship between dancers, e.g. partner, neighbor, corner. */
export type Relation = ReadonlyMap<number, number>;

export interface DanceState {
  /** Stable identities; never change during a dance. */
  readonly dancers: readonly Dancer[];
  readonly bodies: ReadonlyMap<number, Body>;
  readonly hands: readonly Hold[];
  /** Named relationships: partner, neighbor, corner, ... */
  readonly relations: ReadonlyMap<string, Relation>;
  /** Who dances together now: minor sets, or the whole set as one group. */
  readonly groups: readonly (readonly number[])[];
  /** Position labels: "1s", "1st couple", "top" ... -> dancer ids. */
  readonly positions: ReadonlyMap<string, readonly number[]>;
  /** Increments every time relationships are rebound. */
  readonly epoch: number;
  /** Couples waiting out at an end of a longways set (minor-set progression). */
  readonly waiting: readonly WaitingCouple[];
}

export function body(state: DanceState, id: number): Body {
  const b = state.bodies.get(id);
  if (!b) throw new Error(`Dancer ${id} has no pose.`);
  return b;
}

export function roleOf(state: DanceState, id: number): Role {
  return state.dancers[id].role;
}

export function related(state: DanceState, name: string, id: number): number | undefined {
  return state.relations.get(name)?.get(id);
}

export function partnerOf(state: DanceState, id: number): number {
  const p = related(state, 'partner', id);
  if (p === undefined) throw new Error(`Dancer ${id} has no partner.`);
  return p;
}

/** The groups that dance figures now (waiting couples are in none). */
export function minorSets(state: DanceState): readonly (readonly number[])[] {
  return state.groups;
}

/** Ids of everyone in an active group. */
export function activeIds(state: DanceState): number[] {
  return state.groups.flat();
}

const ROLE_GROUPS: Readonly<Record<string, Role>> = { larks: 'lark', robins: 'robin' };

/**
 * Who `who` names for `id` inside `group`: a relationship ("partner",
 * "neighbor", "corner"), the other dancer of the same role ("larks"), or the
 * other dancer sharing a position label ("1s", "1st couple").
 */
export function counterpart(state: DanceState, id: number, who: string, group: readonly number[]) {
  if (state.relations.has(who)) return related(state, who, id);
  const role = ROLE_GROUPS[who];
  if (role) {
    if (roleOf(state, id) !== role) return undefined;
    return group.find((j) => j !== id && roleOf(state, j) === role);
  }
  const place = state.positions.get(who);
  if (place)
    return place.includes(id) ? place.find((j) => j !== id && group.includes(j)) : undefined;
  throw new Error(`Nobody is called "${who}" here.`);
}

/** Pairs [a, b] (a < b) that `who` names within one group. */
export function pairsIn(
  state: DanceState,
  group: readonly number[],
  who: string,
): [number, number][] {
  const pairs: [number, number][] = [];
  for (const id of group) {
    const other = counterpart(state, id, who, group);
    if (other === undefined || other < id) continue;
    if (!group.includes(other)) throw new Error(`Dancer ${id}'s ${who} is outside the group.`);
    pairs.push([id, other]);
  }
  if (!pairs.length) throw new Error(`No "${who}" pairs to dance with.`);
  return pairs;
}

/** Which hand of `self` points toward `other`. */
export function handToward(self: Body, other: Vec2): Hand {
  return dot(rightOf(self.yaw), sub(other, self.position)) > 0 ? 'right' : 'left';
}

export function holdsBetween(state: DanceState, a: number, b: number): Hold[] {
  return state.hands.filter((h) => (h.a === a && h.b === b) || (h.a === b && h.b === a));
}

export function handOf(hold: Hold, id: number): Hand | undefined {
  return hold.a === id ? hold.handA : hold.b === id ? hold.handB : undefined;
}

export function withChanges(state: DanceState, changes: Partial<DanceState>): DanceState {
  return Object.freeze({ ...state, ...changes });
}

export function withBodies(state: DanceState, moved: Iterable<[number, Body]>): DanceState {
  const bodies = new Map(state.bodies);
  for (const [id, b] of moved) bodies.set(id, b);
  return withChanges(state, { bodies });
}

/** The side line a couple stands on, from its center: +1 east, -1 west, 0 center. */
export function sideOf(position: Vec2): -1 | 0 | 1 {
  if (Math.abs(position.x) < 0.6) return 0;
  return position.x > 0 ? 1 : -1;
}
