/**
 * Give and take.
 *
 * Definition: the named role ("larks give & take partners") walks across
 * the set to the named dancer, takes them by both hands, and backs up to
 * where they came from, bringing that dancer along, ready to swing on the
 * taker's side. Takers face the dancer they take throughout; the taken
 * dancer turns to face the taker and walks forward with them.
 * Source: Caller's Box glossary, "Give and take"; ContraDB rows "gentlespoons
 * give & take partners", "ladles give & take partners". Half the beats to
 * cross, half to come back (src/give-and-take.ts phaseBeats [4, 4]).
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import { add, heading, length, mix, progress, scale, smooth, sub, turn } from '../core/math.ts';
import { roleOfGroup } from '../core/roles.ts';
import { body, counterpart, minorSets, roleOf, withChanges } from '../core/state.ts';

export interface GiveAndTakeParams {
  /** Who takes: a role. */
  who: 'larks' | 'robins';
  /** Whom they take: partner or neighbor. */
  whom: 'partner' | 'neighbor';
}

/** Distance between the taker and the taken while holding both hands. */
const HOLD = 0.7;
const FACE_BEATS = 1;

export const giveAndTake: Figure<GiveAndTakeParams> = (state, params, beats) => {
  onlyKeys('give & take', params, ['who', 'whom']);
  const who = oneOf('give & take', 'who', params.who, ['larks', 'robins'] as const);
  const whom = oneOf('give & take', 'whom', params.whom, ['partner', 'neighbor'] as const);
  if (beats < 4) throw new Error('A give and take needs at least four beats.');
  if (state.hands.length) throw new Error('A give and take starts with free hands.');
  const role = roleOfGroup(who)!;

  const pairs = minorSets(state).flatMap((g) =>
    g
      .filter((id) => roleOf(state, id) === role)
      .map((taker) => {
        const taken = counterpart(state, taker, whom, g);
        if (taken === undefined) throw new Error(`Dancer ${taker} has no ${whom} to take.`);
        const t0 = body(state, taker);
        const k0 = body(state, taken);
        const span = sub(k0.position, t0.position);
        if (length(span) < HOLD + 0.3) throw new Error('A give and take needs room to cross.');
        const dir = scale(span, 1 / length(span));
        // The taker meets the taken a hold's length short of them, then both
        // travel back until the taker is home.
        const meet = sub(k0.position, scale(dir, HOLD));
        const home = add(t0.position, scale(dir, HOLD));
        return { taker, taken, t0, k0, dir, meet, home };
      }),
  );

  const half = beats / 2;
  const motion = (beat: number) => {
    const out = progress(Math.min(1, beat / half));
    const back = progress(Math.max(0, (beat - half) / half));
    const bodies = pairs.flatMap((p) => {
      const facing = heading(p.t0.position, p.k0.position);
      const takerAt = mix(mix(p.t0.position, p.meet, out), p.t0.position, back);
      const takenAt = mix(p.k0.position, p.home, back);
      const takenFacing = facing + Math.PI;
      return [
        {
          id: p.taker,
          position: takerAt,
          yaw: p.t0.yaw + turn(facing, p.t0.yaw) * smooth(beat / FACE_BEATS),
        },
        {
          id: p.taken,
          position: takenAt,
          yaw: p.k0.yaw + turn(takenFacing, p.k0.yaw) * smooth(beat / Math.min(half, 2)),
        },
      ];
    });
    const map = bodyMap(bodies);
    // Both hands join as they meet and hold while coming back.
    const strength = smooth((beat - half * 0.75) / (half * 0.25)) * smooth((beats - beat) / 0.5);
    const contacts: FigureContact[] = pairs.flatMap((p) =>
      (['right', 'left'] as const).map((hand) =>
        withinReach(
          {
            a: p.taker,
            handA: hand,
            b: p.taken,
            handB: hand === 'right' ? 'left' : 'right',
            kind: 'joined',
            strength,
          },
          map,
        ),
      ),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'give-and-take',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
