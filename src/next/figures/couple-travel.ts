/**
 * Down (or up) the center, down (or up) the outsides: one couple travels.
 *
 * Definition: "ones down the center": the named couple of each minor set
 * steps into the middle of the set side by side, inside hands joined, and
 * walks down the hall one place, between the other couple; "and turn alone"
 * each turns toward the other to face back up, "and turn as a couple" the
 * pair wheels around. "Ones up the center" walks back up the same way. "Down
 * the outsides": the couple turns out and walks down outside its own side
 * line instead (no hands), turning alone at the bottom. Everyone else stands
 * still; couples waiting out at the ends do not travel.
 * Source: Caller's Box glossary, "Down the center", "Down the outside";
 * ContraDB rows "ones down the center and turn alone", "ones down the
 * outsides and turn alone", "ones up the center", "ones up the outsides".
 */
import type { Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import { joined } from '../core/contacts.ts';
import { add, clamp, ease, mix, progress, rotate, smooth, sub, turn } from '../core/math.ts';
import {
  body,
  groupCenter,
  handToward,
  minorSets,
  partnerOf,
  withChanges,
  type Hold,
} from '../core/state.ts';

export interface CoupleTravelParams {
  who: '1s' | '2s';
  route: 'center' | 'outside';
  direction: 'down' | 'up';
  /** How the couple turns around at the far end. */
  turn?: 'alone' | 'couple';
}

/** Half the gap between partners walking down the center. */
const CENTER_HALF = 0.3;
/** How far outside the side lines the outside route runs. */
const OUTSIDE = 0.6;
/** Beats to step into the lane, and to turn at the end. */
const FORM = 1.5;
const ENDING = 2.5;

export const coupleTravel: Figure<CoupleTravelParams> = (state, params, beats) => {
  onlyKeys('couple travel', params, ['who', 'route', 'direction', 'turn']);
  const who = oneOf('couple travel', 'who', params.who, ['1s', '2s'] as const);
  const route = oneOf('couple travel', 'route', params.route, ['center', 'outside'] as const);
  const direction = oneOf('couple travel', 'direction', params.direction, ['down', 'up'] as const);
  const turning =
    params.turn === undefined
      ? undefined
      : oneOf('couple travel', 'turn', params.turn, ['alone', 'couple'] as const);
  if (route === 'outside' && turning === 'couple')
    throw new Error('A couple apart on the outsides turns alone, not as a couple.');
  if (beats < (turning ? 6 : 4)) throw new Error('Traveling down or up takes more beats.');
  const label = state.positions.get(who);
  if (!label) throw new Error(`Nobody is a ${who} couple here.`);
  // The top of the set is -z: down the hall faces +z (yaw 0).
  const facing = direction === 'down' ? 0 : Math.PI;
  const travel: Vec2 = { x: 0, z: direction === 'down' ? SET.slot : -SET.slot };
  const walkEnd = turning ? beats - ENDING : beats;

  const plans = minorSets(state).flatMap((g) => {
    const middle = groupCenter(state, g);
    const couple = g.filter((id) => label.includes(id));
    if (couple.length !== 2 || partnerOf(state, couple[0]) !== couple[1])
      throw new Error(`Each minor set needs one ${who} couple to travel.`);
    const pairMiddle = mix(body(state, couple[0]).position, body(state, couple[1]).position, 0.5);
    return couple.map((id) => {
      const from = body(state, id);
      const side =
        Math.sign(from.position.x - middle.x) || (state.dancers[id].role === 'lark' ? 1 : -1);
      const lane =
        route === 'center'
          ? { x: middle.x + side * CENTER_HALF, z: from.position.z }
          : { x: middle.x + side * (SET.halfWidth + OUTSIDE), z: from.position.z };
      // Turning alone toward the partner: the one on the left turns right
      // (yaw decreasing), the one on the right turns left.
      const toward = side * (direction === 'down' ? 1 : -1) > 0 ? -1 : 1;
      return { id, from, lane, side, toward, pivot: add({ x: middle.x, z: pairMiddle.z }, travel) };
    });
  });
  const holds: Hold[] = [];
  if (route === 'center') {
    for (let i = 0; i + 1 < plans.length; i += 2) {
      const [a, b] = [plans[i], plans[i + 1]];
      const fa = { position: a.lane, yaw: facing };
      const fb = { position: b.lane, yaw: facing };
      holds.push({
        a: a.id,
        handA: handToward(fa, b.lane),
        b: b.id,
        handB: handToward(fb, a.lane),
      });
    }
  }

  const motion = (beat: number) => {
    const formed = smooth(beat / FORM);
    const walked = progress(clamp((beat - FORM / 2) / (walkEnd - FORM / 2)));
    const u = turning ? clamp((beat - walkEnd) / ENDING) : 0;
    const bodies = plans.map((p) => {
      const at = add(mix(p.from.position, p.lane, formed), {
        x: travel.x * walked,
        z: travel.z * walked,
      });
      const yaw = p.from.yaw + turn(facing, p.from.yaw) * formed;
      if (!turning || u <= 0) return { id: p.id, position: at, yaw };
      if (turning === 'alone')
        return { id: p.id, position: at, yaw: facing + p.toward * Math.PI * ease(u) };
      // As a couple: wheel around the pair's middle, the left one backing up
      // (counterclockwise from above).
      const angle = -Math.PI * progress(u);
      return {
        id: p.id,
        position: add(p.pivot, rotate(sub(at, p.pivot), angle)),
        yaw: facing - angle,
      };
    });
    const strength = smooth((beat - FORM) / 0.5) * (turning === 'alone' ? 1 - smooth(u / 0.3) : 1);
    const contacts: FigureContact[] = holds.map((h) => joined(h, strength));
    return { bodies, contacts };
  };
  const exit = settle(state, motion, beats);
  return {
    kind: 'hall-travel',
    motion,
    exit: withChanges(exit, { hands: [] }),
  };
};
