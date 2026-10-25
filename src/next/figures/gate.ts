/**
 * Gate ("larks gate neighbors to face into the set", "twos gate ones to
 * face down the set").
 *
 * Definition: the gater takes the other dancer by the near hand and pivots
 * in place like a gatepost while the other walks forward around them, the
 * pair turning as one, the shorter way round, until both face the named
 * way (into the set, down, or up), side by side. Each gater gates the named dancer beside them:
 * their partner or neighbor when the row names one, otherwise the nearest
 * of the named couple or role.
 * Source: Caller's Box glossary, "Gate"; ContraDB rows "larks gate
 * neighbors to face into the set", "twos gate ones to face down the set".
 */
import type { Hand, Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  dot,
  forward,
  length,
  progress,
  rightOf,
  rotate,
  sub,
  TAU,
  scale,
  smooth,
} from '../core/math.ts';
import { body, minorSets, related, roleOf, withChanges, type DanceState } from '../core/state.ts';

export interface GateParams {
  who: 'larks' | 'robins' | '1s' | '2s';
  whom: 'partner' | 'neighbor' | 'larks' | 'robins' | '1s' | '2s';
  face: 'in' | 'down' | 'up';
}

const NAMES = ['larks', 'robins', '1s', '2s'] as const;
/** Pivot to gated dancer once the gate swings: side by side, near hands joined. */
const GATE_RADIUS = 0.9;

function named(state: DanceState, who: string, id: number) {
  if (who === 'larks' || who === 'robins')
    return roleOf(state, id) === (who === 'larks' ? 'lark' : 'robin');
  return state.positions.get(who)?.includes(id) ?? false;
}

export const gate: Figure<GateParams> = (state, params, beats) => {
  onlyKeys('gate', params, ['who', 'whom', 'face']);
  const who = oneOf('gate', 'who', params.who, NAMES);
  const whom = oneOf('gate', 'whom', params.whom, [...NAMES, 'partner', 'neighbor'] as const);
  const face = oneOf('gate', 'face', params.face, ['in', 'down', 'up'] as const);
  const pairs = minorSets(state).flatMap((g) => {
    const gaters = g.filter((id) => named(state, who, id));
    if (gaters.length !== 2) throw new Error(`A gate needs two ${who} here.`);
    const taken = new Set<number>();
    return gaters.map((pivot) => {
      const p = body(state, pivot).position;
      let gated: number | undefined;
      if (whom === 'partner' || whom === 'neighbor') gated = related(state, whom, pivot);
      else {
        let best = Infinity;
        for (const id of g) {
          if (id === pivot || taken.has(id) || !named(state, whom, id)) continue;
          const d = length(sub(body(state, id).position, p));
          if (d < best) [gated, best] = [id, d];
        }
      }
      if (gated === undefined || !g.includes(gated) || taken.has(gated))
        throw new Error(`Each of the ${who} needs someone of the ${whom} to gate.`);
      taken.add(gated);
      const pv = body(state, pivot);
      const gb = body(state, gated);
      const r = sub(gb.position, p);
      if (length(r) > 2) throw new Error('A gate needs the two side by side.');
      // The gated dancer walks forward around the pivot.
      const target =
        face === 'down' ? 0 : face === 'up' ? Math.PI : Math.atan2(-Math.sign(p.x) || 1, 0);
      // The gated dancer walks forward around the pivot, unless the other
      // way round is the shorter turn.
      const forwardSense = dot({ x: -r.z, z: r.x }, forward(gb.yaw)) >= 0 ? 1 : -1;
      // Turning by angle a (rotate() sense) changes a yaw by -a.
      const sweepFor = (sense: number) => {
        const w = (((sense * (pv.yaw - target)) % TAU) + TAU) % TAU;
        return w < 0.3 ? w + TAU : w;
      };
      const sense =
        sweepFor(-forwardSense) < sweepFor(forwardSense) - 0.1 ? -forwardSense : forwardSense;
      const sweep = sweepFor(sense);
      const hand: Hand = dot(rightOf(pv.yaw), r) > 0 ? 'right' : 'left';
      return { pivot, gated, p, r, a: sense * sweep, pv, gb, hand };
    });
  });
  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bodies = pairs.flatMap((x) => {
      const a = x.a * q;
      // The gated dancer draws in to arm's length as the gate starts to swing.
      const r0 = length(x.r);
      const radius = r0 + (Math.min(r0, GATE_RADIUS) - r0) * smooth(q / 0.3);
      const g: Vec2 = add(x.p, rotate(scale(x.r, radius / r0), a));
      return [
        { id: x.pivot, position: x.p, yaw: x.pv.yaw - a },
        { id: x.gated, position: g, yaw: x.gb.yaw - a },
      ];
    });
    const map = bodyMap(bodies);
    const strength = Math.min(1, Math.sin(Math.PI * q) * 3);
    const contacts: FigureContact[] = pairs.map((x) =>
      withinReach(
        {
          a: x.pivot,
          handA: x.hand,
          b: x.gated,
          handB: x.hand === 'right' ? 'left' : 'right',
          kind: 'joined',
          strength,
        },
        map,
      ),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
