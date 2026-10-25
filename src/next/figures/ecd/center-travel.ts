/**
 * A couple travels along the middle of the set: sashay (slip step) or lead
 * (walk side by side, also "promenade to the bottom"), down and up as
 * called, the couples passed moving up.
 *
 * Definition: the named couple steps into the middle of the set and travels
 * along it through each named place in turn ("down & back": to the bottom
 * and back to the top; "down & up & down": bottom, top, bottom), then steps
 * back out into its lines at the last place, facing across. Sashay: partners
 * face each other holding both hands and slide sideways. Lead: partners walk
 * side by side facing the way they go, inside hands joined, and turn toward
 * each other to come back. If the couple ends in another place, the couples
 * between move one place toward where it started, along their own lines,
 * while it is in the middle.
 * Source: Playford/ECD manuals ("lead down the middle and back", "sashay
 * down and back"); Caller's Box glossary, "Sashay"; ContraDB rows "top
 * couple sashay down & up & down, everyone else move up", "Top couple sashay
 * down and back", "top couple promenade to the bottom of the set, everyone
 * else move up", "ones sashay down the center to the bottom".
 * Readings: "promenade to the bottom" is led side by side on own sides
 * (inside hands), since a proper couple facing down has the lark on the
 * right; partners stay on their own sides.
 */
import type { Hold } from '../../core/state.ts';
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { progress, smooth } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import {
  choreograph,
  facingIn,
  type Path,
  placeIndex,
  placeOf,
  places,
  type PlaceName,
  sideSign,
  slidePath,
  SLOT,
  window01,
} from './common.ts';

export interface CenterTravelParams {
  who: string;
  style: 'sashay' | 'lead';
  /**
   * Places to travel through in turn, the last one where the couple ends;
   * "down" / "up" go as far as a steady walk carries the couple.
   */
  legs: (PlaceName | 'down' | 'up')[];
}

/** Each partner's distance from the middle line while travelling. */
export const CENTER_HALF = 0.35;
/** A steady travelling pace, meters per beat, for legs with no place named. */
export const WALK = 0.75;

export const centerTravel: Figure<CenterTravelParams> = (state, params, beats) => {
  onlyKeys('center-travel', params, ['who', 'style', 'legs']);
  const style = oneOf('center-travel', 'style', params.style, ['sashay', 'lead'] as const);
  if (typeof params.who !== 'string') throw new Error('center-travel needs who travels.');
  if (!Array.isArray(params.legs) || !params.legs.length)
    throw new Error('center-travel needs the places to travel to.');
  const all = places(state);
  const p = placeOf(state, all, params.who, 'center-travel');
  // "Down" and "up" with no place named go as far as a walk carries them in
  // the leg's share of the beats, but no farther than the end of the set.
  const reach = Math.max(1, Math.floor((WALK * beats) / params.legs.length / SLOT));
  const stops = [p];
  for (const leg of params.legs) {
    const from = stops[stops.length - 1];
    if (leg === 'down') stops.push(Math.min(all.length - 1, from + reach));
    else if (leg === 'up') stops.push(Math.max(0, from - reach));
    else stops.push(placeIndex(leg, all.length, 'center-travel'));
  }
  for (let i = 1; i < stops.length; i++)
    if (stops[i] === stops[i - 1]) throw new Error('center-travel: each leg must go somewhere.');
  const q = stops[stops.length - 1];
  const zs = stops.map((k) => all[k].z);
  const lengths = zs.slice(1).map((z, i) => Math.abs(z - zs[i]));
  const total = lengths.reduce((a, b) => a + b, 0);
  // Leg i runs over [bounds[i], bounds[i + 1]] of the figure.
  const bounds = [0];
  for (const l of lengths) bounds.push(bounds[bounds.length - 1] + l / total);
  const legAt = (u: number) => Math.min(lengths.length - 1, bounds.findLastIndex((b) => b <= u));
  const zAt = (u: number) => {
    const i = legAt(u);
    return zs[i] + (zs[i + 1] - zs[i]) * progress(window01(u, bounds[i], bounds[i + 1]));
  };
  const edge = Math.min(0.3, 1.5 / beats);
  const lark = all[p].lark;
  const robin = all[p].robin;

  const paths = new Map<number, Path>();
  for (const id of [lark, robin]) {
    const s0 = body(state, id);
    const side = sideSign(state, id);
    const x0 = s0.position.x;
    const xIn = side * CENTER_HALF;
    const inYaw = facingIn(side);
    // Down and up are a quarter turn either way from facing in, so changing
    // direction always turns through facing in: toward each other.
    const along = (dir: number) => inYaw + dir * side * (Math.PI / 2);
    paths.set(id, {
      pos: (u) => {
        const x = x0 + (xIn - x0) * Math.min(smooth(u / edge), smooth((1 - u) / edge));
        return { x, z: zAt(u) };
      },
      yaw: (u) => {
        if (style === 'sashay') return inYaw;
        const i = legAt(u);
        const dir = Math.sign(zs[i + 1] - zs[i]);
        // Turn round in the second before each new leg starts.
        const next = i + 1 < lengths.length ? Math.sign(zs[i + 2] - zs[i + 1]) : dir;
        const turnIn = smooth((u - (bounds[i + 1] - 1 / beats)) / (1 / beats));
        return along(dir) + (along(next) - along(dir)) * turnIn;
      },
    });
  }
  const dir = Math.sign(q - p);
  if (dir) {
    for (let k = Math.min(p, q); k <= Math.max(p, q); k++) {
      if (k === p) continue;
      for (const id of [all[k].lark, all[k].robin]) {
        const goal = { x: body(state, id).position.x, z: all[k - dir].z };
        paths.set(id, slidePath(state, id, goal, 0.2, 0.8));
      }
    }
  }
  const bodies = choreograph(state, beats, paths, 0.8);
  const holds: Hold[] =
    style === 'sashay'
      ? [
          { a: lark, handA: 'right', b: robin, handB: 'left' },
          { a: lark, handA: 'left', b: robin, handB: 'right' },
        ]
      : [];
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const map = bodyMap(moved);
    const u = beat / beats;
    const strength = Math.min(smooth((u - edge * 0.6) / (edge * 0.4)), smooth((1 - edge * 0.6 - u) / (edge * 0.4)));
    let contacts: FigureContact[] = holds.map((h) => joined(h, strength));
    if (style === 'lead') {
      // Inside hands: the lark's hand nearer the robin.
      const l = map.get(lark)!;
      const facingDown = Math.cos(l.yaw) > 0;
      const larkHand = (facingDown ? 1 : -1) * sideSign(state, lark) < 0 ? 'left' : 'right';
      const robinHand = larkHand === 'left' ? 'right' : 'left';
      contacts = [joined({ a: lark, handA: larkHand, b: robin, handB: robinHand }, strength)];
    }
    return { bodies: moved, contacts: contacts.map((c) => withinReach(c, map)) };
  };
  return {
    kind: style === 'sashay' ? 'hall-travel' : 'promenade',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
