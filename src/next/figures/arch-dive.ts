/**
 * Arch and dive ("twos arch, ones dive").
 *
 * Definition: two couples face each other. The arching couple raises its
 * joined inside hands and walks forward over the diving couple, who walk
 * forward under the arch, close together; the couples trade places and
 * end facing the way they walked, away from each other (toward the next
 * couple). In a ring the couples are the partners on opposite edges of it.
 * Source: Caller's Box glossary, "Arch and dive"; ContraDB rows "circle
 * left 3 places, balance the ring, twos arch ones dive", "ones arch twos
 * dive". Each couple keeps its dancers' order across its path; the divers
 * draw in to pass between the arching dancers, who open out to let them.
 */
import type { Hand, Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import {
  add,
  dot,
  heading,
  length,
  mean,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { body, minorSets, partnerOf, roleOf, withChanges } from '../core/state.ts';

export interface ArchDiveParams {
  /** The couple that arches: a couple number or a role's partners. */
  arch: '1s' | '2s' | 'larks' | 'robins';
  /** The couple that dives under. */
  dive: '1s' | '2s' | 'larks' | 'robins';
}

/** Half the gap between the divers, and between the arching dancers, as they cross. */
const DIVE_HALF = 0.27;
const ARCH_HALF = 0.8;
const FACE_BEATS = 1;

export const archDive: Figure<ArchDiveParams> = (state, params, beats) => {
  onlyKeys('arch and dive', params, ['arch', 'dive']);
  const names = ['1s', '2s', 'larks', 'robins'] as const;
  const arch = oneOf('arch and dive', 'arch', params.arch, names);
  const dive = oneOf('arch and dive', 'dive', params.dive, names);
  if (arch === dive) throw new Error('One couple arches and the other dives.');
  const named = (who: string, id: number) =>
    who === 'larks' || who === 'robins'
      ? roleOf(state, id) === (who === 'larks' ? 'lark' : 'robin')
      : (state.positions.get(who)?.includes(id) ?? false);

  const moves = minorSets(state).flatMap((g) => {
    const couple = (who: string) => {
      const first = g.find((id) => named(who, id));
      if (first === undefined) throw new Error(`No ${who} here to arch or dive.`);
      // A role names its dancer and their partner.
      const other =
        who === 'larks' || who === 'robins'
          ? partnerOf(state, first)
          : g.find((id) => id !== first && named(who, id));
      if (other === undefined || !g.includes(other))
        throw new Error(`The ${who} need a couple of two here.`);
      return [first, other] as const;
    };
    const divers = couple(dive);
    const arches = couple(arch);
    if (divers.some((id) => arches.includes(id)))
      throw new Error('The arching and diving couples must be different dancers.');
    const center = (c: readonly number[]) => mean(c.map((id) => body(state, id).position));
    const travel = sub(center(arches), center(divers));
    if (length(travel) < 0.8)
      throw new Error('The two couples must face each other to arch and dive.');
    const along = scale(travel, 1 / length(travel));
    const side = { x: -along.z, z: along.x };
    const plan = (c: readonly number[], d: Vec2, half: number, arching: boolean) => {
      const mid = center(c);
      return c.map((id) => {
        const from = body(state, id).position;
        const lateral = dot(sub(from, mid), side);
        if (Math.abs(lateral) < 0.2)
          throw new Error('A couple stands side by side to arch or dive.');
        const yaw = heading(from, add(from, d));
        const partner = c.find((o) => o !== id)!;
        const toward = sub(body(state, partner).position, from);
        return {
          id,
          from,
          to: add(from, d),
          side,
          // Draw in (or open out) to `half` from the couple's own line as they cross.
          squeeze: Math.sign(lateral) * half - lateral,
          yaw,
          partner,
          hand: (dot(rightOf(yaw), toward) > 0 ? 'right' : 'left') as Hand,
          arching,
        };
      });
    };
    return [
      ...plan(divers, travel, DIVE_HALF, false),
      ...plan(arches, scale(travel, -1), ARCH_HALF, true),
    ];
  });

  const motion = (beat: number) => {
    const q = progress(beat / beats);
    const bend = Math.sin(Math.PI * q);
    const bodies = moves.map((m) => {
      const from = body(state, m.id);
      return {
        id: m.id,
        position: add(add(m.from, scale(sub(m.to, m.from), q)), scale(m.side, m.squeeze * bend)),
        yaw: from.yaw + turn(m.yaw, from.yaw) * smooth(beat / FACE_BEATS),
      };
    });
    const map = bodyMap(bodies);
    const strength = smooth((bend - 0.4) / 0.3);
    // Each couple holds inside hands: up as an arch, low as it dives.
    const contacts: FigureContact[] = moves
      .filter((m) => m.id < m.partner)
      .map((m) => {
        const other = moves.find((o) => o.id === m.partner)!;
        return withinReach(
          {
            a: m.id,
            handA: m.hand,
            b: other.id,
            handB: other.hand,
            kind: 'joined',
            strength,
          },
          map,
        );
      });
    return { bodies, contacts };
  };
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
