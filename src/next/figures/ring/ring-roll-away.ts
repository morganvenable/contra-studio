/**
 * Roll away with a half sashay in a ring: "larks roll away partners with a
 * half sashay", "larks roll away 2nd neighbors" (circle mixers 915, 991,
 * 2072). The formation maps a roll away to this one in rings (formation-ring.ts).
 *
 * Definition: the dancers named (larks or robins) roll the dancer beside
 * them (partner or neighbor) across in front of them: the rolled dancer
 * travels to the roller's place, passing in front (nearer the middle of
 * the ring) and spinning one full turn the way she travels; the roller
 * sidesteps behind her to her place. Both end on those places of the ring
 * facing in. Dancers who start in from the ring (after "long lines
 * forward") roll on the way back out to it.
 * Source: Caller's Box glossary, "Roll away with a half sashay"; ContraDB
 * dances 915, 991, 2072.
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, withinReach } from '../../core/contacts.ts';
import {
  add,
  dot,
  leftOf,
  mix,
  progress,
  scale,
  smooth,
  sub,
  TAU,
  turn,
} from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { faceIn, namedIds, placeAt, placeIndex, ringOf } from './geometry.ts';

export interface RingRollAwayParams {
  who: 'larks' | 'robins';
  whom: 'partner' | 'neighbor';
}

/** How far in front the rolled dancer passes, and behind the roller steps. */
const FRONT = 0.45;
const BEHIND = 0.2;

export const ringRollAway: Figure<RingRollAwayParams> = (state, params, beats) => {
  onlyKeys('roll away', params, ['who', 'whom']);
  const who = oneOf('roll away', 'who', params.who, ['larks', 'robins'] as const);
  const whom = oneOf('roll away', 'whom', params.whom, ['partner', 'neighbor'] as const);
  const ring = ringOf(state);
  const rel = state.relations.get(whom);
  if (!rel) throw new Error(`Nobody has a ${whom} here.`);
  const plans = namedIds(state, who).flatMap((roller) => {
    const rolled = rel.get(roller);
    if (rolled === undefined) throw new Error(`Dancer ${roller} has no ${whom} to roll away.`);
    const a = body(state, roller);
    const b = body(state, rolled);
    const placeA = placeAt(ring, placeIndex(ring, a.position));
    const placeB = placeAt(ring, placeIndex(ring, b.position));
    if (placeA === placeB) throw new Error('A roll away needs the two on two places.');
    // The rolled dancer travels to her left or right as she faces in.
    const across = sub(placeA, placeB);
    const leftward = dot(across, leftOf(faceIn(ring, placeB))) > 0;
    return [
      { id: rolled, s: b, to: placeA, bulge: -FRONT, spin: leftward ? TAU : -TAU },
      { id: roller, s: a, to: placeB, bulge: BEHIND, spin: 0 },
    ];
  });
  const ids = plans.map((p) => p.id);
  if (new Set(ids).size !== ids.length) throw new Error('A dancer would roll and be rolled at once.');
  const motion = (beat: number) => {
    const t = beat / beats;
    const u = progress(t);
    const bodies = plans.map((p) => {
      const line = mix(p.s.position, p.to, u);
      // Out from the center is +bulge.
      const out = sub(line, ring.center);
      const len = Math.hypot(out.x, out.z) || 1;
      const position = add(line, scale(out, (p.bulge * Math.sin(Math.PI * u)) / len));
      const inward = faceIn(ring, position);
      const start = turn(p.s.yaw, faceIn(ring, p.s.position));
      const yaw = inward + start * (1 - smooth(t / 0.4)) + p.spin * smooth(t);
      return { id: p.id, position, yaw };
    });
    const map = bodyMap(bodies);
    // The roller's near hand guides her across for the first half.
    const strength = Math.min(smooth(t / 0.1), smooth((0.5 - t) / 0.15));
    const contacts: FigureContact[] = [];
    for (let i = 0; i < plans.length; i += 2) {
      const rolled = plans[i];
      const roller = plans[i + 1];
      // Rolled to her left, she is on his right: his right hand, her left.
      const hand = rolled.spin > 0 ? 'right' : 'left';
      const other = hand === 'left' ? 'right' : 'left';
      if (strength > 0.01)
        contacts.push(
          withinReach({ a: roller.id, handA: hand, b: rolled.id, handB: other, kind: 'joined', strength }, map),
        );
    }
    return { bodies, contacts };
  };
  return {
    kind: 'rollaway',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
