/**
 * ContraDB snapshot -> stored next-engine dance. Every dance imports, working
 * or not: rows no pattern parses become labeled holds so the timeline keeps
 * its shape, and a formation that is not built yet is recorded as such. The
 * status (ok, check, partial, unsupported) is filled in later by the corpus
 * check (status.ts); the importer only reads the source.
 *
 * Pure: no file or network access, so the app, tests and scripts share it.
 */
import type { Progression } from './core/progression.ts';
import { canonical, canonicalText } from './core/roles.ts';
import { contraDbRows, decodeEntities, parseRow, type SourceRow } from './core/parse.ts';
import type { StoredCall, StoredDance, UnparsedRow } from './dance.ts';
import { FORMATIONS } from './core/formation.ts';
import { GROUPS_FORMATION_TEXT } from './core/formation-groups.ts';
import { joinTravelRows } from './import-travel.ts';

export interface ContraDbSnapshot {
  readonly sourceUrl: string;
  readonly retrievedAt?: string;
  readonly html: string;
}

export interface ContraDbMeta {
  readonly title: string;
  readonly author: string;
  /** Formation as ContraDB writes it ("improper", "Becket ccw" ...). */
  readonly formation: string;
}

const text = (html: string, re: RegExp) =>
  decodeEntities((html.match(re)?.[1] ?? '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

export function contraDbMeta(html: string): ContraDbMeta {
  return {
    title: text(html, /dance-show-title">([\s\S]*?)<\/h1>/),
    author: text(html, /dance-show-choreographer">by: ([\s\S]*?)<\/p>/),
    formation: text(html, /dance-show-formation">formation: ([\s\S]*?)<\/p>/),
  };
}

interface Shape {
  readonly formation: string;
  readonly progression: Progression['kind'];
}

/**
 * ContraDB formation text (lowercase, single spaces) -> a built formation.
 * Anything not listed is "unsupported" until its formation is built.
 */
export const FORMATION_TEXT: Readonly<Record<string, Shape>> = {
  improper: { formation: 'improper', progression: 'duple-minor' },
  'duple improper': { formation: 'improper', progression: 'duple-minor' },
  becket: { formation: 'becket', progression: 'minor-set' },
  'becket cw': { formation: 'becket', progression: 'minor-set' },
  'becket clockwise': { formation: 'becket', progression: 'minor-set' },
  proper: { formation: 'proper', progression: 'duple-minor-proper' },
  'duple proper': { formation: 'proper', progression: 'duple-minor-proper' },
  indecent: { formation: 'indecent', progression: 'duple-minor' },
  'duple indecent': { formation: 'indecent', progression: 'duple-minor' },
  'duple neutral': { formation: 'duple-neutral', progression: 'duple-minor' },
  'becket ccw': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket counterclockwise': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket counter-clockwise': { formation: 'becket-ccw', progression: 'minor-set' },
  // Spellings and qualifiers of the formations above (docs/figure-readings.md).
  'improper or proper': { formation: 'improper', progression: 'duple-minor' },
  'improper/proper': { formation: 'improper', progression: 'duple-minor' },
  'duple minor improper': { formation: 'improper', progression: 'duple-minor' },
  'duple improper longways': { formation: 'improper', progression: 'duple-minor' },
  'duple improper contra': { formation: 'improper', progression: 'duple-minor' },
  'duple minor - improper - single progression': {
    formation: 'improper',
    progression: 'duple-minor',
  },
  'improper - waltz tempo': { formation: 'improper', progression: 'duple-minor' },
  imroper: { formation: 'improper', progression: 'duple-minor' },
  'improper⁹': { formation: 'improper', progression: 'duple-minor' },
  'duple minor': { formation: 'improper', progression: 'duple-minor' },
  'all improper': { formation: 'improper', progression: 'duple-minor' },
  'progressed improper': { formation: 'improper', progression: 'duple-minor' },
  'improper progressed': { formation: 'improper', progression: 'duple-minor' },
  'duple improper; begins progressed': { formation: 'improper', progression: 'duple-minor' },
  "improper, but with 1's below 2's": { formation: 'improper', progression: 'duple-minor' },
  beckett: { formation: 'becket', progression: 'minor-set' },
  becketa: { formation: 'becket', progression: 'minor-set' },
  'becket (no matter)': { formation: 'becket', progression: 'minor-set' },
  'becket l': { formation: 'becket', progression: 'minor-set' },
  'duple becket': { formation: 'becket', progression: 'minor-set' },
  'duple minor becket': { formation: 'becket', progression: 'minor-set' },
  'becket ccwkoi': { formation: 'becket-ccw', progression: 'minor-set' },
  'beckett ccw': { formation: 'becket-ccw', progression: 'minor-set' },
  'duple becket (reverse progression)': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket, indecent': { formation: 'becket-indecent', progression: 'minor-set' },
  'becket indecent': { formation: 'becket-indecent', progression: 'minor-set' },
  'indecent becket': { formation: 'becket-indecent', progression: 'minor-set' },
  'becket cw (gents on right, ladies on left)': {
    formation: 'becket-indecent',
    progression: 'minor-set',
  },
  'indecent becket ccw': { formation: 'becket-ccw-indecent', progression: 'minor-set' },
  'becket ccw indecent1': { formation: 'becket-ccw-indecent', progression: 'minor-set' },
  // Double progressions: the figures move couples two places a round.
  'improper, double progression': { formation: 'improper', progression: 'duple-minor-double' },
  'improper - double progression': { formation: 'improper', progression: 'duple-minor-double' },
  'duple neutral, double progression': {
    formation: 'duple-neutral',
    progression: 'duple-minor-double',
  },
  'becket double progression': { formation: 'becket', progression: 'minor-set-double' },
  'beckett double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket, double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket - double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket cw, double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket cw, dbl prog': { formation: 'becket', progression: 'minor-set-double' },
  'becket, double ccw progression': { formation: 'becket-ccw', progression: 'minor-set-double' },
  'duple becket (reverse double progression)': {
    formation: 'becket-ccw',
    progression: 'minor-set-double',
  },
  // Whole sets: a triplet and longways sets for a few couples.
  triplet: { formation: 'triplet', progression: 'places' },
  'proper triplet': { formation: 'triplet', progression: 'places' },
  'triplet, 1s and 2s improper': { formation: 'triplet', progression: 'places' },
  longways: { formation: 'longways-set', progression: 'places' },
  'longways sets, up to 6 couples': { formation: 'longways-set', progression: 'places' },
  'longways set, 4-6 couples': { formation: 'longways-set', progression: 'places' },
  'longways sets, 4-6 couples': { formation: 'longways-set', progression: 'places' },
  'longways set, no h4': { formation: 'longways-set', progression: 'places' },
  'four couple longways set': { formation: 'longways-four', progression: 'places' },
  // Sets with no ends and lines of four.
  'sicilian circle': { formation: 'sicilian', progression: 'sicilian' },
  'four face four': { formation: 'four-face-four', progression: 'lines' },
  'four facing four': { formation: 'four-face-four', progression: 'lines' },
  // One big ring.
  'circle mixer': { formation: 'circle-mixer', progression: 'mixer' },
  mixer: { formation: 'circle-mixer', progression: 'mixer' },
  circle: { formation: 'circle', progression: 'mixer' },
  // Scatter mixers are drawn as one ring (docs/figure-readings.md).
  'scatter mixer': { formation: 'circle-mixer', progression: 'mixer' },
  'scatter mixer (single)': { formation: 'circle-mixer', progression: 'mixer' },
  'duple scatter mixer': { formation: 'circle-mixer', progression: 'mixer' },
  'three-couple scatter mixer': { formation: 'circle-mixer', progression: 'mixer' },
  // Squares: four couples; partners are found where they stand.
  'square dance': { formation: 'square', progression: 'mixer' },
  'square break': { formation: 'square', progression: 'mixer' },
  'square dance break': { formation: 'square', progression: 'mixer' },
  'four couple square': { formation: 'square', progression: 'mixer' },
  square: { formation: 'square', progression: 'mixer' },
  // Zoom contras for one couple are drawn in an improper set.
  'one couple': { formation: 'improper', progression: 'duple-minor' },
  singlet: { formation: 'improper', progression: 'duple-minor' },
  'solo/couple': { formation: 'improper', progression: 'duple-minor' },
  // Triple minor and its relatives, drawn as one minor set of three couples.
  'triple minor': { formation: 'triple-minor', progression: 'places' },
  'triple proper': { formation: 'triple-minor', progression: 'places' },
  'triple minor dutribecket': { formation: 'triple-minor', progression: 'places' },
  'triad (triple minor dutribecket)': { formation: 'triple-minor', progression: 'places' },
  'triple minor, triad formation': { formation: 'triple-minor', progression: 'places' },
  triad: { formation: 'triple-minor', progression: 'places' },
  // One-off qualifiers of built formations (docs/figure-readings.md).
  'indecent becket cw gents change place with partner': {
    formation: 'becket-indecent',
    progression: 'minor-set',
  },
  'becket men in center left hands, right hand to partner in ocean of four': {
    formation: 'becket',
    progression: 'minor-set',
  },
  'quadruple minor becket': { formation: 'becket', progression: 'minor-set' },
  'becket quadruplet': { formation: 'becket', progression: 'minor-set' },
  'sawtooth cw': { formation: 'becket', progression: 'minor-set' },
  'cross contra': { formation: 'improper', progression: 'duple-minor' },
  'cross contra - improper then ladle one and gentlespoon two trade places': {
    formation: 'improper',
    progression: 'duple-minor',
  },
  'cross contra - improper then ladle one and ladle two trade places': {
    formation: 'improper',
    progression: 'duple-minor',
  },
  'long waves, larks facing out': { formation: 'improper', progression: 'duple-minor' },
  'proper, ladles traded': { formation: 'proper', progression: 'duple-minor-proper' },
  'improper, reverse progression': { formation: 'improper', progression: 'duple-minor' },
  'improper reverse progression': { formation: 'improper', progression: 'duple-minor' },
  'duple indecent (reverse progression)': { formation: 'indecent', progression: 'duple-minor' },
  'contra mixer': { formation: 'improper', progression: 'duple-minor' },
  'duple mixer': { formation: 'improper', progression: 'duple-minor' },
  'proper mixer': { formation: 'proper', progression: 'duple-minor-proper' },
  'becket mixer': { formation: 'becket', progression: 'minor-set' },
  'quadruple minor': { formation: 'square', progression: 'mixer' },
  'grid square': { formation: 'square', progression: 'mixer' },
  'square with ninepin': { formation: 'square', progression: 'mixer' },
  'five couple horseshoe': { formation: 'circle', progression: 'mixer' },
  // Lines of three facing lines of three round a circle.
  'three face three': { formation: 'three-face-three', progression: 'trios' },
  'three-face-three': { formation: 'three-face-three', progression: 'trios' },
  '3 face 3': { formation: 'three-face-three', progression: 'trios' },
  'three facing three': { formation: 'three-face-three', progression: 'trios' },
  'three-facing-three': { formation: 'three-face-three', progression: 'trios' },
  // Sets not made of couples (core/formation-groups.ts).
  ...(GROUPS_FORMATION_TEXT as Readonly<Record<string, Shape>>),
};

export function shapeOf(formation: string): Shape | undefined {
  return FORMATION_TEXT[formation.toLowerCase().replace(/\s+/g, ' ').trim()];
}

/**
 * The progression kind: the formation's, made double when the source marks
 * two progressions in one time through (the figures carry each couple two
 * places).
 */
function progressionOf(shape: Shape | undefined, figures: readonly StoredCall[]) {
  if (!shape) return null;
  const marks = figures.filter((c) => c.progression).length;
  const double: Partial<Record<Progression['kind'], Progression['kind']>> = {
    'duple-minor': 'duple-minor-double',
    'minor-set': 'minor-set-double',
    'duple-minor-proper': 'duple-minor-proper-double',
  };
  return marks === 2 ? (double[shape.progression] ?? shape.progression) : shape.progression;
}

/** Usual answers the parser filled in, listed so a reviewer can change them. */
const CHOICES: readonly (readonly [(c: StoredCall) => boolean, string])[] = [
  [
    (c) => c.move === 'rory' && c.params.spin === 'full',
    "Rory O'More spins one full turn in the travel direction.",
  ],
  [
    (c) => c.move === 'balance' && c.params.formation === 'wave' && !!c.params.first,
    'The balance before each Rory steps toward the slide direction first.',
  ],
  [
    (c) => c.move === 'pass-through' && c.params.shoulder === 'right',
    'Pass through goes by right shoulders.',
  ],
  [
    (c) => c.move === 'pass-through' && !c.params.axis,
    'A pass through from a ring goes along the set, to the dancer on your own side.',
  ],
  [(c) => c.move === 'slice', 'Slice: half the counts on the diagonal, half straight back.'],
  [
    (c) => c.move === 'balance' && c.params.formation === 'pair' && c.params.hand === 'both',
    'A balance with a partner or neighbor holds both hands.',
  ],
  [
    (c) => c.move === 'star' && !c.params.grip,
    'A star with no grip named is a basket star (wrist grip).',
  ],
  [
    (c) => c.move === 'swing' && /long swing/i.test(c.text ?? ''),
    'A long swing is drawn as an ordinary swing.',
  ],
  [
    (c) => c.move === 'swing' && !!c.params.meltdown && c.beats >= 12,
    'A meltdown swing starts with 4 beats of right-shoulder round, then swings.',
  ],
  [
    (c) => c.move === 'swing' && !!c.params.meltdown && c.beats < 12,
    'A meltdown swing shorter than 12 beats spends a third of it in the right-shoulder round.',
  ],
  [
    (c) => c.move === 'pass-by' && /^square through/i.test(c.text ?? ''),
    'Square through: each balance takes 4 beats and each pull by 2.',
  ],
  [
    (c) => c.move === 'give-and-take',
    'Give & take: half the beats to cross, half to back home holding both hands.',
  ],
  [
    (c) => c.move === 'gyre' && !c.params.shoulder,
    'A gyre goes by the right shoulder, facing each other, with no hands.',
  ],
  [
    (c) => c.move === 'box-circulate',
    'Long waves form during the balance before each box circulate: crossers face in, loopers face out; hands join only where they reach.',
  ],
  [
    (c) => c.move === 'slice' && /long lines slice/i.test(c.text ?? ''),
    'Long lines slice left & back is drawn as a slice: couples step diagonally left, then straight back.',
  ],
  [
    (c) => c.move === 'hey' && /take (?:right|left) hands/i.test(c.text ?? ''),
    'Taking hands at the end of a hey is left to the long waves that follow.',
  ],
  [
    (c) => c.move === 'swing' && c.params.end === 'down',
    'The 1s end their swing side by side in the middle of the set facing down, the way they progress.',
  ],
  [
    (c) => c.move === 'swing' && /end facing down/i.test(c.text ?? ''),
    'A swing that ends facing down the hall is drawn ending facing across; the down the hall that follows turns the lines.',
  ],
];

/**
 * Rows that only lead into the next row join it, so the pair is one call
 * spanning both rows' beats (labeled with both rows' text):
 * - "larks take partners" right before "partners swing": the larks take
 *   their partners into the swing, so the swing starts that many beats early.
 * - A zero-beat "form an ocean wave - ..." right before "balance the wave":
 *   the wave forms as the balance starts.
 * A lead-in with nothing to join is a row the engine cannot draw.
 */
function joinLeadIns(parsed: (StoredCall[] | Error)[]) {
  const only = (i: number) => {
    const calls = parsed[i];
    return Array.isArray(calls) && calls.length === 1 ? calls[0] : undefined;
  };
  joinLeadOuts(parsed, only);
  startInWave(parsed);
  for (let i = 0; i < parsed.length; i++) {
    const lead = only(i);
    if (!lead || (lead.move !== 'take' && !(lead.move === 'ocean-wave' && lead.beats === 0)))
      continue;
    // A wave formed on the last row leads into the first row of the next time through.
    const wraps = lead.move === 'ocean-wave' && i === parsed.length - 1 && i > 0;
    const after = wraps ? parsed[0] : parsed[i + 1];
    const next = Array.isArray(after) ? after : undefined;
    const first = next?.[0];
    const text = `${lead.text}, ${first?.text}`;
    if (lead.move === 'take' && first?.move === 'swing' && first.params.who === lead.params.whom) {
      next![0] = { ...first!, beats: first.beats + lead.beats, text, row: lead.row };
      parsed[i] = [];
    } else if (
      lead.move === 'ocean-wave' &&
      first?.move === 'balance' &&
      (first.params.formation === 'wave' || first.params.formation === 'current')
    ) {
      const params = { ...lead.params, balance: true };
      next![0] = { ...lead, params, beats: first.beats, text, row: lead.row };
      parsed[i] = [];
    } else if (lead.move === 'ocean-wave' && first?.move === 'allemande' && !wraps) {
      // A wave an allemande turns out of at once ("form an ocean wave", then
      // "swing through"): the allemande takes hands where the dancers are.
      parsed[i] = [];
    } else {
      parsed[i] = new Error(
        lead.move === 'take'
          ? 'Taking hands leads into a swing with them; none follows.'
          : 'A zero-beat ocean wave leads into a balance of the wave; none follows.',
      );
    }
  }
}

/**
 * "Ones allemande right 1½ WHILE" followed by a zero-beat "twos allemande
 * right 1½ as well": both rows dance at once, as one call (figures/ecd
 * together.ts) taking the first row's beats.
 */
function joinWhile(rows: readonly SourceRow[], parsed: (StoredCall[] | Error)[]) {
  rows.forEach((row, i) => {
    const next = rows[i + 1];
    if (!/\bwhile\s*⁋?\s*$/i.test(row.text) || !next || next.beats !== 0) return;
    try {
      const first = parseRow({ ...row, text: row.text.replace(/\s*\bwhile\b\s*/i, ' ').trim() });
      const second = parseRow({
        ...next,
        beats: row.beats,
        text: next.text.replace(/,?\s*(?:as well|too|at the same time)\s*$/i, '').trim(),
      });
      if (first.length !== 1 || second.length !== 1) throw new Error('Each part must be one figure.');
      const parts = [first[0], second[0]].map((c) => ({ move: c.move, params: c.params }));
      parsed[i] = [
        {
          move: 'together',
          beats: row.beats,
          params: { parts },
          text: `${first[0].text} while ${second[0].text}`,
          section: row.section,
          row: i + 1,
          ...(first[0].progression || second[0].progression ? { progression: true } : {}),
        },
      ];
      parsed[i + 1] = [];
    } catch (error) {
      parsed[i] = error instanceof Error ? error : new Error(String(error));
    }
  });
}

/**
 * "Same as B1": the row dances the named section's calls again, labeled
 * with its own row and section. Its beats must match the section's; the
 * repeat carries a progression mark only when this row has one.
 */
function repeatSections(rows: readonly SourceRow[], parsed: (StoredCall[] | Error)[]) {
  rows.forEach((row, i) => {
    const m = row.text.replace(/⁋/g, '').trim().match(/^same as ([AB][1-4])\.?$/i);
    if (!m) return;
    const name = m[1].toUpperCase();
    const source = rows.flatMap((r, j) => (r.section === name && j < i ? [j] : []));
    if (!source.length) {
      parsed[i] = new Error(`There is no ${name} before this row to repeat.`);
      return;
    }
    const calls: StoredCall[] = [];
    for (const j of source) {
      const p = parsed[j];
      if (p instanceof Error) {
        parsed[i] = new Error(`${name} has a row the engine cannot draw.`);
        return;
      }
      calls.push(...p);
    }
    const beats = calls.reduce((n, c) => n + c.beats, 0);
    if (beats !== row.beats) {
      parsed[i] = new Error(`${name} takes ${beats} beats, this row ${row.beats}.`);
      return;
    }
    const mark = row.text.includes('⁋');
    parsed[i] = calls.map((c, k) => {
      const { progression: _drop, ...rest } = c;
      return {
        ...rest,
        section: row.section,
        row: i + 1,
        ...(mark && k === calls.length - 1 ? { progression: true } : {}),
      };
    });
  });
}

/**
 * A zero-beat "turn alone" or "slide along set" row after a figure of 6
 * beats or more takes that figure's last 2 beats ("circle right 4 places",
 * then "turn alone to face next neighbors"); after a shorter one (or opening
 * the dance), the first 2 beats of the next figure when that has 6 or more.
 * A zero-beat "form a long wave in the center" only says
 * where the dancers already are, so it adds no call.
 */
function joinLeadOuts(
  parsed: (StoredCall[] | Error)[],
  only: (i: number) => StoredCall | undefined,
) {
  for (let i = 0; i < parsed.length; i++) {
    const lead = only(i);
    if (!lead || lead.beats !== 0) continue;
    if (lead.move === 'center-wave') {
      parsed[i] = [];
      continue;
    }
    if (lead.move !== 'turn-alone' && lead.move !== 'slide') continue;
    const before = i > 0 ? parsed[i - 1] : undefined;
    const last = Array.isArray(before) ? before.at(-1) : undefined;
    if (Array.isArray(before) && last && last.beats >= 6) {
      before[before.length - 1] = { ...last, beats: last.beats - 2 };
      parsed[i] = [{ ...lead, beats: 2 }];
      continue;
    }
    const after = parsed[i + 1];
    const next = Array.isArray(after) ? after[0] : undefined;
    if (Array.isArray(after) && next && next.beats >= 6) {
      after[0] = { ...next, beats: next.beats - 2 };
      parsed[i] = [{ ...lead, beats: 2 }];
    }
  }
}

/**
 * A dance that opens by balancing the wave its last row forms ("balance the
 * wave" ... "form an ocean wave - ladles by left hands and next neighbors by
 * right hands") starts in that wave: the first balance forms it, the first
 * time through from the starting formation and after that in place.
 */
function startInWave(parsed: (StoredCall[] | Error)[]) {
  const first = Array.isArray(parsed[0]) ? parsed[0][0] : undefined;
  const lastRow = parsed.at(-1);
  const last = Array.isArray(lastRow) ? lastRow.at(-1) : undefined;
  if (!first || !last || parsed.length < 2) return;
  if (first.move !== 'balance' || first.params.formation !== 'wave') return;
  if (last.move !== 'ocean-wave' || !(last.beats > 0)) return;
  const { balance: _balance, ...wave } = last.params;
  (parsed[0] as StoredCall[])[0] = {
    ...first,
    move: 'ocean-wave',
    params: { ...wave, balance: true },
  };
}

/**
 * The notes before the figures say how the dance starts ("start in long
 * waves, neighbor by right, ladles face in", "starts in short waves, right
 * hand to neighbors"). When the first figure balances that wave, it forms
 * it as it balances: long waves on the side lines with the named role facing
 * in, or a short wave by the hands named (robins in the middle by the left
 * unless the notes name the middles).
 */
function startAsTold(parsed: (StoredCall[] | Error)[], html: string) {
  const first = Array.isArray(parsed[0]) ? parsed[0][0] : undefined;
  if (!first || first.move !== 'balance') return;
  if (first.params.formation !== 'wave' && first.params.formation !== 'current') return;
  const note = text(html, /dance-show-preamble">([\s\S]*?)<\/div>/).toLowerCase();
  const role = (word: string | undefined) =>
    word === undefined
      ? undefined
      : canonical(word) === 'larks'
        ? 'larks'
        : canonical(word) === 'robins'
          ? 'robins'
          : undefined;
  const other = (r: string) => (r === 'larks' ? 'robins' : 'larks');
  const long = note.match(
    /\bstart\w* in long (?:ocean )?wav(?:es|y lines?)\b[^.]*?\b(\w+) fac(?:e|ing) (in|out)\b/,
  );
  if (long) {
    const named = role(long[1]);
    if (!named) return;
    (parsed[0] as StoredCall[])[0] = {
      ...first,
      params: { formation: 'long-waves', in: long[2] === 'in' ? named : other(named) },
    };
    return;
  }
  const short = note.match(/\bstart\w* in (?:a )?short waves?\b([^.]*)/);
  if (
    !short ||
    !/right hands? to neighbors?|neighbors? by right|neighbors? in right hand/.test(short[1])
  )
    return;
  const mid = short[1].match(
    /\b(\w+) (?:by left|left in (?:the )?(?:middle|center)|in the (?:middle|center))/,
  );
  (parsed[0] as StoredCall[])[0] = {
    ...first,
    move: 'ocean-wave',
    params: {
      middle: role(mid?.[1]) ?? 'robins',
      middleHand: 'left',
      ends: 'neighbor',
      endHand: 'right',
      balance: true,
    },
  };
}

/**
 * A slide the source leaves to the progression ("promenade and loop to next
 * neighbors", a J-hook) goes the formation's way: right in Becket
 * counterclockwise, left otherwise (Becket clockwise, and the usual reading
 * elsewhere).
 */
function progressionSlides(figures: StoredCall[], shape: Shape | undefined) {
  const way = shape?.formation === 'becket-ccw' ? 'right' : 'left';
  figures.forEach((c, i) => {
    if (c.move === 'slide' && c.params.direction === 'progression')
      figures[i] = { ...c, params: { ...c.params, direction: way } };
  });
}

/**
 * A pass by that carries the progression walks all the way to the other's
 * place, so the dancers stand where they meet their new neighbors.
 */
function arriveToProgress(figures: StoredCall[]) {
  figures.forEach((c, i) => {
    if (c.move === 'pass-by' && c.progression) figures[i] = { ...c, params: { ...c.params, arrive: true } };
  });
}

/**
 * A minor-set (Becket) dance progresses by sliding or slicing along the set,
 * or by a figure on the diagonal ("left diagonal robins chain"). When the
 * source marks its last row as the progression, or marks none, and the dance
 * has exactly one such figure, the progression happens there: the dancers
 * meet their new neighbors at that figure.
 */
function slideProgression(figures: StoredCall[], shape: Shape | undefined) {
  if (shape?.progression !== 'minor-set') return;
  const slides = figures
    .map((c, i) => [c, i] as const)
    .filter(
      ([c]) =>
        c.move === 'slide' ||
        (c.move === 'slice' && c.params.back !== 'diagonal') ||
        c.params.diagonal !== undefined,
    );
  if (slides.length !== 1) return;
  const marked = figures.flatMap((c, i) => (c.progression ? [i] : []));
  const last = figures.length - 1;
  if (marked.length > 1 || (marked.length === 1 && marked[0] !== last)) return;
  const [slide, at] = slides[0];
  if (slide.progression) return;
  for (const i of marked) {
    const { progression: _, ...rest } = figures[i];
    figures[i] = rest;
  }
  figures[at] = { ...slide, progression: true };
}

/**
 * Import one snapshot. `sha256` is the hex hash of `snapshot.html` (the
 * caller hashes; this module stays free of Node APIs).
 */
export function importDance(id: string, snapshot: ContraDbSnapshot, sha256: string): StoredDance {
  const html = snapshot.html;
  const meta = contraDbMeta(html);
  const shape = shapeOf(meta.formation);
  const rows = contraDbRows(html);
  const figures: StoredCall[] = [];
  const unparsed: UnparsedRow[] = [];
  const parts: { name: string; bars: number }[] = [];
  const beatsOf = (beats: number) => (Number.isFinite(beats) && beats > 0 ? beats : 0);
  // Parse every row first, so a lead-in row can join the row after it.
  const parsed: (StoredCall[] | Error)[] = rows.map((row, i) => {
    const beats = beatsOf(row.beats);
    try {
      if (!beats && row.beats !== 0) throw new Error('The row has no beat count.');
      return parseRow({ ...row, beats }).map((c) => ({ ...c, section: row.section, row: i + 1 }));
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  });
  repeatSections(rows, parsed);
  joinWhile(rows, parsed);
  joinTravelRows(rows, parsed);
  joinLeadIns(parsed);
  startAsTold(parsed, html);
  rows.forEach((row, i) => {
    const number = i + 1;
    const beats = beatsOf(row.beats);
    const name = row.section ?? 'A1';
    if (parts.at(-1)?.name !== name) parts.push({ name, bars: 0 });
    parts.at(-1)!.bars += beats / 2;
    const label = canonicalText(row.text.replace(/⁋/g, '').replace(/\s+/g, ' ').trim());
    try {
      const calls = parsed[i];
      if (calls instanceof Error) throw calls;
      if (calls.some((c) => !(c.beats > 0)))
        throw new Error(`${beats} beats is too short for this row's parts.`);
      figures.push(...calls);
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error);
      unparsed.push({ row: number, text: label, why });
      if (beats > 0)
        figures.push({
          move: 'hold',
          beats,
          params: { reason: 'unparsed' },
          text: label,
          section: row.section,
          row: number,
          ...(row.text.includes('⁋') ? { progression: true } : {}),
        });
    }
  });
  // "Same four": whoever the row before named; "other four": the other four.
  const OTHER: Readonly<Record<string, string>> = {
    heads: 'sides',
    sides: 'heads',
    larks: 'robins',
    robins: 'larks',
  };
  figures.forEach((c, i) => {
    const among = (c.params as { among?: string[] }).among;
    if (!among?.includes('@same') && !among?.includes('@other')) return;
    const before = i > 0 ? (figures[i - 1].params as { among?: string[] }).among : undefined;
    const rest = among.filter((a) => a !== '@same' && a !== '@other');
    const resolved = among.includes('@other')
      ? (before ?? []).map((a) => OTHER[a]).filter((a): a is string => !!a)
      : (before ?? []);
    const named = [...rest, ...resolved];
    const { among: _drop, ...params } = c.params as Record<string, unknown>;
    figures[i] = { ...c, params: named.length ? { ...params, among: named } : params };
  });
  // Calls that mean another move in this formation ("long lines" facing along the hall).
  const moves = shape ? FORMATIONS[shape.formation]?.moves : undefined;
  if (moves)
    figures.forEach((c, i) => {
      if (moves[c.move]) figures[i] = { ...c, move: moves[c.move] };
    });
  progressionSlides(figures, shape);
  slideProgression(figures, shape);
  arriveToProgress(figures);
  const choices = CHOICES.filter(([test]) => figures.some(test)).map(([, t]) => t);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id,
    title: meta.title,
    author: meta.author,
    formation: shape?.formation ?? null,
    progression: progressionOf(shape, figures),
    music: { meter: '2/4', parts, times: 'repeat' },
    source: {
      url: snapshot.sourceUrl,
      formation: meta.formation,
      ...(snapshot.retrievedAt ? { retrievedAt: snapshot.retrievedAt } : {}),
      sha256,
      ...(html.includes('sketchbook') ? { status: 'sketchbook' } : {}),
    },
    status: 'unchecked',
    problems: [],
    unparsed,
    choices,
    figures,
  };
}
