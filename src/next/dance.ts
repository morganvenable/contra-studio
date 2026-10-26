/**
 * Stored dances for the next engine and the one entry point the app uses.
 * A stored dance is its source reference (URL + content hash of the snapshot)
 * plus the FigureCall list, the choices made and the corpus check's status.
 * No embedded HTML.
 *
 * Every ContraDB dance is stored, working or not, as public/dances/<id>.json
 * (with a small public/dances/index.json). The app fetches one by id and
 * registers it here before compiling; nothing is bundled.
 */
import { TRIPLE_MINOR_PROGRESSION } from './core/formation-triple.ts';
import { ROWS_PROGRESSION } from './core/progression-rows.ts';
import type { Dance } from '../types.ts';
import type { FigureCall } from './core/figure.ts';
import { compileFold, type FoldedDance } from './core/fold.ts';
import { FORMATIONS } from './core/formation.ts';
import { METERS, type MusicStructure } from './core/music.ts';
import {
  DUPLE_MINOR_PROGRESSION,
  DUPLE_MINOR_PROPER_PROGRESSION,
  MINOR_SET_PROGRESSION,
  MINOR_SET_COUPLES_PROGRESSION,
  NO_PROGRESSION,
  WHOLE_SET_PROGRESSION,
  type Progression,
} from './core/progression.ts';
import { FIGURES } from './figures/index.ts';
import {
  DUPLE_MINOR_DOUBLE,
  DUPLE_MINOR_PROPER_DOUBLE,
  MINOR_SET_DOUBLE,
  MINOR_SET_COUPLES_DOUBLE,
  LINES_PROGRESSION,
  PLACES_PROGRESSION,
  SICILIAN_PROGRESSION,
} from './core/progression-more.ts';
import { bendFrame } from './core/bend.ts';
import { MIXER_PROGRESSION } from './core/formation-ring.ts';
import { TRIOS_PROGRESSION } from './core/formation-trios.ts';
import { GROUPS_PROGRESSIONS } from './core/formation-groups.ts';

export interface StoredCall extends FigureCall {
  readonly section?: string;
  /** 1-based source row this call came from. */
  readonly row?: number;
}

/**
 * - ok: compiles and passes the corpus check.
 * - check: compiles, but the physical or progression check reports problems.
 * - partial: some rows are unparsed or a figure cannot start; those rows are
 *   held still and labeled, the rest is drawn.
 * - unsupported: the formation is not built yet.
 * - unchecked: imported, not run through the corpus check yet.
 */
export type DanceStatus = 'ok' | 'check' | 'partial' | 'unsupported' | 'unchecked';

export interface StoredDance {
  readonly schema: 'contra-studio/next-dance';
  readonly version: 2;
  /** ContraDB id. */
  readonly id: string;
  readonly title: string;
  readonly author: string;
  /** Key into FORMATIONS, or null when the formation is not built yet. */
  readonly formation: string | null;
  readonly progression: Progression['kind'] | null;
  readonly music: {
    readonly meter: string;
    readonly parts: readonly { readonly name: string; readonly bars: number }[];
    readonly times: number | 'repeat';
  };
  readonly source: {
    readonly url: string;
    /** Formation as ContraDB writes it. */
    readonly formation: string;
    readonly retrievedAt?: string;
    /** sha256 of the snapshot's HTML. */
    readonly sha256: string;
    readonly status?: string;
  };
  readonly status: DanceStatus;
  /** Plain-language problems, most important first; empty when ok. */
  readonly problems: readonly string[];
  /** Rows no pattern parses (held still in `figures`). */
  readonly unparsed: readonly UnparsedRow[];
  readonly choices: readonly string[];
  readonly figures: readonly StoredCall[];
}

export interface UnparsedRow {
  readonly row: number;
  readonly text: string;
  readonly why: string;
}

/** One line of public/dances/index.json. */
export interface LibraryEntry {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly formation: string;
  readonly status: DanceStatus;
  /** The first problem, in plain words, when the dance is not ok. */
  readonly note?: string;
}

const PROGRESSIONS: Readonly<Record<Progression['kind'], Progression>> = {
  'minor-set': MINOR_SET_PROGRESSION,
  'minor-set-couples': MINOR_SET_COUPLES_PROGRESSION,
  'duple-minor': DUPLE_MINOR_PROGRESSION,
  'duple-minor-proper': DUPLE_MINOR_PROPER_PROGRESSION,
  'whole-set': WHOLE_SET_PROGRESSION,
  none: NO_PROGRESSION,
  'minor-set-double': MINOR_SET_DOUBLE,
  'minor-set-couples-double': MINOR_SET_COUPLES_DOUBLE,
  'duple-minor-double': DUPLE_MINOR_DOUBLE,
  'duple-minor-proper-double': DUPLE_MINOR_PROPER_DOUBLE,
  places: PLACES_PROGRESSION,
  sicilian: SICILIAN_PROGRESSION,
  lines: LINES_PROGRESSION,
  mixer: MIXER_PROGRESSION,
  trios: TRIOS_PROGRESSION,
  'triple-minor': TRIPLE_MINOR_PROGRESSION,
  'becket-rows': ROWS_PROGRESSION,
  ...(GROUPS_PROGRESSIONS as unknown as Record<string, Progression>),
} as Readonly<Record<Progression['kind'], Progression>>;

export function musicOf(stored: StoredDance): MusicStructure {
  const meter = METERS[stored.music.meter];
  if (!meter) throw new Error(`Unknown meter ${stored.music.meter}.`);
  return { meter, parts: stored.music.parts, times: stored.music.times };
}

/** Dances the app has fetched, by source URL. */
const registered = new Map<string, StoredDance>();

export function registerNextDance(stored: StoredDance) {
  registered.set(stored.source.url, stored);
}

export function findNextDance(sourceUrl: string | undefined): StoredDance | undefined {
  return sourceUrl === undefined ? undefined : registered.get(sourceUrl);
}

export interface CompileOptions {
  /**
   * Hold figures that cannot start instead of failing (see compileFold).
   * The default: lenient unless the dance passed the corpus check.
   */
  readonly lenient?: boolean;
}

/** True when the dance's formation is built, so its figures can run. */
export const formationBuilt = (stored: StoredDance) =>
  stored.formation !== null && FORMATIONS[stored.formation] !== undefined;

/**
 * Compile a stored dance. `base` keeps the app's dance identity and notes.
 * A dance whose formation is not built shows its rows as holds in an
 * improper set, so its timeline and labels still read.
 */
export function compileNext(
  stored: StoredDance,
  couples?: number,
  base?: Dance,
  options: CompileOptions = {},
): FoldedDance {
  const built = formationBuilt(stored);
  const formation = FORMATIONS[built ? stored.formation! : 'improper'];
  // Unless a count is asked for, the formation's own display size.
  couples ??= formation.display ?? 6;
  // A fixed-size set (a triplet, a square) dances with its own couple count.
  couples = Math.min(formation.couples.max, Math.max(formation.couples.min, couples));
  if (formation.fit) couples = formation.fit(couples);
  const calls: readonly FigureCall[] = built
    ? stored.figures
    : stored.figures.map((c) => ({
        move: 'hold',
        beats: c.beats,
        params: { reason: 'unsupported' },
        text: c.text,
      }));
  const dance: Dance = base ?? {
    id: `next:${stored.source.url}`,
    title: stored.title,
    author: stored.author,
    formation: stored.formation?.startsWith('becket') ? 'becket' : 'duple-improper',
    circulation: stored.formation === 'becket-ccw' ? 'ccw' : 'cw',
    sourceUrl: stored.source.url,
    description: '',
    figures: [],
  };
  const progression =
    built && stored.progression ? PROGRESSIONS[stored.progression] : NO_PROGRESSION;
  const notOk = stored.status !== 'ok' && stored.problems.length;
  const start = formation.start(couples);
  const folded = compileFold({
    dance,
    calls,
    start,
    registry: FIGURES,
    progression,
    music: musicOf(stored),
    lenient: options.lenient ?? stored.status !== 'ok',
    warnings: [
      ...(notOk ? [stored.problems[0]] : []),
      ...(notOk ? stored.problems.slice(1) : []),
      ...stored.choices.map((c) => `Choice: ${c}`),
    ],
  });
  // A set with no ends is drawn bent round a circle; the check uses rawSample.
  const layout = start.layout;
  if (!layout?.period) return folded;
  return {
    ...folded,
    period: layout.period,
    sample: (beat: number) => bendFrame(folded.sample(beat), layout),
  };
}
