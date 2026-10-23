/**
 * Swing.
 *
 * Definition: two dancers take ballroom-style closed position, right hips
 * adjacent, and turn clockwise (seen from above) around their shared center
 * for the figure's beats. They end side by side facing across the set on the
 * side line nearest them, the lark on the left.
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
  minorSets,
  pairsIn,
  roleOf,
  sideOf,
  withChanges,
  type DanceState,
} from '../core/state.ts';

export interface SwingParams {
  who: 'partner' | 'neighbor';
}

const RADIUS = 0.31;
const LEAD = 0.14;
const RELEASE = 0.18;
/** Swing frame: each faces 60 degrees left of the partner. */
const FRAME = Math.PI / 3;
/** Final share of the swing spent turning out to face across. */
const OPEN = 0.25;

export const swing: Figure<SwingParams> = (state, params, beats) => {
  onlyKeys('swing', params, ['who']);
  const who = oneOf('swing', 'who', params.who, ['partner', 'neighbor'] as const);
  if (beats < 4) throw new Error('A swing needs at least four beats.');
  const turns = Math.max(1, Math.floor(beats / 4 - 0.5));
  const pairs = minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const plans = pairs.map(([a, b]) => planPair(state, a, b, turns));

  const motion = (beat: number) => {
    const t = beat / beats;
    return {
      bodies: plans.flatMap((p) => p.ids.map((id) => p.at(id, t))),
      contacts: plans.flatMap((p) => p.contacts(t)),
    };
  };
  return { kind: 'swing', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};

function planPair(state: DanceState, a: number, b: number, turns: number) {
  const lark = roleOf(state, a) === 'lark' ? a : b;
  const robin = lark === a ? b : a;
  if (roleOf(state, robin) !== 'robin') throw new Error('A swing pairs a lark with a robin.');
  const start = new Map([lark, robin].map((id) => [id, body(state, id)]));
  const center0 = mean([...start.values()].map((s) => s.position));
  const side = sideOf(center0);
  if (side === 0) throw new Error('A swing that ends facing across must start nearer one side.');
  const exitYaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  const exitCenter: Vec2 = { x: side * SET.halfWidth, z: center0.z };
  const half = scale(leftOf(exitYaw), SET.slot / 2);
  const exitAt = new Map([
    [lark, add(exitCenter, half)],
    [robin, sub(exitCenter, half)],
  ]);

  const theta0 = new Map([...start].map(([id, s]) => [id, polar(sub(s.position, center0))]));
  const offset = positiveAngle(polar(sub(exitAt.get(lark)!, exitCenter)) - theta0.get(lark)!);
  const net = TAU * turns + offset;
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
    if (t < LEAD) {
      yaw = s.yaw + (yaw - s.yaw) * smooth(t / LEAD);
    } else if (t > 1 - OPEN) {
      const end = bodyYaw(id, 1);
      yaw += turn(exitYaw, end) * smooth((t - (1 - OPEN)) / OPEN);
    }
    return { id, position, yaw, lean: 0.1 };
  };

  const contacts = (t: number): HandContact[] => {
    // Take the frame once gathered; let go just as the pair opens out.
    const strength =
      smooth((t - LEAD * 0.75) / (LEAD * 0.25)) * smooth((1 - RELEASE + 0.04 - t) / 0.08);
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
