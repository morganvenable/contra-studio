/**
 * Swing.
 *
 * Definition: two dancers take ballroom-style closed position, right hips
 * adjacent, and turn clockwise (seen from above) around their shared center
 * for the figure's beats. They end side by side facing across the set on the
 * side line nearest them, the lark on the left. In a minor set of four they
 * end in their side's two places, level with the middle of the minor set.
 * A pair that meets from opposite side lines (partners across an improper
 * set) ends on the lark's side.
 * Source: Caller's Box glossary, "Swing"; ContraDB rows "neighbors swing" and
 * "partners swing" (dance 2321). Orbit radius (0.31 m), turn count, 60 degree
 * frame angle, release timing and hand frame ported from the swing primitive
 * in src/engine.ts. A swing can instead end with the pair side by side in
 * the middle of the set facing down or up the hall ("ones swing, face down
 * to the next couple").
 *
 * Meltdown swing: the pair first walks a right-shoulder round (each faces the
 * other and they orbit clockwise, right shoulders toward the middle, no
 * hands), then melts into the swing without stopping: the orbit closes in to
 * swing distance and the frame forms while they keep turning at one rate.
 * The round takes 4 beats; a phrase shorter than 12 beats gives it a third of
 * the phrase instead, so the swing keeps two thirds.
 * Source: ContraDB rows "partners meltdown swing", "neighbors meltdown
 * swing"; Caller's Box glossary, "Gypsy" (right-shoulder round).
 */
import type { HandContact, Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import { PAIR_NAMES, type PairName } from '../core/relations.ts';
import {
  add,
  forward,
  leftOf,
  length,
  mean,
  mix,
  polar,
  positiveAngle,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../core/math.ts';
import {
  body,
  groupCenter,
  groupOf,
  minorSets,
  pairsIn,
  roleOf,
  withChanges,
  type DanceState,
} from '../core/state.ts';

export interface SwingParams {
  who: PairName;
  /** Start with a right-shoulder round and melt into the swing. */
  meltdown?: boolean;
  /**
   * How the pair ends: facing across on its side line (the default), or
   * side by side in the middle of the set facing down or up the hall.
   */
  end?: 'across' | 'down' | 'up';
}

/** Beats of right-shoulder round before a meltdown swing closes in. */
export function meltdownRoundBeats(beats: number): number {
  return beats >= 12 ? 4 : beats / 3;
}

const RADIUS = 0.31;
/** How far off the middle a pair must start to know which side it ends on. */
const SIDE_MARGIN = 0.5;
/** Share of the swing over which the pair drifts to where it ends. */
const CENTER_DRIFT = 0.7;
/** Within this of the middle a dancer stands in the center line. */
const CENTERED = 0.2;
const LEAD = 0.14;
/** Beats, at least, to turn from the entry facing into the swing frame. */
const TURN_IN_BEATS = 1.6;
const RELEASE = 0.18;
/** Speed ramp share for a swing shorter than 8 beats. */
const SHORT_RAMP = 0.1;
/** Swing frame: each faces 60 degrees left of the partner. */
const FRAME = Math.PI / 3;
/** Final share of the swing spent turning out to face across. */
const OPEN = 0.25;
/** Distance from the middle while walking the right-shoulder round. */
const ROUND_RADIUS = 0.45;
/** Beats spent melting from the round into the swing frame. */
const MELT_BEATS = 1.5;
/** Beats to close to round distance, and to get the orbit up to speed. */
const ROUND_GATHER_BEATS = 1;
const ROUND_RAMP_BEATS = 1.5;
/** Average walking pace (m per beat) closing in from far apart. */
const GATHER_PACE = 0.65;

export const swing: Figure<SwingParams> = (state, params, beats) => {
  onlyKeys('swing', params, ['who', 'meltdown', 'end']);
  const end = oneOf('swing', 'end', params.end ?? 'across', ['across', 'down', 'up'] as const);
  if (params.meltdown !== undefined && typeof params.meltdown !== 'boolean')
    throw new Error('swing meltdown must be true or false.');
  const who = oneOf('swing', 'who', params.who, PAIR_NAMES);
  if (beats < 4) throw new Error('A swing needs at least four beats.');
  const turns = Math.max(1, Math.floor(beats / 4 - 0.5));
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const round = params.meltdown ? meltdownRoundBeats(beats) : 0;
  const plans = pairs.map(([a, b]) => planPair(state, a, b, turns, beats, round, end));

  const motion = (beat: number) => {
    const t = beat / beats;
    return {
      bodies: plans.flatMap((p) => p.ids.map((id) => p.at(id, t))),
      contacts: plans.flatMap((p) => p.contacts(t)),
    };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};

function planPair(
  state: DanceState,
  a: number,
  b: number,
  turns: number,
  beats: number,
  roundBeats: number,
  end: 'across' | 'down' | 'up',
) {
  // A meltdown closes to round distance in a beat and starts orbiting at once.
  // A pair starting far apart (the two ends of a line of four) takes longer
  // to close in, walking at about GATHER_PACE.
  const gap = length(sub(body(state, a).position, body(state, b).position)) / 2;
  const closing = Math.max(0, gap - (roundBeats > 0 ? ROUND_RADIUS : RADIUS)) / GATHER_PACE;
  const lead = Math.min(
    0.4,
    Math.max(roundBeats > 0 ? ROUND_GATHER_BEATS / beats : LEAD, closing / beats),
  );
  // A short swing (under 8 beats) keeps its turning rate steadier: shorter
  // speed ramps, so the middle of the turn is not faster than a dancer turns.
  const ramp = roundBeats > 0 ? ROUND_RAMP_BEATS / beats : beats < 8 ? SHORT_RAMP : undefined;
  const turnIn = Math.max(lead, TURN_IN_BEATS / beats);
  // 0 while walking the round, 1 once melted into the swing (always 1 without a round).
  const melted = (t: number) =>
    roundBeats > 0 ? smooth((t * beats - roundBeats + MELT_BEATS / 2) / MELT_BEATS) : 1;
  const frameAngle = (t: number) => FRAME * melted(t);
  const orbit = (t: number) => ROUND_RADIUS + (RADIUS - ROUND_RADIUS) * melted(t);
  const lark = roleOf(state, a) === 'lark' ? a : b;
  const robin = lark === a ? b : a;
  if (roleOf(state, robin) !== 'robin') throw new Error('A swing pairs a lark with a robin.');
  const start = new Map([lark, robin].map((id) => [id, body(state, id)]));
  const center0 = mean([...start.values()].map((s) => s.position));
  const group = groupOf(state, a);
  const middle = group && group.length === 4 ? groupCenter(state, group) : { x: 0, z: center0.z };
  const across = center0.x - middle.x;
  let exitYaw: number;
  let exitCenter: Vec2;
  // In a whole set (a triplet, a longways set), a pair swinging from across
  // the set has no room on a side line: it ends back in its own places,
  // facing each other across.
  const larkX = start.get(lark)!.position.x - middle.x;
  const robinX = start.get(robin)!.position.x - middle.x;
  const home =
    end === 'across' &&
    !!group &&
    group.length > 4 &&
    // A whole longways set: everyone on the two side lines.
    group.every((id) => Math.abs(Math.abs(body(state, id).position.x - middle.x) - SET.halfWidth) < 0.2) &&
    Math.abs(across) < SIDE_MARGIN &&
    Math.sign(larkX) === -Math.sign(robinX) &&
    Math.abs(Math.abs(larkX) - SET.halfWidth) < 0.2 &&
    Math.abs(start.get(lark)!.position.z - start.get(robin)!.position.z) < 0.2;
  if (home) {
    exitCenter = center0;
    exitYaw = larkX < 0 ? Math.PI / 2 : -Math.PI / 2;
  } else if (end === 'across') {
    const larkAcross = start.get(lark)!.position.x - middle.x;
    // The pair's side. One dancer in the very middle and the other out on a
    // side line (as after an allemande in the center) swing on that side;
    // both in a wave down the middle of the set, on the side the lark faces;
    // straddling the middle evenly, on the lark's side.
    const robinAcross = start.get(robin)!.position.x - middle.x;
    const centered = (v: number) => Math.abs(v) < CENTERED;
    const from =
      Math.abs(across) >= SIDE_MARGIN
        ? across
        : centered(larkAcross) && Math.abs(robinAcross) >= SIDE_MARGIN
          ? robinAcross
          : centered(robinAcross) && Math.abs(larkAcross) >= SIDE_MARGIN
            ? larkAcross
            : centered(larkAcross) && centered(robinAcross)
              ? // Both on the center line (a wave down the middle): the side
                // the lark faces.
                Math.sign(forward(start.get(lark)!.yaw).x) * SET.halfWidth
              : centered(across) && !centered(larkAcross)
                ? // Straddling the middle evenly: the lark's side.
                  Math.sign(larkAcross) * SET.halfWidth
                : larkAcross;
    if (Math.abs(from) < SIDE_MARGIN)
      throw new Error('A swing that ends facing across must start nearer one side.');
    const side = Math.sign(from);
    exitYaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    exitCenter = { x: middle.x + side * SET.halfWidth, z: middle.z };
  } else {
    // In the middle of the set, level with where the pair swings; the top
    // of the set is -z, so down the hall faces +z (yaw 0).
    exitYaw = end === 'down' ? 0 : Math.PI;
    exitCenter = { x: middle.x, z: center0.z };
  }
  const half = scale(leftOf(exitYaw), SET.slot / 2);
  const exitAt = home
    ? new Map([
        [lark, start.get(lark)!.position],
        [robin, start.get(robin)!.position],
      ])
    : new Map([
        [lark, add(exitCenter, half)],
        [robin, sub(exitCenter, half)],
      ]);
  // Facing each other at home; side by side facing the same way otherwise.
  const exitYawOf = (id: number) => (home && id === robin ? exitYaw + Math.PI : exitYaw);

  const theta0 = new Map([...start].map(([id, s]) => [id, polar(sub(s.position, center0))]));
  const offset = positiveAngle(polar(sub(exitAt.get(lark)!, exitCenter)) - theta0.get(lark)!);
  // Whole turns plus the leftover angle to the exit, rounded to the nearer
  // whole number of turns so a short swing never spins much faster.
  const net = TAU * turns + offset - (offset > Math.PI ? TAU : 0);
  const spin = (t: number) => net * progress((t - lead) / (1 - lead), ramp);
  // The pair drifts to where it ends early on, clearing the middle for others.
  const centerAt = (t: number) => mix(center0, exitCenter, smooth(t / CENTER_DRIFT));

  const radiusAt = (id: number, t: number) => {
    const r0 = length(sub(start.get(id)!.position, center0));
    if (t < lead) return r0 + (orbit(t) - r0) * smooth(t / lead);
    return orbit(t) + (SET.slot / 2 - orbit(t)) * smooth((t - (1 - RELEASE)) / RELEASE);
  };
  // Body facing in the frame, on the winding branch nearest each start facing.
  const shift = new Map(
    [...start].map(([id, s]) => {
      const b0 = -theta0.get(id)! - Math.PI / 2 + frameAngle(0);
      return [id, s.yaw + turn(b0, s.yaw) - b0];
    }),
  );
  const bodyYaw = (id: number, t: number) =>
    -(theta0.get(id)! + spin(t)) - Math.PI / 2 + frameAngle(t) + shift.get(id)!;

  const at = (id: number, t: number) => {
    const angle = theta0.get(id)! + spin(t);
    const position = add(centerAt(t), rotate({ x: radiusAt(id, t), z: 0 }, angle));
    const s = start.get(id)!;
    let yaw = bodyYaw(id, t);
    if (t < turnIn) {
      yaw = s.yaw + (yaw - s.yaw) * smooth(t / turnIn);
    } else if (t > 1 - OPEN) {
      const end = bodyYaw(id, 1);
      yaw += turn(exitYawOf(id), end) * smooth((t - (1 - OPEN)) / OPEN);
    }
    return { id, position, yaw, lean: 0.1 };
  };

  const contacts = (t: number): HandContact[] => {
    // Take the frame once gathered; let go just as the pair opens out.
    const strength =
      smooth((t - turnIn * 0.75) / (turnIn * 0.25)) *
      // ... and closed in (a pair gathering from far apart closes late).
      smooth((t - lead * 0.8) / (lead * 0.2)) *
      smooth((1 - RELEASE + 0.04 - t) / 0.08) *
      smooth((melted(t) - 0.8) / 0.2);
    if (strength <= 0) return [];
    return frameContacts(at(lark, t), at(robin, t), lark, robin, strength);
  };
  return { ids: [lark, robin], at, contacts };
}

/** The closed swing frame, as drawn by src/engine.ts. */
function frameContacts(
  pa: { position: Vec2; yaw: number },
  pb: { position: Vec2; yaw: number },
  a: number,
  b: number,
  strength: number,
): HandContact[] {
  const mid = mix(pa.position, pb.position, 0.5);
  const v = sub(pb.position, pa.position);
  // The joined hands are held out to the side, far enough from both
  // shoulders for each elbow to bend down in front rather than behind the
  // back (the shoulder limit, src/arm-limit.ts).
  const joinedAt = add(mid, scale(rotate(v, -Math.PI / 2), 0.55));
  const back = {
    x: pb.position.x - Math.sin(pb.yaw) * 0.13 + Math.cos(pb.yaw) * 0.13,
    y: 1.28,
    z: pb.position.z - Math.cos(pb.yaw) * 0.13 - Math.sin(pb.yaw) * 0.13,
  };
  const shoulder = {
    x: pa.position.x - Math.cos(pa.yaw) * 0.23,
    y: 1.33,
    z: pa.position.z + Math.sin(pa.yaw) * 0.23,
  };
  return [
    {
      a,
      b,
      handA: 'left',
      handB: 'right',
      kind: 'swing-frame',
      target: 'hands',
      strength,
      point: { x: joinedAt.x, y: 1.31, z: joinedAt.z },
    },
    {
      a,
      b,
      handA: 'right',
      handB: 'left',
      kind: 'swing-frame',
      target: 'back',
      strength,
      point: back,
      bodyPoint: { x: 0.13, y: 1.28, z: -0.13 },
      bodyBlend: 1,
    },
    {
      a: b,
      b: a,
      handA: 'left',
      handB: 'right',
      kind: 'swing-frame',
      target: 'upper-arm',
      strength,
      point: shoulder,
    },
  ];
}
