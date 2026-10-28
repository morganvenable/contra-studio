/**
 * The corpus check for one stored dance, shared by the corpus test and the
 * coverage script: it compiles at the given couple counts, the physical
 * check is clean over couples + 2 rounds, couples end each round where an
 * independent duple-minor model puts them, and every couple meets every
 * other.
 *
 * The model: couples stand in places along the set. Each round, couples
 * paired in a minor set trade places along the set; a couple with no one to
 * pair with waits at its end. Becket pairs couples side by side across the
 * set instead, and their places shift by one along each side.
 */
import { physicalCheck } from './check.ts';
import type { FoldedDance } from './fold.ts';
import type { StoredDance } from '../dance.ts';
import type { Vec2 } from '../../types.ts';
import { FORMATIONS } from './formation.ts';
import { contraSpec, type CheckSpec, type MeetingRule, type RoundModel } from './models.ts';
import { rowsSpec } from './progression-rows.ts';

export interface Verdict {
  readonly ok: boolean;
  readonly problem?: string;
  /** Source text of the figure where the check failed, when known. */
  readonly figure?: string;
  /** Index of that figure in the stored calls, when known. */
  readonly index?: number;
  /** Couple count the problem showed up at. */
  readonly couples?: number;
  /** What kind of problem: a figure could not run, motion, or the progression model. */
  readonly kind?: 'compile' | 'repeat' | 'physical' | 'progression' | 'meeting';
}

const coupleZ = (dance: FoldedDance, beat: number, couple: number) => {
  const f = dance.rawSample(beat);
  return (f.poses[couple * 2].position.z + f.poses[couple * 2 + 1].position.z) / 2;
};

export { becketModel, improperModel } from './models.ts';

/** The check spec of a stored dance: its formation's own, or the contra one. */
export function specOf(stored: StoredDance): CheckSpec {
  const own = stored.formation ? FORMATIONS[stored.formation]?.check : undefined;
  // The top minor set to the bottom each time (progression-rows.ts).
  if (stored.progression === 'becket-rows' && stored.formation) return rowsSpec(stored.formation);
  return own ?? contraSpec(stored.formation, stored.progression);
}

export function verifyDance(
  stored: StoredDance,
  compile: (stored: StoredDance, couples: number) => FoldedDance,
  counts?: readonly number[],
): Verdict {
  const spec = specOf(stored);
  try {
    for (const couples of counts ?? spec.counts) {
      const dance = compile(stored, couples);
      if (!dance.repeatable)
        return {
          ok: false,
          problem: `${couples} couples: ${dance.warnings.at(-1)}`,
          couples,
          kind: 'repeat',
          ...figureOf(dance.warnings.at(-1) ?? ''),
        };
      const rounds = spec.rounds?.(couples) ?? couples + 2;
      const report = physicalCheck(dance, { rounds });
      if (report.problems.length) {
        const beat = Number(report.problems[0].match(/^beat ([\d.]+)/)?.[1] ?? 0);
        const local = beat % dance.totalBeats;
        const index = Math.max(
          0,
          dance.starts.findLastIndex((s) => s <= local),
        );
        const figure = stored.figures[index]?.text;
        return {
          ok: false,
          problem: `${couples} couples: ${report.problems[0]} (${figure})`,
          figure,
          index,
          couples,
          kind: 'physical',
        };
      }
      // Either model will do; the problem reported is the main model's.
      const main = modelProblem(dance, spec.model?.(couples, rounds), couples);
      const wrong =
        main && spec.orModel && !modelProblem(dance, spec.orModel(couples, rounds), couples)
          ? undefined
          : main;
      if (wrong) return { ok: false, problem: wrong, couples, kind: 'progression' };
      const meets = !spec.meetingCounts || spec.meetingCounts.includes(couples);
      const missed = meets ? meetingProblem(dance, spec.meeting, couples) : undefined;
      if (missed) return { ok: false, problem: missed, couples, kind: 'meeting' };
    }
    return { ok: true };
  } catch (error) {
    const problem = error instanceof Error ? error.message : String(error);
    return { ok: false, problem, kind: 'compile', ...figureOf(problem) };
  }
}

/** Where the model puts couples (or dancers) after each round, if they are not there. */
function modelProblem(
  dance: FoldedDance,
  model: RoundModel | undefined,
  couples: number,
): string | undefined {
  if (!model) return undefined;
  if (model.kind === 'slots') {
    for (let r = 1; r <= model.rounds; r++) {
      const frame = dance.rawSample(r * dance.totalBeats);
      for (const pose of frame.poses) {
        const slots = dance.dancers[pose.id].role === 'lark' ? model.larks : model.robins;
        const near = slots.some(
          (s) => Math.hypot(pose.position.x - s.x, pose.position.z - s.z) < 0.05,
        );
        if (!near)
          return `${couples} couples: dancer ${pose.id} after round ${r} is not on a place of the starting ring`;
      }
    }
    return undefined;
  }
  for (let r = 1; r <= model.rounds.length; r++) {
    const expected = model.rounds[r - 1];
    if (model.kind === 'couple-z') {
      for (let c = 0; c < couples; c++) {
        const z = coupleZ(dance, r * dance.totalBeats, c);
        const want = expected[c] as number;
        if (Math.abs(z - want) > 0.05)
          return `${couples} couples: couple ${c + 1} after round ${r} is at z ${z.toFixed(2)}, expected ${want.toFixed(2)}`;
      }
      continue;
    }
    const frame = dance.rawSample(r * dance.totalBeats);
    for (const pose of frame.poses) {
      const want = expected[pose.id] as Vec2;
      let dz = pose.position.z - want.z;
      if (model.period) dz -= Math.round(dz / model.period) * model.period;
      const off = Math.hypot(pose.position.x - want.x, dz);
      if (off > 0.05)
        return `${couples} couples: dancer ${pose.id} after round ${r} is ${off.toFixed(2)} m from where the progression puts them`;
    }
    const partners = model.partners?.[r - 1];
    if (partners) {
      const state = dance.round(r - 1).end;
      for (const d of state.dancers) {
        const p = state.relations.get('partner')?.get(d.id);
        if (p !== partners[d.id])
          return `${couples} couples: dancer ${d.id} after round ${r} has partner ${p}, expected ${partners[d.id]}`;
      }
    }
  }
  return undefined;
}

/** Who has not met whom over enough rounds, by the formation's meeting rule. */
function meetingProblem(dance: FoldedDance, rule: MeetingRule, couples: number) {
  if (rule === 'none') return undefined;
  const rounds = 2 * couples + 2;
  if (rule === 'all-partners') {
    const met = new Set<string>();
    for (let r = 0; r < rounds; r++) {
      const partner = dance.round(r).end.relations.get('partner');
      for (const [a, b] of partner ?? []) if (a % 2 === 0) met.add(`${a}-${b}`);
    }
    const pairs = couples * couples;
    return met.size === pairs
      ? undefined
      : `${couples} couples: only ${met.size} of ${pairs} lark-robin pairs become partners`;
  }
  const ones = new Set<number>();
  const met = new Set<string>();
  for (let r = 0; r < rounds; r++) {
    const round = dance.round(r);
    const end = round.end;
    for (const id of end.positions.get('1s') ?? []) if (r === 0) ones.add(Math.floor(id / 2));
    // Every grouping danced this round: a double progression regroups mid-round.
    const groupings = [...round.segments.map((s) => s.entry.groups), end.groups];
    for (const g of groupings.flat()) {
      const unit = rule === 'all-lines' ? 4 : 2;
      const cs = [...new Set(g.map((id) => Math.floor(id / unit)))].sort((a, b) => a - b);
      met.add(cs.join('-'));
    }
  }
  const units = rule === 'all-lines' ? couples / 2 : couples;
  const pairs =
    rule === 'ones-twos' ? ones.size * (couples - ones.size) : (units * (units - 1)) / 2;
  return met.size === pairs
    ? undefined
    : `${couples} couples: only ${met.size} of ${pairs} pairs of couples meet`;
}

/** The figure an error message names ("Figure 3 (text): why"), if any. */
function figureOf(message: string): { figure?: string; index?: number } {
  const m = message.match(/Figure (\d+) \((.*?)\):/);
  return m ? { index: Number(m[1]) - 1, figure: m[2] } : {};
}
