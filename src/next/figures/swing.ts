/**
 * Swing.
 *
 * Definition: two dancers take ballroom-style closed position, right hips
 * adjacent, and turn clockwise (seen from above) around their shared center
 * for the figure's beats. They end side by side facing across the set on the
 * side line nearest them, the lark on the left. In a minor set of four they
 * end in their side's two places, level with the middle of the minor set.
 * Source: Caller's Box glossary, "Swing"; ContraDB rows "neighbors swing" and
 * "partners swing" (dance 2321). Orbit radius (0.31 m), turn count, 60 degree
 * frame angle, release timing and hand frame ported from the swing primitive
 * in src/engine.ts.
 */
import type { HandContact, Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import {
  add,
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
  who: 'partner' | 'neighbor' | '1s' | '2s';
}

const RADIUS = 0.31;
/** How far off the middle a pair must start to know which side it ends on. */
const SIDE_MARGIN = 0.5;
const LEAD = 0.14;
/** Beats, at least, to turn from the entry facing into the swing frame. */
const TURN_IN_BEATS = 1.6;
const RELEASE = 0.18;
/** Swing frame: each faces 60 degrees left of the partner. */
const FRAME = Math.PI / 3;
/** Final share of the swing spent turning out to face across. */
const OPEN = 0.25;

export const swing: Figure<SwingParams> = (state, params, beats) => {
  onlyKeys('swing', params, ['who']);
  const who = oneOf('swing', 'who', params.who, ['partner', 'neighbor', '1s', '2s'] as const);
  if (beats < 4) throw new Error('A swing needs at least four beats.');
  const turns = Math.max(1, Math.floor(beats / 4 - 0.5));
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const plans = pairs.map(([a, b]) => planPair(state, a, b, turns, beats));

  const motion = (beat: number) => {
    const t = beat / beats;
    return {
      bodies: plans.flatMap((p) => p.ids.map((id) => p.at(id, t))),
      contacts: plans.flatMap((p) => p.contacts(t)),
    };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};

function planPair(state: DanceState, a: number, b: number, turns: number, beats: number) {
  const turnIn = Math.max(LEAD, TURN_IN_BEATS / beats);
  const lark = roleOf(state, a) === 'lark' ? a : b;
  const robin = lark === a ? b : a;
  if (roleOf(state, robin) !== 'robin') throw new Error('A swing pairs a lark with a robin.');
  const start = new Map([lark, robin].map((id) => [id, body(state, id)]));
  const center0 = mean([...start.values()].map((s) => s.position));
  const group = groupOf(state, a);
  const middle = group && group.length === 4 ? groupCenter(state, group) : { x: 0, z: center0.z };
  const across = center0.x - middle.x;
  if (Math.abs(across) < SIDE_MARGIN)
    throw new Error('A swing that ends facing across must start nearer one side.');
  const side = Math.sign(across);
  const exitYaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  const exitCenter: Vec2 = { x: middle.x + side * SET.halfWidth, z: middle.z };
  const half = scale(leftOf(exitYaw), SET.slot / 2);
  const exitAt = new Map([
    [lark, add(exitCenter, half)],
    [robin, sub(exitCenter, half)],
  ]);

  const theta0 = new Map([...start].map(([id, s]) => [id, polar(sub(s.position, center0))]));
  const offset = positiveAngle(polar(sub(exitAt.get(lark)!, exitCenter)) - theta0.get(lark)!);
  // Whole turns plus the leftover angle to the exit, rounded to the nearer
  // whole number of turns so a short swing never spins much faster.
  const net = TAU * turns + offset - (offset > Math.PI ? TAU : 0);
  const spin = (t: number) => net * progress((t - LEAD) / (1 - LEAD));
  const centerAt = (t: number) => mix(center0, exitCenter, smooth(t));

  const radiusAt = (id: number, t: number) => {
    const r0 = length(sub(start.get(id)!.position, center0));
    if (t < LEAD) return r0 + (RADIUS - r0) * smooth(t / LEAD);
    return RADIUS + (SET.slot / 2 - RADIUS) * smooth((t - (1 - RELEASE)) / RELEASE);
  };
  // Body facing in the frame, on the winding branch nearest each start facing.
  const shift = new Map(
    [...start].map(([id, s]) => {
      const b0 = -theta0.get(id)! - Math.PI / 2 + FRAME;
      return [id, s.yaw + turn(b0, s.yaw) - b0];
    }),
  );
  const bodyYaw = (id: number, t: number) =>
    -(theta0.get(id)! + spin(t)) - Math.PI / 2 + FRAME + shift.get(id)!;

  const at = (id: number, t: number) => {
    const angle = theta0.get(id)! + spin(t);
    const position = add(centerAt(t), rotate({ x: radiusAt(id, t), z: 0 }, angle));
    const s = start.get(id)!;
    let yaw = bodyYaw(id, t);
    if (t < turnIn) {
      yaw = s.yaw + (yaw - s.yaw) * smooth(t / turnIn);
    } else if (t > 1 - OPEN) {
      const end = bodyYaw(id, 1);
      yaw += turn(exitYaw, end) * smooth((t - (1 - OPEN)) / OPEN);
    }
    return { id, position, yaw, lean: 0.1 };
  };

  const contacts = (t: number): HandContact[] => {
    // Take the frame once gathered; let go just as the pair opens out.
    const strength =
      smooth((t - turnIn * 0.75) / (turnIn * 0.25)) * smooth((1 - RELEASE + 0.04 - t) / 0.08);
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
  const joinedAt = add(mid, scale(rotate(v, -Math.PI / 2), 0.25));
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
