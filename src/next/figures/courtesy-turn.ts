/**
 * Courtesy turn, danced on its own ("partners courtesy turn", "robins
 * courtesy turn larks", "new neighbor courtesy turn, face across").
 *
 * Definition: the turner (the lark unless the row names the robins) takes
 * the follower's left hand in the left hand, puts the right hand at the
 * follower's waist, and the pair wheels counterclockwise (seen from above),
 * the turner backing up, about the middle between them. They end side by
 * side, the turner on the left. A pair standing off to one side of its
 * minor set ends facing in toward the middle of it (facing across, as after
 * a chain); otherwise the pair ends facing the other way from how it stood.
 * "1¼" wheels the whole turns more that bring it nearest that many turns
 * round (a quarter more and once round: 1¼).
 * Source: Caller's Box glossary, "Courtesy turn"; ContraDB rows "partners
 * courtesy turn", "neighbor courtesy turn", "robins courtesy turn larks".
 * The wheel is the shared courtesy turn of chains and right and left
 * throughs (core/courtesy.ts).
 */
import type { Figure, FigureContact, MovedBody } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import { courtesyAt, courtesyContacts, courtesyPair, courtesyStart } from '../core/courtesy.ts';
import {
  add,
  dot,
  forward,
  heading,
  length,
  mix,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import { body, groupCenter, minorSets, pairsIn, roleOf, withChanges } from '../core/state.ts';

export interface CourtesyTurnParams {
  who: PairName;
  /** Who turns: the larks unless named. */
  turner?: 'larks' | 'robins';
  /** Turns round, as the row names them ("1¼"): the nearest wheel to that. */
  turns?: number;
}

/** Share of the figure spent stepping together into the wheel. */
const GATHER = 0.25;
/** A couple side by side on a side line stands a place apart. */
const PLACE = 1.8;

export const courtesyTurn: Figure<CourtesyTurnParams> = (state, params, beats) => {
  onlyKeys('courtesy turn', params, ['who', 'turner', 'turns']);
  const who = oneOf('courtesy turn', 'who', params.who, PAIR_NAMES);
  const turnerRole =
    oneOf('courtesy turn', 'turner', params.turner ?? 'larks', ['larks', 'robins'] as const) ===
    'larks'
      ? 'lark'
      : 'robin';
  if (params.turns !== undefined && !(params.turns > 0 && params.turns <= 2))
    throw new Error('A courtesy turn wheels up to twice round.');
  if (beats < 2) throw new Error('A courtesy turn needs at least two beats.');

  const plans = minorSets(state).flatMap((g) =>
    pairsIn(state, g, who).map(([a, b]) => {
      const [t, f] = roleOf(state, a) === turnerRole ? [a, b] : [b, a];
      if (roleOf(state, t) === roleOf(state, f))
        throw new Error('A courtesy turn pairs a lark with a robin.');
      const pt = body(state, t);
      const pf = body(state, f);
      const span = length(sub(pf.position, pt.position));
      if (span > 2.7) throw new Error(`Dancers ${t} and ${f} are too far apart to courtesy turn.`);
      // The turner receives the follower where he stands, facing in across
      // the set (toward its middle line, or along the set when he stands on
      // the middle line); the follower ends on his right, a place along.
      const center = groupCenter(state, g);
      const toward = sub(center, pt.position);
      const inward =
        Math.abs(toward.x) > 0.3
          ? { x: Math.sign(toward.x) || 1, z: 0 }
          : { x: 0, z: Math.sign(toward.z) || 1 };
      const endYaw =
        length(toward) > 0.3 ? heading({ x: 0, z: 0 }, inward) : pt.yaw + Math.PI;
      // A couple already side by side across the facing line keeps its two
      // places (the turner taking the left one).
      const across = dot(sub(pf.position, pt.position), forward(endYaw));
      const beside = span > 0.5 && Math.abs(across) < 0.3;
      const places = beside
        ? ([pt.position, pf.position] as const)
        : ([pt.position, add(pt.position, scale(rightOf(endYaw), PLACE))] as const);
      // Wheel from the way the turner faces now round to the ending facing:
      // half a turn when he faces away, a whole one when he already faces in.
      let sweep = -turn(pt.yaw, endYaw);
      if (sweep < Math.PI / 2) sweep += 2 * Math.PI;
      // "1¼" and the like: as many whole turns more as bring it nearest.
      if (params.turns !== undefined)
        sweep += 2 * Math.PI * Math.max(0, Math.round(params.turns - sweep / (2 * Math.PI)));
      const pair = courtesyPair(t, f, places, endYaw, sweep);
      const start = courtesyStart(pair);
      return { pair, from: [pt, pf] as const, start };
    }),
  );

  const motion = (beat: number) => {
    const u = beat / beats;
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const p of plans) {
      if (u < GATHER) {
        const q = progress(u / GATHER);
        const into = [p.start.turner, p.start.follower];
        p.from.forEach((from, i) => {
          const to = into[i];
          bodies.push({
            id: i === 0 ? p.pair.turner : p.pair.follower,
            position: mix(from.position, to.position, q),
            yaw: from.yaw + turn(to.yaw, from.yaw) * smooth(u / GATHER),
          });
        });
      } else {
        const w = (u - GATHER) / (1 - GATHER);
        bodies.push(...courtesyAt(p.pair, w));
        contacts.push(...courtesyContacts(p.pair, w));
      }
    }
    const map = bodyMap(bodies);
    return { bodies, contacts: contacts.map((c) => withinReach(c, map)) };
  };
  return {
    kind: 'right-left-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
