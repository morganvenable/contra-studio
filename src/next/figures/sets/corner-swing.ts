/**
 * Corners swing in four face four, squaring the set.
 *
 * Definition: with two lines of four facing, each dancer swings the corner
 * beside them round the ring (the middle two of a line are corners; an end
 * dancer's corner is the dancer facing them) and opens out without trading
 * places, everyone ending on their own place of a square of eight, facing
 * in: partners side by side as couples, corners beside each other across
 * each corner of the square. The middle couples of the lines become the
 * heads (at the top and bottom of the hall), the end couples the sides.
 * Source: ContraDB rows "corners swing (do not trade places, square the
 * set)" (Mind the Shark, Mattie Rynkiewicz), "corners swing and square the
 * set" (Petrozilla), "first corners swing, form square" (Blackberry Cobbler
 * Quadrille), "first corners swing, square sets" (Dance All Night, Rick
 * Mohr: "the two dancers in the middle of the line of 4 are corners and
 * the dancers at the ends have their corners in front of them").
 * Reading: in four face four a corner swing always squares the set as
 * above, the standard quadrille square (partners beside, corners on the
 * lark's left). Anywhere else "corners swing" is the ordinary swing with
 * the corner (or neighbor), as before.
 */
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { mean } from '../../core/math.ts';
import { body, minorSets, withChanges } from '../../core/state.ts';
import { swing, type SwingParams } from '../swing.ts';
import { assignRound, cornerPairs, fourFaceFour, squarePlaces, swingTo } from './square.ts';

export interface CornerSwingParams {
  who: 'corner' | 'neighbor' | 'partner';
  meltdown?: boolean;
}

export const cornerSwing: Figure<CornerSwingParams> = (state, params, beats) => {
  onlyKeys('corner swing', params, ['who', 'meltdown']);
  const groups = minorSets(state);
  if (!groups.some((g) => fourFaceFour(state, g))) return swing(state, params as SwingParams, beats);
  if (!groups.every((g) => fourFaceFour(state, g)))
    throw new Error('Corners square the set from two lines of four.');
  if (beats < 4) throw new Error('A swing needs at least four beats.');
  const plans = groups.flatMap((group) => {
    const center = mean(group.map((id) => body(state, id).position));
    const to = assignRound(state, group, squarePlaces(center), 1);
    return cornerPairs(state, group).map((pair) => swingTo(state, pair, to, beats));
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
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
