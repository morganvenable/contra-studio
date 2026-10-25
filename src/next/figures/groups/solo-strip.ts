/**
 * Solo strip the willow (one dancer turns everyone in a small ring).
 *
 * Definition: one dancer (the active) turns each of the other dancers in
 * the ring in turn, alternating hands: a left-hand turn once round with
 * one, a right-hand turn once round with the next, and so on until all have
 * been turned. Each dancer turned stays on their place (the turn takes them
 * once round and back); the active turns from just inside the ring.
 * Source: ContraDB 2387 (Tighten Your Lugnuts), "1 dancer strip the willow
 * (left allemande someone, right allemande someone else, continue til all
 * allemanded)"; Caller's Box glossary, "Strip the willow" (the active
 * turns each dancer of a line in turn, alternating hands).
 * Reading: the active steps in and turns the dancer on their left first
 * (by the left, the hand nearest), then goes on round the ring to the left,
 * each turn once round at 0.8 m apart, a short step between turns. The
 * active ends just inside the ring facing the last dancer turned. The
 * source lets the active choose any order ("tightening lug nuts", across the
 * ring); going round the ring keeps every step short and is the order
 * drawn.
 */
import type { Hand } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import {
  add,
  heading,
  length,
  mix,
  progress,
  rotate,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { findRing } from '../../core/ring.ts';
import { body, withChanges } from '../../core/state.ts';
import { everyone, hold, inOut, named, window } from './common.ts';

export interface SoloStripParams {
  /** Position label naming the active dancer ("first"). */
  who: string;
  /** Hand of the first turn; the hands alternate. */
  hand?: Hand;
}

/** Distance between the active and the dancer turned. */
const SEPARATION = 0.8;
/** Beats to step in to the first turn. */
const APPROACH = 2;
/** A step between turns takes this share of a turn's beats. */
const STEP_SHARE = 1 / 2.75;

export const soloStrip: Figure<SoloStripParams> = (state, params, beats) => {
  onlyKeys('strip the willow', params, ['who', 'hand']);
  const first: Hand = oneOf('strip the willow', 'hand', params.hand ?? 'left', [
    'left',
    'right',
  ] as const);
  const actives = named(state, params.who, 'strip the willow');
  if (actives.length !== 1) throw new Error('One dancer strips the willow.');
  const active = actives[0];
  if (state.hands.length) throw new Error('Strip the willow starts with free hands.');
  const ring = findRing(state, everyone(state), 'strip the willow');
  const at = ring.order.indexOf(active);
  // Round the ring to the active's left (increasing angle).
  const others = ring.order.map((_, i) => ring.order[(at + 1 + i) % ring.order.length]).slice(0, -1);
  const n = others.length;
  if (n < 2) throw new Error('Strip the willow needs at least two others.');
  const step = (beats - APPROACH) / (n / STEP_SHARE + n - 1);
  const turnBeats = step / STEP_SHARE;
  if (!(step > 0.5)) throw new Error('Not enough beats to turn everyone.');
  const start = body(state, active);
  const plan = others.map((o, k) => {
    const p = body(state, o).position;
    const rel = sub(p, ring.center);
    const station = add(ring.center, scale(rel, (length(rel) - SEPARATION) / length(rel)));
    const hand: Hand = k % 2 === 0 ? first : first === 'left' ? 'right' : 'left';
    const from = APPROACH + k * (turnBeats + step);
    return {
      id: o,
      home: p,
      yaw: body(state, o).yaw,
      station,
      hand,
      // A right-hand turn goes clockwise seen from above (rotate > 0).
      sweep: (hand === 'right' ? 1 : -1) * TAU,
      from,
      to: from + turnBeats,
    };
  });

  const motion = (beat: number) => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    // The active.
    let pos = start.position;
    let yaw = start.yaw;
    if (beat < APPROACH) {
      const u = beat / APPROACH;
      pos = mix(start.position, plan[0].station, progress(u));
      const face = heading(plan[0].station, plan[0].home);
      yaw = start.yaw + turn(face, start.yaw) * smooth(u);
    } else {
      for (let k = 0; k < n; k++) {
        const p = plan[k];
        const face = heading(p.station, p.home);
        if (beat <= p.to) {
          const angle = p.sweep * progress(window(beat, p.from, p.to));
          const mid = mix(p.station, p.home, 0.5);
          pos = add(mid, rotate(sub(p.station, mid), angle));
          yaw = face - angle;
          break;
        }
        const next = plan[k + 1];
        if (next && beat < next.from) {
          const u = window(beat, p.to, next.from);
          pos = mix(p.station, next.station, progress(u));
          const to = heading(next.station, next.home);
          yaw = face + turn(to, face) * smooth(u);
          break;
        }
        pos = p.station;
        yaw = face;
      }
    }
    bodies.push({ id: active, position: pos, yaw });
    // Each dancer turned goes once round the pair's middle and back to place.
    for (const p of plan) {
      const u = window(beat, p.from, p.to);
      const angle = p.sweep * progress(u);
      const mid = mix(p.station, p.home, 0.5);
      const face = heading(p.home, p.station);
      const d = turn(face, p.yaw);
      const facing = p.yaw + d * smooth(window(beat, p.from - 0.75, p.from)) - d * smooth(window(beat, p.to, p.to + 0.75));
      bodies.push({ id: p.id, position: add(mid, rotate(sub(p.home, mid), angle)), yaw: facing - angle });
      if (u > 0 && u < 1) contacts.push(hold(active, p.hand, p.id, p.hand, inOut(u, 0.12), bodies));
    }
    return { bodies, contacts };
  };
  return {
    kind: 'allemande',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
