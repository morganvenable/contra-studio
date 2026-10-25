/**
 * Pass by and pull by (two named dancers).
 *
 * Definition: two dancers walk toward each other and trade places, passing
 * by the named shoulder ("larks pass by left shoulders"). In a pull by they
 * take that hand as they meet and pull past each other ("robins pull by
 * right"). Each ends in the other's place, facing the way they walked.
 * Source: Caller's Box glossary, "Pull by" and "Pass by"; ContraDB rows
 * "gentlespoons pass by left shoulders", "ladles pull by right", "neighbors
 * pull by left". Walkers face each other over the first beat.
 * With no one named ("pull by right") or named only as shadows, the
 * dancers who face each other pass; "ones pass by" names the two 1s.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, withinReach } from '../core/contacts.ts';
import { add, heading, leftOf, mix, progress, rightOf, scale, smooth, turn } from '../core/math.ts';
import { facingPairs } from '../core/facing.ts';
import { body, minorSets, pairsIn, withChanges } from '../core/state.ts';

export interface PassByParams {
  /** 'facing': whoever stands facing each other. */
  who: 'partner' | 'neighbor' | 'larks' | 'robins' | '1s' | '2s' | 'facing';
  shoulder: 'right' | 'left';
  /** True for a pull by: the passing hands join. */
  hands: boolean;
}

/** Each walker veers this far to the side so the pair passes 0.6 m apart. */
const VEER = 0.3;
const FACE_BEATS = 1;

export const passBy: Figure<PassByParams> = (state, params, beats) => {
  onlyKeys('pass by', params, ['who', 'shoulder', 'hands']);
  const who = oneOf('pass by', 'who', params.who, [
    'partner',
    'neighbor',
    'larks',
    'robins',
    '1s',
    '2s',
    'facing',
  ] as const);
  const shoulder = oneOf('pass by', 'shoulder', params.shoulder, ['right', 'left'] as const);
  if (typeof params.hands !== 'boolean') throw new Error('pass by hands must be true or false.');
  // Whoever faces whom may stand in another minor set (shadows).
  const pairs =
    who === 'facing'
      ? facingPairs(state, minorSets(state).flat())
      : minorSets(state).flatMap((g) => pairsIn(state, g, who));
  const walkers = pairs.flatMap(([a, b]) =>
    [
      [a, b],
      [b, a],
    ].map(([id, other]) => {
      const from = body(state, id);
      const to = body(state, other).position;
      const yaw = heading(from.position, to);
      // Passing right shoulders, each walker veers to the left.
      const veer = scale((shoulder === 'right' ? leftOf : rightOf)(yaw), VEER);
      return { id, from, to, yaw, veer };
    }),
  );
  const motion = (beat: number) => {
    const q = progress(beat / beats, 0.1);
    const bodies = walkers.map((w) => ({
      id: w.id,
      position: add(mix(w.from.position, w.to, q), scale(w.veer, Math.sin(Math.PI * q))),
      yaw: w.from.yaw + turn(w.yaw, w.from.yaw) * smooth(beat / FACE_BEATS),
    }));
    if (!params.hands) return { bodies, contacts: [] };
    const map = bodyMap(bodies);
    const strength = smooth((q - 0.25) / 0.15) * smooth((0.8 - q) / 0.15);
    const contacts: FigureContact[] = pairs.map(([a, b]) =>
      withinReach({ a, handA: shoulder, b, handB: shoulder, kind: 'joined', strength }, map),
    );
    return { bodies, contacts };
  };
  return {
    kind: 'pull-by',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
