/**
 * Minor-set progression when partners stand across the set from each other
 * (Becket after "circle left 3 places", then "zig left zag right" or a half
 * poussette moves the couples along the set). Each couple is then a pair of
 * places at one height of the set, and a minor set is two such couples one
 * place apart along the set. A couple's new minor set is the couple beside
 * it along the set that it was not just dancing with; the dancer of the
 * other role in that couple is your new neighbor. Couples
 * with no new couple beside them wait out at their end.
 *
 * Like every progression it only rebinds relationships; no body moves.
 */
import { SET } from './config.ts';
import { body, partnerOf, type DanceState, type WaitingCouple, withChanges } from './state.ts';

interface AcrossCouple {
  readonly couple: number;
  readonly lark: number;
  readonly robin: number;
  readonly z: number;
}

/** Couples standing across from each other, or undefined if any couple is not. */
export function acrossCouples(state: DanceState): AcrossCouple[] | undefined {
  const out: AcrossCouple[] = [];
  for (const d of state.dancers) {
    if (d.role !== 'lark') continue;
    const robin = partnerOf(state, d.id);
    const a = body(state, d.id).position;
    const b = body(state, robin).position;
    if (Math.abs(a.z - b.z) > 0.45 || Math.abs(a.x - b.x) < SET.halfWidth) return undefined;
    out.push({ couple: d.couple, lark: d.id, robin, z: (a.z + b.z) / 2 });
  }
  return out;
}

/** Rebind neighbors for couples standing across (see the file comment). */
export function rebindAcross(state: DanceState, couples: readonly AcrossCouple[]): DanceState {
  const groupOf = new Map<number, number>();
  state.groups.forEach((g, i) => g.forEach((id) => groupOf.set(id, i)));
  const sorted = [...couples].sort((a, b) => a.z - b.z);
  const paired = new Set<number>();
  const neighbor = new Map<number, number>();
  const groups: number[][] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (paired.has(a.couple) || paired.has(b.couple)) continue;
    if (Math.abs(b.z - a.z - SET.slot) > 0.3) continue;
    const same = groupOf.get(a.lark) !== undefined && groupOf.get(a.lark) === groupOf.get(b.lark);
    if (same) continue;
    // Neighbors: each dancer and the dancer of the other role in the other couple.
    neighbor.set(a.lark, b.robin).set(b.robin, a.lark);
    neighbor.set(a.robin, b.lark).set(b.lark, a.robin);
    groups.push([a.lark, a.robin, b.lark, b.robin]);
    paired.add(a.couple).add(b.couple);
  }
  const previous = new Map(state.waiting.map((w) => [w.couple, w]));
  const waiting: WaitingCouple[] = couples
    .filter((c) => !paired.has(c.couple))
    .map((c) => {
      const before = previous.get(c.couple);
      return before && !before.crossed ? before : { couple: c.couple, crossed: true };
    });
  const activeZ = groups.flat().map((id) => body(state, id).position.z);
  for (const w of waiting) {
    const z = couples.find((c) => c.couple === w.couple)!.z;
    if (z > Math.min(...activeZ) && z < Math.max(...activeZ))
      throw new Error(`Couple ${w.couple + 1} has no neighbors in the middle of the set.`);
  }
  const relations = new Map(state.relations).set('neighbor', neighbor);
  return withChanges(state, { relations, groups, waiting, epoch: state.epoch + 1 });
}
