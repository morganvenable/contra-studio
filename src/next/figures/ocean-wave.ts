/**
 * Form an ocean wave (and balance it).
 *
 * Definition: the four dancers of a minor set step into one line of four,
 * neighbors in line facing opposite ways and holding hands: the named role
 * in the middle joins the named hand ("robins by left hands"), and each of
 * them joins the other hand with the dancer on the end who is their partner
 * or neighbor ("neighbors by right hands"). "Pass through to an ocean wave"
 * walks forward past that dancer into the same wave. "& balance" balances
 * the wave right and left once it has formed.
 *
 * Geometry: each end faces the dancer it holds, so the wave runs across the
 * line between those pairs (across the set when neighbors face along it, as
 * in improper; along the set when they face across, as in Becket). Every
 * dancer keeps facing the way of the one they hold; the hands named decide
 * which end of the line each takes. A wave the hands cannot make from these
 * facings is an error, never a guess.
 * Source: Caller's Box glossary, "Ocean wave", "Balance"; ContraDB rows
 * "form an ocean wave & balance - ladles by left hands and neighbors by
 * right hands", "pass through to an ocean wave - ladles by left in the
 * center, neighbors by right on the sides". Spacing matches a short wave
 * after an allemande (0.9 m between hands-joined dancers).
 */
import type { Hand, Role, Vec2 } from '../../types.ts';
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import {
  add,
  dot,
  ease,
  forward,
  heading,
  leftOf,
  length,
  mean,
  mix,
  progress,
  rightOf,
  scale,
  smooth,
  sub,
  turn,
} from '../core/math.ts';
import { roleOfGroup } from '../core/roles.ts';
import { relationMap } from '../core/relations.ts';
import { body, minorSets, roleOf, withChanges, type Body, type Hold } from '../core/state.ts';

export interface OceanWaveParams {
  /** Who stands in the middle of the wave. */
  middle: 'larks' | 'robins';
  /** The hand the middle two join. */
  middleHand: 'right' | 'left';
  /** Who each end holds: their partner, neighbor or shadow in the middle. */
  ends: 'partner' | 'neighbor' | 'shadow' | 'previous-neighbor';
  /** The hand ends and middles join. */
  endHand: 'right' | 'left';
  /** Balance the wave right and left once formed (the last 4 beats, or half a short row). */
  balance?: boolean;
}

/** Gap between hands-joined dancers in the wave. */
export const WAVE_GAP = 0.9;
/** Average walking pace while forming a wave in a short row (m per beat). */
const FORM_PACE = 0.8;
/** Dancers stepping into a wave pass no closer than this. */
const PASS_CLEAR = 0.75;
const STEP = 0.1;
const STEPS = [0, 1, 0, -1, 0];

const handSide = (yaw: number, hand: Hand) => (hand === 'right' ? rightOf(yaw) : leftOf(yaw));

/**
 * Pass through into an ocean wave: each dancer faces someone across from
 * them; the two walk forward and pass by the right shoulder, stopping level,
 * half a wave gap apart. When the hands named fit the line this makes, that
 * is the wave; otherwise there is none (undefined).
 */
function passIntoWave(
  state: Parameters<typeof oceanWave>[0],
  set: readonly number[],
  role: Role,
  endFor: (mid: number) => number | undefined,
  middleHand: Hand,
  endHand: Hand,
) {
  const mids = set.filter((id) => roleOf(state, id) === role);
  const ends = mids.map(endFor);
  if (mids.length !== 2 || ends.some((e) => e === undefined || !set.includes(e))) return;
  const facingOf = (id: number) => {
    const me = body(state, id);
    const found = set.filter((o) => {
      if (o === id) return false;
      const gap = sub(body(state, o).position, me.position);
      const d = length(gap);
      return (
        d > 0.5 &&
        d < 2.7 &&
        dot(forward(me.yaw), gap) > 0.9 * d &&
        dot(forward(body(state, o).yaw), gap) < -0.9 * d
      );
    });
    return found.length === 1 ? found[0] : undefined;
  };
  const target = new Map<number, Body>();
  for (const id of set) {
    const other = facingOf(id);
    if (other === undefined || facingOf(other) !== id) return;
    const me = body(state, id);
    const meet = mix(me.position, body(state, other).position, 0.5);
    // Passing right shoulders: each ends on its own left of the meeting point.
    target.set(id, { position: add(meet, scale(leftOf(me.yaw), WAVE_GAP / 2)), yaw: me.yaw });
  }
  const [a, b] = mids;
  const holds: Hold[] = [
    { a, handA: middleHand, b, handB: middleHand },
    ...mids.map((m, i) => ({ a: ends[i]!, handA: endHand, b: m, handB: endHand })),
  ];
  const fits = holds.every((h) => {
    const ta = target.get(h.a)!;
    const tb = target.get(h.b)!;
    const gap = sub(tb.position, ta.position);
    return (
      Math.abs(length(gap) - WAVE_GAP) < 0.1 &&
      dot(handSide(ta.yaw, h.handA), gap) > 0 &&
      dot(handSide(tb.yaw, h.handB), scale(gap, -1)) > 0
    );
  });
  return fits ? { ids: [...set], target, holds } : undefined;
}

/**
 * Each named pair (a middle and the end it holds) stands side by side
 * facing the same way (as after a swing ending facing across): the wave
 * runs through the minor set's middle across that facing, each end on its
 * own half 1.35 m out keeping its facing, its middle 0.45 m out facing the
 * other way (the middles passing each other on the way when they come from
 * opposite corners). Undefined when the pairs do not stand so or the hands
 * named cannot join.
 */
function sideBySideWave(
  state: Parameters<typeof oceanWave>[0],
  set: readonly number[],
  role: Role,
  endFor: (mid: number) => number | undefined,
  middleHand: Hand,
  endHand: Hand,
) {
  const mids = set.filter((id) => roleOf(state, id) === role);
  if (mids.length !== 2) return;
  const pairs = mids.map((mid) => ({ mid, end: endFor(mid) }));
  if (pairs.some((p) => p.end === undefined || !set.includes(p.end) || mids.includes(p.end)))
    return;
  const center = mean(set.map((id) => body(state, id).position));
  let facing: Vec2 | undefined;
  for (const p of pairs) {
    const m = body(state, p.mid);
    const e = body(state, p.end!);
    if (Math.abs(turn(m.yaw, e.yaw)) > 0.3) return;
    const gap = sub(e.position, m.position);
    if (length(gap) < 0.6 || Math.abs(dot(gap, forward(m.yaw))) > 0.3) return;
    const f = forward(m.yaw);
    // On a side line, across from the other pair (not already in one line).
    if (Math.abs(dot(sub(mean([m.position, e.position]), center), f)) < 0.5) return;
    if (!facing) facing = f;
    else if (Math.abs(Math.abs(dot(facing, f)) - 1) > 0.05) return;
  }
  const line: Vec2 = { x: -facing!.z, z: facing!.x };
  const target = new Map<number, Body>();
  for (const p of pairs) {
    const end = body(state, p.end!);
    const side = Math.sign(dot(sub(end.position, center), line));
    if (!side) return;
    const out = scale(line, side);
    if (dot(handSide(end.yaw, endHand), out) >= 0) return;
    target.set(p.end!, { position: add(center, scale(out, 1.5 * WAVE_GAP)), yaw: end.yaw });
    target.set(p.mid, {
      position: add(center, scale(out, 0.5 * WAVE_GAP)),
      yaw: end.yaw + Math.PI,
    });
  }
  const [a, b] = mids;
  const ta = target.get(a)!;
  const tb = target.get(b)!;
  if (length(sub(ta.position, tb.position)) < 0.1) return;
  if (dot(handSide(ta.yaw, middleHand), sub(tb.position, ta.position)) <= 0) return;
  if (dot(handSide(tb.yaw, middleHand), sub(ta.position, tb.position)) <= 0) return;
  const holds: Hold[] = [
    { a, handA: middleHand, b, handB: middleHand },
    ...pairs.map((p) => ({ a: p.end!, handA: endHand, b: p.mid, handB: endHand })),
  ];
  return { ids: [...set], target, holds };
}

export const oceanWave: Figure<OceanWaveParams> = (state, params, beats) => {
  onlyKeys('ocean wave', params, ['middle', 'middleHand', 'ends', 'endHand', 'balance']);
  const middle = oneOf('ocean wave', 'middle', params.middle, ['larks', 'robins'] as const);
  const middleHand = oneOf('ocean wave', 'middleHand', params.middleHand, [
    'right',
    'left',
  ] as const);
  const ends = oneOf('ocean wave', 'ends', params.ends, [
    'partner',
    'neighbor',
    'shadow',
    'previous-neighbor',
  ] as const);
  // Shadows and previous neighbors stand outside the minor set: each wave is
  // the minor set's two middles and whoever each of them holds on the end.
  const endOf = relationMap(state, ends);
  const endHand = oneOf('ocean wave', 'endHand', params.endHand, ['right', 'left'] as const);
  if (middleHand === endHand)
    throw new Error('An ocean wave joins different hands in the middle and on the ends.');
  const role: Role = roleOfGroup(middle)!;
  // Forming takes the beats before a 4-beat balance; in a short row, as
  // much of the row as the walk needs (at least half), leaving the balance
  // at least a beat.
  let formBeats = params.balance ? (beats >= 8 ? beats - 4 : beats / 2) : beats;
  if (formBeats < 1) throw new Error('An ocean wave needs a beat to form.');

  const outside = ends === 'shadow' || ends === 'previous-neighbor';
  const sets = minorSets(state).filter(
    // Minor sets with nobody to hold on an end (at the ends of the set) wait.
    (set) => !outside || set.every((id) => roleOf(state, id) !== role || endOf.has(id)),
  );
  if (!sets.length && minorSets(state).length)
    throw new Error(`Nobody has a ${ends.replace('-', ' ')} to hold on an end.`);
  const plan = (set: readonly number[], endFor: (mid: number) => number | undefined) => {
    if (set.length !== 4) throw new Error('An ocean wave needs four dancers.');
    const mids = set.filter((id) => roleOf(state, id) === role);
    if (mids.length !== 2) throw new Error(`An ocean wave needs two ${middle} in the middle.`);
    const g = [...mids, ...mids.map((m) => endFor(m) ?? -1)];
    const pairs = mids.map((m) => {
      const e = endFor(m);
      if (e === undefined || !g.includes(e) || mids.includes(e))
        throw new Error(`Each of the ${middle} needs their ${ends} on an end.`);
      return { mid: m, end: e };
    });
    // Each end faces the middle dancer it holds; the wave runs across that.
    // Pairs facing each other (as neighbors across an improper minor set)
    // set the facing axis by where they stand; pairs already side by side
    // facing opposite ways (as after an allemande in a wave) keep the axis
    // they face along.
    const s0 = sub(body(state, pairs[0].mid).position, body(state, pairs[0].end).position);
    const s1 = sub(body(state, pairs[1].mid).position, body(state, pairs[1].end).position);
    const endFacing = forward(body(state, pairs[0].end).yaw);
    const facingEachOther = length(s0) > 0.3 && Math.abs(dot(s0, endFacing)) > 0.7 * length(s0);
    let axisRaw: Vec2;
    if (facingEachOther) axisRaw = dot(s0, s1) >= 0 ? add(s0, s1) : sub(s0, s1);
    else axisRaw = endFacing;
    if (length(axisRaw) < 0.3)
      throw new Error(`The ${ends} pairs are not facing each other to form a wave.`);
    const facing = scale(axisRaw, 1 / length(axisRaw));
    const along: Vec2 = { x: -facing.z, z: facing.x };
    const center = mean(g.map((id) => body(state, id).position));
    // Yaw each dancer takes along the facing axis: toward the one they hold
    // when facing them, otherwise the way they already face.
    const yawOf = (self: number, other: number) => {
      const d = facingEachOther
        ? sub(body(state, other).position, body(state, self).position)
        : forward(body(state, self).yaw);
      return heading({ x: 0, z: 0 }, dot(d, facing) >= 0 ? facing : scale(facing, -1));
    };
    const target = new Map<number, Body>();
    for (const p of pairs) {
      const endYaw = yawOf(p.end, p.mid);
      const midYaw = yawOf(p.mid, p.end);
      // The end's joined hand points in toward the middle of the line.
      const inward = dot(handSide(endYaw, endHand), along) > 0 ? 1 : -1;
      target.set(p.end, {
        position: add(center, scale(along, -inward * 1.5 * WAVE_GAP)),
        yaw: endYaw,
      });
      target.set(p.mid, {
        position: add(center, scale(along, -inward * 0.5 * WAVE_GAP)),
        yaw: midYaw,
      });
    }
    const [a, b] = mids;
    if (length(sub(target.get(a)!.position, target.get(b)!.position)) < 0.1)
      throw new Error(
        'Both ends would take the same end of the wave; the hands named do not fit how the dancers face.',
      );
    const ta = target.get(a)!;
    const tb = target.get(b)!;
    if (dot(handSide(ta.yaw, middleHand), sub(tb.position, ta.position)) <= 0)
      throw new Error(`The ${middle} cannot join ${middleHand} hands facing the way they do.`);
    const holds: Hold[] = [
      { a, handA: middleHand, b, handB: middleHand },
      ...pairs.map((p) => ({ a: p.end, handA: endHand, b: p.mid, handB: endHand })),
    ];
    return { ids: g, target, holds };
  };
  const plans = sets.map((set) => {
    const named = (m: number) => endOf.get(m);
    try {
      return plan(set, named);
    } catch (error) {
      if (outside) throw error;
      // The hands named do not fit how the dancers stand. Dancers facing
      // someone across pass through into the wave (passIntoWave); failing
      // that, each middle takes the other end dancer of the minor set (the
      // one it can reach), stepping or passing into the wave.
      const others = set.filter((id) => roleOf(state, id) !== role);
      const swapped = (m: number) => others.find((o) => o !== named(m));
      // The pairs the row names stand side by side facing the same way:
      // the wave forms with those pairs, as the row says (sideBySideWave).
      const beside = sideBySideWave(state, set, role, named, middleHand, endHand);
      if (beside) return beside;
      const passed = passIntoWave(state, set, role, named, middleHand, endHand);
      if (passed) return passed;
      try {
        return plan(set, swapped);
      } catch {
        const crossed = passIntoWave(state, set, role, swapped, middleHand, endHand);
        if (crossed) return crossed;
      }
      throw error;
    }
  });

  const start = new Map(plans.flatMap((p) => p.ids.map((id) => [id, body(state, id)] as const)));
  // Dancers whose straight paths into the wave come too close (trading
  // order along the line) bow apart sideways, each to its own side.
  const bulge = new Map<number, Vec2>();
  for (const p of plans) {
    for (const a of p.ids)
      for (const b of p.ids) {
        if (b <= a) continue;
        const [fa, ta, fb, tb] = [start.get(a)!, p.target.get(a)!, start.get(b)!, p.target.get(b)!];
        let closest = Infinity;
        let at = 0;
        for (let k = 0; k <= 20; k++) {
          const u = k / 20;
          const d = length(sub(mix(fa.position, ta.position, u), mix(fb.position, tb.position, u)));
          if (d < closest) [closest, at] = [d, u];
        }
        if (closest >= PASS_CLEAR) continue;
        const gap = sub(mix(fa.position, ta.position, at), mix(fb.position, tb.position, at));
        const moving = sub(sub(ta.position, fa.position), sub(tb.position, fb.position));
        let away = { x: -moving.z, z: moving.x };
        if (length(away) < 1e-6) away = gap;
        if (dot(away, gap) < 0) away = scale(away, -1);
        const push = scale(away, (PASS_CLEAR - closest) / 2 / Math.max(length(away), 1e-6));
        bulge.set(a, add(bulge.get(a) ?? { x: 0, z: 0 }, push));
        bulge.set(b, sub(bulge.get(b) ?? { x: 0, z: 0 }, push));
      }
  }
  if (params.balance && beats < 8) {
    const walk = Math.max(
      0,
      ...plans.flatMap((p) =>
        p.ids.map(
          (id) =>
            length(sub(p.target.get(id)!.position, start.get(id)!.position)) +
            2 * length(bulge.get(id) ?? { x: 0, z: 0 }),
        ),
      ),
    );
    formBeats = Math.min(beats - 1, Math.max(formBeats, walk / FORM_PACE));
  }
  const motion = (beat: number) => {
    const t = Math.min(1, beat / formBeats);
    const q = progress(t);
    const steps =
      params.balance && beat > formBeats ? ((beat - formBeats) / (beats - formBeats)) * 4 : 0;
    const i = Math.min(3, Math.floor(steps));
    const side = params.balance ? STEPS[i] + (STEPS[i + 1] - STEPS[i]) * ease(steps - i) : 0;
    const bodies = plans.flatMap((p) =>
      p.ids.map((id) => {
        const from = start.get(id)!;
        const to = p.target.get(id)!;
        const yaw = from.yaw + turn(to.yaw, from.yaw) * smooth(t / 0.7);
        const position = add(
          add(
            mix(from.position, to.position, q),
            scale(bulge.get(id) ?? { x: 0, z: 0 }, Math.sin(Math.PI * q)),
          ),
          scale(rightOf(to.yaw), STEP * side),
        );
        return { id, position, yaw };
      }),
    );
    const map = bodyMap(bodies);
    const strength = smooth((t - 0.6) / 0.3);
    const contacts: FigureContact[] = plans.flatMap((p) =>
      p.holds.map((h) => withinReach(joined(h, strength), map)),
    );
    return { bodies, contacts };
  };
  return {
    kind: params.balance ? 'wave-balance' : 'pass-to-wave',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: plans.flatMap((p) => p.holds) }),
  };
};
