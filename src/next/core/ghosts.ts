/**
 * Couples out at the ends dance with ghosts.
 *
 * A longways set of minor sets repeats along the set: every minor set stands
 * the same way, one period (two places) from the next. A couple waiting out
 * at an end is half of a minor set past the end whose other couple is
 * missing (a "ghost" couple). It keeps its place in the set by doing what
 * the matching couple of the nearest minor set does: when the active couples
 * cross the set (a right and left through, a promenade across, a circle left
 * three places), the couple at the end crosses with them, so it stands where
 * its new neighbors expect it when it comes back in.
 *
 * A waiting dancer copies the dancer of the same role standing at the same
 * place of the nearest minor set, facing roughly as it does (it turns to face
 * just as its template does over the first beats), shifted along the set
 * by whole periods. Both dancers of the couple must match; a couple that
 * matches nobody (it has just crossed over, or stands apart) stands still.
 * Hands joined between the two copied dancers are copied too; hands joined
 * with a ghost are not.
 *
 * Changing ends (progression.ts `crossAtGhostSet`): a couple that has just
 * come out at an end walks half way round the middle of its ghost set, over
 * the next figures (at least TURN_BEATS), to the place where the ghost
 * set's other couple is when it finishes. A minor set looks the same after a half turn
 * about its middle (each couple stands where the other would), so the couple
 * then repeats the other couple of the nearest set: in Becket, the couple
 * that comes out at the bottom on the east side goes back up on the west.
 *
 * The fold applies this around each figure (fold.ts); figures never see it.
 */
import type { Vec2 } from '../../types.ts';
import type { FigureContact, FigureFrame, FigureResult, MovedBody } from './figure.ts';
import { LIMITS, SET } from './config.ts';
import { bodyMap, withinReach } from './contacts.ts';
import { progress, rotate, smooth, turn } from './math.ts';
import { gatherOf } from './wave-gather.ts';
import {
  body,
  type Body,
  type DanceState,
  type GhostTurn,
  type Hold,
  withChanges,
} from './state.ts';

/** Fewest beats a couple takes to change ends. */
export const TURN_BEATS = 8;

const PLACE = 0.05;
/**
 * A comfortable pace for a waiting couple copying its template (m and
 * radians a beat): faster than this, it does something simpler instead.
 * Not the physical sanity bounds (config.ts LIMITS).
 */
const COMFORT_SPEED = 2.4;
const COMFORT_TURN = 4;

/** Beats a copy takes to turn to face as its template does. */
const FACE_BEATS = 2;
/** A waiting dancer facing within this of its template (radians) still repeats it. */
const FACING = 2;

export interface GhostCopy {
  /** Waiting dancer. */
  readonly id: number;
  /** Active dancer it copies. */
  readonly template: number;
  /** Shift along the set (z) from the template to the copy. */
  readonly shift: number;
  /** Changing ends: turning round the ghost set's middle, not dancing. */
  readonly turn?: GhostTurn;
}

interface SetShape {
  readonly centers: readonly { group: readonly number[]; z: number }[];
  readonly period: number;
}

/** Minor sets of four down the middle of one set, one period apart; else undefined. */
function setShape(state: DanceState): SetShape | undefined {
  if (state.layout) return undefined;
  const groups = state.groups.filter((g) => g.length === 4);
  if (!groups.length || groups.length !== state.groups.length) return undefined;
  const centers = groups.map((g) => {
    // From the places, not where a closed-up long wave stands (wave-gather.ts).
    const ps = g.map((id) => {
      const p = body(state, id).position;
      return { x: p.x, z: p.z - gatherOf(state, id) };
    });
    return {
      group: g,
      x: ps.reduce((n, p) => n + p.x, 0) / 4,
      z: ps.reduce((n, p) => n + p.z, 0) / 4,
    };
  });
  if (centers.some((c) => Math.abs(c.x) > PLACE)) return undefined;
  const zs = centers.map((c) => c.z).sort((a, b) => a - b);
  let period = 2 * SET.slot;
  if (zs.length > 1) {
    period = Math.min(...zs.slice(1).map((z, i) => z - zs[i]));
    if (Math.abs(period - 2 * SET.slot) > PLACE) return undefined;
  }
  return { centers, period };
}

/** How a waiting couple repeats a couple of the nearest minor set, if it does. */
function matchCouple(state: DanceState, shape: SetShape, couple: number) {
  const found: GhostCopy[] = [];
  let center = 0;
  for (const id of [couple * 2, couple * 2 + 1]) {
    const me = body(state, id);
    // The nearest minor set, and the ghost set it repeats as.
    const near = shape.centers.reduce((a, b) =>
      Math.abs(b.z - me.position.z) < Math.abs(a.z - me.position.z) ? b : a,
    );
    const shift = Math.round((me.position.z - near.z) / shape.period) * shape.period;
    if (shift === 0) return undefined;
    const template = near.group.find((t) => {
      if (state.dancers[t].role !== state.dancers[id].role) return false;
      const them = body(state, t);
      return (
        Math.abs(them.position.x - me.position.x) < PLACE &&
        Math.abs(them.position.z + shift - me.position.z) < PLACE &&
        Math.abs(turn(them.yaw, me.yaw)) < FACING
      );
    });
    if (template === undefined) return undefined;
    found.push({ id, template, shift });
    center = near.z + shift;
  }
  if (found[0].template === found[1].template || found[0].shift !== found[1].shift)
    return undefined;
  return { copies: found, center };
}

/**
 * Which waiting dancers copy whom during a figure that starts from `state`.
 * `skip` names couples that may not move now (crossing over the old way).
 */
export function ghostCopies(state: DanceState, skip: ReadonlySet<number>): GhostCopy[] {
  if (!state.waiting.length) return [];
  const shape = setShape(state);
  if (!shape) return [];
  return state.waiting
    .filter((w) => !w.crossing && !skip.has(w.couple))
    .flatMap((w): GhostCopy[] => {
      const turn = w.ghostTurn;
      if (turn)
        return [0, 1].map((k) => ({
          id: w.couple * 2 + k,
          template: turn.templates[k],
          shift: turn.shift,
          turn,
        }));
      return matchCouple(state, shape, w.couple)?.copies ?? [];
    });
}

/**
 * How a waiting couple that repeats a couple of the nearest minor set
 * starts changing ends: a half turn about the middle of its ghost set.
 */
export function ghostTurn(state: DanceState, couple: number): GhostTurn | undefined {
  const shape = setShape(state);
  const match = shape && matchCouple(state, shape, couple);
  if (!match) return undefined;
  return {
    pivot: { x: 0, z: match.center },
    angle: 0,
    left: TURN_BEATS,
    templates: [match.copies[0].template, match.copies[1].template],
    shift: match.copies[0].shift,
  };
}

/** The figure's result with the waiting dancers in `copies` dancing along. */
export function withGhosts(
  state: DanceState,
  result: FigureResult,
  copies: readonly GhostCopy[],
  beats: number,
): FigureResult {
  const moved = new Set(result.motion(0).bodies.map((b) => b.id));
  const dancing = copies.filter((c) => !moved.has(c.id) && (moved.has(c.template) || c.turn));
  // A couple that would have to turn too fast to face as its templates do
  // (they spin through a short figure) stands this figure out.
  const tooFast = new Set(
    dancing.filter((c) => !c.turn && facingTooFast(state, result, c, beats)).map((c) => c.id >> 1),
  );
  const active = dancing.filter((c) => !tooFast.has(c.id >> 1));
  if (!active.length) return result;
  const byTemplate = new Map(active.map((c) => [c.template, c]));
  const start = new Map(active.map((c) => [c.id, body(state, c.id)]));
  const templateStart = new Map(active.map((c) => [c.template, body(state, c.template)]));
  const shifted = (c: GhostCopy, b: { position: Vec2; yaw: number }, beat: number) => {
    // Exactly where the copy stands at the start, whatever rounding there was.
    const s = start.get(c.id)!;
    const t = templateStart.get(c.template)!;
    return {
      position: {
        x: b.position.x + s.position.x - t.position.x,
        z: b.position.z + s.position.z - t.position.z,
      },
      yaw: b.yaw + turn(s.yaw, t.yaw) * (1 - smooth(beat / Math.min(FACE_BEATS, beats))),
    };
  };
  const templateAt = (c: GhostCopy, beat: number) => {
    const b = result.motion(beat).bodies.find((x) => x.id === c.template);
    return b ?? { id: c.template, ...templateStart.get(c.template)! };
  };
  // Changing ends: the couple keeps repeating its template, turned about the
  // ghost set's middle by an angle that grows to a half turn (either way
  // round; whichever keeps the couple slowest). A figure too short to finish
  // the turn in comfort leaves the rest for the next one.
  const turned = (c: GhostCopy, a1: number, beat: number): MovedBody => {
    const { pivot, angle: a0 } = c.turn!;
    const s = start.get(c.id)!;
    const t0 = templateStart.get(c.template)!;
    const t = templateAt(c, beat);
    const at0 = rotate({ x: t0.position.x - pivot.x, z: t0.position.z + c.shift - pivot.z }, a0);
    const a = a0 + (a1 - a0) * progress(beat / beats);
    const r = rotate({ x: t.position.x - pivot.x, z: t.position.z + c.shift - pivot.z }, a);
    const fix = (1 - smooth(beat / Math.min(FACE_BEATS, beats))) * turn(s.yaw, t0.yaw - a0);
    return {
      id: c.id,
      position: {
        x: pivot.x + r.x + s.position.x - pivot.x - at0.x,
        z: pivot.z + r.z + s.position.z - pivot.z - at0.z,
      },
      yaw: t.yaw - a + fix,
    };
  };
  const endAngle = new Map<number, number>();
  for (const c of active) {
    if (!c.turn || endAngle.has(c.id >> 1)) continue;
    const pair = active.filter((x) => x.id >> 1 === c.id >> 1);
    const { angle: a0, left } = c.turn;
    // The nearest half turns either way round from where the turn has got to.
    const up = Math.PI * (2 * Math.floor((a0 / Math.PI + 1) / 2) + 1);
    const ends = [up, up - 2 * Math.PI];
    const share = Math.min(1, beats / Math.max(left, 1e-9));
    const shares = share >= 1 ? [1, 0.5, 0.25, 0] : [share, share / 2, 0];
    // Dancing the figure without turning further is always possible; turn
    // as much as the speed and turn limits allow on top of that.
    const still = turnCost(pair, (x, beat) => turned(x, a0, beat), beats);
    const allowed = Math.max(0.95, still + 0.02);
    let best = { a1: a0, cost: still, share: 0 };
    for (const f of shares) {
      for (const e of ends) {
        const a1 = a0 + (e - a0) * f;
        const cost = f === 0 ? still : turnCost(pair, (x, beat) => turned(x, a1, beat), beats);
        if (cost > allowed) continue;
        if (f > best.share || (f === best.share && cost < best.cost)) best = { a1, cost, share: f };
      }
    }
    endAngle.set(c.id >> 1, best.a1);
  }
  const place = (c: GhostCopy, b: MovedBody, beat: number): MovedBody => {
    if (c.turn) return turned(c, endAngle.get(c.id >> 1)!, beat);
    const { position, yaw } = shifted(c, b, beat);
    return {
      id: c.id,
      position,
      yaw,
      ...(b.lean !== undefined ? { lean: b.lean } : {}),
    };
  };
  const copyContact = (k: FigureContact): FigureContact | undefined => {
    const a = byTemplate.get(k.a);
    const b = byTemplate.get(k.b);
    if (!a || !b || a.shift !== b.shift || a.turn || b.turn) return undefined;
    // Hands are taken again where the copies stand (they may still be
    // turning to face as their templates do), and only where they reach.
    const { point: _point, bodyPoint, underId, ...rest } = k;
    const under = underId === undefined ? undefined : byTemplate.get(underId)?.id;
    return {
      ...rest,
      a: a.id,
      b: b.id,
      ...(bodyPoint ? { bodyPoint: { ...bodyPoint, z: bodyPoint.z + a.shift } } : {}),
      ...(under !== undefined ? { underId: under } : {}),
    };
  };
  const motion = (beat: number): FigureFrame => {
    const frame = result.motion(beat);
    const at = new Map(frame.bodies.map((b) => [b.id, b]));
    const extra = active.map((c) => {
      const t = at.get(c.template) ?? {
        id: c.template,
        ...templateStart.get(c.template)!,
      };
      return place(c, t, beat);
    });
    const map = bodyMap([...frame.bodies, ...extra]);
    const contacts = frame.contacts
      .map(copyContact)
      .filter((k): k is FigureContact => k !== undefined)
      .map((k) => withinReach(k, map));
    return {
      bodies: [...frame.bodies, ...extra],
      contacts: [...frame.contacts, ...contacts],
    };
  };
  const end = motion(beats);
  const bodies = new Map<number, Body>(result.exit.bodies);
  for (const b of end.bodies)
    if (start.has(b.id)) bodies.set(b.id, { position: b.position, yaw: b.yaw });
  const hands: Hold[] = [...result.exit.hands];
  for (const h of result.exit.hands) {
    const a = byTemplate.get(h.a);
    const b = byTemplate.get(h.b);
    if (a && b && a.shift === b.shift && !a.turn && !b.turn)
      hands.push({ a: a.id, handA: h.handA, b: b.id, handB: h.handB });
  }
  // Couples changing ends have turned further, or finished turning.
  const turns = new Map(active.filter((c) => c.turn).map((c) => [c.id >> 1, c.turn!] as const));
  const waiting = result.exit.waiting.map((w) => {
    const t = turns.get(w.couple);
    if (!t) return w;
    const angle = endAngle.get(w.couple)!;
    const rest = Math.abs((Math.abs(angle) % (2 * Math.PI)) - Math.PI);
    if (rest < 1e-9) return { couple: w.couple, crossed: true };
    return {
      ...w,
      ghostTurn: { ...t, angle, left: Math.max(0, t.left - beats) },
    };
  });
  return {
    ...result,
    motion,
    exit: withChanges(result.exit, { bodies, hands, waiting }),
  };
}

/**
 * How hard a turning couple works: its top speed as a share of the limit.
 * (Turning about the ghost set's middle adds little to how fast it turns.)
 */
function turnCost(
  pair: readonly GhostCopy[],
  at: (c: GhostCopy, beat: number) => MovedBody,
  beats: number,
): number {
  const steps = Math.max(16, Math.ceil(beats * 8));
  let worst = 0;
  for (const c of pair) {
    let prev = at(c, 0);
    for (let i = 1; i <= steps; i++) {
      const beat = (i / steps) * beats;
      const now = at(c, beat);
      const dt = beats / steps;
      const speed =
        Math.hypot(now.position.x - prev.position.x, now.position.z - prev.position.z) / dt;
      worst = Math.max(worst, speed / COMFORT_SPEED);
      prev = now;
    }
  }
  return worst;
}

/** Whether a copy turning to face as its template does would turn faster than the limit. */
function facingTooFast(state: DanceState, result: FigureResult, c: GhostCopy, beats: number) {
  const s = body(state, c.id);
  const t0 = body(state, c.template);
  const off = turn(s.yaw, t0.yaw);
  if (Math.abs(off) < 0.3) return false;
  const span = Math.min(FACE_BEATS, beats);
  const steps = Math.max(16, Math.ceil(span * 16));
  const yawAt = (beat: number) => {
    const t = result.motion(beat).bodies.find((b) => b.id === c.template);
    return (t?.yaw ?? t0.yaw) + off * (1 - smooth(beat / span));
  };
  let prev = yawAt(0);
  for (let i = 1; i <= steps; i++) {
    const beat = (i / steps) * span;
    const now = yawAt(beat);
    if (Math.abs(turn(now, prev)) / (span / steps) > 0.95 * COMFORT_TURN) return true;
    prev = now;
  }
  return false;
}
