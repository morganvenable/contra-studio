/**
 * Grand square: one leg ("heads walk forward, sides back up").
 *
 * Definition: every dancer of a square walks round a small square of their
 * own, beginning and ending at home: the heads first in toward the middle,
 * then away from their partner, out, and back toward the partner; the sides
 * the other way round (away from their partner first). The second half
 * retraces it backward, so the heads go the sides' way and the sides the
 * heads'. Each leg is walked forward (facing the way it goes) or backing up
 * (facing the other way), as the row says, after a quarter turn.
 * Source: Lloyd Shaw, "Cowboy Dances" and the Caller's Box glossary, "Grand
 * square"; ContraDB "Grand Square break" (rows "Heads walk forward, sides
 * back up", "Sides walk forward, heads back up").
 * Reading: each row is one leg; each dancer's square runs from home in to
 * the line the side couples stand on (heads) and back, so at each corner a
 * dancer stands where another started; the legs are numbered through the rows (import-travel.ts) so each
 * group knows which way round it goes.
 */
import type { Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { wholeSetMove } from '../core/layout.ts';
import { add, dot, heading, length, progress, scale, smooth, sub, turn } from '../core/math.ts';
import { body, withChanges } from '../core/state.ts';

wholeSetMove('grand-square');

type Move = 'in' | 'away' | 'out' | 'toward';
interface Leg {
  move: Move;
  facing: 'forward' | 'back';
}
export interface GrandSquareParams {
  heads: Leg;
  sides: Leg;
}

/** Beats for the quarter turn before a leg. */
const TURN_BEATS = 1;

export const grandSquare: Figure<GrandSquareParams> = (state, params, beats) => {
  onlyKeys('grand square', params, ['heads', 'sides']);
  const homes = state.layout?.homes;
  const center = state.layout?.center;
  const heads = state.positions.get('heads');
  if (!homes || !center || !heads) throw new Error('A grand square is danced in a square.');
  const legs = { heads: params.heads, sides: params.sides };
  for (const leg of Object.values(legs)) {
    oneOf('grand square', 'move', leg.move, ['in', 'away', 'out', 'toward'] as const);
    oneOf('grand square', 'facing', leg.facing, ['forward', 'back'] as const);
  }
  const unit = (v: Vec2) => scale(v, 1 / length(v));
  const plans = state.dancers.map((d) => {
    const home = homes.get(d.id)!;
    const mate = state.dancers.find((o) => o.couple === d.couple && o.id !== d.id)!;
    const mateHome = homes.get(mate.id)!;
    const a = unit(sub(home, mateHome));
    const middle = scale(add(home, mateHome), 0.5);
    const n = unit(sub(center, middle));
    // The square's side: from home to where the side couples' line runs.
    const side = dot(sub(center, middle), n) - length(sub(home, mateHome)) / 2;
    if (!(side > 0.5)) throw new Error('The square is too small for a grand square.');
    const leg = heads.includes(d.id) ? legs.heads : legs.sides;
    const b = body(state, d.id);
    const off = sub(b.position, home);
    const x = Math.round(dot(off, n) / side) * side;
    const y = Math.round(dot(off, a) / side) * side;
    const [dx, dy] = { in: [side, 0], out: [-side, 0], away: [0, side], toward: [0, -side] }[leg.move];
    const [tx, ty] = [x + dx, y + dy];
    if (![tx, ty].every((v) => Math.abs(v) < 1e-6 || Math.abs(v - side) < 1e-6))
      throw new Error(`Dancer ${d.id} cannot walk that leg of the grand square from here.`);
    const target = add(home, add(scale(n, tx), scale(a, ty)));
    const way = heading(b.position, target);
    const yaw = leg.facing === 'forward' ? way : way + Math.PI;
    // A bigger turn (round to back up) takes longer, at a walking turn rate.
    const turnBeats = Math.min(beats / 3, Math.max(TURN_BEATS, (1.5 * Math.abs(turn(yaw, b.yaw))) / 2.5));
    return { id: d.id, from: b, target, yaw, turnBeats };
  });
  const motion = (beat: number) => ({
    bodies: plans.map((p) => {
      const t = Math.max(0, (beat - p.turnBeats * 0.5) / (beats - p.turnBeats * 0.5));
      return {
        id: p.id,
        position: add(p.from.position, scale(sub(p.target, p.from.position), progress(t))),
        yaw: p.from.yaw + turn(p.yaw, p.from.yaw) * smooth(beat / p.turnBeats),
      };
    }),
    contacts: [],
  });
  return { kind: 'unknown', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
