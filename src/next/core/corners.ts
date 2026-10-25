/**
 * First and second corners.
 *
 * In a minor set of two numbered couples (improper, proper, four face four,
 * triple minor: the 1s and the 2s), first corners are the lark of the 1s
 * and the robin of the 2s, second corners the robin of the 1s and the lark
 * of the 2s (ContraDB: "first corners (larks one, robins two)", "2nd corners
 * (robins 1 & larks 2)"). In a square, where a dancer's corner is the
 * dancer of the other role beside them who is not their partner, both name
 * that corner. Dancers with no corner in their group stand still.
 */
import { roleOf, type DanceState } from './state.ts';

export type CornerName = 'first-corner' | 'second-corner';

export function cornerPairs(state: DanceState, which: CornerName): [number, number][] {
  const stored = state.relations.get('corner');
  const ones = new Set(state.positions.get('1s') ?? []);
  const twos = new Set(state.positions.get('2s') ?? []);
  const pairs: [number, number][] = [];
  for (const g of state.groups) {
    const lark = (set: Set<number>) => g.find((id) => set.has(id) && roleOf(state, id) === 'lark');
    const robin = (set: Set<number>) =>
      g.find((id) => set.has(id) && roleOf(state, id) === 'robin');
    const [a, b] =
      which === 'first-corner' ? [lark(ones), robin(twos)] : [robin(ones), lark(twos)];
    if (a !== undefined && b !== undefined) {
      pairs.push(a < b ? [a, b] : [b, a]);
      continue;
    }
    // A square (no numbered couples in one group): the stored corner.
    if (stored)
      for (const id of g) {
        const c = stored.get(id);
        if (c !== undefined && id < c && g.includes(c)) pairs.push([id, c]);
      }
  }
  return pairs;
}
