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
 * A pass longer than a walk covers in its beats stops short of the other's
 * place, as far as a walk gets.
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
  /**
   * True: walk all the way to the other's place however long the pass (the
   * progression meets new neighbors there).
   */
  arrive?: boolean;
}

/** Each walker veers this far to the side so the pair passes 0.6 m apart. */
const VEER = 0.3;
const FACE_BEATS = 1;
/** Average walking pace of a pass (m per beat), and the fastest comfortable facing turn (rad per beat). */
const WALK = 0.9;
const TURN = 3.4;

export const passBy: Figure<PassByParams> = (state, params, beats) => {
  onlyKeys('pass by', params, ['who', 'shoulder', 'hands', 'arrive']);
  if (params.arrive !== undefined && params.arrive !== true)
    throw new Error('pass by arrive must be true when given.');
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
      const there = body(state, other).position;
      // A pass too long for its beats (larks crossing the minor set's
      // diagonal in two beats) gets as far toward the other's place as a
      // walk allows; the two still pass in the middle. A pass more than
      // twice what a walk covers (across a big ring, to meet the next
      // dancer) is a travel that has to arrive: it goes all the way and the
      // speed check reports it.
      const span = Math.hypot(there.x - from.position.x, there.z - from.position.z);
      const walkable = Math.min(1, (WALK * beats) / Math.max(span, 1e-9));
      const reach = params.arrive || walkable < 0.5 ? 1 : walkable;
      const to = mix(from.position, there, reach);
      const yaw = heading(from.position, there);
      // Turning to face the way they walk: slower for a bigger turn.
      const faceBeats = Math.min(
        beats,
        Math.max(FACE_BEATS, (1.5 * Math.abs(turn(yaw, from.yaw))) / TURN),
      );
      // Passing right shoulders, each walker veers to the left.
      const veer = scale((shoulder === 'right' ? leftOf : rightOf)(yaw), VEER);
      // They cross when each has gone half the full distance.
      return { id, from, to, yaw, veer, faceBeats, cross: Math.min(0.5 / reach, 0.8) };
    }),
  );
  const motion = (beat: number) => {
    const q = progress(beat / beats, 0.1);
    const bodies = walkers.map((w) => ({
      id: w.id,
      // Veer most where they cross, enough to clear each other there.
      position: add(
        mix(w.from.position, w.to, q),
        scale(w.veer, Math.sin(Math.PI * q) / Math.sin(Math.PI * w.cross)),
      ),
      yaw: w.from.yaw + turn(w.yaw, w.from.yaw) * smooth(beat / w.faceBeats),
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
