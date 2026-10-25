/**
 * Hey for four (across the set), full or half.
 *
 * Definition: the four dancers of a minor set weave past each other along a
 * line across the set, alternating shoulders: the two in the middle pass
 * each other ("rights in center" passes right shoulders), then each passes
 * the dancer coming in from the end of the line by the other shoulder
 * ("lefts on ends"), and so on. Dancers at the ends loop around to come back
 * in. A half hey is four passes (everyone ends on the other side), a full hey
 * eight (everyone ends where they started). "Robins start" means the robins
 * make the first pass, in the middle; "partners start" means partners make
 * the first pass, on the ends, and the dancers who then meet in the middle
 * are the role nearer the middle of the set when the hey begins (or, all
 * in places, the role facing more toward the sides; the larks when that
 * does not decide it either).
 * Source: Caller's Box glossary, "Hey"; ContraDB rows "ladles start a full
 * hey - rights in center, lefts on ends", "partners start a half hey - rights
 * on ends, lefts in center".
 *
 * Track: the serpentine pass kernel of src/hey.ts (compileHeyTrajectory):
 * four slots along a line across the set through the middle of the minor
 * set, center passes and side passes alternating, ends looping outside the
 * line, every junction C2, so walkers never stop or snap their facing.
 * Passes are evenly spaced; the first gate comes after an entry and the last
 * leaves time to exit. Entry and exit follow src/hey.ts solveExplicitHeyExit:
 * cubic Hermite curves that match position and velocity where they meet the
 * track. Each dancer walks from their place onto the track a quarter pass
 * before their own first pass, facing the way they travel, and leaves it at
 * the middle of their last pass, curving into a corner of the minor set on
 * the side they are heading to while turning to face across.
 */
import type { Role, Vec2 } from '../../types.ts';
import type { Figure } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { add, forward, heading, length, smooth, sub, turn } from '../core/math.ts';
import {
  body,
  counterpart,
  groupCenter,
  minorSets,
  roleOf,
  withChanges,
  type DanceState,
} from '../core/state.ts';

export interface HeyParams {
  /**
   * Who makes the first pass: a role or a couple number (in the middle) or a
   * relationship (on the ends).
   */
  start: 'robins' | 'larks' | '1s' | '2s' | 'partner' | 'neighbor';
  /** 0.5 for a half hey, 1 for a full hey. */
  amount: number;
  /** Shoulder passed in the middle; the ends pass by the other shoulder. */
  center: 'right' | 'left';
  /**
   * Ricochets: when these dancers meet in the middle for the `time`-th time
   * (1 when not given), they do not pass; each turns back to the side it
   * came from (see NAMED below).
   */
  ricochet?: readonly { who: 'robins' | 'larks' | '1s' | '2s'; time?: number }[];
  /**
   * "Until partners meet the second time": the hey goes on, pass after
   * pass, until these dancers meet for the `time`-th time (1 when not
   * given), and ends there, the two facing each other where they meet,
   * everyone else on the hey where that leaves them. Replaces `amount`.
   */
  until?: { who: 'robins' | 'larks' | '1s' | '2s' | 'partner' | 'neighbor'; time?: number };
}

/**
 * Dancers a hey can name for the middle. Ricochet (ContraDB "larks start a
 * half hey - lefts in center, rights on ends - robins ricochet"): the two
 * dancers who would pass in the middle walk in as if to pass, then each
 * curls back away from the other, toward the side of the line its pass
 * shoulder put it on, and walks back out the way it came. Everyone else
 * dances the hey as usual, so the ricochet dancers meet the same end dancers
 * again, by the ends' shoulder, and end on their own side.
 */
const NAMED = ['robins', 'larks', '1s', '2s'] as const;

/** Distance between neighboring slots on the hey line. */
const SPACING = 0.9;
/**
 * Half the gap between two dancers passing shoulder to shoulder. The track
 * needs GATE < SPACING / pi (src/hey.ts).
 */
const GATE = 0.28;
/** Beats before the first gate, and after the last, in a hey of 8 beats or more. */
const FIRST_GATE = 2.5;
const LAST_EXIT = 1.75;
/** How far into its first pass (in passes) a dancer joins the track, at the earliest. */
const JOIN = 0.25;
/** The track must lead on from the dancer's place at least this much (a cosine) to join. */
const AHEAD = 0.3;
/** How much later than that (in passes) a dancer may join, looking for a track that leads on. */
const JOIN_SEARCH = 0.6;
/** An entry turning at most this fast (radians per beat) is gentle enough. */
const GENTLE_TURN = 3.2;
/** Samples used to keep a dancer's facing continuous on entry and exit. */
const YAW_SAMPLES = 64;
const SLOTS = [-1.5, -0.5, 0.5, 1.5];
/**
 * A ricochet loops back like an end dancer, centered this much short of its
 * middle slot, so the two ricochet dancers stay apart.
 */
const RICOCHET_SHORT = 0.15;

type Phase = 'center' | 'sides';

interface Track {
  readonly p: Vec2;
  readonly v: Vec2;
}

export const hey: Figure<HeyParams> = (state, params, beats) => {
  onlyKeys('hey', params, ['start', 'amount', 'center', 'ricochet', 'until']);
  const start = oneOf('hey', 'start', params.start, [...NAMED, 'partner', 'neighbor'] as const);
  const ricochets = (params.ricochet ?? []).map((r) => ({
    who: oneOf('hey', 'ricochet', r.who, NAMED),
    time: r.time ?? 1,
  }));
  for (const r of ricochets)
    if (!(Number.isInteger(r.time) && r.time >= 1))
      throw new Error('A ricochet happens on a whole-numbered meeting, 1 or more.');
  const center = oneOf('hey', 'center', params.center, ['right', 'left'] as const);
  const until = params.until && {
    who: oneOf('hey', 'until', params.until.who, [...NAMED, 'partner', 'neighbor'] as const),
    time: params.until.time ?? 1,
  };
  if (!until && params.amount !== 0.5 && params.amount !== 1)
    throw new Error('A hey goes half way (0.5) or all the way (1).');
  if (until && !(Number.isInteger(until.time) && until.time >= 1))
    throw new Error('A hey ends on a whole-numbered meeting, 1 or more.');
  if (beats < 4) throw new Error('A hey needs at least four beats.');
  const first: Phase = (NAMED as readonly string[]).includes(start) ? 'center' : 'sides';
  const phasesOf = (n: number): Phase[] =>
    Array.from({ length: n }, (_, i) =>
      (i % 2 === 0) === (first === 'center') ? 'center' : 'sides',
    );

  /**
   * Slot orders at the start of each pass, which middle passes ricochet, and
   * the pass where the `until` dancers meet the asked-for time.
   */
  const simulate = (group: readonly number[], order: number[], n: number) => {
    const orders: number[][] = [order];
    const ric: boolean[] = [];
    const meetings = new Map<string, number>();
    let met = 0;
    let meet: number | undefined;
    const pair = (a: number, b: number, w: string) =>
      w === 'partner' || w === 'neighbor'
        ? counterpart(state, a, w, group) === b
        : isNamed(state, a, w) && isNamed(state, b, w);
    phasesOf(n).forEach((phase, k) => {
      const o = [...orders[k]];
      ric.push(false);
      const meeting: [number, number][] =
        phase === 'center'
          ? [[o[1], o[2]]]
          : [
              [o[0], o[1]],
              [o[2], o[3]],
            ];
      if (until && meet === undefined && meeting.some(([a, b]) => pair(a, b, until.who))) {
        met++;
        if (met === until.time) meet = k;
      }
      if (phase === 'center') {
        for (const r of ricochets) {
          if (!pair(o[1], o[2], r.who)) continue;
          const c = (meetings.get(r.who) ?? 0) + 1;
          meetings.set(r.who, c);
          if (c === r.time) ric[k] = true;
        }
        if (!ric[k]) [o[1], o[2]] = [o[2], o[1]];
      } else [o[0], o[1], o[2], o[3]] = [o[1], o[0], o[3], o[2]];
      if (k < n - 1) orders.push(o);
    });
    return { orders, ric, meetings, meet };
  };

  let passes = params.amount === 1 ? 8 : 4;
  if (until) {
    // As many passes as come before the meeting.
    const group = minorSets(state)[0];
    if (!group) throw new Error('A hey needs a group of four.');
    const middle0 = groupCenter(state, group);
    const { meet } = simulate(group, entryOrder(state, group, middle0, first, start), 24);
    if (meet === undefined)
      throw new Error(`The ${until.who} do not meet ${until.time} times in this hey.`);
    if (meet < 2) throw new Error('A hey goes at least two passes before the meeting.');
    passes = meet;
  }
  const phases = phasesOf(passes);
  const sign = center === 'right' ? 1 : -1;
  // Even pass timing between an entry before the first gate and an exit
  // after the last. A hey that ends at a meeting walks on half a pass after
  // its last one, slowing to a stop as the two meet.
  const short = Math.min(1, beats / 8);
  const firstGate = FIRST_GATE * short;
  const unit = until
    ? (beats - firstGate) / passes
    : (beats - firstGate - LAST_EXIT * short) / (passes - 1);
  const gate = (k: number) => firstGate + k * unit;
  /** Track time at figure time t: a meeting hey slows to a stop over its last pass. */
  const warp = (t: number) => {
    if (!until || t <= beats - unit) return t;
    const s = (t - (beats - unit)) / unit;
    return beats - unit + unit * (s - (s * s) / 2);
  };

  /** Track position and velocity (per beat) of whoever is in `slot` during pass `index`. */
  const trackSlot = (index: number, slot: number, u: number, ric: readonly boolean[]): Track => {
    const phase = phases[index];
    const x0 = SLOTS[slot] * SPACING;
    const per = 1 / unit;
    const middle = slot === 1 || slot === 2;
    if (phase === 'center' && (!middle || ric[index])) {
      // Ends loop around outside the line while the middle two pass; in a
      // ricochet the middle two loop back too, a little short of the middle.
      const side = slot === 0 || slot === 2 ? -1 : 1;
      const a = Math.PI * u;
      const c = x0 - (middle ? side * RICOCHET_SHORT : 0);
      return {
        p: { x: c + side * GATE * Math.sin(a), z: side * GATE * sign * Math.cos(a) },
        v: {
          x: side * GATE * Math.PI * Math.cos(a) * per,
          z: -side * GATE * sign * Math.PI * Math.sin(a) * per,
        },
      };
    }
    const direction = phase === 'center' ? (slot === 1 ? 1 : -1) : slot % 2 === 0 ? 1 : -1;
    const outward = phase === 'sides' && middle;
    const target = phase === 'center' ? 3 - slot : slot + (slot % 2 === 0 ? 1 : -1);
    // A sides pass starts from a loop (an end, or a ricochet just before)
    // and may end in one (an end, or a ricochet next).
    const fromLoop = phase === 'sides' && (!outward || (index > 0 && ric[index - 1]));
    const intoLoop = phase === 'sides' && (outward || (index + 1 < passes && ric[index + 1]));
    const short = (s: number) => (s === 1 ? -RICOCHET_SHORT : s === 2 ? RICOCHET_SHORT : 0);
    const X = quintic(
      x0 + (fromLoop && outward ? short(slot) : 0),
      SLOTS[target] * SPACING + (intoLoop && !outward ? short(target) : 0),
      direction * (fromLoop ? GATE * Math.PI : SPACING),
      direction * (intoLoop ? GATE * Math.PI : SPACING),
      0,
      0,
      1,
      u,
    );
    let Z: { p: number; v: number };
    if (phase === 'center') {
      const theta = (Math.PI * (x0 + direction * SPACING * u)) / SPACING;
      Z = {
        p: -direction * GATE * sign * Math.cos(theta),
        v: GATE * sign * Math.PI * Math.sin(theta),
      };
    } else {
      const mid = direction * GATE * sign;
      const z0 = fromLoop ? mid : 0;
      const z1 = intoLoop ? mid : 0;
      const curl = -direction * GATE * sign * Math.PI * Math.PI;
      Z =
        u <= 0.5
          ? quintic(z0, mid, fromLoop ? 0 : -curl / Math.PI, 0, fromLoop ? curl : 0, 0, 0.5, u)
          : quintic(
              mid,
              z1,
              0,
              intoLoop ? 0 : curl / Math.PI,
              0,
              intoLoop ? curl : 0,
              0.5,
              u - 0.5,
            );
    }
    return { p: { x: X.p, z: Z.p }, v: { x: X.v * per, z: Z.v * per } };
  };

  const plans = minorSets(state).flatMap((group) => {
    const middle = groupCenter(state, group);
    const order = entryOrder(state, group, middle, first, start);
    const { orders, ric, meetings } = simulate(group, order, passes);
    for (const r of ricochets) {
      if ((meetings.get(r.who) ?? 0) < r.time)
        throw new Error(`The ${r.who} do not meet in the middle ${r.time} times in this hey.`);
    }
    const at = (id: number, t: number): Track => {
      const index = Math.max(0, Math.min(passes - 1, Math.floor((t - gate(0)) / unit + 0.5)));
      const slot = orders[index].indexOf(id);
      const track = trackSlot(index, slot, (t - gate(index)) / unit + 0.5, ric);
      return { p: add(middle, track.p), v: track.v };
    };
    if (until)
      return order.map((id) => planDancer(state, id, middle, at, beats, passedAt(id), undefined));
    const places = endPlaces(state, group, middle, (id) => {
      const leave = passedAt(id).at(-1)!;
      return { now: at(id, leave).p, next: at(id, leave + unit / 2).p };
    });
    return order.map((id) =>
      planDancer(state, id, middle, at, beats, passedAt(id), places.get(id)!),
    );

    /** Gate beats of the passes this dancer makes (end loops are not passes). */
    function passedAt(id: number): number[] {
      return phases
        .map((phase, k) => {
          const slot = orders[k].indexOf(id);
          return phase === 'sides' || slot === 1 || slot === 2 ? gate(k) : -1;
        })
        .filter((b) => b >= 0);
    }
  });

  const motion = (beat: number) => {
    const t = Math.max(0, Math.min(beats, beat));
    return { bodies: plans.map((p) => p(t)), contacts: [] };
  };
  return { kind: 'hey', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };

  function planDancer(
    s0: DanceState,
    id: number,
    middle: Vec2,
    at: (id: number, t: number) => Track,
    total: number,
    gates: number[],
    /** Where the dancer ends, or none: a meeting hey ends on the track. */
    place: Vec2 | undefined,
  ) {
    const s = body(s0, id);
    const leave = gates.at(-1)!;
    const preferred = gates[0] - (0.5 - JOIN) * unit;
    const entryAt = (join: number) => {
      // Set off late enough that the entry curve runs straight onto the track
      // instead of looping to match the track's speed: a dancer close to the
      // track waits in place a moment first.
      const target = at(id, join);
      const span = Math.min(
        join,
        Math.max(1, (2 * length(sub(target.p, s.position))) / length(target.v)),
      );
      const setOff = join - span;
      const curve = hermite(s.position, { x: 0, z: 0 }, target, span);
      const facingCurve = facing(s.yaw, curve, span);
      return {
        join,
        entry: (t: number) => curve(t - setOff),
        entryYaw: (t: number) => (t <= setOff ? s.yaw : facingCurve(t - setOff)),
      };
    };
    // Join where the track leads on from the dancer's place; failing that,
    // at the first beat where the entry turns gently enough (or, if none
    // does, where it turns least sharply).
    const ahead = joinBeat(s.position, (t) => at(id, t), preferred);
    // Join a quarter pass before the last pass at the latest (before the
    // only pass is half over, for a dancer who passes once).
    const latest =
      gates.length > 1 ? (place ? leave : total - unit) - 0.25 * unit : gates[0] + 0.25 * unit;
    const candidates = Array.from({ length: 21 }, (_, k) => preferred + k * 0.05 * unit)
      .filter((t, k) => k === 0 || t < latest)
      .map(entryAt);
    const { join, entry, entryYaw } =
      ahead !== undefined
        ? entryAt(ahead)
        : (candidates.find((e) => peakTurn(e) <= GENTLE_TURN) ??
          candidates.reduce((best, e) => (peakTurn(e) < peakTurn(best) ? e : best)));
    const joinYaw = entryYaw(join);
    const trackYaw = (t: number) => {
      const v = at(id, t).v;
      return Math.atan2(v.x, v.z);
    };
    // Facing stays continuous: the track heading on the branch the entry reached.
    const onTrackYaw = (t: number) => joinYaw + unwrap(trackYaw, join, t);
    if (!place)
      return (t: number) =>
        t <= join
          ? { id, position: entry(t).p, yaw: entryYaw(t) }
          : { id, position: at(id, warp(t)).p, yaw: onTrackYaw(warp(t)) };
    // Out of the last pass, turn straight to face across while curving into place.
    const out = at(id, leave);
    const across = heading(place, { x: middle.x, z: place.z });
    const exit = hermite(out.p, out.v, { p: place, v: { x: 0, z: 0 } }, total - leave);
    const leaveYaw = onTrackYaw(leave);
    const exitYaw = (t: number) =>
      leaveYaw + turn(across, leaveYaw) * smooth(t / Math.max(total - leave, 1e-9));
    return (t: number) => {
      if (t <= join) return { id, position: entry(t).p, yaw: entryYaw(t) };
      if (t < leave) return { id, position: at(id, t).p, yaw: onTrackYaw(t) };
      return { id, position: exit(t - leave).p, yaw: exitYaw(t - leave) };
    };
  }

  /**
   * When to meet the track: a quarter pass before the dancer's first pass,
   * or later in that pass if the track there still runs back toward the
   * dancer's place (joining there would mean walking out and turning back).
   */
  function joinBeat(from: Vec2, at: (t: number) => Track, preferred: number) {
    for (let t = preferred; t <= preferred + JOIN_SEARCH * unit; t += 0.05 * unit) {
      const { p, v } = at(t);
      const way = sub(p, from);
      if ((way.x * v.x + way.z * v.z) / (length(way) * length(v) + 1e-9) >= AHEAD) return t;
    }
    return undefined;
  }

  /** Fastest turn (radians per beat) along an entry, up to where it joins the track. */
  function peakTurn(e: { join: number; entryYaw: (t: number) => number }) {
    let peak = 0;
    for (let t = 0.05; t <= e.join; t += 0.05)
      peak = Math.max(peak, Math.abs(e.entryYaw(t) - e.entryYaw(t - 0.05)) / 0.05);
    return peak;
  }
};

/**
 * Slots along the line, from -x to +x: [end, middle, middle, end]. The
 * dancers who pass first in the middle (or the middle two of a hey that
 * starts on the ends) take the middle slots, the one on the -x side first.
 */
function entryOrder(
  state: DanceState,
  group: readonly number[],
  middle: Vec2,
  first: Phase,
  start: HeyParams['start'],
): number[] {
  const side = (id: number) => body(state, id).position.x - middle.x;
  const ofRole = (role: Role) => group.filter((id) => roleOf(state, id) === role);
  let mids: number[];
  if (first === 'center') {
    mids = group.filter((id) => isNamed(state, id, start));
    if (mids.length !== 2) throw new Error(`A hey needs two ${start} in the middle.`);
  } else {
    // The middle two walk out to meet the ends: the role nearer the middle
    // of the set, or (all in places) the role facing more toward the sides.
    const off = (r: Role) => ofRole(r).reduce((n, id) => n + Math.abs(side(id)), 0);
    const out = (r: Role) =>
      ofRole(r).reduce((n, id) => n + forward(body(state, id).yaw).x * Math.sign(side(id)), 0);
    const nearer = off('robin') - off('lark');
    const looking = out('lark') - out('robin');
    const lean = Math.abs(nearer) > 0.1 ? nearer : Math.abs(looking) > 0.1 ? looking : 0;
    const role: Role = lean >= 0 ? 'lark' : 'robin';
    mids = ofRole(role);
    if (mids.length !== 2) throw new Error(`A hey needs two ${role}s in the middle.`);
  }
  if (Math.sign(side(mids[0])) === Math.sign(side(mids[1])))
    throw new Error('The dancers in the middle of a hey must start on opposite sides of the set.');
  const [westMid, eastMid] = side(mids[0]) < side(mids[1]) ? mids : [mids[1], mids[0]];
  const ends = group.filter((id) => !mids.includes(id));
  let westEnd: number | undefined;
  let eastEnd: number | undefined;
  if (first === 'sides') {
    westEnd = counterpart(state, westMid, start, group);
    eastEnd = counterpart(state, eastMid, start, group);
  } else if (Math.sign(side(ends[0])) !== Math.sign(side(ends[1]))) {
    [westEnd, eastEnd] = side(ends[0]) < side(ends[1]) ? ends : [ends[1], ends[0]];
  }
  if (
    westEnd === undefined ||
    eastEnd === undefined ||
    westEnd === eastEnd ||
    !ends.includes(westEnd) ||
    !ends.includes(eastEnd)
  )
    throw new Error('A hey needs one dancer at each end of the line, one on each side.');
  return [westEnd, westMid, eastMid, eastEnd];
}

/** Whether `who` (a role group or a position label such as "1s") names dancer `id`. */
function isNamed(state: DanceState, id: number, who: string): boolean {
  if (who === 'larks' || who === 'robins')
    return roleOf(state, id) === (who === 'larks' ? 'lark' : 'robin');
  return state.positions.get(who)?.includes(id) ?? false;
}

/**
 * Where each dancer ends: a corner of the minor set's square of places, on
 * the side of the set the dancer is heading to at the last pass, two to a
 * side. Of the two on a side, the one heading for the lower z (or passing on
 * that side of the line, when they head the same way) takes the lower corner.
 */
function endPlaces(
  state: DanceState,
  group: readonly number[],
  middle: Vec2,
  leaving: (id: number) => { now: Vec2; next: Vec2 },
): Map<number, Vec2> {
  const half = {
    x: group.reduce((n, id) => n + Math.abs(body(state, id).position.x - middle.x), 0) / 4,
    z: group.reduce((n, id) => n + Math.abs(body(state, id).position.z - middle.z), 0) / 4,
  };
  const places = new Map<number, Vec2>();
  for (const side of [-1, 1]) {
    const here = group.filter((id) => Math.sign(leaving(id).next.x - middle.x) === side);
    if (here.length !== 2) throw new Error('A hey must end with two dancers on each side.');
    const score = (id: number) => {
      const { now, next } = leaving(id);
      return next.z - middle.z + 0.25 * (now.z - middle.z);
    };
    const [low, high] = score(here[0]) < score(here[1]) ? here : [here[1], here[0]];
    places.set(low, { x: middle.x + side * half.x, z: middle.z - half.z });
    places.set(high, { x: middle.x + side * half.x, z: middle.z + half.z });
  }
  return places;
}

/**
 * Cubic Hermite from (p0, v0) to (p1, v1) over `beats` (src/hey.ts
 * solveExplicitHeyExit): position and velocity at a local beat.
 */
function hermite(p0: Vec2, v0: Vec2, to: Track, beats: number) {
  const { p: p1, v: v1 } = to;
  return (time: number): Track => {
    if (beats <= 1e-9) return to;
    const u = Math.max(0, Math.min(1, time / beats));
    const u2 = u * u;
    const u3 = u2 * u;
    const axis = (k: 'x' | 'z') => ({
      p:
        (2 * u3 - 3 * u2 + 1) * p0[k] +
        (u3 - 2 * u2 + u) * beats * v0[k] +
        (-2 * u3 + 3 * u2) * p1[k] +
        (u3 - u2) * beats * v1[k],
      v:
        ((6 * u2 - 6 * u) * p0[k] +
          (3 * u2 - 4 * u + 1) * beats * v0[k] +
          (-6 * u2 + 6 * u) * p1[k] +
          (3 * u2 - 2 * u) * beats * v1[k]) /
        beats,
    });
    const x = axis('x');
    const z = axis('z');
    return { p: { x: x.p, z: z.p }, v: { x: x.v, z: z.v } };
  };
}

/**
 * Facing along an entry curve, kept continuous: from the start facing, turn
 * to the direction of travel by the time the curve meets the track. Headings
 * are sampled and unwrapped, so a facing never jumps a whole turn.
 */
function facing(from: number, curve: (t: number) => Track, beats: number) {
  const travel = (t: number, fallback: number) => {
    const { p, v } = curve(t);
    if (length(v) > 0.05) return Math.atan2(v.x, v.z);
    // Nearly still: look along the curve instead.
    const ahead = sub(curve(Math.min(beats, t + 0.25 * beats)).p, p);
    return length(ahead) > 1e-6 ? Math.atan2(ahead.x, ahead.z) : fallback;
  };
  const samples: number[] = [];
  let last = from;
  for (let i = 0; i <= YAW_SAMPLES; i++) {
    last += turn(travel((beats * i) / YAW_SAMPLES, last), last);
    samples.push(last);
  }
  const along = (t: number) => {
    const at = Math.max(0, Math.min(YAW_SAMPLES, (t / Math.max(beats, 1e-9)) * YAW_SAMPLES));
    const i = Math.min(YAW_SAMPLES - 1, Math.floor(at));
    return samples[i] + (samples[i + 1] - samples[i]) * (at - i);
  };
  return (t: number) => from + (along(t) - from) * smooth(t / Math.max(beats * 0.6, 1e-9));
}

/** Change of a heading function from beat a to beat b, unwrapped. */
function unwrap(h: (t: number) => number, a: number, b: number): number {
  const steps = Math.max(1, Math.ceil((b - a) / 0.05));
  let total = 0;
  let prev = h(a);
  for (let i = 1; i <= steps; i++) {
    const next = h(a + ((b - a) * i) / steps);
    total += turn(next, prev);
    prev = next;
  }
  return total;
}

/** C2 quintic from (p0, v0, a0) to (p1, v1, a1) over `duration`: position and velocity. */
function quintic(
  p0: number,
  p1: number,
  v0: number,
  v1: number,
  a0: number,
  a1: number,
  duration: number,
  time: number,
) {
  const u = Math.max(0, Math.min(1, time / duration));
  const d = p1 - p0;
  const V0 = v0 * duration;
  const V1 = v1 * duration;
  const A0 = a0 * duration * duration;
  const A1 = a1 * duration * duration;
  const c = [
    p0,
    V0,
    A0 / 2,
    10 * d - 6 * V0 - 4 * V1 - 1.5 * A0 + 0.5 * A1,
    -15 * d + 8 * V0 + 7 * V1 + 1.5 * A0 - A1,
    6 * d - 3 * V0 - 3 * V1 - 0.5 * A0 + 0.5 * A1,
  ];
  const p = c.reduce((s, k, i) => s + k * u ** i, 0);
  const v = c.reduce((s, k, i) => s + (i ? (i * k * u ** (i - 1)) / duration : 0), 0);
  return { p, v };
}
