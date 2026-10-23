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
import { SET } from './config.ts';
import type { FoldedDance } from './fold.ts';
import type { StoredDance } from '../dance.ts';

export interface Verdict {
  readonly ok: boolean;
  readonly problem?: string;
  /** Source text of the figure where the check failed, when known. */
  readonly figure?: string;
}

const coupleZ = (dance: FoldedDance, beat: number, couple: number) => {
  const f = dance.rawSample(beat);
  return (f.poses[couple * 2].position.z + f.poses[couple * 2 + 1].position.z) / 2;
};

/** Expected couple-center z after each round, improper duple minor. */
export function improperModel(couples: number, rounds: number): number[][] {
  const place = Array.from({ length: couples }, (_, c) => c); // place 0 is the top
  const z = (p: number) => ((couples - 1) / 2 - p) * SET.slot;
  const out: number[][] = [];
  for (let r = 0; r < rounds; r++) {
    const byPlace = new Map(place.map((p, c) => [p, c]));
    for (let p = r % 2; p + 1 < couples; p += 2) {
      const a = byPlace.get(p)!;
      const b = byPlace.get(p + 1)!;
      place[a] = p + 1;
      place[b] = p;
    }
    out.push(place.map(z));
  }
  return out;
}

/** Expected couple-center z after each round, Becket (as in the 2321 test). */
export function becketModel(couples: number, rounds: number): number[][] {
  const rows = Math.floor(couples / 2);
  const spots = Array.from({ length: couples }, (_, c) => {
    if (c === couples - 1 && couples % 2)
      return { side: -1, z: (rows - (rows - 1) / 2) * 2 * SET.slot };
    return { side: c % 2 ? -1 : 1, z: (Math.floor(c / 2) - (rows - 1) / 2) * 2 * SET.slot };
  });
  const out: number[][] = [];
  for (let r = 0; r < rounds; r++) {
    for (const s of spots) s.z += s.side * SET.slot;
    for (const s of spots) {
      const across = spots.some(
        (o) => o !== s && o.side === -s.side && Math.abs(o.z - s.z) < 1e-6,
      );
      if (!across) s.side = -s.side;
    }
    out.push(spots.map((s) => s.z));
  }
  return out;
}

export function verifyDance(
  stored: StoredDance,
  compile: (stored: StoredDance, couples: number) => FoldedDance,
  counts: readonly number[] = [3, 4, 6],
): Verdict {
  try {
    for (const couples of counts) {
      const dance = compile(stored, couples);
      if (!dance.repeatable)
        return { ok: false, problem: `${couples} couples: ${dance.warnings.at(-1)}` };
      const rounds = couples + 2;
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
        };
      }
      const model = stored.formation === 'becket' ? becketModel : improperModel;
      const expected = model(couples, rounds);
      for (let r = 1; r <= rounds; r++) {
        for (let c = 0; c < couples; c++) {
          const z = coupleZ(dance, r * dance.totalBeats, c);
          if (Math.abs(z - expected[r - 1][c]) > 0.05) {
            return {
              ok: false,
              problem: `${couples} couples: couple ${c + 1} after round ${r} is at z ${z.toFixed(2)}, expected ${expected[r - 1][c].toFixed(2)}`,
            };
          }
        }
      }
      const met = new Set<string>();
      for (let r = 0; r < 2 * couples + 2; r++) {
        for (const g of dance.round(r).end.groups) {
          const cs = [...new Set(g.map((id) => Math.floor(id / 2)))].sort((a, b) => a - b);
          met.add(cs.join('-'));
        }
      }
      const pairs = (couples * (couples - 1)) / 2;
      if (met.size !== pairs)
        return {
          ok: false,
          problem: `${couples} couples: only ${met.size} of ${pairs} pairs of couples meet`,
        };
    }
    return { ok: true };
  } catch (error) {
    const problem = error instanceof Error ? error.message : String(error);
    return { ok: false, problem, figure: problem.match(/^Figure \d+ \((.*?)\):/)?.[1] };
  }
}
