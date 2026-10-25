/**
 * The fold: run a list of FigureCalls over a starting state, round after
 * round, and expose the result through the existing CompiledDance contract
 * (src/types.ts) so the scene, fallback renderer and audio work unchanged.
 *
 * Round N+1 starts from round N's end state. Relationships change only
 * through the dance's Progression, at the reached end of the figure the source
 * marks as the progression (or at the end of the round when none is marked;
 * when the couples have not passed yet at the marked figure, at the end of
 * the first later figure where they have, up to the next mark).
 * Couples waiting out at an end cross to the other side (a half turn about the
 * set's center line) right after they start waiting, or at the start of the
 * next round when the progression comes too late in this one. Round length and how
 * many times through come from the MusicStructure.
 */
import type { CompiledDance, Dance, Figure as LegacyFigure, Frame, Pose } from '../../types.ts';
import { complete, contactReach, joined, reachFade, sameHold } from './contacts.ts';
import type {
  Figure,
  FigureCall,
  FigureContact,
  FigureResult,
  MovedBody,
  Styling,
} from './figure.ts';
import { clamp, distance, progress, rotate, smooth, sub, add, turn } from './math.ts';
import { beatsPerTime, type MusicStructure } from './music.ts';
import { NoOneMeets, rebindMeeting, type Progression } from './progression.ts';
import { body, type Body, type DanceState, withChanges } from './state.ts';
import { hold } from '../figures/hold.ts';
import { ghostCopies, ghostTurn, withGhosts } from './ghosts.ts';
import { REGROUPING } from './relations.ts';

export type FigureRegistry = Readonly<Record<string, Figure<any>>>;

/** Beats a waiting couple takes to cross the set. */
export const CROSS_BEATS = 8;
const RELEASE_BEATS = 0.25;
const SEAM = 1e-6;

interface Crossing {
  readonly ids: readonly number[];
  readonly start: number;
  readonly from: ReadonlyMap<number, Body>;
  readonly pivot: { x: number; z: number };
}

interface Segment {
  readonly start: number;
  readonly call: FigureCall;
  readonly entry: DanceState;
  readonly result: FigureResult;
  readonly moved: ReadonlySet<number>;
}

export interface Round {
  readonly segments: readonly Segment[];
  readonly crossings: readonly Crossing[];
  readonly end: DanceState;
  /** Figures held still because they could not start (lenient folds only). */
  readonly held: readonly HeldFigure[];
}

/** A call the lenient fold held still instead of dancing, and why. */
export interface HeldFigure {
  readonly index: number;
  readonly why: string;
  /** The figure ran, but the progression after it could not rebind. */
  readonly progression?: boolean;
}

export function foldRound(
  calls: readonly FigureCall[],
  start: DanceState,
  registry: FigureRegistry,
  progression?: Progression,
  lenient = false,
): Round {
  const marked = calls.some((c) => c.progression);
  if (marked && !progression)
    throw new Error('A row is marked as the progression, but the dance has none.');
  const segments: Segment[] = [];
  const crossings: Crossing[] = [];
  const held: HeldFigure[] = [];
  const total = calls.reduce((n, c) => n + c.beats, 0);
  // Becket: couples out at the ends dance with ghosts (ghosts.ts).
  const ghostPivot = progression?.crossAtGhostSet ?? false;
  let state = scheduleCrossings(start, 0, total, crossings, ghostPivot);
  let beat = 0;
  // A marked progression that could not rebind yet (see below).
  let late: { index: number; error: unknown } | undefined;
  for (const [index, call] of calls.entries()) {
    if (!(call.beats > 0 && call.beats <= 64)) throw new Error(`${call.move} needs 1-64 beats.`);
    let result: FigureResult;
    let moved: Set<number>;
    state = settleCrossings(state, beat, crossings);
    try {
      ({ result, moved } = runFigure(registry, state, call, index, beat, crossings, ghostPivot));
    } catch (error) {
      if (!lenient) throw error;
      // Hold everyone still for this row so the rest keeps its place in time.
      held.push({ index, why: error instanceof Error ? error.message : String(error) });
      result = hold(state, { reason: 'cannot-start' }, call.beats);
      moved = new Set();
    }
    segments.push({ start: beat, call, entry: state, result, moved });
    beat += call.beats;
    const last = index === calls.length - 1;
    let exit = result.exit;
    const due = progression?.atRoundEnd ? last : call.progression || (!marked && last);
    // A failed mark on the first row means the round starts progressed: the
    // couples meet new neighbors at the end of the round.
    const retry = late && (late.index > 0 || last);
    if (progression && (due || retry)) {
      try {
        exit = rebindMeeting(progression, exit);
        late = undefined;
      } catch (error) {
        // A row marked as the progression sometimes comes before the couples
        // have passed (the mark on the figure that starts it): new neighbors
        // are found at the end of a later figure, up to the next mark or the
        // end of the round.
        const more = !last && !calls[index + 1]?.progression;
        if (error instanceof NoOneMeets && !late) {
          // Nobody meets anyone: everyone waits out (as the rebind says).
          exit = error.state;
        } else if (due && !late && more) late = { index, error };
        else if (late && !due && more) {
          // Still not passed: try again after the next figure.
        } else {
          const failed = late ?? { index, error };
          late = undefined;
          if (!lenient) throw failed.error;
          const e = failed.error;
          const why = e instanceof Error ? e.message : String(e);
          held.push({
            index: failed.index,
            why: `The progression does not work out: ${why}`,
            progression: true,
          });
        }
      }
    }
    state = scheduleCrossings(exit, beat, total, crossings, ghostPivot);
  }
  return { segments, crossings, end: state, held };
}

/** Run one call from `state`, checking it meets the dancers where they are. */
function runFigure(
  registry: FigureRegistry,
  state: DanceState,
  call: FigureCall,
  index: number,
  beat: number,
  crossings: readonly Crossing[],
  ghosts = false,
) {
  const figure = registry[call.move];
  if (!figure) throw new Error(`No figure named "${call.move}".`);
  let result: FigureResult;
  try {
    result = figure(state, call.params, call.beats);
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    throw new Error(`Figure ${index + 1} (${call.text ?? call.move}): ${why}`);
  }
  // Couples out at the ends dance with ghosts (ghosts.ts), unless crossing over.
  const crossingNow = new Set(
    crossings
      .filter((c) => c.start + CROSS_BEATS > beat && c.start < beat + call.beats)
      .map((c) => c.ids[0] / 2),
  );
  // Figures danced with someone outside the minor set (shadows, a diagonal)
  // take the couples at the ends in directly instead (relations.ts).
  const across = REGROUPING.has(String(call.params.who)) || call.params.diagonal !== undefined;
  if (ghosts && !across)
    result = withGhosts(state, result, ghostCopies(state, crossingNow), call.beats);
  const moved = new Set(result.motion(0).bodies.map((b) => b.id));
  assertSeam(state, result, call);
  for (const c of crossings) {
    const busy = c.start + CROSS_BEATS > beat && c.ids.some((id) => moved.has(id));
    if (busy) throw new Error(`${call.move} starts before a waiting couple finishes crossing.`);
  }
  return { result, moved };
}

function assertSeam(state: DanceState, result: FigureResult, call: FigureCall) {
  const check = (bodies: readonly MovedBody[], against: DanceState, where: string) => {
    for (const b of bodies) {
      const e = body(against, b.id);
      const off = distance(b.position, e.position);
      const twist = Math.abs(turn(b.yaw, e.yaw));
      if (off > SEAM || twist > SEAM) {
        throw new Error(
          `${call.move} ${where} does not meet dancer ${b.id} (${off.toFixed(3)} m).`,
        );
      }
    }
  };
  check(result.motion(0).bodies, state, 'start');
  check(result.motion(call.beats).bodies, result.exit, 'end');
}

/** Couples that just started waiting cross now; state records where they end. */
function scheduleCrossings(
  state: DanceState,
  beat: number,
  total: number,
  crossings: Crossing[],
  ghostPivot = false,
): DanceState {
  let pending = state.waiting.filter((w) => !w.crossed);
  if (!pending.length) return state;
  // Becket: a couple that repeats a couple of the nearest minor set changes
  // ends with the ghosts while it dances the next figure (ghosts.ts).
  const turns = new Map(
    ghostPivot
      ? pending.flatMap((w) => {
          const t = ghostTurn(state, w.couple);
          return t ? [[w.couple, t] as const] : [];
        })
      : [],
  );
  if (turns.size) {
    state = withChanges(state, {
      waiting: state.waiting.map((w) =>
        turns.has(w.couple)
          ? { couple: w.couple, crossed: true, ghostTurn: turns.get(w.couple) }
          : w,
      ),
    });
    pending = pending.filter((w) => !turns.has(w.couple));
    if (!pending.length) return state;
  }
  // Too late in the round: the couple crosses at the start of the next one.
  if (beat + CROSS_BEATS > total) return state;
  const bodies = new Map(state.bodies);
  for (const w of pending) {
    const ids = [w.couple * 2, w.couple * 2 + 1];
    const from = new Map(ids.map((id) => [id, body(state, id)]));
    const center = {
      x: (from.get(ids[0])!.position.x + from.get(ids[1])!.position.x) / 2,
      z: (from.get(ids[0])!.position.z + from.get(ids[1])!.position.z) / 2,
    };
    // Lines of four (layout.columns) turn each couple about its own middle.
    const pivot = { x: state.layout?.columns ? center.x : 0, z: center.z };
    const crossing = { ids, start: beat, from, pivot };
    crossings.push(crossing);
    for (const id of ids) bodies.set(id, crossingBody(crossing, id, 1));
  }
  const crossed = new Set(pending.map((w) => w.couple));
  const waiting = state.waiting.map((w) =>
    crossed.has(w.couple) ? { ...w, crossed: true, crossing: true } : w,
  );
  return withChanges(state, { bodies, waiting });
}

/** Clear the crossing mark of couples whose crossing has finished by `beat`. */
function settleCrossings(state: DanceState, beat: number, crossings: readonly Crossing[]) {
  if (!state.waiting.some((w) => w.crossing)) return state;
  const waiting = state.waiting.map((w) => {
    if (!w.crossing) return w;
    const c = crossings.find((x) => x.ids[0] === w.couple * 2);
    return c && c.start + CROSS_BEATS > beat ? w : { ...w, crossing: false };
  });
  return withChanges(state, { waiting });
}

function crossingBody(c: Crossing, id: number, t: number): Body {
  const from = c.from.get(id)!;
  const a = Math.PI * progress(t);
  // Partners trade sides passing close by each other, not around a wide
  // circle: the half turn is squashed along the set, so a couple waiting
  // next to another crosses without meeting it.
  const swung = rotate(sub(from.position, c.pivot), a);
  const along = from.position.z - c.pivot.z;
  const position = add(c.pivot, {
    x: swung.x,
    z: along * Math.cos(a) + (swung.z - along * Math.cos(a)) * CROSS_SQUASH,
  });
  return { position, yaw: from.yaw - a };
}

/** How wide the crossing swings along the set, as a share of a circle. */
const CROSS_SQUASH = 0.4;

export interface FoldOptions {
  readonly dance: Dance;
  readonly calls: readonly FigureCall[];
  readonly start: DanceState;
  readonly registry: FigureRegistry;
  readonly progression: Progression;
  readonly music: MusicStructure;
  readonly warnings?: readonly string[];
  /**
   * Hold a figure still when it cannot start, and skip a progression that
   * cannot rebind, instead of failing the whole dance. For showing partial
   * dances; the corpus check always folds strictly.
   */
  readonly lenient?: boolean;
}

export interface FoldedDance extends CompiledDance {
  readonly engine: 'next';
  /** Meter and phrase layout, for audio and labels. */
  readonly music: MusicStructure;
  /** Frame before the rendering reach fade, for the physical check. */
  rawSample(beat: number): Frame;
  round(repeat: number): Round;
  /** Styling a figure declared (Rory twirl, a flourish), for the physical check. */
  figureStyling(repeat: number, figureIndex: number): Styling | undefined;
  /** Raw z repeats every `period` meters (a set with no ends, drawn bent). */
  readonly period?: number;
}

export function compileFold(options: FoldOptions): FoldedDance {
  const { calls, registry, progression, music } = options;
  const lenient = options.lenient ?? false;
  const starts: number[] = [];
  let totalBeats = 0;
  for (const c of calls) {
    starts.push(totalBeats);
    totalBeats += c.beats;
  }
  // Thirds of a beat in the source add up with rounding error.
  if (Math.abs(totalBeats - beatsPerTime(music)) < 1e-6) totalBeats = beatsPerTime(music);
  if (totalBeats !== beatsPerTime(music)) {
    throw new Error(
      `The figures take ${totalBeats} beats but the music has ${beatsPerTime(music)}.`,
    );
  }
  const rounds: Round[] = [foldRound(calls, options.start, registry, progression, lenient)];
  const warnings = [...(options.warnings ?? [])];
  const times = music.times === 'repeat' ? Infinity : music.times;
  let repeatable = times > 1;
  if (repeatable) {
    try {
      rounds.push(foldRound(calls, rounds[0].end, registry, progression, lenient));
    } catch (error) {
      repeatable = false;
      const why = error instanceof Error ? error.message : String(error);
      warnings.push(`Playback is limited to one round: the next round cannot start (${why}).`);
    }
  }
  const round = (repeat: number) => {
    while (rounds.length <= repeat) {
      rounds.push(foldRound(calls, rounds.at(-1)!.end, registry, progression, lenient));
    }
    return rounds[repeat];
  };
  const lastBeat = repeatable ? times * totalBeats : totalBeats;
  const dancers = [...options.start.dancers];
  const dance: Dance = { ...options.dance, figures: legacyFigures(calls, rounds[0]) };

  const bodiesAt = (r: Round, segment: Segment, local: number) => {
    const bodies = new Map(segment.entry.bodies);
    for (const c of r.crossings) {
      if (local >= c.start) {
        for (const id of c.ids)
          bodies.set(id, crossingBody(c, id, (local - c.start) / CROSS_BEATS));
      }
    }
    const frame = segment.result.motion(local - segment.start);
    for (const b of frame.bodies) bodies.set(b.id, b);
    return { bodies, frame };
  };

  const rawSample = (input: number): Frame => {
    let beat = Math.max(0, Number.isFinite(input) ? input : 0);
    if (Number.isFinite(lastBeat)) beat = Math.min(beat, lastBeat - 1e-6);
    const repeat = Math.floor(beat / totalBeats);
    const local = beat - repeat * totalBeats;
    const r = round(repeat);
    const index = Math.max(
      0,
      starts.findLastIndex((s) => s <= local),
    );
    const segment = r.segments[index];
    const { bodies, frame } = bodiesAt(r, segment, local);
    const later = bodiesAt(r, segment, Math.min(local + 0.02, segment.start + segment.call.beats));
    const dt = Math.max(1e-6, Math.min(0.02, segment.start + segment.call.beats - local));
    const leans = new Map(frame.bodies.map((b) => [b.id, b.lean]));
    const crossingIds = new Set(r.crossings.flatMap((c) => c.ids));
    const poses: Pose[] = dancers.map((d) => {
      const b = bodies.get(d.id)!;
      const speed = distance(b.position, later.bodies.get(d.id)!.position) / dt;
      const stride = local + 0.02 > segment.start + segment.call.beats ? 0 : clamp(speed / 0.5);
      const waiting = crossingIds.has(d.id) && !segment.moved.has(d.id);
      return {
        id: d.id,
        position: { x: b.position.x, z: b.position.z },
        yaw: b.yaw,
        stride,
        lean: leans.get(d.id) ?? 0.03 * stride,
        bounce: 0,
        turn: 0,
        activity: waiting ? 'waiting' : segment.result.kind,
      };
    });
    const contacts = [
      ...frame.contacts.map((c) => complete(c, bodies)),
      ...released(segment, frame.contacts, local - segment.start).map((c) => complete(c, bodies)),
    ].filter((c) => c.strength > 0.01);
    return {
      beat,
      localBeat: local,
      figureIndex: index,
      figureProgress: clamp((local - segment.start) / segment.call.beats),
      repeat,
      poses,
      contacts,
      warnings,
    };
  };

  const sample = (beat: number): Frame => {
    const raw = rawSample(beat);
    const bodies = new Map(raw.poses.map((p) => [p.id, p]));
    const contacts = raw.contacts
      .map((c) => ({ ...c, strength: c.strength * reachFade(contactReach(c, bodies)) }))
      .filter((c) => c.strength > 0.01);
    return { ...raw, contacts };
  };

  return {
    engine: 'next',
    music,
    dance,
    dancers,
    totalBeats,
    repeatable,
    starts,
    warnings,
    sample,
    rawSample,
    round,
    figureStyling: (repeat, figureIndex) => round(repeat).segments[figureIndex]?.result.styled,
  };
}

/** Hands held at a figure's start that the figure does not keep fade out. */
function released(
  segment: Segment,
  kept: readonly FigureContact[],
  local: number,
): FigureContact[] {
  if (local >= RELEASE_BEATS) return [];
  const strength = 1 - smooth(local / RELEASE_BEATS);
  const atStart = segment.result.motion(0).contacts.filter((c) => c.strength > 0.5);
  return segment.entry.hands
    .filter((h) => !atStart.some((c) => sameHold(h, c)) && !kept.some((c) => sameHold(h, c)))
    .map((h) => joined(h, strength));
}

/** Minimal legacy figure records so the UI timeline and scene can label frames. */
function legacyFigures(calls: readonly FigureCall[], first: Round): LegacyFigure[] {
  return calls.map((call, i) => {
    const p = call.params as Record<string, unknown>;
    const who = typeof p.who === 'string' ? p.who : undefined;
    return {
      id: `next:${i}`,
      kind: first.segments[i].result.kind,
      beats: call.beats,
      label: call.text ?? call.move,
      ...(who === 'partner' || who === 'neighbor' || who === 'larks' || who === 'robins'
        ? { who }
        : {}),
      ...(call.progression ? { progression: true } : {}),
    };
  });
}
