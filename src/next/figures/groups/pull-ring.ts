/**
 * The lonesome dancer pulls the lines into a ring.
 *
 * Definition: the dancer standing alone at the end of the set, facing the
 * side lines, crosses their arms and takes the near hands of the end
 * dancers of both lines, then backs away, drawing the two lines after them
 * until everyone stands in one ring, hands joined, facing in.
 * Source: ContraDB 3295 (Millenium Bug, Erik Hoffman), "lonesome person
 * cross hands, join with both lines, pull them through while backing up",
 * followed by "circle left 4 places (hands nine)".
 * Reading: the ring is the hands-round ring of the whole set (1.2 m between
 * dancers); the lonesome dancer backs up half a meter to their place in it,
 * and the lines follow round in order. The crossed arms are styling and are
 * not drawn.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { add, forward, heading, mix, polar, progress, scale, sub, TAU } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { everyone, hold, inOut, named, steer } from './common.ts';
import { ringRadiusFor } from './loop-circle.ts';

export interface PullRingParams {
  who: string;
  /** How far the lonesome dancer backs up. */
  back?: number;
}

export const pullRing: Figure<PullRingParams> = (state, params, beats) => {
  onlyKeys('pull into a ring', params, ['who', 'back']);
  const leaders = named(state, params.who, 'pull into a ring');
  if (leaders.length !== 1) throw new Error('One dancer pulls the lines into a ring.');
  const lead = leaders[0];
  const back = params.back ?? 0.5;
  if (state.hands.length) throw new Error('The lines start with free hands.');
  const ids = everyone(state);
  const n = ids.length;
  const radius = ringRadiusFor(n);
  const s = body(state, lead);
  const f = forward(s.yaw);
  const mine = sub(s.position, scale(f, back));
  const c = add(mine, scale(f, radius));
  const angle = (p: Vec2) => polar(sub(p, c));
  const a0 = angle(mine);
  const rel = (id: number) => (((angle(body(state, id).position) - a0) % TAU) + TAU) % TAU;
  const others = ids.filter((id) => id !== lead).sort((a, b) => rel(a) - rel(b));
  const order = [lead, ...others];
  const targets = new Map(
    order.map((id, i) => {
      const a = a0 + (i * TAU) / n;
      return [id, { x: c.x + radius * Math.cos(a), z: c.z + radius * Math.sin(a) }];
    }),
  );
  const facing = new Map(
    order.map((id) => {
      const from = body(state, id);
      const to = targets.get(id)!;
      return [id, steer((t) => heading(mix(from.position, to, t), c), from.yaw, heading(to, c), 0.25)];
    }),
  );
  const motion = (beat: number) => {
    const t = beat / beats;
    const q = progress(t);
    const bodies: MovedBody[] = order.map((id) => ({
      id,
      position: mix(body(state, id).position, targets.get(id)!, q),
      yaw: facing.get(id)!(q),
    }));
    // Hands join along each line and to the lonesome dancer, where they reach.
    const strength = inOut(t, 0.1);
    const contacts: FigureContact[] = order.map((id, i) =>
      hold(id, 'left', order[(i + 1) % n], 'right', strength, bodies),
    );
    return { bodies, contacts };
  };
  return { kind: 'circle', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
