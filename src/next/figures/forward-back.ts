/**
 * Forward and back (into the middle and back, advance and retire).
 *
 * Definition: the dancers named walk forward the way they face for half
 * the beats and back up to place for the other half (or only forward).
 * Dancers side by side facing the same way join near hands as they go.
 * "Lines of four forward & back" in four face four, "couples forward &
 * back" in a Sicilian circle, "into the middle & back" in a ring, "heads
 * forward & back" in a square.
 * Source: Caller's Box glossary, "Forward and back"; Playford ECD "lead
 * up a double and back". How far: up to 0.5 m toward a dancer straight
 * ahead within 2.5 m (so two lines meet no closer than 0.8 m), else up to
 * 1 m (into a ring), never closing two dancers nearer than 0.65 m.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import { add, distance, dot, forward, progress, scale, smooth, sub } from '../core/math.ts';
import { body, handToward, minorSets, withChanges, type Hold } from '../core/state.ts';

export interface ForwardBackParams {
  /** True: forward and back. False: forward only. */
  back: boolean;
  /** Back first, then forward (a ring "back out & in"). */
  reverse?: boolean;
}

const MEET = 0.5;
const OPEN = 1;
const CLEAR = 0.65;

export const forwardBack: Figure<ForwardBackParams> = (state, params, beats) => {
  onlyKeys('forward & back', params, ['back', 'reverse']);
  if (typeof params.back !== 'boolean')
    throw new Error('forward & back needs back true or false.');
  const ids = minorSets(state).flat();
  if (!ids.length) throw new Error('Nobody walks forward.');
  const all = state.dancers.map((d) => d.id);
  const depth = new Map<number, number>();
  for (const id of ids) {
    const b = body(state, id);
    const f = forward(b.yaw);
    let want = OPEN;
    for (const o of all) {
      if (o === id) continue;
      const v = sub(body(state, o).position, b.position);
      const ahead = dot(v, f);
      const side = Math.abs(v.x * f.z - v.z * f.x);
      if (ahead > 0.3 && ahead < 2.5 && side < 0.6) {
        const coming = ids.includes(o) && dot(forward(body(state, o).yaw), f) < -0.5;
        want = Math.min(want, coming ? Math.min(MEET, (ahead - 0.8) / 2) : ahead - 0.8);
      }
    }
    depth.set(id, Math.max(0, want));
  }
  // Never close two dancers past CLEAR (a ring walking in draws together).
  const at = (k: number) =>
    new Map(
      all.map((id) => {
        const b = body(state, id);
        const d = (depth.get(id) ?? 0) * k;
        return [id, add(b.position, scale(forward(b.yaw), d))];
      }),
    );
  let k = 1;
  for (let i = 0; i < 20; i++) {
    const p = at(k);
    let tight = false;
    for (const a of ids) {
      for (const o of all) {
        if (o !== a && distance(p.get(a)!, p.get(o)!) < CLEAR) tight = true;
      }
    }
    if (!tight) break;
    k *= 0.85;
  }
  if (k < 0.2) throw new Error('There is no room to walk forward.');

  // Hands with dancers side by side facing the same way.
  const holds: Hold[] = [];
  for (const a of ids) {
    for (const o of ids) {
      if (o <= a) continue;
      const ba = body(state, a);
      const bo = body(state, o);
      const v = sub(bo.position, ba.position);
      if (dot(forward(ba.yaw), forward(bo.yaw)) < 0.9) continue;
      if (Math.abs(dot(v, forward(ba.yaw))) > 0.3 || distance(ba.position, bo.position) > 2)
        continue;
      holds.push({ a, handA: handToward(ba, bo.position), b: o, handB: handToward(bo, ba.position) });
    }
  }
  // Keep only each dancer's nearest hold on each hand.
  const used = new Set<string>();
  const kept = holds
    .sort(
      (h, j) =>
        distance(body(state, h.a).position, body(state, h.b).position) -
        distance(body(state, j.a).position, body(state, j.b).position),
    )
    .filter((h) => {
      const ka = `${h.a}:${h.handA}`;
      const kb = `${h.b}:${h.handB}`;
      if (used.has(ka) || used.has(kb)) return false;
      used.add(ka).add(kb);
      return true;
    });

  const motion = (beat: number) => {
    const t = beat / beats;
    let out = params.back ? (t < 0.5 ? progress(t * 2) : 1 - progress(t * 2 - 1)) : progress(t);
    if (params.reverse) out = -out;
    const bodies = ids.map((id) => {
      const b = body(state, id);
      return {
        id,
        position: add(b.position, scale(forward(b.yaw), (depth.get(id) ?? 0) * k * out)),
        yaw: b.yaw,
        lean: 0.05 * Math.abs(out),
      };
    });
    const map = bodyMap(bodies);
    const strength = smooth(beat / 0.75) * (params.back ? smooth((beats - beat) / 0.5) : 1);
    const contacts: FigureContact[] = kept.map((h) => withinReach(joined(h, strength), map));
    return { bodies, contacts };
  };
  return {
    kind: 'long-lines',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: params.back ? [] : kept }),
  };
};
