/**
 * Swing in four face four.
 *
 * Definition: the ordinary swing (swing.ts), danced in each minor set (a
 * couple and the couple it faces) while the dancers stand in lines. From a
 * squared set (after corners swing) partners swing back into the lines:
 * each couple ends on a couple's place of two lines of four facing, the
 * lark on the left, everyone having moved round to the right, the way the
 * square formed undone.
 * Source: ContraDB rows "partners balance & swing" after "corners swing
 * (do not trade places, square the set)" / "head couples forward & back" /
 * "side couples forward & back", followed by "circle left 4 places" and a
 * California twirl to a new line (Mind the Shark, Mattie Rynkiewicz).
 * Reading: a partner swing in a squared four face four ends in lines again.
 */
import type { Figure, FigureContact, FigureResult, MovedBody } from '../../core/figure.ts';
import { settle } from '../../core/figure.ts';
import { mean } from '../../core/math.ts';
import { body, minorSets, pairsIn, withChanges, type DanceState } from '../../core/state.ts';
import { swing, type SwingParams } from '../swing.ts';
import { cornerSwing } from './corner-swing.ts';
import { assignRound, inLines, linePlaces, swingTo } from './square.ts';

/** The minor sets of four inside a group of eight: each couple with its neighbors. */
function minorSetsOf(state: DanceState, group: readonly number[]): number[][] {
  const neighbor = state.relations.get('neighbor');
  const partner = state.relations.get('partner');
  const seen = new Set<number>();
  const out: number[][] = [];
  for (const id of group) {
    if (seen.has(id)) continue;
    const p = partner?.get(id);
    const n = neighbor?.get(id);
    const np = n === undefined ? undefined : partner?.get(n);
    const set = [id, p, n, np];
    if (set.some((x) => x === undefined || !group.includes(x)))
      throw new Error('Every couple needs a facing couple in the lines.');
    for (const x of set) seen.add(x!);
    out.push(set as number[]);
  }
  return out;
}

export const linesSwing: Figure<SwingParams> = (state, params, beats) => {
  // "corners swing" squares the set (corner-swing.ts).
  if ((params.who as string) === 'corner') return cornerSwing(state, { ...params, who: 'corner' }, beats);
  const groups = minorSets(state);
  if (!groups.some((g) => g.length === 8)) return swing(state, params, beats);
  const lined = groups.filter((g) => inLines(state, g));
  const squared = groups.filter((g) => !inLines(state, g));
  const results: FigureResult[] = [];
  if (lined.length) {
    const sets = lined.flatMap((g) => minorSetsOf(state, g));
    results.push(swing(withChanges(state, { groups: sets }), params, beats));
  }
  if (squared.length) {
    if (params.who !== 'partner')
      throw new Error('From a square, only partners swing back into lines.');
    if (beats < 4) throw new Error('A swing needs at least four beats.');
    const plans = squared.flatMap((group) => {
      const center = mean(group.map((id) => body(state, id).position));
      const to = assignRound(state, group, linePlaces(center), -1);
      return pairsIn(state, group, 'partner').map((pair) => swingTo(state, pair, to, beats));
    });
    const motion = (beat: number) => {
      const t = beat / beats;
      const bodies: MovedBody[] = [];
      const contacts: FigureContact[] = [];
      for (const p of plans) {
        const b = p.at(t);
        bodies.push(...b);
        contacts.push(...p.contacts(t, b));
      }
      return { bodies, contacts };
    };
    results.push({ kind: 'swing', motion, exit: state });
  }
  const motion = (beat: number) => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const r of results) {
      const f = r.motion(beat);
      bodies.push(...f.bodies);
      contacts.push(...f.contacts);
    }
    return { bodies, contacts };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
