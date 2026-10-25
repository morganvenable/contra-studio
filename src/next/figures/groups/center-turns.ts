/**
 * Center turns the ends (a line of three).
 *
 * Definition: the center of each line of three turns the end on their
 * right by the right hand once round, the end on their left by the left
 * once round, and so on as called, alternating; then everyone turns back
 * to face the way the line faced. The ends wait facing forward between
 * their turns.
 * Source: ContraDB 2555 (Catch Somebody, Cis Hinkle's version), "center
 * dancer: turn right by the right, turn left by the left, turn right by the
 * right, then you turn back"; Caller's Box glossary, "Allemande".
 * Reading: each turn once round (the pair ends where it started), the turns
 * sharing the beats evenly and leaving a sixth of them to turn back to face
 * forward.
 */
import type { Hand } from '../../../types.ts';
import type { Figure, FigureContact, MovedBody } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { add, mix, progress, rotate, scale, smooth, sub, TAU, turn } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { hold, inOut, window } from './common.ts';
import { triosOf } from './trios.ts';

export interface CenterTurnsParams {
  /** Hands in order; a right-hand turn is with the end on the center's right. */
  hands: Hand[];
}

/** Beats each dancer takes to turn to face a partner (or back). */
const FACE = 1.5;
/** How far each dancer steps in toward the joined hands. */
const GATHER = 0.1;

export const centerTurns: Figure<CenterTurnsParams> = (state, params, beats) => {
  onlyKeys('center turns', params, ['hands']);
  const hands = params.hands;
  if (!Array.isArray(hands) || !hands.length || hands.some((h) => h !== 'left' && h !== 'right'))
    throw new Error('Center turns names the hands, left or right.');
  for (let i = 1; i < hands.length; i++)
    if (hands[i] === hands[i - 1]) throw new Error('The center turns the ends by alternate hands.');
  if (state.hands.length) throw new Error('Center turns start with free hands.');
  const { trios } = triosOf(state, 'center turns');
  const back = beats / 6;
  const span = (beats - back) / hands.length;
  if (span < 3) throw new Error('Not enough beats for the turns.');
  const turns = hands.map((hand, k) => ({
    hand,
    from: k * span,
    to: (k + 1) * span,
    sweep: (hand === 'right' ? 1 : -1) * TAU,
  }));
  // The center's facing: forward, then to each partner in turn, then forward.
  // Turning toward the next partner goes against the coming turn's spin.
  const centerSteps = turns.map((t, k) => {
    if (k === 0) return { at: t.from, delta: t.hand === 'right' ? -Math.PI / 2 : Math.PI / 2 };
    return { at: t.from, delta: t.hand === 'left' ? -Math.PI : Math.PI };
  });
  centerSteps.push({
    at: beats - back,
    delta: hands.at(-1) === 'right' ? Math.PI / 2 : -Math.PI / 2,
  });

  const motion = (beat: number) => {
    const bodies: MovedBody[] = [];
    const contacts: FigureContact[] = [];
    for (const trio of trios) {
      const c0 = body(state, trio.center);
      const ends = { right: trio.outside, left: trio.inside };
      // Facing of the center: forward plus the steps so far.
      let cYaw = trio.ahead;
      for (const st of centerSteps)
        cYaw += st.delta * smooth(window(beat, st.at, Math.min(beats, st.at + FACE)));
      let cPos = c0.position;
      const placed = new Map<number, { position: typeof cPos; yaw: number }>();
      for (const side of ['right', 'left'] as const) {
        const id = ends[side];
        const s = body(state, id);
        // An end faces the center for each of its turns.
        const toward = side === 'right' ? Math.PI / 2 : -Math.PI / 2;
        let yaw = trio.ahead;
        let position = s.position;
        for (const t of turns) {
          if (t.hand !== side) continue;
          yaw += toward * smooth(window(beat, t.from, t.from + FACE));
          yaw -= toward * smooth(window(beat, t.to, Math.min(beats, t.to + FACE)));
          const u = window(beat, t.from, t.to);
          if (u > 0 && u < 1) {
            const mid = mix(c0.position, s.position, 0.5);
            const angle = t.sweep * progress(u);
            const half = sub(s.position, mid);
            const shrink = 1 - (GATHER / Math.hypot(half.x, half.z)) * inOut(u, 0.25);
            position = add(mid, rotate(scale(sub(s.position, mid), shrink), angle));
            cPos = add(mid, rotate(scale(sub(c0.position, mid), shrink), angle));
            yaw -= angle;
            cYaw -= angle;
            contacts.push({ a: trio.center, handA: t.hand, b: id, handB: t.hand, strength: inOut(u, 0.15), kind: 'joined' });
          }
        }
        placed.set(id, { position, yaw: yaw + turn(s.yaw, trio.ahead) * (1 - smooth(beat)) });
      }
      bodies.push({ id: trio.center, position: cPos, yaw: cYaw + turn(c0.yaw, trio.ahead) * (1 - smooth(beat)) });
      for (const [id, b] of placed) bodies.push({ id, ...b });
    }
    return {
      bodies,
      contacts: contacts.map((c) => hold(c.a, c.handA, c.b, c.handB, c.strength, bodies)),
    };
  };
  return { kind: 'allemande', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
