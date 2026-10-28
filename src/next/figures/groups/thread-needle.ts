/**
 * Thread the needle (a line, hands joined).
 *
 * Definition: everyone in a line faces the same way and joins hands. Two
 * neighbors at one end raise their joined hands to make an arch; the dancer
 * at the other end leads the rest of the line, hands still joined, across in
 * front of the line, through the arch and back round behind the line to
 * their places. The arch dancer nearer the threading line turns under the
 * arch as the line goes through, so the hands come untwisted, and the line
 * straightens facing as it began.
 * Source: ContraDB 3521 (Quintilinear (variation)), "Thread the Needle, and
 * straighten the line" and its note ("All face UP & take hands. 2&3 arch,
 * no.1 dives. Both ends go all the way around and back to place");
 * Caller's Box glossary, "Thread the needle"; Playford ECD manuals (the
 * line leads through an arch made at its far end).
 * Reading: the leader takes the threading dancers once round a loop through
 * the arch and back along their own places, each following in turn; the
 * arch dancers stay in place (the inner one turns once under the arch). One
 * pass through the arch.
 */
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { add, dot, leftOf, mean, progress, scale, smooth, sub, TAU, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { arcPath, everyone, hold, inOut, named, spline, steer, window } from './common.ts';

export interface ThreadNeedleParams {
  /** Position labels of the two dancers who make the arch, at one end. */
  arch: string[];
  /** Position label of the dancer at the other end, who leads. */
  leader: string;
  /** Everyone first faces up (-z) or down the hall. */
  face: 'up' | 'down';
}

/** How far in front of (and behind) the line the loop runs. */
const LOOP = 1.1;

export const threadNeedle: Figure<ThreadNeedleParams> = (state, params, beats) => {
  onlyKeys('thread the needle', params, ['arch', 'leader', 'face']);
  const yaw0 = oneOf('thread the needle', 'face', params.face, ['up', 'down'] as const) === 'up' ? Math.PI : 0;
  if (!Array.isArray(params.arch) || params.arch.length !== 2)
    throw new Error('Two dancers make the arch.');
  const arch = params.arch.flatMap((a) => named(state, a, 'thread the needle'));
  const leaders = named(state, params.leader, 'thread the needle');
  if (arch.length !== 2 || leaders.length !== 1) throw new Error('Name two arch dancers and one leader.');
  const leader = leaders[0];
  const ids = everyone(state);
  const front = { x: Math.sin(yaw0), z: Math.cos(yaw0) };
  const lead = body(state, leader).position;
  const archMid = mean(arch.map((id) => body(state, id).position));
  const axisRaw = sub(archMid, lead);
  const e = scale(axisRaw, 1 / Math.hypot(axisRaw.x, axisRaw.z));
  const along = (id: number) => dot(sub(body(state, id).position, lead), e);
  // The arch dancers are the two at the far end; the threaders are everyone else.
  const order = [...ids].sort((a, b) => along(a) - along(b));
  if (!arch.every((id) => order.indexOf(id) >= order.length - 2))
    throw new Error('The arch is made at the far end of the line.');
  if (order[0] !== leader) throw new Error('The leader stands at the other end of the line.');
  const threaders = order.slice(0, -2);
  const [inner, outer] = [...arch].sort((a, b) => along(a) - along(b));
  const gate = mean([body(state, inner).position, body(state, outer).position]);
  const last = body(state, threaders.at(-1)!).position;
  const P = (k: number, f: number) => add(add(lead, scale(e, k)), scale(front, f));
  const gateK = dot(sub(gate, lead), e);
  const lastK = dot(sub(last, lead), e);
  // Closed loop: from the leader's place out in front, along to the arch,
  // through it, round behind and back onto the line, then along the
  // threaders' own places to the leader's.
  // Front is +f, behind -f; k runs along the line from the leader.
  const points = [
    lead,
    P(-0.3, 0.5 * LOOP),
    P(0.3, LOOP),
    P(0.4 * gateK, 1.05 * LOOP),
    P(0.75 * gateK, 0.95 * LOOP),
    P(gateK - 0.15, 0.55 * LOOP),
    gate,
    P(gateK - 0.05, -0.55 * LOOP),
    P(gateK - 0.35, -0.9 * LOOP),
    P(0.5 * (gateK + lastK), -1.05 * LOOP),
    P(lastK + 0.35, -0.65 * LOOP),
    last,
    ...threaders
      .slice(1, -1)
      .reverse()
      .map((id) => body(state, id).position),
  ];
  const track = arcPath(spline(points, true), true);
  const L = track.length;
  // Each threader starts where the loop passes their place; find it.
  const startOf = new Map<number, number>();
  for (const id of threaders) {
    const p = body(state, id).position;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < 2000; i++) {
      const s = (i / 2000) * L;
      const q = track.at(s).position;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bestD - 1e-9) {
        bestD = d;
        best = s;
      }
    }
    startOf.set(id, best);
  }
  // The leader goes round from s = 0 (the spline starts at its place).
  startOf.set(leader, 0);
  const gateS = (() => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < 2000; i++) {
      const s = (i / 2000) * L;
      const q = track.at(s).position;
      const d = Math.hypot(q.x - gate.x, q.z - gate.z);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  })();
  // When the last threader passes the gate, the inner arch dancer turns under.
  const lastS = startOf.get(threaders.at(-1)!)!;
  const passAt = (((gateS - lastS + L) % L) / L) * beats;

  const where = (id: number, t: number) => track.at(startOf.get(id)! + L * progress(t, 0.12));
  const facing = new Map(
    threaders.map((id) => [
      id,
      steer((t) => where(id, t).yaw, body(state, id).yaw, yaw0, 0.1),
    ]),
  );
  const motion = (beat: number) => {
    const t = beat / beats;
    const bodies: MovedBody[] = threaders.map((id) => {
      const s = body(state, id);
      // The loop passes within millimeters of each place; carry the difference.
      const off = sub(s.position, track.at(startOf.get(id)!).position);
      return { id, position: add(where(id, t).position, off), yaw: facing.get(id)!(t) };
    });
    const spin = TAU * smooth(window(beat, passAt - 1.6, passAt + 1.6));
    const si = body(state, inner);
    const up = (b: { yaw: number }) => b.yaw + turn(yaw0, b.yaw) * smooth(Math.min(1, beat / 2));
    bodies.push({ id: inner, position: si.position, yaw: up(si) - spin });
    const so = body(state, outer);
    bodies.push({ id: outer, position: so.position, yaw: up(so) });
    const contacts: FigureContact[] = [];
    const strength = inOut(t, 0.05);
    // The line keeps hands where they reach; the arch is held throughout.
    const line = [...threaders, inner, outer];
    const leftSide = dot(leftOf(yaw0), e) > 0;
    for (let i = 0; i + 1 < line.length; i++) {
      const [a, b] = [line[i], line[i + 1]];
      const c = hold(a, leftSide ? 'left' : 'right', b, leftSide ? 'right' : 'left', strength, bodies);
      // The last pair's hands go up as the arch, the inner dancer turning under it.
      contacts.push(a === inner && b === outer ? { ...c, kind: 'arch', underId: inner } : c);
    }
    return { bodies, contacts };
  };
  return {
    kind: 'hey',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
