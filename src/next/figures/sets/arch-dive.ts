/**
 * Arch and dive ("ones arch, twos dive").
 *
 * Definition: two couples face each other (or stand back to back), each
 * couple holding inside hands. They trade places along the line between
 * them: one couple raises its joined hands into an arch and passes over
 * the other couple, which ducks under the arch, partners close together.
 * The couples walk forward, so couples that start face to face end back
 * to back, each facing a new couple; "(back up)" is the same trade walked
 * backward, from back to back to face to face ("rolling arches"). Anyone
 * not yet squared up (after a do-si-do with a partner, say) turns to face
 * the way the couple goes over the first beat.
 * Source: Caller's Box glossary, "Arch and dive", "Rolling arches";
 * ContraDB rows "ones arch twos dive" (Attleboro Reel), "twos arch ones
 * dive" (Circle of Fun), "twos arch ones dive (back up)" (The Mariposa,
 * Fred Breunig).
 * Reading: "(back up)" means the couples, standing back to back after an
 * arch and dive, back up through each other to the places they just left,
 * the named couple making the arch, so rolling arches end where they
 * began. `backing` says which it is.
 */
import type { Figure, FigureContact } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { bodyMap, joined, withinReach } from '../../core/contacts.ts';
import { fastStyling } from '../../core/fast.ts';
import { add, dot, length, mean, progress, scale, smooth, sub, turn } from '../../core/math.ts';
import {
  body,
  handToward,
  minorSets,
  pairsIn,
  withChanges,
  type DanceState,
  type Hold,
} from '../../core/state.ts';

export interface ArchDiveParams {
  /** The couple that makes the arch, by position label ("1s", "2s"). */
  arch: string;
  /** True: the couples back up through each other (they start back to back). */
  backing?: boolean;
}

/**
 * Half the gap between the arching partners as they pass: as close as keeps
 * 0.5 m from the divers, so the joined hands reach as high as they can
 * (contacts.ts archPoint); the divers duck under the rest (archDucks).
 */
const ARCH_HALF = 0.77;
/** Half the gap between the diving partners as they duck under. */
const DIVE_HALF = 0.26;
/** Share of the figure spent closing in (and again opening out). */
const CLOSE = 0.45;
/**
 * A quick arch (under three beats, sharing a phrase with a pass through)
 * keeps the full shape, the arching partners' hands joined high over the
 * divers, and gets up to speed sooner; faster than a walk, it is styled
 * fast (core/fast.ts) rather than drawn as a different figure.
 */
const QUICK_BEATS = 3;
const QUICK_RAMP = 0.12;
/** Beats, at least, to turn to face the way the couple travels (or away). */
const FACE_BEATS = 1;

interface Mover {
  readonly id: number;
  readonly yaw: number;
  /** Signed turn to face the way the couple travels (or straight away from it). */
  readonly face: number;
  /** Signed sideways offset across the travel line at the start. */
  readonly side: number;
}

function couplePlan(
  state: DanceState,
  pair: readonly [number, number],
  to: { x: number; z: number },
  backing: boolean,
) {
  const from = mean(pair.map((id) => body(state, id).position));
  const travel = sub(to, from);
  const len = length(travel);
  if (len < 1) throw new Error('Arch and dive needs the two couples a place apart.');
  const dir = scale(travel, 1 / len);
  const lateral = { x: -dir.z, z: dir.x };
  const want = Math.atan2(dir.x, dir.z) + (backing ? Math.PI : 0);
  const movers: Mover[] = pair.map((id) => {
    const b = body(state, id);
    return { id, yaw: b.yaw, face: turn(want, b.yaw), side: dot(sub(b.position, from), lateral) };
  });
  return { from, to, lateral, movers, dir };
}

export const archDive: Figure<ArchDiveParams> = (state, params, beats) => {
  onlyKeys('arch and dive', params, ['arch', 'backing']);
  if (typeof params.arch !== 'string') throw new Error('arch and dive needs who makes the arch.');
  if (params.backing !== undefined && typeof params.backing !== 'boolean')
    throw new Error('arch and dive backing must be true or false.');
  const archers = state.positions.get(params.arch);
  if (!archers) throw new Error(`Nobody is called "${params.arch}" here.`);
  if (state.hands.length) throw new Error('Arch and dive starts with free hands.');

  const plans = minorSets(state).map((group) => {
    const couples = pairsIn(state, group, 'partner');
    if (couples.length !== 2) throw new Error('Arch and dive needs two couples.');
    const centers = couples.map((c) => mean(c.map((id) => body(state, id).position)));
    const arching = couples.map((c) => c.every((id) => archers.includes(id)));
    if (arching.filter(Boolean).length !== 1)
      throw new Error(`Exactly one couple of each two must be the ${params.arch}.`);
    const plansOf = couples.map((c, i) => {
      const plan = couplePlan(state, c, centers[1 - i], params.backing ?? false);
      for (const m of plan.movers) {
        if (Math.abs(m.side) < 0.3) throw new Error('Arch and dive needs partners side by side.');
      }
      return { ...plan, arch: arching[i], pair: c };
    });
    return plansOf;
  });
  const all = plans.flat();
  const quick = beats < QUICK_BEATS;

  const holdOf = (pair: readonly [number, number]): Hold => {
    const [a, b] = pair.map((id) => body(state, id));
    return {
      a: pair[0],
      handA: handToward(a, b.position),
      b: pair[1],
      handB: handToward(b, a.position),
    };
  };

  const motion = (beat: number) => {
    const t = beat / beats;
    const q = quick ? progress(t, QUICK_RAMP) : progress(t);
    const close = Math.min(smooth(t / CLOSE), smooth((1 - t) / CLOSE));
    const bodies = all.flatMap((p) => {
      const center = add(p.from, scale(sub(p.to, p.from), q));
      return p.movers.map((m) => {
        const half = p.arch ? ARCH_HALF : DIVE_HALF;
        const target = Math.sign(m.side) * half;
        const side = m.side + (target - m.side) * close;
        // A half turn takes about two beats; never more than half the figure.
        const turnBeats = Math.min(Math.max(FACE_BEATS, 0.65 * Math.abs(m.face)), beats / 2);
        const yaw = m.yaw + m.face * smooth(beat / turnBeats);
        return { id: m.id, position: add(center, scale(p.lateral, side)), yaw };
      });
    });
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = all.map((p) => {
      const hold = joined(holdOf(p.pair), close);
      if (!p.arch) return withinReach(hold, map);
      return withinReach({ ...hold, kind: 'arch' }, map);
    });
    return { bodies, contacts };
  };
  return {
    kind: 'pass-through',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
    ...(quick ? fastStyling('quick arch and dive', motion, beats) : {}),
  };
};
